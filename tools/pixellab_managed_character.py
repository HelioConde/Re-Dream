#!/usr/bin/env python3
"""Manage Aren as a persistent PixelLab Character, without changing approved assets.

API: create-character-pro (rotate existing EAST-facing Aren) -> animate-character
(EAST only) -> export character ZIP -> candidate PNGs for human QA.
Only a GitHub Actions job with the secret may make paid calls.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import time
import urllib.error
import urllib.request
import zipfile

from PIL import Image

from tools.generate_pixellab import CHARACTERS, PixelLabError, API_BASE

REPO_ROOT = Path(__file__).resolve().parents[1]
MASTER = REPO_ROOT / "assets/pixellab/vanguard/idle/000.png"
CANDIDATE = REPO_ROOT / "assets/pixellab/vanguard_character_candidate"
MANIFEST = CANDIDATE / "character.json"
ACTIONS = {
    "jump": ("Side-view heroic jump upward with compact knee tuck, land and recover. Keep Aren's chestnut hair, ivory-blue coat, turquoise scarf, moonstone and enchanted saber identical.", 8),
    "dash": ("Fast side-view dash to the right with a forward lean and fluttering turquoise scarf. Preserve the exact character design and crystal saber, no scene or camera.", 8),
    "hit": ("Aren briefly flinches from impact, pulls the enchanted sword close, then recovers. Same face, ivory coat, golden crescent hair ornament, transparent background.", 8),
}


def read_manifest() -> dict:
    return json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}


def save_manifest(data: dict) -> None:
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def reference_hash() -> str:
    return hashlib.sha256(MASTER.read_bytes()).hexdigest()


def request(token: str, path: str, payload: dict | None = None, binary: bool = False):
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Authorization": "Bearer " + token, "Accept": "application/zip" if binary else "application/json"}
    if payload is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(API_BASE + path, data=data, headers=headers,
                                 method="POST" if payload is not None else "GET")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.read() if binary else json.load(resp)
    except urllib.error.HTTPError as exc:
        message = exc.read(300).decode("utf-8", errors="replace")
        raise PixelLabError(f"PixelLab {path} HTTP {exc.code}: {message}") from exc
    except (OSError, TimeoutError) as exc:
        raise PixelLabError(f"PixelLab {path}: {type(exc).__name__}") from exc


def wait_job(token: str, job_id: str, attempts: int = 180) -> None:
    for _ in range(attempts):
        result = request(token, "/background-jobs/" + job_id)
        if result.get("status") == "completed":
            return
        if result.get("status") in ("failed", "cancelled"):
            raise PixelLabError("PixelLab background job failed: " + job_id)
        time.sleep(8)
    raise PixelLabError("PixelLab job timed out, resume using persisted character.json: " + job_id)


def create_or_resume(token: str, data: dict) -> dict:
    master_hash = reference_hash()
    if data:
        if data.get("reference_sha256") != master_hash:
            raise PixelLabError("Approved Aren reference changed; manual review required")
        if not data.get("character_id"):
            raise PixelLabError("Incomplete Character metadata; do not pay for a duplicate")
    else:
        # The approved 128px Aren is EAST-facing. PixelLab create-character-v3
        # expects SOUTH; rotate_character Pro accepts our existing side-view artwork.
        image = {"base64": "data:image/png;base64," + base64.b64encode(MASTER.read_bytes()).decode("ascii")}
        result = request(token, "/create-character-pro", {
            "description": CHARACTERS["vanguard"],
            "image_size": {"width": 128, "height": 128},
            "method": "rotate_character",
            "reference_image": image,
            "view": "side",
            "template_id": "mannequin",
            "no_background": True,
        })
        if not result.get("character_id") or not result.get("background_job_id"):
            raise PixelLabError("Character creation returned no character_id/job_id")
        data = {"character_id": result["character_id"], "creation_job_id": result["background_job_id"],
                "reference_sha256": master_hash, "creation_engine": "create-character-pro/rotate_character",
                "animations": {}, "stage": "creating"}
        save_manifest(data)  # checkpoint before waiting or making any more charged calls
    if data.get("stage") == "creating":
        print("Waiting for managed Character:", data["character_id"], flush=True)
        wait_job(token, data["creation_job_id"])
        data["stage"] = "ready"
        save_manifest(data)
    info = request(token, "/characters/" + data["character_id"])
    if "east" not in info.get("rotation_urls", {}):
        raise PixelLabError("Character is missing EAST rotation; stop before animating")
    return data


def submit_or_resume_animation(token: str, data: dict, action: str) -> None:
    record = data["animations"].get(action, {})
    if record.get("stage") == "done":
        return
    if not record:
        prompt, frame_count = ACTIONS[action]
        # custom_start_frame locks the existing approved Aren, instead of
        # arbitrarily changing his face, sword or outfit for each animation.
        base = {"base64": "data:image/png;base64," + base64.b64encode(MASTER.read_bytes()).decode("ascii")}
        result = request(token, "/animate-character", {
            "character_id": data["character_id"], "animation_name": action,
            "mode": "v3", "directions": ["east"],
            "action_description": prompt, "frame_count": frame_count,
            "custom_start_frame": base, "keep_first_frame": True,
            "enhance_prompt": False,
        })
        job_ids = result.get("background_job_ids", [])
        if len(job_ids) != 1:
            raise PixelLabError("Expected one EAST animation background job")
        record = {"job_id": job_ids[0], "group_id": result.get("animation_group_id"),
                  "prompt": prompt, "stage": "submitted"}
        data["animations"][action] = record
        save_manifest(data)
    print("Waiting for managed Character animation:", action, flush=True)
    wait_job(token, record["job_id"])
    record["stage"] = "done"
    save_manifest(data)


def extract_export(zip_bytes: bytes, expected: list[str]) -> dict:
    """Only export matching EAST animation frames; never overwrite approved vanguard/."""
    frames_by_action: dict[str, list[tuple[str, bytes]]] = {action: [] for action in expected}
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as package:
        for entry in package.infolist():
            path = PurePosixPath(entry.filename)
            parts = path.parts
            if path.is_absolute() or ".." in parts:
                raise PixelLabError("Unsafe path in Character ZIP")
            if len(parts) < 4 or parts[-4] != "animations" or parts[-2] != "east":
                continue
            action = parts[-3]
            if action not in frames_by_action or not parts[-1].lower().endswith(".png"):
                continue
            frames_by_action[action].append((parts[-1], package.read(entry)))
        result = {}
        for action in expected:
            files = sorted(frames_by_action[action], key=lambda item: int(re.search(r"(\d+)\.png$", item[0]).group(1)) if re.search(r"(\d+)\.png$", item[0]) else -1)
            if len(files) < 4:
                raise PixelLabError(f"Character ZIP missing EAST animation '{action}': {len(files)} frames")
            hashes = []
            for index, (_name, png) in enumerate(files):
                with Image.open(io.BytesIO(png)) as img:
                    converted = img.convert("RGBA")
                    if not (32 <= converted.width <= 256 and 32 <= converted.height <= 256):
                        raise PixelLabError(f"Bad animation frame size for {action}")
                    if converted.getchannel("A").getbbox() is None:
                        raise PixelLabError(f"Empty animation frame for {action}")
                    stream = io.BytesIO()
                    converted.save(stream, format="PNG")
                    content = stream.getvalue()
                filepath = CANDIDATE / action / f"{index:03d}.png"
                filepath.parent.mkdir(parents=True, exist_ok=True)
                filepath.write_bytes(content)
                hashes.append(hashlib.sha256(content).hexdigest())
            if len(set(hashes)) < 3:
                raise PixelLabError(f"Animation {action} has too little frame variation")
            result[action] = {"frames": len(hashes), "sha256": hashes}
    return result


def run(actions: list[str], dry_run: bool = False) -> dict:
    if any(action not in ACTIONS for action in actions):
        raise PixelLabError("Unknown managed Character action")
    if not MASTER.exists():
        raise PixelLabError("Approved Aren PixelLab master is missing")
    manifest = read_manifest()
    plan = {"reference_sha256": reference_hash(),
            "character_id": manifest.get("character_id"),
            "create": not bool(manifest),
            "actions": [a for a in actions if manifest.get("animations", {}).get(a, {}).get("stage") != "done"]}
    if dry_run:
        print("DRY RUN — no charged API calls:", json.dumps(plan, ensure_ascii=False))
        return plan
    token = os.getenv("PIXELLAB_API_KEY", "").strip()
    if not token:
        raise PixelLabError("PIXELLAB_API_KEY is missing in GitHub Actions")
    manifest = create_or_resume(token, manifest)
    for action in actions:
        submit_or_resume_animation(token, manifest, action)
    image_zip = request(token, "/characters/" + manifest["character_id"] + "/zip", binary=True)
    manifest["exports"] = extract_export(image_zip, actions)
    manifest["stage"] = "candidate_ready"
    save_manifest(manifest)
    print("Character candidate ready:", manifest["character_id"], "actions:", actions, flush=True)
    return plan


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--actions", default="jump,dash,hit")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    try:
        run([s.strip() for s in args.actions.split(",") if s.strip()], dry_run=args.dry_run)
    except (PixelLabError, KeyError, ValueError, zipfile.BadZipFile) as exc:
        parser.exit(1, f"Managed Character: {exc}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

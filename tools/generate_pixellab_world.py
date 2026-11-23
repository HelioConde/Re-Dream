#!/usr/bin/env python3
"""PixelLab-only candidate world backdrops for Eclipse Vanguard.

Default mode is a free preview. Paid generation requires --generate, an API token,
and a manually dispatched GitHub Actions run. Never overwrites reviewed art.
"""
from __future__ import annotations

import argparse
import base64
import binascii
import hashlib
import io
import json
import os
from pathlib import Path

from PIL import Image, UnidentifiedImageError
from tools.generate_pixellab import PixelLabError, api_request

ROOT = Path(__file__).resolve().parents[1] / "assets" / "pixellab" / "world_candidates"
SIZE = (512, 288)
WORLD_PROMPTS = {
    "crystal_forest": (
        "Eclipse Vanguard, ORIGINAL 2D side-scrolling magical anime fantasy pixel art "
        "BACKGROUND ONLY, single wide landscape, no hero and no enemies. The Crystal "
        "Forest: enormous emerald trees, soft distant waterfalls, rolling turquoise "
        "hills and ancient pale stone arches partly covered in vines, clusters of "
        "glowing cyan crystals, blue sky, pink wildflowers and tiny magical lights. "
        "Strong layered atmospheric perspective and a subdued central play area so "
        "characters remain legible. This is the FAR SCENERY behind separately coded "
        "solid platforms: do not draw foreground HUD, giant characters, readable text "
        "or the game's collision platforms. Bright original pixel art with clean "
        "pixel clusters, harmonious cobalt/teal/ivory/coral-gold palette, no logos "
        "or copied game art. Full opaque edge-to-edge rectangular background."
    ),
    "lunar_ruins": (
        "Eclipse Vanguard, ORIGINAL 2D side-scrolling magical anime fantasy pixel art "
        "BACKGROUND ONLY, wide moonlit vista. Ancient arcane ruins in a blue-violet "
        "valley, enormous luminous moon behind a broken celestial stone ring, distant "
        "waterfalls, turquoise crystal outcrops, ruined arches, cascading mist, "
        "violet flowers and twilight forest silhouettes. Deep multilayer parallax "
        "perspective, restrained center brightness for readable character silhouettes. "
        "This is FAR SCENERY only: no playable floating platforms, no foreground HUD, "
        "no people, no monster, no words, no logos or copyrighted characters. "
        "Crisp original fantasy pixel art, deep indigo, cobalt, cyan, lavender, gold "
        "and emerald accents. Full opaque edge-to-edge rectangular background."
    ),
}


def decode_background(image_payload: dict | str) -> bytes:
    """Decode a PixelLab Pixen image without resampling the native pixel grid."""
    encoded = image_payload.get("base64") if isinstance(image_payload, dict) else image_payload
    if not isinstance(encoded, str) or not encoded:
        raise PixelLabError("PixelLab returned no base64 image")
    if encoded.startswith("data:"):
        encoded = encoded.partition(",")[2]
    try:
        raw = base64.b64decode(encoded, validate=True)
        with Image.open(io.BytesIO(raw)) as image:
            image.load()
            if image.size != SIZE:
                raise PixelLabError(f"World background must be {SIZE}, got {image.size}")
            rgba = image.convert("RGBA")
            if rgba.getchannel("A").getextrema()[0] != 255:
                raise PixelLabError("Background has transparent pixels; expected opaque landscape")
            output = io.BytesIO()
            rgba.save(output, format="PNG", optimize=True)
            return output.getvalue()
    except (ValueError, OSError, UnidentifiedImageError, binascii.Error) as exc:
        raise PixelLabError("Invalid PixelLab background PNG") from exc


def generate_world(world: str, *, generate: bool = False, root: Path = ROOT) -> dict:
    if world not in WORLD_PROMPTS:
        raise ValueError(f"Unknown world: {world}")
    destination = root / world
    png_path = destination / "background.png"
    manifest_path = destination / "manifest.json"
    plan = {
        "world": world,
        "size": list(SIZE),
        "endpoint": "/create-image-pixen",
        "candidate_path": str(png_path),
        "needs_generation": not png_path.exists(),
    }
    if not generate:
        print("PIXELLAB DRY RUN (no API calls):", json.dumps(plan, ensure_ascii=False))
        print("PROMPT:", WORLD_PROMPTS[world])
        return plan
    # Any prior generation must be used as a checkpoint, not billed again.
    if png_path.exists():
        if not manifest_path.exists():
            raise PixelLabError("Candidate PNG exists without manifest; inspect it manually")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if hashlib.sha256(png_path.read_bytes()).hexdigest() != manifest.get("sha256"):
            raise PixelLabError("Existing candidate differs from recorded SHA-256")
        print("Existing PixelLab candidate verified; generation skipped:", png_path)
        return plan
    token = os.environ.get("PIXELLAB_API_KEY", "").strip()
    if not token:
        raise PixelLabError("PIXELLAB_API_KEY must be set in GitHub Actions Secrets")
    response = api_request(token, "POST", "/create-image-pixen", {
        "description": WORLD_PROMPTS[world],
        "image_size": {"width": SIZE[0], "height": SIZE[1]},
        "no_background": False,
        "enhance_prompt": False,
    })
    png = decode_background(response.get("image"))
    digest = hashlib.sha256(png).hexdigest()
    destination.mkdir(parents=True, exist_ok=True)
    png_path.write_bytes(png)
    manifest_path.write_text(json.dumps({
        "generator": "PixelLab API v2",
        "endpoint": "/create-image-pixen",
        "world": world,
        "layer": "background",
        "image_size": list(SIZE),
        "prompt": WORLD_PROMPTS[world],
        "sha256": digest,
        "usage": response.get("usage"),
        "reviewed": False,
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Generated PixelLab candidate: {png_path} SHA256={digest}")
    return plan


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--world", choices=sorted(WORLD_PROMPTS), required=True)
    parser.add_argument("--generate", action="store_true", help="Explicitly call paid PixelLab API")
    args = parser.parse_args()
    try:
        generate_world(args.world, generate=args.generate)
    except (PixelLabError, ValueError, KeyError) as exc:
        parser.exit(1, f"PixelLab world error: {exc}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

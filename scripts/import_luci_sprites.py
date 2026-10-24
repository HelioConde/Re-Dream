#!/usr/bin/env python3
"""Import authentic Luci pixel-art frames from the authored PixelLab ZIP.

Builds horizontal 128x128 spritesheets for East-facing actions. West uses
Phaser flipX, not duplicated data. No synthesis of missing frames or armor.
"""
from __future__ import annotations
import io
import json
import re
import sys
import zipfile
from pathlib import Path

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit("Install Pillow: python -m pip install Pillow") from exc

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "Anime_fantasy_action_RPG_playable.zip"
DEST = ROOT / "apps/web/public/sprites/luci"
ACTION_RE = re.compile(r"^Idle/animations/([a-z][a-z0-9_]+)/east/frame_(\d+)\.png$")
FRAMES_PER_SECOND = {
    "idle_east": 9, "walk_east": 10, "run_east": 12,
    "jump_start_east": 12, "jump_air_east": 12,
    "jump_fall_east": 12, "land_east": 12,
    "attack_1_east": 18, "attack_2_east": 18,
    "attack_3_east": 18, "attack_4_east": 18,
    "attack_air_east": 16, "dash_east": 17,
    "dash_attack_east": 18, "skill_2_east": 16,
}
REQUIRED = {"idle_east", "walk_east", "run_east", "attack_1_east", "attack_2_east", "attack_4_east"}
LOOP = {"idle_east", "walk_east", "run_east", "guard_east", "sit_east"}
MAX_ZIP_UNCOMPRESSED = 100 * 1024 * 1024


def run() -> None:
    if not ARCHIVE.is_file():
        raise SystemExit(f"Required Luci archive missing: {ARCHIVE}")
    manifest: dict[str, object] = {
        "name": "Luci", "class": "Fighter", "direction": "east",
        "frameWidth": 128, "frameHeight": 128,
        "origin": ARCHIVE.name, "animations": {},
        "armor": {"state": "Fighter_Iniciante_01", "animated": False},
    }
    actions: dict[str, list[tuple[int, str]]] = {}
    with zipfile.ZipFile(ARCHIVE) as source:
        if sum(entry.file_size for entry in source.infolist()) > MAX_ZIP_UNCOMPRESSED:
            raise SystemExit("Unexpectedly large Luci archive")
        for member in source.namelist():
            matched = ACTION_RE.fullmatch(member)
            if matched:
                actions.setdefault(matched.group(1), []).append((int(matched.group(2)), member))
        if not REQUIRED.issubset(actions):
            raise SystemExit(f"Luci export is missing required actions: {sorted(REQUIRED - actions.keys())}")
        DEST.mkdir(parents=True, exist_ok=True)
        for animation, frames in sorted(actions.items()):
            frames.sort(key=lambda frame: frame[0])
            indices = [idx for idx, _ in frames]
            if indices != list(range(len(indices))):
                raise SystemExit(f"Missing/duplicate frame in {animation}: {indices}")
            sheet = Image.new("RGBA", (128 * len(frames), 128), (0, 0, 0, 0))
            for idx, (_, path) in enumerate(frames):
                with Image.open(io.BytesIO(source.read(path))) as raw:
                    picture = raw.convert("RGBA")
                if picture.size != (128, 128):
                    # Some PixelLab movement actions export at 172x172 or
                    # larger to give limbs room. Fit the complete original
                    # image within the target 128px cell without cropping.
                    if picture.width > 512 or picture.height > 512:
                        raise SystemExit(f"Unexpectedly large frame {picture.size}: {path}")
                    original_size = picture.size
                    picture.thumbnail((128, 128), Image.Resampling.NEAREST)
                    normalized = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
                    normalized.paste(picture, ((128 - picture.width) // 2, (128 - picture.height) // 2))
                    picture = normalized
                    print(f"Luci: normalize {animation} frame {idx} from {original_size} to 128x128")
                sheet.paste(picture, (128 * idx, 0))
            sheet.save(DEST / f"{animation}.png", format="PNG", optimize=True)
            manifest["animations"][animation] = {
                "frames": len(frames),
                "fps": FRAMES_PER_SECOND.get(animation, 12),
                "loop": animation in LOOP,
            }
            print(f"Luci: {animation} — {len(frames)} real East frames")
        for state, destination in [
            ("Idle", "preview.png"),
            ("Fighter_Iniciante_01", "armor-preview.png"),
        ]:
            path = f"{state}/rotations/east.png"
            with Image.open(io.BytesIO(source.read(path))) as raw:
                image = raw.convert("RGBA")
            if image.size != (128, 128):
                image.thumbnail((128, 128), Image.Resampling.NEAREST)
                canvas = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
                canvas.paste(image, ((128 - image.width) // 2, (128 - image.height) // 2))
                image = canvas
            image.save(DEST / destination, format="PNG", optimize=True)
    (DEST / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"Luci import complete: {len(actions)} authentic animations; no armor animations invented")


if __name__ == "__main__":
    run()

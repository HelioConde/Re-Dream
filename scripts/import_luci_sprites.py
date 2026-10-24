#!/usr/bin/env python3
"""Import authentic Luci pixel-art frames from the authored PixelLab ZIP.

Packs original frames into consistent 192x192 transparent cells WITHOUT
resizing the art. The larger PixelLab movement canvases and smaller attack
canvases therefore render at the same world-space pixel density.
West uses Phaser flipX; no frames or equipment are synthesized.
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
CELL_SIZE = 192
GROUND_LINE = CELL_SIZE - 12  # Stable transparent-space foot baseline.


def pack_action_frames(source: zipfile.ZipFile, frames: list[tuple[int, str]]) -> Image.Image:
    """Keep original pixels at 1:1 scale and anchor an action as a whole.

    The FIRST pose determines the shared translation, never each individual
    frame. This preserves the timing, ground movement and reach of the artist's
    original animation, while preventing idle/walk from shrinking next to hits.
    """
    frames_rgba: list[Image.Image] = []
    for _, path in frames:
        with Image.open(io.BytesIO(source.read(path))) as raw:
            picture = raw.convert("RGBA")
        if max(picture.size) > CELL_SIZE:
            raise ValueError(f"{path}: native frame {picture.size} exceeds {CELL_SIZE}px; refusing to rescale/crop")
        if picture.getchannel("A").getbbox() is None:
            raise ValueError(f"{path}: empty animation frame")
        frames_rgba.append(picture)

    # Align the first pose's visible center and feet across different canvas
    # sizes. Never change source artwork dimensions or normalize per frame.
    first = frames_rgba[0].getchannel("A").getbbox()
    assert first is not None
    first_x = (first[0] + first[2]) / 2
    delta_x = round(CELL_SIZE / 2 - first_x)
    delta_y = GROUND_LINE - first[3]

    # Move the entire animation without clipping any nontransparent pixels.
    # If its animated reach needs more canvas, fail visibly instead of losing
    # hands, hair, boots or attack poses.
    bounds = [img.getchannel("A").getbbox() for img in frames_rgba]
    assert all(b is not None for b in bounds)
    left = min(b[0] for b in bounds if b is not None)
    right = max(b[2] for b in bounds if b is not None)
    top = min(b[1] for b in bounds if b is not None)
    bottom = max(b[3] for b in bounds if b is not None)
    if right - left > CELL_SIZE or bottom - top > CELL_SIZE:
        raise ValueError(f"{frames[0][1]}: animation range cannot fit in {CELL_SIZE}px without clipping")
    delta_x = max(-left, min(CELL_SIZE - right, delta_x))
    delta_y = max(-top, min(CELL_SIZE - bottom, delta_y))

    sheet = Image.new("RGBA", (CELL_SIZE * len(frames_rgba), CELL_SIZE), (0, 0, 0, 0))
    for index, picture in enumerate(frames_rgba):
        original_bbox = picture.getchannel("A").getbbox()
        assert original_bbox is not None
        sheet.paste(picture, (index * CELL_SIZE + delta_x, delta_y))
        placed = sheet.crop((index * CELL_SIZE, 0, (index + 1) * CELL_SIZE, CELL_SIZE))
        if placed.getchannel("A").getbbox() != (
            original_bbox[0] + delta_x, original_bbox[1] + delta_y,
            original_bbox[2] + delta_x, original_bbox[3] + delta_y,
        ):
            raise ValueError(f"{frames[index][1]}: detected a clipped frame")
    return sheet


def run() -> None:
    if not ARCHIVE.is_file():
        raise SystemExit(f"Required Luci archive missing: {ARCHIVE}")
    manifest: dict[str, object] = {
        "name": "Luci", "class": "Fighter", "direction": "east",
        "frameWidth": CELL_SIZE, "frameHeight": CELL_SIZE,
        "renderScale": 170 / 128,
        "groundLine": GROUND_LINE,
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
            sheet = pack_action_frames(source, frames)
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

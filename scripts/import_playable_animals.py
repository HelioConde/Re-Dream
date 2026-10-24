#!/usr/bin/env python3
"""Import a few individually named Tiny Animals game sprites.
Allowed by the pack's included commercial game usage license;
do not redistribute the complete collection as an asset pack.
"""
from pathlib import Path
from zipfile import ZipFile
from io import BytesIO
from PIL import Image
import json,re
root=Path(__file__).resolve().parents[1]
archive=root/"FREE 64 Tiny Animals – 32x32 Pixel Art Pack.zip"
dest=root/"apps/web/public/sprites/imported/animals";dest.mkdir(parents=True,exist_ok=True)
wanted=["cat","fox","rabbit","wolf","panda","owl"]
animals={}
with ZipFile(archive) as z:
    md=[k for k in z.namelist() if k.lower().endswith("readme_free_64_tiny_animals.md")]
    if not md:raise SystemExit("Missing source license")
    notice=z.read(md[0]).decode("utf-8","replace")
    if not ("personal and commercial projects" in notice and "not:" in notice.lower()):
        raise SystemExit("License assertion failed")
    candidates={}
    for filename in z.namelist():
        if not filename.lower().endswith(".png"):continue
        stem=Path(filename).stem.lower().strip()
        candidates.setdefault(stem,[]).append(filename)
    for animal in wanted:
        filenames=candidates.get(animal,[])
        if not filenames:
            print("UNAVAILABLE",animal,"Possible alternatives:",[s for s in candidates if animal in s][:6])
            continue
        original=z.read(filenames[0])
        img=Image.open(BytesIO(original)).convert("RGBA")
        if img.size!=(32,32):
            print("Skipping size mismatch",animal,img.size);continue
        (dest/(animal+".png")).write_bytes(original)
        animals[animal]={"path":"sprites/imported/animals/"+animal+".png","source_path":filenames[0],"width":32,"height":32,"animation":"static"}
(dest/"manifest.json").write_text(json.dumps(animals,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
(dest/"CREDITS.md").write_text(
    "# Character sprites from Tiny Animals\n\n"
    "Source: FREE 64 Tiny Animals – 32x32 Pixel Art Pack.zip, supplied by the project owner. "
    "Permission: personal/commercial game usage, modification allowed, no redistribution "
    "or resale as a standalone asset pack. Attribution suggested in source README: Tiny Animals by Jedimei.\n\n"
    "These are **static 32×32 characters** for a visual multiplayer prototype. No new frames "
    "or actual walking attacks/death animations are implied. Game art only; do not distribute as an asset pack.\n\n"
    "Included: "+", ".join(animals)+"\n",encoding="utf-8")
if not animals:raise SystemExit("No selected animals available")
print("IMPORTED",list(animals))

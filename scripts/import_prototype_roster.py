#!/usr/bin/env python3
"""Prepare only selected playable character frames from the owner-supplied ZIP files.

Re:Dream is a noncommercial prototype. Do not ship source archives,
standalone third-party asset packs, or AI training datasets.
Original authored frames are retained, never extrapolated.
"""
from __future__ import annotations
from pathlib import Path
from io import BytesIO
from zipfile import ZipFile
from PIL import Image
import json, re

root=Path(__file__).resolve().parents[1]
dest=root/"apps/web/public/sprites/prototype"
dest.mkdir(parents=True,exist_ok=True)
created={}

def save(name,frames):
    if not frames:raise RuntimeError("No frames for "+name)
    strip=Image.new("RGBA",(64*len(frames),64))
    for i,frame in enumerate(frames):
        if frame.size!=(64,64):raise RuntimeError(f"bad {name} frame size {frame.size}")
        strip.alpha_composite(frame,(i*64,0))
    strip.save(dest/(name+".png"), optimize=True)
    created[name]={"path":f"sprites/prototype/{name}.png","width":64,"height":64,"frames":len(frames)}

def centered(raw, pixelart=True):
    raw=raw.convert("RGBA")
    box=raw.getbbox()
    if box:
        raw=raw.crop(box)
    if raw.width>60 or raw.height>62:
        factor=min(60/raw.width,62/raw.height)
        raw=raw.resize((max(1,round(raw.width*factor)),max(1,round(raw.height*factor))),
            Image.Resampling.NEAREST if pixelart else Image.Resampling.LANCZOS)
    c=Image.new("RGBA",(64,64))
    c.alpha_composite(raw,((64-raw.width)//2,63-raw.height))
    return c

# Little Dreamyland: rows of authored 48x48 animation frames.
little=root/"Little Dreamyland - Free Pack.zip"
with ZipFile(little) as z:
    license_text=z.read("Little Dreamyland - Free Pack/LICENSE.txt").decode("utf-8","replace")
    if not ("Free for non-commercial projects" in license_text and "Credit is required" in license_text):
        raise SystemExit("Little Dreamyland rights failed")
    base="Little Dreamyland - Free Pack/Sprites/Characters/Bunny/"
    anims={"idle":("IDLE/Bunny_Idle.png",5),"run":("RUN/Bunny_Run.png",8),
           "attack":("SWORD/Bunny_Sword.png",9)}
    for anim,(file,columns) in anims.items():
        im=Image.open(BytesIO(z.read(base+file))).convert("RGBA")
        if im.width != columns*48 or im.height != 192:
            raise RuntimeError(f"Unexpected Bunny sheet {anim}: {im.size}")
        for direction,row in (("left",2),("right",3)):
            frames=[centered(im.crop((x*48,row*48,(x+1)*48,(row+1)*48))) for x in range(columns)]
            save("bunny_"+anim+"_"+direction,frames)

# SuperRetroRanch: existing male_01 base artwork, 4 directional rows, 32px cells.
ranch=root/"SuperRetroRanch_FreeTier_v34.zip"
with ZipFile(ranch) as z:
    terms=z.read("info/License_SuperRetroRanch_FreeTier.txt").decode("utf-8","replace")
    if "non-commercial projects only" not in terms:
        raise SystemExit("SuperRetroRanch usage terms did not match expected license")
    base="assets/characters/males/male_01/"
    for variant,suffix in [("retro",""),("retrohat","_hat")]:
        for action in ("idle","walk"):
            filename=f"{base}{action}/male_01{suffix}_{action}_32x32"
            filename+= "_3frames.png" if action=="walk" else ".png"
            im=Image.open(BytesIO(z.read(filename))).convert("RGBA")
            columns=3 if action=="walk" else 1
            if im.size!=(columns*32,128):
                raise RuntimeError(f"Unexpected retro sheet: {filename}: {im.size}")
            for direction,row in (("left",2),("right",3)):
                frames=[centered(im.crop((i*32,row*32,(i+1)*32,(row+1)*32))) for i in range(columns)]
                save(variant+"_"+action+"_"+direction,frames)

# Mana Seed farmer sample: author-described 1024x1024 paper doll layer stack.
# Use one authentic 64px atlas cell, not a fabricated running or attack animation.
mana=root/"Mana Seed Farmer Sprite Free Sample.zip"
with ZipFile(mana) as z:
    prefix="farmer base sheets/"
    layers={
      "body":"01body/fbas_1body_human_00.png",
      "feet":"03fot1/fbas_03fot1_shoes_00a.png",
      "pants":"04lwr1/fbas_04lwr1_longpants_00a.png",
      "shirt":"05shrt/fbas_05shrt_shortshirt_00a.png",
      "shirt2":"05shrt/fbas_05shrt_shortshirtboobs_00a.png",
      "dapper":"13hair/fbas_13hair_dapper_00a.png",
      "bob":"13hair/fbas_13hair_bob1_00a.png",
    }
    source={}
    for name,path in layers.items():
        image=Image.open(BytesIO(z.read(prefix+path))).convert("RGBA")
        if image.size!=(1024,1024):raise RuntimeError(f"Unexpected Mana layout: {path}")
        source[name]=image
    # Select the first visible human body cell from the supplied atlas (not a generated pose).
    body=source["body"]
    candidates=[]
    for row in range(16):
        for col in range(16):
            box=(col*64,row*64,(col+1)*64,(row+1)*64)
            count=body.crop(box).getchannel("A").getbbox()
            if count:
                alpha=body.crop(box).getchannel("A")
                nonzero=sum(v>50 for v in alpha.getdata())
                if nonzero>60:candidates.append((row,col,nonzero))
    if not candidates:raise RuntimeError("Mana Seed body has no populated cells")
    # Prefer earliest populated row+col to avoid crossing into attack poses.
    row,col,_=min(candidates)
    box=(col*64,row*64,(col+1)*64,(row+1)*64)
    for name,hair,shirt in (("mana_dapper","dapper","shirt"),("mana_bob","bob","shirt2")):
        cell=Image.new("RGBA",(64,64))
        for layer in ("body","pants","feet",shirt,hair):
            cell.alpha_composite(source[layer].crop(box))
        save(name,[cell])
    print("Mana Seed first populated cell", row, col)
(dest/"manifest.json").write_text(json.dumps(created,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
(dest/"CREDITS.md").write_text(
    "# Re:Dream temporary noncommercial test characters\n\n"
    "Bunny: Little Dreamyland Free by Starmixu & Utaskuas — attribution required, "
    "free noncommercial game use only, no standalone asset redistribution.\n\n"
    "Retro farmer: SuperRetroRanch Free Tier by Gif — free noncommercial project use, "
    "do not distribute the pack or claim the art as original.\n\n"
    "Mana Seed farmer paper doll sample: Seliel the Shaper. Composited only from "
    "user-provided demo layers. License is not included in the archive; verify the "
    "publisher's terms before further distribution or commercialization.\n\n"
    "Extracted **selected frames for the prototype game only**; complete ZIP archives "
    "are excluded from the deployed web artifact. These are not PixelLab originals. "
    "Replace with original assets before the commercial game.\n",encoding="utf8")
print("IMPORTED",sorted(created))

#!/usr/bin/env python3
"""Extract a single Sprout Lands character atlas for a noncommercial game prototype.
Requires the package's own open-source allowance and attribution statement.
"""
from pathlib import Path
from zipfile import ZipFile
from io import BytesIO
from PIL import Image
import re

root=Path(__file__).resolve().parents[1]
archive=root/"Sprout Lands - Sprites - Basic pack.zip"
target=root/"apps/web/public/sprites/imported/sprout"
target.mkdir(parents=True,exist_ok=True)
with ZipFile(archive) as z:
    entries=z.namelist()
    readmes=[name for name in entries if name.lower().rsplit("/",1)[-1] in ("read_me.txt","readme.txt")]
    if not readmes:
        raise SystemExit("No Sprout Lands license documentation found in package")
    license_text="\n".join(z.read(name).decode("utf-8","replace") for name in readmes)
    print("License excerpt:",license_text[:1700].replace("\n"," "))
    if not ("opensource" in license_text.lower() or "open source" in license_text.lower()):
        raise SystemExit("Unable to verify open source project permission for this specific ZIP. Not publishing sprite.")
    if not ("non-commercial" in license_text.lower() or "non commercial" in license_text.lower()):
        raise SystemExit("Unable to verify noncommercial usage restriction. Not publishing sprite.")
    name="Sprout Lands - Sprites - Basic pack/Characters/Basic Charakter Spritesheet.png"
    raw=z.read(name)
    image=Image.open(BytesIO(raw)).convert("RGBA")
    if image.size != (192,192):
        raise SystemExit(f"Unexpected Sprout sheet dimensions: {image.size}")
    (target/"sprout-character.png").write_bytes(raw)
    rows=[]
    for cell in (16,32):
        occupancy=[]
        for row in range(image.height//cell):
            nonempty=[]
            for col in range(image.width//cell):
                region=image.crop((col*cell,row*cell,(col+1)*cell,(row+1)*cell))
                alpha=region.getchannel("A")
                count=sum(v>20 for v in alpha.getdata())
                if count>8:nonempty.append(col)
            occupancy.append(nonempty)
        rows.append(f"{cell}x{cell} grid rows: "+str(occupancy))
    (target/"PROVENANCE.md").write_text(
        "# Sprout Lands Basic character (noncommercial test only)\n\n"
        "Artist: Cup Nooble. Source: "+archive.name+"\n\n"
        "This single original spritesheet is included ONLY for a free noncommercial Re:Dream prototype. "
        "Read the full license inside the original ZIP. Remove or replace before commercial release. "
        "The artist's source credits and licensing terms must remain available.\n\n"
        "## Sheet structure inspection\n\n"+"\n\n".join(rows)+"\n",
        encoding="utf-8")
print("EXTRACTED", image.size, "Sprout preview atlas")

#!/usr/bin/env python3
"""Import character images from approved user-uploaded ZIP packages."""
from pathlib import Path
from zipfile import ZipFile
from io import BytesIO
import json
from PIL import Image, ImageDraw

root=Path(__file__).resolve().parents[1]
out=root/"apps/web/public/sprites/imported"
out.mkdir(parents=True,exist_ok=True)
doc=root/"docs";doc.mkdir(parents=True,exist_ok=True)
sets={
 "char":("char free.zip",{
  "left":"char free/char_walk_left.gif",
  "right":"char free/char_walk_right.gif"})
}

manifest={"characters":{}}
audit=["# Auditoria de sprites enviados","","Quadros extraídos dos GIFs enviados, sem inventar frames. O pacote char free não contém licença; confirmar direitos de distribuição antes de uso comercial.","","O pacote Little Dreamyland NÃO é importado por ter licença não comercial e restrição de redistribuição.",""]
preview=Image.new("RGB",(1100,1000),"#1c2037")
draw=ImageDraw.Draw(preview)
y=10
for key,(archive,chosen) in sets.items():
 source=root/archive
 if not source.exists():
  print("MISSING ARCHIVE",archive)
  continue
 target=out/key;target.mkdir(exist_ok=True)
 info={"archive":archive,"animations":{}}
 audit.append("## "+key+" — "+archive)
 with ZipFile(source) as z:
  if key=="bunny":
   licpath="Little Dreamyland - Free Pack/LICENSE.txt"
   if licpath in z.namelist():
    license=z.read(licpath).decode("utf8","replace")
    (target/"LICENSE.txt").write_text(license,encoding="utf8")
    audit.append("License saved alongside extracted sprites.")
    print("LICENSE:",license[:900].replace("\n"," "))
  for anim,entry in chosen.items():
   raw=z.read(entry)
   im=Image.open(BytesIO(raw))
   width,height=im.size
   count=getattr(im,"n_frames",1)
   audit.append(f"- {anim}: {width}x{height} | internal GIF frames={count} | {entry}")
   print(key,anim,width,height,count)
   if key=="char":
    frames=[]
    for i in range(count):
     im.seek(i)
     fr=im.convert("RGBA")
     bbox=fr.getbbox()
     if bbox:fr=fr.crop(bbox)
     scale=min(54/max(fr.width,1),60/max(fr.height,1))
     dims=(max(1,round(fr.width*scale)),max(1,round(fr.height*scale)))
     fr=fr.resize(dims,Image.Resampling.NEAREST)
     cell=Image.new("RGBA",(64,64))
     cell.alpha_composite(fr,((64-fr.width)//2,62-fr.height))
     frames.append(cell)
    sheet=Image.new("RGBA",(64*len(frames),64))
    for i,fr in enumerate(frames):sheet.alpha_composite(fr,(i*64,0))
    sheet.save(target/(anim+".png"),optimize=True)
    info["animations"][anim]={"path":"sprites/imported/char/"+anim+".png","frameWidth":64,"frameHeight":64,"frames":len(frames)}
   else:
    (target/(anim+".png")).write_bytes(raw)
    info["animations"][anim]={"path":"sprites/imported/bunny/"+anim+".png","width":width,"height":height}
    sheet=im.convert("RGBA")
   if y<860:
    draw.text((12,y),f"{key} / {anim} ({width}x{height})",fill="#ffffff")
    thumbnail=sheet.copy()
    thumbnail.thumbnail((1050,100),Image.Resampling.NEAREST)
    bg=Image.new("RGB",thumbnail.size,"#454967")
    bg.paste(thumbnail,(0,0),thumbnail)
    preview.paste(bg,(12,y+18))
    y+=137
 manifest["characters"][key]=info
 audit.append("")
(out/"manifest.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
(doc/"SPRITE_ASSET_AUDIT.md").write_text("\n".join(audit)+"\n",encoding="utf8")
preview.save(doc/"character-sprite-preview.png",optimize=True)
print("COMPLETE",list(manifest["characters"]))

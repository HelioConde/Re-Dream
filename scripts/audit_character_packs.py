#!/usr/bin/env python3
"""Inspect uploaded ZIPs for character candidates and license notices.
Writes metadata only. Never redistributes third-party sprite data.
"""
from __future__ import annotations
from pathlib import Path
from zipfile import ZipFile, BadZipFile
from io import BytesIO
from PIL import Image
import re, json

root=Path(__file__).resolve().parents[1]
out=root/"docs";out.mkdir(parents=True,exist_ok=True)
reports={}
sections=["# Inventário de personagens dos ZIPs","",
          "Arquivos foram apenas examinados, sem extração para o site. A existência de um arquivo ZIP não autoriza sua redistribuição.",""]
keyword=re.compile(r"(charact|hero|player|farmer|adventur|human|male|female|wizard|knight|warrior|sprite|npc|avatar|actor|bunny|people|walk|run|idle|animat|base sheet|body)",re.I)
exclude=re.compile(r"(tilemap|tileset|terrain|autotile|ground|environment|preview|guide|readme|.aseprite)",re.I)
lic=re.compile(r"(license|licence|licen[cç]a|credits|copyright|attribution|readme|terms|usage)",re.I)
for pack in sorted(root.glob("*.zip")):
    info={"name":pack.name,"files":0,"license_notices":[],"characters":[],"other_examples":[],"error":None}
    try:
        with ZipFile(pack) as zip:
            entries=[p for p in zip.infolist() if not p.is_dir()]
            info["files"]=len(entries)
            for p in entries:
                if lic.search(p.filename) and p.file_size<=16000 and (p.filename.lower().endswith((".txt",".md",".license",".html")) or "." not in p.filename.rsplit("/",1)[-1]):
                    try:
                        txt=zip.read(p).decode("utf-8","replace")
                        info["license_notices"].append({"file":p.filename,"excerpt":txt[:1400]})
                    except Exception as exc:info["license_notices"].append({"file":p.filename,"error":str(exc)[:180]})
            candidates=[p for p in entries if re.search(r"\.(png|gif|webp)$",p.filename,re.I) and keyword.search(p.filename) and not exclude.search(p.filename)]
            for p in candidates[:90]:
                try:
                    with Image.open(BytesIO(zip.read(p))) as img:
                        info["characters"].append({"path":p.filename,"size":[img.width,img.height],"frames":getattr(img,"n_frames",1),"format":img.format})
                except Exception as exc:info["other_examples"].append({"path":p.filename,"error":str(exc)[:70]})
            if not candidates:
                info["other_examples"]=[p.filename for p in entries if p.filename.lower().endswith((".png",".gif"))][:12]
    except Exception as exc:
        info["error"]=str(exc)[:220]
    reports[pack.name]=info
    sections.extend(["","## "+pack.name,f"Arquivos: {info['files']} · candidatos: {len(info['characters'])}"])
    if info["error"]:sections.append("**Erro:** "+info["error"])
    if info["license_notices"]:
        for x in info["license_notices"][:5]:sections.append("- Documento: "+x["file"]+" — "+x.get("excerpt","").replace("\n"," ")[:320])
    else:sections.append("- **Nenhum texto de licença encontrado dentro do ZIP. Verificar a página de origem antes de publicar sprites.**")
    for x in info["characters"][:35]:sections.append("- "+x["path"]+f" — {x['size'][0]}×{x['size'][1]} ({x['frames']} quadros)")
(out/"ASSET_INVENTORY.json").write_text(json.dumps(reports,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
(out/"ASSET_INVENTORY.md").write_text("\n".join(sections)+"\n",encoding="utf-8")
print("AUDITED",len(reports),"ARCHIVES")

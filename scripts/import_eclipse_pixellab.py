#!/usr/bin/env python3
"""Importa PNGs PixelLab já gerados em GameTeste, com origem e SHA-256 fixados.

Sem chave PixelLab e sem consumir créditos: somente baixa assets originais
do próprio autor para o build Phaser do Eclipse Vanguard.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import struct
import tempfile
from urllib.request import Request, urlopen

SOURCE_SHA = "9988400dcd45ed49ad1cbf2047879879a2ca5530"
SOURCE = f"https://raw.githubusercontent.com/HelioConde/GameTeste/{SOURCE_SHA}/assets/pixellab/hero"
DEST = Path(__file__).resolve().parents[1] / "apps/web/src/assets/pixellab/hero"
ACTIONS = ("idle", "run", "attack")
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def read_url(url: str) -> bytes:
    req = Request(url, headers={"User-Agent": "Eclipse-Vanguard-PixelLab-Importer/1.0"})
    with urlopen(req, timeout=40) as response:
        return response.read()


def verify_png(data: bytes, expected: str) -> None:
    if hashlib.sha256(data).hexdigest() != expected:
        raise ValueError("SHA-256 do sprite PixelLab diverge do manifesto")
    if not data.startswith(PNG_MAGIC) or len(data) < 24 or data[12:16] != b"IHDR":
        raise ValueError("Arquivo baixado não é PNG válido")
    w, h = struct.unpack(">II", data[16:24])
    if not (16 <= w <= 256 and 16 <= h <= 256):
        raise ValueError(f"Dimensão inesperada de sprite: {w}x{h}")


def import_frames(apply: bool) -> int:
    if not apply:
        print("SIMULAÇÃO: sprites originais PixelLab do GameTeste (" + SOURCE_SHA + ")")
        for action in ACTIONS:
            print(f"- {action}: manifesto + PNGs 000...; nenhum download/gravação")
        return 0
    manifest = json.loads(read_url(SOURCE + "/manifest.json").decode("utf-8"))
    if manifest.get("generator") != "PixelLab API v2" or manifest.get("target") != "hero":
        raise ValueError("Manifesto de origem não pertence ao herói PixelLab esperado")
    plan: list[tuple[Path, bytes]] = []
    for action in ACTIONS:
        digests = manifest["frames"][action]
        if action == "idle" and len(digests) != 1:
            raise ValueError("Expected one idle frame")
        if action != "idle" and len(digests) != 9:
            raise ValueError("Expected nine frames for run and attack")
        for index, sha256 in enumerate(digests):
            if not isinstance(sha256, str) or len(sha256) != 64:
                raise ValueError("SHA-256 inválido no manifesto")
            dest = DEST / action / f"{index:03d}.png"
            if dest.exists():
                data = dest.read_bytes()
                verify_png(data, sha256)
                continue
            data = read_url(f"{SOURCE}/{action}/{index:03d}.png")
            verify_png(data, sha256)
            plan.append((dest, data))
    # Somente grava após todas as respostas e hashes terem sido validados.
    for dest, data in plan:
        dest.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(dir=dest.parent, delete=False) as tmp:
            tmp.write(data)
            tmp_name = tmp.name
        os.replace(tmp_name, dest)
    DEST.mkdir(parents=True, exist_ok=True)
    (DEST / "manifest.json").write_text(
        json.dumps({"source": "HelioConde/GameTeste", "commit": SOURCE_SHA,
                    "source_manifest": manifest}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8")
    print(f"PIXELLAB OK: {sum(len(manifest['frames'][x]) for x in ACTIONS)} PNGs validados; {len(plan)} importados.")
    return len(plan)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="baixar PNGs e conferir todos os hashes")
    args = ap.parse_args()
    import_frames(args.apply)

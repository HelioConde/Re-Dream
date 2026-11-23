#!/usr/bin/env python3
"""PixelLab v2 -> transparent PNG frames compatible with Godot 4.

No API request happens in dry-run mode. Live mode requires PIXELLAB_API_KEY.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import time
import urllib.error
import urllib.request

from PIL import Image

API_BASE = "https://api.pixellab.ai/v2"
ROOT = Path(__file__).resolve().parents[1] / "assets" / "pixellab"

CHARACTERS = {
    "crystal_imp": (
        "Original whimsical magical forest imp for a bright side-view anime fantasy adventure RPG. "
        "Small friendly-but-dangerous woodland creature with a distinctive round mint-green face, "
        "large expressive cobalt eyes, two leaf-like pointed ears, teal moss coat, twig arms, "
        "flexible root legs, two small translucent turquoise crystal horns and a luminous "
        "moonstone in its chest. Holds a tiny wooden wand crowned by a cyan crystal. "
        "Compact squat silhouette with clearly separated feet and hands, stylized 4-head height. "
        "Vivid emerald, turquoise, periwinkle, coral-gold accents; playful mischievous expression. "
        "Clean carefully hand-authored fantasy pixel art for a 96x96 sprite, facing RIGHT "
        "in side-view, fully visible from crystal horns to toes, one single character centered. "
        "Transparent background, no floor shadow, no scenery, no text, no logos, no copied characters."
    ),
    "root_goblin": (
        "Original root goblin from Eclipse Vanguard Crystal Forest, one single full-body "
        "small sprite, side-view facing RIGHT. Distinct from the Crystal Imp: olive-green "
        "mischievous woodland goblin face with two short tusks, large leaf ears, curved "
        "root-and-bark shoulder guards, lime leaf mantle and a sturdy knotted wooden club "
        "with ONE turquoise crystal embedded. Short wide legs, grounded readable stance, "
        "bold expressive eyes, no giant crystal horns. Vibrant emerald, ivory, copper "
        "and cyan highlights; original magical anime adventure pixel art at 96x96, "
        "crisp clusters and strong 2D action-game silhouette. Transparent background, "
        "full feet and club visible, no scenery, no text, no trademarks."
    ),
    "lunar_moth": (
        "Original lunar moth enemy for Eclipse Vanguard Moon Ruins, one single full-body "
        "flying sprite, side-view facing RIGHT. Expressive moon-white masked face, "
        "lavender fluffy body, FOUR elegant but compact indigo and violet moth wings "
        "with pale crescent patterns, small cyan crystal ornaments and tiny luminous "
        "antennae; clear silhouette and wing separation suitable for animation at "
        "96x96. Smaller and less elaborate than a boss; cute mysterious but menacing "
        "nocturnal magical creature, refined moonlit anime fantasy pixel art, clean "
        "pixel clusters, cobalt/violet/cyan/ivory/gold highlights. Transparent "
        "background, full wings visible, no scenery, no text, no copied designs."
    ),
    "vanguard": (
        "ORIGINAL upbeat anime-fantasy adventurer for a colorful side-scrolling magic action RPG. "
        "One young adult moonblade explorer, full body profile facing RIGHT, 4.5-head-high "
        "stylized heroic proportions, expressive bright turquoise eyes, windswept chestnut "
        "hair with a single golden crescent hair ornament. Wears an ivory adventurer coat "
        "with azure and turquoise panels, short teal scarf fluttering, indigo shorts, "
        "brown travel boots, golden trims and a visible small moonstone amulet; light "
        "flexible clothing, NO bulky full plate armor. Holds one slim enchanted "
        "saber with a glowing cyan crystal near the hilt; optimistic adventurous "
        "confident expression, charming distinctive silhouette. Saturated jewel-tone "
        "palette: cobalt blue, turquoise, ivory, coral-gold accents, luminous cyan magic, "
        "delicate pink highlights. Polished hand-authored 2D anime-adventure pixel art "
        "for a 128x128 sprite with clean clusters and readable face and hands. "
        "Three-quarter side silhouette with head and feet fully visible and centered "
        "consistent character design. One person only, isolated transparent background. "
        "NO scenery, NO shadow on the ground, NO lettering, NO trademark character, "
        "NO reference to existing game franchises."
    ),
    "hero": (
        "Original heroic fantasy swordsman for an action platformer, side-view "
        "full-body pixel art, facing right, feet visible, ready stance, flowing "
        "deep violet cape, navy-blue plate armor, dark messy hair, silver sword "
        "with gold hilt, clean readable silhouette, restrained 32-color palette, "
        "handcrafted 16-bit console pixel art, crisp pixels, one character only, "
        "no landscape, no shadows on floor, no text."
    ),
    "enemy": (
        "Original fantasy dungeon raider, side-view full-body pixel art, facing "
        "right, feet visible, steel gray armor and dusty brown cloth, spiked dark "
        "helmet, short iron sword, menacing red eyes, proportional humanoid, "
        "restrained 32-color palette, handcrafted 16-bit console pixel art, "
        "crisp pixels, one character only, no environment, no text."
    ),
}
MOTIONS = {
    "crystal_imp": {
        "run": (8, "Original crystal imp bounds quickly to the right, twig legs alternate, leaf ears bounce, moonstone chest and same crystal horns stay consistent; transparent side-view animation."),
        "attack": (8, "Original crystal imp winds up glowing crystal-tipped staff then casts one short cyan magical crescent to the right, expressive anticipation and recovery, exact same face, leaf ears and horn layout."),
        "hit": (4, "Original crystal imp reacts briefly to a hit then recovers, leaf ears and small crystal wand remain attached, transparent side-view, identical anatomy."),
    },
    "root_goblin": {
        "run": (8, "The same root goblin bounds sideways to the RIGHT, roots and leaf shoulder armor bounce, legs alternate, club remains in the hand, identical face, tusks and single crystal; transparent."),
        "attack": (8, "The same root goblin winds up and swings its wooden crystal club once toward the RIGHT, clear anticipation, impact and recovery, identical leaves, face and proportions; transparent."),
        "hit": (4, "The same root goblin recoils briefly, keeping club, ears, feet and all roots attached, then recovers without blood; transparent."),
    },
    "lunar_moth": {
        "run": (8, "The same lunar moth gently flaps its FOUR wings while hovering and moving RIGHT, preserve moon patterns, crystal pendants, face and lavender silhouette; transparent."),
        "attack": (8, "The same lunar moth briefly gathers cyan lunar glow then releases one small crescent magic pulse toward RIGHT, wings recoil and return, identity and ornaments preserved; transparent."),
        "hit": (4, "The same lunar moth flinches during flight then stabilizes with four wings intact, moon patterns unchanged, no blood; transparent."),
    },
    "vanguard": {
        "run": (8, "Energetic heroic side-view sprint to the right, springy anime-adventurer motion, teal scarf and hair trailing, natural alternating boot steps, moonstone and costume identical, no scene or camera."),
        "attack": (8, "Fast readable magical saber combo: wind-up, single sweeping turquoise arc toward the right, impact and controlled recovery, keep same ivory coat, teal scarf, chestnut hair, amulet and facial features, no background."),
        "heavy": (8, "Strong two-handed enchanted saber strike with distinct anticipation, turquoise crystal energy and recovery, feet stay aligned, no other characters, consistent same heroic fantasy outfit."),
        "jump": (6, "Side-scroller leap with tucked knees, flowing teal scarf, buoyant upward arc and poised descent, preserve exact character anatomy and outfit, no camera change."),
        "dash": (4, "Quick anime-fantasy side-view dash toward the right, scarf and coat flutter, short cyan spark trail, same character identity and equipment."),
        "skill": (8, "Hero charges moonstone and casts an original luminous turquoise crescent-shaped magical sword wave then recovers, expressive readable poses, same face, outfit and sword."),
        "hit": (4, "Brief readable stumble reaction after taking damage, arms and scarf follow naturally, recover to original standing pose, no blood."),
    },
    "hero": {
        "run": (8, "Side-view looping running cycle moving toward the right, sword and cape follow motion, feet clearly alternate, no camera changes, same character outfit."),
        "attack": (8, "Side-view action platform game attack, one readable rightward sword slash then return to ready stance, retain same helmet, cape and clothes, no camera motion."),
        "heavy": (8, "Side-view heavy overhead sword strike to the right, windup then decisive slash and recover, keep all costume elements consistent."),
        "jump": (6, "Side-view jump upward and soft land, sword held close, boots rise then return to original grounded pose, no camera motion."),
        "dash": (4, "Side-view fast forward dodge dash to the right with cloak trailing, feet remain recognizable, loop returns to initial pose."),
        "skill": (8, "Side-view swordsman channels luminous blue energy and releases an arc with the sword, return to ready stance, maintain character anatomy."),
        "hit": (4, "Side-view short flinch from an enemy hit, recoils slightly and returns to ready stance, keep identity consistent."),
    },
    "enemy": {
        "run": (8, "Side-view running toward the right, armored enemy with short sword, smooth alternating feet, same outfit and proportions."),
        "attack": (8, "Side-view enemy sword attack, telegraph a rightward strike and return to ready pose, keep the same colors and outfit."),
        "hit": (4, "Side-view armored raider recoils from damage and recovers, no equipment changes, no camera movement."),
    },
}


class PixelLabError(RuntimeError):
    pass


def api_request(token: str, method: str, route: str, payload: dict | None = None) -> dict:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(
        API_BASE + route,
        data=body,
        method=method,
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        error_text = exc.read(1024).decode("utf-8", errors="replace")
        raise PixelLabError(f"PixelLab HTTP {exc.code}: {error_text}") from exc
    except (TimeoutError, OSError) as exc:
        raise PixelLabError(f"PixelLab request failed: {type(exc).__name__}") from exc


def parse_png(obj: dict | str) -> bytes:
    encoded = obj.get("base64", "") if isinstance(obj, dict) else obj
    if not isinstance(encoded, str) or not encoded:
        raise PixelLabError("The PixelLab response did not contain a base64 image")
    if "," in encoded and encoded.startswith("data:"):
        encoded = encoded.split(",", 1)[1]
    try:
        raw = base64.b64decode(encoded, validate=True)
        with Image.open(io.BytesIO(raw)) as image:
            if image.width < 16 or image.height < 16 or image.width > 256 or image.height > 256:
                raise PixelLabError("Unexpected PixelLab image size")
            converted = image.convert("RGBA")
            output = io.BytesIO()
            converted.save(output, format="PNG", optimize=True)
            return output.getvalue()
    except (ValueError, OSError, base64.binascii.Error) as exc:
        raise PixelLabError("PixelLab returned an invalid image") from exc


def save_frame(path: Path, png: bytes) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)
    return hashlib.sha256(png).hexdigest()


def wait_for_animation(token: str, job_id: str) -> dict:
    for _ in range(90):
        result = api_request(token, "GET", "/background-jobs/" + job_id)
        status = result.get("status")
        if status == "completed":
            response = result.get("last_response")
            if not isinstance(response, dict) or not isinstance(response.get("images"), list):
                raise PixelLabError("Animation completed with no image frames")
            return response
        if status in ("failed", "cancelled"):
            raise PixelLabError("PixelLab animation failed: " + str(result.get("last_response", {}))[:350])
        time.sleep(6)
    raise PixelLabError("Animation exceeded 9 minutes; check the job on PixelLab: " + job_id)


def generate(target: str, set_name: str, dry_run: bool = False) -> dict:
    description = CHARACTERS[target]
    actions = ["run", "attack"] if set_name == "core" else list(MOTIONS[target])
    output_dir = ROOT / target
    base_path = output_dir / "idle" / "000.png"
    missing = [a for a in actions if not (output_dir / a / "000.png").exists()]
    needs_base = not base_path.exists()
    plan = {"target": target, "mode": set_name, "base_needed": needs_base, "motions_needed": missing}
    if dry_run:
        print("DRY RUN — no PixelLab API calls:", json.dumps(plan, ensure_ascii=False))
        print("PROMPT:", description)
        return plan
    token = os.environ.get("PIXELLAB_API_KEY", "").strip()
    if not token:
        raise PixelLabError("Missing PIXELLAB_API_KEY — set it in GitHub Actions secrets.")
    manifest_path = output_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {
        "generator": "PixelLab API v2", "description": description, "target": target, "frames": {}, "jobs": {}
    }
    if needs_base:
        print(f"Generating original {target} idle sprite with PixelLab Pixen")
        result = api_request(token, "POST", "/create-image-pixen", {
            "description": description,
            "image_size": {"width": 128, "height": 128} if target == "vanguard" else {"width": 96, "height": 96},
            "view": "side",
            "direction": "east",
            "no_background": True,
            "enhance_prompt": False,
        })
        png = parse_png(result["image"])
        manifest["frames"]["idle"] = [save_frame(base_path, png)]
        manifest["jobs"]["idle"] = {"endpoint": "create-image-pixen", "usage": result.get("usage")}
        # Checkpoint: regenerating this master would break animation consistency.
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    for action in missing:
        frame_count, motion = MOTIONS[target][action]
        print(f"Generating {target}/{action} ({frame_count} frames) using PixelLab animation v3")
        starting_image = {"base64": "data:image/png;base64," + base64.b64encode(base_path.read_bytes()).decode("ascii")}
        response = api_request(token, "POST", "/animate-with-text-v3", {
            "first_frame": starting_image,
            "action": motion,
            "frame_count": frame_count,
            "no_background": True,
            "enhance_prompt": False,
        })
        job_id = response.get("background_job_id")
        if not isinstance(job_id, str) or not job_id:
            raise PixelLabError("PixelLab did not provide a background_job_id")
        final = wait_for_animation(token, job_id)
        image_list = final["images"]
        if len(image_list) < 4:
            raise PixelLabError("Animation returned too few frames")
        digests = []
        for index, item in enumerate(image_list):
            digests.append(save_frame(output_dir / action / f"{index:03d}.png", parse_png(item)))
        manifest["frames"][action] = digests
        manifest["jobs"][action] = {"endpoint": "animate-with-text-v3", "job_id": job_id, "prompt": motion, "frames": len(image_list), "usage": response.get("usage")}
        # Keep a checkpoint if the next billed call fails.
        manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"PixelLab finished: {target}, {len(manifest['frames'])} animation states.")
    return plan


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=tuple(CHARACTERS), default="hero")
    parser.add_argument("--set", dest="set_name", choices=("core", "full"), default="core")
    parser.add_argument("--dry-run", action="store_true")
    arguments = parser.parse_args()
    try:
        generate(arguments.target, arguments.set_name, dry_run=arguments.dry_run)
    except (PixelLabError, KeyError) as exc:
        parser.exit(1, f"PixelLab error: {exc}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

import base64
import io
import hashlib
import json
import unittest
from unittest import mock

from PIL import Image
from tools.generate_pixellab import CHARACTERS, MOTIONS, ROOT, PixelLabError, generate, parse_png


class PixelLabPipelineTests(unittest.TestCase):
    def test_supported_characters_have_animations(self):
        self.assertIn("hero", CHARACTERS)
        self.assertIn("vanguard", CHARACTERS)
        self.assertIn("crystal_imp", CHARACTERS)
        self.assertIn("moonstone", CHARACTERS["crystal_imp"].lower())
        self.assertIn("moonblade", CHARACTERS["vanguard"].lower())
        self.assertIn("transparent background", CHARACTERS["vanguard"].lower())
        self.assertIn("enemy", CHARACTERS)
        for name in CHARACTERS:
            self.assertIn("run", MOTIONS[name])
            self.assertIn("attack", MOTIONS[name])

    def test_dry_run_does_not_call_api_or_need_secret(self):
        with mock.patch("tools.generate_pixellab.api_request", side_effect=AssertionError("network accessed")):
            with mock.patch.dict("os.environ", {}, clear=True):
                plan = generate("hero", "core", dry_run=True)
        self.assertEqual(plan["target"], "hero")
        self.assertEqual(plan["mode"], "core")
        self.assertEqual(plan["base_needed"], not (ROOT / "hero/idle/000.png").exists())
        self.assertTrue(set(plan["motions_needed"]).issubset({"run", "attack"}))

    def test_vanguard_preview_does_not_call_paid_api(self):
        with mock.patch("tools.generate_pixellab.api_request", side_effect=AssertionError("API invoked")):
            with mock.patch.dict("os.environ", {}, clear=True):
                plan = generate("vanguard", "core", dry_run=True)
        self.assertEqual(plan["target"], "vanguard")
        source = ROOT / "vanguard"
        self.assertEqual(
            plan["motions_needed"],
            [name for name in ("run", "attack") if not (source / name / "000.png").exists()]
        )
        self.assertEqual(plan["base_needed"], not (source / "idle/000.png").exists())

    def test_switch_requires_complete_vanguard_core(self):
        from pathlib import Path
        root = Path(__file__).resolve().parents[1]
        content = (root / "scripts/hero.gd").read_text(encoding="utf-8")
        self.assertIn('pixel_sprite.setup("vanguard")', content)
        self.assertIn('pixel_sprite.has_core_animations()', content)
        sprite = (root / "scripts/pixel_sprite.gd").read_text(encoding="utf-8")
        self.assertIn('sprite_frames.has_animation("run") and sprite_frames.has_animation("attack")', sprite)

    def test_magical_enemy_assets_are_optional_with_original_fallback(self):
        from pathlib import Path
        with mock.patch("tools.generate_pixellab.api_request", side_effect=AssertionError("unexpected paid call")):
            with mock.patch.dict("os.environ", {}, clear=True):
                plan = generate("crystal_imp", "core", dry_run=True)
        self.assertEqual(plan["target"], "crystal_imp")
        self.assertTrue(set(plan["motions_needed"]).issubset({"run", "attack"}))
        foe_code = (Path(__file__).resolve().parents[1] / "scripts/foe.gd").read_text(encoding="utf-8")
        self.assertIn('pixel_sprite.setup("crystal_imp")', foe_code)
        self.assertIn('if not pixel_sprite.has_core_animations():', foe_code)
        self.assertIn('pixel_sprite.setup("enemy")', foe_code)

    def test_vanguard_generated_frames_match_manifest_and_are_visible(self):
        art = ROOT / "vanguard"
        manifest_file = art / "manifest.json"
        if not manifest_file.exists():
            self.skipTest("Vanguard V2 assets not generated yet")
        manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
        self.assertEqual(manifest.get("target"), "vanguard")
        for state in ("idle", "run", "attack"):
            self.assertIn(state, manifest.get("frames", {}))
            hashes = manifest["frames"][state]
            frames = sorted((art / state).glob("*.png"))
            self.assertEqual(len(frames), len(hashes))
            self.assertGreaterEqual(len(frames), 1 if state == "idle" else 5)
            for index, (frame, expected_hash) in enumerate(zip(frames, hashes)):
                self.assertEqual(frame.name, f"{index:03d}.png")
                self.assertEqual(hashlib.sha256(frame.read_bytes()).hexdigest(), expected_hash)
                with Image.open(frame) as image:
                    self.assertEqual(image.format, "PNG")
                    self.assertEqual(image.size, (128, 128))
                    self.assertEqual(image.mode, "RGBA")
                    alpha = image.getchannel("A")
                    self.assertEqual(alpha.getextrema()[0], 0)
                    self.assertGreater(alpha.getextrema()[1], 0)
                    self.assertIsNotNone(alpha.getbbox())
            if state != "idle":
                self.assertGreater(len(set(hashes)), 3, "Generated frames do not vary enough")

    def test_committed_frames_are_pngs_and_contain_transparency(self):
        idle = ROOT / "hero/idle/000.png"
        if not idle.exists():
            self.skipTest("PNG assets not yet generated")
        for action in ["idle", "run", "attack"]:
            files = sorted((ROOT / "hero" / action).glob("*.png"))
            self.assertGreaterEqual(len(files), 1 if action == "idle" else 4)
            for path in files:
                with Image.open(path) as frame:
                    self.assertEqual(frame.format, "PNG")
                    self.assertEqual(frame.mode, "RGBA")
                    self.assertEqual(frame.size, (96, 96))
                    self.assertEqual(frame.getchannel("A").getextrema()[0], 0)

    def test_approved_character_jump_matches_manifest_and_candidate(self):
        jump = ROOT / "vanguard/jump"
        if not jump.exists():
            self.skipTest("Managed Character jump not integrated yet")
        approved = json.loads((ROOT / "vanguard/manifest.json").read_text(encoding="utf-8"))
        candidate = json.loads((ROOT / "vanguard_character_candidate/character.json").read_text(encoding="utf-8"))
        self.assertEqual(approved["jobs"]["jump"]["character_id"], candidate["character_id"])
        self.assertEqual(approved["frames"]["jump"], candidate["exports"]["jump"]["sha256"])
        frames = sorted(jump.glob("*.png"))
        self.assertEqual(len(frames), 9)
        for i, (path, digest) in enumerate(zip(frames, approved["frames"]["jump"])):
            self.assertEqual(path.name, f"{i:03d}.png")
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), digest)
            with Image.open(path) as frame:
                self.assertEqual(frame.mode, "RGBA")
                self.assertEqual(frame.size, (188, 188))
                self.assertEqual(frame.getchannel("A").getextrema()[0], 0)

    def test_base64_png_can_be_decoded_to_rgba(self):
        source = Image.new("RGB", (96, 96), (23, 45, 67))
        stream = io.BytesIO()
        source.save(stream, format="PNG")
        data = "data:image/png;base64," + base64.b64encode(stream.getvalue()).decode("ascii")
        output = parse_png({"base64": data})
        with Image.open(io.BytesIO(output)) as image:
            self.assertEqual(image.mode, "RGBA")
            self.assertEqual(image.size, (96, 96))

    def test_invalid_image_fails(self):
        with self.assertRaises(PixelLabError):
            parse_png({"base64": "incorrect"})


if __name__ == "__main__":
    unittest.main()

import base64
import io
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
        self.assertEqual(plan["motions_needed"], ["run", "attack"])
        self.assertTrue(plan["base_needed"])

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

"""Cost-free and deterministic tests for PixelLab world candidate generation."""
import base64
import hashlib
import io
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest import mock

from PIL import Image
from tools.generate_pixellab import PixelLabError
from tools.generate_pixellab_world import (
    ROOT, SIZE, WORLD_PROMPTS, decode_background, generate_world,
)


def sample_png(size=SIZE, transparent=False):
    image = Image.new("RGBA", size, (33, 88, 140, 0 if transparent else 255))
    buffer = io.BytesIO()
    image.save(buffer, "PNG")
    return {"base64": "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")}


class PixelLabWorldTests(unittest.TestCase):
    def test_prompts_are_original_backgrounds_without_gameplay_objects(self):
        self.assertEqual(set(WORLD_PROMPTS), {"crystal_forest", "lunar_ruins"})
        self.assertEqual(SIZE, (512, 288))
        for prompt in WORLD_PROMPTS.values():
            self.assertIn("BACKGROUND ONLY", prompt)
            self.assertIn("no logos", prompt)
            self.assertIn("pixel art", prompt)

    def test_preview_never_calls_api_or_creates_files(self):
        with TemporaryDirectory() as directory:
            with mock.patch("tools.generate_pixellab_world.api_request", side_effect=AssertionError("Paid API called")):
                with mock.patch.dict("os.environ", {}, clear=True):
                    plan = generate_world("crystal_forest", root=Path(directory))
            self.assertTrue(plan["needs_generation"])
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_requires_explicit_generate_and_secret(self):
        with TemporaryDirectory() as directory:
            with mock.patch.dict("os.environ", {}, clear=True):
                with self.assertRaises(PixelLabError):
                    generate_world("lunar_ruins", generate=True, root=Path(directory))
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_decodes_native_opaque_png_without_resize(self):
        output = decode_background(sample_png())
        with Image.open(io.BytesIO(output)) as image:
            self.assertEqual(image.format, "PNG")
            self.assertEqual(image.mode, "RGBA")
            self.assertEqual(image.size, SIZE)
            self.assertEqual(image.getchannel("A").getextrema(), (255, 255))

    def test_wrong_size_transparency_or_invalid_image_rejected(self):
        for payload in (sample_png((256, 144)), sample_png(transparent=True), {"base64": "invalid"}):
            with self.assertRaises(PixelLabError):
                decode_background(payload)

    def test_paid_call_is_once_then_checkpoint_prevents_repeat(self):
        with TemporaryDirectory() as directory:
            target = Path(directory)
            with mock.patch.dict("os.environ", {"PIXELLAB_API_KEY": "test-only"}):
                with mock.patch("tools.generate_pixellab_world.api_request", return_value={
                    "image": sample_png(), "usage": {"usd": 0.01}
                }) as api:
                    generate_world("crystal_forest", generate=True, root=target)
                    generate_world("crystal_forest", generate=True, root=target)
                    self.assertEqual(api.call_count, 1)
                    self.assertEqual(api.call_args.args[2], "/create-image-pixen")
                    self.assertFalse(api.call_args.args[3]["no_background"])
            image_path = target / "crystal_forest/background.png"
            manifest = json.loads((target / "crystal_forest/manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest["sha256"], hashlib.sha256(image_path.read_bytes()).hexdigest())
            self.assertFalse(manifest["reviewed"])
            image_path.write_bytes(b"modified")
            with self.assertRaises(PixelLabError):
                generate_world("crystal_forest", generate=True, root=target)

    def test_committed_candidates_require_valid_manifest(self):
        if not ROOT.exists():
            return
        for world_dir in ROOT.iterdir():
            if not world_dir.is_dir():
                continue
            self.assertIn(world_dir.name, WORLD_PROMPTS)
            image_path = world_dir / "background.png"
            manifest_path = world_dir / "manifest.json"
            self.assertTrue(image_path.is_file())
            self.assertTrue(manifest_path.is_file())
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            self.assertEqual(manifest["world"], world_dir.name)
            self.assertEqual(manifest["sha256"], hashlib.sha256(image_path.read_bytes()).hexdigest())
            with Image.open(image_path) as image:
                self.assertEqual(image.size, SIZE)
                self.assertEqual(image.getchannel("A").getextrema(), (255, 255))


if __name__ == "__main__":
    unittest.main()

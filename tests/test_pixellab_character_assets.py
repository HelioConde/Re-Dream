"""Integrity checks for PixelLab managed Character candidates; no API calls."""
import hashlib
import json
from pathlib import Path
import unittest

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT / "assets/pixellab/vanguard/idle/000.png"
CANDIDATE = ROOT / "assets/pixellab/vanguard_character_candidate"


class ManagedCharacterAssets(unittest.TestCase):
    def test_managed_character_frames_and_reference_have_matching_hashes(self):
        manifest_path = CANDIDATE / "character.json"
        if not manifest_path.exists():
            self.skipTest("Managed Character candidate not generated yet")
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
        self.assertEqual(data["stage"], "candidate_ready")
        self.assertEqual(data["reference_sha256"], hashlib.sha256(REFERENCE.read_bytes()).hexdigest())
        self.assertEqual(data["creation_engine"], "create-character-pro/rotate_character")
        self.assertTrue(data["character_id"])
        for action in ("jump", "dash", "hit"):
            self.assertEqual(data["animations"][action]["stage"], "done")
            self.assertTrue(data["animations"][action]["job_id"])
            hashes = data["exports"][action]["sha256"]
            frames = sorted((CANDIDATE / action).glob("*.png"))
            self.assertEqual(len(frames), data["exports"][action]["frames"])
            self.assertEqual(len(frames), len(hashes))
            self.assertGreaterEqual(len(frames), 8)
            self.assertGreaterEqual(len(set(hashes)), 5)
            for index, (file, digest) in enumerate(zip(frames, hashes)):
                self.assertEqual(file.name, f"{index:03d}.png")
                self.assertEqual(hashlib.sha256(file.read_bytes()).hexdigest(), digest)
                with Image.open(file) as image:
                    self.assertEqual(image.format, "PNG")
                    self.assertEqual(image.mode, "RGBA")
                    self.assertGreaterEqual(image.width, 128)
                    self.assertGreaterEqual(image.height, 128)
                    self.assertLessEqual(image.width, 256)
                    self.assertLessEqual(image.height, 256)
                    alpha = image.getchannel("A")
                    self.assertEqual(alpha.getextrema()[0], 0)
                    self.assertGreater(alpha.getextrema()[1], 0)


if __name__ == "__main__":
    unittest.main()

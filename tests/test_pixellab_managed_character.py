import hashlib
import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock

from PIL import Image

from tools import pixellab_managed_character as character


def png(color=(30, 180, 180, 255)):
    canvas = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    for x in range(20, 75):
        for y in range(22, 100):
            canvas.putpixel((x, y), color)
    bio = io.BytesIO()
    canvas.save(bio, format="PNG")
    return bio.getvalue()


def mock_zip(actions):
    bio = io.BytesIO()
    with zipfile.ZipFile(bio, "w") as archive:
        for action in actions:
            for i in range(5):
                img = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
                for x in range(18 + i, 70 + i):
                    for y in range(22, 100):
                        img.putpixel((x, y), (90, 200, 220, 255))
                payload = io.BytesIO()
                img.save(payload, format="PNG")
                archive.writestr(f"animations/{action}/east/frame_{i:03d}.png", payload.getvalue())
    return bio.getvalue()


class ManagedCharacterTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        master = root / "vanguard/idle/000.png"
        master.parent.mkdir(parents=True)
        master.write_bytes(png())
        candidate = root / "vanguard_character_candidate"
        self.patches = [
            mock.patch.object(character, "MASTER", master),
            mock.patch.object(character, "CANDIDATE", candidate),
            mock.patch.object(character, "MANIFEST", candidate / "character.json"),
        ]
        for patch in self.patches:
            patch.start()

    def tearDown(self):
        for patch in reversed(self.patches):
            patch.stop()
        self.tmp.cleanup()

    def test_dry_run_never_invokes_paid_api(self):
        with mock.patch.object(character, "request", side_effect=AssertionError("API used")):
            result = character.run(["jump", "dash"], dry_run=True)
        self.assertTrue(result["create"])
        self.assertEqual(result["actions"], ["jump", "dash"])
        self.assertFalse(character.MANIFEST.exists())

    def test_creates_persistent_character_and_east_animation_from_approved_master(self):
        calls = []
        def fake_request(_token, path, payload=None, binary=False):
            calls.append((path, payload, binary))
            if path == "/create-character-pro":
                return {"character_id": "c-01", "background_job_id": "create-01"}
            if path == "/characters/c-01":
                return {"rotation_urls": {"east": "https://example.invalid/east.png"}}
            if path == "/animate-character":
                return {"background_job_ids": ["anim-01"], "animation_group_id": "g-01"}
            if path == "/characters/c-01/zip":
                return mock_zip(["jump"])
            raise AssertionError(path)
        with mock.patch.dict("os.environ", {"PIXELLAB_API_KEY": "test"}, clear=True):
            with mock.patch.object(character, "request", side_effect=fake_request):
                with mock.patch.object(character, "wait_job", return_value=None) as wait:
                    character.run(["jump"])
        creation = next(payload for path, payload, _ in calls if path == "/create-character-pro")
        self.assertEqual(creation["method"], "rotate_character")
        self.assertEqual(creation["view"], "side")
        self.assertIn("base64", creation["reference_image"])
        animation = next(payload for path, payload, _ in calls if path == "/animate-character")
        self.assertEqual(animation["directions"], ["east"])
        self.assertEqual(animation["mode"], "v3")
        self.assertEqual(animation["character_id"], "c-01")
        self.assertIn("base64", animation["custom_start_frame"])
        self.assertEqual(wait.call_count, 2)
        manifest = character.read_manifest()
        self.assertEqual(manifest["character_id"], "c-01")
        self.assertEqual(manifest["exports"]["jump"]["frames"], 5)
        for i, hash_value in enumerate(manifest["exports"]["jump"]["sha256"]):
            image = character.CANDIDATE / "jump" / f"{i:03d}.png"
            self.assertEqual(hashlib.sha256(image.read_bytes()).hexdigest(), hash_value)

    def test_completed_job_resumes_without_create_or_animation_charges(self):
        character.save_manifest({
            "character_id": "existing-id",
            "reference_sha256": character.reference_hash(),
            "stage": "candidate_ready",
            "animations": {"jump": {"stage": "done", "job_id": "previous"}},
        })
        paths = []
        def fake_request(_token, path, payload=None, binary=False):
            paths.append(path)
            if path == "/characters/existing-id":
                return {"rotation_urls": {"east": "https://example.invalid/east.png"}}
            if path.endswith("/zip"):
                return mock_zip(["jump"])
            raise AssertionError("Unexpected paid action: " + path)
        with mock.patch.dict("os.environ", {"PIXELLAB_API_KEY": "test"}, clear=True):
            with mock.patch.object(character, "request", side_effect=fake_request):
                character.run(["jump"])
        self.assertEqual(paths, ["/characters/existing-id", "/characters/existing-id/zip"])

    def test_new_idle_candidate_reuses_character_and_preserves_previous_exports(self):
        character.save_manifest({
            "character_id": "existing-id",
            "reference_sha256": character.reference_hash(),
            "stage": "candidate_ready",
            "animations": {"jump": {"stage": "done"}},
            "exports": {"jump": {"frames": 9}},
        })
        calls = []
        def fake_request(_token, path, payload=None, binary=False):
            calls.append((path, payload))
            if path == "/characters/existing-id":
                return {"rotation_urls": {"east": "https://example.invalid/east.png"}}
            if path == "/animate-character":
                return {"background_job_ids": ["idle-job"], "animation_group_id": "idle-group"}
            if path.endswith("/zip"):
                return mock_zip(["idle_v2"])
            raise AssertionError(path)
        with mock.patch.dict("os.environ", {"PIXELLAB_API_KEY": "test"}, clear=True):
            with mock.patch.object(character, "request", side_effect=fake_request):
                with mock.patch.object(character, "wait_job"):
                    character.run(["idle_v2"])
        payload = next(payload for path, payload in calls if path == "/animate-character")
        self.assertEqual(payload["character_id"], "existing-id")
        self.assertEqual(payload["animation_name"], "idle_v2")
        self.assertEqual(payload["directions"], ["east"])
        self.assertFalse(any(path == "/create-character-pro" for path, _ in calls))
        self.assertEqual(character.read_manifest()["exports"]["jump"]["frames"], 9)
        self.assertEqual(character.read_manifest()["exports"]["idle_v2"]["frames"], 5)
        self.assertTrue(character.MASTER.exists())

    def test_source_change_blocks_resume_without_api_call(self):
        character.save_manifest({
            "character_id": "existing-id", "reference_sha256": "old", "stage": "ready", "animations": {}
        })
        with mock.patch.dict("os.environ", {"PIXELLAB_API_KEY": "test"}, clear=True):
            with mock.patch.object(character, "request", side_effect=AssertionError("API used")):
                with self.assertRaises(character.PixelLabError):
                    character.run(["jump"])


if __name__ == "__main__":
    unittest.main()

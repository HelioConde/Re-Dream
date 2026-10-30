"""QA of generated Aren sprite animations (pure stdlib, no Pillow needed)."""
from pathlib import Path
import xml.etree.ElementTree as ET
import unittest

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "apps/web/public/art/aren"
SVG = "{http://www.w3.org/2000/svg}"

class ArenAnimationAssetsTest(unittest.TestCase):
    def test_generated_frames_are_valid_transparent_svg(self):
        frames = sorted(ART.glob("*.svg"))
        self.assertEqual(len(frames), 151)
        groups = set()
        for file in frames:
            root = ET.parse(file).getroot()
            self.assertEqual(root.tag, SVG+"svg", file.name)
            self.assertEqual(root.get("viewBox"), "0 0 192 192", file.name)
            self.assertEqual(root.get("width"), "192", file.name)
            self.assertEqual(root.get("height"), "192", file.name)
            self.assertIsNone(root.get("style"), file.name)
            self.assertFalse(root.findall(f".//{SVG}image"), file.name)
            self.assertFalse(root.findall(f".//{SVG}script"), file.name)
            # A sprite cannot contain a filled rectangle that covers the stage.
            self.assertFalse(root.findall(f".//{SVG}rect"), file.name)
            groups.add(file.stem.rsplit("-", 1)[0])
        self.assertEqual(len(groups), 23)

    def test_all_poses_use_the_same_ground_pivot(self):
        for file in ART.glob("*.svg"):
            source=file.read_text(encoding="utf-8")
            self.assertIn('viewBox="0 0 192 192"', source)
            self.assertIn('fill="#f2ccb0"', source, file.name)
            self.assertIn('fill="#233547"', source, file.name)

if __name__ == "__main__":
    unittest.main()

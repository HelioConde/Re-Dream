#!/usr/bin/env python3
"""Validate original Re:Dream arena artwork without screenshots or external dependencies."""
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "apps/web/public/art/arena-dream.svg"
SVG = "{http://www.w3.org/2000/svg}"


class ArenaArtworkTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = ET.parse(ART).getroot()

    def test_original_image_is_valid_svg_16_9(self):
        self.assertEqual(self.root.tag, SVG + "svg")
        self.assertEqual(self.root.get("viewBox"), "0 0 1280 720")
        self.assertEqual(self.root.get("width"), "1280")
        self.assertEqual(self.root.get("height"), "720")

    def test_v3_transparent_layers_are_valid_local_svg_16_9(self):
        for name in ("forest-atmosphere.svg", "forest-foreground.svg"):
            source = ART.with_name(name)
            root = ET.parse(source).getroot()
            self.assertEqual(root.tag, SVG + "svg", name)
            self.assertEqual(root.get("viewBox"), "0 0 1280 720", name)
            self.assertEqual(root.get("width"), "1280", name)
            self.assertEqual(root.get("height"), "720", name)
            self.assertFalse(root.findall(f".//{SVG}image"), name)
            self.assertFalse(root.findall(f".//{SVG}script"), name)
            # No opaque full-screen rectangle may hide characters and platforms.
            self.assertFalse(root.findall(f".//{SVG}rect"), name)

    def test_platforms_are_anchored_to_gameplay_collision_positions(self):
        for platform_id, x, y in [
            ("platform-lower", 220, 466),
            ("platform-upper", 690, 414),
        ]:
            group = self.root.find(f".//*[@id='{platform_id}']")
            self.assertIsNotNone(group)
            paths = group.findall(f"{SVG}path")
            # Stone begins just below the walkable top y; grass itself extends up.
            self.assertTrue(any(f"M{x+7} {y+5}" in p.get("d", "") for p in paths))

    def test_no_external_images_or_embedded_scripts(self):
        self.assertFalse(self.root.findall(f".//{SVG}image"))
        self.assertFalse(self.root.findall(f".//{SVG}script"))
        art = ART.read_text(encoding="utf-8")
        local = art.replace("http://www.w3.org/2000/svg", "")
        local = local.replace("http://www.w3.org/1999/xlink", "")
        self.assertNotIn("http://", local)
        self.assertNotIn("https://", local)


if __name__ == "__main__":
    unittest.main()

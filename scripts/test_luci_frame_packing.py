"""Regression tests for Luci sprite size and anchor normalization."""
import io
import unittest
import zipfile

from PIL import Image
from import_luci_sprites import CELL_SIZE, GROUND_LINE, pack_action_frames


class LuciSpriteSizeTests(unittest.TestCase):
    def make_archive(self, canvas, advance=0):
        """Two distinct frames with unchanged body pixels and optional motion."""
        bio = io.BytesIO()
        with zipfile.ZipFile(bio, "w") as archive:
            for frame in range(2):
                img = Image.new("RGBA", (canvas, canvas))
                x = canvas // 2 - 18 + frame * advance
                y = canvas - 96
                for py in range(y, y + 80):
                    for px in range(x, x + 36):
                        img.putpixel((px, py), (231, 164, 123, 255))
                png = io.BytesIO()
                img.save(png, "PNG")
                archive.writestr(f"frame_{frame:03d}.png", png.getvalue())
        bio.seek(0)
        return bio

    def test_idle_172_and_attack_128_keep_the_same_pixel_scale(self):
        for size in (128, 172):
            with self.subTest(size=size):
                with zipfile.ZipFile(self.make_archive(size)) as z:
                    sheet = pack_action_frames(z, [(0, "frame_000.png"), (1, "frame_001.png")])
                self.assertEqual(sheet.size, (CELL_SIZE * 2, CELL_SIZE))
                first = sheet.crop((0, 0, CELL_SIZE, CELL_SIZE))
                second = sheet.crop((CELL_SIZE, 0, CELL_SIZE * 2, CELL_SIZE))
                self.assertEqual(first.getchannel("A").getbbox()[2] - first.getchannel("A").getbbox()[0], 36)
                self.assertEqual(first.getchannel("A").getbbox()[3] - first.getchannel("A").getbbox()[1], 80)
                self.assertEqual(first.getchannel("A").getbbox()[3], GROUND_LINE)
                self.assertEqual(first.getchannel("A").getbbox(), second.getchannel("A").getbbox())

    def test_walking_or_punching_translation_remains_intact(self):
        with zipfile.ZipFile(self.make_archive(172, advance=10)) as z:
            sheet = pack_action_frames(z, [(0, "frame_000.png"), (1, "frame_001.png")])
        one = sheet.crop((0, 0, CELL_SIZE, CELL_SIZE)).getchannel("A").getbbox()
        two = sheet.crop((CELL_SIZE, 0, CELL_SIZE * 2, CELL_SIZE)).getchannel("A").getbbox()
        self.assertEqual(two[0] - one[0], 10)
        self.assertEqual(two[1], one[1])

    def test_oversized_frame_is_rejected_instead_of_shrunk(self):
        with zipfile.ZipFile(self.make_archive(250)) as z:
            with self.assertRaisesRegex(ValueError, "refusing to rescale"):
                pack_action_frames(z, [(0, "frame_000.png"), (1, "frame_001.png")])


if __name__ == "__main__":
    unittest.main()

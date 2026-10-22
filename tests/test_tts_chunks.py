import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "video/scripts"))
from tts_chunks import split_for_tts


class ChunkTests(unittest.TestCase):
    def test_long_narration_preserves_every_word_in_order(self):
        text = "Check the destination first. " + "Record the next control and compare it with the expected result. " * 8
        chunks = split_for_tts(text)
        self.assertEqual(" ".join(chunks).split(), text.split())
        self.assertTrue(all(len(chunk) <= 140 for chunk in chunks))
        self.assertGreater(len(chunks), 1)

    def test_sentence_boundary_does_not_split_a_word(self):
        text = "Review the header. Check the navigation. Record the result."
        self.assertEqual(split_for_tts(text, 40), ["Review the header. Check the navigation.", "Record the result."])

    def test_invalid_limit_rejected(self):
        with self.assertRaises(ValueError):
            split_for_tts("A sentence.", 0)

if __name__ == "__main__":
    unittest.main()

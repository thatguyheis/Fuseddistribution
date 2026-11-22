"""Compare real recognizer number formatting without accepting altered values/units."""
import ast
from pathlib import Path
import re
import unittest

source = Path(__file__).resolve().parents[1] / 'tools/fused_tech_video.py'
tree = ast.parse(source.read_text())
nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in ('whole_number_words', 'norm_words')]
namespace = {'re': re}
exec(compile(ast.Module(body=nodes, type_ignores=[]), str(source), 'exec'), namespace)
normalize = namespace['norm_words']


class SpeechNumberTests(unittest.TestCase):
    def test_equivalent_actual_whisper_formats(self):
        for actual, intended in [('$24', 'twenty four dollars'), ('30 items', 'thirty items'), ('$72.', 'seventy two dollars.'), ('12 per carton', 'twelve per carton')]:
            with self.subTest(actual=actual):
                self.assertEqual(normalize(actual), normalize(intended))

    def test_value_unit_and_extra_speech_changes_remain_failures(self):
        for actual, intended in [('$72', 'sixty dollars'), ('16', 'sixty'), ('24 cartons', 'twenty four dollars'), ('$24.50', 'twenty four dollars'), ('API', 'IP'), ('H.264', 'H.265'), ("We'll label the units", 'Label the units')]:
            with self.subTest(actual=actual):
                self.assertNotEqual(normalize(actual), normalize(intended))


if __name__ == '__main__':
    unittest.main()

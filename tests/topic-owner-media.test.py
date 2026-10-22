import pathlib
import runpy
import unittest

select_topics = runpy.run_path(str(pathlib.Path(__file__).resolve().parents[1] / 'scripts/topic-inventory.py'))['select_topics']

class OwnerMediaPreference(unittest.TestCase):
    def test_preference_preserves_category_rotation(self):
        topics = [dict(keyword='existing', index=0, category='history', status='editorial-seed-reviewed'),
                  dict(keyword='owner', index=1, category='history', status='editorial-seed-reviewed', preferredOwnerMedia=True),
                  dict(keyword='different', index=2, category='design', status='editorial-seed-reviewed')]
        self.assertEqual([x['keyword'] for x in select_topics(topics)], ['owner', 'different'])
        self.assertEqual(select_topics(topics, ['history'])[0]['keyword'], 'different')

if __name__ == '__main__':
    unittest.main()

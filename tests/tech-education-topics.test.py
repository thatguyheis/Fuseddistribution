import json
import pathlib
import runpy
import subprocess
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
selector = runpy.run_path(str(ROOT / 'scripts/topic-inventory.py'))

class TechEducation(unittest.TestCase):
    def test_briefs_are_complete_and_have_unique_unused_slugs(self):
        pool = json.loads((ROOT / 'public/blog/data/topic-pool.json').read_text())
        topics = [t for t in pool['topics'] if t.get('preferredEducation')]
        self.assertEqual(len(topics), 23)
        slugs = [selector['slugify'](t['keyword']) for t in pool['topics']]
        for topic in topics:
            self.assertEqual(slugs.count(selector['slugify'](topic['keyword'])), 1)
            self.assertEqual(set(topic['strategy']), {'subject','hook','promise','explanation','visualSupport','payoff','variety'})
            self.assertTrue(all(topic['strategy'].values()))
            self.assertTrue(topic['sourceUrls'])
            self.assertTrue(all((ROOT / p).is_file() for p in topic['evidencePaths']))

    def test_preference_keeps_category_variety(self):
        items = [dict(keyword='old', index=0, category='a', status='editorial-seed-reviewed'),
                 dict(keyword='lesson', index=1, category='a', status='editorial-seed-reviewed', preferredEducation=True),
                 dict(keyword='different', index=2, category='b', status='editorial-seed-reviewed')]
        self.assertEqual([x['keyword'] for x in selector['select_topics'](items)], ['lesson','different'])
        self.assertEqual(selector['select_topics'](items,['a'])[0]['keyword'],'different')

    def test_research_brief_carries_hook_and_usage_caveat(self):
        shell = (ROOT / 'public/blog/scripts/gemma-nightly.sh').read_text()
        embedded = shell.split("<<'PYSOURCES'\n",1)[1].split('\nPYSOURCES',1)[0]
        result = subprocess.run(['python3','-c',embedded,str(ROOT / 'public/blog/data/topic-pool.json'),'Whisper captions versus estimated subtitle timing'],capture_output=True,text=True,check=True)
        self.assertIn('Why can correct captions appear at the wrong moment?',result.stdout)
        self.assertIn('proportional fallback',result.stdout)
        self.assertIn('not verified evidence',result.stdout)

if __name__ == '__main__':
    unittest.main()

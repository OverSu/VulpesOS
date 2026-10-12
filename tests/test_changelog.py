"""Changelog exports and remote publication boundaries."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def module(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT/'tools'/file)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


export = module('export', 'export-changelog.py')
sync = module('sync', 'sync-forgejo-changelog.py')


class ChangelogTests(unittest.TestCase):
    def setUp(self):
        self.source, self.languages = export.load_source(ROOT/'changelog.json')
        self.tag = 'android-2.7-preview.14'

    def test_all_outputs_reuse_source_entries(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            files = export.generate(ROOT/'changelog.json', root, root/'site.json', root/'releases')
            data = json.loads(files[root/'site.json'])
            self.assertEqual(data['languages'], self.languages)
            for lang, name in [('fr', 'CHANGELOG.md'), ('en', 'CHANGELOG.en.md')]:
                for entry in self.source['entries']:
                    self.assertIn(entry['text'][lang], files[root/name])

    def test_range_and_summary(self):
        documents = export.release_documents(self.source, self.tag)
        self.assertTrue(documents['release-body.md'].startswith(self.source['releases'][self.tag]['summary']))
        for lang in export.LANGUAGES:
            text = documents[f'CHANGELOG.{lang}.md']
            self.assertIn('## 2.7-preview.14', text)
            self.assertNotIn('## 2.7-156.0.1 ', text)
        future = copy.deepcopy(self.source['entries'][0])
        future['id'] = 'future'
        self.source['entries'].insert(0, future)
        self.assertEqual(documents, export.release_documents(self.source, self.tag))

    def test_scope_and_fixed_ids(self):
        self.assertTrue(any(g['platforms'] == ['pc', 'models']
                            for entry in self.languages['fr'] for g in entry['groups']))
        self.assertEqual(len(self.source['entries']), len({e['id'] for e in self.source['entries']}))

    def test_invalid_source_rejected_before_output(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)/'source.json'
            del self.source['entries'][0]['text']['en']
            p.write_text(json.dumps(self.source))
            with self.assertRaisesRegex(ValueError, 'Missing translation'):
                export.generate(p, Path(d), Path(d)/'site.json', Path(d)/'releases')
            self.assertFalse((Path(d)/'site.json').exists())

    def test_flat_entry_keeps_explicit_platforms_in_both_languages(self):
        for language in export.LANGUAGES:
            for source, rendered in zip(self.source['entries'], self.languages[language]):
                self.assertEqual(rendered['platforms'], source['metadata']['platforms'])
                self.assertEqual(rendered['models'], source['metadata']['models'])
                self.assertEqual(rendered['status'], source['metadata']['status'])
                self.assertEqual(rendered['groups'][0]['platforms'], rendered['platforms'])

    def test_badges_are_images_with_escaped_attributes(self):
        rendered = export.inline('![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) **Camera**')
        self.assertIn('<img class="cl-badge"', rendered)
        self.assertIn('alt="Fix"', rendered)
        self.assertIn('<strong>Camera</strong>', rendered)
        self.assertNotIn('<a ', rendered)
        self.assertNotIn('<img', export.inline('![unsafe](javascript:alert)'))
        self.assertNotIn(' onerror="', export.inline('![\" onerror=\"bad](https://example.org/a.png)'))

    def test_invalid_platform_is_rejected(self):
        self.source['entries'][0]['metadata']['platforms'] = ['unknown']
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'invalid.json'
            path.write_text(json.dumps(self.source))
            with self.assertRaisesRegex(ValueError, 'Invalid platforms'):
                export.load_source(path)

    def test_remote_notes_only(self):
        docs = export.release_documents(self.source, self.tag)
        original = {'id': 24, 'tag_name': self.tag, 'body': 'old notes', 'assets': [
            {'id': 38, 'name': 'preview.apk', 'browser_download_url': 'https://example/apk'},
            *[{'id': n, 'name': f'CHANGELOG.{lang}.md', 'browser_download_url': f'https://example/{lang}'}
              for n, lang in [(40, 'fr'), (41, 'en')]]]}
        calls = []
        def request(url, token=None, method='GET', payload=None, content_type=None):
            calls.append((method, url))
            if '/releases/tags/' in url:
                return json.dumps(original).encode()
            if url.startswith('https://example/'):
                lang = url.rsplit('/', 1)[-1]
                return docs[f'CHANGELOG.{lang}.md'].encode()
            self.assertEqual(method, 'PATCH')
            self.assertEqual(set(payload), {'body'})
            original['body'] = payload['body']
            return b'{}'
        with patch.object(sync, 'request', side_effect=request), patch.dict('os.environ', {'FORGEJO_TOKEN': 'test'}):
            self.assertTrue(sync.sync(ROOT/'changelog.json', self.tag, publish=True))
        self.assertEqual(len([c for c in calls if c[0] != 'GET']), 1)
        self.assertFalse(any(url.endswith('/apk') for _, url in calls))


if __name__ == '__main__':
    unittest.main()

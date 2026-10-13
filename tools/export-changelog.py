#!/usr/bin/env python3
"""Generate Markdown, website data and Forgejo notes from changelog.json."""
import argparse
import hashlib
import html
import json
from pathlib import Path
import re
import runpy

ROOT = Path(__file__).resolve().parents[1]


def inline(value):
    tokens = r'(`[^`]+`|\*\*.+?\*\*|!?\[[^\]]+\]\([^)]+\))'
    def render(match):
        text = match.group()
        if text.startswith('`'):
            return '<code>' + html.escape(text[1:-1]) + '</code>'
        if text.startswith('**'):
            return '<strong>' + html.escape(text[2:-2]) + '</strong>'
        if text.startswith('!['):
            label, url = re.fullmatch(r'!\[([^\]]+)\]\(([^)]+)\)', text).groups()
            badge = re.fullmatch(r'https://img\.shields\.io/badge/[^?]+-([0-9A-Fa-f]{6})\?style=flat-square', url)
            if badge:
                # Website badges are text: visible offline, without image-loading delays.
                return '<span class="cl-badge" style="background:#' + badge[1] + '">' + html.escape(label) + '</span>'
            if url.startswith('https://'):
                return '<img class="cl-badge" src="' + html.escape(url, quote=True) + '" alt="' + html.escape(label, quote=True) + '" height="20" loading="lazy" style="vertical-align:middle;width:auto">'
            return html.escape(label)
        label, url = re.fullmatch(r'\[([^\]]+)\]\(([^)]+)\)', text).groups()
        # Local documentation paths are not website routes.
        # Only HTTPS links are exported.
        if url.startswith('https://'):
            return '<a href="' + html.escape(url, quote=True) + '">' + html.escape(label) + '</a>'
        return html.escape(label)
    return ''.join(render(re.match(tokens, part)) if re.fullmatch(tokens, part) else html.escape(part)
                   for part in re.split(tokens, value, flags=re.DOTALL) if part)


def blocks(lines):
    result, paragraph, items = [], [], []
    def flush():
        if paragraph:
            text = ' '.join(paragraph)
            if not text.startswith(('Détails :', 'Details:')):
                result.append('<p>' + inline(text) + '</p>')
            paragraph.clear()
        if items:
            result.append('<ul>' + ''.join('<li>' + inline(s) + '</li>' for s in items) + '</ul>')
            items.clear()
    for line in lines + ['']:
        if not line.strip():
            flush()
        elif line.startswith('- '):
            if paragraph: flush()
            items.append(line[2:])
        elif items:
            items[-1] += ' ' + line.strip()
        else:
            paragraph.append(line.strip())
    return ''.join(result)


def parse(path):
    return parse_text(path.read_text())


def group_scope(name):
    """Read platform badges as labels, not as image URLs."""
    label = re.sub(r'!\[([^\]]+)\]\([^)]+\)', r'\1', name)
    common = label.startswith(('Commun', 'Shared', 'Toutes les plateformes', 'All Platforms'))
    if common:
        return label, ['pc', 'apk', 'models'], True
    scope = []
    if re.search(r'\bPC\b|Desktop', label): scope.append('pc')
    if 'Android' in label: scope.append('apk')
    if 'Sargo' in label or 'Tundra' in label: scope.append('models')
    if label == 'Web': scope.append('web')
    if not scope:
        raise ValueError('Unknown platform group: ' + label)
    return label, scope, False


def parse_text(markdown):
    entries = []
    months = {name: index for names in (
        ('janvier février mars avril mai juin juillet août septembre octobre novembre décembre'),
        ('january february march april may june july august september october november december'),
    ) for index, name in enumerate(names.split(), 1)}
    for chunk in re.split(r'^## ', markdown, flags=re.MULTILINE)[1:]:
        heading, _, body = chunk.partition('\n')
        if heading.startswith(('Tenue du journal', 'Maintaining this journal')): continue
        title = re.sub(r'^\d{2}/\d{2}/\d{4}\s*:\s*', '', heading)
        version = re.match(r'\d+\.\d+[.\w-]*', title)
        key = version.group() if version else ('development' if title.startswith(('En développement', 'In development')) else 'history')
        kind = 'version' if version else key
        stamp = re.search(r'(\d{1,2}) ([A-Za-zéû]+) (\d{4})', heading)
        date = None
        if stamp and stamp[2].lower() in months:
            date = f'{stamp[3]}-{months[stamp[2].lower()]:02d}-{int(stamp[1]):02d}'
        numeric_date = re.match(r'(\d{2})/(\d{2})/(\d{4})\s*:', heading)
        if numeric_date:
            date = f'{numeric_date[3]}-{numeric_date[2]}-{numeric_date[1]}'
        names = re.findall(r'^### (.+)', body, re.MULTILINE)
        platforms = [p for p in ('pc', 'apk', 'models', 'web')
                     if any(p in group_scope(name)[1] for name in names)] or ['apk']
        status = 'development' if key == 'development' else 'history' if key == 'history' else 'published' if re.search(r'publi[ée]|published', heading, re.I) else 'built'
        release = re.search(r'^\[Release\]\((https://[^)]+)\)', body, re.MULTILINE)
        body = re.sub(r'^\[Release\]\([^)]+\)\s*', '', body, flags=re.MULTILINE)
        # The website already displays the status beside the date/version.
        body = re.sub(r'^!\[(?:Publié|Published|En développement|In development|APK construit · non publié|APK built · not published)\]\([^)]+\)\s*',
                      '', body, flags=re.MULTILINE)
        parts = re.split(r'^### (.+)\n', body, flags=re.MULTILINE)
        groups = []
        intro = blocks(parts[0].splitlines())
        if len(parts) == 1:
            groups.append({'name': '', 'platforms': platforms, 'common': False, 'html': intro})
            intro = ''
        for name, text in zip(parts[1::2], parts[2::2]):
            label, scope, common = group_scope(name)
            # Closing limits belong to the whole entry, not to the last group.
            split = re.split(r'(?=^\*\*(?:Limites|Limitations) :)|(?=^\*\*Limitations:)', text, maxsplit=1, flags=re.MULTILINE)
            groups.append({'name': label, 'nameHtml': inline(name), 'platforms': scope,
                           'common': common, 'html': blocks(split[0].splitlines())})
            if len(split)>1: intro += blocks(split[1].splitlines())
        entries.append({'id': key, 'kind': kind, 'date': date, 'title': heading, 'status': status, 'platforms': platforms,
                        'models': ['sargo'] if 'models' in platforms else [], 'notes': intro,
                        'groups': groups, 'release': release.group(1) if release else None})
    # Number same-day development entries from oldest to newest. Adding a new
    # entry at the top preserves older anchors and avoids duplicate HTML IDs.
    counts = {}
    for entry in reversed(entries):
        if entry['kind'] == 'development':
            base = 'development-' + (entry['date'] or 'undated')
            counts[base] = counts.get(base, 0) + 1
            entry['id'] = base + '-' + str(counts[base])
    return entries


LANGUAGES = ('fr', 'en')
NOTICE = '<!-- Generated from changelog.json. Edit that source, then run tools/export-changelog.py. -->'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def load_source(path):
    source = json.loads(path.read_text())
    require(source.get('schema') == 1, 'Unsupported changelog schema')
    require(set(source['preamble']) == set(LANGUAGES), 'Missing preamble translation')
    require(bool(source['entries']), 'Empty changelog')
    ids = [entry['id'] for entry in source['entries']]
    require(len(set(ids)) == len(ids), 'Duplicate entry IDs')
    languages = {lang: [] for lang in LANGUAGES}
    for entry in source['entries']:
        key = entry['id']
        require(bool(re.fullmatch(r'[a-zA-Z0-9_.-]+', key)), 'Invalid entry ID: ' + key)
        require(set(entry['text']) == set(LANGUAGES), 'Missing translation: ' + key)
        metadata = entry.get('metadata')
        if metadata is not None:
            require(set(metadata) == {'kind', 'status', 'platforms', 'models'}, 'Invalid metadata fields: ' + key)
            require(metadata['kind'] in ('version', 'development', 'history'), 'Invalid entry kind: ' + key)
            require(metadata['status'] in ('development', 'history', 'built', 'published'), 'Invalid entry status: ' + key)
            require(isinstance(metadata['platforms'], list) and bool(metadata['platforms']) and
                    len(set(metadata['platforms'])) == len(metadata['platforms']) and
                    set(metadata['platforms']) <= {'pc', 'apk', 'models', 'web'}, 'Invalid platforms: ' + key)
            require(isinstance(metadata['models'], list) and
                    all(isinstance(model, str) and re.fullmatch(r'[a-z0-9-]+', model) for model in metadata['models']) and
                    (not metadata['models'] or 'models' in metadata['platforms']), 'Invalid models: ' + key)
        for lang in LANGUAGES:
            parsed = parse_text(entry['text'][lang])
            require(len(parsed) == 1, 'Expected one ## entry: ' + key)
            item = parsed[0]
            if metadata is not None:
                require((item['kind'] == 'version') == (metadata['kind'] == 'version'), 'Version metadata mismatch: ' + key)
                item.update(metadata)
                # Flat changelogs keep scope independently of translated prose.
                if len(item['groups']) == 1 and not item['groups'][0]['name']:
                    item['groups'][0]['platforms'] = metadata['platforms']
                else:
                    require(set(metadata['platforms']) == {p for g in item['groups'] for p in g['platforms']},
                            'Group/entry platform mismatch: ' + key)
            if item['kind'] == 'version':
                require(item['id'] == key, 'Version/ID mismatch: ' + key)
            # Development IDs are fixed in the source, independent of order/date.
            item['id'] = key
            languages[lang].append(item)
        a, b = (languages[lang][-1] for lang in LANGUAGES)
        fields = ('kind', 'date', 'status', 'platforms', 'models', 'release')
        require(all(a[f] == b[f] for f in fields), 'Translation metadata differs: ' + key)
        require([(g['platforms'], g['common'], g['html'].count('<li>')) for g in a['groups']] ==
                [(g['platforms'], g['common'], g['html'].count('<li>')) for g in b['groups']],
                'Translation structure differs: ' + key)
    for tag, release in source['releases'].items():
        require(bool(re.fullmatch(r'[a-zA-Z0-9_.-]+', tag)), 'Invalid release tag')
        require(release['version'] in ids and release['after'] in ids, 'Unknown release boundary: ' + tag)
        require(ids.index(release['version']) < ids.index(release['after']), 'Reversed release range: ' + tag)
        require(bool(release['summary'].strip()), 'Missing release summary: ' + tag)
    return source, languages


def release_documents(source, tag):
    release = source['releases'][tag]
    ids = [e['id'] for e in source['entries']]
    selected = source['entries'][ids.index(release['version']):ids.index(release['after'])]
    histories = {}
    for lang in LANGUAGES:
        title = 'Historique cumulatif' if lang == 'fr' else 'Cumulative history'
        note = ('Chaque entrée décrit la situation à sa date. Consulter la synthèse de la release pour son état final.'
                if lang == 'fr' else
                'Each entry describes the state at its date. See the release summary for its final state.')
        histories[lang] = (f'# {title} — {release["after"]} → {release["version"]}\n\n{note}\n\n' +
                           '\n\n'.join(e['text'][lang].strip() for e in selected) + '\n')
    body = release['summary'].strip() + '\n\n'
    if release.get('include_entry'):
        for lang, label in [('fr', '🇫🇷 Français'), ('en', '🇬🇧 English')]:
            summary = selected[0]['text'][lang].strip()
            # Historical build status remains in the dated history, not in a published release's summary.
            summary = re.sub(r'^!\[(?:APK construit · non publié|APK built · not published)\]\([^)]+\)\s*',
                             '', summary, flags=re.MULTILINE)
            body += label + '\n\n' + summary + '\n\n'
    for lang, label in [('fr', '🇫🇷 Historique complet, étape par étape'),
                        ('en', '🇬🇧 Full history, stage by stage')]:
        body += f'<details>\n<summary>{label}</summary>\n\n{histories[lang]}\n</details>\n\n'
    return {'release-body.md': body.rstrip() + '\n',
            **{f'CHANGELOG.{lang}.md': text for lang, text in histories.items()}}


def generate(source_path, root, website, release_dir, release_tag=None):
    source, languages = load_source(source_path)
    outputs = {}
    render = runpy.run_path(str(ROOT/'tools/render-changelog.py'))['render']
    outputs.update({root/name: content for name, content in render(source).items()})
    if website:
        data = {'schema': 1, 'source': {'file': 'changelog.json',
                'sha256': hashlib.sha256(source_path.read_bytes()).hexdigest()}, 'languages': languages}
        outputs[website] = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    tags = [release_tag] if release_tag else source['releases']
    for tag in tags:
        require(tag in source['releases'], 'Unknown release: ' + tag)
        for name, content in release_documents(source, tag).items():
            outputs[release_dir/tag/name] = content
    return outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT/'changelog.json')
    parser.add_argument('--output', type=Path, help='Website changelog-data.json destination')
    parser.add_argument('--release', help='Generate only this Forgejo tag (default: all configured releases)')
    parser.add_argument('--release-dir', type=Path, default=ROOT/'logs/changelog-export')
    parser.add_argument('--check', action='store_true', help='Fail on stale/missing exports without writing')
    args = parser.parse_args()
    try:
        outputs = generate(args.source, ROOT, args.output, args.release_dir, args.release)
        stale = [str(p) for p, content in outputs.items() if not p.exists() or p.read_text() != content]
        if args.check:
            if stale:
                parser.exit(1, 'Stale changelog exports:\n' + '\n'.join(stale) + '\n')
            print(f'{len(outputs)} changelog exports are current.')
        else:
            for path, content in outputs.items():
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content)
            print(f'{len(outputs)} exports generated from {args.source}')
    except (ValueError, KeyError) as error:
        parser.exit(1, f'Changelog validation failed: {error}\n')


if __name__ == '__main__':
    main()

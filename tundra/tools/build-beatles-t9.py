#!/usr/bin/env python3
"""Build small, offline T9 lexicons from Gaia's bundled language wordlists."""
import argparse
import heapq
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORDLISTS = ROOT / 'gaia/apps/keyboard/js/imes/latin/dictionaries'
OUTPUT = ROOT / 'tundra/devices/beatles/t9'


def build(source: Path, destination: Path, limit: int) -> int:
    heap = []
    sequence = 0
    for _, node in ET.iterparse(source, events=('end',)):
        if node.tag != 'w':
            continue
        word = (node.text or '').strip().lower()
        if not word or not word.isalpha():
            node.clear()
            continue
        try:
            frequency = int(node.attrib.get('f', '0'))
        except ValueError:
            frequency = 0
        sequence += 1
        item = (frequency, sequence, word)
        if len(heap) < limit:
            heapq.heappush(heap, item)
        elif item > heap[0]:
            heapq.heapreplace(heap, item)
        node.clear()
    # Stable, high-frequency-first output makes lookups deterministic.
    rows = sorted({(word, frequency) for frequency, _, word in heap},
                  key=lambda item: (-item[1], item[0]))
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(''.join(f'{word}\t{frequency}\n' for word, frequency in rows), encoding='utf-8')
    return len(rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--limit', type=int, default=12000,
                        help='maximum frequent words per Gaia language (default: 12000)')
    args = parser.parse_args()
    if args.limit < 100 or args.limit > 100000:
        parser.error('--limit must be between 100 and 100000')
    sources = sorted(WORDLISTS.glob('*_wordlist.xml'))
    if not sources:
        raise SystemExit('Gaia keyboard wordlists are missing')
    languages = []
    for source in sources:
        locale = source.name.removesuffix('_wordlist.xml')
        count = build(source, OUTPUT / f'{locale.lower()}.tsv', args.limit)
        languages.append((locale, count))
    print(f'Built {len(languages)} offline dictionaries ({sum(n for _, n in languages):,} words).')
    for locale, count in languages:
        print(f'{locale}: {count:,}')


if __name__ == '__main__':
    main()

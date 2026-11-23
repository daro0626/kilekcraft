"""Złóż raport z Minecrafta po zakończeniu wszystkich wybranych silników."""
import argparse
import json
from pathlib import Path


def combine(source, target, engines, version):
    reports = {}
    datapack = None
    for engine in engines:
        folder = source / f'serwer-{engine}'
        report = json.loads((folder / 'testy.json').read_text(encoding='utf-8'))
        results = report['wyniki']
        if not results or any(entry['wersja'] != version for entry in results.values()):
            raise ValueError(f'{engine}: niepełny raport lub inna wersja niż {version}')
        if not report['serwer'].lower().startswith(engine + ' '):
            raise ValueError(f'{engine}: raport innego silnika')
        reports[engine] = report
        if datapack is None and (folder / 'datapack.json').is_file():
            datapack = (folder / 'datapack.json').read_text(encoding='utf-8')
    # Zgodność z MOTD, pytaniami oraz obecnym odczytem datapacka.
    primary = reports.get('vanilla') or next(iter(reports.values()))
    combined = {**primary, 'silniki': reports}
    target.mkdir(parents=True, exist_ok=True)
    (target / 'testy.json').write_text(json.dumps(combined, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if datapack is not None:
        (target / 'datapack.json').write_text(datapack, encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('target', type=Path)
    parser.add_argument('version')
    parser.add_argument('engines', nargs='+', choices=('vanilla', 'paper'))
    args = parser.parse_args()
    combine(args.source, args.target, args.engines, args.version)

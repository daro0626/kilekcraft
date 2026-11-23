"""Sprawdź komplet mobilnych raportów Lighthouse z CI."""
import json
from pathlib import Path
import sys


def check(directory):
    passed = True
    print('| Strona | Performance (≥85) | Accessibility (≥95) |')
    print('|---|---:|---:|')
    pages = ('index', 'serwer', 'hosting', 'komendy', 'budowle', 'edytor', 'komnaty',
             'symulator', 'gry', 'bledy', 'parkour', 'kolo', 'motd', 'lifesteal', 'wyzwanie')
    for page in pages:
        report = json.loads((directory / f'{page}.report.json').read_text())
        if report.get('runtimeError'):
            raise RuntimeError(f"{page}: {report['runtimeError']}")
        categories = report['categories']
        perf = categories['performance']['score'] * 100
        access = categories['accessibility']['score'] * 100
        print(f'| {page} | {perf:.0f} | {access:.0f} |')
        if perf < 85 or access < 95:
            passed = False
    return passed


if __name__ == '__main__':
    sys.exit(0 if check(Path(sys.argv[1])) else 1)

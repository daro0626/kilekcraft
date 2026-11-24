"""Próby prawdziwych funkcji pobieranych ze strony. Serwer i świat są testowe."""
import json
import subprocess
import time
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent


def install_mechanics(workdir, target, meta):
    fixture_dir = workdir / 'komnaty-ci'
    fixture_dir.mkdir(exist_ok=True)
    subprocess.run(['node', ROOT / 'tools/pakuj_komnaty.mjs', fixture_dir, json.dumps(meta)], check=True)
    fixtures = json.loads((fixture_dir / 'komnaty.json').read_text())
    ticks = []
    tick_path = 'data/minecraft/tags/function/tick.json'
    for room in fixtures:
        with ZipFile(fixture_dir / (room['name'] + '.zip')) as pack:
            ticks.extend(json.loads(pack.read(tick_path))['values'])
            for item in pack.namelist():
                if item.startswith('data/kilekcraft/function/'):
                    path = target / item
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(pack.read(item))
    tick = target / tick_path
    tick.parent.mkdir(parents=True, exist_ok=True)
    tick.write_text(json.dumps({'values': ticks}), encoding='utf-8')
    return fixtures


def test_mechanics(rcon, fixtures):
    verified, errors = [], []
    for room in fixtures:
        name, code = room['name'], room['code']
        marker_tag, actor_tag = 'kg_' + name, 'kc_ci_' + name
        marker = f'@e[type=minecraft:marker,tag={marker_tag}]'
        actor = f'@e[type=minecraft:pig,tag={actor_tag},limit=1]'
        runner = f'@e[tag={marker_tag}_g]'
        origin = (64, 100, 64)
        width, height, depth = room['size']
        base = ' '.join(map(str, origin))
        fx, fy, fz = origin

        def pos(x, y, z):
            return f'{fx + room["offset"] + x} {fy + y} {fz + z}'

        def coord(cell):
            return pos(*cell[:3])

        def feet(cell):
            x, y, z = cell[:3]
            return pos(x + .5, y + 1, z + .5)

        def fn(action, prefix=''):
            return rcon.cmd(f'{prefix}function kilekcraft:{name}/{action}')

        def passed(test):
            return 'test passed' in rcon.cmd('execute ' + test).lower()

        def check(test, label, wait=0):
            until = time.monotonic() + wait
            while not passed(test):
                if time.monotonic() >= until:
                    raise AssertionError(f'{label}: {test}')
                time.sleep(.08)

        def block(location, kind, label, wait=0):
            check(f'if block {location} minecraft:{kind}', label, wait)

        rcon.cmd(f'forceload add {fx} {fz - 2} {fx + room["offset"] + width + 2} {fz + depth + 2}')
        obstruction = pos(0, 0, 0)
        sentinel = pos(width + 1, 0, 0)
        start, finish = coord(room['start']), coord(room['finish'])
        wall = pos(-1, 1, 0)
        rising, crumbling, fog = (room['rules'][k] for k in ('lava', 'crumble', 'fog'))
        dark = '{active_effects:[{id:"minecraft:darkness"}]}'
        try:
            for x in range(-1, width + 16, 16):
                for z in range(-1, depth + 16, 16):
                    check(f'if loaded {pos(min(x, width), 0, min(z, depth))}', 'wczytanie obszaru', 8)
            rcon.cmd(f'setblock {obstruction} minecraft:glass')
            rcon.cmd(f'setblock {sentinel} minecraft:glass')
            fn('przygotuj', f'execute positioned {base} run ')
            block(obstruction, 'glass', 'zajęte pole zachowało blok')
            check(f'unless entity {marker}', 'zajęte pole odrzuca budowę')
            block(wall, 'air', 'odrzucona budowa bez ściany')
            rcon.cmd(f'setblock {obstruction} minecraft:air')
            fn('przygotuj', f'execute positioned {base} run ')
            check(f'if entity {marker}', 'znacznik komnaty', 2)
            block(start, 'gold_block', 'start po przygotowaniu')
            block(finish, 'diamond_block', 'meta po przygotowaniu')
            block(wall, 'barrier', 'ściana zabezpiecza obszar')
            rcon.cmd(f'summon minecraft:pig {feet(room["start"])} {{Tags:["{actor_tag}"],NoAI:1b,NoGravity:1b,Invulnerable:1b}}')
            fn('dolacz', f'execute as {actor} at @s run ')
            check(f'if entity {runner}', 'runda przypisana do uczestnika', 2)
            if fog:
                check(f'if data entity {actor} {dark}', 'ciemność w trakcie rundy', 3)
            if crumbling:
                crack = coord(room['crack'])
                rcon.cmd(f'tp {actor} {feet(room["crack"])}')
                block(crack, 'air', 'platforma kruszy się pod uczestnikiem', 4)
                rcon.cmd(f'tp {actor} {feet(room["start"])}')
                block(crack, 'cracked_stone_bricks', 'platforma odbudowuje się bez włażenia w gracza', 8)
            if rising:
                fn('reset')
                first, second = pos(width - 1, 1, depth - 1), pos(width - 1, 2, depth - 1)
                block(first, 'air', 'reset usuwa podniesioną lawę')
                upper = pos(width - 1, min(height - 1, 5), depth - 1)
                # Aktor poza zasięgiem dwóch fal. Dzięki temu testujemy wzrost, a nie odrodzenie.
                x, y, z = room['start'][:3]
                rcon.cmd(f'tp {actor} {pos(x + .5, y + 6, z + .5)}')
                block(first, 'lava', 'pierwsza fala', 8)
                block(second, 'lava', 'druga fala', 4)
                block(upper, 'air', 'lawa rośnie etapami')
                block(start, 'gold_block', 'lawa nie usuwa platformy')
                block(pos(width + 1, 1, 0), 'air', 'lawa pozostaje w osłonie')
            fn('stop')
            check(f'unless entity {runner}', 'stop usuwa znacznik uczestnika', 1)
            if fog:
                check(f'unless data entity {actor} {dark}', 'stop zdejmuje ciemność', 1)
            if rising:
                block(first, 'air', 'stop usuwa pierwszą falę')
                block(second, 'air', 'stop usuwa drugą falę')
            fn('dolacz', f'execute as {actor} at @s run ')
            rcon.cmd(f'tp {actor} {feet(room["finish"])}')
            check(f'unless entity {runner}', 'meta kończy rundę', 2)
            fn('sprzataj')
            check(f'unless entity {marker}', 'sprzątanie usuwa znacznik komnaty', 2)
            block(wall, 'air', 'sprzątanie usuwa ścianę')
            block(start, 'air', 'sprzątanie usuwa mapę')
            block(sentinel, 'glass', 'sprzątanie zachowuje teren obok')
            verified.append(code)
            print('MECHANIKI', code, 'OK', flush=True)
        except AssertionError as e:
            errors.append({'komenda': code, 'odpowiedz': str(e)})
            print('MECHANIKI', code, 'BŁĄD', e, flush=True)
        finally:
            fn('sprzataj')
            rcon.cmd(f'kill {actor}')
            rcon.cmd(f'setblock {sentinel} minecraft:air')
            rcon.cmd(f'setblock {obstruction} minecraft:air')
    return verified, errors

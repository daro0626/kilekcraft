#!/usr/bin/env python3
"""
KILEKCRAFT: automatyczny test komend z kreatora.

Co robi:
  1. Pobiera serwer Minecraft (vanilla od Mojang albo Paper) w podanej wersji.
  2. Uruchamia go z włączonym RCON na płaskim świecie.
  3. Wykonuje komendy wygenerowane z data/komendy.json (ta sama logika co assets/js/komendy.js).
  4. Zapisuje wynik w data/testy.json. Strona pokazuje wtedy status „sprawdzone”.

Uruchomienie (wymaga Javy 25 dla 26.x):
  python3 tools/test_commands.py --version 26.3 --engine vanilla
  python3 tools/test_commands.py --version 26.3 --engine paper

UWAGA: uruchamiając serwer, akceptujesz EULA Minecrafta (https://aka.ms/MinecraftEULA).
Status: skrypt napisany bez dostępu do sieci Mojang/PaperMC. Pierwsze uruchomienie w CI
trzeba obejrzeć. Szczególnie pobieranie Paper przez API v3 (patrz docs/ZADANIA.md, zadanie C1).
"""
import argparse, threading, re, json, os, random, socket, string, struct, subprocess, sys, time, urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / 'data/komendy.json').read_text(encoding='utf-8'))
UA = {'User-Agent': 'kilekcraft-command-tests/1.0 (https://github.com/)'}

# ---------------------------------------------------------------- pobieranie
def get_json(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return json.load(r)

def download(url, dest):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r, open(dest, 'wb') as f:
        f.write(r.read())

def fetch_vanilla(version, dest):
    man = get_json('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json')
    if version == 'latest':
        version = man['latest']['release']
    v = next(x for x in man['versions'] if x['id'] == version)
    meta = get_json(v['url'])
    download(meta['downloads']['server']['url'], dest)
    return version, f'vanilla {version}'

def fetch_paper(version, dest):
    # API v3 (fill.papermc.io). Struktura do potwierdzenia przy pierwszym uruchomieniu.
    builds = get_json(f'https://fill.papermc.io/v3/projects/paper/versions/{version}/builds')
    if isinstance(builds, dict) and 'builds' in builds:
        builds = builds['builds']
    b = builds[0]
    dl = b['downloads'].get('server:default') or next(iter(b['downloads'].values()))
    download(dl['url'], dest)
    return version, f"Paper {version} build {b.get('id', '?')} ({b.get('channel', '?')})"

# ---------------------------------------------------------------- RCON
class Rcon:
    def __init__(self, host, port, pw):
        self.s = socket.create_connection((host, port), timeout=10); self.i = 0
        if self._req(3, pw)[0] == -1:
            raise RuntimeError('RCON: złe hasło')
    def _req(self, typ, body):
        self.i += 1
        data = struct.pack('<ii', self.i, typ) + body.encode('utf-8') + b'\x00\x00'
        self.s.sendall(struct.pack('<i', len(data)) + data)
        ln = struct.unpack('<i', self._read(4))[0]
        pkt = self._read(ln)
        rid, _ = struct.unpack('<ii', pkt[:8])
        return rid, pkt[8:-2].decode('utf-8', 'replace')
    def _read(self, n):
        buf = b''
        while len(buf) < n:
            c = self.s.recv(n - len(buf))
            if not c: raise ConnectionError('RCON zamknięty')
            buf += c
        return buf
    def cmd(self, c):
        return self._req(2, c)[1]

# ---------------------------------------------------------------- komendy (lustro komendy.js)
def comp(text, color, bold=True):
    d = {'text': text, 'color': color}
    if bold: d['bold'] = True
    return json.dumps(d, ensure_ascii=False, separators=(',', ':'))

def commands(new_names=True):
    c = {k: [] for k in ('give', 'effect', 'title', 'tp', 'gamerule', 'whitelist', 'attribute', 'gamemode', 'time',
                         'weather', 'difficulty', 'summon', 'enchant', 'xp', 'kill', 'clear', 'worldborder', 'spawnpoint')}
    for p in DATA['przedmioty']:
        c['give'] += [f"give @a minecraft:{p['id']} 1", f"give @a minecraft:{p['id']} 64"]
    for e in DATA['efekty']:
        c['effect'] += [f"effect give @a minecraft:{e['id']} 30 0", f"effect give @a minecraft:{e['id']} infinite 4 true"]
    for col in DATA['kolory_tekstu']:
        c['title'].append(f"title @a title {comp('Test ąęł', col['id'])}")
    c['title'] += ["title @a times 5 70 20", f"title @a subtitle {comp('Mały napis', 'gold', False)}",
                   f"title @a title {comp('Test ąęł', 'gold', False)}"]
    c['tp'] += ['tp @a 0 100 0', 'tp @a ~ ~10 ~', 'tp @a -20 64 15']
    for z in DATA['zasady']:
        name = z['nowa'] if new_names else z.get('stara')
        if not name: continue
        val = 'true' if z['typ'] == 'bool' else '0'
        c['gamerule'].append(f'gamerule {name} {val}')
    c['whitelist'] += ['whitelist on', 'whitelist add Test_Gracz', 'op Test_Gracz']
    # Serca w LifeSteal: maksymalne zdrowie w punktach (1 serce = 2 punkty).
    # attribute przyjmuje jeden byt, więc „wszyscy” to execute as @a … @s (sprawdzone w CI: @a daje błąd)
    c['attribute'] += [f'execute as @a run attribute @s minecraft:max_health base set {hp}' for hp in (2, 7, 16, 18, 20, 40)]
    c['attribute'] += ['execute as @a run attribute @s minecraft:max_health base reset', 'attribute @p minecraft:max_health base reset']
    c['gamemode'] += [f"gamemode {m['id']} @a" for m in DATA['tryby']]
    c['time'] += [f"time set {p['id']}" for p in DATA['pory']]
    c['weather'] += [f"weather {w['id']}" for w in DATA['pogoda']] + ['weather rain 300s']
    c['difficulty'] += [f"difficulty {d['id']}" for d in DATA['trudnosci']]
    c['summon'] += [f"summon minecraft:{m['id']} ~ ~ ~" for m in DATA['moby']]
    c['summon'].append('summon minecraft:wolf ~ ~ ~ {CustomName:' + json.dumps('Żółw Burek', ensure_ascii=False) + '}')
    for z in DATA['zaklecia']:
        c['enchant'] += [f"enchant @a minecraft:{z['id']} 1", f"enchant @a minecraft:{z['id']} {z['max']}"]
    c['xp'] += ['xp add @a 5 levels', 'xp add @a 100 points', 'xp set @a 0 levels']
    c['kill'] += [f"kill {k['sel']}" for k in DATA['kill_cele']]
    c['clear'] += ['clear @a', 'clear @a minecraft:diamond']
    c['worldborder'] += ['worldborder center 0 0', 'worldborder set 1000', 'worldborder center -100 200', 'worldborder set 2500']
    c['spawnpoint'] += ['spawnpoint @a 0 64 0', 'setworldspawn 0 64 0']
    return c

BAD = ('Unknown or incomplete command', 'Incorrect argument', '<--[HERE]', 'Unknown item', 'Unknown effect',
       'Unknown game rule', 'Invalid', 'Expected', 'Malformed', 'Unknown color', 'Unknown attribute',
       "Can't find element")
OK_ANYWAY = ('No player was found', 'No entity was found')  # składnia dobra, tylko brak graczy


# ---------------------------------------------------------------- datapack (lustro assets/js/export.js)
OFFSET_X = 2
# Mała próbka: rząd do połączenia w fill, pojedyncze bloki i różne typy.
SAMPLE = [[0, 0, 0, 'minecraft:stone'], [1, 0, 0, 'minecraft:stone'], [2, 0, 0, 'minecraft:stone'],
          [0, 1, 0, 'minecraft:gold_block'], [2, 1, 0, 'minecraft:gold_block'], [1, 1, 1, 'minecraft:sea_lantern'],
          [0, 0, 2, 'minecraft:oak_planks'], [1, 0, 2, 'minecraft:oak_planks']]

def export_lines(blocks):
    rows = {}
    for x, y, z, bid in blocks:
        rows.setdefault((y, z, bid), []).append(x)
    out = []
    for (y, z, bid) in sorted(rows, key=lambda k: (k[0], k[1], f'{k[0]},{k[1]},{k[2]}')):
        xs = sorted(rows[(y, z, bid)])
        s = p = xs[0]
        def flush(s, p):
            out.append(f'setblock ~{s + OFFSET_X} ~{y} ~{z} {bid}' if s == p
                       else f'fill ~{s + OFFSET_X} ~{y} ~{z} ~{p + OFFSET_X} ~{y} ~{z} {bid}')
        for x in xs[1:]:
            if x == p + 1: p = x
            else: flush(s, p); s = p = x
        flush(s, p)
    return out

OBJ = 'kc_warstwa'

def layer_functions(blocks, name):
    # Lustro layerFunctions z assets/js/export.js. blocks: [x, y, z, id]; name już bezpieczne.
    tag, who, fn = 'kc_' + name, '#' + name, lambda f: f'kilekcraft:{name}/{f}'
    at = f'at @e[type=minecraft:marker,tag={tag},limit=1]'
    ys = sorted({b[1] for b in blocks})
    n = len(ys)
    if not n: return []
    files = []
    for i, y in enumerate(ys):
        lines = export_lines([b for b in blocks if b[1] == y])
        files.append((f'warstwa_{i + 1}', lines + [f'title @a actionbar {{"text":"Warstwa {i + 1} z {n}","color":"gold"}}']))
        files.append((f'usun_{i + 1}', [l.rsplit(' ', 1)[0] + ' minecraft:air' for l in lines]))
    files.append(('start', [f'kill @e[type=minecraft:marker,tag={tag}]', f'summon minecraft:marker ~ ~ ~ {{Tags:["{tag}"]}}',
                            f'scoreboard objectives add {OBJ} dummy', f'scoreboard players set {who} {OBJ} 0',
                            f'title @s actionbar {{"text":"Start zapamiętany. Warstw: {n}","color":"green"}}']))
    files.append(('nastepna', [f'scoreboard players add {who} {OBJ} 1',
                               f'execute if score {who} {OBJ} matches {n + 1}.. run scoreboard players set {who} {OBJ} {n}']
                  + [f"execute if score {who} {OBJ} matches {i + 1} {at} run function {fn(f'warstwa_{i + 1}')}" for i in range(n)]))
    files.append(('cofnij', [f"execute if score {who} {OBJ} matches {i + 1} {at} run function {fn(f'usun_{i + 1}')}" for i in range(n)]
                  + [f'execute if score {who} {OBJ} matches 1.. run scoreboard players remove {who} {OBJ} 1']))
    files.append(('animacja', [f"function {fn('start')}", f"schedule function {fn('krok')} 10t"]))
    files.append(('krok', [f"function {fn('nastepna')}", f"execute if score {who} {OBJ} matches ..{n - 1} run schedule function {fn('krok')} 10t"]))
    files.append(('koniec', [f"schedule clear {fn('krok')}", f'kill @e[type=minecraft:marker,tag={tag}]',
                             f'scoreboard players reset {who} {OBJ}']))
    return [{'path': f'{name}/{f}.mcfunction', 'text': '\n'.join(lines) + '\n'} for f, lines in files]

def pack_version(jar):
    """Czyta numer formatu datapacka z version.json w pliku serwera."""
    import zipfile, io
    def from_zip(z):
        if 'version.json' in z.namelist():
            return json.loads(z.read('version.json'))
        for n in z.namelist():
            if n.startswith('META-INF/versions/') and n.endswith('.jar'):
                r = from_zip(zipfile.ZipFile(io.BytesIO(z.read(n))))
                if r: return r
        return None
    try:
        v = from_zip(zipfile.ZipFile(jar))
    except Exception as e:
        print('Nie udało się odczytać version.json:', e); return None
    pv = (v or {}).get('pack_version')
    if isinstance(pv, dict):
        return pv.get('data_major', pv.get('data'))
    return pv

def mcmeta_candidates(fmt):
    if fmt is None:
        fmt = json.loads((ROOT / 'data/datapack.json').read_text(encoding='utf-8'))['pack'].get('pack_format', 95)
    return [{'pack_format': fmt, 'min_format': fmt, 'max_format': fmt}, {'pack_format': fmt}]

PALETTE_CANDIDATES = (
    'bricks', 'copper_block', 'cut_copper', 'prismarine', 'dark_prismarine',
    'white_concrete', 'green_concrete', 'red_wool', 'blue_wool', 'moss_block', 'packed_ice',
)
PALETTE_SAMPLE = [(x, 0, 0, 'minecraft:' + name) for x, name in enumerate(PALETTE_CANDIDATES)]


def write_pack(wd, meta):
    d = wd / 'world' / 'datapacks' / 'kilekcraft_test'
    (d / 'data' / 'kilekcraft' / 'function').mkdir(parents=True, exist_ok=True)
    (d / 'pack.mcmeta').write_text(json.dumps({'pack': {'description': 'KILEKCRAFT test', **meta}}), encoding='utf-8')
    (d / 'data' / 'kilekcraft' / 'function' / 'test.mcfunction').write_text('\n'.join(export_lines(SAMPLE)) + '\n', encoding='utf-8')
    (d / 'data' / 'kilekcraft' / 'function' / 'paleta.mcfunction').write_text(
        '\n'.join(export_lines(PALETTE_SAMPLE)) + '\n', encoding='utf-8')
    for name in ('test', 'drugi'):
        folder = d / 'data' / 'kilekcraft' / 'function'
        (folder / name).mkdir(exist_ok=True)
        for function in layer_functions(SAMPLE, name):
            (folder / function['path']).write_text(function['text'], encoding='utf-8')

def test_datapack(rcon, wd, metas):
    """Zwraca (ok, meta, szczegóły)."""
    info = []
    for i, meta in enumerate(metas):
        if i:
            write_pack(wd, meta); info.append(('reload', rcon.cmd('reload')))
        info.append(('enable', rcon.cmd('datapack enable "file/kilekcraft_test"')))
        lst = rcon.cmd('datapack list enabled'); info.append(('list', lst))
        if 'kilekcraft_test' not in lst:
            continue
        info.append(('forceload', rcon.cmd('forceload add 0 0')))
        info.append(('run', rcon.cmd('execute positioned 0 100 0 run function kilekcraft:test')))
        checks = []
        for x, y, z, bid in SAMPLE:
            r = rcon.cmd(f'execute if block {x + OFFSET_X} {100 + y} {z} {bid}')
            checks.append('passed' in r.lower()); info.append((f'{bid} @ {x},{y},{z}', r))
        if all(checks):
            return True, meta, info
    return False, None, info


def test_layers(rcon):
    # Budowanie warstwa po warstwie: start, następna, cofnij i animacja przez schedule.
    info, ok = [], True
    def has(base, blocks, bid=None):
        res = [rcon.cmd(f'execute if block {x + OFFSET_X} {base + y} {z} {bid or b}') for x, y, z, b in blocks]
        return all('passed' in r.lower() for r in res)
    low = [b for b in SAMPLE if b[1] == 0]; high = [b for b in SAMPLE if b[1] == 1]
    info.append(('start', rcon.cmd('execute positioned 0 130 0 run function kilekcraft:test/start')))
    time.sleep(1)  # znacznik z summon jest widoczny dla @e dopiero po ticku; gracz i tak wpisuje komendy po kolei
    info.append(('nastepna 1', rcon.cmd('function kilekcraft:test/nastepna')))
    a, b = has(130, low), has(130, high, 'minecraft:air'); info.append(('po 1. warstwie', f'dół={a} góra pusta={b}')); ok = ok and a and b
    info.append(('nastepna 2', rcon.cmd('function kilekcraft:test/nastepna')))
    a = has(130, high); info.append(('po 2. warstwie', f'góra={a}')); ok = ok and a
    info.append(('cofnij', rcon.cmd('function kilekcraft:test/cofnij')))
    a, c = has(130, high, 'minecraft:air'), has(130, low); info.append(('po cofnij', f'góra pusta={a} dół={c}')); ok = ok and a and c
    info.append(('animacja test', rcon.cmd('execute positioned 0 150 0 run function kilekcraft:test/animacja')))
    info.append(('animacja drugi', rcon.cmd('execute positioned 0 160 0 run function kilekcraft:drugi/animacja')))
    time.sleep(3)
    a, b = has(150, SAMPLE), has(160, SAMPLE)
    info.append(('dwie animacje', f'test={a} drugi={b}')); ok = ok and a and b
    info.append(('cofnij po animacji', rcon.cmd('function kilekcraft:test/cofnij')))
    a, b = has(150, high, 'minecraft:air') and has(150, low), has(160, SAMPLE)
    info.append(('cofnij izolowane', f'test={a} drugi={b}')); ok = ok and a and b

    def marker_exists(name):
        return 'passed' in rcon.cmd(f'execute if entity @e[type=minecraft:marker,tag=kc_{name}]').lower()

    a, b = marker_exists('test'), marker_exists('drugi')
    info.append(('znaczniki po animacji', f'test={a} drugi={b}')); ok = ok and a and b
    info.append(('koniec test', rcon.cmd('function kilekcraft:test/koniec')))
    a, b = not marker_exists('test'), marker_exists('drugi')
    score = rcon.cmd(f'execute unless score #test {OBJ} matches -2147483648..')
    reset = 'passed' in score.lower()
    info.append(('sprzątanie test', f'usunięty={a} drugi={b} wynik wyczyszczony={reset}'))
    ok = ok and a and b and reset and has(160, SAMPLE)
    info.append(('koniec drugi', rcon.cmd('function kilekcraft:drugi/koniec')))
    ok = ok and not marker_exists('drugi')

    rcon.cmd('execute positioned 0 170 0 run function kilekcraft:test/animacja')
    rcon.cmd('function kilekcraft:test/koniec')
    time.sleep(2)
    a = has(170, SAMPLE, 'minecraft:air') and not marker_exists('test')
    info.append(('anulowanie w trakcie', f'bez bloków i znacznika={a}'))
    ok = ok and a
    return ok, info


def palette_ids():
    """Identyfikatory bloków z assets/js/blocks.js (bez portalu, który ma id: null)."""
    src = (ROOT / 'assets/js/blocks.js').read_text(encoding='utf-8')
    return sorted(set(re.findall(r"id:\s*'(minecraft:[a-z0-9_]+)'", src)))


def test_palette(rcon):
    """Każdy blok z palety budowli musi dać się postawić i odczytać na serwerze."""
    ok_ids, errs = [], []
    rcon.cmd('forceload add 0 0')
    for i, bid in enumerate(palette_ids()):
        x, y, z = OFFSET_X + i % 16, 170, i // 16
        put = rcon.cmd(f'setblock {x} {y} {z} {bid}')
        got = rcon.cmd(f'execute if block {x} {y} {z} {bid}')
        if 'passed' in got.lower(): ok_ids.append(bid)
        else: errs.append({'komenda': f'setblock {x} {y} {z} {bid}', 'odpowiedz': (put + ' | ' + got)[:300]})
    return ok_ids, errs


def test_cennik(rcon):
    """Sprawdza parser give na pustym serwerze, bez zmiany ekwipunku gracza."""
    data = json.loads((ROOT / 'data/cennik.json').read_text(encoding='utf-8'))
    ids = sorted({item for row in data['pozycje'] for item in row['id']})
    verified, errors = [], []
    for item in ids:
        cmd = f'give @a {item} 1'
        if not re.fullmatch(r'minecraft:[a-z0-9_]+', item):
            errors.append({'komenda': cmd, 'odpowiedz': 'Nieprawidłowy format identyfikatora'})
            continue
        reply = rcon.cmd(cmd).strip()
        if reply == 'No player was found':
            verified.append(item)
        else:
            errors.append({'komenda': cmd, 'odpowiedz': reply[:300]})
            print('CENNIK', cmd, '→', reply[:160])
    return verified, errors, len(ids)


# ---------------------------------------------------------------- gra „Znajdź błąd”
def test_bledy(rcon):
    """Zła komenda musi dać błąd, dobra musi przejść. Zwraca listę sprawdzonych id i błędy."""
    data = json.loads((ROOT / 'data/bledy.json').read_text(encoding='utf-8'))
    ok_ids, errs = [], []
    for q in data['pytania']:
        wrong = ' '.join(q['tokeny']).lstrip('/')
        good = q['dobra'].lstrip('/')
        rw, rg = rcon.cmd(wrong), rcon.cmd(good)
        def rejected(reply):
            missing_marker = reply.startswith('Time marker ') and ' does not exist for clock ' in reply
            return missing_marker or (any(b in reply for b in BAD) and not any(o in reply for o in OK_ANYWAY))

        wrong_fails = rejected(rw)
        good_passes = bool(rg.strip()) and not rejected(rg)
        print('BŁĄD-GRA', q['id'], 'zła:', 'pada' if wrong_fails else 'PRZECHODZI', '| dobra:', 'OK' if good_passes else 'PADA')
        if wrong_fails and good_passes: ok_ids.append(q['id'])
        else: errs.append({'komenda': q['id'], 'odpowiedz': f'zła → {rw[:140]} | dobra → {rg[:140]}'})
    return ok_ids, errs, len(data['pytania'])


# ---------------------------------------------------------------- MOTD (lustro assets/js/motd.js)
MOTD_SAMPLE = '§4§lK§c§lI§6§lL§e§lE§6§lK§7 Serwer ŻÓŁW 🧱\n§aSerca i sklep \\ komnaty'

def motd_property(raw):
    encoded = raw.encode('utf-16-be', errors='surrogatepass')
    out = []
    escapes = {10: '\\n', 13: '\\r', 9: '\\t', 92: '\\\\', 32: '\\ '}
    for (unit,) in struct.iter_unpack('>H', encoded):
        out.append(escapes.get(unit, '\\u%04X' % unit if not 32 <= unit <= 126 else chr(unit)))
    return 'motd=' + ''.join(out)

def _varint(n):
    b = b''
    while True:
        t = n & 0x7F; n >>= 7
        b += bytes([t | (0x80 if n else 0)])
        if not n: return b

def read_varint(stream):
    result = 0
    for shift in range(0, 35, 7):
        byte = stream.read(1)
        if not byte:
            raise EOFError('Koniec odpowiedzi statusu w trakcie odczytu VarInt')
        result |= (byte[0] & 0x7F) << shift
        if not byte[0] & 0x80:
            return result
    raise ValueError('Zbyt długi VarInt w odpowiedzi statusu')


def status_ping(port):
    from io import BytesIO

    host = b'127.0.0.1'
    hs = _varint(0) + _varint(767) + _varint(len(host)) + host + struct.pack('>H', port) + _varint(1)
    with socket.create_connection(('127.0.0.1', port), timeout=10) as sock, sock.makefile('rb') as stream:
        sock.sendall(_varint(len(hs)) + hs + _varint(1) + _varint(0))
        length = read_varint(stream)
        if not 1 <= length <= 1024 * 1024:
            raise ValueError('Nieprawidłowa długość pakietu statusu')
        payload = stream.read(length)
        if len(payload) != length:
            raise EOFError('Niepełny pakiet statusu')
    packet = BytesIO(payload)
    if read_varint(packet) != 0:
        raise ValueError('Nieprawidłowy identyfikator pakietu statusu')
    text_length = read_varint(packet)
    text = packet.read()
    if len(text) != text_length:
        raise ValueError('Nieprawidłowa długość JSON statusu')
    return json.loads(text.decode('utf-8'))


def flat_text(c):
    if isinstance(c, str): return c
    if isinstance(c, list): return ''.join(map(flat_text, c))
    t = c.get('text', '') if isinstance(c, dict) else ''
    for e in (c.get('extra', []) if isinstance(c, dict) else []): t += flat_text(e)
    return t

# ---------------------------------------------------------------- główny przebieg
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--version', default='latest')
    ap.add_argument('--engine', choices=['vanilla', 'paper'], default='vanilla')
    ap.add_argument('--workdir', default=str(ROOT / '.mc-test'))
    ap.add_argument('--java', default='java')
    ap.add_argument('--report-dir', type=Path, default=ROOT / 'data')
    a = ap.parse_args()

    a.report_dir.mkdir(parents=True, exist_ok=True)
    wd = Path(a.workdir); wd.mkdir(exist_ok=True)
    jar = wd / 'server.jar'
    version, label = (fetch_vanilla if a.engine == 'vanilla' else fetch_paper)(a.version, jar)
    print('Serwer:', label)

    fmt = pack_version(jar); print('Format datapacka z version.json:', fmt)
    metas = mcmeta_candidates(fmt)
    write_pack(wd, metas[0])
    fixtures = []
    if version == '26.3':
        from test_mechaniki import install_mechanics
        fixtures = install_mechanics(wd, wd / 'world/datapacks/kilekcraft_test', metas[0])

    pw = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(24))
    (wd / 'eula.txt').write_text('eula=true\n')
    (wd / 'server.properties').write_text('\n'.join([
        'enable-rcon=true', f'rcon.password={pw}', 'rcon.port=25575', 'server-port=25566', 'server-ip=127.0.0.1',
        'online-mode=false', 'level-type=minecraft\\:flat', 'generate-structures=false',
        'spawn-protection=0', 'max-players=2', 'view-distance=3', 'simulation-distance=3',
        'initial-enabled-packs=vanilla,file/kilekcraft_test',
        motd_property(MOTD_SAMPLE),
    ]) + '\n')

    proc = subprocess.Popen([a.java, '-Xms1G', '-Xmx2G', '-jar', 'server.jar', 'nogui'], cwd=wd,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    ready = threading.Event()
    def pump():  # czyta log cały czas, żeby bufor się nie zapchał
        for line in proc.stdout:
            sys.stdout.write('  | ' + line)
            if 'Done (' in line: ready.set()
    threading.Thread(target=pump, daemon=True).start()
    if not ready.wait(300):
        proc.kill(); sys.exit('Serwer nie wystartował w 5 minut.')

    rcon = None
    for _ in range(30):
        try: rcon = Rcon('127.0.0.1', 25575, pw); break
        except OSError: time.sleep(2)
    if not rcon:
        proc.kill(); sys.exit('Brak połączenia RCON.')

    new_names = not (version.startswith('1.') and tuple(int(x) for x in (version.split('.') + ['0'])[1:3]) < (21, 11))
    results, details, failed = {}, [], 0
    cases = commands(new_names)
    # Dodatkowe polecenia administracyjne testujemy tylko na serwerze.
    cases['whitelist'] += ['whitelist list', 'deop Test_Gracz', 'whitelist remove Test_Gracz']
    for tpl, cmds in cases.items():
        errs = []
        for cmd in cmds:
            out = rcon.cmd(cmd)
            bad = any(b in out for b in BAD) and not any(o in out for o in OK_ANYWAY)
            details.append({'szablon': tpl, 'komenda': cmd, 'odpowiedz': out[:300], 'ok': not bad})
            print(('OK  ' if not bad else 'BŁĄD'), cmd, '→', out[:120].replace('\n', ' '))
            if bad: errs.append({'komenda': cmd, 'odpowiedz': out[:300]})
        failed += len(errs)
        results[tpl] = {'ok': not errs, 'wersja': version, 'silnik': label, 'data': date.today().isoformat(),
                        'przetestowano': len(cmds), 'bledy': errs}
    try:
        st = status_ping(25566); txt = flat_text(st.get('description', ''))
        plain = re.sub('§.', '', txt)
        m_ok = plain == re.sub('§.', '', MOTD_SAMPLE)
        print('MOTD →', repr(txt)[:200], 'OK' if m_ok else 'BŁĄD')
        results['motd'] = {'ok': m_ok, 'wersja': version, 'silnik': label, 'data': date.today().isoformat(), 'przetestowano': 1, 'bledy': [] if m_ok else [{'komenda': 'status', 'odpowiedz': repr(st)[:300]}]}
    except Exception as e:
        print('MOTD: błąd pingu', e)
        results['motd'] = {'ok': False, 'wersja': version, 'silnik': label, 'data': date.today().isoformat(), 'przetestowano': 1, 'bledy': [{'komenda': 'status', 'odpowiedz': str(e)[:300]}]}
    ids, berrs, total = test_bledy(rcon)
    print(f'Zweryfikowane pytania: {len(ids)}/{total}')
    results['bledy'] = {'ok': len(ids) >= 12, 'wersja': version, 'silnik': label, 'data': date.today().isoformat(),
                        'przetestowano': total, 'zweryfikowane': ids, 'bledy': berrs}
    failed += sum(not results[name]['ok'] for name in ('motd', 'bledy'))
    ok, meta, info = test_datapack(rcon, wd, metas)
    for k, v in info: print('DATAPACK', k, '→', v[:160].replace('\n', ' '))
    results['datapack'] = {'ok': ok, 'wersja': version, 'silnik': label, 'data': date.today().isoformat(),
                           'przetestowano': len(SAMPLE), 'bledy': [] if ok else [{'komenda': k, 'odpowiedz': v[:300]} for k, v in info[-6:]]}
    if ok:
        reply = rcon.cmd('execute positioned 0 110 0 run function kilekcraft:paleta')
        print('PALETA funkcja:', reply)
        palette_errors = []
        for x, _, z, block in PALETTE_SAMPLE:
            reply = rcon.cmd(f'execute if block {x + OFFSET_X} 110 {z} {block}')
            print('PALETA', block, reply)
            if 'passed' not in reply.lower():
                palette_errors.append({'komenda': block, 'odpowiedz': reply})
        # Próbka z palety edytora (C10) przez funkcję datapacka; pełną paletę sprawdza test_palette niżej.
        results['paleta_edytor'] = {'ok': not palette_errors, 'wersja': version, 'silnik': label,
                                    'data': date.today().isoformat(), 'przetestowano': len(PALETTE_SAMPLE),
                                    'bledy': palette_errors}
        failed += len(palette_errors)
    if ok:
        lok, linfo = test_layers(rcon)
        for k, v in linfo: print('WARSTWY', k, '→', v[:160].replace('\n', ' '))
        results['warstwy'] = {'ok': lok, 'wersja': version, 'silnik': label, 'data': date.today().isoformat(),
                              'przetestowano': 8, 'bledy': [] if lok else [{'komenda': k, 'odpowiedz': v[:300]} for k, v in linfo]}
        failed += not lok
        pids, perrs = test_palette(rcon)
        print(f'Paleta bloków: {len(pids)}/{len(palette_ids())}')
        results['paleta'] = {'ok': not perrs, 'wersja': version, 'silnik': label, 'data': date.today().isoformat(),
                             'przetestowano': len(palette_ids()), 'zweryfikowane': pids, 'bledy': perrs}
        failed += bool(perrs)
        (a.report_dir / 'datapack.json').write_text(json.dumps({
            '_opis': 'Zawartość pack.mcmeta dla eksportowanych datapacków. Zapisane przez tools/test_commands.py po udanym teście.',
            'pack': meta, 'sprawdzone': True, 'wersja': version, 'silnik': label, 'data': date.today().isoformat()},
            ensure_ascii=False, indent=2), encoding='utf-8')
    else:
        failed += 1
    if fixtures:
        from test_mechaniki import test_mechanics
        verified, errors = test_mechanics(rcon, fixtures) if ok else ([], [{'komenda': 'datapack', 'odpowiedz': 'Próbny datapack nie przeszedł.'}])
        results['komnaty_mechanika'] = {'ok': len(verified) == len(fixtures) and not errors, 'wersja': version,
                                        'silnik': label, 'data': date.today().isoformat(), 'przetestowano': len(fixtures),
                                        'zweryfikowane': verified, 'bledy': errors}
        failed += not results['komnaty_mechanika']['ok']
    cids, cerrs, ctotal = test_cennik(rcon)
    print(f'Identyfikatory cennika: {len(cids)}/{ctotal}')
    results['cennik'] = {'ok': ctotal > 0 and not cerrs, 'wersja': version, 'silnik': label,
                         'data': date.today().isoformat(), 'przetestowano': ctotal,
                         'zweryfikowane': cids, 'bledy': cerrs}
    failed += not results['cennik']['ok']
    try: rcon.cmd('stop')
    except Exception: pass
    proc.wait(timeout=120)

    out = {'_opis': 'Wyniki automatycznego testu komend. Plik nadpisuje tools/test_commands.py.',
           'serwer': label, 'data': date.today().isoformat(), 'wyniki': results, 'szczegoly': details}
    (a.report_dir / 'testy.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    if fixtures:
        print('RAPORT_MECHANIKI ' + json.dumps(results['komnaty_mechanika'], ensure_ascii=False))
    print(f'\nZapisano data/testy.json. Błędów: {failed}')
    sys.exit(1 if failed else 0)

if __name__ == '__main__':
    main()

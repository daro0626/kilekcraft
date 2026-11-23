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
    c = {k: [] for k in ('give', 'effect', 'title', 'tp', 'gamerule', 'whitelist')}
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
    return c

BAD = ('Unknown or incomplete command', 'Incorrect argument', '<--[HERE]', 'Unknown item', 'Unknown effect',
       'Unknown game rule', 'Invalid', 'Expected', 'Malformed', 'Unknown color')
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

def write_pack(wd, meta):
    d = wd / 'world' / 'datapacks' / 'kilekcraft_test'
    (d / 'data' / 'kilekcraft' / 'function').mkdir(parents=True, exist_ok=True)
    (d / 'pack.mcmeta').write_text(json.dumps({'pack': {'description': 'KILEKCRAFT test', **meta}}), encoding='utf-8')
    (d / 'data' / 'kilekcraft' / 'function' / 'test.mcfunction').write_text('\n'.join(export_lines(SAMPLE)) + '\n', encoding='utf-8')

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


# ---------------------------------------------------------------- gra „Znajdź błąd”
def test_bledy(rcon):
    """Zła komenda musi dać błąd, dobra musi przejść. Zwraca listę sprawdzonych id i błędy."""
    data = json.loads((ROOT / 'data/bledy.json').read_text(encoding='utf-8'))
    ok_ids, errs = [], []
    for q in data['pytania']:
        wrong = ' '.join(q['tokeny']).lstrip('/')
        good = q['dobra'].lstrip('/')
        rw, rg = rcon.cmd(wrong), rcon.cmd(good)
        wrong_fails = any(b in rw for b in BAD) and not any(o in rw for o in OK_ANYWAY)
        good_passes = not (any(b in rg for b in BAD) and not any(o in rg for o in OK_ANYWAY))
        print('BŁĄD-GRA', q['id'], 'zła:', 'pada' if wrong_fails else 'PRZECHODZI', '| dobra:', 'OK' if good_passes else 'PADA')
        if wrong_fails and good_passes: ok_ids.append(q['id'])
        else: errs.append({'komenda': q['id'], 'odpowiedz': f'zła → {rw[:140]} | dobra → {rg[:140]}'})
    return ok_ids, errs, len(data['pytania'])


# ---------------------------------------------------------------- MOTD (lustro assets/js/motd.js)
MOTD_SAMPLE = '§4§lK§c§lI§6§lL§e§lE§6§lK§7 Serwer ŻÓŁW\n§aSerca i sklep'

def motd_property(raw):
    out = []
    for ch in raw:
        if ch == '\n': out.append('\\n')
        elif ord(ch) > 126: out.append('\\u%04X' % ord(ch))
        else: out.append(ch)
    return 'motd=' + ''.join(out)

def _varint(n):
    b = b''
    while True:
        t = n & 0x7F; n >>= 7
        b += bytes([t | (0x80 if n else 0)])
        if not n: return b

def status_ping(port):
    s = socket.create_connection(('127.0.0.1', port), timeout=10)
    host = b'127.0.0.1'
    hs = _varint(0) + _varint(767) + _varint(len(host)) + host + struct.pack('>H', port) + _varint(1)
    s.sendall(_varint(len(hs)) + hs + _varint(1) + _varint(0))
    def rv():
        n = sh = 0
        while True:
            b = s.recv(1)[0]; n |= (b & 0x7F) << sh; sh += 7
            if not b & 0x80: return n
    ln = rv(); data = b''
    while len(data) < ln: data += s.recv(ln - len(data))
    i = 1; n = sh = 0  # pomijamy id pakietu, czytamy długość tekstu
    while True:
        b = data[i]; i += 1; n |= (b & 0x7F) << sh; sh += 7
        if not b & 0x80: break
    return json.loads(data[i:i + n].decode('utf-8'))

def flat_text(c):
    if isinstance(c, str): return c
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
    a = ap.parse_args()

    wd = Path(a.workdir); wd.mkdir(exist_ok=True)
    jar = wd / 'server.jar'
    version, label = (fetch_vanilla if a.engine == 'vanilla' else fetch_paper)(a.version, jar)
    print('Serwer:', label)

    fmt = pack_version(jar); print('Format datapacka z version.json:', fmt)
    metas = mcmeta_candidates(fmt)
    write_pack(wd, metas[0])

    pw = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(24))
    (wd / 'eula.txt').write_text('eula=true\n')
    (wd / 'server.properties').write_text('\n'.join([
        'enable-rcon=true', f'rcon.password={pw}', 'rcon.port=25575', 'server-port=25566',
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
        m_ok = 'KILEK' in plain and 'ŻÓŁW' in plain and 'Serca i sklep' in plain
        print('MOTD →', repr(txt)[:200], 'OK' if m_ok else 'BŁĄD')
        results['motd'] = {'ok': m_ok, 'wersja': version, 'silnik': label, 'data': date.today().isoformat(), 'przetestowano': 1, 'bledy': [] if m_ok else [{'komenda': 'status', 'odpowiedz': repr(st)[:300]}]}
    except Exception as e:
        print('MOTD: błąd pingu', e)
        results['motd'] = {'ok': False, 'wersja': version, 'silnik': label, 'data': date.today().isoformat(), 'przetestowano': 1, 'bledy': [{'komenda': 'status', 'odpowiedz': str(e)[:300]}]}
    ids, berrs, total = test_bledy(rcon)
    # Pytanie bez potwierdzenia nie psuje testu, tylko znika z gry.
    results['bledy'] = {'ok': len(ids) > 0, 'wersja': version, 'silnik': label, 'data': date.today().isoformat(),
                        'przetestowano': total, 'zweryfikowane': ids, 'bledy': berrs}
    ok, meta, info = test_datapack(rcon, wd, metas)
    for k, v in info: print('DATAPACK', k, '→', v[:160].replace('\n', ' '))
    results['datapack'] = {'ok': ok, 'wersja': version, 'silnik': label, 'data': date.today().isoformat(),
                           'przetestowano': len(SAMPLE), 'bledy': [] if ok else [{'komenda': k, 'odpowiedz': v[:300]} for k, v in info[-6:]]}
    if ok:
        (ROOT / 'data/datapack.json').write_text(json.dumps({
            '_opis': 'Zawartość pack.mcmeta dla eksportowanych datapacków. Zapisane przez tools/test_commands.py po udanym teście.',
            'pack': meta, 'sprawdzone': True, 'wersja': version, 'silnik': label, 'data': date.today().isoformat()},
            ensure_ascii=False, indent=2), encoding='utf-8')
    else:
        failed += 1
    try: rcon.cmd('stop')
    except Exception: pass
    proc.wait(timeout=120)

    out = {'_opis': 'Wyniki automatycznego testu komend. Plik nadpisuje tools/test_commands.py.',
           'serwer': label, 'data': date.today().isoformat(), 'wyniki': results, 'szczegoly': details}
    (ROOT / 'data/testy.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'\nZapisano data/testy.json. Błędów: {failed}')
    sys.exit(1 if failed else 0)

if __name__ == '__main__':
    main()

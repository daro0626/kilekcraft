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
import argparse, threading, json, os, random, socket, string, struct, subprocess, sys, time, urllib.request
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
    c['title'] += ["title @a times 10 70 20", f"title @a subtitle {comp('Mały napis', 'gold', False)}"]
    c['tp'] += ['tp @a 0 100 0', 'tp @a ~ ~10 ~', 'tp @a -20 64 15']
    for z in DATA['zasady']:
        name = z['nowa'] if new_names else z.get('stara')
        if not name: continue
        val = 'true' if z['typ'] == 'bool' else '0'
        c['gamerule'].append(f'gamerule {name} {val}')
    c['whitelist'] += ['whitelist on', 'whitelist add Test_Gracz', 'whitelist list', 'op Test_Gracz', 'deop Test_Gracz', 'whitelist remove Test_Gracz']
    return c

BAD = ('Unknown or incomplete command', 'Incorrect argument', '<--[HERE]', 'Unknown item', 'Unknown effect',
       'Unknown game rule', 'Invalid', 'Expected', 'Malformed', 'Unknown color')
OK_ANYWAY = ('No player was found', 'No entity was found')  # składnia dobra, tylko brak graczy

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

    pw = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(24))
    (wd / 'eula.txt').write_text('eula=true\n')
    (wd / 'server.properties').write_text('\n'.join([
        'enable-rcon=true', f'rcon.password={pw}', 'rcon.port=25575', 'server-port=25566',
        'online-mode=false', 'level-type=minecraft\\:flat', 'generate-structures=false',
        'spawn-protection=0', 'max-players=2', 'view-distance=3', 'simulation-distance=3',
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
    for tpl, cmds in commands(new_names).items():
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

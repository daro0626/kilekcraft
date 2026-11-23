"""Testy lokalnej strony uruchomionej przez python3 -m http.server 8000."""
from itertools import product
import os
import json
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

from test_commands import DATA, commands, export_lines, layer_functions, SAMPLE, motd_property, MOTD_SAMPLE, palette_ids


BASE = 'http://127.0.0.1:8000'
READY = {
    'index': '#title.ready',
    'serwer': '#shorts .short',
    'hosting': '#results article',
    'komendy': '#out > div',
    'budowle': '#viewer canvas, #poster:text("Użyj mapy")',
    'edytor': '#stage canvas',
    'komnaty': '#stats .panel',
    'symulator': '#kpis .kpi, #szStart',
    'gry': '.tool-card',
    'bledy': '#start',
    'parkour': '#gl',
    'kolo': '#r0 div',
    'motd': '#pvMotd div',
    'lifesteal': '#shorts .short',
    'wyzwanie': '#gl',
}

# Nazwy typów z assets/js/builds.js dla próbki z test_commands.SAMPLE
SAMPLE_TYPES = {'minecraft:stone': 'stone', 'minecraft:gold_block': 'gold', 'minecraft:sea_lantern': 'lantern', 'minecraft:oak_planks': 'oak_planks'}


def export_parity(page):
    blocks = [[x, y, z, SAMPLE_TYPES[b]] for x, y, z, b in SAMPLE]
    actual = page.evaluate('async b => (await import("./assets/js/export.js")).exportLines(b)', blocks)
    assert actual == export_lines(SAMPLE), (actual, export_lines(SAMPLE))
    layers = page.evaluate('async b => (await import("./assets/js/export.js")).layerFunctions(b, "test")', blocks)
    assert layers == layer_functions(SAMPLE, 'test'), (layers, layer_functions(SAMPLE, 'test'))
    from test_commands import PALETTE_SAMPLE
    for _, _, _, block in PALETTE_SAMPLE:
        swatch = page.locator('#pal [data-t="' + block.split(':')[1] + '"]')
        swatch.click()
        expect(swatch).to_have_attribute('aria-checked', 'true')
        expect(page.locator('#palName')).to_contain_text(block)
    actual = page.evaluate(
        'async names => (await import("./assets/js/export.js")).exportLines(names)',
        [[x, y, z, block.split(':')[1]] for x, y, z, block in PALETTE_SAMPLE],
    )
    assert actual == export_lines(PALETTE_SAMPLE), actual


def smoke(page, name):
    response = page.goto(f'{BASE}/{name}.html')
    assert response.ok, (name, response.status)
    if name == 'budowle':
        page.locator('#viewer').scroll_into_view_if_needed()
    expect(page.locator(READY[name]).first).to_be_attached()
    if name == 'index':
        page.locator('#hero3d').scroll_into_view_if_needed()
        expect(page.locator('#hero3d canvas, #hero3d .poster:text("Twoja przeglądarka")')).to_be_visible()
    expect(page.locator('footer')).to_contain_text('NOT AN OFFICIAL MINECRAFT SERVICE.')


def parkour(page, mobile):
    code = page.locator('#code')
    code.fill('L4-K-4821')
    code.press('Enter')
    expect(page.locator('#ovText')).to_contain_text('Labirynt')
    expect(page.locator('#play')).to_be_visible()
    if mobile:
        page.locator('#play').tap()
        expect(page.locator('#jumpBtn')).to_be_visible()
        page.locator('#jumpBtn').tap()
        expect(page.locator('#time')).not_to_have_text('0,00')
    else:
        page.locator('#play').press('Enter')
        expect(page.locator('#gl')).to_be_focused()
        page.keyboard.press('Space')
        expect(page.locator('#time')).not_to_have_text('0,00')
    page.locator('#gl').press('Escape')
    expect(page.locator('#play')).to_be_focused()
    expect(page.locator('#ovTitle')).to_have_text('Pauza')



def parkour_input(page, verify_physics=True):
    # Diagnostyka podłączona przez Playwright do prawdziwych funkcji gry.
    def instrument(route):
        response = route.fetch()
        source = response.text()
        hook = """
          window.parkourProbe = {
            keys: () => [...keys],
            xz: () => [pos.x, pos.z],
            yaw: () => yaw,
            roof() {
              reset(false);
              const x = Math.floor(pos.x), z = Math.floor(pos.z);
              const ceiling = Math.floor(pos.y) + 2;
              solid.set(k3(x, ceiling, z), 'stone');
              jumpBuffer = .12;
              const render = renderer.render;
              renderer.render = () => {};
              let maximum = 0;
              try {
                for (let i = 0; i < 60; i++) {
                  step(tick);
                  for (const angle of [-1.45, -.85, 0, .85, 1.45]) {
                    pitch = angle;
                    draw(performance.now(), true);
                    camera.updateMatrixWorld();
                    maximum = Math.max(maximum, camera.position.y);
                    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
                      const corner = new THREE.Vector3(sx, sy, -1).unproject(camera);
                      maximum = Math.max(maximum, corner.y);
                    }
                  }
                }
              } finally { renderer.render = render; }
              return maximum < ceiling;
            },
            longGhost() {
              reset(true);
              started = true;
              for (let i = 0; i < 72000; i++) step(tick);
              const count = recording.length;
              win();
              const data = JSON.stringify(store.get('pk:ghost:' + encode(state)));
              return {count, bytes: data.length * 2, last: JSON.parse(data).at(-1)[0]};
            },
          };
        """
        source = source.replace('  return { loadLevel, play };', hook + '  return { loadLevel, play };')
        route.fulfill(response=response, body=source)

    page.route('**/assets/js/parkour-game.js', instrument)
    page.add_init_script("""HTMLCanvasElement.prototype.requestPointerLock = function() {
        return Promise.reject(new DOMException('Blokada niedostępna', 'NotAllowedError'));
    };""")
    page.goto(f'{BASE}/parkour.html?regresja#L4-K-4821')
    page.locator('#play').click()
    canvas = page.locator('#gl')
    expect(canvas).to_be_focused()
    hint = page.locator('.pk-hint')
    expect(hint).to_contain_text('Przeciągnij')
    viewport = page.viewport_size
    page.set_viewport_size({'width': 390, 'height': 844})
    bounds = page.locator('#wrapG').bounding_box()
    shown = hint.bounding_box()
    assert bounds['x'] <= shown['x'] and shown['x'] + shown['width'] <= bounds['x'] + bounds['width']
    page.set_viewport_size(viewport)
    origin = page.evaluate('parkourProbe.xz()')
    canvas.dispatch_event('keydown', dict(code='KeyA', key='a'))
    page.wait_for_function('(start) => parkourProbe.xz().some((p,i) => Math.abs(p-start[i]) > .04)', arg=origin)
    canvas.dispatch_event('keyup', dict(code='KeyA', key='ą', altKey=True, ctrlKey=True))
    assert page.evaluate('parkourProbe.keys()') == []
    page.wait_for_timeout(300)
    stopped = page.evaluate('parkourProbe.xz()')
    page.wait_for_timeout(160)
    assert page.evaluate('parkourProbe.xz()') == stopped
    canvas.dispatch_event('keydown', dict(code='KeyE', key='ę', altKey=True, ctrlKey=True))
    assert page.evaluate('parkourProbe.keys()') == []
    before = page.evaluate('parkourProbe.yaw()')
    box = canvas.bounding_box()
    x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    page.mouse.move(x, y)
    page.mouse.down()
    page.mouse.move(x + 64, y + 22, steps=4)
    page.mouse.up()
    assert page.evaluate('parkourProbe.yaw()') != before
    canvas.dispatch_event('keydown', dict(code='KeyA', key='a'))
    page.evaluate("window.dispatchEvent(new Event('blur'))")
    expect(page.locator('#over')).to_be_visible()
    assert page.evaluate('parkourProbe.keys()') == []
    page.locator('#play').click()
    canvas.dispatch_event('keydown', dict(code='KeyA', key='a'))
    page.evaluate("""() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
        delete document.hidden;
    }""")
    expect(page.locator('#over')).to_be_visible()
    assert page.evaluate('parkourProbe.keys()') == []
    if verify_physics:
        page.locator('#play').click()
        page.keyboard.press('v')
        assert page.evaluate('parkourProbe.roof()')
        # Osobny układ z najdłuższą trasą, żeby sufit testowy nie wpłynął na zapis.
        page.goto(f'{BASE}/parkour.html?regresja=duch#G10-K-4821')
        page.locator('#play').click()
        page.wait_for_function('typeof parkourProbe !== "undefined"')
        recording = page.evaluate('parkourProbe.longGhost()')
        assert recording['count'] < 2048 and recording['bytes'] < 200_000 and recording['last'] == 600, recording
        print('Duch G10, 600 s:', recording['bytes'], 'B UTF-16', flush=True)
    page.unroute('**/assets/js/parkour-game.js')



def wyzwanie(page, mobile):
    code = page.locator('#dzienKod').inner_text()
    assert code and code != '—', code
    expect(page.locator('#ovText')).to_contain_text(code)
    expect(page.locator('#play')).to_be_visible()
    if mobile:
        page.locator('#play').tap()
        expect(page.locator('#jumpBtn')).to_be_visible()
        page.locator('#jumpBtn').tap()
        expect(page.locator('#time')).not_to_have_text('0,00')
    else:
        page.locator('#play').press('Enter')
        expect(page.locator('#gl')).to_be_focused()
        page.keyboard.press('Space')
        expect(page.locator('#time')).not_to_have_text('0,00')
    page.locator('#gl').press('Escape')
    expect(page.locator('#play')).to_be_focused()
    expect(page.locator('#ovTitle')).to_have_text('Pauza')


def hosting(page):
    radios = page.locator('#quiz input[type=radio]').evaluate_all(
        'inputs => inputs.map(input => [input.name, input.value])'
    )
    groups = {}
    for name, value in radios:
        groups.setdefault(name, []).append(value)
    assert len(groups) == 4 and all(groups.values()), groups
    def results(choices):
        return page.evaluate("""choices => {
            const old = document.querySelector('#results article');
            let changed = false;
            for (const [name, value] of Object.entries(choices)) {
                const input = document.querySelector('#quiz input[name="' + name + '"][value="' + value + '"]');
                if (!input.checked) { input.click(); changed = true; }
            }
            if (changed && old.isConnected) throw Error('Brak aktualizacji wyników');
            return {
                need: Number(document.querySelector('#ramNum').textContent),
                plans: [...document.querySelectorAll('#results article')].map(card => [
                    card.dataset.host, card.dataset.ram === '' ? null : Number(card.dataset.ram),
                ]),
            };
        }""", choices)

    for values in product(*groups.values()):
        choices = dict(zip(groups, values))
        result = results(choices)
        plans = result['plans']
        assert 1 <= len(plans) <= 3 and len(plans) == len({p[0] for p in plans}), (choices, plans)
        assert all(ram is None or ram >= result['need'] for _, ram in plans), (choices, result)

    for hours, winner in ((720, 'mchosting'), (75, 'aternos')):
        assert results(dict(gracze=5, czas=hours, dodatki=2, budzet=20))['plans'][0][0] == winner
    large = results(dict(gracze=40, czas=720, dodatki=3, budzet=999))
    assert large['need'] == 12 and all(ram >= 12 for _, ram in large['plans']), large


def bug_quiz(page, size, correct, expect_record):
    report = page.request.get(f'{BASE}/data/testy.json').json()
    data = page.request.get(f'{BASE}/data/bledy.json').json()
    verified = report['wyniki']['bledy']['zweryfikowane']
    pool = [q for q in data['pytania'] if q['id'] in verified][:size]
    assert len(pool) == size
    report['wyniki']['bledy']['zweryfikowane'] = [q['id'] for q in pool]
    page.route('**/data/testy.json', lambda route: route.fulfill(json=report))
    page.evaluate("""ids => {
        localStorage.removeItem('kc:bledy:czas');
        localStorage.setItem('kc:bledy:widziane', JSON.stringify(ids));
    }""", [q['id'] for q in pool] * 30 + ['stare-pytanie'])
    page.reload()
    start = page.locator('#start')
    for _ in range(2):
        start.click()
        for _ in range(min(5, size)):
            tokens = page.locator('#cmd .tok')
            question = next(q for q in pool if q['tokeny'] == tokens.all_text_contents())
            wrong = (question['zly'] + 1) % len(question['tokeny'])
            tokens.nth(question['zly'] if correct else wrong).click()
            page.locator('#next').click()
        expect(start).to_be_visible()
        history = page.evaluate("JSON.parse(localStorage.getItem('kc:bledy:widziane'))")
        assert len(history) == len(set(history)) <= size, history
        assert page.evaluate("localStorage.getItem('kc:bledy:czas') !== null") == expect_record
    page.unroute('**/data/testy.json')


def command_tabs(page):
    bar = page.get_by_role('tablist', name='Rodzaj komendy')
    tabs = bar.get_by_role('tab')
    expect(tabs).to_have_count(18)
    tabs.first.focus()
    tabs.first.press('ArrowLeft')
    expect(tabs.last).to_be_focused()
    expect(tabs.last).to_have_attribute('aria-selected', 'true')
    expect(page.get_by_role('tabpanel')).to_have_attribute('aria-labelledby', tabs.last.get_attribute('id'))
    assert bar.evaluate("""bar => {
        const tab = bar.querySelector('[aria-selected=true]').getBoundingClientRect();
        const bounds = bar.getBoundingClientRect();
        return tab.left >= bounds.left - 1 && tab.right <= bounds.right + 1;
    }""")
    tabs.last.press('ArrowRight')
    expect(tabs.first).to_be_focused()
    expect(bar.locator('[tabindex="0"]')).to_have_count(1)


def progress_backup(page):
    profile = {'xp': 120, 'badges': {'start': '2026-11-23'}, 'count': {}, 'got': {'badge:start': 1}}
    page.evaluate("""profile => {
        localStorage.setItem('kc:xp', JSON.stringify(profile));
        localStorage.setItem('kc:pk:best:P3-K-1', '22');
        localStorage.setItem('kc:bledy:rekord', '80');
        localStorage.setItem('kc:motd', '"prywatny opis"');
    }""", profile)
    page.reload()
    page.locator('.xp-btn').click()
    with page.expect_download() as item:
        page.get_by_role('button', name='Eksportuj postęp').click()
    exported = json.loads(Path(item.value.path()).read_text(encoding='utf-8'))
    assert exported['profil']['xp'] == 120
    assert exported['profil']['badges'] == profile['badges']
    assert exported['rekordy']['pk:best:P3-K-1'] == 22
    assert 'prywatny opis' not in json.dumps(exported)
    exported['profil']['xp'] = 125
    exported['rekordy']['pk:best:P3-K-1'] = 18
    exported['rekordy']['bledy:rekord'] = 75
    page.evaluate("localStorage.setItem('kc:pk:ghost:P3-K-1', '[]')")
    uploader = page.locator('.xp-panel input[type=file]')

    def upload(item):
        uploader.set_input_files(dict(name='kopia.json', mimeType='application/json',
                                     buffer=json.dumps(item).encode()))
    upload({**exported, 'rekordy': {'motd': 'nie importuj'}})
    expect(page.locator('[data-backup-status]')).to_contain_text('Nie udało się')
    assert page.evaluate("JSON.parse(localStorage.getItem('kc:xp')).xp") == 120
    upload(exported)
    expect(page.locator('[data-backup-status]')).to_contain_text('Wczytano kopię')
    assert page.evaluate("JSON.parse(localStorage.getItem('kc:xp')).xp") == 125
    assert page.evaluate("JSON.parse(localStorage.getItem('kc:pk:best:P3-K-1'))") == 18
    assert page.evaluate("localStorage.getItem('kc:pk:ghost:P3-K-1')") is None
    assert page.evaluate("JSON.parse(localStorage.getItem('kc:bledy:rekord'))") == 80
    assert page.evaluate("JSON.parse(localStorage.getItem('kc:motd'))") == 'prywatny opis'



def engine_badges(page):
    report = page.request.get(f'{BASE}/data/testy.json').json()
    engines = report.get('silniki')
    if not engines or not {'vanilla', 'paper'} <= engines.keys():
        return
    template = next(key for key in (entry['id'] for entry in DATA['szablony'])
                    if all(engines[e]['wyniki'][key]['ok'] for e in ('vanilla', 'paper')))
    page.locator('#ver').select_option('nowa')
    page.locator('#tabs [data-id="' + template + '"]').click()
    expected = 'sprawdzone' + ''.join(' · ' + e + ' ' + engines[e]['wyniki'][template]['wersja']
                                      for e in ('vanilla', 'paper'))
    expect(page.locator('#status')).to_have_text(expected)
    page.locator('#ver').select_option('stara')
    expect(page.locator('#status')).to_have_text('czeka na test')
    page.locator('#ver').select_option('nowa')

def browser_commands(page, modern):
    # Zbieramy całe wiersze z konsoli kreatora, także kolejność komend wielowierszowych.
    page.locator('#ver').select_option('nowa' if modern else 'stara')
    result = {}

    def tab(template):
        page.locator(f'#tabs [data-id="{template}"]').click()
        result[template] = []

    def collect(template):
        rows = page.locator('#out > div').all_text_contents()
        for row in rows:
            assert row.startswith('› /'), row
            result[template].append(row.removeprefix('› /'))

    def chip(name, value):
        page.locator(f'#form input[name="{name}"][value="{value}"] + span').click()

    tab('give')
    chip('cel', '@a')
    for item in DATA['przedmioty']:
        page.locator('#item').select_option(item['id'])
        for key in ('Home', 'End'):
            page.locator('#count').press(key)
            collect('give')

    tab('effect')
    chip('cel', '@a')
    for effect in DATA['efekty']:
        page.locator('#eff').select_option(effect['id'])
        for infinite in (False, True):
            for name in ('inf', 'hide'):
                field = page.locator(f'[name="{name}"]')
                if field.is_checked() != infinite:
                    page.locator(f'[name="{name}"] + span').click()
            page.locator('#lvl').press('End' if infinite else 'Home')
            collect('effect')

    tab('title')
    page.locator('#tt').fill('Test ąęł')
    page.locator('#st').fill('')
    for color in DATA['kolory_tekstu']:
        chip('col', color['id'])
        collect('title')
    chip('col', 'gold')
    page.locator('[name="bold"] + span').click()
    page.locator('#fi').fill('5')
    page.locator('#st').fill('Mały napis')
    collect('title')

    tab('tp')
    chip('cel', '@a')
    collect('tp')
    page.locator('[name="rel"] + span').click()
    page.locator('#y').fill('10')
    collect('tp')
    page.locator('[name="rel"] + span').click()
    for axis, value in zip('xyz', ('-20', '64', '15')):
        page.locator('#' + axis).fill(value)
    collect('tp')

    tab('gamerule')
    for index, rule in enumerate(DATA['zasady']):
        page.locator('#rule').select_option(str(index))
        if modern or rule['stara']:
            collect('gamerule')
        else:
            expect(page.locator('#out')).to_contain_text('# W tej wersji')

    tab('whitelist')
    page.locator('#nicks').fill('Test_Gracz')
    page.locator('#owner').fill('Test_Gracz')
    collect('whitelist')

    tab('attribute')
    chip('cel', '@a')
    for hearts in ('1', '3.5', '8', '9', '10', '20'):
        page.locator('#hearts').evaluate(
            '(el, v) => { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); }', hearts)
        collect('attribute')
    page.locator('[name="reset"] + span').click()
    collect('attribute')
    chip('cel', '@p')
    collect('attribute')

    def slider(selector, value):
        page.locator(selector).evaluate(
            '(el, v) => { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); }', value)

    tab('gamemode')
    chip('cel', '@a')
    for mode in DATA['tryby']:
        chip('mode', mode['id'])
        collect('gamemode')

    tab('time')
    for pora in DATA['pory']:
        chip('pora', pora['id'])
        collect('time')

    tab('weather')
    for weather in DATA['pogoda']:
        chip('pog', weather['id'])
        collect('weather')
    chip('pog', 'rain')
    page.locator('[name="dur"] + span').click()
    collect('weather')

    tab('difficulty')
    for level in DATA['trudnosci']:
        chip('diff', level['id'])
        collect('difficulty')

    tab('summon')
    for mob in DATA['moby']:
        page.locator('#mob').select_option(mob['id'])
        collect('summon')
    page.locator('#mob').select_option('wolf')
    page.locator('#mname').fill('Żółw Burek')
    collect('summon')

    tab('enchant')
    chip('cel', '@a')
    for ench in DATA['zaklecia']:
        page.locator('#ench').select_option(ench['id'])
        slider('#elvl', '1')
        collect('enchant')
        slider('#elvl', str(ench['max']))
        collect('enchant')

    tab('xp')
    chip('cel', '@a')
    page.locator('#xn').fill('5')
    collect('xp')
    chip('xu', 'points')
    page.locator('#xn').fill('100')
    collect('xp')
    chip('xop', 'set')
    chip('xu', 'levels')
    page.locator('#xn').fill('0')
    collect('xp')

    tab('kill')
    for index, _ in enumerate(DATA['kill_cele']):
        chip('kc', str(index))
        collect('kill')

    tab('clear')
    chip('cel', '@a')
    collect('clear')
    page.locator('#citem').select_option('diamond')
    collect('clear')

    tab('worldborder')
    collect('worldborder')
    page.locator('#wx').fill('-100')
    page.locator('#wz').fill('200')
    slider('#wb', '2500')
    collect('worldborder')

    tab('spawnpoint')
    chip('cel', '@a')
    collect('spawnpoint')
    chip('sp', 'swiat')
    collect('spawnpoint')
    return result


def budowle(page):
    # Każda budowla ma kategorię, a każdy jej blok jest w palecie testowanej na serwerze.
    info = page.evaluate("""async () => {
      const m = await import('./assets/js/builds.js');
      const kats = new Set(m.KATEGORIE.map(k => k.id));
      return m.BUILDS.map(b => ({ id: b.id, kat: kats.has(b.kat), ids: [...new Set(m.getBuild(b.id).blocks.map(x => m.BLOCKS[x[3]]?.id))] }));
    }""")
    pal = set(palette_ids())
    for b in info:
        assert b['kat'], ('brak kategorii', b['id'])
        missing = [i for i in b['ids'] if i is not None and i not in pal]
        assert not missing, (b['id'], missing)
    # Filtr kategorii: LifeSteal pokazuje tylko swoje budowle i wybiera pierwszą z nich.
    page.locator('.kat-bar [data-k="lifesteal"]').click()
    expect(page.locator('#picker .pick')).to_have_count(sum(1 for b in info if b['id'] in ('arena', 'oltarz', 'bazar')))
    expect(page.locator('#picker .pick[aria-selected=true]')).to_have_count(1)
    page.locator('.kat-bar [data-k="all"]').click()
    expect(page.locator('#picker .pick')).to_have_count(len(info))


def sezon(page):
    # Model: 300 sezonów z losowymi decyzjami kończy się zawsze i serca zostają w zakresie.
    bad = page.evaluate("""async () => {
      const M = await import('./assets/js/sezon-model.js');
      const errs = [];
      for (let seed = 1; seed <= 300; seed++) {
        const st = M.nowySezon(seed * 7919); let n = 0;
        while (!st.koniec && n++ < 40) {
          const alive = st.boty.filter(b => b.zyje), keys = Object.keys(M.AKCJE);
          const a = keys[(seed + n) % keys.length], c = alive[(seed * n) % alive.length]?.id;
          ['sprzet', 'totem', 'jablko'].forEach(r => M.kup(st, r));
          if (!M.dzien(st, a, c)) M.dzien(st, 'farma');
          for (const p of [st.ja, ...st.boty]) if (p.serca < 0 || p.serca > M.MAX || p.sprzet < 1 || p.sprzet > 4) errs.push([seed, p.nick, p.serca]);
        }
        if (!st.koniec || !st.wynik) errs.push([seed, 'bez końca']);
      }
      return errs.slice(0, 5);
    }""")
    assert not bad, bad
    # Interfejs: cały sezon klawiaturą/dotykiem, aż do ekranu wyniku.
    page.evaluate("localStorage.removeItem('kc:sezon:stan')")
    page.reload()
    page.locator('#szStart').click()
    expect(page.locator('.sz-day b')).to_have_text('1')
    page.locator('[data-akcja="walka"]').click()
    expect(page.locator('.sz-target').first).to_contain_text('szansa wygranej')
    page.locator('#szBack').click()
    for _ in range(M_DNI):
        if page.locator('#szAgain').count():
            break
        page.locator('[data-akcja="baza"]').click()
    expect(page.locator('#szAgain')).to_be_visible()
    expect(page.locator('.sz-tips li').first).to_be_visible()


M_DNI = 14


def run(browser, width, height):
    mobile = width == 390
    context = browser.new_context(viewport={'width': width, 'height': height},
                                  has_touch=mobile, is_mobile=mobile)
    for name in READY:
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
        page.on('response', lambda r: errors.append(f'{r.status} {r.url}') if r.status >= 400 else None)
        smoke(page, name)
        if name == 'bledy' and not mobile:
            bug_quiz(page, 4, True, False)
            bug_quiz(page, 5, False, False)
            bug_quiz(page, 5, True, True)
        if name == 'kolo':
            progress_backup(page)
        if name == 'parkour':
            parkour(page, mobile)
            if not mobile:
                parkour_input(page)
        if name == 'wyzwanie':
            wyzwanie(page, mobile)
        if name == 'hosting':
            hosting(page)
        if name == 'budowle':
            budowle(page)
        if name == 'symulator':
            sezon(page)
        if name == 'edytor':
            export_parity(page)
        if name == 'motd':
            actual = page.evaluate('async s => (await import("./assets/js/motd.js")).motdProperty(s)', MOTD_SAMPLE)
            assert actual == motd_property(MOTD_SAMPLE), (actual, motd_property(MOTD_SAMPLE))
        if name == 'komendy':
            command_tabs(page)
            engine_badges(page)
            # Przeładuj moduł z wyłączonym efektem maszynopisania.
            page.emulate_media(reduced_motion='reduce')
            page.reload()
            for modern in (True, False):
                actual = browser_commands(page, modern)
                expected = commands(modern)
                for template in expected:
                    assert actual[template] == expected[template], (template, actual[template], expected[template])
                assert actual.keys() == expected.keys()
        assert not errors, (name, width, errors)
        print(f'{name} {width}×{height}: OK', flush=True)
        page.close()
    context.close()


if __name__ == '__main__':
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH'),
                                     args=['--enable-unsafe-swiftshader'])
        for size in ((1366, 820), (390, 844)):
            run(browser, *size)
        browser.close()

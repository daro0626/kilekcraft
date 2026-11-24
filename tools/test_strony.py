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
    page.locator('#chooseLevel').click()
    code = page.locator('#code')
    code.fill('L4-K-4821')
    code.press('Enter')
    expect(page.locator('#ovTitle')).to_have_text('Labirynt')
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



def mistrz_parkour(page, mobile):
    # Komnata mistrzowska w grze: opis zasady na starcie i licznik lawy w M8.
    page.locator('#chooseLevel').click()
    code = page.locator('#code')
    code.fill('M8-K-77')
    code.press('Enter')
    expect(page.locator('#ovTitle')).to_have_text('M8 · Wznosząca się lawa')
    expect(page.locator('#ovText')).to_contain_text('lawa zaczyna rosnąć')
    expect(code).to_have_value('M8-K-1')
    if mobile:
        page.locator('#play').tap()
    else:
        page.locator('#play').press('Enter')
    expect(page.locator('#lavaTile')).to_be_visible()
    page.locator('#gl').press('Escape') if not mobile else page.evaluate("window.dispatchEvent(new Event('blur'))")
    expect(page.locator('#over')).to_be_visible()


def mistrz_komnaty(page):
    # Generator: typ „Mistrzowska” pokazuje listę 10 komnat, kartę z opisem i chowa losowanie.
    page.locator('label.chip:has(input[value=mistrz])').click()
    expect(page.locator('#mList')).to_be_visible()
    expect(page.locator('.km-m')).to_have_count(10)
    expect(page.locator('#roll')).to_be_hidden()
    page.locator('.km-m[data-m="7"]').click()
    expect(page.locator('#code')).to_have_value('M7-K-1')
    expect(page.locator('#mInfo')).to_contain_text('Kruszący się most')
    expect(page.locator('#mInfo')).to_contain_text('do sprawdzenia przez Piotrka')
    expect(page.locator('.km-m[data-m="7"]')).to_have_attribute('aria-pressed', 'true')
    expect(page.locator('#playLink')).to_have_attribute('href', 'parkour.html#M7-K-1')
    page.locator('label.chip:has(input[value=parkour])').click()
    expect(page.locator('#mList')).to_be_hidden()
    expect(page.locator('#roll')).to_be_visible()


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
    season = {'pkt': 900, 'przetrwal': True, 'miejsce': 2, 'dzien': 14}
    page.evaluate("""([profile, season]) => {
        localStorage.setItem('kc:xp', JSON.stringify(profile));
        localStorage.setItem('kc:sezon:rekord', JSON.stringify(season));
        localStorage.setItem('kc:pk:best:P3-K-1', '22');
        localStorage.setItem('kc:bledy:rekord', '80');
        localStorage.setItem('kc:motd', '"prywatny opis"');
    }""", [profile, season])
    page.reload()
    page.locator('.xp-btn').click()
    with page.expect_download() as item:
        page.get_by_role('button', name='Eksportuj postęp').click()
    exported = json.loads(Path(item.value.path()).read_text(encoding='utf-8'))
    assert exported['profil']['xp'] == 120
    assert exported['rekordy']['sezon:rekord'] == season
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
    bad = {**season, 'miejsce': 9}
    upload({**exported, 'rekordy': {'sezon:rekord': bad}})
    expect(page.locator('[data-backup-status]')).to_contain_text('Nie udało się')
    key = 'sezon:rekord'
    better = {**season, 'pkt': 1100}
    exported['rekordy'][key] = better
    upload(exported)
    expect(page.locator('[data-backup-status]')).to_contain_text('Wczytano kopię')
    exported['rekordy'][key] = season
    upload(exported)
    expect(page.locator('[data-backup-status]')).to_contain_text('Wczytano kopię')
    assert page.evaluate("JSON.parse(localStorage.getItem('kc:sezon:rekord'))") == better
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
      const { layerFunctions } = await import('./assets/js/export.js');
      const kats = new Set(m.KATEGORIE.map(k => k.id));
      return m.BUILDS.map(b => {
        const {blocks, size} = m.getBuild(b.id);
        const heights = new Set(blocks.map(x => x[1]));
        const exportLevels = new Set(blocks.filter(x => m.BLOCKS[x[3]]?.id).map(x => x[1]));
        const layers = layerFunctions(blocks, b.short).filter(f => f.path.includes('/warstwa_'));
        return { id: b.id, kat: kats.has(b.kat), height: size[1], levels: heights.size, exportCount: layers.length,
          exportLevels: exportLevels.size, gaps: [...Array(size[1]).keys()].filter(y => !heights.has(y)),
          minimum: Math.min(...heights), count: blocks.length, ids: [...new Set(blocks.map(x => m.BLOCKS[x[3]]?.id))] };
      });
    }""")
    pal = set(palette_ids())
    for b in info:
        assert 0 < b['count'] < 15000 and b['minimum'] == 0, b
        assert b['exportCount'] == b['exportLevels'], b
        assert b['levels'] + len(b['gaps']) == b['height'], b
        if b['gaps']:
            print('Puste poziomy podglądu:', b['id'], [y + 1 for y in b['gaps']], flush=True)
        assert b['kat'], ('brak kategorii', b['id'])
        missing = [i for i in b['ids'] if i is not None and i not in pal]
        assert not missing, (b['id'], missing)
    # Filtr kategorii: LifeSteal pokazuje tylko swoje budowle i wybiera pierwszą z nich.
    page.locator('.kat-bar [data-k="lifesteal"]').click()
    expect(page.locator('#picker .pick')).to_have_count(page.evaluate("async () => (await import('./assets/js/builds.js')).BUILDS.filter(b => b.kat === 'lifesteal').length"))
    expect(page.locator('#picker .pick[aria-selected=true]')).to_have_count(1)
    page.locator('.kat-bar [data-k="all"]').click()
    expect(page.locator('#picker .pick')).to_have_count(len(info))
    page.goto(f'{BASE}/budowle.html?link#rakieta')
    expect(page.locator('[data-k="miasto"]')).to_have_attribute('aria-pressed', 'true')
    expect(page.locator('.pick[data-id="rakieta"]')).to_have_attribute('aria-selected', 'true')
    page.locator('[data-k="lifesteal"]').press('Enter')
    page.locator('#filmy [data-model="miecz"]').press('Enter')
    expect(page.locator('.pick[data-id="miecz"]')).to_be_focused()
    expect(page.locator('.pick[data-id="miecz"]')).to_have_attribute('aria-selected', 'true')
    page.locator('[data-k="all"]').press('Enter')
    page.locator('.pick[data-id="wulkan"]').press('Enter')
    expect(page.locator('.pick[data-id="wulkan"]')).to_have_attribute('aria-selected', 'true')
    gap = next(b['gaps'][0] for b in info if b['id'] == 'wulkan')
    page.locator('[data-m="layer"]').click()
    page.locator('#layer').evaluate("(slider, value) => { slider.value = value; slider.dispatchEvent(new Event('input')); }", gap)
    expect(page.locator('#lNum')).to_have_text(str(gap + 1))
    expect(page.locator('#mats')).to_contain_text('Ta warstwa jest pusta.')
    with page.expect_download() as download:
        page.locator('#dl').click()
    assert download.value.suggested_filename.startswith('kilekcraft_wulkan')
    expect(page.locator('.toast')).to_contain_text('Datapack gotowy')


def schem_import(page):
    page.goto(f'{BASE}/budowle.html#rakieta')
    page.locator('#schemPanel > summary').click()
    assert page.get_by_text('Wkrótce: twoje budowle').count() == 0
    choose_file = page.locator('#schemFile')
    status = page.locator('#schemStatus')
    network = []
    page.on('request', lambda request: network.append(request.method))
    for version in (2, 3):
        path = Path(__file__).parent / f'fixtures/pawilon-v{version}.schem'
        choose_file.set_input_files(path)
        expect(status).to_contain_text(f'Wczytano plik v{version}')
        expect(status).to_contain_text('nierozpoznane bloki (1)')
        expect(page.locator('#bName')).to_have_text(path.name)
        expect(page.locator('#bSize')).to_contain_text('7×5×5')
        expect(page.locator('#viewer canvas')).to_be_visible()
        expect(page.locator('#bdExport')).to_be_hidden()
        page.locator('#schemSubstitutions summary').click()
        expect(page.locator('#schemUnknown li')).to_have_text('fixture:rubin · 1')
        page.locator('[data-m=layer]').click()
        page.locator('#layer').evaluate("(slider) => { slider.value = 0; slider.dispatchEvent(new Event('input')); }")
        expect(page.locator('#lNum')).to_have_text('1')
        expect(page.locator('#mats li')).to_have_text('Kamienne cegły35')
    choose_file.set_input_files({'name': 'zepsuty.schem', 'mimeType': 'application/octet-stream', 'buffer': b'uszkodzony'})
    expect(status).to_contain_text('gzip')
    expect(page.locator('#bName')).to_have_text('pawilon-v3.schem')
    page.locator('#closeSchem').click()
    expect(page.locator('#bName')).to_contain_text('Rakieta')
    expect(page.locator('#bdExport')).to_be_visible()
    assert all(method == 'GET' for method in network)


def sezon(page):
    # Model: 300 sezonów z losowymi decyzjami kończy się zawsze i serca zostają w zakresie.
    bad = page.evaluate("""async () => {
      const M = await import('./assets/js/sezon-model.js');
      const errs = [];
      for (const smart of [false, true]) for (let seed = 1; seed <= 300; seed++) {
        const st = M.nowySezon(seed * 7919); let n = 0;
        while (!st.koniec && n++ < 40) {
          const alive = st.boty.filter(b => b.zyje), keys = Object.keys(M.AKCJE);
          const a = keys[(seed + n) % keys.length], c = alive[(seed * n) % alive.length]?.id;
          if (smart) {
            M.kup(st, 'sprzet');
            if (st.ja.serca <= 3) M.kup(st, 'totem');
            const target = alive.find(b => M.szansa(st, st.ja, b, false) >= .75);
            if (st.ja.obrona < 2) M.dzien(st, 'baza');
            else if (target && st.ja.serca >= 4) M.dzien(st, 'walka', target.id);
            else M.dzien(st, 'farma');
          } else {
            ['sprzet', 'totem', 'jablko'].forEach(r => M.kup(st, r));
            if (!M.dzien(st, a, c)) M.dzien(st, 'farma');
          }
          if (st.ja.sojusz && !M.bot(st, st.ja.sojusz)?.zyje) errs.push([seed, 'martwy sojusznik']);
          for (const p of [st.ja, ...st.boty]) if (p.serca < 0 || p.serca > M.MAX || p.sprzet < 1 || p.sprzet > 4) errs.push([seed, p.nick, p.serca]);
        }
        if (!st.koniec || !st.wynik) errs.push([seed, 'bez końca']);
      }
      for (let seed=1; seed<=100; seed++) {
        const st = M.nowySezon(seed), ally = st.boty[0];
        st.ja.sojusz = ally.id; ally.sojusz = true; ally.serca = 1;
        M.dzien(st, 'baza');
        if (!ally.zyje && (st.ja.sojusz === ally.id || ally.sojusz)) errs.push([seed, 'sojusz po odpadnięciu']);
      }
      const unknown = M.nowySezon(1);
      if (M.dzien(unknown, 'toString') || M.kup(unknown, 'toString')) errs.push('nieznany ruch');
      return errs.slice(0, 5);
    }""")
    assert not bad, bad
    # Interfejs: cały sezon klawiaturą/dotykiem, aż do ekranu wyniku.
    page.evaluate("localStorage.removeItem('kc:sezon:stan')")
    page.reload()
    page.locator('#szStart').press('Enter')
    expect(page.locator('.sz-day b')).to_have_text('1')
    expect(page.locator('.sz-act').first).to_be_focused()
    page.evaluate("""() => {
        const past = JSON.parse(localStorage.getItem('kc:sezon:stan'));
        delete past.statystyki.ataki;
        delete past.statystyki.atakiW;
        past.ja.kasa = 1000;
        past.ja.sprzet = 1;
        localStorage.setItem('kc:sezon:stan', JSON.stringify(past));
    }""")
    page.reload()
    status = page.locator('#szOstatni')
    page.evaluate("window.liveSeason = document.querySelector('#szOstatni')")
    page.locator('[data-buy="totem"]').press('Enter')
    expect(page.locator('.sz-act').first).to_be_focused()
    expect(status).to_contain_text('Kupujesz totem')
    page.locator('[data-akcja="walka"]').press('Enter')
    expect(page.locator('.sz-target').first).to_be_focused()
    expect(page.locator('.sz-target').first).to_contain_text('szansa wygranej')
    page.locator('.sz-target').first.press('Enter')
    state = page.evaluate("JSON.parse(localStorage.getItem('kc:sezon:stan'))")
    assert state['statystyki']['ataki'] == 1 and state['statystyki']['atakiW'] in (0, 1), state['statystyki']
    assert page.evaluate("window.liveSeason === document.querySelector('#szOstatni')")
    expect(page.locator('.sz-log')).not_to_have_attribute('aria-live', 'polite')
    for _ in range(M_DNI):
        if page.locator('#szAgain').count():
            break
        expect(page.locator('.sz-act').first).to_be_focused()
        page.locator('[data-akcja="baza"]').press('Enter')
    expect(page.locator('#szAgain')).to_be_focused()
    expect(page.locator('.sz-tips li').first).to_be_visible()


M_DNI = 14


def symulator_admin(page):
    form = page.locator('#form')
    form.scroll_into_view_if_needed()
    expect(page.locator('#kpis .kpi')).to_have_count(4)
    expect(page.locator('#dayNum')).to_have_text('14')
    field = form.locator('#gracze')
    field.press('End')
    expect(form.locator('[data-v=gracze]')).to_have_text('30')
    form.locator('#run').press('Enter')
    expect(page.locator('#dayNum')).to_have_text('1')
    form.locator('#run').press('Enter')
    form.locator('#skip').press('Enter')
    expect(page.locator('#dayNum')).to_have_text('14')
    expect(page.locator('#rank li')).to_have_count(8)


def cennik(page):
    from playwright.sync_api import expect

    box = page.locator('#ceny-sprzedazy')
    search = box.get_by_role('searchbox')
    category = box.get_by_role('combobox')
    rows = box.locator('tbody tr')
    expect(box.get_by_text('Propozycja do zatwierdzenia, nie działa jeszcze na serwerze')).to_be_visible()
    expect(rows).to_have_count(176)
    category.select_option(label='Drewno i dekoracje')
    expect(rows).to_have_count(19)
    search.fill('topoli')
    expect(rows).to_have_count(1)
    expect(rows.first).to_contain_text('niesprzedawalny')
    search.fill('diament')
    expect(rows).to_have_count(0)
    expect(box.get_by_role('status')).to_have_text('Brak pasujących pozycji.')
    category.select_option('')
    search.fill('wegiel')
    expect(rows).to_have_count(2)
    search.fill('netherite_ingot')
    expect(rows).to_have_count(1)
    expect(rows.first).to_contain_text('Netherite Ingot')
    report = json.loads(Path('data/testy.json').read_text(encoding='utf-8'))
    expect(rows.first).to_contain_text(f"identyfikator sprawdzony · {report['wyniki']['cennik']['wersja']}")
    if page.viewport_size['width'] == 390:
        assert rows.first.evaluate("r => getComputedStyle(r).display") == 'grid'
    search.fill('plyta muzyczna')
    expect(rows).to_have_count(2)
    expect(rows.get_by_text('czeka na test', exact=True)).to_have_count(2)


def sezon_code(page):
    from playwright.sync_api import expect

    # Osobne konteksty naśladują dwóch graczy, z dostępem do schowka w przeglądarce testowej.
    browser = page.context.browser
    options = dict(viewport=page.viewport_size, reduced_motion='reduce')
    with browser.new_context(permissions=['clipboard-read', 'clipboard-write'], **options) as local:
        player = local.new_page()
        player.goto(f'{BASE}/symulator.html')
        player.evaluate("""async () => {
          const M = await import('./assets/js/sezon-model.js');
          localStorage.setItem('kc:sezon:stan', JSON.stringify(M.nowySezon(123)));
        }""")
        player.reload()
        player.locator('[data-akcja="farma"]').click()
        player.locator('[data-buy="jablko"]').click()
        player.locator('[data-akcja="walka"]').click()
        player.locator('.sz-target').first.click()
        while player.locator('#szAgain').count() == 0:
            player.locator('[data-akcja="baza"]').click()
        player.locator('#szCopy').click()
        expect(player.locator('#szCopyStatus')).to_have_text('Kod wyniku skopiowany.')
        code = player.evaluate('navigator.clipboard.readText()')
        assert code == player.locator('#szOwnCode').input_value()
        score = player.locator('.sz-pts b').inner_text()
        player.reload()
        expect(player.locator('#szOwnCode')).to_have_value(code)
    with browser.new_context(**options) as remote:
        friend = remote.new_page()
        friend.goto(f'{BASE}/symulator.html')
        assert friend.evaluate("localStorage.getItem('kc:sezon:stan')") is None
        field = friend.locator('#szFriendCode')
        bad = code[:10] + ('A' if code[10] != 'A' else 'B') + code[11:]
        field.fill(bad)
        field.press('Enter')
        expect(field).to_have_attribute('aria-invalid', 'true')
        expect(friend.locator('#szFriendScore')).to_have_count(0)
        field.fill(code)
        field.press('Enter')
        expect(friend.locator('#szFriendScore')).to_have_text(score)
        assert friend.evaluate("localStorage.getItem('kc:sezon:rekord')") is None
        friend.locator('#szSame').click()
        assert friend.evaluate("JSON.parse(localStorage.getItem('kc:sezon:stan')).seed") == 123


def parkour_recovery(page, mobile):
    def instrument(route):
        response = route.fetch()
        hook = """
          window.recoveryProbe = {
            state: () => ({p: pos.toArray(), spawn: run.spawn, cp: run.checkpoint, grounded: onGround,
                           deaths, keys: [...keys], joy, started,
                           vel: vel.toArray(), supported: isSolid(Math.floor(pos.x), pos.y - 1, Math.floor(pos.z))}),
            corner() {
              clearInput();
              pos.set(19.88, 6, 4.12);
              vel.set(0, 0, 0);
              run.body.onGround = true;
              run.body.jumpBuffer = 0;
              step(tick);
            },
            fall() {
              pos.y = minY - 5;
              step(tick);
            },
            roof() {
              const x = Math.floor(pos.x), z = Math.floor(pos.z), y = Math.floor(pos.y) + 2;
              const key = k3(x, y, z), original = solid.get(key);
              const oldPitch = pitch, oldYaw = yaw;
              solid.set(key, 'stone');
              let clear = true;
              try {
                for (const angle of [.35, .85, 1.35]) {
                  pitch = angle;
                  for (let turn = 0; turn < 4; turn++) {
                    yaw = turn * Math.PI / 2;
                    draw(performance.now(), true);
                    camera.updateMatrixWorld();
                    const points = [camera.position, ...[-1, 1].flatMap(sx => [-1, 1].map(sy =>
                      new THREE.Vector3(sx, sy, -1).unproject(camera)))];
                    clear &&= points.every(p => !isSolid(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)));
                  }
                }
              } finally {
                if (original) solid.set(key, original); else solid.delete(key);
                pitch = oldPitch; yaw = oldYaw;
              }
              return clear;
            },
            nearFinish() {
              const [x, y, z] = room.blocks.find(b => b[3] === 'diamond');
              pos.set(x + .5, y + 1, z + .5);
              vel.set(0, 0, 0);
            },
          };
        """
        source = response.text().replace('  return { loadLevel, play };', hook + '  return { loadLevel, play };')
        route.fulfill(response=response, body=source)

    page.route('**/assets/js/parkour-game.js', instrument)
    page.add_init_script("""HTMLCanvasElement.prototype.requestPointerLock = function() {
        return Promise.reject(new DOMException('Blokada niedostępna', 'NotAllowedError'));
    };""")
    page.goto(f'{BASE}/parkour.html?regresja=respawn#P4-N-40606')
    expect(page.locator('#ovText')).to_contain_text('P4-N-40606')
    click = lambda locator: locator.tap() if mobile else locator.click()
    state = lambda: page.evaluate('recoveryProbe.state()')
    click(page.locator('#play'))
    page.wait_for_function('typeof recoveryProbe !== "undefined"')
    canvas = page.locator('#gl')
    expect(canvas).to_be_focused()
    mobile_touch = None
    if mobile:
        mobile_touch = page.context.new_cdp_session(page)
        rect = canvas.bounding_box()
        x, y = rect['x'] + rect['width'] * .2, rect['y'] + rect['height'] * .65

        def touch(kind, dy=0):
            points = [] if kind == 'touchEnd' else [dict(x=x, y=y + dy, id=1)]
            mobile_touch.send('Input.dispatchTouchEvent', dict(type=kind, touchPoints=points))

    def move_start():
        if mobile:
            touch('touchStart')
            touch('touchMove', -44)
        else:
            page.keyboard.down('w')

    def move_end():
        if mobile:
            touch('touchEnd')
        else:
            page.keyboard.up('w')

    if mobile:
        click(page.locator('#jumpBtn'))
    else:
        page.keyboard.press('Space')
    page.wait_for_function('recoveryProbe.state().p[1] > recoveryProbe.state().spawn.y + .08')
    move_start()
    page.wait_for_function('recoveryProbe.state().started')
    move_end()
    page.evaluate('recoveryProbe.corner()')
    cp = state()['cp']
    assert cp != state()['spawn'] and cp['x'] == 20.5
    assert page.evaluate('recoveryProbe.roof()')

    move_start()
    page.wait_for_function('recoveryProbe.state().keys.length || recoveryProbe.state().joy.y > .1')
    page.evaluate('recoveryProbe.fall()')
    expect(page.locator('#deaths')).to_have_text('1')
    if mobile:
        touch('touchMove', -50)
    else:
        canvas.dispatch_event('keydown', dict(code='KeyW', key='w', repeat=True))
    page.wait_for_timeout(2050)
    respawned = state()
    assert respawned['p'] == [cp[k] for k in ('x', 'y', 'z')]
    assert respawned['supported'] and respawned['grounded'] and respawned['deaths'] == 1
    assert respawned['keys'] == [] and respawned['joy'] == {'x': 0, 'y': 0}
    assert respawned['vel'] == [0, 0, 0]
    move_end()
    move_start()
    page.wait_for_function('(p) => recoveryProbe.state().p.some((x,i) => Math.abs(p[i]-x) > .04)', arg=respawned['p'])
    move_end()

    if not mobile:
        page.keyboard.press('r')
        assert state()['p'] == respawned['p'] and state()['deaths'] == 1
    click(page.locator('.pk-pause'))
    expect(page.locator('#ovTitle')).to_have_text('Pauza')
    expect(page.locator('#play')).to_have_text('Wznów')
    expect(page.locator('#restartHint')).to_contain_text('Rekord zostaje')
    click(page.locator('#play'))
    assert state()['deaths'] == 1 and state()['cp'] == cp
    click(page.locator('.pk-pause'))
    click(page.locator('#restartLevel'))
    expect(page.locator('#over')).to_be_hidden()
    assert state()['deaths'] == 0 and state()['cp'] == state()['spawn']
    assert state()['keys'] == []
    if mobile:
        click(page.locator('#jumpBtn'))
    else:
        page.keyboard.press('Space')
    page.wait_for_function('recoveryProbe.state().started')
    page.evaluate('recoveryProbe.nearFinish()')
    expect(page.locator('#ovTitle')).to_have_text('Nowy rekord!')
    record = page.locator('#best').inner_text()
    assert record != '—'
    click(page.locator('#restartLevel'))
    expect(page.locator('#deaths')).to_have_text('0')
    expect(page.locator('#best')).to_have_text(record)
    page.unroute('**/assets/js/parkour-game.js')


def parkour_routes(page, mobile):
    click = lambda locator: locator.tap() if mobile else locator.click()
    page.add_init_script('HTMLCanvasElement.prototype.requestPointerLock = undefined')
    page.goto(f'{BASE}/parkour.html#P1-K-4821')
    expect(page.locator('#ovText')).to_contain_text('P1-K-4821')
    page.evaluate("localStorage.removeItem('kc:pk:widok')")
    click(page.locator('#play'))
    click(page.locator('.pk-pause'))
    expect(page.locator('#play')).to_be_focused()
    click(page.locator('.pk-help summary'))
    expect(page.locator('#keys')).to_be_visible()
    click(page.locator('#chooseLevel'))
    expect(page.locator('#levelKind')).to_be_focused()
    expect(page.locator('#levelKind option')).to_have_count(4)
    expect(page.locator('#levelDiff option')).to_have_count(10)
    page.locator('#levelKind').select_option('gora')
    page.locator('#levelDiff').select_option('4')
    click(page.locator('#levelForm button'))
    route = page.locator('#code').input_value()
    assert route.startswith('G4-K-') and page.url.endswith('#' + route)
    expect(page.locator('#ovTitle')).to_have_text('Góra')
    page.go_back(wait_until='commit')
    expect(page.locator('#ovText')).to_contain_text('P1-K-4821')
    page.go_forward(wait_until='commit')
    expect(page.locator('#ovText')).to_contain_text(route)
    click(page.locator('.pk-card').get_by_role('link', name='Menu gier'))
    expect(page.locator('a[href="parkour.html"]')).to_be_visible()
    click(page.locator('a[href="parkour.html"]'))
    expect(page.locator('#play')).to_have_text('Kontynuuj ostatnią')
    expect(page.locator('#ovText')).to_contain_text(route)
    page.reload()
    expect(page.locator('#play')).to_have_text('Kontynuuj ostatnią')
    expect(page.locator('#ovText')).to_contain_text(route)
    click(page.locator('main a[href="komnaty.html"]'))
    expect(page.locator('#playLink')).to_have_attribute('href', 'parkour.html#' + route)
    click(page.locator('#playLink'))
    expect(page.locator('#ovText')).to_contain_text(route)
    click(page.locator('#play'))
    expect(page.locator('[data-camera=trzecia]')).to_have_attribute('aria-pressed', 'true')
    for mode in ('pierwsza', 'rece', 'trzecia'):
        click(page.locator('.pk-view'))
        expect(page.locator('.pk-view')).to_have_attribute('aria-expanded', 'true')
        click(page.locator(f'[data-camera={mode}]'))
        expect(page.locator(f'[data-camera={mode}]')).to_have_attribute('aria-pressed', 'true')
    if mobile:
        click(page.locator('.pk-view'))
        click(page.locator('[data-camera=rece]'))
    else:
        page.keyboard.press('v')
        expect(page.locator('[data-camera=pierwsza]')).to_have_attribute('aria-pressed', 'true')
        page.keyboard.press('v')
    expect(page.locator('[data-camera=rece]')).to_have_attribute('aria-pressed', 'true')
    page.reload()
    click(page.locator('#play'))
    expect(page.locator('[data-camera=rece]')).to_have_attribute('aria-pressed', 'true')
    page.goto(f'{BASE}/parkour.html#P1-K-4821')
    click(page.locator('#randomLevel'))
    expect(page.locator('#ovText')).to_contain_text(page.locator('#code').input_value())


def editor_layers(page, mobile):
    from zipfile import ZipFile

    def instrument(route):
        response = route.fetch()
        hook = """
        window.editorProbe = {
          world: () => Object.fromEntries(world),
          visible: () => [...meshes.values()].filter(m => m.visible).map(m => m.userData.k),
          camera: () => [camera.position.toArray(), controls.target.toArray()],
          history: () => [undo.length, redo.length],
          save,
          aim(x, z, action = tool) {
            const y = layerY;
            camera.position.set(0, y + 49, 1);
            controls.target.set(0, y, 0);
            controls.update();
            camera.updateMatrixWorld();
            const point = pos(x, y, z);
            point.y = action === 'build' ? y : y + .95;
            point.project(camera);
            const rect = el.getBoundingClientRect();
            return [rect.left + (1 + point.x) * rect.width / 2, rect.top + (1 - point.y) * rect.height / 2];
          },
        };
        """
        route.fulfill(response=response, body=response.text() + hook)

    page.route('**/assets/js/edytor.js', instrument)
    page.reload()
    page.wait_for_function('typeof editorProbe !== "undefined"')
    slider = page.locator('#edLayer')
    mode = lambda name: page.locator(f'[data-layer-mode="{name}"]')
    tab = lambda name: page.locator(f'[data-ed-mode="{name}"]')
    label = page.locator('#edLayerLabel')
    template = page.locator('#tpl')
    canvas = page.locator('#stage canvas')
    get_world = lambda: page.evaluate('editorProbe.world()')
    get_visible = lambda: set(page.evaluate('editorProbe.visible()'))
    layer_of = lambda key: int(key.split(',')[1])

    def click(action):
        action.tap() if mobile else action.click()

    def download_pack():
        with page.expect_download() as download:
            page.locator('#dl').click()
        with ZipFile(download.value.path()) as archive:
            return {name: archive.read(name) for name in archive.namelist()}

    def point(x, z, button='left'):
        canvas.scroll_into_view_if_needed()
        px, py = page.evaluate('([x,z,button]) => editorProbe.aim(x,z,button === "right" ? "erase" : undefined)', [x, z, button])
        if mobile:
            page.touchscreen.tap(px, py)
        else:
            page.mouse.click(px, py, button=button)

    template.select_option('wiezowiec')
    original = get_world()
    top = max(map(layer_of, original))
    assert top > 15
    expect(tab('build')).to_have_attribute('aria-selected', 'true')
    expect(slider).to_be_hidden()
    assert get_visible() == set(original)
    initial = page.locator('#lines').text_content()
    pack = download_pack()

    click(tab('layers'))
    expect(label).to_have_text(f'Warstwa 1 z {top + 2}')
    click(mode('single'))
    assert get_visible() == {k for k in original if layer_of(k) == 0}
    if mobile:
        click(page.locator('#edLayerUp'))
    else:
        slider.press('ArrowRight')
    expect(label).to_have_text(f'Warstwa 2 z {top + 2}')
    expect(page.locator('#hudLayer')).to_have_text('Warstwa 2')
    assert get_visible() == {k for k in original if layer_of(k) == 1}
    click(mode('below'))
    assert get_visible() == {k for k in original if layer_of(k) <= 1}
    click(tab('build'))
    assert get_visible() == set(original)
    assert get_world() == original
    expect(page.locator('#lines')).to_have_text(initial)

    click(tab('layers'))
    click(mode('single'))
    assert download_pack() == pack
    slider.press('End')
    expect(label).to_have_text(f'Warstwa {top + 2} z {top + 2}')
    assert not get_visible()
    expect(page.locator('#edLayerMats')).to_contain_text('Ta warstwa jest pusta')
    click(page.locator('#edPlanDetails summary'))
    expect(page.locator('#edPlan')).to_have_attribute('aria-label', f'Plan warstwy {top + 2} z góry. 0 bloków.')
    expect(page.locator('[data-brush="col"]')).to_be_disabled()
    click(page.locator('[data-brush="3"]'))
    click(page.locator('[data-sym="x"]'))
    click(page.locator('[data-t="red_concrete"]'))
    point(19, 21)
    changed = get_world()
    assert any(k.startswith('19,') and k.endswith(',21') for k in original)
    added = set(changed) - set(original)
    assert len(added) == 18 and all(layer_of(k) == top + 1 for k in added), added
    assert all(changed.get(k) == t for k, t in original.items())
    assert get_visible() == added
    expect(page.locator('#edLayerCount')).to_have_text('Liczba bloków: 18')
    expect(page.locator('#edLayerMats .mc')).to_have_text('18')
    expect(page.locator('#edPlan')).to_have_attribute('aria-label', f'Plan warstwy {top + 2} z góry. 18 bloków.')
    tab('layers').focus()
    page.keyboard.press('Control+z')
    assert get_world() == original
    page.keyboard.press('Control+y')
    assert get_world() == changed
    click(page.locator('[data-sym="none"]'))
    click(page.locator('[data-t="stone"]'))
    click(page.locator('[data-tool="pick"]'))
    point(19, 21)
    expect(page.locator('[data-t="red_concrete"]')).to_have_attribute('aria-checked', 'true')
    if mobile:
        click(page.locator('[data-tool="erase"]'))
        point(19, 21)
    else:
        expect(page.locator('[data-tool="build"]')).to_have_attribute('aria-pressed', 'true')
        assert canvas.evaluate("e => !e.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))")
        assert page.locator('#name').evaluate("e => e.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))")
        point(19, 21, button='right')
    after_erase = changed.copy()
    del after_erase[f'19,{top + 1},21']
    assert get_world() == after_erase
    assert get_visible() == set(after_erase) - set(original)
    expect(page.locator('#edLayerMats .mc')).to_have_text('17')

    def dismiss(dialog):
        prompts.append(dialog.message)
        dialog.dismiss()
    prompts = []
    page.once('dialog', dismiss)
    click(page.locator('#clear'))
    assert prompts and 'ukrytymi warstwami' in prompts[0]
    assert get_world() == after_erase
    page.reload()
    page.wait_for_function('typeof editorProbe !== "undefined"')
    expect(mode('single')).to_have_attribute('aria-pressed', 'true')
    assert get_world() == after_erase
    assert get_visible() == set(after_erase) - set(original)

    template.select_option('sklep-serc')
    shop = get_world()
    shop_top = max(map(layer_of, shop))
    assert shop_top < top
    expect(label).to_have_text(f'Warstwa {shop_top + 2} z {shop_top + 2}')
    click(tab('build'))
    assert get_visible() == set(shop)
    click(page.locator('#undo'))
    assert get_world() == after_erase
    click(page.locator('#redo'))
    assert get_world() == shop
    click(page.locator('#clear'))
    click(tab('layers'))
    expect(label).to_have_text('Warstwa 1 z 1')
    assert not get_world() and not get_visible()
    page.wait_for_function("JSON.parse(localStorage.getItem('kc:ed:swiat')).b.length === 0")
    page.evaluate("""() => {
        localStorage.setItem('kc:ed:swiat', JSON.stringify({ name: 'Szczyt', b: [['19,63,21', 'stone']] }));
        localStorage.setItem('kc:ed:warstwy', JSON.stringify({ mode: 'single', y: 150 }));
    }""")
    page.reload()
    page.wait_for_function('typeof editorProbe !== "undefined"')
    expect(label).to_have_text('Warstwa 64 z 64')
    expect(page.locator('#edLayerUp')).to_be_disabled()
    assert get_visible() == {'19,63,21'}
    click(page.locator('#edLayerDown'))
    assert not get_visible() and get_world() == {'19,63,21': 'stone'}

    page.evaluate("""() => {
        editorProbe.save();
        const b = [];
        for (let y = 0; y < 9; y++) {
          const half = y < 2 ? 4 : y < 7 ? 3 : 8 - y;
          for (let x = 24-half; x <= 24+half; x++) for (let z = 24-half; z <= 24+half; z++) {
            if (y < 2 || x === 24-half || x === 24+half || z === 24-half || z === 24+half)
              b.push([[x,y,z].join(','), y < 2 ? 'stone_bricks' : y < 7 ? 'oak_planks' : 'bricks']);
          }
        }
        localStorage.setItem('kc:ed:swiat', JSON.stringify({name:'Wieża do podglądu', b}));
        localStorage.setItem('kc:ed:warstwy', JSON.stringify({mode:'all',y:0}));
    }""")
    page.reload()
    page.wait_for_function('typeof editorProbe !== "undefined"')
    original = get_world()
    assert max(map(layer_of, original)) == 8
    view = page.evaluate('editorProbe.camera()')
    history = page.evaluate('editorProbe.history()')
    pack = download_pack()
    if mobile:
        click(tab('animation'))
    else:
        tab('build').press('ArrowRight')
        expect(tab('animation')).to_be_focused()
    expect(tab('animation')).to_have_attribute('aria-selected', 'true')
    status = page.locator('#edAnimationStatus')
    assert not get_visible()
    for step in range(9):
        click(page.locator('#edAnimationNext'))
        expect(status).to_have_text(f'Warstwa {step + 1} z 9')
        assert get_visible() == {k for k in original if layer_of(k) <= step}
        assert all(abs(a - b) < 1e-5 for point, expected in zip(page.evaluate('editorProbe.camera()'), view)
                   for a, b in zip(point, expected))
    for step in reversed(range(8)):
        click(page.locator('#edAnimationPrev'))
        expect(status).to_have_text(f'Warstwa {step + 1} z 9')
        assert get_visible() == {k for k in original if layer_of(k) <= step}
    click(page.locator('#edAnimationReset'))
    assert not get_visible()
    click(page.locator('#edAnimationPlay'))
    expect(status).to_have_text('Warstwa 1 z 9')
    click(page.locator('#edAnimationPlay'))
    expect(page.locator('#edAnimationPlay')).to_have_text('Start')
    frozen = status.inner_text()
    page.wait_for_timeout(650)
    expect(status).to_have_text(frozen)
    click(canvas)
    page.keyboard.press('Control+z')
    assert get_world() == original
    assert page.evaluate('editorProbe.history()') == history
    assert download_pack() == pack
    click(tab('build'))
    assert get_visible() == set(original)
    page.unroute('**/assets/js/edytor.js')


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
            mistrz_parkour(page, mobile)
            parkour(page, mobile)
            parkour_recovery(page, mobile)
            parkour_routes(page, mobile)
        if name == 'komnaty':
            mistrz_komnaty(page)
            if not mobile:
                parkour_input(page)
        if name == 'wyzwanie':
            wyzwanie(page, mobile)
        if name == 'hosting':
            hosting(page)
        if name == 'budowle':
            budowle(page)
            schem_import(page)
        if name == 'symulator':
            sezon(page)
            symulator_admin(page)
            sezon_code(page)
        if name == 'edytor':
            export_parity(page)
            editor_layers(page, mobile)
        if name == 'lifesteal':
            cennik(page)
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

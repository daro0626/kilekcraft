"""Testy lokalnej strony uruchomionej przez python3 -m http.server 8000."""
from itertools import product
import os
import json
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

from test_commands import DATA, commands, export_lines, layer_functions, SAMPLE, motd_property, MOTD_SAMPLE


BASE = 'http://127.0.0.1:8000'
READY = {
    'index': '#title.ready',
    'serwer': '#shorts .short',
    'hosting': '#results article',
    'komendy': '#out > div',
    'budowle': '#viewer canvas, #poster:text("Użyj mapy")',
    'edytor': '#stage canvas',
    'komnaty': '#stats .panel',
    'symulator': '#kpis .kpi',
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
    for values in product(*groups.values()):
        choices = dict(zip(groups, values))
        names = page.evaluate("""choices => {
            const old = document.querySelector('#results article');
            let changed = false;
            for (const [name, value] of Object.entries(choices)) {
                const input = document.querySelector(`#quiz input[name="${name}"][value="${value}"]`);
                if (!input.checked) {
                    input.click();
                    changed = true;
                }
            }
            if (changed && old.isConnected) throw Error('Brak aktualizacji wyników');
            return [...document.querySelectorAll('#results article h3')].map(h => h.textContent.trim());
        }""", choices)
        assert len(names) == len(set(names)) == 3 and all(names), (choices, names)


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
        if name == 'kolo':
            progress_backup(page)
        if name == 'parkour':
            parkour(page, mobile)
        if name == 'wyzwanie':
            wyzwanie(page, mobile)
        if name == 'hosting':
            hosting(page)
        if name == 'edytor':
            export_parity(page)
        if name == 'motd':
            actual = page.evaluate('async s => (await import("./assets/js/motd.js")).motdProperty(s)', MOTD_SAMPLE)
            assert actual == motd_property(MOTD_SAMPLE), (actual, motd_property(MOTD_SAMPLE))
        if name == 'komendy':
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

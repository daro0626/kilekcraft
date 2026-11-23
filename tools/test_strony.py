"""Testy lokalnej strony uruchomionej przez python3 -m http.server 8000."""
from itertools import product
import os

from playwright.sync_api import expect, sync_playwright

from test_commands import DATA, commands, export_lines, SAMPLE


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
}

# Nazwy typów z assets/js/builds.js dla próbki z test_commands.SAMPLE
SAMPLE_TYPES = {'minecraft:stone': 'stone', 'minecraft:gold_block': 'gold', 'minecraft:sea_lantern': 'lantern', 'minecraft:oak_planks': 'oak_planks'}


def export_parity(page):
    blocks = [[x, y, z, SAMPLE_TYPES[b]] for x, y, z, b in SAMPLE]
    actual = page.evaluate('async b => (await import("./assets/js/export.js")).exportLines(b)', blocks)
    assert actual == export_lines(SAMPLE), (actual, export_lines(SAMPLE))


def smoke(page, name):
    response = page.goto(f'{BASE}/{name}.html')
    assert response.ok, (name, response.status)
    expect(page.locator(READY[name]).first).to_be_attached()
    if name == 'index':
        page.locator('#hero3d').scroll_into_view_if_needed()
        expect(page.locator('#hero3d canvas, #hero3d .poster:text("Twoja przeglądarka")')).to_be_visible()
    expect(page.locator('footer')).to_contain_text('NOT AN OFFICIAL MINECRAFT SERVICE.')


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
        if name == 'hosting':
            hosting(page)
        if name == 'edytor':
            export_parity(page)
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

"""Testy lokalnej strony uruchomionej przez python3 -m http.server 8000."""
from itertools import product
import os

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
    if page.viewport_size['width'] == 390:
        assert rows.first.evaluate("r => getComputedStyle(r).display") == 'grid'


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
        if name == 'parkour':
            parkour(page, mobile)
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
        if name == 'lifesteal':
            cennik(page)
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

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
            sezon_code(page)
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

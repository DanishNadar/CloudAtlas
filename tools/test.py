"""Headless end-to-end test: visits every scene, exercises controls, runs acceptance scenarios, records errors and screenshots."""
import sys, pathlib, json
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parent.parent
url = (root / 'dist' / 'index.html').as_uri()
shots = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'shots'
shots.mkdir(parents=True, exist_ok=True)
errors, results = [], []
def ok(name, cond, extra=''):
    results.append((name, bool(cond), extra)); print(('PASS ' if cond else 'FAIL ') + name, extra if not cond else '')

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(('pageerror', pg.url, str(e))))
    pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errors.append(('console', pg.url, m.text)))
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    pg.goto(url); pg.wait_for_timeout(400)
    n = pg.evaluate('SCENES.length'); print('scenes:', n)
    ids = pg.evaluate('SCENES.map(s=>s.id)')
    for i, sid in enumerate(ids):
        pg.evaluate(f'U.goId("{sid}")'); pg.wait_for_timeout(700)
        pg.screenshot(path=str(shots / f'{i:02d}-{sid}.png'))
        for bt in pg.query_selector_all('#stage .btn, #stage .chip'):
            try:
                if bt.is_visible() and bt.is_enabled(): bt.click(timeout=600); pg.wait_for_timeout(25)
            except Exception as e:
                if 'not attached' not in str(e): errors.append(('click', sid, str(e)[:100]))
        for r in pg.query_selector_all('#stage input[type=range]'):
            pg.evaluate('(el)=>{el.value=el.max; el.dispatchEvent(new Event("input",{bubbles:true})); el.value=el.min; el.dispatchEvent(new Event("input",{bubbles:true}));}', r)
        for c in pg.query_selector_all('#stage input[type=checkbox]'):
            try:
                if c.is_visible(): c.click(timeout=500); c.click(timeout=500)
            except Exception as e:
                if 'not attached' not in str(e): errors.append(('check', sid, str(e)[:100]))
        for s in pg.query_selector_all('#stage select'):
            try:
                opts = s.eval_on_selector_all('option', 'os=>os.map(o=>o.value)')
                for v in opts: s.select_option(v)
            except Exception as e: errors.append(('select', sid, str(e)[:100]))
        pg.wait_for_timeout(500)
        pg.screenshot(path=str(shots / f'{i:02d}-{sid}-after.png'))
        pg.keyboard.press('Escape')

    # ---------- acceptance scenarios ----------
    def fresh(sid):
        pg.evaluate(f'U.goId("{sid}")'); pg.wait_for_timeout(500)
    # A: first visit lands on the journey and it steps
    pg.evaluate('localStorage.clear()'); pg.goto(url + '#journey'); pg.wait_for_timeout(400)
    for _ in range(12): pg.get_by_role('button', name='Next step', exact=True).click(); pg.wait_for_timeout(60)
    pg.wait_for_timeout(6000)
    ok('A journey steps to the end', 'Zoom out' in pg.inner_text('#exp'))
    # B: demand change changes outcomes coherently
    fresh('why-cloud'); t1 = pg.inner_text('#tiles')
    pg.evaluate('(()=>{const e=document.querySelectorAll("#stage input[type=range]")[0];e.value=0;e.dispatchEvent(new Event("input",{bubbles:true}));const s=document.querySelectorAll("#stage input[type=range]")[1];s.value=1;s.dispatchEvent(new Event("input",{bubbles:true}))})()')
    t2 = pg.inner_text('#tiles'); ok('B capacity tiles respond to demand', t1 != t2 and '0.0% · 0.0%' in t2, t2.replace('\n', ' '))
    # C: networking rule change
    fresh('vpc'); pg.wait_for_timeout(2500)
    pg.get_by_role('tab', name='Routing', exact=True).click(); pg.get_by_label('NAT gateway exists').uncheck()
    pg.get_by_role('button', name='App server → internet :443 (OS updates)', exact=True).click(); pg.wait_for_timeout(3500)
    ok('C missing NAT blocks outbound with reason', 'Connection fails' in pg.inner_text('#verdict') and 'NAT' in pg.inner_text('#trace'), pg.inner_text('#trace')[:200])
    # D/E: scaling and AZ failure
    fresh('surge')
    pg.evaluate('(()=>{const e=document.querySelectorAll("#stage input[type=range]")[0];e.value=700;e.dispatchEvent(new Event("input",{bubbles:true}))})()')
    for _ in range(3): pg.get_by_role('button', name='Advance 10 s').click()
    d1 = pg.inner_text('#tiles'); ok('D overload rejects requests', 'rejected' in d1.lower() and 'bad' in pg.eval_on_selector('#tiles .tile:nth-child(3)', 'e=>e.className'), d1.replace('\n', ' '))
    for _ in range(4): pg.get_by_role('button', name='Add instance').click()
    for _ in range(8): pg.get_by_role('button', name='Advance 10 s').click()
    ok('D adding instances restores service', 'good' in pg.eval_on_selector('#tiles .tile:nth-child(3)', 'e=>e.className'), pg.inner_text('#tiles').replace('\n', ' '))
    pg.get_by_role('button', name='Fail AZ b').click()
    for _ in range(3): pg.get_by_role('button', name='Advance 10 s').click()
    ok('E AZ failure reflects remaining capacity', 'AZ' in pg.inner_text('#why') or 'exceeds capacity' in pg.inner_text('#why'), pg.inner_text('#why'))
    # F: IAM
    fresh('iam'); pg.get_by_role('button', name='Least privilege').click(); tf = pg.inner_text('#tiles')
    ok('F least privilege = 4/4 needed, 0/3 extra', '4/4' in tf and '0/3' in tf, tf.replace('\n', ' '))
    pg.get_by_role('button', name='Admin (*:*)').click(); ok('F admin flags excess', '3/3' in pg.inner_text('#tiles'))
    # G: AI inference responds
    fresh('inference'); g1 = pg.inner_text('#tiles')
    pg.evaluate('(()=>{const e=document.querySelectorAll("#stage input[type=range]")[0];e.value=30;e.dispatchEvent(new Event("input",{bubbles:true}))})()')
    g2 = pg.inner_text('#tiles'); ok('G inference overload shows', 'overloaded' in g2 and g1 != g2, g2.replace('\n', ' '))
    # H: progress persists across reload
    pg.goto(url + '#cost'); pg.wait_for_timeout(300); pg.reload(); pg.wait_for_timeout(500)
    st = pg.evaluate('JSON.parse(localStorage.getItem("cloudatlas:v1"))')
    ok('H progress persisted', st and st.get('visited', {}).get('cost') == 1 and st.get('done', {}).get('iam'), json.dumps(st)[:200])
    pg.goto(url); pg.wait_for_timeout(400); ok('H resume to last scene', pg.evaluate('location.hash') == '#cost')
    # I: presentation mode + keyboard
    pg.keyboard.press('f'); pg.wait_for_timeout(200); ok('I present mode on', pg.evaluate('document.body.classList.contains("present")'))
    pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(300); ok('I keyboard next', pg.evaluate('location.hash') == '#llm')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200); ok('I exit present', not pg.evaluate('document.body.classList.contains("present")'))
    pg.keyboard.press('k'); pg.wait_for_timeout(200); pg.click('.kcopt[data-i="1"]'); ok('knowledge check records', pg.evaluate('U.store.checks.llm') == True); pg.keyboard.press('Escape')
    pg.keyboard.press('e'); ok('engineer mode toggles', pg.evaluate('document.body.classList.contains("eng")')); pg.keyboard.press('e')
    # J: reduced motion + mobile
    m = b.new_context(viewport={'width': 400, 'height': 820}, reduced_motion='reduce').new_page()
    m.on('pageerror', lambda e: errors.append(('pageerror-mobile', '', str(e))))
    m.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    for sid in ['journey', 'surge', 'vpc', 'studio']:
        m.goto(url + '#' + sid); m.reload(); m.wait_for_timeout(900); m.screenshot(path=str(shots / f'zz-m-{sid}.png'), full_page=True)
        sw = m.evaluate('document.documentElement.scrollWidth'); ok(f'J no horizontal scroll at 400px ({sid})', sw <= 402, sw)
    b.close()
print('ERRORS:', len(errors))
for e in errors: print(e)
fails = [r for r in results if not r[1]]
print(f'{len(results) - len(fails)}/{len(results)} acceptance checks passed')
sys.exit(1 if errors or fails else 0)

/* Shell polish: command palette, shortcut sheet, scrubbable progress bar, pointer lighting, celebration burst and a provider-tinted tab icon.
   Everything here is additive — it only listens to the shell and never changes scene behaviour. */
(function () {
  'use strict';
  if (typeof document === 'undefined' || !window.U) return;
  const U = window.U;
  const plain = s => String(s || '').replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ');
  const emOf = s => s.ic || (U.SCENE_IC && U.SCENE_IC[s.id]);
  const SEC = { basics: 'Basics', explore: 'Explore', providers: 'Providers', lab: 'Cloud Lab', studio: 'Studio', ai: 'AI Infra', career: 'Careers', reference: 'Reference' };

  /* ---------- tab icon follows the provider theme ---------- */
  const ICON_COLORS = {
    multi: ['#FF9900', '#0A84E8', '#34A853', '#FBBC04'],
    aws: ['#C76F00', '#FF9900', '#FFB84D', '#FFE0A8'],
    azure: ['#0A5FB0', '#0A84E8', '#50E6FF', '#BDF6FF'],
    gcp: ['#EA4335', '#4285F4', '#34A853', '#FBBC04']
  };
  const tabIcon = c => {
    const [a, b, d, e] = ICON_COLORS[c] || ICON_COLORS.multi;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0d1528"/><circle cx="18.5" cy="36.5" r="11.7" fill="${a}"/><circle cx="33.8" cy="30.2" r="14.4" fill="${b}" style="mix-blend-mode:screen"/><circle cx="46.4" cy="37.4" r="10.8" fill="${d}" style="mix-blend-mode:screen"/><circle cx="34.7" cy="43.7" r="6.3" fill="${e}" style="mix-blend-mode:screen"/></svg>`;
    let link = document.querySelector('link[rel="icon"]');
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; link.type = 'image/svg+xml'; document.head.appendChild(link); }
    link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
  };

  /* ---------- overlay helper ---------- */
  const overlay = (id, cls) => { let m = document.getElementById(id); if (!m) { m = document.createElement('div'); m.id = id; m.className = cls; m.hidden = true; document.body.appendChild(m); } return m; };
  let lastFocus = null;
  const openOverlay = m => { lastFocus = document.activeElement; m.hidden = false; };
  const closeOverlay = m => { m.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); };

  /* ---------- command palette ---------- */
  const pal = overlay('palette', 'ovl');
  let items = [], sel = 0;
  const score = (s, q) => {
    if (!q) return 1;
    const hay = `${plain(s.short)} ${plain(s.title)} ${plain(s.kicker)} ${SEC[s.section] || ''} ${plain(s.lab)}`.toLowerCase();
    const words = q.toLowerCase().split(/\s+/).filter(Boolean); let sc = 0;
    for (const w of words) { const k = hay.indexOf(w); if (k < 0) return 0; sc += k === 0 ? 3 : /\s/.test(hay[k - 1]) ? 2 : 1; }
    return sc;
  };
  const renderPal = q => {
    const cur = SCENES[SCENES.findIndex(s => location.hash.endsWith(s.id))];
    items = SCENES.map((s, i) => ({ s, i, sc: score(s, q) })).filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc || a.i - b.i).slice(0, 40);
    sel = U.clamp(sel, 0, Math.max(0, items.length - 1));
    const list = pal.querySelector('.pl');
    list.innerHTML = items.length ? items.map((x, k) => {
      const em = emOf(x.s); const done = U.store.visited[x.s.id]; const ok = x.s.check && U.store.checks[x.s.id] === true;
      return `<li role="option" id="po-${k}" aria-selected="${k === sel}" data-k="${k}" class="${x.s === cur ? 'cur' : ''}">
        <span class="pem" style="--c:${em ? (U.CAT[em[1]] || em[1]) : 'var(--line)'}">${em ? U.icon(em[0]) : ''}</span>
        <span class="pt"><b>${plain(x.s.short || x.s.title)}</b><i>${SEC[x.s.section] || ''}${x.s.ch != null ? ' · Chapter ' + x.s.ch : ''}${x.s.lab ? ' · lab' : ''}</i></span>
        <span class="ps">${ok ? '<em class="c-green">✓ check</em>' : done ? '<em class="c-dim">visited</em>' : ''}</span></li>`;
    }).join('') : '<li class="pe">No chapter matches that. Try “cost”, “kubernetes” or “GPU”.</li>';
    pal.querySelector('input').setAttribute('aria-activedescendant', items.length ? 'po-' + sel : '');
    const on = list.querySelector('[aria-selected="true"]'); if (on) on.scrollIntoView({ block: 'nearest' });
  };
  const openPal = () => {
    if (!pal.innerHTML) {
      pal.innerHTML = `<div class="pbox" role="dialog" aria-modal="true" aria-label="Jump to a chapter">
        <div class="pin">${U.icon('search') || '<span class="c-dim">⌕</span>'}<input type="text" role="combobox" aria-expanded="true" aria-controls="plist" placeholder="Jump to a chapter, lab or topic…" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></div>
        <ul class="pl" id="plist" role="listbox"></ul>
        <div class="pf"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>?</kbd> all shortcuts</span></div></div>`;
      const inp = pal.querySelector('input');
      inp.addEventListener('input', () => { sel = 0; renderPal(inp.value); });
      inp.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Escape') { e.preventDefault(); closeOverlay(pal); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, items.length); renderPal(inp.value); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + items.length) % Math.max(1, items.length); renderPal(inp.value); }
        else if (e.key === 'Enter' && items[sel]) { e.preventDefault(); const id = items[sel].s.id; closeOverlay(pal); U.goId(id); }
      });
      pal.querySelector('.pl').addEventListener('click', e => { const li = e.target.closest('li[data-k]'); if (!li) return; const id = items[+li.dataset.k].s.id; closeOverlay(pal); U.goId(id); });
      pal.querySelector('.pl').addEventListener('pointermove', e => { const li = e.target.closest('li[data-k]'); if (li && +li.dataset.k !== sel) { sel = +li.dataset.k; pal.querySelectorAll('li[data-k]').forEach(x => x.setAttribute('aria-selected', String(+x.dataset.k === sel))); } });
      pal.addEventListener('click', e => { if (e.target === pal) closeOverlay(pal); });
    }
    sel = 0; const inp = pal.querySelector('input'); inp.value = ''; renderPal(''); openOverlay(pal); inp.focus();
  };

  /* ---------- shortcut sheet ---------- */
  const help = overlay('keys', 'ovl');
  const KEYS = [['→ or Space', 'Next scene'], ['←', 'Previous scene'], ['Home or End', 'First / last scene'], ['Ctrl K or /', 'Search and jump'], ['G', 'All chapters'], ['L', 'Cloud Lab experiments'], ['K', 'Knowledge check'], ['E', 'Toggle Explore / Engineer depth'], ['N', 'Presenter notes'], ['F', 'Present full screen'], ['P', 'Presenter window'], ['?', 'This sheet'], ['Esc', 'Close any panel']];
  const openHelp = () => {
    help.innerHTML = `<div class="pbox keysbox" role="dialog" aria-modal="true" aria-labelledby="khd"><div class="kicker">Keyboard</div><h3 id="khd">Shortcuts</h3>
      <dl>${KEYS.map(([k, v]) => `<dt>${k.split(' ').map(t => t === 'or' ?`<span class="c-dim">${t}</span>` : `<kbd>${t}</kbd>`).join(' ')}</dt><dd>${v}</dd>`).join('')}</dl>
      <div class="controls" style="justify-content:flex-end"><button class="btn" type="button" id="kClose">Close</button></div></div>`;
    help.querySelector('#kClose').onclick = () => closeOverlay(help);
    help.onclick = e => { if (e.target === help) closeOverlay(help); };
    openOverlay(help); help.querySelector('#kClose').focus();
  };

  /* ---------- progress bar: hover to preview, click to jump ---------- */
  const scrub = () => {
    const bar = U.$('.prog'); if (!bar) return;
    const tip = document.createElement('div'); tip.className = 'ptip'; tip.hidden = true; bar.parentElement.appendChild(tip);
    const at = e => { const r = bar.getBoundingClientRect(); return U.clamp(Math.floor((e.clientX - r.left) / r.width * SCENES.length), 0, SCENES.length - 1); };
    bar.addEventListener('pointermove', e => {
      const k = at(e), s = SCENES[k], em = emOf(s), r = bar.getBoundingClientRect(), pr = bar.parentElement.getBoundingClientRect();
      tip.innerHTML = `${em ? `<span class="pem sm" style="--c:${U.CAT[em[1]] || em[1]}">${U.icon(em[0])}</span>` : ''}<span><b>${plain(s.short || s.title)}</b><i class="mono">${k + 1} / ${SCENES.length}</i></span>`;
      tip.hidden = false; tip.style.left = U.clamp(e.clientX - pr.left, 120, pr.width - 120) + 'px'; tip.style.top = (r.top - pr.top) + 'px';
      bar.style.setProperty('--hx', ((e.clientX - r.left) / r.width * 100) + '%');
    });
    bar.addEventListener('pointerleave', () => { tip.hidden = true; bar.style.removeProperty('--hx'); });
    bar.addEventListener('click', e => U.goId(SCENES[at(e)].id));
    // section ticks so the bar reads as a map of the course
    const ticks = document.createElement('div'); ticks.className = 'pticks'; bar.appendChild(ticks);
    SCENES.forEach((s, i) => { if (i && s.section !== SCENES[i - 1].section) { const t = document.createElement('i'); t.style.left = (i / SCENES.length * 100) + '%'; ticks.appendChild(t); } });
  };

  /* ---------- pointer lighting on surfaces ---------- */
  const LIT = '.card, .tile, .viz, .explain, .host, .knode, .kcopt, #grid li button, .nchip, .tl-card';
  let raf = 0, lastEv = null;
  const light = () => {
    raf = 0; const e = lastEv; if (!e) return;
    const el = e.target && e.target.closest ? e.target.closest(LIT) : null; if (!el) return;
    const r = el.getBoundingClientRect(); el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  };

  /* ---------- celebration burst for a correct knowledge check ---------- */
  const burst = (x, y) => {
    if (U.RM) return;
    const cv = document.createElement('canvas'); cv.className = 'burst'; document.body.appendChild(cv);
    const d = window.devicePixelRatio || 1, W = innerWidth, H = innerHeight; cv.width = W * d; cv.height = H * d;
    const ctx = cv.getContext('2d'); ctx.scale(d, d);
    const cols = ['#FF9900', '#FBBC04', '#34A853', '#50E6FF', '#3AA0FF', '#a78bfa', '#EA4335'];
    const P = Array.from({ length: 120 }, (_, i) => { const a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 9; return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5, r: 3 + Math.random() * 4, c: cols[i % cols.length], s: Math.random() * 6, w: Math.random() < .5 }; });
    const t0 = performance.now();
    const f = t => {
      const u = (t - t0) / 1400; ctx.clearRect(0, 0, W, H);
      P.forEach(p => { p.vy += .32; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.s += .2; ctx.globalAlpha = Math.max(0, 1 - u); ctx.fillStyle = p.c; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.s); if (p.w) ctx.fillRect(-p.r, -p.r / 2.5, p.r * 2, p.r / 1.25); else { ctx.beginPath(); ctx.arc(0, 0, p.r / 1.4, 0, 7); ctx.fill(); } ctx.restore(); });
      if (u < 1) requestAnimationFrame(f); else cv.remove();
    };
    requestAnimationFrame(f);
  };

  function boot() {
    tabIcon(U.cloud()); U.onCloud(tabIcon);
    scrub();
    // search button in the top bar
    const bar = U.$('.bar-r');
    if (bar && !U.$('#btnFind')) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn find'; b.id = 'btnFind'; b.setAttribute('aria-label', 'Search chapters'); b.title = 'Search chapters (Ctrl K or /)';
      b.innerHTML = `${U.icon('search') || ''}<span>Search</span><kbd>Ctrl K</kbd>`; b.onclick = openPal; bar.prepend(b);
    }
    document.addEventListener('keydown', e => {
      const tg = e.target; const typing = tg && (tg.tagName === 'INPUT' || tg.tagName === 'SELECT' || tg.tagName === 'TEXTAREA');
      const anyOpen = !pal.hidden || !help.hidden;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); e.stopImmediatePropagation(); return pal.hidden ? openPal() : closeOverlay(pal); }
      if (anyOpen) { if (e.key === 'Escape') { e.stopImmediatePropagation(); closeOverlay(!pal.hidden ? pal : help); } else if (!help.hidden) e.stopImmediatePropagation(); return; }
      if (typing || e.ctrlKey || e.metaKey || e.altKey || !U.$('#kc').hidden || !U.$('#grid').hidden) return;
      if (e.key === '/') { e.preventDefault(); e.stopImmediatePropagation(); openPal(); }
      else if (e.key === '?') { e.preventDefault(); e.stopImmediatePropagation(); openHelp(); }
    }, true);
    document.addEventListener('pointermove', e => { lastEv = e; if (!raf) raf = requestAnimationFrame(light); }, { passive: true });
    // celebrate a correct answer (core marks the chosen option .right)
    U.$('#kc').addEventListener('click', e => { const b = e.target.closest('.kcopt'); if (!b) return; queueMicrotask(() => { if (b.classList.contains('right')) { const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2); } }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

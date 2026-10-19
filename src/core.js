/* Cloud Atlas — application shell, progress, depth modes, presentation mode, and shared visualization primitives.
   Scenes register with scene({...}); each may provide mount(bodyEl, slideEl) returning a cleanup function. */
(function () {
  'use strict';
  const SCENES = [];
  const G = typeof window !== 'undefined' ? window : globalThis;
  G.SCENES = SCENES;
  G.scene = d => { SCENES.push(d); };
  if (typeof document === 'undefined') return;

  const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const U = { RM };
  G.U = U;
  U.$ = (s, r = document) => r.querySelector(s);
  U.$$ = (s, r = document) => [...r.querySelectorAll(s)];
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rng = seed => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  U.fmt = (v, d = 0) => (v === Infinity || isNaN(v)) ? '∞' : Number(v).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
  U.money = v => '$' + U.fmt(Math.round(v));
  U.esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  U.tok = el => {
    const cs = getComputedStyle(el || document.body); const g = n => cs.getPropertyValue('--' + n).trim();
    const t = {}; ['bg', 'bg2', 'panel', 'line', 'grid', 'fg', 'muted', 'dim', 'blue', 'cyan', 'red', 'amber', 'green', 'violet', 'yellow', 'accent', 'aws', 'azure', 'gcp'].forEach(k => t[k] = g(k));
    t.mono = "500 12px 'JetBrains Mono', ui-monospace, monospace";
    t.monoS = "500 11px 'JetBrains Mono', ui-monospace, monospace";
    t.monoB = "600 13px 'JetBrains Mono', ui-monospace, monospace";
    t.sans = "600 14px 'Sora', system-ui, sans-serif";
    return t;
  };
  U.a = (hex, a) => {
    const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  /* ---------- storage (per-viewer convenience only; every access guarded) ---------- */
  const KEY = 'cloudatlas:v1';
  const store = (() => { let d = {}; try { d = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { d = {}; } return d; })();
  store.visited = store.visited || {}; store.checks = store.checks || {}; store.done = store.done || {};
  U.save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} };
  U.store = store;
  U.markDone = (key, v = true) => { store.done[key] = v; U.save(); renderProgress(); };

  /* ---------- canvas + loop ---------- */
  U.canvas = (host, draw) => {
    const cv = document.createElement('canvas'); host.appendChild(cv);
    const o = { cv, ctx: cv.getContext('2d'), W: 10, H: 10, draw };
    const fit = () => {
      const r = host.getBoundingClientRect(); const d = window.devicePixelRatio || 1;
      o.W = Math.max(10, Math.floor(r.width)); o.H = Math.max(10, Math.floor(r.height));
      cv.width = o.W * d; cv.height = o.H * d; cv.style.width = o.W + 'px'; cv.style.height = o.H + 'px';
      o.ctx.setTransform(d, 0, 0, d, 0, 0); if (o.draw && o.ready) o.draw();
    };
    const ro = new ResizeObserver(fit); ro.observe(host); fit();
    queueMicrotask(() => { o.ready = true; if (o.draw && !o.dead) o.draw(); });
    o.destroy = () => { o.dead = true; ro.disconnect(); };
    o.pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    return o;
  };
  U.loop = fn => {
    let id, last = performance.now(), on = true;
    const f = t => { if (!on) return; const dt = Math.min(0.05, (t - last) / 1000); last = t; if (!document.hidden) fn(dt, t / 1000); id = requestAnimationFrame(f); };
    id = requestAnimationFrame(f);
    return () => { on = false; cancelAnimationFrame(id); };
  };

  /* ---------- line chart on a canvas object ---------- */
  U.chart = (c, o) => {
    const { ctx, W, H } = c; const k = o.k; ctx.clearRect(0, 0, W, H);
    const pl = o.padL ?? 56, pr = o.padR ?? 14, pt = o.padT ?? 26, pb = o.padB ?? 34;
    const [x0, x1] = o.x, [y0, y1] = o.y;
    const X = v => pl + (v - x0) / (x1 - x0 || 1) * (W - pl - pr), Y = v => H - pb - (v - y0) / (y1 - y0 || 1) * (H - pt - pb);
    ctx.font = k.monoS; ctx.strokeStyle = k.grid; ctx.fillStyle = k.dim; ctx.lineWidth = 1;
    const yt = o.yTicks || 4;
    for (let i = 0; i <= yt; i++) { const v = y0 + (y1 - y0) * i / yt; const y = Y(v); ctx.beginPath(); ctx.moveTo(pl, y); ctx.lineTo(W - pr, y); ctx.stroke(); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText((o.yFmt || (v => U.fmt(v)))(v), pl - 6, y); }
    const xt = o.xTicks || 4;
    for (let i = 0; i <= xt; i++) { const v = x0 + (x1 - x0) * i / xt; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText((o.xFmt || (v => U.fmt(v)))(v), X(v), H - pb + 6); }
    if (o.xLabel) { ctx.textAlign = 'right'; ctx.fillText(o.xLabel, W - pr, H - 12); }
    if (o.yLabel) { ctx.fillStyle = k.dim; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(o.yLabel, pl, 6); }
    (o.bands || []).forEach(b => { ctx.fillStyle = b.color; ctx.fillRect(X(b.from), pt, X(b.to) - X(b.from), H - pt - pb); });
    (o.hlines || []).forEach(h => { ctx.strokeStyle = h.color; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(pl, Y(h.v)); ctx.lineTo(W - pr, Y(h.v)); ctx.stroke(); ctx.setLineDash([]); if (h.label) { ctx.fillStyle = h.color; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(h.label, W - pr, Y(h.v) - 3); } });
    o.series.forEach(s => {
      const d = s.data; if (!d.length) return;
      const pts = d.map((v, i) => [X(s.xs ? s.xs[i] : x0 + i * (s.dx || 1)), Y(U.clamp(v, y0, y1))]);
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 2; ctx.setLineDash(s.dash || []);
      ctx.beginPath(); pts.forEach((p, i) => { if (i === 0) ctx.moveTo(...p); else if (s.step) { ctx.lineTo(p[0], pts[i - 1][1]); ctx.lineTo(...p); } else ctx.lineTo(...p); }); ctx.stroke(); ctx.setLineDash([]);
      if (s.fill) { ctx.lineTo(pts[pts.length - 1][0], Y(y0)); ctx.lineTo(pts[0][0], Y(y0)); ctx.closePath(); ctx.fillStyle = s.fill; ctx.fill(); }
      if (s.dot) { const p = pts[pts.length - 1]; ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(p[0], p[1], 3.5, 0, 7); ctx.fill(); }
    });
    if (o.legend) { ctx.font = k.monoS; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; const L = o.series.filter(s => s.label); let lx = W - pr - L.reduce((a, s) => a + ctx.measureText(s.label).width + 30, 0); if (o.yLabel) lx = Math.max(lx, pl + ctx.measureText(o.yLabel).width + 16); L.forEach(s => { ctx.fillStyle = s.color; ctx.fillRect(lx, 11, 12, 3); ctx.fillStyle = k.muted; ctx.fillText(s.label, lx + 16, 12); lx += ctx.measureText(s.label).width + 30; }); }
    (o.points || []).forEach(p => { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(X(p.x), Y(U.clamp(p.y, y0, y1)), p.r || 5, 0, 7); ctx.fill(); if (p.label) { ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(p.label, X(p.x) + 7, Y(U.clamp(p.y, y0, y1)) - 4); } });
    return { X, Y };
  };

  /* ---------- controls ---------- */
  let uid = 0; const nid = p => (p || 'c') + '-' + (++uid);
  U.slider = (host, o, cb) => {
    const id = o.id || nid('r');
    const w = document.createElement('label'); w.className = 'ctl'; w.htmlFor = id;
    w.innerHTML = `<span>${o.label}</span><input type="range" id="${id}" min="${o.min}" max="${o.max}" step="${o.step}" value="${o.value}"><output class="mono"></output>`;
    host.appendChild(w);
    const inp = w.querySelector('input'), out = w.querySelector('output'); const fmt = o.fmt || (v => v);
    const upd = fire => { const v = +inp.value; out.textContent = fmt(v); if (fire && cb) cb(v); };
    inp.addEventListener('input', () => upd(true)); upd(false);
    return { el: w, get: () => +inp.value, set: (v, fire = true) => { inp.value = v; upd(fire); } };
  };
  U.check = (host, o, cb) => {
    const id = o.id || nid('k');
    const w = document.createElement('label'); w.className = 'ctl chk'; w.htmlFor = id;
    w.innerHTML = `<input type="checkbox" id="${id}" ${o.checked ? 'checked' : ''}><span>${o.label}</span>`;
    host.appendChild(w); const inp = w.querySelector('input');
    inp.addEventListener('change', () => cb && cb(inp.checked));
    return { el: w, get: () => inp.checked, set: (v, fire = true) => { inp.checked = v; if (fire && cb) cb(v); } };
  };
  U.btn = (host, label, cb, cls = '') => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + cls; b.innerHTML = label;
    b.addEventListener('click', cb); host.appendChild(b); return b;
  };
  U.seg = (host, opts, value, cb, label) => {
    const w = document.createElement('div'); w.className = 'seg'; w.setAttribute('role', 'group'); if (label) w.setAttribute('aria-label', label); host.appendChild(w);
    const bs = opts.map(([v, l]) => { const b = U.btn(w, l, () => set(v, true)); b.dataset.v = v; return b; });
    const set = (v, fire) => { value = v; bs.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(v)))); if (fire && cb) cb(v); };
    set(value, false);
    return { el: w, get: () => value, set };
  };
  U.select = (host, label, opts, value, cb) => {
    const id = nid('s'); const w = document.createElement('label'); w.className = 'ctl'; w.htmlFor = id;
    w.innerHTML = `<span>${label}</span><select class="sel" id="${id}">${opts.map(([v, l]) => `<option value="${U.esc(v)}" ${v === value ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    host.appendChild(w); const s = w.querySelector('select'); s.addEventListener('change', () => cb(s.value));
    return { el: w, get: () => s.value, set: v => { s.value = v; } };
  };
  U.tiles = (host, items) => { host.innerHTML = items.map(([l, v, cls, sub]) => `<div class="tile ${cls || ''}"><div class="tl">${l}</div><div class="tv mono">${v}</div>${sub ? `<div class="ts">${sub}</div>` : ''}</div>`).join(''); };

  /* ---------- SVG flow diagram primitive: nodes, connectors, animated packets ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  U.svg = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  U.flow = (host, spec) => {
    const [vw, vh] = spec.size; const svg = U.svg('svg', { viewBox: `0 0 ${vw} ${vh}`, class: 'flow', role: 'img', 'aria-label': spec.label || 'Architecture diagram' }, host);
    const gB = U.svg('g', {}, svg), gE = U.svg('g', {}, svg), gN = U.svg('g', {}, svg), gP = U.svg('g', {}, svg);
    (spec.boundaries || []).forEach(b => {
      U.svg('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 12, class: 'fb ' + (b.kind || ''), }, gB);
      const t = U.svg('text', { x: b.x + 12, y: b.y + 20, class: 'fbl ' + (b.kind || '') }, gB); t.textContent = b.label;
      if (b.sub) { const t2 = U.svg('text', { x: b.x + 12, y: b.y + 36, class: 'fbs' }, gB); t2.textContent = b.sub; }
    });
    const N = {};
    Object.entries(spec.nodes).forEach(([id, n]) => {
      const g = U.svg('g', { class: 'fn ' + (n.kind || ''), 'data-id': id, transform: `translate(${n.x},${n.y})` }, gN);
      const w = n.w || 150, h = n.h || 54;
      U.svg('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 9 }, g);
      const t = U.svg('text', { x: 0, y: n.sub ? -3 : 5, class: 'fnt' }, g); t.textContent = n.label;
      if (n.sub) { const s = U.svg('text', { x: 0, y: 14, class: 'fns' }, g); s.textContent = n.sub; }
      if (n.icon) { const ic = U.svg('text', { x: -w / 2 + 12, y: -h / 2 + 15, class: 'fni' }, g); ic.textContent = n.icon; }
      const gi = n.ic === false || !U.guessIcon ? null : (n.ic ? [n.ic, n.cat || 'compute'] : U.guessIcon(n.label + ' ' + (n.sub || '')));
      if (gi && U.IC && U.IC[gi[0]] && w >= 80 && h >= 34) {
        const c = U.CAT[gi[1]] || gi[1];
        U.svg('path', { d: `M${-w / 2 + 10} ${-h / 2 + 0.8}H${w / 2 - 10}`, style: `stroke:${c}`, class: 'fnbar' }, g);
        const bg = U.svg('g', { class: 'fnic', transform: `translate(${-w / 2 - 8},${-h / 2 - 9})` }, g);
        U.svg('rect', { width: 22, height: 22, rx: 6, style: `fill:${c};stroke:none` }, bg);
        const ig = U.svg('g', { transform: 'translate(3,3) scale(0.6667)', style: 'fill:none;stroke:#fff;color:#fff', 'stroke-width': 2.1, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, bg);
        ig.innerHTML = U.IC[gi[0]];
      }
      if (spec.onClick) { g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', n.label); g.style.cursor = 'pointer'; const f = () => spec.onClick(id); g.addEventListener('click', f); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); f(); } }); }
      N[id] = { ...n, w, h, g };
    });
    const edge = (a, b) => {
      const A = N[a], B = N[b]; const dx = B.x - A.x, dy = B.y - A.y;
      const cut = (n, ux, uy) => { const tx = ux ? (n.w / 2) / Math.abs(ux) : Infinity, ty = uy ? (n.h / 2) / Math.abs(uy) : Infinity; const t = Math.min(tx, ty); return [n.x + ux * t, n.y + uy * t]; };
      const L = Math.hypot(dx, dy) || 1; return [cut(A, dx / L, dy / L), cut(B, -dx / L, -dy / L)];
    };
    const E = {};
    const drawEdges = list => { gE.innerHTML = ''; Object.keys(E).forEach(k => delete E[k]); list.forEach(([a, b, cls]) => { if (!N[a] || !N[b]) return; const [p, q] = edge(a, b); E[a + '>' + b] = U.svg('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], class: 'fe ' + (cls || '') }, gE); }); };
    drawEdges(spec.edges || []);
    const api = {
      svg, N, E, setEdges: drawEdges,
      state(id, cls) { const n = N[id]; if (!n) return; n.g.setAttribute('class', 'fn ' + (n.kind || '') + (cls ? ' ' + cls : '')); },
      clear() { Object.keys(N).forEach(id => api.state(id, '')); Object.values(E).forEach(e => e.classList.remove('on', 'bad')); },
      show(id, v) { if (N[id]) N[id].g.style.display = v ? '' : 'none'; },
      edgeOn(a, b, cls = 'on') { const e = E[a + '>' + b] || E[b + '>' + a]; if (e) e.classList.add(cls); },
      packet(a, b, cls = 'pk', ms = 700) {
        return new Promise(res => {
          if (!N[a] || !N[b]) return res();
          const [p, q] = edge(a, b); const c = U.svg('circle', { r: 7, class: cls, cx: p[0], cy: p[1] }, gP);
          if (RM || ms <= 0) { c.remove(); return res(); }
          const t0 = performance.now();
          const f = t => { const u = Math.min(1, (t - t0) / ms); const e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; c.setAttribute('cx', p[0] + (q[0] - p[0]) * e); c.setAttribute('cy', p[1] + (q[1] - p[1]) * e); if (u < 1 && c.isConnected) requestAnimationFrame(f); else { c.remove(); res(); } };
          requestAnimationFrame(f);
        });
      }
    };
    return api;
  };

  /* ---------- stepper: play / pause / next / back / restart over a list of steps ---------- */
  U.stepper = (host, opts) => {
    // opts: { count: () => n, render: async (i, animate) => {}, autoMs }
    let i = -1, playing = false, timer = null, busy = false, dead = false, pending = null;
    const bar = document.createElement('div'); bar.className = 'controls'; host.appendChild(bar);
    const bPlay = U.btn(bar, 'Play', () => toggle(), 'primary');
    U.btn(bar, 'Back', () => { stop(); go((pending ? pending[0] : i) - 1, false); });
    U.btn(bar, 'Next step', () => { stop(); go((pending ? pending[0] : i) + 1, true); });
    U.btn(bar, 'Restart', () => { stop(); go(0, true); });
    const pos = document.createElement('span'); pos.className = 'mono c-muted stepn'; bar.appendChild(pos);
    const go = async (k, anim) => {
      const n = opts.count(); k = U.clamp(k, 0, n - 1); if (busy) { pending = [k, anim]; return; } i = k; pos.textContent = `step ${i + 1} / ${n}`;
      busy = true; try { await opts.render(i, anim && !RM); } finally { busy = false; }
      if (pending && !dead) { const [pk, pa] = pending; pending = null; return go(pk, pa); }
      if (playing && !dead) { if (i < opts.count() - 1) timer = setTimeout(() => go(i + 1, true), opts.autoMs || 900); else stop(); }
    };
    const stop = () => { playing = false; clearTimeout(timer); bPlay.textContent = 'Play'; };
    const toggle = () => { if (playing) return stop(); playing = true; bPlay.textContent = 'Pause'; if (i >= opts.count() - 1) go(0, true); else go(i + 1, true); };
    return { go, stop, get i() { return i; }, destroy() { dead = true; stop(); }, bar };
  };

  /* ---------- tabs ---------- */
  U.tabs = (host, tabs, onSel, initial) => {
    const w = document.createElement('div'); w.className = 'tabs'; w.setAttribute('role', 'tablist'); host.appendChild(w);
    const bs = tabs.map(([v, l]) => { const b = U.btn(w, l, () => sel(v)); b.setAttribute('role', 'tab'); b.dataset.v = v; return b; });
    const sel = v => { bs.forEach(b => b.setAttribute('aria-selected', String(b.dataset.v === v))); onSel(v); };
    sel(initial || tabs[0][0]); return { sel };
  };

  /* ---------- depth mode ---------- */
  const modeHandlers = new Set();
  U.mode = () => store.mode === 'engineer' ? 'engineer' : 'explore';
  U.onMode = fn => { modeHandlers.add(fn); return () => modeHandlers.delete(fn); };
  const applyMode = () => { document.body.classList.toggle('eng', U.mode() === 'engineer'); U.$$('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === U.mode()))); modeHandlers.forEach(f => { try { f(U.mode()); } catch (e) { console.error(e); } }); };
  U.setMode = m => { store.mode = m; U.save(); applyMode(); };

  /* ---------- shell ---------- */
  const SECTIONS = [
    ['basics', 'Basics'], ['explore', 'Explore'], ['providers', 'AWS · Azure · GCP'], ['lab', 'Cloud Lab'], ['studio', 'Studio'], ['ai', 'AI Infra'], ['career', 'Careers'], ['reference', 'Reference']
  ];
  /* ---------- provider theme (also the naming "lens" for provider-aware scenes) ---------- */
  const cloudHandlers = new Set();
  U.cloud = () => ['aws', 'azure', 'gcp'].includes(store.cloud) ? store.cloud : 'multi';
  U.onCloud = fn => { cloudHandlers.add(fn); return () => cloudHandlers.delete(fn); };
  const applyCloud = () => { document.body.dataset.cloud = U.cloud(); U.$$('[data-cloud-b]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cloudB === U.cloud()))); cloudHandlers.forEach(f => { try { f(U.cloud()); } catch (e) { console.error(e); } }); };
  U.setCloud = c => { store.cloud = c; U.save(); applyCloud(); };
  const st = { i: 0 };
  let cleanup = null; let sceneModeOff = [];
  const presenter = /^#presenter/.test(location.hash);
  let chan = null; try { chan = new BroadcastChannel('cloudatlas'); } catch (e) { chan = null; }
  U.chapterNo = s => s.ch;

  function show(idx, broadcast = true) {
    idx = U.clamp(idx, 0, SCENES.length - 1);
    document.body.dataset.dir = Math.abs(idx - st.i) === 1 ? (idx > st.i ? 'fwd' : 'back') : 'jump'; // drives the slide entrance direction
    st.i = idx; const s = SCENES[idx];
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    sceneModeOff.forEach(f => f()); sceneModeOff = [];
    const stage = U.$('#stage'); stage.innerHTML = '';
    if (!presenter) {
      const sec = document.createElement('section');
      sec.className = 'slide' + (s.paper ? ' paper' : '') + (s.ai ? ' ai' : '') + (s.cls ? ' ' + s.cls : '');
      sec.setAttribute('aria-label', s.title);
      const em = s.ic || (U.SCENE_IC && U.SCENE_IC[s.id]);
      const head = s.bare ? '' : `<header class="sh${em ? ' has-em' : ''}">${em ? `<div class="emblem" style="--c:${U.CAT[em[1]] || em[1] || 'var(--accent)'}">${U.icon(em[0])}</div>` : ''}
          <div class="kicker">${s.ch != null ? `Chapter ${s.ch} · ` : ''}${s.kicker || ''}</div>
          <h2>${s.title}</h2>
          ${s.objectives ? `<details class="obj"><summary>What you'll learn</summary><ul>${s.objectives.map(o => `<li>${o}</li>`).join('')}</ul></details>` : ''}
        </header>`;
      const foot = (s.notice || s.myth) ? `<footer class="sf">${s.notice ? `<div class="notice"><span>Look for</span><div>${s.notice}</div></div>` : ''}${s.myth ? `<div class="notice myth"><span>Misconception</span><div>${s.myth}</div></div>` : ''}</footer>` : '';
      sec.innerHTML = head + `<div class="sb">${s.html || ''}</div>` + foot;
      stage.appendChild(sec); stage.scrollTop = 0;
      const prevOn = U.onMode, prevC = U.onCloud; U.onMode = fn => { const off = prevOn(fn); sceneModeOff.push(off); return off; };
      U.onCloud = fn => { const off = prevC(fn); sceneModeOff.push(off); return off; };
      try { cleanup = s.mount ? s.mount(sec.querySelector('.sb'), sec) : null; } catch (e) { console.error('mount failed', s.id, e); }
      U.onMode = prevOn; U.onCloud = prevC;
    }
    store.visited[s.id] = 1; store.last = s.id; U.save();
    chrome(); notes();
    try { history.replaceState(null, '', '#' + (presenter ? 'presenter-' : '') + s.id); } catch (e) {}
    if (broadcast && chan) chan.postMessage({ t: 'go', id: s.id });
  }
  const go = d => show(st.i + d);
  const goId = id => { const k = SCENES.findIndex(s => s.id === id); if (k >= 0) show(k, false); };
  U.goId = id => { const k = SCENES.findIndex(s => s.id === id); if (k >= 0) show(k); };

  function renderProgress() {
    const v = SCENES.filter(s => store.visited[s.id]).length, c = SCENES.filter(s => s.check && store.checks[s.id] === true).length, n = SCENES.filter(s => s.check).length;
    const el = U.$('#progTxt'); if (el) el.textContent = `${v}/${SCENES.length} visited · ${c}/${n} checks`;
  }
  function chrome() {
    const s = SCENES[st.i];
    U.$('#crumb').textContent = (s.ch != null ? `Ch ${s.ch} · ` : '') + (s.short || s.title);
    U.$('#count').textContent = `${st.i + 1} / ${SCENES.length}`;
    U.$('#progFill').style.width = ((st.i + 1) / SCENES.length * 100) + '%';
    U.$$('#secnav button').forEach(b => b.setAttribute('aria-current', String(b.dataset.sec === s.section)));
    const kb = U.$('#btnCheck'); kb.hidden = !s.check; kb.textContent = store.checks[s.id] === true ? 'Check ✓' : 'Check';
    renderProgress();
  }
  function notes() {
    const box = U.$('#notes'); const s = SCENES[st.i]; const n = s.notes || {}; const nx = SCENES[st.i + 1];
    const P = a => (Array.isArray(a) ? a : [a]).filter(Boolean).map(x => `<p>${x}</p>`).join('');
    box.innerHTML = `<div class="meta">Scene ${st.i + 1}/${SCENES.length}${s.ch != null ? ' · Chapter ' + s.ch : ''}</div>
      <h3>${s.title}</h3>
      ${n.objective ? `<div class="nl">Teaching objective</div><p>${n.objective}</p>` : ''}
      ${n.say ? `<div class="nl">Say</div>${P(n.say)}` : ''}
      ${n.demo ? `<div class="nl">Demonstrate</div>${P(n.demo)}` : ''}
      ${n.ask ? `<div class="nl">Ask</div><p class="q">${n.ask}</p>` : ''}
      ${n.answer ? `<div class="nl">Answer to steer toward</div><p>${n.answer}</p>` : ''}
      ${s.myth ? `<div class="nl">Misconception to correct</div><p class="mis">${s.myth}</p>` : ''}
      ${n.transition ? `<div class="nl">Transition</div><p>${n.transition}</p>` : ''}
      ${nx ? `<div class="nl">Next</div><p class="meta">${nx.title}</p>` : ''}`;
  }
  function grid(open, filter) {
    const g = U.$('#grid'); g.hidden = !open; if (!open) return;
    const list = filter === 'lab' ? SCENES.filter(s => s.lab) : SCENES;
    g.innerHTML = `<div class="gh"><div><h3>${filter === 'lab' ? 'Cloud Lab' : 'All chapters'}</h3><p class="c-muted" style="margin:4px 0 0">${filter === 'lab' ? 'Every interactive experiment, available on its own.' : 'Jump anywhere. Progress is saved in this browser.'}</p></div>
      <div class="controls">${filter === 'lab' ? '<button class="btn" id="gAll">All chapters</button>' : '<button class="btn" id="gLab">Cloud Lab only</button>'}<button class="btn warn" id="gReset">Reset progress</button><button class="btn" id="gClose">Close (Esc)</button></div></div>
      <ol>${list.map(s => { const k = SCENES.indexOf(s); const em = s.ic || (U.SCENE_IC && U.SCENE_IC[s.id]); return `<li class="${k === st.i ? 'cur' : ''}"><button data-id="${s.id}">${em ? `<span class="gem" style="--c:${U.CAT[em[1]] || em[1]}">${U.icon(em[0])}</span>` : ''}<span class="gk">${s.ch != null ? 'Chapter ' + s.ch : (s.kicker || '')}${s.lab ? ' · <span class="c-cyan">lab</span>' : ''}</span><span class="gt">${s.short || s.title}</span>${s.lab ? `<span class="gl">${s.lab}</span>` : ''}<span class="gs">${store.visited[s.id] ? '<span class="c-green">visited</span>' : '<span class="c-dim">not yet</span>'}${s.check ? (store.checks[s.id] === true ? ' · <span class="c-green">check passed</span>' : ' · check') : ''}</span></button></li>`; }).join('')}</ol>
      <div class="help">← → / Space navigate · Ctrl K or / search · E Explore/Engineer · K knowledge check · N notes · G chapters · L Cloud Lab · P presenter window · F present full screen · ? all shortcuts</div>`;
    g.querySelector('#gClose').onclick = () => grid(false);
    const gl = g.querySelector('#gLab'), ga = g.querySelector('#gAll');
    if (gl) gl.onclick = () => grid(true, 'lab'); if (ga) ga.onclick = () => grid(true);
    let armed = false; const rb = g.querySelector('#gReset');
    rb.onclick = () => { if (!armed) { armed = true; rb.textContent = 'Click again to confirm'; return; } store.visited = {}; store.checks = {}; store.done = {}; U.save(); grid(true, filter); chrome(); };
    g.querySelectorAll('li button[data-id]').forEach(b => b.onclick = () => { grid(false); U.goId(b.dataset.id); });
    const first = g.querySelector('li.cur button') || g.querySelector('li button'); if (first) first.focus();
  }
  function knowledge(open) {
    const m = U.$('#kc'); const s = SCENES[st.i];
    if (!open || !s.check) { m.hidden = true; return; }
    const c = s.check; m.hidden = false;
    m.innerHTML = `<div class="kcbox" role="dialog" aria-modal="true" aria-labelledby="kcq"><div class="kicker">Knowledge check${s.ch != null ? ' · Chapter ' + s.ch : ''}</div>
      <h3 id="kcq">${c.q}</h3><div class="kco">${c.opts.map((o, i) => `<button class="kcopt" data-i="${i}">${o}</button>`).join('')}</div><div class="kcf" aria-live="polite"></div>
      <div class="controls" style="justify-content:flex-end"><button class="btn" id="kcClose">Close</button></div></div>`;
    m.querySelectorAll('.kcopt').forEach(b => b.onclick = () => {
      const i = +b.dataset.i, right = i === c.a; store.checks[s.id] = store.checks[s.id] === true ? true : right; U.save();
      m.querySelectorAll('.kcopt').forEach(x => { x.classList.remove('right', 'wrong'); if (+x.dataset.i === c.a && right) x.classList.add('right'); });
      b.classList.add(right ? 'right' : 'wrong');
      m.querySelector('.kcf').innerHTML = `<p><b class="${right ? 'c-green' : 'c-amber'}">${right ? 'Correct.' : 'Not quite — try again.'}</b> ${right ? c.why : (c.hints && c.hints[i]) || ''}</p>`;
      chrome();
    });
    m.querySelector('#kcClose').onclick = () => knowledge(false);
    m.onclick = e => { if (e.target === m) knowledge(false); };
    m.querySelector('.kcopt').focus();
  }
  function toggleNotes(v) { const n = U.$('#notes'); n.hidden = v === undefined ? !n.hidden : !v; U.$('#btnNotes').setAttribute('aria-pressed', String(!n.hidden)); }
  function present(v) {
    const on = v === undefined ? !document.body.classList.contains('present') : v;
    document.body.classList.toggle('present', on); U.$('#btnPresent').setAttribute('aria-pressed', String(on)); U.$('#btnPresent').textContent = on ? 'Exit presentation' : 'Present';
    try { if (on && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) {}
  }
  function presenterWindow() {
    let w = null; try { w = window.open(location.pathname + '#presenter-' + SCENES[st.i].id, 'cloudatlas-presenter', 'width=760,height=900'); } catch (e) {}
    if (!w) { toggleNotes(true); U.$('#notes').insertAdjacentHTML('afterbegin', '<p class="meta">This viewer blocks new windows. Open the downloaded HTML file in a browser to use a separate presenter window; notes are shown here instead.</p>'); }
  }
  U.present = present;

  function boot() {
    // scenes may declare `first: true` or `after: '<scene id>'` so new tracks can be woven into the chapter order
    const moved = SCENES.filter(s => s.first || s.after); moved.forEach(s => SCENES.splice(SCENES.indexOf(s), 1));
    moved.filter(s => s.first).reverse().forEach(s => SCENES.unshift(s));
    moved.filter(s => s.after).forEach(s => { const k = SCENES.findIndex(x => x.id === s.after); SCENES.splice(k < 0 ? SCENES.length : k + 1, 0, s); });
    U.$$('[data-cloud-b]').forEach(b => b.onclick = () => U.setCloud(b.dataset.cloudB));
    applyCloud();
    if (presenter) { document.body.classList.add('presenter'); toggleNotes(true); }
    const nav = U.$('#secnav');
    SECTIONS.forEach(([k, l]) => { const b = U.btn(nav, l, () => { if (k === 'lab') return grid(true, 'lab'); const s = SCENES.find(x => x.section === k); if (s) U.goId(s.id); }); b.dataset.sec = k; });
    U.$$('[data-mode]').forEach(b => b.onclick = () => U.setMode(b.dataset.mode));
    U.$('#prev').onclick = () => go(-1); U.$('#next').onclick = () => go(1);
    U.$('#btnNotes').onclick = () => toggleNotes();
    U.$('#btnGrid').onclick = () => grid(U.$('#grid').hidden);
    U.$('#btnCheck').onclick = () => knowledge(true);
    U.$('#btnPresent').onclick = () => present();
    U.$('#btnPres').onclick = presenterWindow;
    document.addEventListener('keydown', e => {
      const tg = e.target; const typing = tg && (tg.tagName === 'INPUT' || tg.tagName === 'SELECT' || tg.tagName === 'TEXTAREA');
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') { if (!U.$('#kc').hidden) return knowledge(false); if (!U.$('#grid').hidden) return grid(false); if (!presenter && !U.$('#notes').hidden) return toggleNotes(false); if (document.body.classList.contains('present')) present(false); return; }
      if (!U.$('#kc').hidden || !U.$('#grid').hidden) return;
      if (typing && (e.key.startsWith('Arrow') || e.key === ' ' || e.key.length === 1)) return;
      if (['ArrowRight', 'PageDown'].includes(e.key) || (e.key === ' ' && tg.tagName !== 'BUTTON')) { e.preventDefault(); go(1); }
      else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); }
      else if (e.key === 'Home') show(0); else if (e.key === 'End') show(SCENES.length - 1);
      else if (e.key === 'n' || e.key === 'N') toggleNotes();
      else if (e.key === 'g' || e.key === 'G') grid(true);
      else if (e.key === 'l' || e.key === 'L') grid(true, 'lab');
      else if (e.key === 'k' || e.key === 'K') knowledge(true);
      else if (e.key === 'e' || e.key === 'E') U.setMode(U.mode() === 'engineer' ? 'explore' : 'engineer');
      else if (e.key === 'f' || e.key === 'F') present();
      else if (e.key === 'p' || e.key === 'P') presenterWindow();
    });
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('present')) present(false); });
    if (chan) chan.onmessage = ev => { const m = ev.data || {}; if (m.t === 'go') goId(m.id); };
    window.addEventListener('hashchange', () => { const h = location.hash.replace(/^#(presenter-?)?/, ''); if (h && SCENES[st.i] && SCENES[st.i].id !== h) goId(h); });
    applyMode();
    const h = location.hash.replace(/^#(presenter-?)?/, '');
    let k = SCENES.findIndex(s => s.id === h);
    if (k < 0 && store.last) k = SCENES.findIndex(s => s.id === store.last);
    if (k < 0) k = 0;
    show(k, false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

/* Beginner track: welcome · what the cloud is · how the internet moves data · inside a data center · virtualization · history */

const gI = (name, x, y, size = 24, color = 'currentColor', sw = 1.8) => `<g transform="translate(${x},${y}) scale(${size / 24})" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" style="color:${color}">${U.IC[name] || ''}</g>`;
const cloudShape = (cx, cy, s, fill, extra = '') => `<g fill="${fill}" ${extra}><circle cx="${cx - 55 * s}" cy="${cy}" r="${28 * s}"/><circle cx="${cx - 12 * s}" cy="${cy - 24 * s}" r="${40 * s}"/><circle cx="${cx + 38 * s}" cy="${cy - 8 * s}" r="${31 * s}"/><circle cx="${cx + 66 * s}" cy="${cy + 9 * s}" r="${20 * s}"/><rect x="${cx - 80 * s}" y="${cy}" width="${166 * s}" height="${29 * s}" rx="${14 * s}"/></g>`;
const pauseIfRM = svg => { if (U.RM && svg && svg.pauseAnimations) try { svg.pauseAnimations(); } catch (e) {} };

/* ======================= WELCOME ======================= */
scene({
  id: 'welcome', first: true, section: 'basics', bare: true, kicker: 'Start here', title: 'Cloud Atlas: learn the cloud by watching it work', short: 'Welcome',
  html: `
  <div class="welcome">
    <div class="rail" style="justify-content:center;gap:16px">
      <div class="kicker">Cloud Atlas · a visual course in cloud computing</div>
      <h1 class="hero-title">Learn the cloud by <em>watching it work.</em></h1>
      <p class="hero-sub"><span id="nsc"></span> animated scenes and simulators take you from "what is a server?" to designing systems on <span class="pv aws">AWS</span>, <span class="pv azure">Microsoft Azure</span> and <span class="pv gcp">Google Cloud</span> — and running AI on them.</p>
      <div class="controls" id="cta"></div>
      <p class="c-dim" style="font-size:13.5px;margin:0">No account, credentials or install needed — every lab runs in your browser. Use the theme switch (top right) to view the course in AWS, Azure or Google Cloud colors.</p>
    </div>
    <div class="viz hero-viz"><div class="cvhost" id="sky"></div></div>
  </div>
  <div class="tracks stagger" id="tracks"></div>`,
  mount(el) {
    const W = 760, H = 500; const host = el.querySelector('#sky'); el.querySelector('#nsc').textContent = SCENES.length;
    const r = U.rng(3);
    const stars = Array.from({ length: 60 }, () => `<circle class="star" cx="${(r() * W).toFixed(0)}" cy="${(r() * 300).toFixed(0)}" r="${(r() * 1.3 + 0.3).toFixed(1)}" style="animation-delay:${(-r() * 4).toFixed(2)}s"/>`).join('');
    const isl = [
      { k: 'aws', x: 170, y: 150, s: 0.95, c1: '#FFB547', c2: '#E07B00', label: 'AWS', lc: '#FF9900' },
      { k: 'azure', x: 590, y: 120, s: 0.9, c1: '#5FD4FF', c2: '#0A6FD1', label: 'Microsoft Azure', lc: '#3AA0FF' },
      { k: 'gcp', x: 390, y: 255, s: 0.85, c1: '#8AB4FF', c2: '#2F6FE0', label: 'Google Cloud', lc: '#7aa7ff' }
    ];
    const racks = (x, y, n, seed) => { const rr = U.rng(seed); let s = ''; for (let i = 0; i < n; i++) { const rx = x + i * 20; s += `<rect x="${rx}" y="${y}" width="15" height="30" rx="2" fill="#0b1324" stroke="rgba(255,255,255,.35)" stroke-width="1"/>`; for (let j = 0; j < 4; j++) s += `<rect class="led" x="${rx + 3}" y="${y + 4 + j * 6.5}" width="9" height="2.2" rx="1" fill="${rr() > .3 ? '#5cf29a' : '#50E6FF'}" style="animation-delay:${(-rr() * 2).toFixed(2)}s;animation-duration:${(0.8 + rr() * 1.6).toFixed(2)}s"/>`; } return s; };
    const islands = isl.map((o, i) => `<g class="island" style="animation-delay:${-i * 2}s">
        <defs><linearGradient id="g-${o.k}" gradientUnits="userSpaceOnUse" x1="0" y1="${o.y - 60}" x2="0" y2="${o.y + 30}"><stop offset="0" stop-color="${o.c1}"/><stop offset="1" stop-color="${o.c2}"/></linearGradient></defs>
        <ellipse cx="${o.x}" cy="${o.y + 52}" rx="${80 * o.s}" ry="8" fill="${o.c2}" opacity=".25"/>
        ${cloudShape(o.x, o.y, o.s, `url(#g-${o.k})`)}
        ${racks(o.x - 38 * o.s, o.y - 18 * o.s, 4, 9 + i)}
        ${o.k === 'gcp' ? `<g>${['#4285F4', '#EA4335', '#FBBC04', '#34A853'].map((c, j) => `<circle cx="${o.x - 27 + j * 18}" cy="${o.y + 22}" r="4.2" fill="${c}" stroke="#fff" stroke-width="1"/>`).join('')}</g>` : ''}
        <text x="${o.x}" y="${o.y + 64}" text-anchor="middle" class="isl-l" fill="${o.lc}">${o.label}</text></g>`).join('');
    // city skyline
    let city = ''; const rc = U.rng(21); let bx = 0;
    while (bx < W) { const bw = 26 + rc() * 40, bh = 30 + rc() * 70; city += `<rect x="${bx}" y="${H - bh}" width="${bw}" height="${bh}" fill="#0f182c" stroke="#1d2a45"/>`; for (let wy = H - bh + 8; wy < H - 8; wy += 11) for (let wx = bx + 5; wx < bx + bw - 6; wx += 9) if (rc() > 0.55) city += `<rect class="win" x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="4" height="5" fill="#FBBC04" style="animation-delay:${(-rc() * 9).toFixed(1)}s"/>`; bx += bw + 3; }
    const dev = [[90, 410, 'laptop'], [250, 425, 'phone'], [470, 418, 'laptop'], [650, 428, 'phone'], [345, 432, 'cpu']];
    const devs = dev.map(([x, y, n]) => `<g class="dev"><circle cx="${x + 12}" cy="${y + 12}" r="19" fill="#0b1324" stroke="#2c3e63"/>${gI(n, x, y, 24, '#cfe0ff')}</g>`).join('');
    // request paths: device → island, plus island ↔ island backbone
    const paths = []; const col = { aws: '#FF9900', azure: '#50E6FF', gcp: '#7aa7ff' };
    dev.forEach(([x, y], i) => { const t = isl[i % 3]; const cx = (x + t.x) / 2 + (i % 2 ? 60 : -60); paths.push({ d: `M${x + 12},${y} Q${cx},${(y + t.y) / 2} ${t.x},${t.y + 30}`, c: col[t.k], dur: 2.6 + i * 0.4 }); });
    const bb = [[0, 1], [1, 2], [2, 0]].map(([a, b]) => ({ d: `M${isl[a].x},${isl[a].y - 20} Q${(isl[a].x + isl[b].x) / 2},${Math.min(isl[a].y, isl[b].y) - 90} ${isl[b].x},${isl[b].y - 20}`, c: '#ffffff', dur: 3.4, bb: true }));
    const all = paths.concat(bb);
    const pathEls = all.map((p, i) => `<path id="wp${i}" d="${p.d}" fill="none" stroke="${p.c}" stroke-opacity="${p.bb ? .18 : .22}" stroke-width="1.5" stroke-dasharray="${p.bb ? '2 6' : '4 6'}" class="wflow"/>`).join('');
    const pk = all.map((p, i) => [0, 1].map(j => `<circle r="${p.bb ? 2.6 : 3.6}" fill="${p.c}" class="wpk"><animateMotion dur="${p.dur}s" begin="${(-j * p.dur / 2 - i * .3).toFixed(2)}s" repeatCount="indefinite" ${j ? 'keyPoints="1;0" keyTimes="0;1" calcMode="linear"' : ''}><mpath href="#wp${i}"/></animateMotion></circle>`).join('')).join('');
    const drift = [[60, 60, .35, 70], [420, 40, .28, 90], [700, 220, .3, 80]].map(([x, y, s, d], i) => `<g opacity=".10"><animateTransform attributeName="transform" type="translate" values="0 0; ${i % 2 ? -40 : 40} 0; 0 0" dur="${d / 3}s" repeatCount="indefinite"/>${cloudShape(x, y, s, '#ffffff')}</g>`).join('');
    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="flow" role="img" aria-label="Illustration: devices in a city send requests to three cloud providers' data centers">
      <defs><radialGradient id="wglow" cx="50%" cy="0%" r="80%"><stop offset="0" stop-color="#1b2c55"/><stop offset="1" stop-color="#0a1020" stop-opacity="0"/></radialGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#wglow)"/>${stars}${drift}${pathEls}${islands}${pk}${city}${devs}</svg>`;
    pauseIfRM(host.querySelector('svg'));
    const cta = el.querySelector('#cta');
    U.btn(cta, `${U.icon('rocket')} Start the beginner track`, () => U.goId('what-is-cloud'), 'primary big');
    U.btn(cta, `${U.icon('globe')} Follow a web request`, () => U.goId('journey'), 'big');
    U.btn(cta, `${U.icon('cloud')} Meet AWS, Azure & GCP`, () => U.goId('big-three'), 'big');
    const T = [
      ['basics', 'rocket', 'Basics', 'What the cloud is, the internet, data centers, virtualization, history.'],
      ['explore', 'globe', 'Core chapters', 'Regions, networking, scaling, storage, security, deployment, cost.'],
      ['providers', 'cloud', 'AWS · Azure · GCP', 'The big three, a service Rosetta stone, hierarchies, your first app.'],
      ['ai', 'ai', 'AI infrastructure', 'LLM serving, GPUs, inference fleets, ML pipelines.'],
      ['studio', 'puzzle', 'Architecture Studio', 'Design systems against requirements and inject failures.'],
      ['career', 'flag', 'Careers', 'Roles, a roadmap, portfolio projects and certifications.']
    ];
    const cat = { basics: 'basics', explore: 'network', providers: 'aws', ai: 'ai', studio: 'devops', career: 'career' };
    el.querySelector('#tracks').innerHTML = T.map(([k, ic, t, d]) => { const n = SCENES.filter(s => s.section === k).length; return `<button class="card track" data-k="${k}">${U.badge(ic, cat[k])}<div><h3>${t}</h3><p>${d}</p><span class="mono c-dim" style="font-size:11.5px">${n} scene${n === 1 ? '' : 's'}</span></div></button>`; }).join('');
    el.querySelectorAll('.track').forEach(b => b.onclick = () => { const s = SCENES.find(x => x.section === b.dataset.k); if (s) U.goId(s.id); });
    return null;
  },
  notes: {
    objective: 'Set expectations: this is a hands-on, visual course, and every concept has a simulator.',
    say: ['Tonight we go from "what is a server?" all the way to running AI on the cloud.', 'Everything you will see is a working simulation running in the browser. Nothing touches a real cloud account.', 'We use three providers — AWS, Azure and Google Cloud — because the ideas are the same everywhere; only the names change.'],
    demo: ['Click the theme switch in the top bar to show AWS, Azure and Google Cloud palettes.', 'Press G for the chapter map, L for the Cloud Lab.'],
    ask: 'Who here has used "the cloud" today without thinking about it?',
    answer: 'Everyone: email, photo backup, streaming, maps and most apps run on cloud infrastructure.',
    transition: 'So what is the cloud, really?'
  }
});

/* ======================= WHAT IS THE CLOUD ======================= */
const NIST = [
  ['self', 'gear', 'On-demand self-service', 'You create servers, databases or storage yourself in minutes, through a web console or an API — no purchase order, no phone call.'],
  ['broad', 'phone', 'Broad network access', 'Everything is reached over the network with standard protocols, from laptops, phones and other servers.'],
  ['pool', 'layers', 'Resource pooling', 'The provider runs one huge pool of hardware shared by many customers ("tenants"), each isolated from the others.'],
  ['elastic', 'scale', 'Rapid elasticity', 'Capacity grows and shrinks with demand, often automatically. To you it feels nearly unlimited (within quotas).'],
  ['measured', 'clock', 'Measured service', 'Usage is metered — server-seconds, gigabytes stored, requests — and you pay for what you use.']
];
scene({
  id: 'what-is-cloud', after: 'welcome', section: 'basics', kicker: 'Basics · 1', title: 'What is "the cloud", really?', short: 'What the cloud is', ic: ['cloud', 'basics'],
  lab: 'A shared, elastic, metered pool of servers serving three customers.',
  objectives: ['Define cloud computing in one sentence', 'Recognize the five essential characteristics (NIST SP 800-145)', 'Watch pooling, elasticity and metering happen'],
  html: `
  <div class="split" style="grid-template-columns:minmax(290px,0.9fr) minmax(0,2fr)">
    <div class="rail">
      <p class="lede">The cloud is <b>computers in someone else's data center</b> that you rent over the internet — <b>on demand</b>, and <b>paid for by use</b>.</p>
      <div class="nist stagger" id="nist"></div>
      <div class="controls stack" id="ctl"></div>
      <div class="explain" id="nx" aria-live="polite"></div>
    </div>
    <div class="col">
      <div class="viz" style="min-height:360px"><div class="cvhost" id="pool"></div><div class="vtag">1 second = 1 simulated hour</div></div>
      <div class="split even" style="flex:0 0 auto;gap:12px"><div class="tiles" id="tiles"></div><div class="viz" style="min-height:120px;flex:0 0 120px"><div class="cvhost" id="spark"></div></div></div>
    </div>
  </div>`,
  notice: 'The orange squares are Pixelpost\'s servers. They appear when its users arrive and are handed back to the shared pool when they leave — and the meter only runs while they exist.',
  myth: '"The cloud" is not somewhere abstract. It is physical buildings full of servers, owned by a provider and shared by many customers.',
  mount(el, slide) {
    const k = U.tok(slide);
    const COLS = 10, ROWS = 5, N = COLS * ROWS;
    const T = [{ id: 'px', name: 'Pixelpost', c: '#FF9900' }, { id: 'shop', name: 'Shop', c: '#3AA0FF' }, { id: 'school', name: 'School', c: '#34A853' }];
    const host = el.querySelector('#pool');
    let cells = ''; for (let i = 0; i < N; i++) { const x = 500 + (i % COLS) * 37, y = 112 + Math.floor(i / COLS) * 46; cells += `<g class="slot" data-i="${i}"><rect x="${x}" y="${y}" width="31" height="38" rx="4"/><rect class="sled" x="${x + 6}" y="${y + 30}" width="19" height="3" rx="1.5"/></g>`; }
    host.innerHTML = `<svg viewBox="0 0 900 430" class="flow" role="img" aria-label="Users connect over the internet to a shared pool of servers in a provider data center">
      <g id="gBroad">${[['laptop', 40, 120], ['phone', 40, 200], ['laptop', 40, 280], ['cpu', 120, 160], ['phone', 120, 250]].map(([n, x, y]) => `<circle cx="${x + 18}" cy="${y + 18}" r="25" fill="var(--panel)" stroke="var(--line)"/>${gI(n, x + 6, y + 6, 24, 'var(--muted)')}`).join('')}<text x="95" y="345" text-anchor="middle" class="lbl">your users, anywhere</text></g>
      <g id="gNet">${cloudShape(300, 215, 0.75, 'var(--panel2)')}<text x="300" y="262" text-anchor="middle" class="lbl">the internet</text></g>
      <path id="pIn" d="M150,215 C220,215 230,215 300,215 S400,215 480,215" fill="none" stroke="var(--line)" stroke-dasharray="3 6"/>
      <g id="gPool"><rect x="480" y="58" width="404" height="300" rx="14" fill="color-mix(in srgb, var(--panel) 70%, transparent)" stroke="var(--line)"/>${gI('building', 494, 68, 20, 'var(--muted)')}<text x="522" y="83" class="lbl">provider data center · shared pool of ${N} servers</text>${cells}</g>
      <g id="gMeter"><rect x="480" y="370" width="404" height="50" rx="10" fill="var(--panel)" stroke="var(--line)"/>${gI('clock', 492, 383, 22, 'var(--muted)')}<text id="mtxt" x="522" y="400" class="lbl"></text></g>
      <g id="pk"></g>
    </svg>`;
    const svg = host.querySelector('svg'), slots = [...svg.querySelectorAll('.slot')], pkG = svg.querySelector('#pk'), pIn = svg.querySelector('#pIn'), PL = pIn.getTotalLength();
    const own = new Array(N).fill(null);
    const S = { t: 8, users: 60, spike: 0, manual: 0, hours: { px: 0, shop: 0, school: 0 }, hist: [], rate: 0.10 };
    const demand = t => {
      const h = t % 24; const day = Math.max(0, Math.sin(Math.PI * (h - 7) / 15));
      return { px: Math.max(1, (S.users / 10) * (0.35 + 0.65 * day) * (S.spike > 0 ? 2.2 : 1)) + S.manual, shop: 6 + 7 * Math.max(0, Math.sin(Math.PI * (h - 10) / 14)), school: 1 + 9 * (h >= 8 && h < 16 ? 1 : 0) };
    };
    const ctl = el.querySelector('#ctl');
    U.slider(ctl, { label: 'Pixelpost users (thousands)', min: 10, max: 160, step: 10, value: S.users, fmt: v => v + 'k' }, v => { S.users = v; });
    const cb = el.querySelector('#ctl'); const row = document.createElement('div'); row.className = 'controls'; cb.appendChild(row);
    U.btn(row, `${U.icon('rocket')} Launch campaign (traffic ×2 for 4 h)`, () => { S.spike = 4; flash('elastic'); }, 'primary');
    U.btn(row, `${U.icon('gear')} Launch 1 server yourself`, () => { S.manual++; flash('self'); });
    const nist = el.querySelector('#nist');
    nist.innerHTML = NIST.map(([id, ic, t]) => `<button class="nchip" data-id="${id}" aria-pressed="false">${U.badge(ic, 'basics', 'sm')}<span>${t}</span></button>`).join('');
    const nx = el.querySelector('#nx');
    const groups = { broad: ['gBroad', 'gNet'], pool: ['gPool'], elastic: ['gPool'], measured: ['gMeter'], self: ['gPool'] };
    function flash(id) {
      const n = NIST.find(x => x[0] === id); nist.querySelectorAll('.nchip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
      nx.innerHTML = `<h4>${n[2]}</h4><p>${n[3]}</p>`;
      ['gBroad', 'gNet', 'gPool', 'gMeter'].forEach(g => svg.querySelector('#' + g).classList.toggle('dimmed', !groups[id].includes(g)));
      clearTimeout(flash.t); flash.t = setTimeout(() => svg.querySelectorAll('.dimmed').forEach(g => g.classList.remove('dimmed')), 4500);
      S.seen = S.seen || new Set(); S.seen.add(id); if (S.seen.size >= 5) U.markDone('what-is-cloud');
    }
    nist.querySelectorAll('.nchip').forEach(b => b.onclick = () => flash(b.dataset.id));
    nx.innerHTML = `<h4>Five things make it "cloud"</h4><p>Click each characteristic to see where it shows up in the simulation. This definition comes from the U.S. National Institute of Standards and Technology (NIST SP 800-145), and is still the standard one.</p>`;
    const allocate = () => {
      const d = demand(S.t); let need = { px: Math.ceil(d.px), shop: Math.ceil(d.shop), school: Math.ceil(d.school) };
      const tot = need.px + need.shop + need.school; if (tot > N) { const f = N / tot; Object.keys(need).forEach(x => need[x] = Math.floor(need[x] * f)); }
      T.forEach(tn => { let have = own.reduce((a, o, i) => o === tn.id ? a.concat(i) : a, []); while (have.length > need[tn.id]) { const i = have.pop(); own[i] = null; } });
      T.forEach(tn => { let have = own.filter(o => o === tn.id).length; const free = own.map((o, i) => o ? -1 : i).filter(i => i >= 0); while (have < need[tn.id] && free.length) { const j = Math.floor(Math.random() * free.length); own[free.splice(j, 1)[0]] = tn.id; have++; } });
      slots.forEach((g, i) => { const o = own[i]; const tn = T.find(x => x.id === o); g.style.setProperty('--sc', tn ? tn.c : 'transparent'); g.classList.toggle('used', !!o); });
      return need;
    };
    let acc = 0, pacc = 0, need = allocate();
    const tiles = el.querySelector('#tiles');
    const sp = U.canvas(el.querySelector('#spark'), () => { const hs = S.hist; U.chart(sp, { k, x: [0, 48], y: [0, Math.max(10, ...hs.map(h => Math.max(h.d, h.a))) * 1.15], padL: 34, padB: 22, padT: 22, xTicks: 4, yTicks: 2, xFmt: v => '-' + Math.round(48 - v) + 'h', yLabel: 'Pixelpost: needed vs. running servers', series: [{ data: hs.map(h => h.d), color: k.fg, width: 1.5 }, { data: hs.map(h => h.a), color: '#FF9900', step: true, fill: U.a('#FF9900', .12) }] }); });
    const stop = U.loop(dt => {
      S.t += dt; acc += dt; pacc += dt * (S.users / 40) * (S.spike > 0 ? 2 : 1);
      if (S.spike > 0) S.spike -= dt;
      T.forEach(tn => S.hours[tn.id] += own.filter(o => o === tn.id).length * dt);
      while (pacc > 1) { pacc -= 1; if (!U.RM) { const c = U.svg('circle', { r: 3.5, fill: Math.random() < .6 ? '#FF9900' : (Math.random() < .5 ? '#3AA0FF' : '#34A853') }, pkG); c._u = 0; } }
      [...pkG.children].forEach(c => { c._u += dt * 0.9; if (c._u >= 1) return c.remove(); const p = pIn.getPointAtLength(c._u * PL); c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); });
      if (acc > 0.5) {
        acc = 0; need = allocate(); const d = demand(S.t);
        S.hist.push({ d: d.px, a: own.filter(o => o === 'px').length }); if (S.hist.length > 48) S.hist.shift(); sp.draw();
        const hr = Math.floor(S.t % 24);
        svg.querySelector('#mtxt').textContent = `${String(hr).padStart(2, '0')}:00 · server-hours used: ` + T.map(tn => `${tn.name} ${U.fmt(S.hours[tn.id])}`).join(' · ');
        U.tiles(tiles, [['Your servers now', own.filter(o => o === 'px').length, 'good', `of ${N} in the pool`], ['Pool in use', Math.round(own.filter(Boolean).length / N * 100) + '%', '', 'shared by 3 tenants'], ['Your bill so far', U.money(S.hours.px * S.rate), '', `at an illustrative $${S.rate.toFixed(2)}/server-hour`]]);
      }
    });
    return () => { stop(); sp.destroy(); clearTimeout(flash.t); };
  },
  notes: {
    objective: 'Learners can define cloud computing and point to all five NIST characteristics in a live system.',
    say: ['One sentence: someone else\'s computers, rented over the internet, on demand, paid by use.', 'Three customers share one pool. Watch the school\'s green servers appear at 8:00 and vanish at 16:00, while the shop peaks in the evening.', 'Launch a campaign: Pixelpost\'s orange squares multiply, then hand back to the pool. The meter only counts while they exist.'],
    demo: ['Click each of the five characteristics; each one highlights the part of the picture it describes.', 'Drag users to 160k to see the pool fill up.'],
    ask: 'Why can a provider offer capacity cheaper than if each customer bought for their own peak?',
    answer: 'Customers peak at different times, so the shared pool needs far less hardware than the sum of everyone\'s peaks (statistical multiplexing).',
    transition: 'Your request reaches that data center through the internet. How does data actually travel there?'
  },
  check: { q: 'The school\'s servers disappear at 16:00 and the shop\'s appear in the evening. Which characteristic does this show best?', opts: ['Broad network access', 'Resource pooling with rapid elasticity', 'Measured service only', 'On-premises hosting'], a: 1, why: 'Many tenants share one pool, and each one\'s capacity grows and shrinks with its own demand.' }
});

/* ======================= HOW THE INTERNET MOVES DATA ======================= */
const NET_N = { you: [55, 250, 'Your laptop', '192.0.2.10'], r1: [175, 250, 'Home router', '192.0.2.1'], r2: [300, 140, 'ISP router A', '198.51.100.1'], r3: [300, 360, 'ISP router B', '198.51.100.9'],
  r4: [450, 90, 'Backbone 1', ''], r5: [450, 250, 'Backbone 2', ''], r6: [450, 410, 'Backbone 3', ''], r7: [610, 160, 'Exchange point', ''], r8: [610, 340, 'Cloud edge', ''], r9: [740, 250, 'Region router', ''], srv: [855, 250, 'pixelpost.app', '203.0.113.5'] };
const NET_L = [['you', 'r1', 2], ['r1', 'r2', 6], ['r1', 'r3', 7], ['r2', 'r4', 9], ['r2', 'r5', 8], ['r3', 'r5', 8], ['r3', 'r6', 10], ['r4', 'r7', 12], ['r5', 'r7', 9], ['r5', 'r8', 11], ['r6', 'r8', 8], ['r7', 'r9', 7], ['r8', 'r9', 5], ['r9', 'srv', 1]];
scene({
  id: 'internet', after: 'what-is-cloud', section: 'basics', kicker: 'Basics · 2', title: 'How does data travel across the internet?', short: 'Packets & routing', ic: ['router', 'network'],
  lab: 'Split a message into packets, cut links, add congestion and loss; TCP reassembles it.',
  objectives: ['Explain packets, IP addresses and routers', 'See routing choose — and re-choose — a path', 'Understand how TCP fixes loss and reordering'],
  html: `
  <div class="split rev">
    <div class="col">
      <div class="viz grid" style="min-height:380px"><div class="cvhost" id="net"></div><div class="vtag">Click any link to cut or restore it</div></div>
      <div class="reasm" id="reasm" aria-label="Packets received at the server"></div>
    </div>
    <div class="rail">
      <p class="lede">Data never travels as one piece. It is cut into <b>packets</b>, each stamped with a destination <b>IP address</b>, and <b>routers</b> pass them hop by hop.</p>
      <div class="controls stack" id="ctl"></div>
      <div class="controls" id="btns"></div>
      <div class="tiles" id="tiles"></div>
      <div class="explain" id="why" aria-live="polite"></div>
      <div class="engbox eng-only"><b>Under the hood</b><p>Routers forward by longest-prefix match on the destination address and decrement each packet's TTL. Inside a network, protocols like OSPF compute shortest paths (as here, by latency); between networks, BGP exchanges reachability and policy.</p><p>TCP numbers every byte, the receiver acknowledges what arrived, and the sender retransmits after a timeout or duplicate ACKs. The addresses shown are from ranges reserved for documentation (RFC 5737).</p></div>
    </div>
  </div>`,
  notice: 'When you cut a link, the next packets take a different path. Nothing about the message changes — routing adapts underneath it.',
  myth: 'There is no single wire from you to a website. Each packet can take a different route, and some get lost; TCP makes it look reliable.',
  mount(el, slide) {
    const host = el.querySelector('#net');
    const links = NET_L.map(([a, b, ms]) => ({ a, b, ms, up: true }));
    const ids = Object.keys(NET_N);
    host.innerHTML = `<svg viewBox="0 0 910 480" class="flow" role="img" aria-label="Network of routers between your laptop and the server">
      <g id="L">${links.map((l, i) => { const A = NET_N[l.a], B = NET_N[l.b]; return `<g class="nl" data-i="${i}" tabindex="0" role="button" aria-label="Link ${A[2]} to ${B[2]}"><line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" class="nlh"/><line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" class="nlv"/><text x="${(A[0] + B[0]) / 2}" y="${(A[1] + B[1]) / 2 - 6}" class="nlt">${l.ms} ms</text></g>`; }).join('')}</g>
      <g>${ids.map(id => { const [x, y, l, ip] = NET_N[id]; const end = id === 'you' || id === 'srv'; return `<g class="nn ${end ? 'end' : ''}" data-id="${id}"><circle cx="${x}" cy="${y}" r="${end ? 26 : 20}"/>${gI(id === 'you' ? 'laptop' : id === 'srv' ? 'server' : 'router', x - (end ? 13 : 10), y - (end ? 13 : 10), end ? 26 : 20, end ? '#fff' : 'var(--muted)')}<text x="${x}" y="${y + (end ? 44 : 36)}" class="nnt">${l}</text>${ip ? `<text x="${x}" y="${y + (end ? 58 : 49)}" class="nni">${ip}</text>` : ''}</g>`; }).join('')}</g>
      <g id="P"></g></svg>`;
    const svg = host.querySelector('svg'), PG = svg.querySelector('#P');
    const O = { n: 8, loss: 0, cong: false, speed: 1 };
    const ctl = el.querySelector('#ctl');
    U.slider(ctl, { label: 'Packets in the message', min: 4, max: 16, step: 1, value: O.n }, v => O.n = v);
    U.slider(ctl, { label: 'Packet loss per hop', min: 0, max: 15, step: 1, value: 0, fmt: v => v + '%' }, v => O.loss = v);
    U.check(ctl, { label: 'Congestion (random queueing delays)' }, v => O.cong = v);
    const btns = el.querySelector('#btns');
    U.btn(btns, `${U.icon('rocket')} Send message`, () => send(), 'primary');
    U.btn(btns, 'Restore all links', () => { links.forEach(l => l.up = true); paint(); });
    const tiles = el.querySelector('#tiles'), why = el.querySelector('#why'), reasm = el.querySelector('#reasm');
    let flying = [], st = null;
    const paint = () => { svg.querySelectorAll('.nl').forEach(g => g.classList.toggle('cut', !links[+g.dataset.i].up)); const r = SIM.route(ids, links, 'you', 'srv'); svg.querySelectorAll('.nl').forEach(g => g.classList.toggle('best', !!r && r.links.includes(+g.dataset.i))); stats(); };
    svg.querySelectorAll('.nl').forEach(g => { const f = () => { const l = links[+g.dataset.i]; l.up = !l.up; paint(); why.innerHTML = `<h4>${l.up ? 'Link restored' : 'Link cut'}</h4><p>${l.up ? 'Routers learn the link is back and may prefer it again.' : 'Routers stop using this link. New packets are routed around it if any other path exists.'}</p>`; }; g.onclick = f; g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } }; });
    function stats() {
      const r = SIM.route(ids, links, 'you', 'srv');
      U.tiles(tiles, [['Best path', r ? (r.path.length - 2) + ' routers' : 'none', r ? '' : 'bad'], ['Path latency', r ? r.ms + ' ms' : '∞', r ? '' : 'bad', 'one way'],
        ['Delivered', st ? `${st.got.size}/${st.n}` : '—', st && st.got.size === st.n ? 'good' : ''], ['Retransmitted', st ? st.re : 0, st && st.re ? 'warn' : ''], ['Arrived out of order', st ? st.ooo : 0, st && st.ooo ? 'warn' : '']]);
    }
    function send() {
      const r0 = SIM.route(ids, links, 'you', 'srv');
      if (!r0) { why.innerHTML = '<h4>No route to host</h4><p>Every path to the server is cut, so routers have nowhere to send the packets. Restore a link.</p>'; return; }
      st = { n: O.n, got: new Set(), order: [], re: 0, ooo: 0, maxSeen: -1 }; flying.forEach(f => f.c.remove()); flying = [];
      reasm.innerHTML = Array.from({ length: O.n }, (_, i) => `<span class="pslot" data-i="${i}">${i + 1}</span>`).join('');
      for (let i = 0; i < O.n; i++) launch(i, i * 0.18);
      why.innerHTML = `<h4>Sending "Hello from Pixelpost!" as ${O.n} packets</h4><p>Each packet carries the destination 203.0.113.5 and a sequence number. Routers forward each packet independently along the best path they know right now.</p>`;
      stats();
    }
    function launch(i, delay, isRe) {
      const extra = O.cong ? links.map(() => Math.random() * 14) : null; const r = SIM.route(ids, links, 'you', 'srv', extra);
      if (!r) return;
      const c = U.svg('g', { class: 'pkt' + (isRe ? ' re' : '') }, PG); U.svg('circle', { r: 9 }, c); const tx = U.svg('text', { y: 4 }, c); tx.textContent = i + 1;
      flying.push({ i, c, path: r.path, links: r.links, seg: 0, u: 0, wait: delay, extra });
    }
    const stop = U.loop(dt => {
      flying = flying.filter(f => {
        if (f.wait > 0) { f.wait -= dt; f.c.style.opacity = 0; return true; } f.c.style.opacity = 1;
        const li = f.links[f.seg]; const l = links[li]; const ms = l.ms + (f.extra ? f.extra[li] : 0);
        f.u += dt * (U.RM ? 20 : 1) / (ms * 0.045 + 0.12);
        const A = NET_N[f.path[f.seg]], B = NET_N[f.path[f.seg + 1]];
        if (!l.up) { f.c.classList.add('lost'); setTimeout(() => f.c.remove(), 500); setTimeout(() => { if (st && !st.got.has(f.i)) { st.re++; launch(f.i, 0, true); stats(); } }, 900); return false; }
        if (f.u >= 1) {
          if (O.loss && Math.random() * 100 < O.loss && f.seg < f.links.length - 1) { f.c.classList.add('lost'); const cc = f.c; setTimeout(() => cc.remove(), 500); setTimeout(() => { if (st && !st.got.has(f.i)) { st.re++; launch(f.i, 0, true); stats(); } }, 1100); return false; }
          f.seg++; f.u = 0;
          if (f.seg >= f.links.length) { f.c.remove(); if (st && !st.got.has(f.i)) { if (f.i < st.maxSeen) st.ooo++; st.maxSeen = Math.max(st.maxSeen, f.i); st.got.add(f.i); const s = reasm.querySelector(`[data-i="${f.i}"]`); if (s) s.classList.add('got'); if (st.got.size === st.n) { why.innerHTML = `<h4>Message reassembled</h4><p>All ${st.n} packets arrived${st.ooo ? `, ${st.ooo} out of order` : ''}${st.re ? `, after ${st.re} retransmission${st.re > 1 ? 's' : ''}` : ''}. TCP put them back in sequence before handing the message to the web server.</p>`; U.markDone('internet'); } stats(); } return false; }
          return true;
        }
        const x = A[0] + (B[0] - A[0]) * f.u, y = A[1] + (B[1] - A[1]) * f.u; f.c.setAttribute('transform', `translate(${x},${y})`);
        return true;
      });
    });
    paint(); stats();
    why.innerHTML = '<h4>Press Send message</h4><p>Then try cutting the highlighted links, turning on congestion, or adding packet loss.</p>';
    return () => stop();
  },
  notes: {
    objective: 'Learners understand packets, addresses, routers, re-routing and TCP reliability before they meet cloud networking.',
    say: ['A message is chopped into packets. Each carries an address, like an envelope.', 'Routers only know the next hop. Cut the highlighted link and send again: the packets go around it.', 'Turn on congestion: packets take different routes and arrive out of order. Add loss: some never arrive, and TCP resends them.'],
    demo: ['Send → cut Backbone 2 → send → congestion on → loss 10% → send.'],
    ask: 'If packets can arrive out of order or not at all, why does a web page still load correctly?',
    answer: 'TCP numbers the data, acknowledges what arrived, retransmits what did not, and reorders it before the application sees it.',
    transition: 'Now let\'s follow one real request — DNS, encryption, caches and servers — all the way to a cloud application.'
  },
  check: { q: 'You cut the link the packets were using. What happens to the next message?', opts: ['It fails until the link is repaired', 'Routers send it along another available path', 'It waits in the router', 'It is sent by a different protocol'], a: 1, why: 'Routing recomputes paths around failures. Only if every path is gone does delivery fail.' }
});

/* ======================= INSIDE A DATA CENTER ======================= */
const DC_SPOTS = {
  crah: ['Cooling unit', 'Computer-room air handlers push chilled air into the space under the raised floor and pull hot air back in from the ceiling. Cooling is usually the largest power cost after the servers themselves.'],
  cold: ['Cold aisle', 'Perforated floor tiles release cold air in front of the racks. Server fans pull it through the machines from front to back.'],
  hot: ['Hot aisle', 'Server exhaust collects behind the racks and rises to the ceiling return. Keeping hot and cold air apart is one of the cheapest efficiency wins.'],
  rack: ['Racks & servers', 'Each rack holds stacked servers. Cloud providers often design their own servers and run thousands of identical ones per building.'],
  tor: ['Top-of-rack switch', 'Every rack has a network switch (violet) linking its servers to the data-center network, which connects to other buildings and the internet.'],
  ups: ['UPS & batteries', 'An uninterruptible power supply carries the load on batteries for the seconds to minutes it takes generators to start.'],
  gen: ['Generators', 'Backup generators take over during a utility outage and run until grid power returns.'],
  grid: ['Utility power', 'Power arrives from the grid at high voltage and is stepped down by transformers. Large sites often have more than one feed.'],
  net: ['Network room', 'Fiber from multiple carriers and the provider\'s own backbone lands here, linking this building to the rest of its Availability Zone, Region and the internet.'],
  sec: ['Physical security', 'Perimeter fences, guards, badge readers and cameras. In the shared responsibility model, this layer is always the provider\'s job.']
};
scene({
  id: 'datacenter', after: 'why-cloud', section: 'basics', kicker: 'Basics · 3', title: 'What is inside a cloud data center?', short: 'Inside a data center', ic: ['building', 'compute'],
  lab: 'Airflow, power and backup in a data hall; PUE under load and temperature; survive a grid outage.',
  objectives: ['Name the systems that keep servers running: power, cooling, network, security', 'Read PUE (power usage effectiveness)', 'Watch a grid outage get absorbed by UPS and generators'],
  html: `
  <div class="split rev" style="grid-template-columns:minmax(0,2.3fr) minmax(270px,1fr)">
    <div class="col">
      <div class="viz" style="min-height:420px"><div class="cvhost" id="dc"></div><div class="vtag">Cross-section of a data hall · click the numbered markers</div></div>
    </div>
    <div class="rail">
      <p class="lede">A Region is made of Availability Zones; each AZ is one or more buildings like this one. Four systems keep it alive: <b>power</b>, <b>cooling</b>, <b>network</b>, <b>security</b>.</p>
      <div class="controls stack" id="ctl"></div>
      <div class="controls" id="btns"></div>
      <div class="tiles" id="tiles"></div>
      <div class="explain" id="spot" aria-live="polite"></div>
      <div class="engbox eng-only"><b>Model (illustrative)</b><p>PUE = total facility power ÷ IT power. Cooling = IT × (0.12 + 0.015 × max(0, T − 18 °C)), × 0.45 with free (outside-air) cooling below 22 °C. Losses = 3% of IT + 2% of capacity as fixed overhead. Real facilities vary widely; providers publish their own fleet figures.</p></div>
    </div>
  </div>`,
  notice: 'Raise the IT load and the fans spin faster and more servers light up — but PUE improves, because fixed overhead is spread over more useful work.',
  myth: 'Data centers are not just rooms of computers. Power, cooling and backup equipment can take as much space as the servers.',
  mount(el) {
    const host = el.querySelector('#dc');
    const RX = [200, 330, 520, 650], RW = 70, RT = 150, RB = 440, U_N = 11;
    let units = '';
    RX.forEach((x, ri) => { units += `<rect x="${x}" y="${RT - 10}" width="${RW}" height="${RB - RT + 10}" rx="4" class="dcrack"/>`; units += `<rect x="${x + 5}" y="${RT - 4}" width="${RW - 10}" height="14" rx="2" class="dctor"/>`; for (let j = 0; j < U_N; j++) { const y = RT + 16 + j * 24; units += `<rect x="${x + 5}" y="${y}" width="${RW - 10}" height="19" rx="2" class="dcu"/><circle class="dcled" data-r="${ri}" data-j="${j}" cx="${x + (ri % 2 ? RW - 12 : 12)}" cy="${y + 9.5}" r="2.6"/><path d="M${x + 22} ${y + 9.5}h${RW - 44}" class="dcvent"/>`; } });
    const spot = (id, x, y, n) => `<g class="dcspot" data-s="${id}" tabindex="0" role="button" aria-label="${DC_SPOTS[id][0]}"><circle cx="${x}" cy="${y}" r="12"/><text x="${x}" y="${y + 4.5}">${n}</text></g>`;
    const box = (x, y, w, h, ic, l, cls = '') => `<g class="dcbox ${cls}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>${gI(ic, x + 10, y + h / 2 - 10, 20, 'currentColor')}<text x="${x + 38}" y="${y + h / 2 + 5}">${l}</text></g>`;
    host.innerHTML = `<svg viewBox="0 0 1000 560" class="flow dcsvg" role="img" aria-label="Data center cross-section with cooling, racks, power and network">
      <rect x="140" y="40" width="660" height="44" class="dcplen"/><text x="470" y="66" class="dclab" text-anchor="middle">ceiling return · hot air back to cooling</text>
      <rect x="20" y="440" width="780" height="60" class="dcfloor"/><text x="470" y="490" class="dclab" text-anchor="middle">raised floor · cold air supply</text>
      <rect x="270" y="436" width="60" height="7" class="dctile"/><rect x="590" y="436" width="60" height="7" class="dctile"/>
      <rect x="30" y="110" width="100" height="330" rx="8" class="dccrah"/><text x="80" y="134" class="dclab" text-anchor="middle">cooling unit</text>
      <g id="fan1" class="dcfan">${gI('fan', 55, 160, 50, '#50E6FF', 1.6)}</g><g id="fan2" class="dcfan">${gI('fan', 55, 330, 50, '#50E6FF', 1.6)}</g>
      <path d="M45 240h70M45 255h70M45 270h70M45 285h70" stroke="#50E6FF" stroke-opacity=".35"/>
      ${units}
      <text x="300" y="132" class="dclab cold" text-anchor="middle">cold aisle</text><text x="620" y="132" class="dclab cold" text-anchor="middle">cold aisle</text><text x="460" y="132" class="dclab hot" text-anchor="middle">hot aisle</text>
      <path id="pbus" d="M830 245 H812 V100 H235 M365 100 V140 M555 100 V140 M685 100 V140 M235 100 V140" class="dcpow"/>
      <path id="nbus" d="M830 470 H815 V118 H700 M235 118 H700 M235 118 V146 M365 118 V146 M555 118 V146 M685 118 V146" class="dcnet"/>
      <path id="gline" d="M905 310 V275" class="dcgen"/>
      ${box(830, 40, 150, 46, 'bolt', 'Utility grid', 'grid')}${box(830, 120, 150, 46, 'plug', 'Transformer')}${box(830, 222, 150, 52, 'cache', 'UPS · batteries', 'ups')}${box(830, 310, 150, 46, 'gear', 'Generators', 'gen')}${box(830, 446, 150, 48, 'router', 'Network room', 'net')}
      <rect x="840" y="262" width="130" height="5" rx="2.5" class="batbg"/><rect id="bat" x="840" y="262" width="130" height="5" rx="2.5" class="bat"/>
      <path d="M905 86 V120 M905 166 V222" class="dcpow"/>
      <g class="dcdoor"><rect x="150" y="372" width="34" height="66" rx="3"/><circle cx="178" cy="406" r="2.5"/>${gI('lock', 155, 344, 22, 'var(--muted)')}</g>
      <g id="air"></g><g id="pw"></g>
      ${spot('crah', 80, 100, 1)}${spot('cold', 300, 410, 2)}${spot('hot', 460, 410, 3)}${spot('rack', 235, 290, 4)}${spot('tor', 395, 147, 5)}${spot('ups', 990, 222, 6)}${spot('gen', 990, 310, 7)}${spot('grid', 990, 40, 8)}${spot('net', 990, 446, 9)}${spot('sec', 167, 330, 10)}
    </svg>`;
    const svg = host.querySelector('svg'); pauseIfRM(svg);
    const air = svg.querySelector('#air'), pw = svg.querySelector('#pw');
    const P = { load: 60, tempC: 25, freeCool: false };
    const cold = [[[80, 425], [80, 470], [300, 470], [300, 420], [300, 290], [272, 290]], [[80, 425], [80, 470], [300, 470], [300, 420], [300, 250], [328, 250]], [[80, 425], [80, 475], [620, 475], [620, 420], [620, 300], [592, 300]], [[80, 425], [80, 475], [620, 475], [620, 420], [620, 230], [648, 230]]];
    const hot = [[[400, 300], [460, 300], [460, 62], [80, 62], [80, 112]], [[520, 260], [460, 260], [460, 62], [80, 62], [80, 112]], [[200, 280], [170, 280], [170, 62], [80, 62], [80, 112]], [[720, 280], [760, 280], [760, 62], [80, 62], [80, 112]]];
    const plen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
    const at = (pts, d) => { for (let i = 1; i < pts.length; i++) { const s = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (d <= s) { const u = d / s; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u]; } d -= s; } return pts[pts.length - 1]; };
    let parts = [], acc = 0, fanA = 0;
    const out = { st: 'normal', t: 0, bat: 1 };
    const btns = el.querySelector('#btns');
    const bOut = U.btn(btns, `${U.icon('bolt')} Simulate grid outage`, () => { if (out.st === 'normal') { out.st = 'ups'; out.t = 0; bOut.disabled = true; spotInfo('ups'); } }, 'warn');
    const ctl = el.querySelector('#ctl');
    U.slider(ctl, { label: 'IT load', min: 10, max: 100, step: 5, value: P.load, fmt: v => v + '%' }, v => { P.load = v; calc(); });
    U.slider(ctl, { label: 'Outside temperature', min: -5, max: 40, step: 1, value: P.tempC, fmt: v => v + ' °C' }, v => { P.tempC = v; calc(); });
    U.check(ctl, { label: 'Free cooling (use cold outside air)' }, v => { P.freeCool = v; calc(); });
    const tiles = el.querySelector('#tiles'); let R;
    function calc() {
      R = SIM.datacenter(P);
      U.tiles(tiles, [['IT power', U.fmt(R.it) + ' kW', ''], ['Cooling', U.fmt(R.cooling) + ' kW', ''], ['Other losses', U.fmt(R.losses) + ' kW', ''], ['PUE', R.pue.toFixed(2), R.pue < 1.3 ? 'good' : R.pue > 1.6 ? 'warn' : '', '1.00 would be perfect']]);
      svg.querySelectorAll('.dcled').forEach(l => { const on = ((+l.dataset.j * 7 + +l.dataset.r * 3) % 11) / 11 < P.load / 100; l.classList.toggle('on', on); l.style.animationDuration = (0.4 + Math.random() * 1.2).toFixed(2) + 's'; });
    }
    function spotInfo(id) { const [t, d] = DC_SPOTS[id]; el.querySelector('#spot').innerHTML = `<h4>${t}</h4><p>${d}</p>`; svg.querySelectorAll('.dcspot').forEach(g => g.classList.toggle('sel', g.dataset.s === id)); S.seen.add(id); if (S.seen.size >= 6) U.markDone('datacenter'); }
    const S = { seen: new Set() };
    svg.querySelectorAll('.dcspot').forEach(g => { g.onclick = () => spotInfo(g.dataset.s); g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); spotInfo(g.dataset.s); } }; });
    el.querySelector('#spot').innerHTML = '<h4>Take the tour</h4><p>Click the numbered markers 1–10. Then raise the load, heat up the day, and cut the grid power.</p>';
    const pb = svg.querySelector('#pbus'), PBL = pb.getTotalLength();
    const stop = U.loop(dt => {
      const flow = 0.4 + P.load / 100;
      fanA = (fanA + dt * 360 * flow * 1.6) % 360; ['fan1', 'fan2'].forEach((f, i) => svg.querySelector('#' + f).setAttribute('transform', U.RM ? '' : `rotate(${fanA * (i ? -1 : 1)} 80 ${i ? 355 : 185})`));
      acc += dt * 24 * flow;
      while (acc > 1 && !U.RM) { acc -= 1; const isHot = Math.random() < 0.5; const set = isHot ? hot : cold; const pts = set[Math.floor(Math.random() * set.length)]; const c = U.svg('circle', { r: 3, class: isHot ? 'airh' : 'airc' }, air); parts.push({ c, pts, L: plen(pts), d: 0 }); }
      parts = parts.filter(p => { p.d += dt * 120 * flow; if (p.d >= p.L) { p.c.remove(); return false; } const [x, y] = at(p.pts, p.d); p.c.setAttribute('cx', x); p.c.setAttribute('cy', y); p.c.setAttribute('opacity', Math.min(1, (p.L - p.d) / 40)); return true; });
      // power pulses
      if (!U.RM && Math.random() < dt * 6) { const c = U.svg('circle', { r: 2.6, class: out.st === 'normal' ? 'pwr' : out.st === 'ups' ? 'pwr ups' : 'pwr gen' }, pw); c._d = 0; }
      [...pw.children].forEach(c => { c._d += dt * 260; if (c._d > PBL) return c.remove(); const p = pb.getPointAtLength(c._d); c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); });
      // outage state machine
      if (out.st !== 'normal') {
        out.t += dt;
        if (out.st === 'ups') { out.bat = Math.max(0, out.bat - dt * 0.09); if (out.t > 5) { out.st = 'gen'; out.t = 0; spotInfo('gen'); } }
        else if (out.st === 'gen') { out.bat = Math.min(1, out.bat + dt * 0.05); if (out.t > 8) { out.st = 'normal'; bOut.disabled = false; el.querySelector('#spot').innerHTML = '<h4>Grid restored</h4><p>The load moved back to utility power. The servers never noticed: the LEDs never stopped. That is the whole point of UPS + generators.</p>'; } }
      }
      svg.classList.toggle('st-ups', out.st === 'ups'); svg.classList.toggle('st-gen', out.st === 'gen');
      svg.querySelector('#bat').setAttribute('width', 130 * out.bat);
    });
    calc();
    return () => stop();
  },
  notes: {
    objective: 'Make the cloud physical: learners can name power, cooling, network and security systems and explain PUE.',
    say: ['This is a slice through a data hall. Blue is cold air coming up through the floor; red is hot exhaust going back to the cooling units.', 'PUE compares all the power the building uses with the power the servers use. 1.0 would mean zero overhead.', 'Cut the grid: batteries carry the load for seconds, generators take over, and the servers never notice.'],
    demo: ['Click markers 1–10.', 'Load 20% vs 100% (PUE improves with load). Temperature 35 °C vs 5 °C with free cooling.', 'Simulate grid outage.'],
    ask: 'Why do providers build data centers in cool climates or near cheap renewable power?',
    answer: 'Cooling and electricity are the largest running costs; cool air enables free cooling and clean power reduces cost and emissions. Latency and land also matter.',
    transition: 'One building holds tens of thousands of servers. How do many customers safely share one physical machine?'
  },
  check: { q: 'A data center uses 1,300 kW in total while its servers use 1,000 kW. What is its PUE?', opts: ['0.77', '1.3', '300', '2.3'], a: 1, why: 'PUE = total facility power ÷ IT power = 1,300 ÷ 1,000 = 1.3. The extra 300 kW is cooling and other overhead.' }
});

/* ======================= VIRTUALIZATION ======================= */
const WL = [['web', 'Web app', 2, 4, '#F28C1E'], ['api', 'Small API', 0.5, 1, '#E8478B'], ['db', 'Database', 8, 32, '#4E7BF6'], ['batch', 'Batch job', 16, 16, '#5FA829'], ['ml', 'ML notebook', 8, 64, '#A78BFA']];
scene({
  id: 'virtualization', after: 'datacenter', section: 'basics', kicker: 'Basics · 4', title: 'How do many customers share one physical server?', short: 'Virtualization', ic: ['layers', 'compute'],
  lab: 'Pack workloads onto hosts as bare metal, virtual machines or containers.',
  objectives: ['Explain hypervisors, virtual machines and containers', 'Compare density and overhead of each', 'Connect virtualization to cloud "instance types"'],
  html: `
  <div class="split" style="grid-template-columns:minmax(280px,0.85fr) minmax(0,2.2fr)">
    <div class="rail">
      <p class="lede">A <b>hypervisor</b> slices one physical server into isolated <b>virtual machines</b>. <b>Containers</b> go further and share one operating system.</p>
      <div id="mode"></div>
      <div class="controls" id="add"></div>
      <div class="tiles" id="tiles"></div>
      <div class="explain" id="why" aria-live="polite"></div>
      <div class="engbox eng-only"><b>Model (illustrative)</b><p>Each square is half a vCPU of a 64 vCPU, 256 GB host. VM mode: hypervisor reserves 2 vCPU + 8 GB per host; each VM adds a guest OS (0.25 vCPU, 1 GB). Containers: host OS 1 vCPU + 4 GB, ~0.02 vCPU + 50 MB per container. Bare metal: one workload per host. Placement is first-fit. Real overheads depend on hypervisor, OS and workload.</p></div>
    </div>
    <div class="col"><div class="viz" style="min-height:380px;overflow:auto"><div class="hosts" id="hosts"></div></div></div>
  </div>`,
  notice: 'Switch from bare metal to VMs to containers with the same workloads: the number of physical hosts drops, and utilization climbs.',
  myth: 'Containers are not "lightweight VMs". They share the host\'s kernel, which makes them faster and denser — but the isolation boundary is weaker than a VM\'s.',
  mount(el) {
    let mode = 'vm'; let list = [];
    const seed = ['web', 'web', 'web', 'api', 'api', 'db', 'batch', 'ml', 'web', 'api'];
    let uid = 0; const mk = k => { const w = WL.find(x => x[0] === k); return { id: ++uid, k, name: w[1], cpu: w[2], mem: w[3], c: w[4] }; };
    list = seed.map(mk);
    U.seg(el.querySelector('#mode'), [['metal', 'Bare metal'], ['vm', 'Virtual machines'], ['container', 'Containers']], mode, v => { mode = v; render(true); }, 'Packing mode');
    const add = el.querySelector('#add');
    WL.forEach(w => U.btn(add, `+ ${w[1]}`, () => { list.push(mk(w[0])); render(); }));
    U.btn(add, 'Clear', () => { list = []; render(); }, 'warn');
    const H = el.querySelector('#hosts'), tiles = el.querySelector('#tiles'), why = el.querySelector('#why');
    const layer = { metal: ['Hardware', 'Operating system (one customer)'], vm: ['Hardware', 'Hypervisor'], container: ['Hardware', 'Host OS + container runtime'] };
    function render(modeChange) {
      const R = SIM.pack(list, mode);
      const ov = SIM.packOverhead[mode];
      H.innerHTML = `<div class="wlegend">${WL.map(w => `<span><i style="background:${w[4]}"></i>${w[1]} · ${w[2]} vCPU · ${w[3]} GB</span>`).join('')}<span><i class="ovsw"></i>${mode === 'vm' ? 'hypervisor + guest OS' : mode === 'container' ? 'host OS + runtime' : 'OS'}</span></div><div class="hostgrid">` + R.hosts.map((h, i) => {
        const cells = []; const fixC = Math.round(ov.fixCpu * 2); for (let j = 0; j < fixC; j++) cells.push('<i class="ov"></i>');
        h.items.forEach(w => { const n = Math.max(1, Math.round(w.cpu * 2)); const o = Math.round(ov.cpu * 2); for (let j = 0; j < n; j++) cells.push(`<i style="--c:${w.c}" title="${w.name}"></i>`); for (let j = 0; j < o; j++) cells.push('<i class="ov"></i>'); });
        while (cells.length < 128) cells.push('<i class="fr"></i>');
        return `<div class="host ${modeChange ? 'flip' : ''}" style="animation-delay:${i * 40}ms"><div class="hh">${U.icon('server')} Host ${i + 1}<span class="mono c-dim">${h.items.length} workload${h.items.length === 1 ? '' : 's'}</span></div>
        <div class="waffle">${cells.slice(0, 128).join('')}</div>
        ${layer[mode].slice().reverse().map(l => `<div class="lay">${l}</div>`).join('')}
        <div class="bars"><span>CPU</span><i style="--w:${Math.min(100, h.cpu / 64 * 100)}%"></i><span>RAM</span><i style="--w:${Math.min(100, h.mem / 256 * 100)}%"></i></div></div>`; }).join('') + '</div>' || '<p class="c-muted" style="padding:20px">No workloads. Add some.</p>';
      U.tiles(tiles, [['Physical hosts', R.hosts.length, ''], ['CPU utilization', Math.round(R.util * 100) + '%', R.util > 0.6 ? 'good' : R.util < 0.3 ? 'warn' : ''], ['Overhead', `${U.fmt(R.ovCpu, 1)} vCPU · ${U.fmt(R.ovMem)} GB`, '', 'spent on OS/hypervisor']]);
      why.innerHTML = mode === 'metal' ? '<h4>Bare metal: one tenant per machine</h4><p>Each workload gets a whole server, so most of each machine sits idle. This was the norm before virtualization, and is still offered for licensing or performance needs.</p>'
        : mode === 'vm' ? '<h4>Virtual machines: strong isolation, some overhead</h4><p>The hypervisor gives every VM virtual CPUs, memory and disks, and keeps tenants apart. Each VM runs a full guest OS. A cloud "instance type" is a VM size: so many vCPUs and so much memory.</p>'
        : '<h4>Containers: share one kernel, pack densely</h4><p>Containers package an app with its libraries but share the host\'s kernel, so they start in seconds and add little overhead. In the cloud they usually run inside VMs, combining both.</p>';
      if (mode === 'container' && list.length >= 8) U.markDone('virtualization');
    }
    render();
    return null;
  },
  notes: {
    objective: 'Learners understand that cloud capacity is sliced hardware, and can contrast bare metal, VMs and containers.',
    say: ['Same ten workloads, three ways to run them. Bare metal: ten servers, mostly idle.', 'VMs: the hypervisor slices servers, each VM brings its own OS. Far fewer hosts.', 'Containers share one OS kernel: even denser and faster to start. In practice clouds run containers inside VMs.'],
    demo: ['Toggle the three modes. Add a few ML notebooks (memory-heavy) and watch RAM, not CPU, become the limit.'],
    ask: 'Why would a bank still choose a VM over a container for an untrusted workload?',
    answer: 'A VM boundary (separate kernel, hardware virtualization) is a stronger isolation layer than a shared kernel.',
    transition: 'Virtualization made renting slices of servers possible. Here is how that idea became today\'s cloud.'
  },
  check: { q: 'What does a hypervisor do?', opts: ['Speeds up the internet connection', 'Runs multiple isolated virtual machines on one physical server', 'Stores files across data centers', 'Balances traffic between Regions'], a: 1, why: 'It virtualizes CPU, memory, storage and network so several VMs — each with its own OS — share one machine safely.' }
});

/* ======================= HISTORY ======================= */
const HIST = [
  ['1961', 'idea', 'clock', 'Computing as a utility', 'Computer scientist John McCarthy suggests computing might one day be sold like electricity or water.', 'The core idea of the cloud — pay for computing as a metered service — is older than the internet.'],
  ['1960s–70s', 'idea', 'server', 'Mainframe time-sharing', 'Many users share one expensive computer through terminals, each billed for the time they use.', 'Resource pooling and measured service, decades early.'],
  ['1990s', 'web', 'building', 'Web hosting & colocation', 'Companies rent rack space or whole servers in someone else\'s data center to run websites.', 'Outsourcing the building, but still buying and managing whole machines.'],
  ['1999', 'web', 'users', 'Software as a Service', 'Salesforce sells business software through the browser on a subscription, with nothing to install.', 'SaaS made "someone else runs it" normal for business software.'],
  ['2006', 'cloud', 'bucket', 'AWS launches S3 and EC2', 'Amazon Web Services opens storage (S3, March) and virtual servers (EC2, August) to anyone with a credit card.', 'Self-service, pay-as-you-go infrastructure: the modern public cloud begins.'],
  ['2008', 'cloud', 'code', 'Google App Engine · Windows Azure announced', 'Google offers a platform to run web apps on its infrastructure; Microsoft announces Windows Azure.', 'Platform-as-a-Service arrives, and the "big three" begin to form.'],
  ['2010', 'cloud', 'cloud', 'Azure generally available', 'Windows Azure opens commercially (renamed Microsoft Azure in 2014).', 'Enterprise software vendors move into public cloud.'],
  ['2011', 'cloud', 'book', 'NIST defines cloud computing', 'NIST SP 800-145 lists five essential characteristics and the service and deployment models.', 'A shared vocabulary that is still used today.'],
  ['2013', 'cont', 'container', 'Docker · Compute Engine GA', 'Docker makes containers easy to build and ship; Google Compute Engine becomes generally available.', 'Packaging apps as portable containers takes off.'],
  ['2014', 'cont', 'fn', 'Kubernetes open-sourced · AWS Lambda', 'Google open-sources Kubernetes, drawing on its internal cluster manager; AWS announces Lambda, running code without servers.', 'Container orchestration and serverless computing are born in the same year.'],
  ['2015', 'cont', 'cluster', 'Kubernetes 1.0 & the CNCF', 'Kubernetes reaches 1.0 and is donated to the new Cloud Native Computing Foundation.', 'A vendor-neutral platform every major cloud now offers as a managed service.'],
  ['2016', 'ai', 'gpu', 'Custom AI chips', 'Google reveals its Tensor Processing Unit (TPU) for machine learning.', 'Clouds start designing their own silicon; others follow with their own accelerators and CPUs.'],
  ['2017', 'ai', 'ai', 'The Transformer', 'The paper "Attention Is All You Need" introduces the Transformer architecture.', 'The basis of today\'s large language models.'],
  ['2022', 'ai', 'ai', 'ChatGPT', 'OpenAI releases ChatGPT, built on GPT models and run on cloud GPU infrastructure.', 'Generative AI creates enormous demand for GPU capacity in the cloud.'],
  ['2023 →', 'ai', 'cloud', 'Managed generative AI everywhere', 'All three major clouds offer managed access to foundation models alongside GPU and custom-accelerator fleets.', 'Cloud infrastructure becomes AI infrastructure — the subject of Chapters 12–13.']
];
const ERAS = { idea: ['The utility idea', '#7C8DB0'], web: ['Hosting & SaaS', '#4E7BF6'], cloud: ['Public cloud', '#FF9900'], cont: ['Containers & serverless', '#14B8A6'], ai: ['The AI era', '#A78BFA'] };
scene({
  id: 'history', after: 'virtualization', section: 'basics', kicker: 'Basics · 5', title: 'How did we get from mainframes to AI clouds?', short: 'A short history', ic: ['timeline', 'basics'],
  html: `
  <div class="controls" id="eras"></div>
  <div class="tl-wrap"><div class="tline" id="tl"></div></div>
  <div class="split even" style="flex:0 0 auto"><div class="explain" id="det" aria-live="polite"></div><div class="controls" id="play" style="align-content:flex-start"></div></div>`,
  notice: 'The big ideas came first — utility computing in 1961 — and technology caught up later: the web, virtualization, then containers, then AI accelerators.',
  mount(el) {
    const tl = el.querySelector('#tl'), det = el.querySelector('#det');
    tl.innerHTML = `<div class="tl-line"><i id="tlp"></i></div>` + HIST.map((h, i) => `<button class="tl-card ${i % 2 ? 'dn' : 'up'}" data-i="${i}" style="--c:${ERAS[h[1]][1]}"><span class="tl-dot"></span><span class="tl-y mono">${h[0]}</span>${U.badge(h[2], ERAS[h[1]][1], 'sm')}<b>${h[3]}</b></button>`).join('');
    el.querySelector('#eras').innerHTML = Object.entries(ERAS).map(([k, [l, c]]) => `<span class="era" style="--c:${c}">${l}</span>`).join('');
    let cur = -1;
    const sel = (i, scroll = true) => {
      cur = i; const h = HIST[i];
      tl.querySelectorAll('.tl-card').forEach((b, j) => { b.classList.toggle('sel', j === i); b.classList.toggle('past', j <= i); });
      el.querySelector('#tlp').style.width = ((i + 0.5) / HIST.length * 100) + '%';
      det.innerHTML = `<h4><span class="mono" style="color:${ERAS[h[1]][1]}">${h[0]}</span> · ${h[3]}</h4><p>${h[4]}</p><p><b>Why it mattered:</b> ${h[5]}</p>`;
      if (scroll) { const b = tl.querySelector(`[data-i="${i}"]`); const w = el.querySelector('.tl-wrap'); w.scrollTo({ left: b.offsetLeft - w.clientWidth / 2 + b.offsetWidth / 2, behavior: U.RM ? 'auto' : 'smooth' }); }
      if (i === HIST.length - 1) U.markDone('history');
    };
    tl.querySelectorAll('.tl-card').forEach(b => b.onclick = () => { stopP(); sel(+b.dataset.i); });
    let timer = null; const pb = el.querySelector('#play');
    const bp = U.btn(pb, 'Play the timeline', () => { if (timer) return stopP(); bp.textContent = 'Pause'; const tick = () => { sel((cur + 1) % HIST.length); if (cur < HIST.length - 1) timer = setTimeout(tick, 2200); else stopP(); }; tick(); }, 'primary');
    U.btn(pb, 'Back', () => { stopP(); sel(Math.max(0, cur - 1)); }); U.btn(pb, 'Next', () => { stopP(); sel(Math.min(HIST.length - 1, cur + 1)); });
    const stopP = () => { clearTimeout(timer); timer = null; bp.textContent = 'Play the timeline'; };
    sel(4, false);
    return () => clearTimeout(timer);
  },
  notes: {
    objective: 'Give historical context so the service models and providers make sense.',
    say: ['The idea of computing as a utility is from 1961. What was missing was cheap hardware, fast networks and virtualization.', '2006 is the line: AWS sells storage and servers by the hour to anyone. Google and Microsoft follow within a few years.', '2014 gives us both Kubernetes and Lambda; 2022 turns clouds into AI factories.'],
    demo: ['Press Play; pause on 2006, 2014 and 2022.'],
    ask: 'Which earlier idea from the timeline does serverless computing most resemble?',
    answer: 'Time-sharing and the utility model: you pay only for the time your code actually runs.',
    transition: 'Back to Pixelpost: if you rent, who is responsible for what?'
  },
  check: { q: 'Which pair of launches in 2006 is usually seen as the start of the modern public cloud?', opts: ['Gmail and YouTube', 'Amazon S3 and Amazon EC2', 'Docker and Kubernetes', 'Azure and App Engine'], a: 1, why: 'AWS opened self-service, pay-as-you-go storage (S3) and virtual servers (EC2) to anyone in 2006.' }
});

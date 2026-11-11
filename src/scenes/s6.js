/* Chapter 14 (case studies) · Chapter 15 (Architecture Studio) */

scene({
  id: 'cases', section: 'studio', ch: 14, kicker: 'Real-world architecture case studies', title: 'How do these technologies work together in actual products?', short: 'Case study gallery',
  objectives: ['Read an architecture from its requirements', 'Explain why each component exists', 'Identify scaling limits, failure points, security boundaries and cost drivers'],
  html: `
  <div class="split" style="grid-template-columns:minmax(250px,0.75fr) minmax(0,2.2fr)">
    <div class="rail"><div class="controls" id="lvl"></div><div id="list" style="display:grid;gap:6px"></div></div>
    <div class="col" id="det"></div>
  </div>`,
  notice: 'Each design starts from requirements. Reveal components one at a time and say why each is needed before reading the reason.',
  myth: 'Bigger isn\'t better: a design with fewer components that meets the requirements is easier to run, secure and pay for.',
  mount(el) {
    let lvl = 0, cur = CASES[0].id, shown = 1;
    const LV = ['', 'Beginner', 'Intermediate', 'Advanced'];
    function list() { const L = el.querySelector('#list'); L.innerHTML = ''; CASES.filter(c => !lvl || c.lvl === lvl).forEach(c => { const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.style.cssText = 'text-align:left;border-radius:8px;display:flex;justify-content:space-between;gap:8px'; b.innerHTML = `<span>${c.title}</span><span class="mono c-dim" style="font-size:11px">${LV[c.lvl]}</span>`; b.setAttribute('aria-pressed', String(c.id === cur)); b.onclick = () => { cur = c.id; shown = 1; list(); det(); }; L.appendChild(b); }); }
    function det() {
      const c = CASES.find(x => x.id === cur); const D = el.querySelector('#det');
      D.innerHTML = `<div class="explain"><div class="kicker" style="color:var(--dim)">${LV[c.lvl]} · requirements</div><h4 style="font-size:20px;margin-top:4px">${c.title}</h4><ul class="list">${c.req.map(r => `<li>${r}</li>`).join('')}</ul></div>
        <div class="controls"><button class="btn primary" id="rev" type="button" ${shown >= c.comps.length ? 'disabled' : ''}>Reveal next component</button><button class="btn" id="all" type="button">Reveal all</button><span class="mono c-muted" style="font-size:12.5px">${shown}/${c.comps.length}</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:stretch">${c.comps.slice(0, shown).map(([n, w], i) => `<div class="card" style="flex:1 1 200px;border-color:${i === shown - 1 ? 'var(--cyan)' : 'var(--line)'}"><div class="kicker" style="color:var(--dim)">${i + 1}</div><h3>${n}</h3><p>${w}</p></div>`).join('<div style="align-self:center;color:var(--dim)">→</div>')}</div>
        ${shown >= c.comps.length ? `<div class="grid3">${[['How it scales', c.scale], ['Likely failure points', c.fail], ['Security boundaries', c.sec], ['Major cost drivers', c.cost], ['Alternative', c.alt]].map(([h, t]) => `<div class="card"><h3>${h}</h3><p>${t}</p></div>`).join('')}</div>` : ''}`;
      D.querySelector('#rev').onclick = () => { shown++; det(); if (shown >= c.comps.length) { U.store.done['case-' + c.id] = 1; U.save(); if (CASES.filter(x => U.store.done['case-' + x.id]).length >= 3) U.markDone('cases'); } };
      D.querySelector('#all').onclick = () => { shown = c.comps.length; det(); };
    }
    U.seg(el.querySelector('#lvl'), [['0', 'All'], ['1', 'Beginner'], ['2', 'Intermediate'], ['3', 'Advanced']], '0', v => { lvl = +v; list(); }, 'Complexity');
    list(); det();
  },
  notes: { objective: 'Learners read architectures as answers to requirements and name their failure points and cost drivers.', say: ['Pick the portfolio first: four components. Then the chatbot: same ideas — entry, compute, data, monitoring — plus retrieval and a model.', 'Before each reveal, ask the room what\'s missing.'], ask: 'Which component in the e-commerce design protects checkout from a slow email service?', answer: 'The queue: checkout only enqueues the email job, so a slow consumer can\'t slow checkout.', transition: 'Your turn: design one yourself.' },
  check: { q: 'Why does the photo-sharing design upload directly to S3 with pre-signed URLs?', opts: ['S3 is the only place photos can live', 'Large uploads skip the app servers, which stay small and cheap', 'It removes the need for authentication', 'It makes thumbnails automatically'], a: 1, why: 'The app authorizes the upload and hands out a short-lived URL; the bytes go straight to storage.' }
});

scene({
  id: 'studio', section: 'studio', ch: 15, kicker: 'Interactive Architecture Studio', title: 'Can you design an architecture that meets the brief?', short: 'Architecture Studio', lab: 'Four challenges, transparent checks, failure injection, compare designs.',
  objectives: ['Turn requirements into components and settings', 'Validate against explicit, visible checks', 'Test the design against instance and AZ failure'],
  html: `
  <div class="controls" id="chal"></div>
  <div class="split" style="grid-template-columns:minmax(270px,0.8fr) minmax(0,1.5fr) minmax(270px,0.9fr)">
    <div class="rail" style="gap:8px"><div class="explain" id="brief"></div><div id="lib" style="display:grid;gap:8px"></div></div>
    <div class="col"><div class="viz grid" style="min-height:360px"><div class="cvhost" id="canvas"></div></div><div class="controls stack" id="props"></div><div class="controls" id="acts"></div></div>
    <div class="rail" style="gap:8px"><div id="result" aria-live="polite"></div><div class="trace" id="checks" style="display:grid;gap:6px"></div><div id="fail" aria-live="polite"></div><div class="explain" id="cmp" hidden></div></div>
  </div>`,
  notice: 'Every check is listed with its reasoning. Required checks must pass; recommended ones improve the design.',
  myth: 'A design that passes today\'s brief isn\'t universally right: change the traffic, budget or compliance needs and the best design changes too.',
  mount(el) {
    let key = 'static'; const designs = U.store.studio || {}; U.store.studio = designs;
    const D = () => designs[key] || (designs[key] = SIM.studioDefaults());
    const LANES = [['edge', 'Entry & edge'], ['compute', 'Compute & models'], ['data', 'Data'], ['security', 'Security'], ['ops', 'Operations']];
    function lib() {
      const L = el.querySelector('#lib'); L.innerHTML = '';
      LANES.forEach(([lane, name]) => { const g = document.createElement('div'); g.innerHTML = `<div class="kicker" style="color:var(--dim);margin-bottom:4px">${name}</div><div class="chips"></div>`; const ch = g.querySelector('.chips');
        SIM.studioParts.filter(p => p.lane === lane).forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (['bedrock', 'sagemaker', 'gpuec2', 'vector'].includes(p.id) ? ' ai' : ''); b.title = p.aws; b.textContent = p.name; b.setAttribute('aria-pressed', String(!!D().on[p.id])); b.onclick = () => { D().on[p.id] = !D().on[p.id]; if (!D().on[p.id]) delete D().on[p.id]; update(); }; ch.appendChild(b); });
        L.appendChild(g); });
    }
    function canvas() {
      const d = D(); const host = el.querySelector('#canvas'); host.innerHTML = '';
      const on = SIM.studioParts.filter(p => d.on[p.id]); const lx = { edge: 110, compute: 330, data: 550, security: 770, ops: 770 };
      const nodes = { users: { x: 110, y: 40, label: 'Users', sub: 'internet', kind: 'client', w: 140, h: 44 } }; const cnt = {};
      on.forEach(p => { const lane = p.lane === 'ops' ? 'security' : p.lane; const i = cnt[lane] = (cnt[lane] || 0) + 1; const y = 40 + i * 68 + (p.lane === 'ops' ? 0 : 0); nodes[p.id] = { x: lx[p.lane], y: p.lane === 'ops' ? 40 + (Object.values(cnt).length, i) * 68 : y, label: p.name, sub: p.id === 'ec2' || p.id === 'ecs' ? `${p.aws.split(' ')[0]} × ${d.count} · ${d.azs} AZ` : p.id === 'rds' ? `RDS · ${d.multiAz ? 'Multi-AZ' : 'single-AZ'}${d.dbPublic ? ' · PUBLIC' : ''}` : p.aws, w: 190, h: 50, kind: ['bedrock', 'sagemaker', 'gpuec2'].includes(p.id) ? 'ai' : '' }; });
      // re-flow ops below security
      let sy = 40; on.filter(p => p.lane === 'security' || p.lane === 'ops').forEach(p => { sy += 68; nodes[p.id].y = sy; });
      const H = Math.max(420, ...Object.values(nodes).map(n => n.y + 50));
      const edges = SIM.studioEdges(d); const first = edges.find(e => e[0] === 'dns') ? [['users', 'dns']] : (['cdn', 'alb', 'apigw'].filter(x => d.on[x]).slice(0, 1).map(x => ['users', x]));
      const bounds = d.on.private ? [{ x: 225, y: 90, w: 430, h: H - 110, label: 'VPC · private subnets', kind: 'priv' }] : [];
      const F = U.flow(host, { size: [880, H], nodes, edges: first.concat(edges), boundaries: bounds, label: 'Your architecture' });
      if (d.dbPublic && d.on.rds) F.state('rds', 'bad');
      if (!on.length) { const t = U.svg('text', { x: 440, y: H / 2, class: 'lbl', 'text-anchor': 'middle' }, F.svg); t.textContent = 'Pick components from the library to start'; }
      return F;
    }
    function props() {
      const d = D(), P = el.querySelector('#props'); P.innerHTML = '';
      if (d.on.ec2 || d.on.ecs) { U.slider(P, { label: 'Servers / tasks', min: 1, max: 16, step: 1, value: d.count }, v => { d.count = v; update(false); }); U.seg(P, [['1', '1 AZ'], ['2', '2 AZs'], ['3', '3 AZs']], String(d.azs), v => { d.azs = +v; update(false); }, 'AZs'); U.check(P, { label: 'Auto Scaling', checked: d.asg }, v => { d.asg = v; update(false); }); }
      if (d.on.rds) { U.check(P, { label: 'Database Multi-AZ standby', checked: d.multiAz }, v => { d.multiAz = v; update(false); }); U.check(P, { label: 'Database publicly accessible', checked: d.dbPublic }, v => { d.dbPublic = v; update(false); }); }
      if (!P.children.length) P.innerHTML = '<p class="c-muted" style="margin:0;font-size:13.5px">Servers and databases expose settings here when you add them.</p>';
    }
    function results() {
      const r = SIM.studioCheck(key, D());
      el.querySelector('#result').innerHTML = `<div class="verdict ${r.pass ? 'ok' : 'warn'}">${r.pass ? 'Meets the required checks' : `${r.passed} of ${r.required} required checks pass`}</div><p class="c-muted" style="font-size:13px;margin:6px 0 0">Illustrative monthly cost ≈ ${U.money(r.cost)}</p>`;
      el.querySelector('#checks').innerHTML = r.checks.map(c => `<div class="${c.pass ? 'ok' : 'no'}" style="display:grid;grid-template-columns:22px 1fr;gap:6px;font-size:14px"><span class="ic mono" style="color:${c.pass ? 'var(--green)' : c.level === 'required' ? 'var(--red)' : 'var(--amber)'}">${c.pass ? '✓' : c.level === 'required' ? '✗' : '!'}</span><span><b>${c.msg}</b> <span class="c-dim mono" style="font-size:11px">${c.level}</span><br><span class="c-muted">${c.why}</span></span></div>`).join('');
      if (r.pass) { U.store.done['studio-' + key] = 1; U.save(); if (Object.keys(SIM.studioChallenges).filter(k => U.store.done['studio-' + k]).length >= 2) U.markDone('studio'); }
      return r;
    }
    function update(rebuildLib = true) { U.save(); if (rebuildLib) lib(); props(); canvas(); results(); el.querySelector('#fail').innerHTML = ''; }
    function brief() { const c = SIM.studioChallenges[key]; el.querySelector('#brief').innerHTML = `<div class="kicker" style="color:var(--dim)">Challenge</div><h4 style="margin-top:4px">${c.title}</h4><p>${c.brief}</p>`; }
    U.seg(el.querySelector('#chal'), Object.entries(SIM.studioChallenges).map(([k, v], i) => [k, `${i + 1}. ${v.title}`]), key, v => { key = v; brief(); update(); el.querySelector('#cmp').hidden = true; }, 'Challenge');
    const A = el.querySelector('#acts');
    U.btn(A, 'Fail an instance', () => { el.querySelector('#fail').innerHTML = '<div class="explain"><h4>Instance failure</h4>' + SIM.studioFail(key, D(), 'instance').map(o => `<p class="${o.k === 'good' ? 'c-green' : o.k === 'bad' ? 'c-red' : 'c-amber'}">${o.m}</p>`).join('') + '</div>'; }, 'warn');
    U.btn(A, 'Fail an AZ', () => { const o = SIM.studioFail(key, D(), 'az'); el.querySelector('#fail').innerHTML = '<div class="explain"><h4>Availability Zone failure</h4>' + (o.length ? o : [{ k: 'good', m: 'No zonal resources in this design.' }]).map(o => `<p class="${o.k === 'good' ? 'c-green' : o.k === 'bad' ? 'c-red' : 'c-amber'}">${o.m}</p>`).join('') + '</div>'; }, 'warn');
    U.btn(A, 'Save as design A', () => { U.store.studioA = { key, d: JSON.parse(JSON.stringify(D())) }; U.save(); compare(); });
    U.btn(A, 'Compare with A', compare);
    U.btn(A, 'Load example', () => { designs[key] = JSON.parse(JSON.stringify(SIM.studioExamples[key])); update(); });
    U.btn(A, 'Clear', () => { designs[key] = SIM.studioDefaults(); update(); });
    function compare() {
      const a = U.store.studioA; const box = el.querySelector('#cmp'); box.hidden = false;
      if (!a || a.key !== key) { box.innerHTML = '<h4>Compare</h4><p>Save a design as A for this challenge, change it, then compare.</p>'; return; }
      const ra = SIM.studioCheck(key, a.d), rb = SIM.studioCheck(key, D());
      const names = d => SIM.studioParts.filter(p => d.on[p.id]).map(p => p.id);
      const na = names(a.d), nb = names(D());
      box.innerHTML = `<h4>A vs current</h4><div class="tscroll"><table class="t"><tbody><tr><td>Required checks</td><td class="mono">${ra.passed}/${ra.required}</td><td class="mono">${rb.passed}/${rb.required}</td></tr><tr><td>Recommended met</td><td class="mono">${ra.checks.filter(c => c.level !== 'required' && c.pass).length}</td><td class="mono">${rb.checks.filter(c => c.level !== 'required' && c.pass).length}</td></tr><tr><td>Components</td><td class="mono">${na.length}</td><td class="mono">${nb.length}</td></tr><tr><td>Cost (illustrative)</td><td class="mono">${U.money(ra.cost)}</td><td class="mono">${U.money(rb.cost)}</td></tr></tbody></table></div><p style="margin-top:6px">Only in A: ${na.filter(x => !nb.includes(x)).join(', ') || '—'} · Only in current: ${nb.filter(x => !na.includes(x)).join(', ') || '—'}</p>`;
    }
    brief(); update();
  },
  notes: { objective: 'Learners compose architectures against explicit requirements and justify trade-offs, then test them against failure.', say: ['Challenge 1: three components meet the brief. Add a server and see the recommendation explain why it\'s unnecessary.', 'Challenge 2: tick "Database publicly accessible" and read the feedback.', 'Challenge 3: try 6 servers in 2 AZs, then fail an AZ. How many do you need?'], demo: ['Save a design as A, change the database or AZ count, and Compare.'], ask: 'For the spike challenge, why is Auto Scaling alone not enough during an AZ failure at peak?', answer: 'Replacement capacity takes minutes to launch; until then the surviving AZs must carry the load, so you need headroom or pre-scaling.', transition: 'You can design systems. How do you turn that into a career?' },
  check: { q: 'In the secure web app challenge, which setting fails a required check?', opts: ['Two AZs', 'A public database', 'Using containers', 'Adding a CDN'], a: 1, why: 'The brief says customer data must not be reachable from the internet; only the load balancer should be public.' }
});

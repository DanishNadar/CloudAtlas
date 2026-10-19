/* Chapter 16 (careers) · Reference */

scene({
  id: 'careers', section: 'career', ch: 16, kicker: 'Careers in cloud computing and AI infrastructure', title: 'How can I turn these skills into real engineering opportunities?', short: 'Career path explorer',
  objectives: ['Distinguish roles by responsibilities and skills', 'See which chapters each role builds on', 'Pick a learning order and starter projects'],
  html: `
  <div class="chips" id="roles"></div>
  <div class="split even" style="align-items:start">
    <div class="col" id="role"></div>
    <div class="col"><div class="viz auto" style="height:330px;min-height:330px"><div class="cvhost" id="net"></div></div><p class="c-muted" style="font-size:13.5px;margin:0">Job descriptions vary by employer and team; titles overlap. Use this as a map of responsibilities, not a fixed definition.</p></div>
  </div>`,
  notice: 'Roles differ by what they are accountable for — building, operating, securing, or enabling others — more than by the tools they touch.',
  myth: 'A certification does not guarantee a job. Employers look for demonstrated, hands-on understanding; certifications help structure learning and signal baseline knowledge.',
  mount(el) {
    let cur = 'cloud'; const R = el.querySelector('#roles');
    Object.entries(ROLES).forEach(([k, r]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (['mlops', 'mlinfra', 'aiplat'].includes(k) ? ' ai' : ''); b.textContent = r.t; b.dataset.k = k; b.onclick = () => { cur = k; draw(); }; R.appendChild(b); });
    const pos = {}; const keys = Object.keys(ROLES); keys.forEach((k, i) => { const a = -Math.PI / 2 + i / keys.length * 2 * Math.PI; pos[k] = [430 + 300 * Math.cos(a), 170 + 135 * Math.sin(a)]; });
    function draw() {
      R.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === cur)));
      const r = ROLES[cur];
      el.querySelector('#role').innerHTML = `<div class="explain"><h4 style="font-size:20px">${r.t}</h4><p>${r.does}</p></div>
        <div class="grid2"><div class="card"><h3>Core knowledge</h3><ul class="list">${r.know.map(x => `<li>${x}</li>`).join('')}</ul></div><div class="card"><h3>Languages & tools</h3><p>${r.lang.join(' · ')}</p><p>${r.tools.join(' · ')}</p></div>
        <div class="card"><h3>Projects that show it</h3><ul class="list">${r.proj.map(x => `<li>${x}</li>`).join('')}</ul></div><div class="card"><h3>Works with</h3><p>${r.collab}</p><p style="margin-top:6px">Related: ${r.rel.map(x => ROLES[x].t).join(', ')}</p></div></div>
        <div class="explain"><h4>Suggested learning order</h4><ol class="list" style="padding-left:20px">${r.order.map(x => `<li>${x}</li>`).join('')}</ol></div>`;
      const host = el.querySelector('#net'); host.innerHTML = '';
      const nodes = {}; keys.forEach(k => nodes[k] = { x: pos[k][0], y: pos[k][1], label: ROLES[k].t.replace('Engineer', 'Eng.').replace('Machine Learning', 'ML'), w: 168, h: 38, kind: ['mlops', 'mlinfra', 'aiplat'].includes(k) ? 'ai' : '' });
      const F = U.flow(host, { size: [860, 340], nodes, edges: r.rel.map(x => [cur, x, 'on']), onClick: id => { cur = id; draw(); }, label: 'Related roles' });
      F.state(cur, 'on'); r.rel.forEach(x => F.state(x, 'done'));
      U.store.done['role-' + cur] = 1; U.save(); if (keys.filter(k => U.store.done['role-' + k]).length >= 3) U.markDone('careers');
    }
    draw();
  },
  notes: { objective: 'Learners can describe what several cloud and AI-infrastructure roles actually do and how they relate.', say: ['Same cloud, different accountability: a DevOps engineer owns the path to production; an SRE owns reliability; a security engineer owns risk.', 'The AI roles build on everything earlier in the night: networking, scaling, monitoring — plus GPUs and data.'], ask: 'Which role would own the inference scaling lab in a real company?', answer: 'Usually ML infrastructure or an AI platform team, working with SRE for reliability.', transition: 'Here\'s a realistic path from zero to job-ready.' },
  check: { q: 'Which role is most directly accountable for SLOs, on-call and incident response?', opts: ['Data Engineer', 'Site Reliability Engineer', 'Solutions Architect', 'MLOps Engineer'], a: 1, why: 'SRE teams define reliability targets, build monitoring and lead incident response.' }
});

scene({
  id: 'roadmap', section: 'career', ch: 16, kicker: 'Learning roadmap and portfolio', title: 'What should I learn and build, in what order?', short: 'Roadmap & projects', paper: true,
  objectives: ['Follow a phased path from foundations to applications', 'Choose portfolio projects with real engineering depth', 'Understand certifications in context'],
  html: `
  <div class="split" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);align-items:start">
    <div class="col"><div id="phases" style="display:grid;gap:8px"></div></div>
    <div class="col"><div class="tabs" id="tabs"></div><div id="pane"></div></div>
  </div>`,
  notice: 'Tick items as you go — progress is saved in this browser. Depth of understanding and demonstrated projects matter more than finishing a checklist.',
  mount(el) {
    const done = U.store.road = U.store.road || {};
    const ph = el.querySelector('#phases');
    function phases() { ph.innerHTML = ''; ROADMAP.forEach(([name, items], i) => { const n = items.filter((_, j) => done[`${i}.${j}`]).length; const d = document.createElement('details'); d.className = 'card'; if (i < 2) d.open = true;
      d.innerHTML = `<summary style="cursor:pointer;display:flex;justify-content:space-between;gap:10px"><span style="font:600 16px var(--f-display)">${i + 1}. ${name}</span><span class="mono ${n === items.length ? 'c-green' : 'c-muted'}" style="font-size:12.5px">${n}/${items.length}</span></summary><div style="display:grid;gap:4px;margin-top:8px"></div>`;
      const box = d.querySelector('div'); items.forEach((it, j) => { const id = `rm-${i}-${j}`; box.insertAdjacentHTML('beforeend', `<label class="ctl chk" for="${id}" style="color:var(--fg)"><input type="checkbox" id="${id}" ${done[`${i}.${j}`] ? 'checked' : ''}><span>${it}</span></label>`); box.querySelector('#' + id).onchange = e => { done[`${i}.${j}`] = e.target.checked; U.save(); phases(); }; });
      ph.appendChild(d); }); }
    const pane = el.querySelector('#pane');
    U.tabs(el.querySelector('#tabs'), [['proj', 'Portfolio projects'], ['cert', 'Certifications']], v => {
      if (v === 'proj') pane.innerHTML = PROJECTS.map(p => `<details class="card" style="margin-top:8px"><summary style="cursor:pointer;display:flex;justify-content:space-between;gap:8px"><span style="font:600 15.5px var(--f-display)">${p.t}</span><span class="pill c-muted">${p.lvl}</span></summary><p style="margin-top:8px"><b style="color:var(--fg)">Goal.</b> ${p.goal}</p><p><b style="color:var(--fg)">Skills.</b> ${p.skills}</p><p><b style="color:var(--fg)">Done when.</b> ${p.test}</p><p><b style="color:var(--fg)">Document.</b> ${p.doc}</p><p><b style="color:var(--fg)">Present it.</b> ${p.tip}</p><p><b style="color:var(--fg)">Stages.</b> Design → minimal working version → IaC + pipeline → monitoring → failure test → write-up.</p></details>`).join('');
      else pane.innerHTML = `<div class="explain" style="margin-top:8px"><h4>Where certifications fit</h4><p>AWS offers certifications at foundational (e.g. Cloud Practitioner), associate (e.g. Solutions Architect – Associate) and professional/specialty levels. They give a structured syllabus and a recognized baseline, which can help early in a career.</p><p>They don't replace hands-on work: pair each one with a project that uses what it covers. Exam names, versions and prices change — check the official <a href="https://aws.amazon.com/certification/" target="_blank" rel="noopener" style="color:var(--blue)">AWS Certification</a> page before planning.</p></div>`;
    });
    phases();
    U.markDone('roadmap');
  },
  notes: { objective: 'Learners leave with a concrete next step and a project to start.', say: ['Foundations first: networking and Linux show up in every chapter tonight.', 'Pick one project, finish it with IaC, a pipeline and monitoring, and write up one thing that broke.'], ask: 'Which project would best show an employer you understand everything we did tonight?', answer: 'The three-tier containerized app or the RAG chatbot: both touch networking, security, scaling, deployment and monitoring.', transition: 'Keep the reference and labs for later.' }
});

scene({
  id: 'reference', section: 'reference', ch: null, kicker: 'Reference', title: 'Glossary, labs and further learning', short: 'Reference',
  html: `
  <div class="split" style="grid-template-columns:minmax(0,1.4fr) minmax(260px,1fr);align-items:start">
    <div class="col"><label class="ctl" for="q" style="width:100%"><span>Search</span><input id="q" type="search" placeholder="e.g. NAT, token, SLO" style="flex:1;background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:7px 10px"></label><div id="gl" class="tscroll"></div></div>
    <div class="rail"><div class="explain"><h4>Authoritative sources</h4><ul class="list" id="res"></ul></div>
      <div class="explain"><h4>Revisit the labs</h4><div class="chips" id="labs" style="margin-top:6px"></div></div>
      <div class="explain"><h4>About the simulations</h4><p>Every lab runs locally in your browser with simplified, documented models. None uses real AWS credentials or creates infrastructure. Numbers marked illustrative are teaching assumptions — verify prices, limits and service details in official documentation.</p></div></div>
  </div>`,
  mount(el) {
    const gl = el.querySelector('#gl'), q = el.querySelector('#q');
    const draw = () => { const t = q.value.trim().toLowerCase(); const rows = GLOSSARY.filter(([a, b]) => !t || a.toLowerCase().includes(t) || b.toLowerCase().includes(t)); gl.innerHTML = `<table class="t"><tbody>${rows.map(([a, b]) => `<tr><td style="white-space:nowrap;font-weight:600">${a}</td><td class="c-muted">${b}</td></tr>`).join('') || '<tr><td>No matches. Try a shorter term.</td></tr>'}</tbody></table>`; };
    q.addEventListener('input', draw); draw();
    el.querySelector('#res').innerHTML = RESOURCES.map(([n, u]) => `<li><a href="${u}" target="_blank" rel="noopener" style="color:var(--cyan)">${n}</a></li>`).join('');
    const labs = el.querySelector('#labs'); SCENES.filter(s => s.lab).forEach(s => { const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.textContent = s.short; b.onclick = () => U.goId(s.id); labs.appendChild(b); });
  },
  notes: { objective: 'Give learners a place to return to.', say: ['Everything tonight runs in the browser, and your progress is saved locally. Come back to any lab.'] }
});

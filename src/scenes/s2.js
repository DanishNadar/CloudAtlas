/* Chapter 4 (building blocks) · Chapter 5 (networking) */

const svcCard = id => { const s = SERVICES[id]; if (!s) return ''; return `<h4>${s.name} <span class="pill c-muted" style="margin-left:6px">${s.cat}</span></h4>
  <p><b>What it does.</b> ${s.what}</p><p><b>Problem it solves.</b> ${s.problem}</p><p class="exp-only"><b>Choose it when.</b> ${s.when}</p>
  <div class="eng-only"><p><b>Connects to.</b> ${s.connects}</p><p><b>Choose it when.</b> ${s.when}</p><p><b>What it does not do.</b> ${s.not}</p><p><b>Alternative.</b> ${s.alt}</p><p><b>Security & cost.</b> ${s.care}</p></div>`; };

scene({
  id: 'assemble', section: 'explore', ch: 4, kicker: 'The building blocks of AWS', title: 'What does a cloud application actually need?', short: 'Assemble an AWS application', lab: 'Grow an architecture as requirements change.',
  objectives: ['Map application needs to infrastructure categories before service names', 'See why each new component is introduced', 'Know what each service does — and does not do'],
  html: `
  <div class="split rev">
    <div class="col">
      <div class="controls"><div id="stage-btns" class="controls"></div></div>
      <div class="viz grid" style="min-height:380px"><div class="cvhost" id="dg"></div></div>
      <div class="controls" id="style"></div>
    </div>
    <div class="rail">
      <div class="explain" id="req" aria-live="polite"></div>
      <div class="explain" id="svc"><h4>Click any component</h4><p>Engineer mode adds connections, limits of responsibility, alternatives, security and cost notes.</p></div>
      <details class="explain"><summary style="cursor:pointer;font-weight:600">Full service catalog</summary><div id="cat" class="chips" style="margin-top:8px"></div></details>
    </div>
  </div>`,
  notice: 'Every component appears only when a requirement needs it. Click Next requirement and read the reason first.',
  myth: 'Serverless doesn\'t mean no servers exist. It means the provider runs, patches and scales them, and you pay for use rather than for idle machines.',
  mount(el, slide) {
    let style = 'serverless', stage = 0, selId = null;
    const STAGES = [
      { t: 'A static portfolio', need: 'Pixelpost starts as a landing page: HTML, CSS and images, visitors worldwide.', add: { s3: 'Files need durable storage.', cloudfront: 'Visitors are global; serve from nearby and keep the bucket private.', route53: 'People type pixelpost.app, so the name must resolve.' } },
      { t: 'Users can post photos', need: 'Now the app does things: upload, comment, like. That needs code that runs on demand.', add: s => s === 'serverless' ? { apigw: 'A front door for HTTP API calls with throttling.', lambda: 'Run code per request without servers to manage.' } : s === 'containers' ? { elb: 'Spread requests across container tasks and health-check them.', ecs: 'Run the app as containers; Fargate removes host management.' } : { elb: 'Spread requests across servers and skip unhealthy ones.', ec2: 'Virtual machines run the app with full OS control.' } },
      { t: 'Remember posts and users', need: 'Posts, comments and accounts must survive restarts and be queryable.', add: s => s === 'serverless' ? { dynamodb: 'Key-based access (user → posts) at any scale without servers.' } : { rds: 'Relational data: users, posts, follows, with joins and transactions.' } },
      { t: 'Sign-in and least privilege', need: 'Users need accounts, and each piece of code should only access what it needs.', add: { cognito: 'End-user sign-up, sign-in and tokens.', iam: 'Roles give the code temporary, scoped permissions — no hard-coded keys.' } },
      { t: 'Lock down the network', need: 'A security review asks: can anyone on the internet reach the database? Where are passwords stored?', add: s => Object.assign(s === 'serverless' ? {} : { vpc: 'Private subnets: only the load balancer is public; servers and the database are not reachable from the internet.' }, { secrets: 'Database and API credentials live outside the code, with rotation.', waf: 'Filter common web attacks before they reach the app.' }) },
      { t: 'Faster feeds', need: 'The feed is read 100× more often than it is written, and the database is getting busy.', add: { elasticache: 'Serve hot reads from memory; the database handles writes and misses.' } },
      { t: 'Know when it breaks', need: 'A user reports errors at 2 a.m. How would the team know — and what changed?', add: { cloudwatch: 'Metrics, logs and alarms for every component.', cloudtrail: 'An audit trail of every API call: who changed what.', config: 'Detects configuration drift such as a bucket made public.' } }
    ];
    const pos = { user: [70, 250], route53: [235, 80], cloudfront: [235, 250], waf: [235, 410], apigw: [430, 250], elb: [430, 250], cognito: [430, 545], lambda: [625, 250], ecs: [625, 250], ec2: [625, 250], s3: [835, 90], dynamodb: [835, 250], rds: [835, 250], elasticache: [835, 395], iam: [625, 545], secrets: [835, 545], cloudwatch: [235, 650], cloudtrail: [430, 650], config: [625, 650] };
    const label = { user: ['Users', 'browser & app'] };
    const reasons = {};
    const added = () => { const ids = {}; STAGES.slice(0, stage + 1).forEach((s, i) => { const a = typeof s.add === 'function' ? s.add(style) : s.add; Object.entries(a).forEach(([k, v]) => { ids[k] = i; reasons[k] = v; }); }); return ids; };
    const host = el.querySelector('#dg'); let F;
    function draw() {
      const ids = added(); host.innerHTML = '';
      const nodes = { user: { x: pos.user[0], y: pos.user[1], label: 'Users', sub: 'web & mobile', kind: 'client', w: 120 } };
      Object.keys(ids).filter(id => id !== 'vpc').forEach(id => { const s = SERVICES[id]; nodes[id] = { x: pos[id][0], y: pos[id][1], label: s.name.replace(/^(Amazon|AWS) /, ''), sub: s.cat, w: 160, h: 52 }; });
      const has = id => id in nodes; const e = [];
      if (has('route53')) e.push(['user', 'route53']);
      e.push(['user', 'cloudfront']); if (has('s3')) e.push(['cloudfront', 's3']);
      const entry = has('apigw') ? 'apigw' : has('elb') ? 'elb' : null; if (entry) e.push(['cloudfront', entry]);
      const comp = ['lambda', 'ecs', 'ec2'].find(has); if (entry && comp) e.push([entry, comp]);
      if (comp) ['dynamodb', 'rds', 'elasticache', 's3', 'secrets'].filter(has).forEach(t => e.push([comp, t, t === 's3' || t === 'secrets' ? 'dash' : '']));
      if (has('cognito') && entry) e.push(['cognito', entry, 'dash']); if (has('waf')) e.push(['waf', 'cloudfront', 'dash']); if (has('iam') && comp) e.push(['iam', comp, 'dash']);
      const bounds = ('vpc' in ids) ? [{ x: 345, y: 165, w: 600, h: 290, label: 'VPC · private subnets for compute and data', kind: 'priv' }] : [];
      F = U.flow(host, { size: [960, 700], nodes, edges: e, boundaries: bounds, onClick: pick, label: 'Pixelpost architecture' });
      Object.keys(ids).filter(id => id !== 'vpc').forEach(id => F.state(id, ids[id] === stage ? 'on' : 'done'));
      if (selId && F.N[selId]) F.N[selId].g.classList.add('sel');
      const S = STAGES[stage]; const now = typeof S.add === 'function' ? S.add(style) : S.add;
      el.querySelector('#req').innerHTML = `<div class="kicker" style="color:var(--dim)">Requirement ${stage + 1} of ${STAGES.length}</div><h4 style="margin-top:4px">${S.t}</h4><p>${S.need}</p><ul class="list" style="margin-top:8px">${Object.entries(now).map(([k, v]) => `<li><b>${SERVICES[k].name}</b> — ${v}</li>`).join('')}</ul>`;
      sb.forEach((b, i) => b.setAttribute('aria-pressed', String(i === stage)));
      if (stage === STAGES.length - 1) U.markDone('assemble');
    }
    function pick(id) { if (id === 'user') return; selId = id; el.querySelector('#svc').innerHTML = svcCard(id) + (reasons[id] ? `<p style="margin-top:6px"><b>Why it's here.</b> ${reasons[id]}</p>` : ''); draw(); }
    const bh = el.querySelector('#stage-btns');
    U.btn(bh, 'Previous', () => { stage = Math.max(0, stage - 1); draw(); });
    const sb = STAGES.map((s, i) => U.btn(bh, String(i + 1), () => { stage = i; draw(); }));
    U.btn(bh, 'Next requirement', () => { stage = Math.min(STAGES.length - 1, stage + 1); draw(); }, 'primary');
    U.seg(el.querySelector('#style'), [['serverless', 'Serverless'], ['containers', 'Containers'], ['vms', 'Virtual machines']], style, v => { style = v; selId = null; draw(); }, 'Compute style');
    el.querySelector('#style').insertAdjacentHTML('beforeend', '<span class="c-muted" style="font-size:13.5px">Same requirements, three valid compute styles.</span>');
    const cat = el.querySelector('#cat');
    Object.keys(SERVICES).forEach(id => { const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.textContent = SERVICES[id].name.replace(/^(Amazon|AWS) /, ''); b.onclick = () => { el.querySelector('#svc').innerHTML = svcCard(id); }; cat.appendChild(b); });
    draw();
  },
  notes: {
    objective: 'Learners connect requirements to categories (compute, storage, database, networking, security, operations) and only then to service names.',
    say: ['We start with only what a static site needs: storage, delivery and a name. No servers.', 'Each requirement adds components, and each one has a stated reason. If you can\'t say why a box exists, it shouldn\'t be there.', 'Switch compute styles: the requirements don\'t change, the trade-offs do.'],
    demo: ['Next requirement ×6, reading the reasons aloud. Click Lambda vs EC2 and compare in Engineer mode.'],
    ask: 'Why is there no load balancer in the serverless version?',
    answer: 'API Gateway is the front door and Lambda scales per request; there is no fleet of long-lived servers to balance across.',
    transition: 'We drew boxes inside a "private network". What does private actually mean?'
  },
  check: { q: 'Pixelpost needs to store millions of user photos. Which building block fits best?', opts: ['A relational database', 'Object storage (S3)', 'An EBS volume on one server', 'An in-memory cache'], a: 1, why: 'Object storage is built for large numbers of files accessed by key, at low cost and high durability. The database stores the photo\'s key and metadata.' }
});

scene({
  id: 'vpc', section: 'explore', ch: 5, kicker: 'Cloud networking visualized', title: 'How do isolated cloud resources communicate securely?', short: 'VPC packet explorer', lab: 'Routes, gateways, security groups and NACLs decide every packet.',
  objectives: ['Read route tables, internet and NAT gateways', 'Contrast stateful security groups with stateless network ACLs', 'Troubleshoot a connection hop by hop'],
  html: `
  <div class="split" style="grid-template-columns:minmax(290px,0.9fr) minmax(0,2fr)">
    <div class="rail" style="gap:10px">
      <div class="tabs" id="cfgtabs"></div>
      <div class="controls stack" id="cfg"></div>
      <div class="engbox eng-only"><b>Model & simplifications</b><p>Order of checks: route tables → internet gateway → public IP → NACL (inbound) → security group → NACL (reply). Security groups are stateful; NACLs are stateless. Only the DB subnet's NACL is configurable.</p><p>Not modeled: VPC endpoints, peering, Transit Gateway, IPv6, DNS resolution, prefix lists.</p></div>
    </div>
    <div class="col">
      <div class="controls" id="scen"></div>
      <div class="viz grid" style="min-height:380px"><div class="cvhost" id="net"></div></div>
      <div class="grid2" style="align-items:start"><div id="verdict" aria-live="polite"></div><ul class="trace" id="trace"></ul></div>
    </div>
  </div>`,
  notice: 'Every hop is evaluated. A packet fails at the first rule that doesn\'t allow it, and the reason names that rule.',
  myth: 'A public subnet does not make a resource public: it also needs a public IP and a security group that allows the traffic.',
  mount(el, slide) {
    const C = Object.assign({}, SIM.vpcDefaults); let scen = 'web', busy = false, solved = new Set();
    const host = el.querySelector('#net'); let F;
    function draw() {
      host.innerHTML = '';
      const pubApp = C.appSubnet === 'public';
      const nodes = {
        internet: { x: 70, y: 110, label: 'Internet', sub: '0.0.0.0/0', kind: 'client', w: 120 },
        igw: { x: 190, y: 250, label: 'Internet GW', sub: C.igw ? 'attached' : 'detached', w: 120, h: 48 },
        alb: { x: 360, y: 150, label: 'Load balancer', sub: 'sg-alb · public IP', w: 160 },
        nat: { x: 360, y: 380, label: 'NAT gateway', sub: C.nat ? 'elastic IP' : 'deleted', w: 160 },
        app: { x: pubApp ? 360 : 590, y: pubApp ? 260 : 260, label: 'App server', sub: `sg-app${C.appPublicIp ? ' · public IP' : ''}`, w: 160 },
        db: { x: 815, y: 260, label: 'Database', sub: 'sg-db · :5432', w: 150 }
      };
      const bounds = [
        { x: 190, y: 22, w: 740, h: 446, label: 'VPC 10.0.0.0/16', kind: 'vpc' },
        { x: 260, y: 62, w: 200, h: 390, label: 'PUBLIC 10.0.1.0/24', sub: `routes: local${C.publicDefaultRoute ? ', 0/0 → igw' : ''}`, kind: 'pub' },
        { x: 490, y: 62, w: 200, h: 390, label: 'PRIVATE 10.0.2.0/24', sub: `routes: local${C.privateDefaultRoute ? ', 0/0 → nat' : ''}`, kind: 'priv' },
        { x: 720, y: 62, w: 190, h: 390, label: 'PRIVATE 10.0.3.0/24', sub: `nacl: ${{ default: 'default', good: 'custom', noEphemeral: 'custom (no reply rule)', deny: 'deny inbound' }[C.dbNacl]}`, kind: 'priv' }
      ];
      const edges = [['internet', 'igw'], ['igw', 'alb'], ['igw', 'nat'], ['alb', 'app'], ['app', 'db'], ['app', 'nat'], ['igw', 'app', 'dash']];
      F = U.flow(host, { size: [940, 480], nodes, edges, boundaries: bounds, label: 'VPC diagram' });
      if (!C.igw) F.state('igw', 'bad'); if (!C.nat) F.state('nat', 'off');
    }
    let again = false;
    async function send() {
      if (busy) { again = true; return; } busy = true;
      const r = SIM.vpcEval(C, scen); draw();
      const tr = el.querySelector('#trace'); tr.innerHTML = '';
      el.querySelector('#verdict').innerHTML = `<div class="verdict ${r.ok ? 'ok' : 'no'}">${r.ok ? 'Connection succeeds' : 'Connection fails'}</div><p class="c-muted" style="font-size:14px;margin-top:8px">${SIM.vpcScenarios.find(s => s.id === scen).label}</p>`;
      const p = r.path;
      for (let i = 0; i < p.length - 1; i++) { F.edgeOn(p[i], p[i + 1], r.ok || i < p.length - 2 ? 'on' : 'bad'); await F.packet(p[i], p[i + 1], (!r.ok && i === p.length - 2) ? 'pk bad' : 'pk', 420); }
      if (r.ok) { F.state(p[p.length - 1], 'good'); for (let i = p.length - 1; i > 0; i--) await F.packet(p[i], p[i - 1], 'pk ret', 300); }
      else F.state(p[p.length - 1], 'bad');
      r.hops.forEach(h => { const li = document.createElement('li'); li.className = h.ok ? 'ok' : 'no'; li.innerHTML = `<span class="ic">${h.ok ? '✓' : '✗'}</span><span><b>${h.label}.</b> <span class="w">${h.why}</span></span>`; tr.appendChild(li); });
      const sc = SIM.vpcScenarios.find(s => s.id === scen); if ((r.ok ? 'allowed' : 'blocked') === sc.expect) solved.add(scen);
      if (!SIM.vpcEval(C, 'net-db').ok && SIM.vpcEval(C, 'app-db').ok && C.dbNacl !== 'default') U.markDone('vpc');
      busy = false; if (again && host.isConnected) { again = false; send(); }
    }
    const sc = el.querySelector('#scen');
    const seg = U.seg(sc, SIM.vpcScenarios.map(s => [s.id, s.label]), scen, v => { scen = v; send(); }, 'Traffic to test');
    U.btn(sc, 'Send packet', send, 'primary');
    const cfg = el.querySelector('#cfg');
    const set = (k, v) => { C[k] = v; draw(); send(); };
    const T = {
      routing: () => { U.check(cfg, { label: 'Internet gateway attached', checked: C.igw }, v => set('igw', v)); U.check(cfg, { label: 'Public route table: 0.0.0.0/0 → IGW', checked: C.publicDefaultRoute }, v => set('publicDefaultRoute', v)); U.check(cfg, { label: 'NAT gateway exists', checked: C.nat }, v => set('nat', v)); U.check(cfg, { label: 'Private route table: 0.0.0.0/0 → NAT', checked: C.privateDefaultRoute }, v => set('privateDefaultRoute', v)); },
      place: () => { U.seg(cfg, [['private', 'App in private subnet'], ['public', 'App in public subnet']], C.appSubnet, v => set('appSubnet', v)); U.check(cfg, { label: 'App server has a public IP', checked: C.appPublicIp }, v => set('appPublicIp', v)); },
      sg: () => { U.check(cfg, { label: 'sg-alb: allow 443 from 0.0.0.0/0', checked: C.sgAlb443 }, v => set('sgAlb443', v)); U.select(cfg, 'sg-app: allow 8080 from', [['alb', 'sg-alb only'], ['world', '0.0.0.0/0 (anyone)'], ['none', 'nobody']], C.sgAppFrom, v => set('sgAppFrom', v)); U.select(cfg, 'sg-db: allow 5432 from', [['app', 'sg-app only'], ['world', '0.0.0.0/0 (anyone)'], ['none', 'nobody']], C.sgDbFrom, v => set('sgDbFrom', v)); U.check(cfg, { label: 'sg-app: allow all outbound', checked: C.sgAppEgress }, v => set('sgAppEgress', v)); },
      nacl: () => { U.select(cfg, 'DB subnet NACL', [['default', 'Default (allow all)'], ['good', 'Allow 5432 in from app subnet + ephemeral out'], ['noEphemeral', 'Allow 5432 in, forgot ephemeral out'], ['deny', 'Deny all inbound']], C.dbNacl, v => set('dbNacl', v)); cfg.insertAdjacentHTML('beforeend', '<p class="c-muted" style="font-size:13.5px;margin:0">NACLs are stateless: a reply from the database leaves on a high "ephemeral" port (1024–65535) and needs its own outbound rule.</p>'); }
    };
    U.tabs(el.querySelector('#cfgtabs'), [['routing', 'Routing'], ['place', 'Placement'], ['sg', 'Security groups'], ['nacl', 'Network ACL']], v => { cfg.innerHTML = ''; T[v](); });
    U.btn(el.querySelector('#scen'), 'Reset network', () => { Object.assign(C, SIM.vpcDefaults); el.querySelector('#cfgtabs [aria-selected="true"]').click(); draw(); send(); });
    draw(); send();
  },
  notes: {
    objective: 'Learners debug reachability as a sequence of rules: route, gateway, public IP, NACL, security group, reply.',
    say: ['Defaults are a good design: only the load balancer is public. Send each of the six packets. The last two should fail, and the reason tells you which rule stopped them.', 'Try the trap: move the app to the public subnet and open its security group to anyone. Still blocked: no public IP.', 'NACL tab: pick "forgot ephemeral out". App → DB fails on the reply. Security groups would have allowed it automatically; NACLs don\'t remember connections.'],
    demo: ['Delete the NAT gateway and send "App → internet": blackhole route.', 'Set sg-db to 0.0.0.0/0 and send "Internet → database": still blocked by routing and the missing public IP — but one more mistake would expose it.'],
    ask: 'A private server can\'t download OS updates. Name three things you would check.',
    answer: 'The private route table has 0.0.0.0/0 → NAT; the NAT gateway exists in a public subnet with a route to the IGW; the instance\'s security group allows outbound.',
    transition: 'One server answered every request so far. What happens at a million users?'
  },
  check: { q: 'Security groups vs network ACLs: which statement is correct?', opts: ['Both are stateless', 'Security groups are stateful; NACLs are stateless and need explicit return rules', 'NACLs attach to instances; security groups attach to subnets', 'They are interchangeable names for the same thing'], a: 1, why: 'A security group tracks connections, so replies are allowed automatically. A NACL evaluates every packet independently at the subnet boundary.' }
});

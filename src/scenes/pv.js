/* AWS · Azure · Google Cloud: the big three · service Rosetta stone · resource hierarchies · your first app on any provider */

const PVK = ['aws', 'azure', 'gcp'];
const pvLabel = k => k === 'gcp' ? 'Google Cloud' : PROVIDERS[k].short;

// Original banner illustrations (no provider logos): retail-to-cloud conveyor, enterprise campus, global network
const PV_ART = {
  aws: `<svg viewBox="0 0 320 120" class="pvart" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="awsb" x1="0" x2="1"><stop offset="0" stop-color="#232F3E"/><stop offset="1" stop-color="#3a2a12"/></linearGradient></defs><rect width="320" height="120" fill="url(#awsb)"/>
    <rect x="0" y="86" width="190" height="8" rx="4" fill="#3d4b5f"/>${[0, 1, 2, 3, 4].map(i => `<g><animateTransform attributeName="transform" type="translate" from="${-40 + i * 46} 0" to="${6 + i * 46} 0" dur="2.4s" repeatCount="indefinite"/><rect x="0" y="62" width="26" height="24" rx="3" fill="#c98a3c" stroke="#FFB547"/><path d="M0 70h26M13 62v8" stroke="#8a5a1e"/></g>`).join('')}
    ${[0, 1, 2, 3].map(i => `<circle cx="${16 + i * 52}" cy="98" r="5" fill="#2a3646" stroke="#556"/>`).join('')}
    ${cloudShape(250, 52, 0.5, '#FF9900')}${[0, 1, 2].map(i => `<rect x="${226 + i * 15}" y="38" width="11" height="22" rx="2" fill="#232F3E"/><rect class="led" x="${228 + i * 15}" y="43" width="7" height="2" fill="#5cf29a" style="animation-delay:-${i * .4}s"/><rect class="led" x="${228 + i * 15}" y="50" width="7" height="2" fill="#5cf29a" style="animation-delay:-${i * .7}s"/>`).join('')}
    <path d="M190 88 C210 88 210 70 224 66" stroke="#FF9900" stroke-dasharray="3 4" fill="none" class="wflow"/></svg>`,
  azure: `<svg viewBox="0 0 320 120" class="pvart" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="azb" x1="0" x2="1"><stop offset="0" stop-color="#062447"/><stop offset="1" stop-color="#0a4f8f"/></linearGradient></defs><rect width="320" height="120" fill="url(#azb)"/>
    ${[[20, 40, 60, 80], [92, 22, 54, 98], [158, 54, 44, 66]].map(([x, y, w, h], b) => { let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0b2d55" stroke="#2f7fd0"/>`; for (let yy = y + 8; yy < y + h - 6; yy += 12) for (let xx = x + 7; xx < x + w - 8; xx += 12) s += `<rect class="win" x="${xx}" y="${yy}" width="6" height="6" fill="#50E6FF" style="animation-delay:-${((xx * 7 + yy * 3 + b) % 9)}s"/>`; return s; }).join('')}
    ${cloudShape(258, 50, 0.5, '#3AA0FF')}<g transform="translate(244,36)"><rect width="28" height="22" rx="4" fill="#062447" stroke="#50E6FF"/>${gI('key', 4, 1, 20, '#50E6FF')}</g>
    <path d="M205 90 C225 90 228 72 240 68" stroke="#50E6FF" stroke-dasharray="3 4" fill="none" class="wflow"/></svg>`,
  gcp: `<svg viewBox="0 0 320 120" class="pvart" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="gcb" x1="0" x2="1"><stop offset="0" stop-color="#101a33"/><stop offset="1" stop-color="#16306a"/></linearGradient></defs><rect width="320" height="120" fill="url(#gcb)"/>
    <g transform="translate(80,60)"><circle r="44" fill="#16285a" stroke="#4285F4"/><ellipse rx="44" ry="16" fill="none" stroke="#4285F4" stroke-opacity=".5"/><ellipse rx="16" ry="44" fill="none" stroke="#4285F4" stroke-opacity=".5"/>
    ${['#4285F4', '#EA4335', '#FBBC04', '#34A853'].map((c, i) => `<circle r="5" fill="${c}"><animateMotion dur="${4 + i}s" repeatCount="indefinite" path="M${-52 + i * 4},0 a${52 - i * 4},${20 + i * 6} ${i * 30} 1,1 ${104 - i * 8},0 a${52 - i * 4},${20 + i * 6} ${i * 30} 1,1 ${-104 + i * 8},0"/></circle>`).join('')}</g>
    <g transform="translate(205,30)"><rect width="60" height="60" rx="8" fill="#0f1d3d" stroke="#7aa7ff"/><rect x="16" y="16" width="28" height="28" rx="3" fill="none" stroke="#7aa7ff"/>${[0, 1, 2].map(i => `<path d="M${14 + i * 16} 0v-8M${14 + i * 16} 60v8M0 ${14 + i * 16}h-8M60 ${14 + i * 16}h8" stroke="#7aa7ff"/>`).join('')}<text x="30" y="35" text-anchor="middle" font-size="9" fill="#cfe0ff" font-family="JetBrains Mono">AI</text></g>
    <path d="M128 60 H196" stroke="#FBBC04" stroke-dasharray="3 4" class="wflow"/></svg>`
};

/* ======================= THE BIG THREE ======================= */
scene({
  id: 'big-three', after: 'global', section: 'providers', kicker: 'AWS · Azure · Google Cloud', title: 'Meet the big three cloud providers', short: 'The big three', ic: ['cloud', 'aws'],
  objectives: ['Recognize AWS, Microsoft Azure and Google Cloud and where each came from', 'Know what each is commonly chosen for', 'See that the core concepts are the same everywhere'],
  html: `
  <div class="pvcards stagger" id="cards"></div>
  <div class="split" style="grid-template-columns:minmax(0,1.6fr) minmax(260px,1fr);flex:0 0 auto">
    <div class="card" id="det" aria-live="polite"></div>
    <div class="col">
      <div class="card"><h3>${U.icon('swap')} The same ideas everywhere</h3><p>Regions and zones, virtual machines, object storage, managed databases, private networks, identity and access, monitoring, pay-as-you-go pricing. Learn the concept once; the names change.</p></div>
      <div class="card"><h3>${U.icon('check')} How teams actually choose</h3><ul class="list"><li>What the company already uses (Microsoft 365 and Entra ID, Google Workspace, existing AWS accounts)</li><li>Specific services they need, and where they are offered</li><li>Team skills, support, credits and negotiated pricing</li><li>Region locations and compliance requirements</li></ul></div>
      <p class="c-dim" style="font-size:13px;margin:0">Other public clouds include Oracle Cloud Infrastructure, IBM Cloud and Alibaba Cloud, plus GPU-focused clouds for AI workloads.</p>
    </div>
  </div>`,
  notice: 'Click a provider to compare its origins, tools and structure. Notice how often the answer is "the same concept, a different name".',
  myth: 'There is no single "best" cloud. Each of the three can run almost any workload; the right choice depends on the organization, its people and its specific needs.',
  mount(el) {
    const cards = el.querySelector('#cards'), det = el.querySelector('#det');
    cards.innerHTML = PVK.map(k => { const P = PROVIDERS[k]; return `<button class="card pvcard ${k}" data-k="${k}" style="--pc:${P.color}" aria-pressed="false">
      <div class="pvb">${PV_ART[k]}</div>
      <div class="pvh"><h3>${P.name}</h3><span class="mono">since ${P.launched}</span></div>
      <ul class="list">${P.known.map(x => `<li>${x}</li>`).join('')}</ul>
      <div class="fl">${P.flagship.map(([ic, n]) => `<span class="fchip">${U.icon(ic)}${n}</span>`).join('')}</div></button>`; }).join('');
    cards.querySelectorAll('svg').forEach(pauseIfRM);
    const seen = new Set();
    const rows = [['First services', 'first'], ['Origins', 'origin'], ['Web console', 'console'], ['Command line', 'cli'], ['Infrastructure as code', 'iac'], ['How accounts are organized', 'org'], ['Physical layout', 'zones'], ['AI platform', 'ai'], ['Custom chips', 'chips'], ['Entry-level certification', 'cert']];
    const show = k => {
      cards.querySelectorAll('.pvcard').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
      if (k === 'all') {
        det.innerHTML = `<h3>All three, side by side</h3><div class="tscroll"><table class="t pvt"><thead><tr><th></th>${PVK.map(p => `<th class="pv ${p}">${pvLabel(p)}</th>`).join('')}</tr></thead><tbody>${rows.filter(r => r[1] !== 'origin').map(([l, f]) => `<tr><th>${l}</th>${PVK.map(p => `<td>${PROVIDERS[p][f]}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      } else {
        const P = PROVIDERS[k]; seen.add(k);
        det.innerHTML = `<div class="pvdh" style="--pc:${P.color}"><h3 class="pv ${k}">${P.name}</h3><button class="btn" id="cmp">Compare all three</button></div><div class="tscroll"><table class="t"><tbody>${rows.map(([l, f]) => `<tr><th>${l}</th><td>${P[f]}</td></tr>`).join('')}</tbody></table></div>`;
        det.querySelector('#cmp').onclick = () => show('all');
        if (seen.size === 3) U.markDone('big-three');
      }
    };
    cards.querySelectorAll('.pvcard').forEach(b => b.onclick = () => show(b.dataset.k));
    show(U.cloud() === 'multi' ? 'aws' : U.cloud());
    U.onCloud(c => { if (c !== 'multi') show(c); });
    return null;
  },
  notes: {
    objective: 'Learners can describe each of the big three fairly and know the concepts transfer between them.',
    say: ['AWS started it in 2006 and has the broadest catalog. Azure grew from Microsoft\'s enterprise world: identity, Windows, Office. Google Cloud exposes Google\'s own infrastructure: its network, data systems and AI.', 'All three run regions and zones, VMs, storage, databases, networks and identity. Once you know one, the second one is mostly vocabulary.', 'Companies usually choose based on what they already use, the people they have, and specific services — not a ranking.'],
    demo: ['Click each provider, then Compare all three.', 'Switch the theme in the top bar; this scene follows it.'],
    ask: 'Your company signs in to everything with Microsoft accounts and runs SQL Server. Which cloud would its IT team likely look at first, and why?',
    answer: 'Azure, because of identity integration (Entra ID), licensing and existing skills — but that is a starting point, not a rule.',
    transition: 'If the ideas are the same, we need a translator between names.'
  },
  check: { q: 'Which statement about AWS, Azure and Google Cloud is most accurate?', opts: ['Only AWS has Regions', 'They share the same core concepts under different service names', 'Azure only runs Windows', 'Google Cloud has no virtual machines'], a: 1, why: 'All three offer Regions and zones, VMs, storage, databases, networking and IAM. Names and details differ.' }
});

/* ======================= ROSETTA STONE ======================= */
const GAME = [
  ['EC2', 'aws', 'Virtual machines'], ['Lambda', 'aws', 'Serverless functions'], ['S3', 'aws', 'Object storage'], ['DynamoDB', 'aws', 'NoSQL database'], ['Route 53', 'aws', 'DNS'], ['CloudFront', 'aws', 'CDN'], ['CloudWatch', 'aws', 'Monitoring'], ['CloudTrail', 'aws', 'Audit log'], ['Redshift', 'aws', 'Data warehouse'], ['SQS', 'aws', 'Message queue'], ['Bedrock', 'aws', 'Foundation models'], ['EKS', 'aws', 'Managed Kubernetes'], ['Aurora', 'aws', 'Relational database'], ['Kinesis', 'aws', 'Event streaming'],
  ['Cosmos DB', 'azure', 'NoSQL database'], ['Blob Storage', 'azure', 'Object storage'], ['Entra ID', 'azure', 'Identity'], ['Key Vault', 'azure', 'Secrets & keys'], ['AKS', 'azure', 'Managed Kubernetes'], ['Container Apps', 'azure', 'Serverless containers'], ['Front Door', 'azure', 'CDN'], ['Service Bus', 'azure', 'Message queue'], ['Event Hubs', 'azure', 'Event streaming'], ['Bicep', 'azure', 'Infrastructure as code'], ['Logic Apps', 'azure', 'Workflow orchestration'], ['ExpressRoute', 'azure', 'Private connection'], ['Foundry', 'azure', 'Foundation models'], ['Virtual Network (VNet)', 'azure', 'Private network'],
  ['BigQuery', 'gcp', 'Data warehouse'], ['Compute Engine', 'gcp', 'Virtual machines'], ['GKE', 'gcp', 'Managed Kubernetes'], ['Cloud Run', 'gcp', 'Serverless containers'], ['Firestore', 'gcp', 'NoSQL document database'], ['Bigtable', 'gcp', 'Wide-column NoSQL'], ['Spanner', 'gcp', 'Globally distributed SQL'], ['Pub/Sub', 'gcp', 'Messaging'], ['Vertex AI', 'gcp', 'ML platform'], ['Memorystore', 'gcp', 'In-memory cache'], ['AlloyDB', 'gcp', 'PostgreSQL-compatible database'], ['Cloud Interconnect', 'gcp', 'Private connection'], ['Cloud TPU', 'gcp', 'AI accelerators']
];
scene({
  id: 'rosetta', after: 'big-three', section: 'providers', kicker: 'AWS · Azure · Google Cloud', title: 'One idea, three names: the cloud Rosetta stone', short: 'Service Rosetta stone', ic: ['swap', 'azure'],
  lab: 'Translate 34 cloud concepts across providers, then test yourself in the name game.',
  objectives: ['Map common services between AWS, Azure and Google Cloud', 'Describe each service by what it does, not its brand name', 'Recognize provider service names quickly'],
  html: `
  <div class="split rev" style="grid-template-columns:minmax(0,2.1fr) minmax(270px,0.9fr)">
    <div class="col">
      <div class="controls"><div class="chips" id="cats"></div><label class="ctl"><span class="sr">Search</span>${U.icon('search')}<input class="sel" id="q" type="search" placeholder="Search: queue, S3, Cosmos…" style="width:200px"></label></div>
      <div class="viz auto" style="overflow:auto;max-height:62vh"><div class="tscroll"><table class="t ros"><thead><tr><th>Concept</th><th class="pv aws">AWS</th><th class="pv azure">Azure</th><th class="pv gcp">Google Cloud</th></tr></thead><tbody id="rows"></tbody></table></div></div>
      <p class="c-dim" style="font-size:12.5px;margin:0">Checked against Google Cloud's AWS/Azure comparison page, October 2026. Mappings are approximate: equivalent services differ in features and limits.</p>
    </div>
    <div class="rail">
      <div class="card game" id="game"></div>
      <div class="engbox eng-only"><b>Why mappings are approximate</b><p>"Equivalent" services can differ in consistency model, scaling unit, pricing dimensions and limits. For example DynamoDB, Cosmos DB and Firestore are all NoSQL, but they differ in data model, consistency options and query features. Read the docs before porting.</p></div>
    </div>
  </div>`,
  notice: 'Read each row left to right: the concept in plain words first, then three brand names for it.',
  mount(el) {
    const cats = ['All', ...new Set(ROSETTA.map(r => r[0]))]; let cat = 'All', q = '';
    const chips = el.querySelector('#cats');
    chips.innerHTML = cats.map(c => `<button class="chip" data-c="${c}" aria-pressed="${c === cat}">${c}</button>`).join('');
    chips.querySelectorAll('.chip').forEach(b => b.onclick = () => { cat = b.dataset.c; chips.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); });
    const catIc = { Compute: 'compute', Storage: 'storage', Databases: 'database', Networking: 'network', Security: 'security', Operations: 'mgmt', Integration: 'integration', 'AI / ML': 'ai' };
    const tb = el.querySelector('#rows');
    const draw = () => {
      const ql = q.toLowerCase(); const lens = U.cloud();
      const list = ROSETTA.filter(r => (cat === 'All' || r[0] === cat) && (!ql || r.join(' ').toLowerCase().includes(ql)));
      tb.innerHTML = list.map((r, i) => `<tr style="animation-delay:${Math.min(i, 12) * 25}ms"><td><div class="rc">${U.badge(r[1], catIc[r[0]], 'sm')}<div><b>${r[2]}</b><div class="c-dim" style="font-size:12.5px">${r[3]}</div></div></div></td>${[4, 5, 6].map((j, n) => `<td class="${lens === PVK[n] ? 'lens' : ''}">${r[j]}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="4" class="c-muted">No matches.</td></tr>';
    };
    el.querySelector('#q').addEventListener('input', e => { q = e.target.value; draw(); });
    U.onCloud(draw); draw();
    // name game
    const G = el.querySelector('#game'); const S = { streak: 0, best: 0, n: 0, right: 0 }; let cur;
    const next = () => {
      cur = GAME[Math.floor(Math.random() * GAME.length)];
      G.innerHTML = `<div class="kicker">The name game</div><h3 style="margin-top:6px">Which provider offers…</h3><div class="gname">${cur[0]}</div>
        <div class="gbtns">${PVK.map(k => `<button class="btn gb ${k}" data-k="${k}">${pvLabel(k)}</button>`).join('')}</div><div class="gfb" aria-live="polite"></div>
        <div class="mono c-dim gscore">streak ${S.streak} · best ${S.best} · ${S.right}/${S.n} correct</div>`;
      G.querySelectorAll('.gb').forEach(b => b.onclick = () => answer(b.dataset.k, b));
    };
    const answer = (k, b) => {
      if (G.dataset.done === '1') return; G.dataset.done = '1'; S.n++;
      const ok = k === cur[1]; if (ok) { S.right++; S.streak++; S.best = Math.max(S.best, S.streak); } else S.streak = 0;
      b.classList.add(ok ? 'right' : 'wrong'); G.querySelector(`.gb.${cur[1]}`).classList.add('right');
      G.querySelector('.gfb').innerHTML = `<p><b class="${ok ? 'c-green' : 'c-amber'}">${ok ? 'Correct!' : 'Not this time.'}</b> ${cur[0]} is <span class="pv ${cur[1]}">${pvLabel(cur[1])}</span>'s ${cur[2].toLowerCase()} service.</p><button class="btn primary" id="gn">Next name →</button>`;
      G.querySelector('#gn').onclick = () => { G.dataset.done = '0'; next(); };
      G.querySelector('.gscore').textContent = `streak ${S.streak} · best ${S.best} · ${S.right}/${S.n} correct`;
      if (S.right >= 5) U.markDone('rosetta');
    };
    next();
    return null;
  },
  notes: {
    objective: 'Learners can translate the core services between providers and describe services by function.',
    say: ['Describe a service by what it does: "object storage", not "S3". Then every provider becomes readable.', 'Filter by Databases: three providers, the same three or four kinds of database.', 'The name game is a quick warm-up — try for a streak of five.'],
    demo: ['Search "queue", then "Cosmos". Filter AI / ML.', 'Play five rounds of the name game with the room shouting answers.'],
    ask: 'A job posting asks for "Azure Blob Storage" experience. You have used Amazon S3. What do you say?',
    answer: 'Both are object storage: buckets/containers of objects reached over HTTP, with storage tiers and access policies. The concepts transfer; the APIs and details differ.',
    transition: 'The services map across. So does how each provider organizes accounts and permissions — with some important differences.'
  },
  check: { q: 'Amazon S3, Azure Blob Storage and Google Cloud Storage are all…', opts: ['Relational databases', 'Object storage services', 'Content delivery networks', 'Block storage for one VM'], a: 1, why: 'They store objects (files plus metadata) in buckets or containers, accessed over HTTP APIs.' }
});

/* ======================= RESOURCE HIERARCHIES ======================= */
scene({
  id: 'hierarchy', after: 'rosetta', section: 'providers', kicker: 'AWS · Azure · Google Cloud', title: 'How does each cloud organize accounts, policies and bills?', short: 'Resource hierarchies', ic: ['tree', 'gcp'], paper: false,
  lab: 'Apply a guardrail policy at any level and watch it cascade down three hierarchies.',
  objectives: ['Compare AWS Organizations, Azure management groups/subscriptions and Google Cloud folders/projects', 'Explain policy inheritance', 'Find the billing and isolation boundary in each'],
  html: `
  <div class="controls"><span class="c-muted">Click any level to apply the policy <b class="c-fg">"Only allow approved Regions"</b> there.</span><div id="tg"></div><button class="btn" id="clr">Clear policy</button></div>
  <div class="grid3 stagger" id="trees"></div>
  <div class="explain" id="why" aria-live="polite"></div>`,
  notice: 'A policy set high in the tree applies to everything beneath it. Setting it once at the top is how large organizations keep hundreds of teams inside guardrails.',
  myth: 'An Azure subscription, an AWS account and a Google Cloud project are similar boundaries — but not identical. A resource group (Azure) has no exact twin elsewhere.',
  mount(el) {
    const T = el.querySelector('#trees'), why = el.querySelector('#why'); let applied = {}; let bill = false;
    const kindIc = { root: 'building', group: 'tree', unit: 'layers', unit2: 'box', res: 'server' };
    const depthOf = (H, id) => { let d = 0, n = H.nodes.find(x => x[0] === id); while (n[1]) { d++; n = H.nodes.find(x => x[0] === n[1]); } return d; };
    const isUnder = (H, id, anc) => { let n = H.nodes.find(x => x[0] === id); while (n) { if (n[0] === anc) return true; n = H.nodes.find(x => x[0] === n[1]); } return false; };
    const order = H => { const out = []; const walk = (p, d) => H.nodes.filter(n => n[1] === p).forEach(n => { out.push([n, d]); walk(n[0], d + 1); }); walk(null, 0); return out; };
    const billNode = { aws: ['org'], azure: ['aP', 'aD'], gcp: ['aP', 'aS', 'aD'] };
    const draw = () => {
      T.innerHTML = PVK.map(k => { const H = HIER[k]; return `<div class="card htree ${k}" style="--pc:${PROVIDERS[k].color}"><h3 class="pv ${k}">${pvLabel(k)}</h3><p class="c-dim mono" style="font-size:12px;margin-bottom:8px">${PROVIDERS[k].org}</p>
        <div class="hrows">${order(H).map(([n, d]) => { const pol = applied[k] && isUnder(H, n[0], applied[k]); const [a, b] = n[2].includes(': ') ? n[2].split(': ') : [n[2], '']; return `<button class="hrow ${n[3]} ${pol ? 'pol' : ''} ${applied[k] === n[0] ? 'src' : ''} ${bill && billNode[k].includes(n[0]) ? 'bill' : ''}" data-k="${k}" data-id="${n[0]}" style="--d:${d};transition-delay:${pol ? (d - depthOf(H, applied[k])) * 120 : 0}ms">
          ${U.badge(kindIc[n[3]], n[3] === 'res' ? 'compute' : PROVIDERS[k].color, 'sm')}<span><b>${b ? a : n[2]}</b>${b ? `<i>${b}</i>` : ''}</span><em class="hpol">${U.icon('shield')}</em><em class="hbill">${U.icon('dollar')}</em></button>`; }).join('')}</div>
        <p class="c-dim" style="font-size:12.5px;margin-top:8px">Guardrail mechanism: <b class="c-fg">${H.policy}</b></p></div>`; }).join('');
      T.querySelectorAll('.hrow').forEach(b => b.onclick = () => {
        const k = b.dataset.k, id = b.dataset.id; const H = HIER[k]; const n = H.nodes.find(x => x[0] === id);
        // apply at the equivalent level in all three trees for comparison
        const lvl = depthOf(H, id); const kind = n[3];
        PVK.forEach(p => { const same = HIER[p].nodes.find(x => x[0] === id); const m = same && depthOf(HIER[p], id) === lvl ? same : HIER[p].nodes.find(x => depthOf(HIER[p], x[0]) === lvl); applied[p] = m ? m[0] : null; });
        draw();
        const note = n[4] || '';
        why.innerHTML = `<h4>Policy applied at "${n[2]}"</h4><p>${note} Everything beneath this level now inherits the guardrail (shield icon); nothing above or beside it is affected. The same level is selected in the other two hierarchies for comparison.${kind === 'res' ? ' Applied to a single resource, it protects only that resource — usually you want guardrails much higher.' : ''}</p>`;
        U.markDone('hierarchy');
      });
    };
    U.seg(el.querySelector('#tg'), [['0', 'Hide billing'], ['1', 'Show billing boundary']], '0', v => { bill = v === '1'; draw(); why.innerHTML = bill ? '<h4>Where the bill lands</h4><p><span class="pv aws">AWS</span>: each account accrues charges and the organization\'s management account pays one consolidated bill. <span class="pv azure">Azure</span>: charges accrue per subscription, under a billing account. <span class="pv gcp">Google Cloud</span>: each project is linked to a Cloud Billing account that pays for it.</p>' : ''; }, 'Billing');
    el.querySelector('#clr').onclick = () => { applied = {}; draw(); why.innerHTML = ''; };
    draw();
    why.innerHTML = '<h4>Three trees, one idea</h4><p>Each provider lets you group things so that permissions, policies and billing can be managed at the right level. The top is your organization; the bottom is individual resources.</p>';
    return null;
  },
  notes: {
    objective: 'Learners know where accounts, subscriptions and projects sit and how guardrails inherit.',
    say: ['Top: your company. Middle: groups of teams or environments. Then the unit that owns resources and bills: an AWS account, an Azure subscription, a Google Cloud project. Bottom: the resources.', 'Apply "approved Regions only" at Production and watch it flow down — but not into Development.', 'Show billing: the bill is attached at a different level in each provider.'],
    demo: ['Click Production in any tree; then click the root; then a single resource.', 'Toggle billing.'],
    ask: 'Why do companies give each team or environment its own account/subscription/project?',
    answer: 'Isolation: a mistake or breach in dev cannot touch prod; separate quotas, permissions and bills; clean cost attribution.',
    transition: 'Let\'s use all of this to build a first app — and see it on all three providers.'
  },
  check: { q: 'You apply "only approved Regions" to the Production group. A developer creates a server in a Development project/account. Is it restricted?', opts: ['Yes, policies apply to the whole organization', 'No — Development is not beneath Production, so it does not inherit the policy', 'Only on AWS', 'Only if the server is public'], a: 1, why: 'Policies inherit downward from where they are attached. Siblings are not affected.' }
});

/* ======================= FIRST APP ON ANY PROVIDER ======================= */
const FA = {
  site: ['Static website', 'S3 bucket (website)', 'Blob Storage static website', 'Cloud Storage bucket'],
  cdn: ['CDN + HTTPS', 'CloudFront + ACM cert', 'Front Door + managed cert', 'Cloud CDN + load balancer'],
  dns: ['DNS', 'Route 53', 'Azure DNS', 'Cloud DNS'],
  api: ['API function', 'API Gateway + Lambda', 'Azure Functions', 'Cloud Run functions'],
  db: ['Database', 'DynamoDB', 'Cosmos DB', 'Firestore'],
  auth: ['User sign-in', 'Amazon Cognito', 'Entra External ID', 'Identity Platform'],
  mon: ['Monitoring', 'CloudWatch', 'Azure Monitor', 'Cloud Monitoring'],
  bud: ['Budget alert', 'AWS Budgets', 'Cost Management', 'Billing budgets']
};
const FA_STEPS = [
  { t: 'Put the website files in object storage', add: ['user', 'site'], path: [['user', 'site'], ['site', 'user', 'ret']], e: 'The simplest cloud app: HTML, CSS, JavaScript and images uploaded to a storage bucket configured to serve a website. No servers at all.', tip: 'You pay a little per GB stored and per GB downloaded.' },
  { t: 'Add a CDN, HTTPS and a domain name', add: ['dns', 'cdn'], path: [['user', 'dns'], ['dns', 'user', 'ret'], ['user', 'cdn'], ['cdn', 'site'], ['site', 'cdn', 'ret'], ['cdn', 'user', 'ret']], e: 'A CDN caches the files near users and terminates HTTPS with a free managed certificate. DNS points your domain name at the CDN.', tip: 'Keep the bucket private and let only the CDN read it.' },
  { t: 'Add a serverless API', add: ['api'], path: [['user', 'cdn'], ['cdn', 'api'], ['api', 'cdn', 'ret'], ['cdn', 'user', 'ret']], e: 'Dynamic features (likes, comments) need code. A function runs only when a request arrives and scales automatically — including to zero.', tip: 'Functions are billed per request and per millisecond of run time.' },
  { t: 'Store data in a managed database', add: ['db'], path: [['user', 'cdn'], ['cdn', 'api'], ['api', 'db'], ['db', 'api', 'ret'], ['api', 'cdn', 'ret'], ['cdn', 'user', 'ret']], e: 'A serverless NoSQL database stores posts and likes. The provider handles replication, patching and backups.', tip: 'Give the function a role that can only read and write this one table.' },
  { t: 'Let users sign in', add: ['auth'], path: [['user', 'auth'], ['auth', 'user', 'ret'], ['user', 'cdn'], ['cdn', 'api'], ['api', 'auth'], ['auth', 'api', 'ret'], ['api', 'cdn', 'ret'], ['cdn', 'user', 'ret']], e: 'A managed identity service handles sign-up, passwords, social login and multi-factor auth, and issues tokens your API checks.', tip: 'Never build password storage yourself.' },
  { t: 'Watch it — and watch the bill', add: ['mon', 'bud'], path: [['api', 'mon'], ['db', 'mon'], ['mon', 'bud']], e: 'Logs and metrics show errors and latency; a budget alert emails you if spending passes a threshold. Set the budget on day one.', tip: 'Many providers offer free tiers or credits for new accounts; terms change, so check the current offer.' }
];
scene({
  id: 'first-app', after: 'hierarchy', section: 'providers', kicker: 'AWS · Azure · Google Cloud', title: 'Build your first cloud app — on any provider', short: 'Your first app, 3 ways', ic: ['rocket', 'gcp'],
  lab: 'Assemble a serverless web app step by step and swap providers at any point.',
  objectives: ['Build a beginner architecture from managed building blocks', 'Name the matching service on AWS, Azure and Google Cloud', 'Know the first security and cost habits'],
  html: `
  <div class="split" style="grid-template-columns:minmax(280px,0.9fr) minmax(0,2.1fr)">
    <div class="rail">
      <div id="lens"></div>
      <div id="stepper"></div>
      <div class="explain" id="exp" aria-live="polite"></div>
      <div class="card" id="todo"></div>
    </div>
    <div class="col"><div class="viz grid"><div class="cvhost" id="fl"></div></div></div>
  </div>`,
  notice: 'Switch providers mid-way: the diagram\'s shape never changes, only the labels.',
  myth: 'Your first cloud app does not need servers, Kubernetes or a VPC. Managed and serverless building blocks get you to a real, secure app faster.',
  mount(el) {
    const host = el.querySelector('#fl'); let lens = U.cloud() === 'multi' ? 'aws' : U.cloud(); let F; let shown = new Set(); let cur = 0;
    const pos = { user: [90, 230], dns: [300, 80], cdn: [320, 230], site: [560, 120], api: [560, 300], db: [800, 300], auth: [560, 450], mon: [820, 120], bud: [820, 450] };
    const lab = id => id === 'user' ? ['Your users', 'browser · phone'] : [FA[id][0], FA[id][PVK.indexOf(lens) + 1]];
    const build = () => {
      host.innerHTML = ''; const nodes = {};
      Object.keys(pos).forEach(id => { const [l, s] = lab(id); nodes[id] = { x: pos[id][0], y: pos[id][1], label: l, sub: s, w: id === 'user' ? 150 : 200, h: 54, kind: id === 'user' ? 'client' : '', ic: { user: 'laptop', dns: 'dns', cdn: 'cdn', site: 'bucket', api: 'fn', db: 'db', auth: 'key', mon: 'chart', bud: 'dollar' }[id], cat: { user: 'client', dns: 'network', cdn: 'network', site: 'storage', api: 'compute', db: 'database', auth: 'security', mon: 'mgmt', bud: 'cost' }[id] }; });
      const edges = [['user', 'site'], ['user', 'dns'], ['user', 'cdn'], ['cdn', 'site'], ['cdn', 'api'], ['api', 'db'], ['user', 'auth'], ['api', 'auth'], ['api', 'mon'], ['db', 'mon'], ['mon', 'bud']];
      F = U.flow(host, { size: [940, 520], nodes, edges, label: 'Beginner serverless architecture' });
      F.svg.classList.add('lens-' + lens);
      vis();
    };
    const vis = () => { Object.keys(pos).forEach(id => F.show(id, shown.has(id))); Object.entries(F.E).forEach(([k, e]) => { const [a, b] = k.split('>'); const direct = k === 'user>site'; e.style.display = shown.has(a) && shown.has(b) && !(direct && shown.has('cdn')) ? '' : 'none'; }); };
    const todo = el.querySelector('#todo'), exp = el.querySelector('#exp');
    const render = async (i, anim) => {
      cur = i; shown = new Set(); FA_STEPS.slice(0, i + 1).forEach(s => s.add.forEach(a => shown.add(a))); vis(); F.clear();
      const s = FA_STEPS[i]; s.add.forEach(a => F.state(a, 'good'));
      exp.innerHTML = `<h4>${i + 1}. ${s.t}</h4><p>${s.e}</p><p class="c-dim" style="margin-top:6px">${U.icon('check')} ${s.tip}</p>`;
      todo.innerHTML = `<h3>On <span class="pv ${lens}">${pvLabel(lens)}</span>, you'd create</h3><ul class="list">${[...shown].filter(x => x !== 'user').map(x => `<li><b>${FA[x][PVK.indexOf(lens) + 1]}</b> <span class="c-dim">— ${FA[x][0].toLowerCase()}</span></li>`).join('')}</ul>`;
      for (const [a, b, c] of s.path) { F.edgeOn(a, b); if (anim) await F.packet(a, b, c === 'ret' ? 'pk ret' : 'pk', 480); }
      if (i === FA_STEPS.length - 1) U.markDone('first-app');
    };
    const seg = U.seg(el.querySelector('#lens'), PVK.map(k => [k, pvLabel(k)]), lens, v => { lens = v; build(); render(cur, false); }, 'Provider');
    U.onCloud(c => { if (c !== 'multi') { lens = c; seg.set(c, false); build(); render(cur, false); } });
    build();
    const sp = U.stepper(el.querySelector('#stepper'), { count: () => FA_STEPS.length, render, autoMs: 1300 });
    sp.go(0, false);
    return () => sp.destroy();
  },
  notes: {
    objective: 'Learners leave with a concrete, buildable first project and know the equivalent services on each provider.',
    say: ['Step one has no servers at all: files in a bucket.', 'Each step adds one managed building block. Notice what you never had to do: patch an OS, size a server, configure a firewall.', 'Switch provider at any step. Same architecture, different names.', 'Two habits from day one: least-privilege roles and a budget alert.'],
    demo: ['Play all six steps on AWS, then switch to Azure and Google Cloud on the last step.'],
    ask: 'Which step would you skip for a personal portfolio site, and which should you never skip?',
    answer: 'Skip sign-in and database if it is static. Never skip HTTPS (via the CDN) and a budget alert.',
    transition: 'Now let\'s look at the building blocks of a bigger, server-based version of Pixelpost.'
  },
  check: { q: 'Why does step 2 put a CDN in front of the storage bucket?', opts: ['Buckets cannot store HTML', 'To cache files near users and serve them over HTTPS with your domain', 'To run the API code', 'Because DNS requires it'], a: 1, why: 'The CDN reduces latency and origin load, terminates HTTPS with a managed certificate and lets the bucket stay private.' }
});

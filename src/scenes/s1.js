/* Opening journey · Chapter 1 (why the cloud) · Chapter 2 (responsibility) · Chapter 3 (global infrastructure) */

const JOURNEY_INFO = {
  browser: ['Your browser', 'The client. It knows a name (pixelpost.app), turns it into an address, opens an encrypted connection, sends HTTP requests and renders what comes back.'],
  resolver: ['DNS resolver', 'Usually run by your ISP or a public DNS service. It looks up names on your behalf and caches answers for their time-to-live (TTL).'],
  auth: ['Authoritative DNS', 'The source of truth for pixelpost.app records. Here it is Amazon Route 53, which can answer differently by location or health.'],
  edge: ['CDN edge location', 'A cache close to users (Amazon CloudFront). It serves copies of files it already has and forwards everything else to the origin.'],
  lb: ['Load balancer', 'Elastic Load Balancing receives requests for the application and spreads them across healthy servers, using health checks to skip broken ones.'],
  app1: ['Application server', 'Runs Pixelpost\'s code: checks the session, builds the feed and talks to data stores. Could equally be a container or a Lambda function.'],
  app2: ['Application server', 'A second copy of the same code. Copies let the app handle more traffic and survive one server failing.'],
  db: ['Database', 'Stores structured records: users, posts, likes. Amazon RDS or DynamoDB are typical choices; Chapter 7 compares them.'],
  s3: ['Object storage', 'Amazon S3 stores the photos and static files (images, scripts, styles) as objects addressed by key.'],
  mon: ['Monitoring', 'Amazon CloudWatch collects metrics and logs from every component so engineers know the system is healthy (Chapter 10).'],
  asg: ['Auto Scaling', 'Adds or removes servers as traffic changes (Chapter 6).'],
  app3: ['Application server (AZ b)', 'Servers in a second Availability Zone keep the app running if one data-center group fails (Chapter 3).'],
  app4: ['Application server (AZ b)', 'Another server in the second Availability Zone.']
};

scene({
  id: 'journey', section: 'explore', ch: 0, kicker: 'Prologue', title: 'What actually happens when you open a website?', short: 'A request\'s journey', bare: true, lab: 'Step through DNS, TLS, CDN, load balancer, servers and databases.',
  html: `
  <div class="split" style="grid-template-columns:minmax(300px,0.95fr) minmax(0,2fr)">
    <div class="rail" style="justify-content:center">
      <div class="kicker">Prologue · follow one request end to end</div>
      <h1 class="hero-title">What actually happens when you <em>open a website?</em></h1>
      <p class="hero-sub">Follow one request for <b>pixelpost.app</b>, a photo-sharing app we will grow all the way into an AI product.</p>
      <div class="urlbar" aria-label="Address bar"><span class="lock">●</span><span id="url"></span><span class="caret"></span></div>
      <div class="controls" id="opts"></div>
      <div id="stepper"></div>
      <div class="explain" id="exp" aria-live="polite"><h4>Press Play or Next step</h4><p>Each step explains why a component exists before it shows what it does. Click any box to learn what it is.</p></div>
      <div class="engbox eng-only" id="engx"><b>Engineering detail</b><p>Switch to Engineer mode (E) at any point for protocols, timings and caveats.</p></div>
    </div>
    <div class="col"><div class="viz grid"><div class="cvhost" id="fl"></div></div><div class="explain" id="comp" hidden></div></div>
  </div>`,
  mount(el) {
    const host = el.querySelector('#fl');
    const nodes = {
      browser: { x: 95, y: 300, label: 'Your browser', sub: 'client', kind: 'client', w: 150 },
      resolver: { x: 300, y: 90, label: 'DNS resolver', sub: 'ISP / public DNS' },
      auth: { x: 520, y: 90, label: 'Authoritative DNS', sub: 'Route 53' },
      edge: { x: 330, y: 300, label: 'CDN edge', sub: 'CloudFront' },
      lb: { x: 580, y: 300, label: 'Load balancer', sub: 'ELB', w: 140 },
      app1: { x: 790, y: 245, label: 'App server', sub: 'AZ a', w: 140 },
      app2: { x: 790, y: 355, label: 'App server', sub: 'AZ a', w: 140 },
      db: { x: 985, y: 245, label: 'Database', sub: 'RDS', w: 130 },
      s3: { x: 985, y: 355, label: 'Object storage', sub: 'S3', w: 130 },
      app3: { x: 790, y: 470, label: 'App server', sub: 'AZ b', w: 140 },
      app4: { x: 790, y: 560, label: 'App server', sub: 'AZ b', w: 140 },
      mon: { x: 580, y: 470, label: 'Monitoring', sub: 'CloudWatch', w: 140 },
      asg: { x: 580, y: 560, label: 'Auto Scaling', sub: 'EC2 Auto Scaling', w: 140 }
    };
    const edges = [['browser', 'resolver'], ['resolver', 'auth'], ['browser', 'edge'], ['edge', 'lb'], ['edge', 's3', 'dash'], ['lb', 'app1'], ['lb', 'app2'], ['app1', 'db'], ['app1', 's3'], ['app2', 'db'], ['lb', 'app3'], ['lb', 'app4']];
    const boundaries = [
      { x: 485, y: 180, w: 590, h: 230, label: 'AWS REGION · us-east-1', kind: 'vpc' },
      { x: 250, y: 245, w: 160, h: 110, label: 'EDGE', kind: 'priv' }
    ];
    const zoomB = [{ x: 485, y: 180, w: 590, h: 430, label: 'AWS REGION · us-east-1 (zoomed out)', kind: 'vpc' }, { x: 710, y: 200, w: 160, h: 200, label: 'AZ a', kind: 'az' }, { x: 710, y: 420, w: 160, h: 180, label: 'AZ b', kind: 'az' }];
    let F;
    const build = zoom => {
      host.innerHTML = '';
      F = U.flow(host, { size: [1080, zoom ? 640 : 440], nodes, edges, boundaries: zoom ? zoomB.concat([boundaries[1]]) : boundaries, label: 'Request path from browser to cloud application', onClick: explain });
      ['app3', 'app4', 'mon', 'asg'].forEach(id => F.show(id, zoom));
      ['lb>app3', 'lb>app4'].forEach(k => { if (F.E[k]) F.E[k].style.display = zoom ? '' : 'none'; });
    };
    const comp = el.querySelector('#comp');
    function explain(id) { const [t, d] = JOURNEY_INFO[id] || [id, '']; comp.hidden = false; comp.innerHTML = `<h4>${t}</h4><p>${d}</p>`; F && Object.keys(F.N).forEach(k => F.N[k].g.classList.toggle('sel', k === id)); }
    const O = { type: 'page', cache: 'hit' };
    const opts = el.querySelector('#opts');
    U.seg(opts, [['page', 'Page & images'], ['api', 'API data']], O.type, v => { O.type = v; restart(); }, 'Request type');
    const cacheSeg = U.seg(opts, [['hit', 'Cache hit'], ['miss', 'Cache miss']], O.cache, v => { O.cache = v; restart(); }, 'CDN cache');
    const urlEl = el.querySelector('#url');
    const steps = () => {
      const path = O.type === 'api' ? '/api/feed' : '/photos/sunset.jpg';
      const s = [
        { t: 'You type a name', n: ['browser'], h: [], url: 'pixelpost.app' + path,
          e: 'Your browser knows a name, not a location. Computers route traffic to numeric IP addresses, so the name must be translated first.',
          g: 'The browser checks its own DNS cache and the operating system\'s resolver cache before asking the network.' },
        { t: 'DNS: name → address', n: ['resolver', 'auth'], h: [['browser', 'resolver'], ['resolver', 'auth']],
          e: 'We need a way to convert a memorable domain name into a network destination. That\'s where DNS enters the picture.',
          g: 'A recursive resolver walks root → .app TLD → the authoritative name servers (Route 53). Each answer is cached for its TTL, so most lookups never leave the resolver.' },
        { t: 'The answer comes back', n: ['browser'], h: [['auth', 'resolver', 'ret'], ['resolver', 'browser', 'ret']],
          e: 'DNS returns the address of a CDN edge location near you, not of a single faraway server.',
          g: 'CloudFront distributions are reached through DNS records (an alias in Route 53) that resolve to edge addresses chosen to be close to the resolver.' },
        { t: 'Open a secure connection', n: ['browser', 'edge'], h: [['browser', 'edge'], ['edge', 'browser', 'ret']],
          e: 'Before sending anything private, the browser and the edge agree on encryption and the edge proves it really is pixelpost.app.',
          g: 'TCP handshake (1 round trip) + TLS 1.3 handshake (1 round trip). HTTP/3 runs over QUIC, which combines them. The TLS certificate must match the domain.' },
        { t: 'Send the request', n: ['edge'], h: [['browser', 'edge']],
          e: `The browser sends <code class="k">GET ${path}</code>. The edge decides whether it can answer by itself.`,
          g: 'Cache behaviors match the path. Static assets are cacheable; personalized API responses usually are not (or only briefly, keyed on headers).' }
      ];
      if (O.type === 'page' && O.cache === 'hit') {
        s.push({ t: 'Cache hit', n: ['edge'], h: [['edge', 'browser', 'ret']], e: 'The edge already holds a fresh copy of this image, so it answers immediately. The origin servers never see the request.',
          g: 'The response carries an <code class="k">Age</code> header and a cache-status header. Freshness comes from Cache-Control / TTL settings.' });
      } else if (O.type === 'page') {
        s.push({ t: 'Cache miss → origin', n: ['edge', 's3'], h: [['edge', 's3'], ['s3', 'edge', 'ret']], e: 'The edge doesn\'t have this file yet, so it fetches it from the origin: the S3 bucket holding Pixelpost\'s photos.',
          g: 'With origin access control, only CloudFront may read the bucket; the bucket itself stays private.' });
        s.push({ t: 'Cache and deliver', n: ['edge'], h: [['edge', 'browser', 'ret']], e: 'The edge stores a copy for the next visitor nearby and returns the image to you.', g: 'Subsequent requests in that region become cache hits until the object expires or is invalidated.' });
      } else {
        s.push({ t: 'Forward to the Region', n: ['edge', 'lb'], h: [['edge', 'lb']], e: 'Your feed is personal, so the edge forwards the request to the application\'s origin: a load balancer in an AWS Region.',
          g: 'CloudFront → ALB over the AWS network; the ALB terminates TLS again (or the edge re-encrypts to the origin).' });
        s.push({ t: 'Pick a healthy server', n: ['lb', 'app1'], h: [['lb', 'app1']], e: 'One server is not enough for many users, and it can fail. The load balancer sends this request to a healthy copy of the app.',
          g: 'Health checks probe each target; the ALB routes by listener rules and spreads requests (round robin or least outstanding requests).' });
        s.push({ t: 'Read data', n: ['app1', 'db'], h: [['app1', 'db'], ['db', 'app1', 'ret']], e: 'The app asks the database for the latest posts from people you follow. The photos themselves stay in object storage.',
          g: 'A typical query uses an index on (follower_id, created_at). Photo URLs point to CloudFront, so image bytes never pass through the app server.' });
        s.push({ t: 'Respond', n: ['browser'], h: [['app1', 'lb', 'ret'], ['lb', 'edge', 'ret'], ['edge', 'browser', 'ret']], e: 'The response travels back the same way: server → load balancer → edge → you.', g: 'JSON response, compressed (gzip/brotli). Total time ≈ DNS + handshakes + edge↔origin + server time.' });
      }
      s.push({ t: 'The page renders', n: ['browser'], h: [], e: 'Your browser draws the page and fires more requests for scripts, fonts and images. Each one repeats part of this journey, though DNS and connections are reused.',
        g: 'Browsers reuse connections (HTTP/2 multiplexing). Real pages make dozens of requests; the CDN absorbs most of them.' });
      s.push({ t: 'Zoom out', n: ['lb', 'app1', 'app2', 'app3', 'app4', 'mon', 'asg'], h: [], zoom: true, e: 'Everything you just saw is a slice of a larger architecture: servers in two Availability Zones, automatic scaling, monitoring. Now let\'s understand how engineers build and operate it.',
        g: 'Chapters 3–10 open each box: Regions and AZs, networking, scaling, storage, security, deployment and monitoring.' });
      return s;
    };
    let zoomed = false; let typing = null;
    const typeUrl = (txt, anim) => {
      clearInterval(typing); if (!anim) { urlEl.textContent = txt; return; }
      let k = 0; urlEl.textContent = ''; typing = setInterval(() => { urlEl.textContent = txt.slice(0, ++k); if (k >= txt.length) clearInterval(typing); }, 35);
    };
    const exp = el.querySelector('#exp'), engx = el.querySelector('#engx');
    const render = async (i, anim) => {
      const S = steps(); const s = S[i];
      if (!!s.zoom !== zoomed) { zoomed = !!s.zoom; build(zoomed); }
      F.clear();
      S.slice(0, i).forEach(p => p.n.forEach(id => F.state(id, 'done')));
      if (s.url || i === 0) typeUrl(S[0].url, anim && i === 0);
      exp.innerHTML = `<h4>${i + 1}. ${s.t}</h4><p>${s.e}</p>`;
      engx.innerHTML = `<b>Engineering detail</b><p>${s.g}</p>`;
      for (const [a, b, cls] of s.h) { F.edgeOn(a, b); if (anim) await F.packet(a, b, cls === 'ret' ? 'pk ret' : 'pk', 650); }
      s.n.forEach(id => F.state(id, 'on'));
      if (s.n.length === 1) explain(s.n[0]);
      if (i === S.length - 1) U.markDone('journey');
    };
    build(false);
    const sp = U.stepper(el.querySelector('#stepper'), { count: () => steps().length, render, autoMs: 1100 });
    const restart = () => { sp.stop(); zoomed = false; build(false); sp.go(0, false); };
    cacheSeg.el.hidden = false;
    sp.go(0, false);
    return () => { sp.destroy(); clearInterval(typing); };
  },
  notes: {
    objective: 'Give learners one concrete mental model of a request that later chapters zoom into.',
    say: ['Every chapter tonight opens one of these boxes. Watch where the request goes and ask: why does this component exist?', 'DNS turns a name into an address. The CDN answers what it can from nearby. Everything else goes to a Region, where a load balancer picks a healthy server.', 'Switch between a cached image and a personalized API call: they take very different paths.'],
    demo: ['Play the "Page & images · Cache hit" path first, then switch to Cache miss, then API data.', 'Click any box to explain it. Press E to show engineering details.'],
    ask: 'Why does a cache hit make the website faster and cheaper at the same time?',
    answer: 'The response comes from nearby (fewer milliseconds) and the origin does no work (fewer servers, less data transfer).',
    transition: 'Now let\'s understand how engineers build and operate everything you just saw — starting with why anyone rents servers at all.'
  },
  check: { q: 'A visitor requests an image that the CDN edge already has cached. Which components handle the request?', opts: ['Browser, DNS resolver, CDN edge', 'Browser, CDN edge, load balancer, app server', 'Browser, load balancer, S3', 'Every component in the diagram'], a: 0, why: 'DNS finds the edge; the edge answers from cache. The Region\'s servers never see a cache hit.' },
  myth: 'Requests don\'t follow one fixed path. Cached files, uncached files and API calls each take a different route.'
});

scene({
  id: 'why-cloud', section: 'explore', ch: 1, kicker: 'Why the cloud exists', title: 'What problem did cloud computing solve?', short: 'Build your own data center', lab: 'On-premises vs. cloud capacity under growth and spikes.',
  objectives: ['Compare fixed, owned capacity with elastic, rented capacity', 'See over- and under-provisioning on real curves', 'Read the cost trade-off without assuming cloud is always cheaper'],
  html: `
  <div class="split" style="grid-template-columns:minmax(280px,0.85fr) minmax(0,2.1fr)">
    <div class="rail">
      <p class="lede">Pixelpost is growing. Do you <b>buy servers</b> and wait for delivery, or <b>rent capacity</b> by the hour?</p>
      <div class="controls stack" id="ctl"></div>
      <div class="tiles" id="tiles"></div>
      <div class="explain" id="story" aria-live="polite"></div>
      <div class="engbox eng-only"><b>Model</b><p>Demand(w) = base × (1+g)<sup>w/52</sup> × (1 + s·sin 2πw/52) × spike. On-prem orders servers when the lead-time forecast (trend only) exceeds 80% utilization, sized to 60%. Cloud runs ⌈demand ÷ (capacity × 70%)⌉ servers each week. On-prem cost = hardware amortized over 5 years + weekly operations; cash = hardware paid when ordered.</p><p>Not modeled: staff costs, licenses, data transfer, discounts, the hours-scale delay of scaling out, account quotas.</p></div>
    </div>
    <div class="col">
      <div class="viz" style="min-height:250px"><div class="cvhost" id="c1"></div></div>
      <div class="viz" style="min-height:180px;flex:0.7"><div class="cvhost" id="c2"></div></div>
    </div>
  </div>`,
  notice: 'Owned capacity is flat between purchases: idle in quiet weeks, short during the spike. Rented capacity follows demand.',
  myth: 'Cloud is not automatically cheaper. With steady, predictable demand, owned hardware can cost less; elasticity is what you pay extra for.',
  mount(el, slide) {
    const k = U.tok(slide); const P = Object.assign({}, SIM.capacityDefaults);
    let R;
    const c1 = U.canvas(el.querySelector('#c1'), draw), c2 = U.canvas(el.querySelector('#c2'), draw2);
    function run() { R = SIM.capacity(P); c1.draw(); c2.draw(); summary(); }
    function draw() {
      if (!R) return; const ymax = Math.max(...R.demand, ...R.onCap, ...R.cloudCap) * 1.05;
      U.chart(c1, { k, x: [0, P.weeks], y: [0, ymax], xTicks: 6, xFmt: v => 'wk ' + Math.round(v), yFmt: v => U.fmt(v / 1000) + 'k', yLabel: 'users served per week', legend: true,
        bands: [{ from: P.spikeWeek, to: P.spikeWeek + P.spikeWeeks, color: U.a(k.amber, 0.12) }],
        series: [{ data: R.onCap, color: k.blue, label: 'On-prem capacity', step: true, width: 2.5 }, { data: R.cloudCap, color: k.cyan, label: 'Cloud capacity', width: 1.5, dash: [4, 3] }, { data: R.demand, color: k.fg, label: 'Demand', width: 2 }] });
    }
    function draw2() {
      if (!R) return; const ymax = Math.max(R.onCost.at(-1), R.cloudCost.at(-1)) * 1.08;
      U.chart(c2, { k, x: [0, P.weeks], y: [0, ymax], xTicks: 6, xFmt: v => 'wk ' + Math.round(v), yFmt: v => '$' + U.fmt(v / 1000) + 'k', yLabel: 'cumulative cost (illustrative)', legend: true,
        series: [{ data: R.onCost, color: k.blue, label: 'On-prem (amortized)' }, { data: R.cloudCost, color: k.cyan, label: 'Cloud' }] });
    }
    function summary() {
      const s = R.summary;
      U.tiles(el.querySelector('#tiles'), [
        ['Demand missed', `${U.fmt(s.onUnservedPct, 1)}% · ${U.fmt(s.cloudUnservedPct, 1)}%`, s.onUnservedPct > 0.05 ? 'warn' : 'good', 'on-prem · cloud'],
        ['Avg utilization', `${U.fmt(s.onUtil * 100)}% · ${U.fmt(s.cloudUtil * 100)}%`, '', 'on-prem · cloud'],
        ['3-year cost', `${U.money(s.onCost / 1000)}k · ${U.money(s.cloudCost / 1000)}k`, '', 'amortized · cloud'],
        ['Cash spent', U.money(s.onCash / 1000) + 'k', '', `on-prem, ${s.purchases.length} purchase orders`]
      ]);
      const cheaper = s.onCost < s.cloudCost ? 'on-prem' : 'cloud';
      el.querySelector('#story').innerHTML = `<h4>What happened</h4><p>${s.onUnservedPct > 0.05 ? `During the week-${P.spikeWeek} spike, on-prem could not serve <b>${U.fmt(s.onUnservedPct, 1)}%</b> of total demand: new servers take ${P.leadWeeks} weeks to arrive and the spike was not in the forecast.` : 'On-prem had enough headroom for every week, including the spike.'} On-prem averaged <b>${U.fmt(s.onUtil * 100)}%</b> utilization; the rest is paid-for idle capacity.</p><p>With these assumptions <b>${cheaper}</b> is cheaper over 3 years${cheaper === 'on-prem' ? ', but it needed ' + U.money(s.onCash / 1000) + 'k in cash up front and still missed peak demand' : ''}. Change growth or the spike and the answer moves.</p>`;
      if (s.onUnservedPct > 0.05) U.markDone('why-cloud');
    }
    const c = el.querySelector('#ctl');
    U.slider(c, { label: 'Demand growth / year', min: 0, max: 150, step: 5, value: P.growthPct, fmt: v => v + '%' }, v => { P.growthPct = v; run(); });
    U.slider(c, { label: 'Launch spike', min: 1, max: 4, step: 0.1, value: P.spikeMult, fmt: v => '×' + v.toFixed(1) }, v => { P.spikeMult = v; run(); });
    U.slider(c, { label: 'Servers bought at start', min: 6, max: 40, step: 1, value: P.onpremServers, fmt: v => v }, v => { P.onpremServers = v; run(); });
    U.slider(c, { label: 'Hardware lead time', min: 1, max: 20, step: 1, value: P.leadWeeks, fmt: v => v + ' wk' }, v => { P.leadWeeks = v; run(); });
    const e1 = U.slider(c, { label: 'Cloud $ / server-week', min: 30, max: 200, step: 5, value: P.cloudWeek, fmt: v => '$' + v }, v => { P.cloudWeek = v; run(); });
    const e2 = U.slider(c, { label: 'On-prem $ / server', min: 2000, max: 15000, step: 500, value: P.capex, fmt: v => '$' + U.fmt(v) }, v => { P.capex = v; run(); });
    [e1, e2].forEach(s => s.el.classList.add('eng-only'));
    run();
    return () => { c1.destroy(); c2.destroy(); };
  },
  notes: {
    objective: 'Learners see over- and under-provisioning and understand elasticity as the core economic idea, with honest cost trade-offs.',
    say: ['Blue is servers you own: you buy in big steps and wait weeks for delivery. White is demand. Cyan is rented capacity that follows demand.', 'Look at the spike: on-prem has no way to react in time. Now look at quiet weeks: on-prem is paying for idle machines.', 'Now set growth to zero and the spike to ×1. On-prem becomes cheaper. Elasticity is what you pay for.'],
    demo: ['Default → growth 0%, spike ×1 → growth 120%, lead time 18 weeks.', 'Engineer mode exposes the price assumptions.'],
    ask: 'When would a company rationally keep its own data center?',
    answer: 'Steady, predictable, high utilization; data-residency or latency constraints; existing sunk investment; specialized hardware. Many run hybrid.',
    transition: 'If you rent, who is responsible for what?'
  },
  check: { q: 'Why did on-prem miss demand during the spike in the simulator?', opts: ['Cloud servers are faster', 'New hardware takes weeks to arrive and the spike wasn\'t forecast', 'On-prem servers can\'t be load balanced', 'Cloud has unlimited capacity'], a: 1, why: 'Capacity you own changes only after a purchase lead time. Elastic capacity changes in minutes — within quotas and limits.' }
});

const RESP_LAYERS = ['Facilities & physical security', 'Physical servers & network', 'Virtualization', 'Operating system', 'Runtime & middleware', 'Application code', 'Data', 'Identity & access', 'Security configuration'];
const RESP = {
  onprem: { l: 'On-premises', ex: 'Your own racks in your own building.', r: 'ccccccccc' },
  iaas: { l: 'IaaS', ex: 'Amazon EC2: you get a virtual machine and run everything on it.', r: 'pppcccccc' },
  paas: { l: 'PaaS', ex: 'AWS Elastic Beanstalk: you upload code; the platform runs servers, OS and runtime (you choose versions and approve updates).', r: 'pppsscccs' },
  fn: { l: 'Serverless functions', ex: 'AWS Lambda: you provide a function; AWS runs and patches the execution environment.', r: 'ppppscccs' },
  saas: { l: 'SaaS', ex: 'A hosted email or CRM product: you use software someone else operates.', r: 'ppppppcss' }
};
const RESP_WHY = {
  'Operating system': { c: 'You patch it, harden it and pick its version.', s: 'The platform patches it, but you choose the platform version and when updates apply.', p: 'Never visible to you.' },
  'Runtime & middleware': { c: 'You install and upgrade language runtimes and servers.', s: 'The provider patches managed runtimes; you must move off deprecated versions.', p: 'Fully managed.' },
  'Data': { c: 'What you store, how it is classified, encrypted and backed up is yours, in every model.', s: '', p: '' },
  'Identity & access': { c: 'You create users and roles and decide who can do what.', s: 'The provider runs the sign-in system; you manage your users, MFA and permissions.', p: '' },
  'Security configuration': { c: 'Firewalls, security groups, encryption settings and logging are yours to configure.', s: 'The provider secures the platform; you configure the options it exposes (access, encryption, network settings).', p: '' }
};
scene({
  id: 'responsibility', section: 'explore', ch: 2, kicker: 'Cloud service models', title: 'Who is responsible for what?', short: 'The responsibility stack', paper: true, lab: 'IaaS vs PaaS vs serverless vs SaaS responsibilities.',
  objectives: ['Distinguish IaaS, PaaS, serverless and SaaS by who operates each layer', 'Apply the shared responsibility model', 'Recognize public, private, hybrid and multicloud deployments'],
  html: `
  <div class="split" style="grid-template-columns:minmax(0,1.3fr) minmax(280px,1fr)">
    <div class="col">
      <div class="controls" id="models"></div>
      <div id="stack" class="stack" role="list"></div>
      <div class="controls"><span class="pill" style="color:var(--blue)">Provider</span><span class="pill" style="color:var(--violet)">Shared</span><span class="pill" style="color:var(--amber)">Customer</span></div>
    </div>
    <div class="rail">
      <div class="explain" id="mx"></div>
      <div class="explain" id="lx"><h4>Click a layer</h4><p>See what that responsibility means in this model.</p></div>
      <div class="grid2">
        <div class="card"><h3>Public cloud</h3><p>Shared provider infrastructure, rented on demand.</p></div>
        <div class="card"><h3>Private cloud</h3><p>Cloud-style self-service on infrastructure dedicated to one organization.</p></div>
        <div class="card"><h3>Hybrid</h3><p>On-premises systems connected to a public cloud, e.g. a factory system plus cloud analytics.</p></div>
        <div class="card"><h3>Multicloud</h3><p>Using more than one provider, often per workload. Adds integration and skills overhead.</p></div>
      </div>
    </div>
  </div>`,
  notice: 'As you move from on-premises to SaaS, the provider takes over layers from the bottom up. Data and access never fully leave you.',
  myth: 'Managed doesn\'t mean "not my problem". A misconfigured access policy on a fully managed service is still the customer\'s breach.',
  mount(el) {
    let cur = 'iaas', sel = null;
    const stack = el.querySelector('#stack');
    const st = document.createElement('style'); st.textContent = `.stack{display:flex;flex-direction:column-reverse;gap:5px}.lay{display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;border:1.5px solid var(--line);background:var(--panel);cursor:pointer;transition:background .35s,border-color .35s;font-weight:600;text-align:left}.lay[data-r=p]{border-color:var(--blue);background:color-mix(in srgb,var(--blue) 14%,var(--panel))}.lay[data-r=s]{border-color:var(--violet);background:color-mix(in srgb,var(--violet) 14%,var(--panel))}.lay[data-r=c]{border-color:var(--amber);background:color-mix(in srgb,var(--amber) 14%,var(--panel))}.lay .who{font:600 11px var(--f-mono);letter-spacing:.08em;text-transform:uppercase}.lay[data-r=p] .who{color:var(--blue)}.lay[data-r=s] .who{color:var(--violet)}.lay[data-r=c] .who{color:var(--amber)}.lay.sel{outline:2px solid var(--fg)}`;
    el.appendChild(st);
    const btns = RESP_LAYERS.map((L, i) => { const b = document.createElement('button'); b.className = 'lay'; b.type = 'button'; b.setAttribute('role', 'listitem'); b.innerHTML = `<span>${L}</span><span class="who"></span>`; b.onclick = () => { sel = i; paint(); }; stack.appendChild(b); return b; });
    const W = { p: 'Provider', s: 'Shared', c: 'Customer' };
    function paint() {
      const m = RESP[cur];
      btns.forEach((b, i) => { const r = m.r[i]; b.dataset.r = r; b.querySelector('.who').textContent = W[r]; b.classList.toggle('sel', i === sel); });
      const n = { p: 0, s: 0, c: 0 }; [...m.r].forEach(r => n[r]++);
      el.querySelector('#mx').innerHTML = `<h4>${m.l}</h4><p>${m.ex}</p><p>Provider ${n.p} · shared ${n.s} · customer ${n.c} of ${RESP_LAYERS.length} layers. Exact splits vary by service and configuration: check each service's documentation.</p>`;
      if (sel != null) { const L = RESP_LAYERS[sel], r = m.r[sel]; const w = (RESP_WHY[L] || {})[r] || ({ p: 'The provider operates this layer for you; you cannot change it, only rely on it.', c: 'You operate this layer: buy, install, patch, monitor, replace.', s: 'Both sides have duties here.' })[r]; el.querySelector('#lx').innerHTML = `<h4>${L} · ${W[r]}</h4><p>${w}</p>`; }
    }
    U.seg(el.querySelector('#models'), Object.entries(RESP).map(([k, v]) => [k, v.l]), cur, v => { cur = v; paint(); if (v === 'saas') U.markDone('responsibility'); }, 'Service model');
    paint();
  },
  notes: {
    objective: 'Learners can say who patches the OS, who secures data and who manages identities in each service model.',
    say: ['Start on-premises: every layer is yours. Click IaaS: AWS takes the building, hardware and hypervisor. You still patch the operating system.', 'Serverless and SaaS take more layers, but look at the top three: data, identity and security configuration never become purely the provider\'s.'],
    ask: 'Your team uses a SaaS file-sharing product and a link is accidentally made public. Whose responsibility is that?',
    answer: 'The customer\'s: sharing settings and who has access are customer-controlled configuration.',
    transition: 'Rented infrastructure still lives somewhere physical. Where?'
  },
  check: { q: 'On Amazon EC2 (IaaS), who is responsible for patching the guest operating system?', opts: ['AWS', 'The customer', 'Nobody — VMs don\'t need patches', 'It\'s automatic for every instance'], a: 1, why: 'In IaaS the provider runs the hardware and hypervisor; the OS on your instance is yours to patch (tools can automate it, but it\'s your job).' }
});

const REGIONS = [
  ['us-east-1', 'N. Virginia', 38.9, -77.4], ['us-west-2', 'Oregon', 45.8, -119.7], ['sa-east-1', 'São Paulo', -23.5, -46.6], ['eu-west-1', 'Ireland', 53.3, -6.3],
  ['eu-central-1', 'Frankfurt', 50.1, 8.7], ['af-south-1', 'Cape Town', -33.9, 18.4], ['ap-south-1', 'Mumbai', 19.1, 72.9], ['ap-northeast-1', 'Tokyo', 35.7, 139.7], ['ap-southeast-2', 'Sydney', -33.9, 151.2]
];
const LAND = [ // very coarse continent outlines (lon, lat) for a stylized map
  [[-168, 66], [-140, 70], [-95, 72], [-62, 60], [-55, 50], [-75, 40], [-81, 25], [-97, 18], [-87, 15], [-78, 8], [-105, 22], [-117, 32], [-124, 42], [-125, 50], [-150, 60]],
  [[-80, 10], [-62, 11], [-50, 0], [-35, -7], [-40, -22], [-58, -38], [-68, -55], [-75, -45], [-71, -18], [-81, -5]],
  [[-10, 36], [-9, 44], [-2, 48], [-5, 58], [10, 64], [25, 71], [40, 67], [45, 45], [28, 41], [22, 36], [12, 38], [3, 42]],
  [[-17, 21], [-10, 35], [10, 37], [32, 31], [43, 12], [51, 11], [40, -15], [32, -28], [20, -35], [12, -18], [8, 4], [-8, 5]],
  [[45, 45], [40, 67], [70, 73], [110, 77], [140, 72], [180, 68], [160, 58], [140, 50], [122, 40], [121, 25], [108, 18], [104, 1], [97, 17], [90, 22], [80, 8], [72, 22], [57, 25], [50, 30], [36, 35]],
  [[113, -22], [122, -17], [131, -12], [137, -12], [143, -11], [153, -27], [150, -37], [140, -38], [131, -32], [116, -35]]
];
scene({
  id: 'global', section: 'explore', ch: 3, kicker: 'Inside the AWS global infrastructure', title: 'Where does the cloud physically exist?', short: 'Regions & Availability Zones', lab: 'Latency by Region and Availability Zone failure.',
  objectives: ['Explain Regions, Availability Zones and edge locations', 'Estimate latency from distance', 'See why redundancy must include every tier — and enough capacity'],
  html: `
  <div class="split even">
    <div class="col">
      <div class="viz" style="min-height:300px"><div class="cvhost" id="map"></div><div class="vtag">Click the map to move the user</div></div>
      <div class="explain" id="lat"></div>
      <div class="engbox eng-only"><b>Latency estimate</b><p>RTT ≈ 2 × distance × 1.5 ÷ 200,000 km/s + 5 ms. Light in fiber travels ~200,000 km/s; 1.5 approximates indirect cable routes. Real latency depends on routing and congestion — measure it.</p><p>Shown Regions are a sample. The current list and each Region's AZs are in the AWS documentation.</p></div>
    </div>
    <div class="col">
      <div class="controls" id="dep"></div>
      <div class="viz" style="min-height:280px"><div class="cvhost" id="region"></div></div>
      <div class="controls" id="fail"></div>
      <div id="verdict" aria-live="polite"></div>
    </div>
  </div>`,
  notice: 'Two AZs only help if every tier (servers and database) is in both and the survivors have enough capacity.',
  myth: 'Deploying in two Availability Zones does not automatically make an application highly available.',
  mount(el, slide) {
    const k = U.tok(slide); let user = [41.9, -87.6]; let sel = 'us-east-1';
    const dist = (a, b) => { const R = 6371, r = Math.PI / 180; const dl = (b[0] - a[0]) * r, dn = (b[1] - a[1]) * r; const h = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
    const rtt = d => 2 * d * 1.5 / 200000 * 1000 + 5;
    const m = U.canvas(el.querySelector('#map'), drawMap);
    let T;
    function drawMap() {
      const { ctx, W, H } = m; ctx.clearRect(0, 0, W, H);
      const s = Math.min(W / 360, H / 150); const ox = (W - 360 * s) / 2, oy = (H - 150 * s) / 2;
      T = { X: lon => ox + (lon + 180) * s, Y: lat => oy + (80 - lat) * s, lon: x => (x - ox) / s - 180, lat: y => 80 - (y - oy) / s };
      ctx.strokeStyle = k.grid; ctx.lineWidth = 1; for (let lo = -180; lo <= 180; lo += 30) { ctx.beginPath(); ctx.moveTo(T.X(lo), T.Y(80)); ctx.lineTo(T.X(lo), T.Y(-70)); ctx.stroke(); } for (let la = -60; la <= 80; la += 20) { ctx.beginPath(); ctx.moveTo(T.X(-180), T.Y(la)); ctx.lineTo(T.X(180), T.Y(la)); ctx.stroke(); }
      LAND.forEach(poly => { ctx.beginPath(); poly.forEach(([lo, la], i) => i ? ctx.lineTo(T.X(lo), T.Y(la)) : ctx.moveTo(T.X(lo), T.Y(la))); ctx.closePath(); ctx.fillStyle = U.a(k.blue, 0.10); ctx.fill(); ctx.strokeStyle = U.a(k.blue, 0.35); ctx.stroke(); });
      const lats = REGIONS.map(r => ({ r, d: dist(user, [r[2], r[3]]) })).sort((a, b) => a.d - b.d);
      const near = lats[0].r[0];
      REGIONS.forEach(r => { const x = T.X(r[3]), y = T.Y(r[2]); const isSel = r[0] === sel;
        if (r[0] === near || isSel) { ctx.strokeStyle = U.a(isSel ? k.cyan : k.green, 0.6); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(T.X(user[1]), T.Y(user[0])); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]); }
        ctx.fillStyle = isSel ? k.cyan : r[0] === near ? k.green : k.fg; ctx.beginPath(); ctx.arc(x, y, isSel ? 6 : 4.5, 0, 7); ctx.fill();
        ctx.font = k.monoS; ctx.fillStyle = k.muted; ctx.textAlign = 'left'; ctx.fillText(r[0], x + 7, y - 4); });
      ctx.fillStyle = k.amber; ctx.beginPath(); ctx.arc(T.X(user[1]), T.Y(user[0]), 6, 0, 7); ctx.fill(); ctx.fillStyle = k.amber; ctx.font = k.monoB; ctx.fillText('you', T.X(user[1]) + 8, T.Y(user[0]) + 14);
      el.querySelector('#lat').innerHTML = `<h4>Estimated round-trip time from you</h4><div class="tscroll"><table class="t"><tbody>${lats.slice(0, 5).map(({ r, d }) => `<tr><td class="mono">${r[0]}</td><td>${r[1]}</td><td class="mono">${U.fmt(d)} km</td><td class="mono ${r[0] === near ? 'c-green' : ''}">~${U.fmt(rtt(d))} ms</td></tr>`).join('')}</tbody></table></div><p style="margin-top:6px">Nearest Region: <b>${lats[0].r[1]}</b>. Proximity lowers latency, but data-residency rules, service availability and price can matter more.</p>`;
    }
    m.cv.addEventListener('click', e => { const [x, y] = m.pos(e); const lon = T.lon(x), lat = T.lat(y); if (lon < -180 || lon > 180 || lat < -70 || lat > 80) return; const hit = REGIONS.find(r => Math.hypot(T.X(r[3]) - x, T.Y(r[2]) - y) < 10); if (hit) sel = hit[0]; else user = [lat, lon]; drawMap(); });
    // Region zoom: AZ redundancy
    const D = { azs: 2, per: 2, db: 'single', need: 4 }; const down = new Set();
    const rh = el.querySelector('#region'); let F;
    function drawRegion() {
      rh.innerHTML = ''; const AZ = ['a', 'b', 'c'];
      const nodes = { lb: { x: 390, y: 40, label: 'Load balancer', sub: 'spans AZs', w: 170, h: 46 } };
      const bounds = AZ.map((a, i) => ({ x: 20 + i * 250, y: 122, w: 230, h: 236, label: `AZ ${a}${down.has(a) ? ' · UNAVAILABLE' : ''}`, kind: down.has(a) ? 'down' : 'az' }));
      AZ.forEach((a, i) => {
        const used = i < D.azs;
        for (let j = 0; j < D.per; j++) if (used) nodes[`s${a}${j}`] = { x: 135 + i * 250, y: 170 + j * 48, label: 'App server', sub: `AZ ${a}`, w: 150, h: 42 };
        if (i === 0) nodes.db = { x: 135, y: 322, label: D.db === 'multi' ? 'Database (primary)' : 'Database', sub: 'AZ a', w: 180, h: 46 };
        if (i === 1 && D.db === 'multi') nodes.dbs = { x: 385, y: 322, label: 'Database (standby)', sub: 'AZ b · sync replica', w: 180, h: 46 };
      });
      const edges = Object.keys(nodes).filter(n => n[0] === 's' && n !== 'lb').map(n => ['lb', n]);
      F = U.flow(rh, { size: [780, 372], nodes, edges, boundaries: [{ x: 6, y: 72, w: 768, h: 294, label: `REGION ${sel}`, sub: 'conceptual view: the number of AZs varies by Region', kind: 'vpc' }].concat(bounds), label: 'Availability Zones in a Region' });
      Object.keys(nodes).forEach(n => { const az = (nodes[n].sub || '').match(/AZ (\w)/); if (az && down.has(az[1])) F.state(n, 'bad'); else if (n !== 'lb') F.state(n, 'good'); });
      // outcome
      const alive = AZ.slice(0, D.azs).filter(a => !down.has(a)).length * D.per;
      const dbUp = !down.has('a') || (D.db === 'multi' && !down.has('b'));
      const cap = Math.min(alive, D.need);
      let cls, msg;
      if (alive === 0) { cls = 'no'; msg = 'Down: no application servers are left.'; }
      else if (!dbUp) { cls = 'no'; msg = 'Down: servers are running, but the only database was in the failed AZ. Every request that needs data fails.'; }
      else if (alive < D.need) { cls = 'warn'; msg = `Degraded: ${alive} of ${D.need} needed servers remain, so they run overloaded until replacements launch in healthy AZs.`; }
      else { cls = 'ok'; msg = down.size ? `Available: ${alive} servers remain (${D.need} needed)${D.db === 'multi' && down.has('a') ? ' and the database failed over to its standby after a short interruption' : ''}.` : `Healthy: ${alive} servers across ${D.azs} AZ${D.azs > 1 ? 's' : ''}; ${D.need} are needed for current traffic.`; }
      el.querySelector('#verdict').innerHTML = `<div class="verdict ${cls}">${msg}</div>`;
      if (down.size && cls === 'ok') U.markDone('global');
    }
    const dep = el.querySelector('#dep');
    U.seg(dep, [['1', '1 AZ'], ['2', '2 AZs'], ['3', '3 AZs']], '2', v => { D.azs = +v; drawRegion(); }, 'AZs used');
    U.slider(dep, { label: 'Servers per AZ', min: 1, max: 4, step: 1, value: D.per }, v => { D.per = v; drawRegion(); });
    U.seg(dep, [['single', 'Single-AZ DB'], ['multi', 'Multi-AZ DB']], 'single', v => { D.db = v; drawRegion(); }, 'Database');
    const fl = el.querySelector('#fail');
    ['a', 'b', 'c'].forEach(a => { const b = U.btn(fl, `Fail AZ ${a}`, () => { if (down.has(a)) down.delete(a); else down.add(a); b.setAttribute('aria-pressed', String(down.has(a))); drawRegion(); }, 'warn'); b.setAttribute('aria-pressed', 'false'); });
    fl.insertAdjacentHTML('beforeend', `<span class="c-muted" style="font-size:13px">Traffic needs ${D.need} servers.</span>`);
    drawRegion();
    return () => m.destroy();
  },
  notes: {
    objective: 'Learners can explain Regions vs AZs, and see that availability depends on every tier plus remaining capacity.',
    say: ['A Region is a geographic area. Inside it, Availability Zones are separate groups of data centers with independent power and networking, close enough for fast links.', 'Default: 2 AZs, 2 servers each, single-AZ database. Fail AZ b: fine. Now fail AZ a: the servers in b are alive, but the database was in a. The app is down.', 'Switch to Multi-AZ DB and 1 server per AZ, then fail an AZ: available, but degraded, because one server can\'t carry four servers\' load.'],
    ask: 'Your users are in Brazil but regulations require customer data to stay in the EU. Which Region do you choose?',
    answer: 'An EU Region: data-residency requirements override latency. Use a CDN for static content to soften latency.',
    transition: 'We know where things run. What do we actually build there?'
  },
  check: { q: 'Servers run in AZs a and b, but the only database instance is in AZ a. AZ a fails. What happens?', opts: ['Nothing — the app is multi-AZ', 'Requests needing data fail until the database is restored', 'The load balancer moves the database', 'Only performance degrades'], a: 1, why: 'Redundancy is only as strong as the least redundant tier. The database needs a standby (or a multi-AZ service) too.' }
});

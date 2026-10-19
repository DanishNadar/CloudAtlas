/* New simulators: serverless · CDN · queues · database scaling · Kubernetes scheduling · the monthly bill */

/* ======================= SERVERLESS ======================= */
scene({
  id: 'serverless', after: 'assemble', section: 'explore', ch: 4, kicker: 'Building blocks · serverless', title: 'What happens when a serverless function scales?', short: 'Serverless functions', ic: ['fn', 'compute'],
  lab: 'Cold starts, scale to zero, concurrency limits and provisioned capacity — with a cost comparison.',
  objectives: ['Explain how functions scale out per request and back to zero', 'See where cold starts come from and how to reduce them', 'Compare pay-per-use with always-on servers'],
  html: `
  <div class="split" style="grid-template-columns:minmax(290px,0.9fr) minmax(0,2.1fr)">
    <div class="rail">
      <p class="lede">With functions (<span class="pv aws">Lambda</span>, <span class="pv azure">Azure Functions</span>, <span class="pv gcp">Cloud Run functions</span>), each concurrent request gets its own instance — created on demand, discarded when idle.</p>
      <div id="pat"></div>
      <div class="controls stack" id="ctl"></div>
      <div class="tiles" id="tiles"></div>
      <div class="explain" id="why" aria-live="polite"></div>
      <div class="engbox eng-only"><b>Model (illustrative)</b><p>Poisson arrivals. A request uses an idle warm instance if one exists; otherwise a new instance starts (cold start) unless the concurrency limit is reached, in which case the request is throttled. Idle instances are discarded after the keep-warm time. Provisioned instances stay warm (and are billed) continuously.</p><p>Prices: $0.20 per million requests, $0.000017 per GB-second, $0.01 per provisioned instance-hour, $0.05 per server-hour — illustrative round numbers, not any provider's list price.</p></div>
    </div>
    <div class="col">
      <div class="viz" style="min-height:260px"><div class="cvhost" id="cv"></div><div class="vtag">function instances · 1 s = 1 s</div></div>
      <div class="viz" style="min-height:170px;flex:0.6"><div class="cvhost" id="ch"></div></div>
    </div>
  </div>`,
  notice: 'In the "quiet periods" pattern every instance disappears between bursts, so the first requests of each burst pay the cold-start delay (amber).',
  myth: '"Serverless" does not mean there are no servers. It means you never see, size or patch them — and you pay only while your code runs.',
  mount(el, slide) {
    const k = U.tok(slide); const P = Object.assign({}, SIM.faasDefaults); let S = SIM.Faas(P);
    U.seg(el.querySelector('#pat'), [['steady', 'Steady'], ['bursty', 'Bursty'], ['idle', 'Quiet periods']], P.pattern, v => { P.pattern = v; S.set({ pattern: v }); }, 'Traffic pattern');
    const c = el.querySelector('#ctl');
    U.slider(c, { label: 'Requests / second', min: 1, max: 60, step: 1, value: P.rate }, v => S.set({ rate: v }));
    U.slider(c, { label: 'Cold start', min: 100, max: 3000, step: 100, value: P.coldMs, fmt: v => v + ' ms' }, v => S.set({ coldMs: v }));
    U.slider(c, { label: 'Keep warm when idle', min: 2, max: 60, step: 1, value: P.keepWarmS, fmt: v => v + ' s' }, v => S.set({ keepWarmS: v }));
    U.slider(c, { label: 'Concurrency limit', min: 2, max: 60, step: 1, value: P.maxConc }, v => S.set({ maxConc: v }));
    U.slider(c, { label: 'Provisioned (always warm)', min: 0, max: 10, step: 1, value: 0 }, v => S.set({ provisioned: v }));
    const cv = U.canvas(el.querySelector('#cv'), draw), ch = U.canvas(el.querySelector('#ch'), drawCh);
    const hist = []; let acc = 0, dots = [];
    function draw() {
      const { ctx, W, H } = cv; ctx.clearRect(0, 0, W, H);
      // request stream
      dots.forEach(d => { ctx.fillStyle = d.cold ? k.amber : d.th ? k.red : '#FF9900'; ctx.globalAlpha = 1 - d.u * 0.6; ctx.beginPath(); ctx.arc(20 + d.u * 128, U.lerp(d.y, H / 2 - 20, d.u), 3.4, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1;
      ctx.font = k.monoS; ctx.fillStyle = k.dim; ctx.textAlign = 'left'; ctx.fillText('requests →', 16, H - 12);
      const x0 = 170, cw = 66, chh = 50, cols = Math.max(1, Math.floor((W - x0 - 10) / cw)); const rows = Math.ceil(Math.max(1, S.inst.length) / cols); const y0 = Math.max(28, (H - 40 - rows * (chh + 10)) / 2);
      ctx.strokeStyle = U.a(k.fg, .12); ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(150, 30); ctx.lineTo(150, H - 40); ctx.stroke(); ctx.setLineDash([]);
      S.inst.forEach((it, i) => {
        const x = x0 + (i % cols) * cw, y = y0 + Math.floor(i / cols) * (chh + 10); const st = S.status(it);
        if (st !== 'idle') { ctx.strokeStyle = U.a(st === 'cold' ? k.amber : '#FF9900', .25); ctx.beginPath(); ctx.moveTo(150, H / 2 - 20); ctx.lineTo(x, y + chh / 2); ctx.stroke(); }
        ctx.fillStyle = st === 'cold' ? U.a(k.amber, 0.25 + 0.2 * Math.sin(performance.now() / 120)) : st === 'busy' ? U.a('#FF9900', 0.55) : U.a(k.fg, 0.06);
        ctx.strokeStyle = it.prov ? k.violet : st === 'cold' ? k.amber : st === 'busy' ? '#FF9900' : k.line; ctx.lineWidth = it.prov ? 2 : 1.4; ctx.setLineDash(it.prov ? [4, 3] : []);
        ctx.beginPath(); ctx.roundRect(x, y, cw - 8, chh, 7); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = st === 'idle' ? k.dim : k.fg; ctx.font = "600 15px 'JetBrains Mono', monospace"; ctx.textAlign = 'center'; ctx.fillText(st === 'cold' ? '…' : 'ƒ', x + (cw - 8) / 2, y + 31);
      });
      if (!S.inst.length) { ctx.fillStyle = k.dim; ctx.font = k.sans; ctx.textAlign = 'center'; ctx.fillText('scaled to zero — no instances, no cost', x0 + (W - x0) / 2, H / 2); }
      ctx.textAlign = 'left'; ctx.font = k.monoS; [[k.amber, 'cold start'], ['#FF9900', 'busy'], [k.dim, 'idle (warm)'], [k.violet, 'provisioned']].forEach(([cc, l], i) => { ctx.fillStyle = cc; ctx.fillRect(x0 + i * 120, H - 18, 10, 10); ctx.fillStyle = k.muted; ctx.fillText(l, x0 + 16 + i * 120, H - 9); });
    }
    function drawCh() {
      const ymax = Math.max(500, ...hist.map(h => h.p95)) * 1.1;
      U.chart(ch, { k, x: [0, 60], y: [0, ymax], xTicks: 6, yTicks: 3, xFmt: v => (v - 60) + 's', yFmt: v => U.fmt(v) + 'ms', yLabel: 'p95 latency per second', legend: true, padR: 40,
        series: [{ data: hist.map(h => h.p95), color: k.amber, label: 'p95 latency', width: 2 }, { data: hist.map(h => h.n / Math.max(1, S.p.maxConc) * ymax), color: k.blue, label: 'instances (scaled)', width: 1.4, dash: [4, 3] }] });
    }
    const tiles = el.querySelector('#tiles'), why = el.querySelector('#why');
    const stop = U.loop(dt => {
      S.step(dt);
      const fresh = S.recent.filter(r => r.t > S.t - dt);
      fresh.slice(0, 6).forEach(r => dots.push({ u: 0, y: 30 + Math.random() * (cv.H - 70), cold: r.cold, th: r.lat === null }));
      dots = dots.filter(d => (d.u += dt * 1.6) < 1);
      acc += dt;
      if (acc >= 1) {
        acc = 0; const last = S.recent.filter(r => r.t > S.t - 1 && r.lat !== null).map(r => r.lat);
        hist.push({ p95: SIM.pct(last, 0.95), n: S.inst.length }); if (hist.length > 60) hist.shift(); ch.draw();
        const r10 = S.recent.filter(r => r.lat !== null); const cs = S.invocations ? S.cold / S.invocations : 0;
        const avgRate = S.invocations / Math.max(1, S.t); const month = avgRate * 2592000;
        const fnM = month / 1e6 * 0.2 + month * P.memGB * P.execMs / 1000 * 0.000017 + S.p.provisioned * 720 * 0.01; const srv = 2 * 720 * 0.05;
        U.tiles(tiles, [['Instances now', S.inst.length, ''], ['Cold starts', `${S.cold} · ${U.fmt(cs * 100, 1)}%`, cs > 0.05 ? 'warn' : 'good', 'of all requests'],
          ['p95 latency (10 s)', U.fmt(SIM.pct(r10.map(r => r.lat), 0.95)) + ' ms', SIM.pct(r10.map(r => r.lat), 0.95) > 600 ? 'warn' : 'good'], ['Throttled', S.throttled, S.throttled ? 'bad' : 'good', 'concurrency limit hit'],
          ['Monthly at this rate', `${U.money(fnM)} vs ${U.money(srv)}`, fnM < srv ? 'good' : 'warn', 'functions vs 2 always-on servers']]);
        why.innerHTML = S.throttled > 0 && S.recent.some(r => r.lat === null) ? '<h4>Throttling</h4><p>Every instance is busy and the concurrency limit stops new ones, so requests are rejected (HTTP 429). Raise the limit, or put a queue in front for work that can wait.</p>'
          : cs > 0.05 ? `<h4>Cold starts are visible</h4><p>${U.fmt(cs * 100, 1)}% of requests waited for a new instance to start. Longer keep-warm, provisioned instances, smaller packages and faster runtimes all reduce this.</p>`
          : `<h4>Smooth</h4><p>Warm instances absorb the traffic. At this rate functions would cost about ${U.money(fnM)} a month, versus ${U.money(srv)} for two always-on servers (illustrative prices). ${fnM < srv ? 'Low or spiky traffic favors pay-per-use.' : 'Steady high traffic can favor servers or containers.'}</p>`;
        if (S.t > 20 && S.cold > 3) U.markDone('serverless');
      }
      draw();
    });
    return () => { stop(); cv.destroy(); ch.destroy(); };
  },
  notes: {
    objective: 'Learners can explain scale-to-zero, cold starts, concurrency limits and when functions are cheaper.',
    say: ['Each orange box is one copy of the function handling one request at a time. More concurrent requests, more boxes.', 'In "Quiet periods" all boxes vanish between bursts. That is scale to zero: you pay nothing. The price is a cold start when traffic returns.', 'Provisioned instances (violet) are kept warm and billed continuously — a dial between latency and cost.'],
    demo: ['Quiet periods → watch amber cold starts at each burst.', 'Provisioned 5 → cold starts drop.', 'Rate 60, concurrency 10 → throttling.', 'Compare monthly cost at rate 2 vs 60.'],
    ask: 'Would you run a video-transcoding job that takes 30 minutes per file in a function?',
    answer: 'Usually not: functions have maximum run times and per-ms pricing. A container job or VM fits long-running work better.',
    transition: 'Back to the bigger architecture: how do servers and networks connect inside a VPC?'
  },
  check: { q: 'What causes a cold start?', opts: ['The database is slow', 'No warm instance is free, so a new one must be created and initialized', 'The CDN cache expired', 'The function ran out of memory'], a: 1, why: 'A new execution environment must be started and your code loaded before it can handle the request.' }
});

/* ======================= CDN ======================= */
const EDGES = [['Ashburn', 39.0, -77.5], ['Chicago', 41.9, -87.6], ['Los Angeles', 34.0, -118.2], ['São Paulo', -23.5, -46.6], ['London', 51.5, -0.1], ['Frankfurt', 50.1, 8.7], ['Johannesburg', -26.2, 28.0], ['Mumbai', 19.1, 72.9], ['Singapore', 1.35, 103.8], ['Tokyo', 35.7, 139.7], ['Sydney', -33.9, 151.2]];
const CITIES = [[40.7, -74, 8], [41.9, -87.6, 4], [34, -118, 6], [19.4, -99.1, 4], [-23.5, -46.6, 5], [-34.6, -58.4, 2], [51.5, -0.1, 5], [48.9, 2.35, 4], [52.5, 13.4, 3], [6.5, 3.4, 3], [30, 31.2, 3], [-26.2, 28, 2], [19.1, 72.9, 7], [28.6, 77.2, 6], [1.35, 103.8, 4], [-6.2, 106.8, 4], [35.7, 139.7, 6], [37.6, 127, 4], [31.2, 121.5, 5], [-33.9, 151.2, 3]];
scene({
  id: 'cdn', after: 'surge', section: 'explore', ch: 6, kicker: 'Scaling · edge caching', title: 'How does a CDN make a global app fast?', short: 'CDN edge caching', ic: ['cdn', 'network'],
  lab: 'Requests from around the world hit edge caches or travel to the origin; tune TTL and popularity.',
  objectives: ['Explain cache hits, misses and TTL', 'See how a CDN cuts both latency and origin load', 'Understand why popular content caches well'],
  html: `
  <div class="split rev" style="grid-template-columns:minmax(0,2.2fr) minmax(270px,0.9fr)">
    <div class="col">
      <div class="viz" style="min-height:320px"><div class="cvhost" id="map"></div><div class="vtag">green = served by a nearby edge · amber = had to reach the origin</div></div>
      <div class="viz" style="min-height:140px;flex:0.45"><div class="cvhost" id="ch"></div></div>
    </div>
    <div class="rail">
      <p class="lede">Pixelpost's origin is in one Region (N. Virginia). A CDN (<span class="pv aws">CloudFront</span>, <span class="pv azure">Front Door</span>, <span class="pv gcp">Cloud CDN</span>) keeps copies at edge locations near users.</p>
      <div class="controls" id="on"></div>
      <div class="controls stack" id="ctl"></div>
      <div class="controls" id="btns"></div>
      <div class="tiles" id="tiles"></div>
      <div class="engbox eng-only"><b>Model (illustrative)</b><p>40 requests/s from weighted world cities; each goes to the nearest of 11 sample edge locations. Objects follow a Zipf popularity distribution. A cached copy is fresh for the TTL. Latency ≈ fiber round trip (distance × 1.5 ÷ 200,000 km/s × 2) + 4 ms; misses add the edge-to-origin trip and 20 ms of origin time. Real CDNs have many more locations, tiered caches and capacity limits.</p></div>
    </div>
  </div>`,
  notice: 'Turn the CDN off: every dot becomes a long amber line to Virginia, latency for Sydney and Mumbai jumps, and the origin receives every single request.',
  myth: 'A CDN is not only for static files or big companies. Even small apps use one for HTTPS, caching and absorbing traffic spikes.',
  mount(el, slide) {
    const k = U.tok(slide);
    const S = SIM.Cdn({ edges: EDGES.map(e => [e[1], e[2]]), ttl: 60, rate: 40 });
    const wsum = CITIES.reduce((s, c) => s + c[2], 0);
    const pickUser = r => { let x = r() * wsum; for (const c of CITIES) { x -= c[2]; if (x <= 0) return [c[0] + (r() - .5) * 6, c[1] + (r() - .5) * 8]; } return [CITIES[0][0], CITIES[0][1]]; };
    U.seg(el.querySelector('#on'), [['1', 'CDN on'], ['0', 'CDN off']], '1', v => { S.set({ on: v === '1' }); }, 'CDN');
    const c = el.querySelector('#ctl');
    U.slider(c, { label: 'Cache TTL', min: 2, max: 600, step: 2, value: 60, fmt: v => v < 120 ? v + ' s' : (v / 60).toFixed(0) + ' min' }, v => S.set({ ttl: v }));
    U.slider(c, { label: 'Popularity skew', min: 0.5, max: 1.5, step: 0.05, value: 1, fmt: v => v.toFixed(2) }, v => S.set({ zipf: v }));
    U.slider(c, { label: 'Catalog size (objects)', min: 50, max: 5000, step: 50, value: 300 }, v => S.set({ objects: v }));
    U.btn(el.querySelector('#btns'), 'Invalidate all caches', () => S.reset(), 'warn');
    const m = U.canvas(el.querySelector('#map'), () => {}); const ch = U.canvas(el.querySelector('#ch'), drawCh);
    let arcs = []; const hist = []; let acc = 0; let T;
    function base() {
      const { ctx, W, H } = m; ctx.clearRect(0, 0, W, H);
      const s = Math.min(W / 360, H / 150); const ox = (W - 360 * s) / 2, oy = (H - 150 * s) / 2;
      T = { X: lon => ox + (lon + 180) * s, Y: lat => oy + (80 - lat) * s };
      LAND.forEach(poly => { ctx.beginPath(); poly.forEach(([lo, la], i) => i ? ctx.lineTo(T.X(lo), T.Y(la)) : ctx.moveTo(T.X(lo), T.Y(la))); ctx.closePath(); ctx.fillStyle = U.a(k.blue, 0.09); ctx.fill(); ctx.strokeStyle = U.a(k.blue, 0.3); ctx.lineWidth = 1; ctx.stroke(); });
    }
    const arc = (ctx, a, b, col, w, alpha) => { const x1 = T.X(a[1]), y1 = T.Y(a[0]), x2 = T.X(b[1]), y2 = T.Y(b[0]); const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - Math.hypot(x2 - x1, y2 - y1) * 0.25; ctx.strokeStyle = U.a(col, alpha); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke(); };
    function draw() {
      base(); const { ctx } = m; const now = S.t;
      arcs.forEach(a => { const age = now - a.t; const al = Math.max(0, 1 - age / 1.2); if (a.hit) arc(ctx, a.u, EDGES[a.ei].slice(1), k.green, 1.5, al * 0.9); else if (a.ei < 0) arc(ctx, a.u, S.p.origin, k.amber, 1.2, al * 0.8); else { arc(ctx, a.u, EDGES[a.ei].slice(1), k.amber, 1.2, al * 0.7); arc(ctx, EDGES[a.ei].slice(1), S.p.origin, k.amber, 1.6, al * 0.8); }
        ctx.fillStyle = U.a(a.hit ? k.green : k.amber, al); ctx.beginPath(); ctx.arc(T.X(a.u[1]), T.Y(a.u[0]), 2.4, 0, 7); ctx.fill(); });
      if (S.p.on) EDGES.forEach((e, i) => { const fill = S.caches[i].size / S.p.objects; const x = T.X(e[2]), y = T.Y(e[1]); ctx.fillStyle = U.a(k.cyan, 0.18); ctx.beginPath(); ctx.arc(x, y, 7 + 8 * Math.min(1, fill), 0, 7); ctx.fill(); ctx.fillStyle = k.cyan; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); });
      const o = S.p.origin; ctx.fillStyle = '#FF9900'; ctx.beginPath(); ctx.roundRect(T.X(o[1]) - 7, T.Y(o[0]) - 7, 14, 14, 3); ctx.fill(); ctx.font = k.monoS; ctx.fillStyle = k.fg; ctx.textAlign = 'left'; ctx.fillText('origin', T.X(o[1]) + 10, T.Y(o[0]) + 4);
    }
    function drawCh() { U.chart(ch, { k, x: [0, 60], y: [0, 100], xTicks: 6, yTicks: 2, xFmt: v => (v - 60) + 's', yFmt: v => v + '%', yLabel: 'cache hit ratio & origin share', legend: true, padR: 40, series: [{ data: hist.map(h => h.hit), color: k.green, label: 'hit ratio', width: 2 }, { data: hist.map(h => h.org), color: k.amber, label: 'origin share', width: 1.5 }] }); }
    const tiles = el.querySelector('#tiles');
    const stop = U.loop(dt => {
      const reqs = S.step(dt, pickUser); reqs.forEach(r => arcs.push({ u: r.u, hit: r.hit, ei: r.ei, t: S.t }));
      arcs = arcs.filter(a => S.t - a.t < 1.2); acc += dt; draw();
      if (acc >= 1) {
        acc = 0; const rc = S.recent; const hits = rc.filter(r => r.hit).length; const hr = rc.length ? hits / rc.length * 100 : 0; const org = 100 - (S.p.on ? hr : 0);
        hist.push({ hit: S.p.on ? hr : 0, org }); if (hist.length > 60) hist.shift(); ch.draw();
        const avg = rc.length ? rc.reduce((s, r) => s + r.lat, 0) / rc.length : 0; const far = rc.filter(r => r.lat > 150).length / Math.max(1, rc.length) * 100;
        U.tiles(tiles, [['Hit ratio (10 s)', S.p.on ? U.fmt(hr) + '%' : 'off', hr > 80 ? 'good' : hr > 40 ? '' : 'warn'], ['Origin load', U.fmt(rc.length ? rc.filter(r => !r.hit).length / 10 : 0, 1) + ' req/s', org > 50 ? 'warn' : 'good', `of ${S.p.rate} req/s total`], ['Avg latency', U.fmt(avg) + ' ms', avg > 120 ? 'warn' : 'good'], ['Slow (>150 ms)', U.fmt(far) + '%', far > 20 ? 'bad' : '', 'of requests']]);
        if (S.p.on && hr > 85) U.markDone('cdn');
      }
    });
    return () => { stop(); m.destroy(); ch.destroy(); };
  },
  notes: {
    objective: 'Learners understand caching at the edge, TTL trade-offs and the double benefit: speed and origin offload.',
    say: ['Every dot is a request. Green: answered by a nearby edge. Amber: the edge had to fetch from Virginia.', 'Hit ratio climbs as edges warm up. Popular objects are requested often, so they stay cached.', 'Short TTL = fresher content but more misses. Long TTL = fast and cheap, but changes take longer to appear — unless you invalidate.'],
    demo: ['Watch warm-up → Invalidate all caches → TTL 4 s → catalog 5000 + skew 0.5 → CDN off.'],
    ask: 'Pixelpost updates a user\'s avatar but the old one keeps showing. What happened, and what are two fixes?',
    answer: 'The edge serves a cached copy until the TTL expires. Fix: version the URL (avatar-v2.jpg) or invalidate the path; use short TTLs for frequently changing objects.',
    transition: 'Caches absorb reads. What absorbs bursts of work? Queues.'
  },
  check: { q: 'You raise the TTL from 10 seconds to 10 minutes. What happens?', opts: ['Hit ratio falls and origin load rises', 'Hit ratio rises and origin load falls, but updates take longer to appear', 'Latency rises for everyone', 'Nothing — TTL only affects DNS'], a: 1, why: 'Cached copies stay fresh longer, so more requests are hits — at the cost of serving older content until expiry or invalidation.' }
});

/* ======================= QUEUES ======================= */
scene({
  id: 'queue', after: 'cdn', section: 'explore', ch: 6, kicker: 'Scaling · decoupling', title: 'How do queues keep a system calm during a burst?', short: 'Message queues', ic: ['queue', 'integration'],
  lab: 'Producers, a queue, consumers, visibility timeouts, retries and a dead-letter queue.',
  objectives: ['Explain decoupling with a message queue', 'See backlog grow and drain', 'Understand retries, visibility timeouts and dead-letter queues'],
  html: `
  <div class="split" style="grid-template-columns:minmax(290px,0.9fr) minmax(0,2.1fr)">
    <div class="rail">
      <p class="lede">Pixelpost resizes every uploaded photo. Instead of making uploads wait, the upload service drops a message on a queue (<span class="pv aws">SQS</span>, <span class="pv azure">Service Bus</span>, <span class="pv gcp">Pub/Sub</span>) and workers process it when they can.</p>
      <div id="mode"></div>
      <div class="controls stack" id="ctl"></div>
      <div class="tiles" id="tiles"></div>
      <div class="explain" id="why" aria-live="polite"></div>
      <div class="engbox eng-only"><b>Semantics modeled</b><p>At-least-once delivery: a received message becomes invisible for the visibility timeout. If the worker deletes it (success) it is gone; if the worker crashes or fails, it reappears and is retried. After the maximum receive count it moves to the dead-letter queue. Consumers must therefore be idempotent.</p></div>
    </div>
    <div class="col">
      <div class="viz" style="min-height:300px"><div class="cvhost" id="cv"></div></div>
      <div class="viz" style="min-height:140px;flex:0.5"><div class="cvhost" id="ch"></div></div>
    </div>
  </div>`,
  notice: 'Switch to "Direct calls" during a burst: requests that arrive while every worker is busy are simply lost. With the queue they wait, and the backlog drains afterwards.',
  myth: 'A queue does not make work disappear. If consumers are slower than producers on average, the backlog grows forever — you still need enough workers.',
  mount(el, slide) {
    const k = U.tok(slide); const P = Object.assign({}, SIM.mqDefaults, { burst: true, rate: 3, consumers: 5 }); const S = SIM.Mq(P);
    U.seg(el.querySelector('#mode'), [['1', 'With a queue'], ['0', 'Direct calls']], '1', v => S.set({ useQueue: v === '1' }), 'Mode');
    const c = el.querySelector('#ctl');
    U.check(c, { label: 'Upload bursts (×6 every 20 s)', checked: true }, v => S.set({ burst: v }));
    U.slider(c, { label: 'Uploads / second', min: 1, max: 15, step: 1, value: P.rate }, v => S.set({ rate: v }));
    U.slider(c, { label: 'Workers', min: 1, max: 12, step: 1, value: P.consumers }, v => S.set({ consumers: v }));
    U.slider(c, { label: 'Seconds per photo', min: 0.2, max: 2, step: 0.1, value: P.procS, fmt: v => v.toFixed(1) + ' s' }, v => S.set({ procS: v }));
    U.slider(c, { label: 'Corrupt ("poison") uploads', min: 0, max: 20, step: 1, value: 0, fmt: v => v + '%' }, v => S.set({ poisonPct: v }));
    const ev = U.slider(c, { label: 'Visibility timeout', min: 1, max: 15, step: 1, value: P.visS, fmt: v => v + ' s' }, v => S.set({ visS: v })); ev.el.classList.add('eng-only');
    U.check(c, { label: 'Workers crash' }, v => S.set({ crashed: v }));
    const cv = U.canvas(el.querySelector('#cv'), draw), ch = U.canvas(el.querySelector('#ch'), drawCh);
    const hist = []; let acc = 0, fl = [], lastSent = 0, lastDone = 0, lastDlq = 0, lastDrop = 0;
    function draw() {
      const { ctx, W, H } = cv; ctx.clearRect(0, 0, W, H);
      const px = 60, qx0 = W * 0.26, qx1 = W * 0.66, qy = H * 0.42, cx = W * 0.84;
      // producers
      for (let i = 0; i < 3; i++) { const y = qy - 70 + i * 70; ctx.fillStyle = U.a(k.blue, .15); ctx.strokeStyle = k.blue; ctx.beginPath(); ctx.roundRect(px - 34, y - 20, 68, 40, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = k.fg; ctx.font = k.monoS; ctx.textAlign = 'center'; ctx.fillText('upload', px, y + 4); }
      // queue tube
      ctx.strokeStyle = P.useQueue === false || !S.p.useQueue ? U.a(k.line, .5) : k.cyan; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(qx0, qy - 26, qx1 - qx0, 52, 26); ctx.stroke();
      ctx.fillStyle = k.dim; ctx.font = k.monoS; ctx.textAlign = 'center'; ctx.fillText(S.p.useQueue ? `queue · ${S.depth()} waiting` : 'no queue: calls go straight to workers', (qx0 + qx1) / 2, qy - 36);
      const sz = 12, cap = Math.floor((qx1 - qx0 - 20) / (sz + 3)) * 2; const q = S.q.slice(0, cap);
      q.forEach((mm, i) => { const col = Math.floor(i / 2), row = i % 2; const x = qx1 - 14 - col * (sz + 3) - sz, y = qy - sz - 1 + row * (sz + 3); const inv = mm.visibleAt > S.t; ctx.fillStyle = mm.poison ? k.red : inv ? U.a(k.cyan, .35) : k.cyan; ctx.fillRect(x, y, sz, sz); });
      if (S.q.length > cap) { ctx.fillStyle = k.amber; ctx.font = k.monoB; ctx.textAlign = 'left'; ctx.fillText('+' + (S.q.length - cap), qx0 + 6, qy + 44); }
      // consumers
      const n = S.cons.length, gap = Math.min(52, (H - 80) / n), gy = (H - 40 - n * gap) / 2;
      S.cons.forEach((cn, i) => { const y = gy + i * gap + gap / 2; const busy = !!cn.msg && !S.p.crashed; ctx.fillStyle = S.p.crashed ? U.a(k.red, .2) : busy ? U.a('#FF9900', .35) : U.a(k.fg, .05); ctx.strokeStyle = S.p.crashed ? k.red : busy ? '#FF9900' : k.line; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.roundRect(cx - 40, y - Math.min(18, gap / 2 - 3), 80, Math.min(36, gap - 6), 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = k.fg; ctx.font = k.monoS; ctx.textAlign = 'center'; ctx.fillText(S.p.crashed ? 'crashed' : busy ? 'resizing' : 'idle', cx, y + 4); });
      // DLQ
      ctx.strokeStyle = k.red; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.roundRect((qx0 + qx1) / 2 - 100, H - 52, 200, 36, 8); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = k.red; ctx.font = k.monoS; ctx.fillText(`dead-letter queue · ${S.dlq}`, (qx0 + qx1) / 2, H - 30);
      // flights
      fl.forEach(f => { const x = U.lerp(f.x0, f.x1, f.u), y = U.lerp(f.y0, f.y1, f.u); ctx.fillStyle = f.c; ctx.globalAlpha = 1 - f.u * 0.3; ctx.fillRect(x - 5, y - 5, 10, 10); }); ctx.globalAlpha = 1;
      draw.geo = { px, qx0, qx1, qy, cx, W, H };
    }
    function drawCh() { const ymax = Math.max(20, ...hist.map(h => h.d)) * 1.15; U.chart(ch, { k, x: [0, 60], y: [0, ymax], xTicks: 6, yTicks: 2, xFmt: v => (v - 60) + 's', yLabel: 'backlog (messages waiting) · lost', legend: true, padR: 40, series: [{ data: hist.map(h => h.d), color: k.cyan, label: 'backlog', fill: U.a(k.cyan, .1) }, { data: hist.map(h => h.lost), color: k.red, label: 'lost / s', width: 1.5 }] }); }
    const tiles = el.querySelector('#tiles'), why = el.querySelector('#why');
    const stop = U.loop(dt => {
      S.step(dt); const g = draw.geo;
      if (g && !U.RM) {
        for (let i = lastSent; i < S.sent && i < lastSent + 4; i++) { const y = g.qy - 70 + (i % 3) * 70; fl.push({ x0: g.px + 34, y0: y, x1: S.p.useQueue ? g.qx0 + 10 : g.cx - 40, y1: g.qy, u: 0, c: k.cyan }); }
        for (let i = lastDone; i < S.done && i < lastDone + 3; i++) fl.push({ x0: g.cx + 40, y0: g.qy, x1: g.W - 6, y1: g.qy, u: 0, c: k.green });
        for (let i = lastDlq; i < S.dlq; i++) fl.push({ x0: (g.qx0 + g.qx1) / 2, y0: g.qy + 26, x1: (g.qx0 + g.qx1) / 2, y1: g.H - 40, u: 0, c: k.red });
        for (let i = lastDrop; i < S.dropped && i < lastDrop + 3; i++) fl.push({ x0: g.cx - 60, y0: g.qy, x1: g.cx - 60, y1: g.H + 10, u: 0, c: k.red });
      }
      const lostNow = S.dropped - lastDrop;
      lastSent = S.sent; lastDone = S.done; lastDlq = S.dlq; lastDrop = S.dropped;
      fl = fl.filter(f => (f.u += dt * 2.2) < 1); draw();
      acc += dt; hist.lost = (hist.lost || 0) + lostNow;
      if (acc >= 1) {
        acc = 0; hist.push({ d: S.depth(), lost: hist.lost }); hist.lost = 0; if (hist.length > 60) hist.shift(); ch.draw();
        const cap = S.p.consumers / S.p.procS; const avgIn = S.p.rate * (S.p.burst ? 2 : 1);
        U.tiles(tiles, [['Backlog', S.depth(), S.depth() > 50 ? 'warn' : 'good'], ['Oldest message', U.fmt(S.oldest(), 1) + ' s', S.oldest() > 20 ? 'warn' : ''], ['Processed', S.done, 'good'], ['Lost (no queue)', S.dropped, S.dropped ? 'bad' : 'good'], ['Retries · DLQ', `${S.retries} · ${S.dlq}`, S.dlq ? 'warn' : ''], ['Worker capacity', U.fmt(cap, 1) + '/s', cap < avgIn ? 'bad' : 'good', `vs ${U.fmt(avgIn, 1)}/s average input`]]);
        why.innerHTML = S.p.crashed ? '<h4>Workers are down — nothing is lost</h4><p>Messages keep arriving and wait safely in the queue. In-flight messages reappear after their visibility timeout. Restart the workers and watch the backlog drain.</p>'
          : !S.p.useQueue && S.dropped ? '<h4>Direct calls drop work under load</h4><p>Without a buffer, an upload that arrives when every worker is busy fails immediately. The user sees an error, or the photo is never resized.</p>'
          : cap < avgIn ? '<h4>Consumers are too slow</h4><p>On average, more messages arrive than workers can process, so the backlog grows without limit. Add workers or make each one faster.</p>'
          : S.dlq ? '<h4>Poison messages are quarantined</h4><p>Corrupt uploads fail every time. After the maximum receive count they move to the dead-letter queue, so they stop blocking other work and an engineer can inspect them.</p>'
          : '<h4>The queue absorbs bursts</h4><p>During each burst the backlog rises; workers drain it between bursts. Producers and consumers are decoupled: each can scale and fail independently.</p>';
        if (S.p.useQueue && S.done > 150) U.markDone('queue');
      }
    });
    return () => { stop(); cv.destroy(); ch.destroy(); };
  },
  notes: {
    objective: 'Learners can explain decoupling, backlog, at-least-once delivery, retries and DLQs.',
    say: ['Producers drop messages into the queue; workers pull them. Neither has to wait for the other.', 'Bursts make the backlog rise; it drains in the quiet time. Switch to direct calls: the same burst loses work.', 'Crash the workers: the queue keeps everything. Add poison messages: they are retried, then moved to the dead-letter queue.'],
    demo: ['With queue + bursts → Direct calls → back → crash workers 10 s → uncrash → poison 10% → workers 1.'],
    ask: 'Why must a queue consumer be idempotent?',
    answer: 'With at-least-once delivery the same message can be processed twice (e.g. after a timeout), so processing must give the same result if repeated.',
    transition: 'Queues decouple compute. Next: where does all this data live?'
  },
  check: { q: 'A worker crashes while processing a message. With a queue like SQS, Service Bus or Pub/Sub, what happens to the message?', opts: ['It is lost', 'It becomes visible again after a timeout and another worker retries it', 'The queue deletes it immediately', 'The producer is notified to resend it'], a: 1, why: 'The message is only deleted after successful processing; otherwise it reappears and is redelivered.' }
});

/* ======================= DATABASE SCALING ======================= */
scene({
  id: 'dbscale', after: 'storage', section: 'explore', ch: 7, kicker: 'Storage & databases · scaling', title: 'How do databases scale: replicas and shards', short: 'Replicas & shards', ic: ['db', 'database'],
  lab: 'Replication lag and stale reads; failover data loss; modulo vs consistent-hash sharding.',
  objectives: ['Explain read replicas and replication lag', 'See why async replication can lose recent writes on failover', 'Compare modulo and consistent hashing when adding shards'],
  html: `<div id="tabs"></div><div id="pane" class="col" style="flex:1"></div>`,
  notice: 'Replicas multiply reads but not writes; shards split both reads and writes — at the price of routing every query by its key.',
  mount(el, slide) {
    const k = U.tok(slide); const pane = el.querySelector('#pane'); let cleanup = null;
    const tabs = U.tabs(el.querySelector('#tabs'), [['rep', 'Replication'], ['shard', 'Sharding']], v => { if (cleanup) cleanup(); cleanup = v === 'rep' ? rep() : shard(); });
    function rep() {
      pane.innerHTML = `<div class="split" style="grid-template-columns:minmax(280px,0.9fr) minmax(0,2fr)"><div class="rail"><p class="lede">Read replicas copy the primary's changes and serve reads. Copies take time to arrive: <b>replication lag</b>.</p><div class="controls stack" id="ctl"></div><div class="controls" id="btns"></div><div id="verdict" aria-live="polite"></div><div class="explain" id="why"></div></div><div class="col"><div class="viz grid" style="min-height:380px"><div class="cvhost" id="fl"></div></div></div></div>`;
      const P = { lagMs: 400, readAfterMs: 100, readFrom: 'replica', mode: 'async' }; let ver = { p: 1, r1: 1, r2: 1 }; let dead = false, busy = false, primary = 'p';
      const F = U.flow(pane.querySelector('#fl'), { size: [900, 440], nodes: { app: { x: 120, y: 220, label: 'App server', sub: 'writes & reads' }, p: { x: 470, y: 110, label: 'Primary', sub: 'v1', w: 170 }, r1: { x: 470, y: 260, label: 'Replica 1', sub: 'v1', w: 170 }, r2: { x: 470, y: 380, label: 'Replica 2', sub: 'v1', w: 170 } }, edges: [['app', 'p'], ['app', 'r1'], ['app', 'r2'], ['p', 'r1', 'dash'], ['p', 'r2', 'dash']], label: 'Primary database with read replicas' });
      const sub = id => { const t = F.N[id].g.querySelector('.fns'); if (t) t.textContent = (id === primary ? 'primary · ' : '') + 'profile v' + ver[id]; };
      const lab = (id, l) => { F.N[id].g.querySelector('.fnt').textContent = l; };
      ['p', 'r1', 'r2'].forEach(sub);
      const c = pane.querySelector('#ctl');
      U.seg(c, [['async', 'Asynchronous'], ['sync', 'Synchronous']], P.mode, v => P.mode = v, 'Replication mode');
      U.slider(c, { label: 'Replication lag', min: 0, max: 2000, step: 50, value: P.lagMs, fmt: v => v + ' ms' }, v => P.lagMs = v);
      U.slider(c, { label: 'Read right after write', min: 0, max: 2000, step: 50, value: P.readAfterMs, fmt: v => v + ' ms later' }, v => P.readAfterMs = v);
      U.seg(c, [['replica', 'Read from replica'], ['primary', 'Read your writes from primary']], P.readFrom, v => P.readFrom = v, 'Read target');
      const verdict = pane.querySelector('#verdict'), why = pane.querySelector('#why');
      const wait = ms => new Promise(r => setTimeout(r, U.RM ? 0 : ms));
      const scale = 1.6;
      async function writeRead() {
        if (busy || dead) return; busy = true; F.clear();
        const R = SIM.replication(P); const target = P.readFrom === 'primary' ? primary : (primary === 'r1' ? 'r2' : 'r1');
        const replicas = ['p', 'r1', 'r2'].filter(x => x !== primary && !(x === 'p' && dead));
        F.edgeOn('app', primary); await F.packet('app', primary, 'pk', 450); ver[primary]++; sub(primary); F.state(primary, 'on');
        const newV = ver[primary];
        const repl = replicas.map(rid => (async () => { await wait(R.lag * scale); F.edgeOn(primary, rid); await F.packet(primary, rid, 'pk', 300); ver[rid] = Math.max(ver[rid], newV); sub(rid); F.state(rid, 'done'); })());
        if (P.mode === 'sync') await Promise.all(repl);
        await F.packet(primary, 'app', 'pk ret', 350);
        await wait(P.readAfterMs * scale);
        F.edgeOn('app', target); await F.packet('app', target, 'pk', 350); const got = ver[target]; F.state(target, got < newV ? 'bad' : 'good'); await F.packet(target, 'app', got < newV ? 'pk bad' : 'pk ret', 350);
        verdict.innerHTML = got < newV ? `<div class="verdict no">Stale read: the user saved profile v${newV} but saw v${got}. The change had not reached ${F.N[target].label} yet.</div>` : `<div class="verdict ok">Fresh read: the user sees v${newV}.</div>`;
        why.innerHTML = got < newV ? '<h4>Read-your-writes problem</h4><p>Async replication returns success before replicas have the change. Fixes: read from the primary right after a user\'s own write, use synchronous replication, or wait for the replica to catch up.</p>' : P.mode === 'sync' ? '<h4>Synchronous replication</h4><p>The write is only acknowledged after replicas have it, so reads are fresh — but every write now waits for the slowest replica.</p>' : '<h4>Lucky timing</h4><p>The read happened after the change arrived. Shorten the delay or raise the lag to see a stale read.</p>';
        await Promise.all(repl); busy = false; U.markDone('dbscale');
      }
      async function failPrimary() {
        if (busy || dead) return; busy = true; F.clear();
        // a write lands on the primary, then the primary dies before replicating (async)
        F.edgeOn('app', 'p'); await F.packet('app', 'p', 'pk', 400); ver.p++; sub('p'); const lost = P.mode === 'async' && P.lagMs > 0;
        if (!lost) { for (const r of ['r1', 'r2']) { await F.packet('p', r, 'pk', 250); ver[r] = ver.p; sub(r); } }
        F.state('p', 'bad'); lab('p', 'Primary · FAILED'); dead = true; await wait(600);
        primary = 'r1'; lab('r1', 'Replica 1 → new primary'); F.state('r1', 'warn'); sub('r1'); sub('r2');
        verdict.innerHTML = lost ? `<div class="verdict no">Failover complete, but the last write (v${ver.p}) is lost: it never reached a replica before the primary failed.</div>` : `<div class="verdict ok">Failover complete with no data loss: replicas had every acknowledged write.</div>`;
        why.innerHTML = '<h4>Failover</h4><p>A replica is promoted to primary. With asynchronous replication, writes inside the lag window can be lost (RPO > 0). Managed multi-AZ databases use synchronous standbys to avoid this for the primary copy.</p><p>Press Reset to try again.</p>';
        busy = false;
      }
      const b = pane.querySelector('#btns');
      U.btn(b, 'Save profile, then read it', writeRead, 'primary'); U.btn(b, 'Fail the primary', failPrimary, 'warn');
      U.btn(b, 'Reset', () => { ver = { p: 1, r1: 1, r2: 1 }; dead = false; busy = false; primary = 'p'; lab('p', 'Primary'); lab('r1', 'Replica 1'); F.clear(); ['p', 'r1', 'r2'].forEach(sub); verdict.innerHTML = ''; why.innerHTML = ''; });
      why.innerHTML = '<h4>Try it</h4><p>Click "Save profile, then read it" with the defaults: the read arrives before the copy does.</p>';
      return null;
    }
    function shard() {
      pane.innerHTML = `<div class="split" style="grid-template-columns:minmax(280px,0.9fr) minmax(0,2fr)"><div class="rail"><p class="lede">Sharding splits data by key across several databases. Each user lives on exactly one shard.</p><div id="meth"></div><div class="controls" id="btns"></div><div class="controls stack" id="ctl"></div><div class="tiles" id="tiles"></div><div class="explain" id="why"></div><div class="engbox eng-only"><b>Model</b><p>240 user IDs hashed with FNV-1a. Modulo: shard = hash mod N. Consistent hashing: each shard owns 64 points on a hash ring; a key belongs to the next point clockwise. "Moved" counts keys whose shard changes when N changes.</p></div></div><div class="col"><div class="viz" style="min-height:400px"><div class="cvhost" id="cv"></div></div></div></div>`;
      const K = 240; let n = 4, method = 'mod', hot = false; let pos = [], target = [], moved = new Set(), anim = 1;
      const cv = U.canvas(pane.querySelector('#cv'), draw);
      const layout = (nn) => { const per = {}; const out = []; for (let i = 0; i < K; i++) { const s = SIM.shardOf(i, nn, method); per[s] = (per[s] || 0) + 1; out.push([s, per[s] - 1]); } return out; };
      const xy = ([s, j], nn) => { const W = cv.W, H = cv.H; const colW = (W - 40) / nn; const cols = Math.max(2, Math.floor((colW - 16) / 11)); return [20 + s * colW + 12 + (j % cols) * 11, H - 70 - Math.floor(j / cols) * 11]; };
      function draw() {
        const { ctx, W, H } = cv; ctx.clearRect(0, 0, W, H); const colW = (W - 40) / n;
        const load = new Array(n).fill(0); for (let i = 0; i < K; i++) load[target[i][0]] += hot && i === 7 ? 70 : 1;
        const maxL = Math.max(...load);
        for (let s = 0; s < n; s++) { const x = 20 + s * colW; ctx.strokeStyle = k.line; ctx.fillStyle = U.a(k.blue, .05); ctx.beginPath(); ctx.roundRect(x + 4, 40, colW - 8, H - 100, 10); ctx.fill(); ctx.stroke(); ctx.fillStyle = k.fg; ctx.font = k.sans; ctx.textAlign = 'center'; ctx.fillText('Shard ' + (s + 1), x + colW / 2, 28);
          const lw = (colW - 24) * load[s] / Math.max(maxL, 1); ctx.fillStyle = load[s] === maxL && hot ? k.red : k.blue; ctx.fillRect(x + 12, H - 46, lw, 8); ctx.fillStyle = k.dim; ctx.font = k.monoS; ctx.fillText('load ' + load[s], x + colW / 2, H - 20); }
        for (let i = 0; i < K; i++) { const a = pos[i], b = xy(target[i], n); const e = 1 - Math.pow(1 - anim, 3); const x = a ? U.lerp(a[0], b[0], e) : b[0], y = a ? U.lerp(a[1], b[1], e) : b[1]; ctx.fillStyle = hot && i === 7 ? k.red : moved.has(i) ? k.amber : k.cyan; ctx.beginPath(); ctx.arc(x, y, hot && i === 7 ? 5 : 3.6, 0, 7); ctx.fill(); }
      }
      const tiles = pane.querySelector('#tiles'), why = pane.querySelector('#why');
      let stopA = null;
      const go = (nn, explain) => {
        const old = target.length ? target.map(t => xy(t, n)) : null; const oldS = target.map(t => t[0]);
        const frac = target.length ? SIM.shardMove(K, n, nn, method) : 0;
        n = nn; target = layout(n); moved = new Set(oldS.length ? target.map((t, i) => t[0] !== oldS[i] ? i : -1).filter(i => i >= 0) : []);
        pos = old || []; anim = old && !U.RM ? 0 : 1;
        if (stopA) stopA(); stopA = U.loop(dt => { anim = Math.min(1, anim + dt * 1.1); draw(); if (anim >= 1) { stopA(); stopA = null; } }); draw();
        U.tiles(tiles, [['Shards', n, ''], ['Keys moved', explain ? U.fmt(frac * 100) + '%' : '—', explain ? (frac > 0.5 ? 'bad' : 'good') : '', explain ? `${moved.size} of ${K} users` : 'change the shard count'], ['Method', method === 'mod' ? 'hash mod N' : 'consistent hashing', '']]);
        if (explain) why.innerHTML = method === 'mod' ? `<h4>Modulo reshuffles almost everything</h4><p>Changing N changes hash mod N for most keys, so ${U.fmt(frac * 100)}% of users must be copied to a different shard — a huge, risky migration.</p>` : `<h4>Consistent hashing moves only a slice</h4><p>The new shard takes over part of the ring from its neighbors, so only ${U.fmt(frac * 100)}% of users move — roughly 1 ÷ N of the data.</p>`;
        if (explain && method === 'consistent') U.markDone('dbscale');
      };
      U.seg(pane.querySelector('#meth'), [['mod', 'hash mod N'], ['consistent', 'Consistent hashing']], method, v => { method = v; target = []; go(n, false); }, 'Method');
      const b = pane.querySelector('#btns'); U.btn(b, '+ Add shard', () => { if (n < 8) go(n + 1, true); }, 'primary'); U.btn(b, '− Remove shard', () => { if (n > 2) go(n - 1, true); });
      U.check(pane.querySelector('#ctl'), { label: 'A celebrity user gets 70× normal traffic (hot key)' }, v => { hot = v; draw(); why.innerHTML = v ? '<h4>Hot partition</h4><p>One very popular key overloads its shard no matter how many shards exist. Fixes: cache that key, split it into sub-keys, or replicate it for reads.</p>' : ''; });
      go(4, false); why.innerHTML = '<h4>Add a shard</h4><p>Amber dots are users that have to move. Compare the two methods.</p>';
      return () => { if (stopA) stopA(); cv.destroy(); };
    }
    return () => { if (cleanup) cleanup(); };
  },
  notes: {
    objective: 'Learners can explain replication lag, read-your-writes, failover data loss, and why consistent hashing exists.',
    say: ['Replicas copy the primary. With async replication the write returns before the copy arrives, so a read 100 ms later can be stale.', 'Fail the primary during the lag window: the last write is gone. That is why managed multi-AZ databases replicate synchronously to a standby.', 'Sharding: add one shard with modulo hashing and most users move. Consistent hashing moves about 1 ÷ N.'],
    demo: ['Replication: defaults → stale; read from primary → fresh; sync mode → fresh but slower; fail primary async.', 'Sharding: add shard (mod), switch to consistent, add shard; hot key.'],
    ask: 'Your app shows a user an old profile picture right after they changed it. What is the cheapest fix?',
    answer: 'Read from the primary (or a session-consistent path) for that user\'s own reads shortly after their write.',
    transition: 'Data is placed. Who is allowed to touch it? Security and IAM.'
  },
  check: { q: 'With asynchronous replication, the primary fails 50 ms after acknowledging a write. Lag is 300 ms. What may happen?', opts: ['Nothing; replicas always have every write', 'The write may be lost, because it had not reached any replica yet', 'The write is duplicated', 'Reads become faster'], a: 1, why: 'Async replication acknowledges before copying, so writes inside the lag window can be lost on failover.' }
});

/* ======================= KUBERNETES ======================= */
const K8_APPS = { web: ['Web', 0.5, 0.5, '#F28C1E'], api: ['API', 1, 1, '#E8478B'], worker: ['Worker', 2, 3, '#4E7BF6'] };
scene({
  id: 'k8s', after: 'containers', section: 'explore', ch: 9, kicker: 'Deployment · orchestration', title: 'What does Kubernetes actually do with your containers?', short: 'Kubernetes scheduling', ic: ['cluster', 'compute'],
  lab: 'Schedule pods onto nodes, kill a node, autoscale the cluster and roll out an update.',
  objectives: ['Explain nodes, pods, requests and the scheduler', 'Watch self-healing after a node failure', 'See pending pods trigger cluster autoscaling, and a rolling update'],
  html: `
  <div class="split" style="grid-template-columns:minmax(290px,0.9fr) minmax(0,2.1fr)">
    <div class="rail">
      <p class="lede">You declare <b>what</b> should run ("6 web pods, 0.5 CPU each"). The <b>scheduler</b> decides <b>where</b>, and controllers keep reality matching your declaration. Managed as <span class="pv aws">EKS</span>, <span class="pv azure">AKS</span>, <span class="pv gcp">GKE</span>.</p>
      <div class="controls stack" id="ctl"></div>
      <div id="strat"></div>
      <div class="controls" id="btns"></div>
      <div class="tiles" id="tiles"></div>
      <div class="explain" id="why" aria-live="polite"></div>
      <div class="engbox eng-only"><b>Model</b><p>Nodes: 4 vCPU, 8 GB each. Pods are placed by CPU/memory requests, largest first; existing pods stay where they are. "Bin-pack" picks the fullest node that fits; "Spread" prefers the node with fewest replicas of the same app. Cluster autoscaler adds a node 3 s after pods are pending (real ones take minutes) and removes empty extra nodes. Rolling update: maxSurge 1, maxUnavailable 0.</p></div>
    </div>
    <div class="col">
      <div class="viz" style="min-height:400px;overflow:auto"><div class="kc" id="k8c"><div class="knodes" id="nodes"></div><div class="kpend"><span class="mono c-dim">Pending pods (no node has room)</span><div id="pend"></div></div></div></div>
    </div>
  </div>`,
  notice: 'Kill a node: its pods turn pending for a moment, then reappear elsewhere. Nobody ran a command — the controller noticed the difference between desired and actual state.',
  myth: 'Kubernetes does not make an app highly available by itself. If every replica lands on one node, or there is no spare capacity, a node failure still takes it down.',
  mount(el) {
    const R = { web: 6, api: 3, worker: 2 }; let strategy = 'spread', auto = false, version = { web: 1 };
    let nodes = [1, 2, 3].map(i => ({ id: 'n' + i, cpu: 4, mem: 8, up: true, auto: false })); let assign = {}; let pods = [];
    let pendSince = null, emptySince = {}, rolling = null;
    const mkPods = () => { const out = []; Object.keys(R).forEach(a => { for (let i = 0; i < R[a]; i++) out.push({ id: `${a}-${a === 'web' ? 'v' + version.web + '-' : ''}${i}`, app: a, cpu: K8_APPS[a][1], mem: K8_APPS[a][2], v: a === 'web' ? version.web : 1 }); }); if (rolling) rolling.extra.forEach(p => out.push(p)); return out; };
    const c = el.querySelector('#ctl');
    Object.keys(R).forEach(a => U.slider(c, { label: `${K8_APPS[a][0]} replicas (${K8_APPS[a][1]} CPU)`, min: 0, max: a === 'worker' ? 6 : 12, step: 1, value: R[a] }, v => { R[a] = v; sched(); }));
    U.check(c, { label: 'Cluster autoscaler' }, v => { auto = v; });
    U.seg(el.querySelector('#strat'), [['spread', 'Spread replicas'], ['pack', 'Bin-pack']], strategy, v => { strategy = v; assign = {}; sched(); }, 'Strategy');
    const btns = el.querySelector('#btns');
    U.btn(btns, `${U.icon('swap')} Rolling update (web)`, () => startRoll(), 'primary');
    U.btn(btns, '+ Add node', () => { nodes.push({ id: 'n' + (nodes.length + 1), cpu: 4, mem: 8, up: true }); sched(); });
    const NE = el.querySelector('#nodes'), PE = el.querySelector('#pend'), tiles = el.querySelector('#tiles'), why = el.querySelector('#why');
    function startRoll() {
      if (rolling) return; const old = version.web; version.web++; const target = R.web; let done = 0;
      rolling = { extra: [], left: target };
      // replace old pods one at a time: surge one new pod, then remove one old pod
      const step = () => {
        if (done >= target) { rolling = null; sched(); why.innerHTML = `<h4>Rollout complete</h4><p>All ${target} web pods run v${version.web}. At no point were fewer than ${target} pods serving — maxSurge 1, maxUnavailable 0.</p>`; U.markDone('k8s'); return; }
        done++; rolling.done = done; sched(); setTimeout(step, U.RM ? 50 : 900);
      };
      rolling.old = old; rolling.done = 0; step();
    }
    function desired() {
      let out = mkPods();
      if (rolling) { out = out.filter(p => p.app !== 'web'); const n = R.web, d = rolling.done; for (let i = 0; i < Math.min(d, n); i++) out.push({ id: `web-v${version.web}-${i}`, app: 'web', cpu: .5, mem: .5, v: version.web }); for (let i = d; i < n; i++) out.push({ id: `web-v${rolling.old}-${i}`, app: 'web', cpu: .5, mem: .5, v: rolling.old }); if (d < n) out.push({ id: `web-v${version.web}-${d}`, app: 'web', cpu: .5, mem: .5, v: version.web, surge: true }); }
      return out;
    }
    function sched() {
      pods = desired(); assign = SIM.schedule(nodes, pods, strategy, assign);
      // FLIP animation
      const before = {}; el.querySelectorAll('.pod').forEach(p => before[p.dataset.id] = p.getBoundingClientRect());
      const podHtml = p => `<span class="pod ${p.app} ${p.v > 1 ? 'v2' : ''}" data-id="${p.id}" style="--c:${K8_APPS[p.app][3]};flex-basis:${p.cpu * 22}%" title="${p.id}">${K8_APPS[p.app][0]}${p.app === 'web' ? ` v${p.v}` : ''}</span>`;
      NE.innerHTML = nodes.map(n => { const ps = pods.filter(p => assign[p.id] === n.id); const cpu = ps.reduce((s, p) => s + p.cpu, 0), mem = ps.reduce((s, p) => s + p.mem, 0);
        return `<div class="knode ${n.up ? '' : 'down'} ${n.auto ? 'auto' : ''}"><div class="kh">${U.icon('server')}<b>${n.id}</b>${n.auto ? '<span class="pill c-green">autoscaled</span>' : ''}<button class="btn ${n.up ? 'warn' : 'good'}" data-n="${n.id}">${n.up ? 'Kill node' : 'Restore'}</button></div>
          <div class="kpods">${ps.map(podHtml).join('')}</div><div class="bars"><span>CPU</span><i style="--w:${cpu / n.cpu * 100}%"></i><span>RAM</span><i style="--w:${mem / n.mem * 100}%"></i></div></div>`; }).join('');
      const pend = pods.filter(p => !assign[p.id]); PE.innerHTML = pend.map(podHtml).join('') || '<span class="c-dim" style="font-size:13px">none</span>';
      NE.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { const n = nodes.find(x => x.id === b.dataset.n); n.up = !n.up; if (!n.up) why.innerHTML = `<h4>${n.id} failed</h4><p>Its pods are gone. The controllers see fewer pods than desired and create replacements; the scheduler places them on healthy nodes${pods.filter(p => !assign[p.id]).length ? ', if there is room' : ''}.</p>`; sched(); });
      if (!U.RM) el.querySelectorAll('.pod').forEach(p => { const b = before[p.dataset.id]; const a = p.getBoundingClientRect(); if (b) { const dx = b.left - a.left, dy = b.top - a.top; if (dx || dy) p.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.2,.8,.2,1)' }); } else p.animate([{ transform: 'scale(.3)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 350 }); });
      const up = nodes.filter(n => n.up); const req = pods.filter(p => assign[p.id]).reduce((s, p) => s + p.cpu, 0);
      U.tiles(tiles, [['Nodes up', `${up.length}/${nodes.length}`, up.length < nodes.length ? 'warn' : ''], ['Pods running', `${pods.length - pend.length}/${pods.length}`, pend.length ? 'warn' : 'good'], ['Pending', pend.length, pend.length ? 'bad' : 'good'], ['CPU requested', Math.round(req / Math.max(1, up.length * 4) * 100) + '%', '', 'of healthy nodes']]);
      if (pend.length && !auto && !rolling) why.innerHTML = '<h4>Pods are pending</h4><p>No healthy node has enough free CPU or memory for them. Add a node, lower the replicas, or turn on the cluster autoscaler.</p>';
    }
    const tick = setInterval(() => {
      const pend = pods.filter(p => !assign[p.id]).length;
      if (auto && pend) { pendSince = pendSince || Date.now(); if (Date.now() - pendSince > 3000 && nodes.length < 8) { nodes.push({ id: 'n' + (nodes.length + 1), cpu: 4, mem: 8, up: true, auto: true }); pendSince = null; why.innerHTML = '<h4>Cluster autoscaler added a node</h4><p>Pods were pending because no node had room, so the autoscaler asked the cloud provider for a new VM and joined it to the cluster.</p>'; sched(); } } else pendSince = null;
      if (auto) nodes.filter(n => n.auto && n.up).forEach(n => { const used = pods.some(p => assign[p.id] === n.id); if (!used) { emptySince[n.id] = emptySince[n.id] || Date.now(); if (Date.now() - emptySince[n.id] > 8000) { nodes = nodes.filter(x => x !== n); delete emptySince[n.id]; sched(); } } else delete emptySince[n.id]; });
    }, 500);
    sched();
    why.innerHTML = '<h4>Desired state: 6 web, 3 API, 2 workers</h4><p>Drag the replica sliders, kill a node, or start a rolling update. Switch Spread vs Bin-pack to see where pods land.</p>';
    return () => clearInterval(tick);
  },
  notes: {
    objective: 'Learners understand declarative desired state, scheduling by resource requests, self-healing and rolling updates.',
    say: ['You never say "run this on node 2". You say "I want 6 web pods". The scheduler finds room by each pod\'s CPU and memory request.', 'Kill a node: replacements are created automatically. That loop — compare desired with actual, fix the difference — is the heart of Kubernetes.', 'Workers to 6 with 3 nodes: pending. Turn on the cluster autoscaler: a node appears.'],
    demo: ['Kill n1 → restore. Workers 6 → autoscaler on. Bin-pack vs spread, then kill the node holding most web pods. Rolling update.'],
    ask: 'With Bin-pack, all web pods end up on one node. Why is that risky, and what setting fixes it?',
    answer: 'One node failure takes out every replica. Spread them (topology spread constraints / pod anti-affinity) across nodes and zones.',
    transition: 'Containers are running. Now how do we know they are healthy? Operations.'
  },
  check: { q: 'A node fails. What does Kubernetes do with the pods that were on it?', opts: ['Nothing until an operator restarts them', 'Creates replacement pods and schedules them on nodes with free capacity', 'Moves the running memory of those pods live to another node', 'Deletes the Deployment'], a: 1, why: 'Controllers notice fewer pods than desired and create new ones; the scheduler places them where requests fit. Pods are replaced, not migrated.' }
});

/* ======================= THE CLOUD BILL ======================= */
scene({
  id: 'bill', after: 'cost', section: 'explore', ch: 11, kicker: 'Cost · the meter', title: 'Watch the meter: where does a monthly cloud bill come from?', short: 'Cloud bill simulator', ic: ['dollar', 'cost'],
  lab: 'Build a small environment and play a month hour by hour, with schedules, commitments and budget alerts.',
  objectives: ['See which line items drive a cloud bill', 'Compare 24/7, business-hours schedules and commitments', 'Use budgets and alerts to catch surprises early'],
  html: `
  <div class="split" style="grid-template-columns:minmax(290px,0.9fr) minmax(0,2.1fr)">
    <div class="rail">
      <div class="controls stack" id="ctl"></div>
      <div class="engbox eng-only"><b>Illustrative prices (editable)</b><div class="controls stack" id="px"></div><p>Round numbers chosen to show the mechanics, not any provider's list prices. Use each provider's pricing calculator for real estimates.</p></div>
    </div>
    <div class="col">
      <div class="meterbar"><div class="odo" id="odo" aria-live="off">$0</div><div><div class="mono c-dim" id="clock">Day 1 · 00:00</div><div class="controls" id="play"></div></div><div class="toast" id="toast" role="status"></div></div>
      <div class="viz auto" style="padding:10px 12px"><div class="heat" id="heat" aria-label="Cost per hour across the month"></div><div class="mono c-dim" style="font-size:11px;margin-top:4px">columns = 30 days, rows = 24 hours (midnight at top) · brighter = more spend</div></div>
      <div class="split even" style="flex:1;gap:12px"><div class="viz" style="min-height:190px"><div class="cvhost" id="ch"></div></div><div class="card" id="brk"></div></div>
    </div>
  </div>`,
  notice: 'Switch compute to business hours: the heat map goes dark at night and on weekends, and the compute line drops by about two-thirds. Then tick "Forgot a GPU instance".',
  myth: 'The biggest surprises are rarely the main servers. They are things left running, data transfer out of the cloud, and storage that only ever grows.',
  mount(el, slide) {
    const k = U.tok(slide); const P = Object.assign({}, SIM.billDefaults); let B, h = 0, playing = true, speed = 24;
    const c = el.querySelector('#ctl');
    U.slider(c, { label: 'Virtual machines', min: 0, max: 20, step: 1, value: P.vms }, v => { P.vms = v; calc(); });
    U.seg(c, [['always', 'Run 24/7'], ['business', 'Business hours only']], P.schedule, v => { P.schedule = v; calc(); }, 'Schedule');
    U.check(c, { label: `1-year commitment on VMs (−${P.commitDisc}%, billed every hour)` }, v => { P.commit = v; calc(); });
    U.check(c, { label: 'Managed database (24/7)', checked: true }, v => { P.db = v; calc(); });
    U.slider(c, { label: 'Storage', min: 0, max: 5000, step: 100, value: P.storageGB, fmt: v => U.fmt(v) + ' GB' }, v => { P.storageGB = v; calc(); });
    U.slider(c, { label: 'Data transfer out', min: 0, max: 5000, step: 100, value: P.egressGB, fmt: v => U.fmt(v) + ' GB' }, v => { P.egressGB = v; calc(); });
    U.slider(c, { label: 'Function requests', min: 0, max: 200, step: 5, value: P.fnM, fmt: v => v + ' M' }, v => { P.fnM = v; calc(); });
    U.check(c, { label: 'Forgot a GPU instance running' }, v => { P.gpu = v; calc(); });
    U.slider(c, { label: 'Monthly budget', min: 100, max: 5000, step: 50, value: P.budget, fmt: v => U.money(v) }, v => { P.budget = v; calc(); });
    const px = el.querySelector('#px');
    [['vmRate', 'VM $/hour', 0.01, 1, 0.01], ['dbRate', 'Database $/hour', 0.05, 2, 0.05], ['storageRate', 'Storage $/GB-month', 0.005, 0.1, 0.001], ['egressRate', 'Transfer out $/GB', 0.01, 0.2, 0.01], ['fnRate', 'Functions $/million', 0.1, 2, 0.1], ['gpuRate', 'GPU $/hour', 0.5, 10, 0.5]].forEach(([f, l, mn, mx, st]) => U.slider(px, { label: l, min: mn, max: mx, step: st, value: P[f], fmt: v => '$' + (+v).toFixed(st < 0.01 ? 3 : 2) }, v => { P[f] = v; calc(); }));
    const heat = el.querySelector('#heat'); heat.innerHTML = Array.from({ length: 720 }, (_, i) => `<i data-h="${i}"></i>`).join('');
    const cells = [...heat.children];
    const ch = U.canvas(el.querySelector('#ch'), drawCh);
    const COL = { Compute: '#F28C1E', Database: '#4E7BF6', Storage: '#5FA829', 'Data transfer': '#9061F9', Functions: '#E8478B', GPU: '#F2554A' };
    let alerted = { a80: false, a100: false };
    function calc() { B = SIM.bill(P); alerted = { a80: B.at80 !== null && B.at80 < h, a100: B.at100 !== null && B.at100 < h }; paint(true); }
    const toast = el.querySelector('#toast');
    const showToast = (msg, cls) => { toast.className = 'toast show ' + cls; toast.innerHTML = `${U.icon('bell')} ${msg}`; clearTimeout(showToast.t); showToast.t = setTimeout(() => toast.className = 'toast', 3500); };
    function paint(all) {
      const maxH = Math.max(...B.hourly, 0.01);
      cells.forEach((cel, i) => { if (all || i <= h) { const v = i <= h ? B.hourly[i] / maxH : 0; cel.style.setProperty('--v', v.toFixed(3)); cel.classList.toggle('on', i <= h); } });
      const cum = B.cum[Math.min(719, Math.floor(h))];
      el.querySelector('#odo').textContent = U.money(cum);
      const d = Math.floor(h / 24) + 1, hr = Math.floor(h % 24); el.querySelector('#clock').textContent = `Day ${Math.min(30, d)} · ${String(hr).padStart(2, '0')}:00 · projected month ${U.money(B.total)}`;
      const so = {}; Object.keys(B.cats).forEach(c2 => so[c2] = B.cats[c2].slice(0, Math.floor(h) + 1).reduce((s, v) => s + v, 0));
      el.querySelector('#brk').innerHTML = `<h3>Bill so far</h3>${Object.entries(so).filter(([c2]) => B.totals[c2] > 0).map(([c2, v]) => `<div class="brow"><span><i style="background:${COL[c2]}"></i>${c2}</span><span class="mono">${U.money(v)}</span><div class="bbar"><b style="width:${v / Math.max(cum, 0.01) * 100}%;background:${COL[c2]}"></b></div></div>`).join('')}<p class="c-dim" style="margin-top:8px;font-size:13px">Full month: ${Object.entries(B.totals).filter(([, v]) => v > 0).map(([c2, v]) => `${c2} ${U.money(v)}`).join(' · ')}</p>`;
      ch.draw();
      if (!alerted.a80 && B.at80 !== null && h >= B.at80) { alerted.a80 = true; showToast(`Budget alert: 80% of ${U.money(P.budget)} reached on day ${Math.floor(B.at80 / 24) + 1}`, 'warn'); }
      if (!alerted.a100 && B.at100 !== null && h >= B.at100) { alerted.a100 = true; showToast(`Budget exceeded on day ${Math.floor(B.at100 / 24) + 1}`, 'bad'); }
    }
    function drawCh() { if (!B) return; const ymax = Math.max(B.total, P.budget) * 1.1; const upto = Math.floor(h) + 1;
      U.chart(ch, { k, x: [0, 720], y: [0, ymax], xTicks: 5, yTicks: 3, xFmt: v => 'day ' + Math.round(v / 24 + 1), yFmt: v => '$' + U.fmt(v), yLabel: 'cumulative spend', legend: true, hlines: [{ v: P.budget, color: k.red, label: 'budget' }, { v: P.budget * 0.8, color: k.amber, label: '80% alert' }],
        series: [{ data: B.cum, color: U.a(k.fg, .25), label: 'projected', width: 1, dash: [3, 3] }, { data: B.cum.slice(0, upto), color: '#FF9900', label: 'actual', width: 2.4, dot: true }] }); }
    const pl = el.querySelector('#play');
    const bp = U.btn(pl, 'Pause', () => { playing = !playing; bp.textContent = playing ? 'Pause' : 'Play'; }, 'primary');
    U.btn(pl, 'Restart month', () => { h = 0; alerted = { a80: false, a100: false }; playing = true; bp.textContent = 'Pause'; paint(true); });
    U.seg(pl, [['24', '1 day/s'], ['96', '4 days/s'], ['720', 'Skip to end']], '24', v => { if (v === '720') { h = 719; paint(true); } else speed = +v; }, 'Speed');
    calc();
    const stop = U.loop(dt => { if (!playing || h >= 719) return; h = Math.min(719, h + dt * speed); paint(false); if (h >= 719) { U.markDone('bill'); bp.textContent = 'Play'; playing = false; } });
    return () => { stop(); ch.destroy(); clearTimeout(showToast.t); };
  },
  notes: {
    objective: 'Learners can read a cloud bill by line item and know the levers: schedules, commitments, cleanup and budgets.',
    say: ['Each square is one hour of the month. The meter runs every hour something exists.', 'Business hours only: 60 of 168 hours a week, so compute drops by about two-thirds. That is why dev environments get shut down at night.', 'A commitment is cheaper per hour but billed every hour, even when you turn the machines off — so don\'t combine it with a schedule.', 'Forgot a GPU: the budget alert is your safety net.'],
    demo: ['Play a month → business hours → commitment on (see it cost more than business hours) → GPU on → watch the alert toast.', 'Raise data transfer to 5,000 GB.'],
    ask: 'Your dev environment runs 4 VMs 24/7. What two changes cut its cost the most without touching production?',
    answer: 'Schedule it to run only in working hours, and right-size or delete idle resources. Add a budget alert so forgotten resources are caught.',
    transition: 'Next we apply all of this to the most expensive workloads in the cloud: AI.'
  },
  check: { q: 'Why can a 1-year commitment cost more than on-demand for a dev environment that only runs in business hours?', opts: ['Commitments have a setup fee', 'Commitments are billed for every hour of the term whether you use them or not', 'On-demand prices drop at night', 'Dev environments cannot use commitments'], a: 1, why: 'You pay the discounted rate 24/7. If the machines run only ~36% of the time, on-demand billing only for those hours can be cheaper.' }
});

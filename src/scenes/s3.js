/* Chapter 6 (scaling & availability) · Chapter 7 (storage & databases) */

scene({
  id: 'surge', section: 'explore', ch: 6, kicker: 'Scaling, load balancing, high availability', title: 'What happens when one thousand users become one million?', short: 'Traffic surge simulator', lab: 'Queues, autoscaling, health checks and AZ failure under load.',
  objectives: ['Relate throughput, capacity, queueing and latency', 'See autoscaling react with a provisioning delay', 'Watch an AZ failure with — and without — enough spare capacity'],
  html: `
  <div class="split" style="grid-template-columns:minmax(290px,0.85fr) minmax(0,2.1fr)">
    <div class="rail" style="gap:10px">
      <div class="controls" id="run"></div>
      <div class="controls stack" id="ctl"></div>
      <div class="controls" id="inject"></div>
      <div class="engbox eng-only"><b>Model</b><p>Time-stepped fluid queue per instance (0.1 s steps). Instance capacity c req/s; waiting ≈ queue ÷ c; latency = processing time + wait; requests waiting longer than the 2 s timeout are rejected. Health checks take ${SIM.trafficDefaults.hcS} s to remove a failed target; requests routed there meanwhile fail. Autoscaling uses 10 s average utilization, a cooldown and a launch delay.</p><p>Not modeled: network latency, retries, connection limits, request-size variance (an M/M/c model would add random waiting even below capacity).</p></div>
    </div>
    <div class="col">
      <div class="tiles" id="tiles"></div>
      <div class="viz" style="min-height:250px"><div class="cvhost" id="fleet"></div></div>
      <div class="grid2"><div class="viz" style="min-height:160px"><div class="cvhost" id="ch1"></div></div><div class="viz" style="min-height:160px"><div class="cvhost" id="ch2"></div></div></div>
      <div class="explain" id="why" aria-live="polite"></div>
    </div>
  </div>`,
  notice: 'When offered traffic exceeds capacity, queues fill, latency climbs to the timeout, and the excess is rejected. More servers fix it only after they finish launching.',
  myth: 'A load balancer doesn\'t create capacity. It spreads load; if every server (or the database behind them) is saturated, users still wait.',
  mount(el, slide) {
    const k = U.tok(slide);
    const P = Object.assign({}, SIM.trafficDefaults, { azs: 2, perAz: 2, auto: false });
    let T, rps = 300, surgeUntil = -1, speed = 1, running = !U.RM, last = null, dots = [];
    const reset = () => { T = SIM.Traffic(P); dots = []; last = null; azBtn.setAttribute('aria-pressed', 'false'); };
    const offered = () => rps * (T && T.t < surgeUntil ? 4 : 1);
    const fleet = U.canvas(el.querySelector('#fleet'), drawFleet), c1 = U.canvas(el.querySelector('#ch1'), drawCharts), c2 = U.canvas(el.querySelector('#ch2'), drawCharts);
    function drawFleet() {
      if (!T) return; const { ctx, W, H } = fleet; ctx.clearRect(0, 0, W, H);
      const AZ = ['a', 'b', 'c'].slice(0, P.azs); const colW = (W - 40) / AZ.length; const lbX = W / 2, lbY = 34;
      ctx.font = k.sans; const lbT = `Load balancer · ${U.fmt(offered())} req/s in`; const lbW = ctx.measureText(lbT).width + 28;
      ctx.fillStyle = k.panel; ctx.strokeStyle = k.blue; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(lbX - lbW / 2, lbY - 18, lbW, 36, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = k.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lbT, lbX, lbY);
      const pos = new Map();
      AZ.forEach((az, i) => {
        const x0 = 20 + i * colW, down = T.azDown.has(az);
        ctx.strokeStyle = down ? k.red : k.line; ctx.setLineDash([5, 4]); ctx.strokeRect(x0 + 6, 70, colW - 12, H - 82); ctx.setLineDash([]);
        ctx.fillStyle = down ? k.red : k.dim; ctx.font = k.monoS; ctx.textAlign = 'left'; ctx.fillText(`AZ ${az}${down ? ' · UNAVAILABLE' : ''}`, x0 + 14, 84);
        const list = T.inst.filter(n => n.az === az); const cw = Math.min(colW - 28, 190), ch = 44; const cols = Math.max(1, Math.floor((colW - 20) / (cw + 8)));
        list.forEach((n, j) => {
          const cx = x0 + 14 + (j % cols) * (cw + 8), cy = 96 + Math.floor(j / cols) * (ch + 8); pos.set(n, [cx + cw / 2, cy]);
          const col = n.state === 'healthy' ? (n.util > 0.98 ? k.red : n.util > 0.8 ? k.amber : k.green) : n.state === 'provisioning' ? k.blue : k.red;
          ctx.fillStyle = U.a(col, 0.12); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 7); ctx.fill(); ctx.stroke();
          ctx.fillStyle = k.fg; ctx.font = k.monoS; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
          const label = n.state === 'healthy' ? `#${n.id}${n.slow ? ' slow' : ''} ${U.fmt(n.util * 100)}% · ${U.fmt(n.lat)} ms` : n.state === 'provisioning' ? `#${n.id} launching ${U.fmt(Math.max(0, n.readyAt - T.t))}s` : `#${n.id} failed${n.detectAt ? ' · still routed' : ''}`;
          ctx.fillText(label, cx + 8, cy + 17);
          const qf = n.state === 'healthy' ? Math.min(1, n.q / (P.cap * (n.slow ? 0.4 : 1) * P.timeoutS)) : 0;
          ctx.fillStyle = k.grid; ctx.fillRect(cx + 8, cy + 26, cw - 16, 8); ctx.fillStyle = qf > 0.9 ? k.red : qf > 0.3 ? k.amber : k.cyan; ctx.fillRect(cx + 8, cy + 26, (cw - 16) * qf, 8);
        });
      });
      if (!U.RM) { dots.forEach(d => { const p = pos.get(d.n); if (!p) return; const x = U.lerp(lbX, p[0], d.u), y = U.lerp(lbY + 18, p[1], d.u); ctx.fillStyle = d.bad ? k.red : k.cyan; ctx.fillRect(x - 2, y - 2, 4, 4); }); }
      ctx.fillStyle = k.dim; ctx.font = k.monoS; ctx.textAlign = 'right'; ctx.fillText('bar = queue depth (full = 2 s timeout)', W - 12, H - 8);
    }
    function drawCharts() {
      if (!T) return; const h = T.hist; const t1 = Math.max(60, T.t), t0 = t1 - 60; const xs = h.map(p => p.t);
      const ymax = Math.max(100, ...h.map(p => p.offered)) * 1.1;
      U.chart(c1, { k, x: [t0, t1], y: [0, ymax], xFmt: v => Math.round(v) + 's', yLabel: 'req/s', legend: true, padL: 46,
        series: [{ xs, data: h.map(p => p.offered), color: k.fg, label: 'offered', width: 1.5, dash: [4, 3] }, { xs, data: h.map(p => p.served), color: k.green, label: 'served' }, { xs, data: h.map(p => p.rejected + p.failed), color: k.red, label: 'rejected/failed' }, { xs, data: h.map(p => p.capTotal), color: k.blue, label: 'capacity', width: 1.2 }] });
      const lmax = Math.max(300, ...h.map(p => p.maxLat)) * 1.1;
      U.chart(c2, { k, x: [t0, t1], y: [0, lmax], xFmt: v => Math.round(v) + 's', yFmt: v => U.fmt(v) + '', yLabel: 'latency ms', legend: true, padL: 50,
        series: [{ xs, data: h.map(p => p.lat), color: k.cyan, label: 'average' }, { xs, data: h.map(p => p.maxLat), color: k.amber, label: 'worst instance', width: 1.4 }] });
    }
    function report(pt) {
      if (!pt) return;
      const healthy = pt.healthy, prov = T.inst.filter(i => i.state === 'provisioning').length;
      U.tiles(el.querySelector('#tiles'), [
        ['Offered', U.fmt(pt.offered) + '/s', ''], ['Served', U.fmt(pt.served) + '/s', pt.served >= pt.offered * 0.99 ? 'good' : 'warn'],
        ['Rejected + failed', U.fmt(pt.rejected + pt.failed) + '/s', pt.rejected + pt.failed > 0.5 ? 'bad' : 'good'], ['Avg latency', U.fmt(pt.lat) + ' ms', pt.lat > 1000 ? 'bad' : pt.lat > 300 ? 'warn' : 'good'],
        ['Utilization', U.fmt(pt.util * 100) + '%', pt.util > 0.95 ? 'bad' : pt.util > 0.8 ? 'warn' : ''], ['Healthy', `${healthy}${prov ? ' +' + prov : ''}`, '', `capacity ${U.fmt(pt.capTotal)}/s`]
      ]);
      let m;
      const bad = pt.rejected + pt.failed;
      if (pt.failed > 0.5) m = `Requests are still being sent to failed instances: the load balancer only stops after health checks fail (${P.hcS} s). Those requests error out.`;
      else if (bad > 0.5 && prov) m = `Offered ${U.fmt(pt.offered)} req/s exceeds capacity ${U.fmt(pt.capTotal)} req/s. ${prov} instance${prov > 1 ? 's are' : ' is'} launching, but they serve nothing until they pass health checks.`;
      else if (bad > 0.5) m = `Offered ${U.fmt(pt.offered)} req/s exceeds capacity ${U.fmt(pt.capTotal)} req/s. Queues hit the ${P.timeoutS} s timeout and ${U.fmt(bad)} req/s are rejected.${P.auto ? '' : ' Turn on autoscaling or add instances.'}`;
      else if (pt.util > 0.85) m = `Running at ${U.fmt(pt.util * 100)}% utilization: no spare capacity to absorb a spike or a failure.`;
      else if (T.azDown.size) m = `An AZ is down, but the remaining ${healthy} instances have enough capacity: users see no errors.`;
      else m = `Healthy: ${U.fmt(pt.served)} req/s served at ${U.fmt(pt.lat)} ms average. Spare capacity ${U.fmt(pt.capTotal - pt.served)} req/s.`;
      el.querySelector('#why').innerHTML = `<h4>What's happening</h4><p>${m}</p>`;
      if (T.azDown.size && bad < 0.5 && T.t > 30) U.markDone('surge');
    }
    let acc = 0, lastPt = null;
    const tick = dt => {
      const sim = dt * speed; const n = Math.max(1, Math.round(sim / 0.1));
      for (let i = 0; i < n; i++) lastPt = T.step(sim / n, offered());
      if (!U.RM) {
        T.inst.forEach(i => { const rate = i.state === 'healthy' ? i.util * P.cap * (i.slow ? 0.4 : 1) : (i.state === 'failed' && i.detectAt ? offered() / Math.max(1, T.inst.length) : 0); acc = rate * dt / 25; if (Math.random() < acc) dots.push({ n: i, u: 0, bad: i.state === 'failed' }); });
        dots.forEach(d => d.u += dt * 1.6); dots = dots.filter(d => d.u < 1 && T.inst.includes(d.n)); if (dots.length > 220) dots.splice(0, dots.length - 220);
      }
    };
    let fr = 0;
    const stop = U.loop(dt => { if (!running) return; tick(dt); drawFleet(); if (fr++ % 3 === 0) { drawCharts(); report(lastPt); } });
    const runEl = el.querySelector('#run');
    const pb = U.btn(runEl, running ? 'Pause' : 'Run', () => { running = !running; pb.textContent = running ? 'Pause' : 'Run'; }, 'primary');
    U.btn(runEl, 'Advance 10 s', () => { for (let i = 0; i < 100; i++) lastPt = T.step(0.1, offered()); drawFleet(); drawCharts(); report(lastPt); });
    U.seg(runEl, [['1', '1×'], ['4', '4×']], '1', v => speed = +v, 'Speed');
    U.btn(runEl, 'Reset', () => { reset(); drawFleet(); drawCharts(); });
    const c = el.querySelector('#ctl');
    U.slider(c, { label: 'Traffic', min: 50, max: 2000, step: 50, value: rps, fmt: v => v + ' req/s' }, v => rps = v);
    U.slider(c, { label: 'Instance capacity', min: 25, max: 300, step: 25, value: P.cap, fmt: v => v + ' req/s' }, v => { P.cap = v; T.p.cap = v; });
    U.slider(c, { label: 'Processing time', min: 20, max: 400, step: 10, value: P.procMs, fmt: v => v + ' ms' }, v => { P.procMs = v; T.p.procMs = v; });
    U.slider(c, { label: 'Instances per AZ (resets)', min: 1, max: 4, step: 1, value: P.perAz, fmt: v => v }, v => { P.perAz = v; reset(); });
    U.seg(c, [['2', '2 AZs'], ['3', '3 AZs']], String(P.azs), v => { P.azs = +v; reset(); }, 'AZs');
    U.seg(c, [['least', 'Least outstanding'], ['rr', 'Round robin']], P.strategy, v => { P.strategy = v; T.p.strategy = v; }, 'Load balancing');
    U.check(c, { label: 'Autoscaling', checked: P.auto }, v => { P.auto = v; T.p.auto = v; });
    const tg = U.slider(c, { label: 'Scale-out target', min: 0.4, max: 0.9, step: 0.05, value: P.target, fmt: v => Math.round(v * 100) + '%' }, v => { P.target = v; T.p.target = v; });
    const dl = U.slider(c, { label: 'Launch delay', min: 5, max: 180, step: 5, value: P.delayS, fmt: v => v + ' s' }, v => { P.delayS = v; T.p.delayS = v; });
    [tg, dl].forEach(s => s.el.classList.add('eng-only'));
    const inj = el.querySelector('#inject');
    U.btn(inj, 'Surge ×4 for 40 s', () => { surgeUntil = T.t + 40; }, 'warn');
    const azBtn = U.btn(inj, 'Fail AZ b', () => { const d = !T.azDown.has('b'); T.failAz('b', d); azBtn.setAttribute('aria-pressed', String(d)); }, 'warn');
    U.btn(inj, 'Crash one instance', () => T.failOne(), 'warn');
    U.btn(inj, 'Add instance', () => T.addInstance());
    U.check(inj, { label: 'One instance degraded', checked: false }, v => { P.degraded = v; T.setDegraded(v); });
    reset();
    for (let i = 0; i < 100; i++) lastPt = T.step(0.1, offered());
    drawFleet(); drawCharts(); report(lastPt);
    return () => { stop(); fleet.destroy(); c1.destroy(); c2.destroy(); };
  },
  notes: {
    objective: 'Learners connect capacity, queues and latency, and see that availability during failure depends on spare capacity and detection time.',
    say: ['Four servers at 100 req/s each, 300 req/s of traffic: 75% busy, fast responses. Press Surge: traffic quadruples, queues fill, latency jumps to the timeout and requests are rejected.', 'Turn on autoscaling and surge again: new servers appear blue, but they help only after the launch delay. That gap is why teams pre-scale for known events.', 'Now fail AZ b. For a few seconds requests still go to dead servers — the health checks haven\'t noticed. Then the survivors either cope or don\'t, depending on spare capacity.'],
    demo: ['Default → Surge (no autoscaling) → Reset → Autoscaling on → Surge → Fail AZ b.', 'Tick "One instance degraded", switch Round robin vs Least outstanding at 300 req/s and compare rejected/s.'],
    ask: 'If you must survive losing one of two AZs at 300 req/s, how much capacity do you need in each AZ?',
    answer: '300 req/s per AZ: each half must carry the whole load alone, so you run at ≤50% utilization normally. Three AZs need only 150 req/s each.',
    transition: 'All those servers read and write data. Where does it live?'
  },
  check: { q: 'Offered traffic is 600 req/s and four healthy servers each handle 100 req/s. What happens?', opts: ['Latency rises slightly but everything is served', 'Queues fill to the timeout and about 200 req/s are rejected', 'The load balancer adds two servers instantly', 'Throughput rises to 600 req/s'], a: 1, why: 'Throughput can\'t exceed capacity (400 req/s). The remaining demand queues until the timeout and is then rejected.' }
});

scene({
  id: 'storage', section: 'explore', ch: 7, kicker: 'Storage and databases', title: 'Where does an application keep its information?', short: 'Follow the data', lab: 'Object vs block vs file storage; SQL vs NoSQL vs cache.',
  objectives: ['Match object, block and file storage to their uses', 'Choose between relational, key-value and caching', 'Distinguish durability, availability, backup and replication'],
  html: `
  <div class="tabs" id="tabs"></div>
  <div id="pane" style="flex:1;display:flex;flex-direction:column;gap:12px;min-height:0"></div>`,
  notice: 'One user action can touch several stores: the photo bytes go to object storage, the post record to a database, the hot data to a cache.',
  myth: 'Backups and replication aren\'t the same. A replica copies a mistaken DELETE within seconds; a backup lets you go back to before it.',
  mount(el) {
    const pane = el.querySelector('#pane'); let cleanup = null;
    const follow = () => {
      pane.innerHTML = `<div class="split rev" style="flex:1"><div class="col"><div class="controls" id="flows"></div><div class="viz grid" style="min-height:330px"><div class="cvhost" id="fd"></div></div></div>
        <div class="rail"><div id="sp"></div><div class="explain" id="fx" aria-live="polite"></div><div class="engbox eng-only" id="fg"></div></div></div>`;
      const nodes = { client: { x: 80, y: 200, label: 'Pixelpost app', sub: 'phone', kind: 'client', w: 140 }, app: { x: 290, y: 200, label: 'App server', sub: 'API', w: 140 }, s3: { x: 520, y: 70, label: 'Object storage', sub: 'S3', w: 160 }, cache: { x: 520, y: 200, label: 'Cache', sub: 'ElastiCache', w: 160 }, db: { x: 520, y: 330, label: 'Relational DB', sub: 'RDS primary · AZ a', w: 170 }, standby: { x: 760, y: 330, label: 'Standby', sub: 'AZ b · synchronous', w: 160 }, backup: { x: 760, y: 450, label: 'Backups', sub: 'snapshots', w: 160 } };
      const edges = [['client', 'app'], ['client', 's3', 'dash'], ['app', 's3'], ['app', 'cache'], ['app', 'db'], ['db', 'standby'], ['db', 'backup', 'dash']];
      const F = U.flow(el.querySelector('#fd'), { size: [860, 500], nodes, edges, label: 'Data flow' });
      const FL = {
        upload: [
          { n: ['client', 'app'], h: [['client', 'app']], t: 'Ask to upload', e: 'The app asks the API for permission to upload a photo.', g: 'The API authenticates the user and returns a pre-signed S3 URL valid for a few minutes.' },
          { n: ['s3'], h: [['client', 's3']], t: 'Bytes go to object storage', e: 'The photo goes straight to S3. Large files don\'t pass through app servers, so they stay small and cheap.', g: 'PUT to the pre-signed URL. S3 stores the object redundantly across multiple devices and facilities in the Region.' },
          { n: ['app', 'db'], h: [['app', 'db']], t: 'Record goes to the database', e: 'The post — who, when, caption, and the photo\'s S3 key — is a row in the database. The database stores the pointer, not the picture.', g: 'INSERT INTO posts(user_id, s3_key, caption, created_at)…' },
          { n: ['standby'], h: [['db', 'standby']], t: 'Replicated for availability', e: 'Multi-AZ keeps a synchronous standby, so a failed AZ doesn\'t lose committed posts.', g: 'The standby is for failover, not reads (read replicas are separate and asynchronous).' }
        ],
        order: [
          { n: ['client', 'app'], h: [['client', 'app']], t: 'Buy a print', e: 'A user orders a printed photo: money and inventory are involved.', g: 'POST /orders with an idempotency key so a retried request doesn\'t charge twice.' },
          { n: ['db'], h: [['app', 'db']], t: 'One transaction', e: 'Create the order and decrement inventory together. Either both happen or neither does — that guarantee is why money lives in a relational database.', g: 'BEGIN; INSERT INTO orders…; UPDATE inventory SET qty = qty - 1 WHERE sku = $1 AND qty > 0; COMMIT; (ACID)' },
          { n: ['standby'], h: [['db', 'standby']], t: 'Committed means durable', e: 'The commit is acknowledged only after the standby has the change.', g: 'Synchronous replication adds a little write latency in exchange for zero committed-data loss on AZ failover.' },
          { n: ['backup'], h: [['db', 'backup']], t: 'Backups are separate', e: 'Nightly snapshots plus transaction logs allow restoring to an earlier point in time — e.g. before a bad deploy corrupted data.', g: 'Point-in-time recovery restores to a new instance; test restores regularly (an untested backup is a hope).' }
        ],
        read: [
          { n: ['client', 'app'], h: [['client', 'app']], t: 'Open a profile', e: 'Profiles are read constantly and change rarely.', g: 'GET /users/42' },
          { n: ['cache'], h: [['app', 'cache'], ['cache', 'app', 'ret']], t: 'Check the cache: miss', e: 'Not in memory yet.', g: 'GET user:42 → nil' },
          { n: ['db'], h: [['app', 'db'], ['db', 'app', 'ret']], t: 'Read the database', e: 'The database answers and the app stores a copy in the cache with an expiry.', g: 'SELECT … ; SET user:42 <json> EX 300 (cache-aside pattern)' },
          { n: ['cache'], h: [['app', 'cache'], ['cache', 'app', 'ret']], t: 'Next read: hit', e: 'The next request is served from memory in well under a millisecond inside the network; the database does no work.', g: 'Trade-off: for up to 300 s a changed profile may appear stale unless the app invalidates the key on write.' }
        ]
      };
      let cur = 'upload';
      const render = async (i, anim) => {
        const S = FL[cur]; const s = S[i]; F.clear(); S.slice(0, i).forEach(p => p.n.forEach(n => F.state(n, 'done')));
        el.querySelector('#fx').innerHTML = `<h4>${i + 1}. ${s.t}</h4><p>${s.e}</p>`; el.querySelector('#fg').innerHTML = `<b>Engineering detail</b><p>${s.g}</p>`;
        for (const [a, b, c] of s.h) { F.edgeOn(a, b); if (anim) await F.packet(a, b, c === 'ret' ? 'pk ret' : 'pk', 550); }
        s.n.forEach(n => F.state(n, 'on'));
        if (cur === 'order' && i === S.length - 1) U.markDone('storage-flow');
      };
      const sp = U.stepper(el.querySelector('#sp'), { count: () => FL[cur].length, render, autoMs: 1000 });
      U.seg(el.querySelector('#flows'), [['upload', 'Upload a photo'], ['order', 'Submit a transaction'], ['read', 'Read a profile']], cur, v => { cur = v; sp.stop(); sp.go(0, false); }, 'Flow');
      sp.go(0, false);
      return () => sp.destroy();
    };
    const choose = () => {
      const opts = [['s3', 'Object storage (S3)'], ['ebs', 'Block storage (EBS)'], ['efs', 'File storage (EFS)'], ['rds', 'Relational DB (RDS)'], ['ddb', 'Key-value DB (DynamoDB)'], ['cache', 'Cache (ElastiCache)']];
      const Q = [
        { q: 'Store millions of user photographs', best: ['s3'], ok: [], why: { s3: 'Cheap, durable, virtually unlimited objects addressed by key — and a natural CDN origin.', rds: 'Databases can hold small blobs, but photos bloat backups and cost far more per GB.', ebs: 'A disk attached to one server: limited size, one AZ, and every read goes through that server.', efs: 'Works, but costs more per GB and adds a file-system layer you don\'t need for whole-file access.', ddb: 'Items have a size limit far below a photo; store the photo\'s key there instead.', cache: 'Memory is expensive and not durable.' } },
        { q: 'Persistent disk for a virtual machine running a database you manage', best: ['ebs'], ok: [], why: { ebs: 'Low-latency block device with snapshots — what a self-managed database expects.', s3: 'Object storage isn\'t mountable as a block device for database files.', efs: 'Network file systems usually add latency and locking issues for database engines.', rds: 'Valid alternative: let AWS manage the database instead of running it on a VM.', ddb: 'A different kind of database, not a disk.', cache: 'Not durable.' } },
        { q: 'Structured financial transactions with integrity guarantees', best: ['rds'], ok: ['ddb'], why: { rds: 'ACID transactions, constraints and joins across accounts and ledgers.', ddb: 'Supports transactions on items and scales massively, but you design around access patterns and give up ad-hoc relational queries. Reasonable with careful design.', s3: 'No transactions across objects.', ebs: 'A disk, not a database.', efs: 'Files have no transactional semantics.', cache: 'Not a system of record.' } },
        { q: 'Frequently accessed product data that rarely changes', best: ['cache'], ok: [], why: { cache: 'In-memory reads offload the database and cut latency; accept brief staleness or invalidate on write.', rds: 'The source of truth — but serving every read from it wastes capacity.', ddb: 'Fast, but a cache in front of either database is still cheaper for very hot keys.', s3: 'Too slow per request for hot application data.', ebs: 'Not shared and not a cache.', efs: 'Not a cache.' } },
        { q: 'Share files among several compute instances at once', best: ['efs'], ok: ['s3'], why: { efs: 'A shared POSIX file system many instances mount simultaneously.', s3: 'Works if the application can use object APIs instead of file paths.', ebs: 'Normally attached to one instance at a time.', rds: 'Not for files.', ddb: 'Not for files.', cache: 'Not durable.' } },
        { q: 'User sessions for a high-traffic app (look up by session ID)', best: ['ddb', 'cache'], ok: [], why: { ddb: 'Key-based lookups with TTL expiry, durable and scalable.', cache: 'Very fast; acceptable if losing sessions on a cache failure only means users sign in again.', rds: 'Works at small scale, but turns every page view into a database write.', s3: 'Too slow and costly per small request.', ebs: 'Bound to one server.', efs: 'Not designed for this.' } }
      ];
      pane.innerHTML = `<div class="split rev" style="flex:1"><div class="col" id="qs" style="gap:10px"></div><div class="rail"><div class="explain"><h4>Choose the storage</h4><p>Pick a technology for each requirement. Some have more than one reasonable answer.</p></div><div class="tiles" id="score"></div>
        <div class="tscroll eng-only"><table class="t"><thead><tr><th>Type</th><th>Access</th><th>Shared?</th><th>Typical use</th></tr></thead><tbody>
        <tr><td>Object</td><td>Whole objects by key over HTTP</td><td>Yes</td><td>Media, backups, data lakes</td></tr><tr><td>Block</td><td>Raw blocks, one host</td><td>Usually no</td><td>OS disks, self-managed DBs</td></tr><tr><td>File</td><td>Paths, POSIX semantics</td><td>Yes</td><td>Shared content</td></tr><tr><td>Relational</td><td>SQL, joins, transactions</td><td>Via network</td><td>Orders, accounts</td></tr><tr><td>Key-value</td><td>Get/put by key</td><td>Via network</td><td>Sessions, profiles</td></tr><tr><td>Cache</td><td>In-memory key lookups</td><td>Via network</td><td>Hot reads</td></tr></tbody></table></div></div></div>`;
      const qs = pane.querySelector('#qs'); const ans = {};
      const score = () => { const right = Object.values(ans).filter(a => a === 'best').length, ok = Object.values(ans).filter(a => a === 'ok').length; U.tiles(pane.querySelector('#score'), [['Best fit', `${right}/${Q.length}`, right === Q.length ? 'good' : ''], ['Reasonable', ok, ''], ['Answered', `${Object.keys(ans).length}/${Q.length}`, '']]); if (right + ok === Q.length) U.markDone('storage-choose'); };
      Q.forEach((q, i) => {
        const c = document.createElement('div'); c.className = 'card'; c.innerHTML = `<h3>${i + 1}. ${q.q}</h3><div class="chips"></div><p class="fb" style="margin-top:8px" aria-live="polite"></p>`; qs.appendChild(c);
        const ch = c.querySelector('.chips');
        opts.forEach(([v, l]) => { const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.textContent = l; b.setAttribute('aria-pressed', 'false'); b.onclick = () => {
          ch.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
          const kind = q.best.includes(v) ? 'best' : q.ok.includes(v) ? 'ok' : 'no'; ans[i] = kind;
          c.querySelector('.fb').innerHTML = `<b class="${kind === 'best' ? 'c-green' : kind === 'ok' ? 'c-amber' : 'c-red'}">${kind === 'best' ? 'Best fit.' : kind === 'ok' ? 'Reasonable, with trade-offs.' : 'Not the best fit.'}</b> ${q.why[v]}${kind !== 'best' ? ` <span class="c-muted">Best: ${q.best.map(x => opts.find(o => o[0] === x)[1]).join(' or ')}.</span>` : ''}`;
          score(); }; ch.appendChild(b); });
      });
      score(); return null;
    };
    U.tabs(el.querySelector('#tabs'), [['follow', 'Follow the data'], ['choose', 'Choose the storage']], v => { if (cleanup) cleanup(); cleanup = (v === 'follow' ? follow : choose)(); });
    return () => { if (cleanup) cleanup(); };
  },
  notes: {
    objective: 'Learners pick storage by access pattern and guarantees, and separate replication (availability) from backups (recovery).',
    say: ['Upload a photo: the bytes go to object storage; the database stores only a pointer. That split shows up in almost every real app.', 'Transactions: money and inventory change together or not at all — that is what relational databases are for.', 'Read a profile twice: the second time it never touches the database. The cost is possible staleness.'],
    demo: ['Play all three flows, then the Choose tab — let the room vote on each scenario.'],
    ask: 'An engineer accidentally runs DELETE FROM posts. Does Multi-AZ replication save you?',
    answer: 'No — the standby replicates the delete. Point-in-time restore from backups does.',
    transition: 'We\'ve placed data in several services. Who is allowed to touch it?'
  },
  check: { q: 'Which is true about backups and replication?', opts: ['They\'re the same thing', 'Replication protects against accidental deletes', 'Replication improves availability; backups let you restore earlier data', 'Backups make failover instant'], a: 2, why: 'A replica mirrors every change, including mistakes. Backups are point-in-time copies you can restore from.' }
});

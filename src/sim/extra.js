/* Additional simulation engines (pure logic, no DOM). Every number is an adjustable, illustrative assumption —
   these models teach mechanisms, they do not predict any provider's real performance or prices. */
(function (G) {
  const SIM = G.SIM = G.SIM || {};
  const rngOf = seed => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  SIM.rng = rngOf;
  // Poisson sample (Knuth for small means, normal approximation for large)
  SIM.poisson = (mean, r) => { if (mean <= 0) return 0; if (mean > 40) return Math.max(0, Math.round(mean + Math.sqrt(mean) * Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r()))); const L = Math.exp(-mean); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; };
  SIM.fnv = str => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
  SIM.pct = (arr, p) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  SIM.km = (a, b) => { const R = 6371, r = Math.PI / 180; const dl = (b[0] - a[0]) * r, dn = (b[1] - a[1]) * r; const h = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  SIM.rttMs = km => 2 * km * 1.5 / 200000 * 1000 + 4; // light in fiber ≈ 200,000 km/s; ×1.5 for indirect routes; +4 ms processing

  /* ---------- shortest-path routing (internet basics) ---------- */
  SIM.route = (nodes, links, src, dst, extra) => {
    const dist = {}, prev = {}, done = new Set(); nodes.forEach(n => dist[n] = Infinity); dist[src] = 0;
    while (done.size < nodes.length) {
      let u = null; nodes.forEach(n => { if (!done.has(n) && (u === null || dist[n] < dist[u])) u = n; });
      if (u === null || dist[u] === Infinity) break; done.add(u); if (u === dst) break;
      links.forEach((l, i) => { if (!l.up) return; const v = l.a === u ? l.b : l.b === u ? l.a : null; if (v === null || done.has(v)) return; const w = l.ms + (extra ? extra[i] || 0 : 0); if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = [u, i]; } });
    }
    if (dist[dst] === Infinity) return null;
    const path = [dst], via = []; let c = dst; while (c !== src) { const [p, i] = prev[c]; via.unshift(i); path.unshift(p); c = p; }
    return { path, links: via, ms: dist[dst] };
  };

  /* ---------- data-center power (PUE) ---------- */
  SIM.dcDefaults = { capKW: 1000, load: 60, tempC: 25, freeCool: false };
  SIM.datacenter = o => {
    const p = Object.assign({}, SIM.dcDefaults, o || {});
    const it = p.capKW * p.load / 100;
    const cooling = it * (0.12 + 0.015 * Math.max(0, p.tempC - 18)) * (p.freeCool && p.tempC < 22 ? 0.45 : 1);
    const losses = 0.03 * it + 0.02 * p.capKW; // UPS/transformer losses + fixed overhead (lighting, security, idle plant)
    const total = it + cooling + losses;
    return { p, it, cooling, losses, total, pue: it > 0 ? total / it : Infinity };
  };

  /* ---------- virtualization packing ---------- */
  SIM.packDefaults = { hostCpu: 64, hostMem: 256 };
  SIM.packOverhead = { vm: { fixCpu: 2, fixMem: 8, cpu: 0.25, mem: 1 }, container: { fixCpu: 1, fixMem: 4, cpu: 0.02, mem: 0.05 }, metal: { fixCpu: 0, fixMem: 2, cpu: 0, mem: 0 } };
  SIM.pack = (workloads, mode, o) => {
    const p = Object.assign({}, SIM.packDefaults, o || {}); const ov = SIM.packOverhead[mode];
    const hosts = [];
    const newHost = () => { const h = { items: [], cpu: ov.fixCpu, mem: ov.fixMem }; hosts.push(h); return h; };
    workloads.forEach(w => {
      const c = w.cpu + ov.cpu, m = w.mem + ov.mem;
      let h = mode === 'metal' ? null : hosts.find(x => x.cpu + c <= p.hostCpu && x.mem + m <= p.hostMem);
      if (!h) h = newHost();
      h.items.push(w); h.cpu += c; h.mem += m;
    });
    const useCpu = workloads.reduce((s, w) => s + w.cpu, 0), useMem = workloads.reduce((s, w) => s + w.mem, 0);
    const ovCpu = hosts.reduce((s, h) => s + h.cpu, 0) - useCpu, ovMem = hosts.reduce((s, h) => s + h.mem, 0) - useMem;
    return { hosts, util: hosts.length ? useCpu / (hosts.length * p.hostCpu) : 0, memUtil: hosts.length ? useMem / (hosts.length * p.hostMem) : 0, ovCpu, ovMem, p };
  };

  /* ---------- serverless functions: cold starts, scale to zero, concurrency ---------- */
  SIM.faasDefaults = { rate: 8, pattern: 'idle', coldMs: 800, execMs: 120, keepWarmS: 20, maxConc: 30, provisioned: 0, memGB: 0.5, seed: 7 };
  SIM.faasRate = (p, t) => p.pattern === 'steady' ? p.rate : p.pattern === 'bursty' ? p.rate * ((t % 30) < 5 ? 5 : 0.6) : ((t % 60) < 22 ? p.rate : 0);
  SIM.Faas = function (o) {
    const p = Object.assign({}, SIM.faasDefaults, o || {}); const r = rngOf(p.seed);
    const S = { p, t: 0, inst: [], lat: [], recent: [], cold: 0, throttled: 0, invocations: 0, gbs: 0, nextId: 1 };
    const prov = () => { while (S.inst.filter(i => i.prov).length < p.provisioned) S.inst.push({ id: S.nextId++, prov: true, busyUntil: 0, idleSince: 0, coldUntil: 0 }); S.inst = S.inst.filter(i => !i.prov || S.inst.filter(j => j.prov).indexOf(i) < p.provisioned); };
    prov();
    S.set = o2 => { Object.assign(p, o2); prov(); };
    S.step = dt => {
      const t0 = S.t, t1 = S.t + dt; const n = SIM.poisson(SIM.faasRate(p, t0) * dt, r);
      for (let k = 0; k < n; k++) {
        const ta = t0 + r() * dt; S.invocations++;
        let inst = S.inst.find(i => i.busyUntil <= ta);
        let lat;
        if (inst) { lat = p.execMs; inst.busyUntil = ta + p.execMs / 1000; }
        else if (S.inst.length < p.maxConc) { inst = { id: S.nextId++, prov: false, coldUntil: ta + p.coldMs / 1000, busyUntil: ta + (p.coldMs + p.execMs) / 1000 }; S.inst.push(inst); S.cold++; lat = p.coldMs + p.execMs; }
        else { S.throttled++; S.recent.push({ t: ta, lat: null }); continue; }
        inst.idleSince = inst.busyUntil; S.gbs += p.memGB * p.execMs / 1000; S.lat.push(lat); S.recent.push({ t: ta, lat, cold: lat > p.execMs });
      }
      S.inst = S.inst.filter(i => i.prov || i.busyUntil > t1 || t1 - i.idleSince < p.keepWarmS);
      S.t = t1; S.recent = S.recent.filter(x => x.t > t1 - 10); if (S.lat.length > 5000) S.lat.splice(0, S.lat.length - 5000);
      return S;
    };
    S.status = i => i.coldUntil > S.t ? 'cold' : i.busyUntil > S.t ? 'busy' : 'idle';
    return S;
  };
  SIM.faasCost = (S, prices) => {
    const pr = Object.assign({ perMillion: 0.2, perGBs: 0.000017, provPerHour: 0.01, serverHour: 0.05 }, prices || {});
    const hours = S.t / 3600; const fn = S.invocations / 1e6 * pr.perMillion + S.gbs * pr.perGBs + S.p.provisioned * hours * pr.provPerHour;
    return { fn, server: 2 * hours * pr.serverHour, hours };
  };

  /* ---------- message queue: decoupling, retries, dead-letter queue ---------- */
  SIM.mqDefaults = { rate: 6, burst: false, consumers: 3, procS: 0.6, visS: 4, maxReceives: 3, poisonPct: 0, crashed: false, useQueue: true, seed: 11 };
  SIM.Mq = function (o) {
    const p = Object.assign({}, SIM.mqDefaults, o || {}); const r = rngOf(p.seed);
    const S = { p, t: 0, q: [], cons: [], dlq: 0, done: 0, dropped: 0, sent: 0, retries: 0, nextId: 1 };
    const fit = () => { while (S.cons.length < p.consumers) S.cons.push({ busyUntil: 0, msg: null }); S.cons.length = p.consumers; };
    fit(); S.set = o2 => { Object.assign(p, o2); fit(); };
    S.rateAt = t => p.rate * (p.burst && (t % 20) < 4 ? 6 : 1);
    S.step = dt => {
      const t1 = S.t + dt; const n = SIM.poisson(S.rateAt(S.t) * dt, r);
      // finish work
      S.cons.forEach(c => {
        if (c.msg && c.busyUntil <= t1) {
          if (p.crashed) { c.msg = null; return; } // in-flight message is not deleted: it reappears after its visibility timeout
          if (c.msg.poison) { c.msg = null; } else { if (p.useQueue) S.q = S.q.filter(m => m !== c.msg); S.done++; c.msg = null; }
        }
      });
      for (let k = 0; k < n; k++) {
        const m = { id: S.nextId++, t: S.t + r() * dt, poison: r() * 100 < p.poisonPct, receives: 0, visibleAt: 0 }; S.sent++;
        if (p.useQueue) S.q.push(m);
        else { const c = !p.crashed && S.cons.find(c => !c.msg); if (c) { c.msg = m; c.busyUntil = t1 + p.procS; } else S.dropped++; }
      }
      if (p.useQueue && !p.crashed) {
        S.cons.forEach(c => {
          if (c.msg) return;
          const m = S.q.find(m => m.visibleAt <= t1 && !S.cons.some(x => x.msg === m));
          if (!m) return;
          m.receives++; if (m.receives > 1) S.retries++;
          if (m.receives > p.maxReceives) { S.q = S.q.filter(x => x !== m); S.dlq++; return; }
          m.visibleAt = t1 + p.visS; c.msg = m; c.busyUntil = t1 + p.procS * (0.7 + 0.6 * r());
        });
      }
      S.t = t1; return S;
    };
    S.depth = () => S.q.length;
    S.oldest = () => S.q.length ? S.t - Math.min(...S.q.map(m => m.t)) : 0;
    return S;
  };

  /* ---------- sharding: modulo vs consistent hashing ---------- */
  SIM.shardOf = (key, n, method, vnodes = 64) => {
    const h = SIM.fnv('k' + key);
    if (method === 'mod') return h % n;
    const ring = SIM.ring(n, vnodes); let lo = 0, hi = ring.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (ring[mid][0] < h) lo = mid + 1; else hi = mid; }
    return ring[lo % ring.length][1];
  };
  const ringCache = {};
  SIM.ring = (n, v) => { const k = n + ':' + v; if (ringCache[k]) return ringCache[k]; const r = []; for (let s = 0; s < n; s++) for (let j = 0; j < v; j++) r.push([SIM.fnv('shard' + s + '#' + j), s]); r.sort((a, b) => a[0] - b[0]); return (ringCache[k] = r); };
  SIM.shardMove = (keys, n1, n2, method) => { let moved = 0; for (let k = 0; k < keys; k++) if (SIM.shardOf(k, n1, method) !== SIM.shardOf(k, n2, method)) moved++; return moved / keys; };

  /* ---------- replication lag ---------- */
  SIM.replication = o => {
    const p = Object.assign({ lagMs: 300, readAfterMs: 100, readFrom: 'replica', mode: 'async' }, o || {});
    const lag = p.mode === 'sync' ? 0 : p.lagMs;
    const stale = p.readFrom === 'replica' && p.readAfterMs < lag;
    return { stale, lag, writeMs: p.mode === 'sync' ? 12 : 4, lossWindowMs: p.mode === 'sync' ? 0 : lag };
  };

  /* ---------- Kubernetes-style scheduling ---------- */
  SIM.schedule = (nodes, pods, strategy, prev) => {
    const free = {}; nodes.forEach(n => { if (n.up) free[n.id] = { cpu: n.cpu, mem: n.mem, apps: {} }; });
    const out = {};
    const place = (pod, nid) => { const f = free[nid]; f.cpu -= pod.cpu; f.mem -= pod.mem; f.apps[pod.app] = (f.apps[pod.app] || 0) + 1; out[pod.id] = nid; };
    const fits = (pod, nid) => free[nid] && free[nid].cpu >= pod.cpu - 1e-9 && free[nid].mem >= pod.mem - 1e-9;
    const rest = [];
    pods.forEach(pod => { const was = prev && prev[pod.id]; if (was && fits(pod, was)) place(pod, was); else rest.push(pod); });
    rest.sort((a, b) => b.cpu - a.cpu || (a.id < b.id ? -1 : 1)).forEach(pod => {
      const c = Object.keys(free).filter(nid => fits(pod, nid));
      if (!c.length) { out[pod.id] = null; return; }
      c.sort((a, b) => strategy === 'spread'
        ? ((free[a].apps[pod.app] || 0) - (free[b].apps[pod.app] || 0)) || (free[b].cpu - free[a].cpu) || (a < b ? -1 : 1)
        : (free[a].cpu - free[b].cpu) || (a < b ? -1 : 1));
      place(pod, c[0]);
    });
    return out;
  };

  /* ---------- CDN edge caching ---------- */
  SIM.Cdn = function (o) {
    const p = Object.assign({ ttl: 60, on: true, objects: 300, zipf: 1.0, rate: 40, seed: 5, edges: [], origin: [38.9, -77.4], users: [] }, o || {});
    const r = rngOf(p.seed); let w = []; let tot = 0;
    const setZipf = () => { w = []; tot = 0; for (let i = 1; i <= p.objects; i++) { tot += 1 / Math.pow(i, p.zipf); w.push(tot); } };
    setZipf();
    const S = { p, t: 0, caches: p.edges.map(() => new Map()), hits: 0, miss: 0, origin: 0, latSum: 0, n: 0, recent: [] };
    S.set = o2 => { Object.assign(p, o2); if ('zipf' in o2 || 'objects' in o2) setZipf(); };
    S.pickObj = () => { const x = r() * tot; let lo = 0, hi = w.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (w[m] < x) lo = m + 1; else hi = m; } return lo; };
    S.nearest = u => { let b = 0, bd = Infinity; p.edges.forEach((e, i) => { const d = SIM.km(u, e); if (d < bd) { bd = d; b = i; } }); return [b, bd]; };
    S.request = u => {
      const obj = S.pickObj(); let lat, hit = false, ei = -1;
      if (!p.on) { lat = SIM.rttMs(SIM.km(u, p.origin)) + 20; S.origin++; }
      else {
        const [e, d] = S.nearest(u); ei = e; const c = S.caches[e]; const exp = c.get(obj);
        if (exp !== undefined && exp > S.t) { hit = true; S.hits++; lat = SIM.rttMs(d); }
        else { S.miss++; S.origin++; lat = SIM.rttMs(d) + SIM.rttMs(SIM.km(p.edges[e], p.origin)) + 20; c.set(obj, S.t + p.ttl); }
      }
      S.n++; S.latSum += lat; S.recent.push({ t: S.t, hit, lat, ei }); return { hit, lat, ei, obj };
    };
    S.step = (dt, pickUser) => { const out = []; const n = SIM.poisson(p.rate * dt, r); for (let k = 0; k < n; k++) { const u = pickUser(r); out.push(Object.assign({ u }, S.request(u))); } S.t += dt; S.recent = S.recent.filter(x => x.t > S.t - 10); return out; };
    S.reset = () => { S.caches = p.edges.map(() => new Map()); S.hits = S.miss = S.origin = S.latSum = S.n = 0; S.recent = []; };
    return S;
  };

  /* ---------- monthly bill (hour by hour) ---------- */
  SIM.billDefaults = { vms: 4, vmRate: 0.10, schedule: 'always', commit: false, commitDisc: 30, db: true, dbRate: 0.25, storageGB: 500, storageRate: 0.023, egressGB: 400, egressRate: 0.09, fnM: 5, fnRate: 0.4, gpu: false, gpuRate: 3.0, budget: 800 };
  SIM.billOn = (sched, h) => { if (sched === 'always') return true; const day = Math.floor(h / 24) % 7, hr = h % 24; return day < 5 && hr >= 8 && hr < 20; };
  SIM.bill = o => {
    const p = Object.assign({}, SIM.billDefaults, o || {}); const H = 720;
    const cats = { Compute: [], Database: [], Storage: [], 'Data transfer': [], Functions: [], GPU: [] };
    const bizHours = [...Array(H).keys()].filter(h => SIM.billOn('business', h)).length;
    let cum = 0; const cumArr = []; let at80 = null, at100 = null;
    for (let h = 0; h < H; h++) {
      const on = SIM.billOn(p.schedule, h);
      const vm = p.commit ? p.vms * p.vmRate * (1 - p.commitDisc / 100) : (on ? p.vms * p.vmRate : 0);
      const busy = SIM.billOn('business', h) ? 1 / bizHours : 0; // traffic-driven costs follow business hours
      cats.Compute.push(vm); cats.Database.push(p.db ? p.dbRate : 0); cats.Storage.push(p.storageGB * p.storageRate / H);
      cats['Data transfer'].push(p.egressGB * p.egressRate * busy); cats.Functions.push(p.fnM * p.fnRate * busy); cats.GPU.push(p.gpu ? p.gpuRate : 0);
      const hc = Object.values(cats).reduce((s, a) => s + a[h], 0); cum += hc; cumArr.push(cum);
      if (at80 === null && cum >= 0.8 * p.budget) at80 = h; if (at100 === null && cum >= p.budget) at100 = h;
    }
    const totals = {}; Object.entries(cats).forEach(([k, a]) => totals[k] = a.reduce((s, v) => s + v, 0));
    return { p, cats, totals, cum: cumArr, total: cum, at80, at100, hourly: cumArr.map((c, i) => c - (i ? cumArr[i - 1] : 0)) };
  };
})(typeof window !== 'undefined' ? window : globalThis);

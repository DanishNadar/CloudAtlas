/* Queueing models.
   - SIM.mmc: steady-state M/M/c (Erlang C) — used where a closed form is appropriate (inference lab).
   - SIM.Traffic: a deterministic time-stepped fluid model of a load-balanced fleet (Chapter 6).
     Each instance is a FIFO server with capacity cap (req/s); arrivals are split by the load balancer;
     queue beyond (cap × timeout) is rejected; waiting time ≈ queue / cap (Little's law for a FIFO server). */
(function (G) {
  const SIM = G.SIM = G.SIM || {};

  // Erlang C probability of waiting. c servers, offered load a = λ/μ. Stable recursion via Erlang B.
  SIM.erlangC = (c, a) => {
    if (c <= 0) return 1;
    if (a >= c) return 1;
    let B = 1;
    for (let k = 1; k <= c; k++) B = (a * B) / (k + a * B);
    const rho = a / c;
    return B / (1 - rho * (1 - B));
  };
  SIM.mmc = (lambda, mu, c) => {
    const a = lambda / mu, rho = a / c;
    if (!(c > 0) || rho >= 1) return { rho, stable: false, pw: 1, Wq: Infinity, W: Infinity };
    const pw = SIM.erlangC(c, a);
    const Wq = pw / (c * mu - lambda);
    return { rho, stable: true, pw, Wq, W: Wq + 1 / mu };
  };

  SIM.trafficDefaults = {
    rps: 300, cap: 100, procMs: 80, timeoutS: 2, strategy: 'least', azs: 2, perAz: 2,
    auto: false, target: 0.7, delayS: 45, cooldownS: 20, min: 2, max: 16, hcS: 6, degraded: false
  };

  SIM.Traffic = function (opts) {
    const p = Object.assign({}, SIM.trafficDefaults, opts || {});
    const AZ = ['a', 'b', 'c'].slice(0, p.azs);
    let id = 0;
    const T = {
      p, t: 0, inst: [], azDown: new Set(), lastScale: -1e9, lowSince: null, hist: [],
      totals: { offered: 0, served: 0, rejected: 0, failed: 0 }, events: []
    };
    const mk = (az, state = 'healthy', readyAt = 0) => ({ id: ++id, az, state, readyAt, q: 0, util: 0, lat: p.procMs, slow: false, detectAt: null });
    AZ.forEach(az => { for (let k = 0; k < p.perAz; k++) T.inst.push(mk(az)); });
    if (p.degraded && T.inst[0]) T.inst[0].slow = true;
    const capOf = i => p.cap * (i.slow ? 0.4 : 1);
    const inService = () => T.inst.filter(i => i.state === 'healthy' || (i.state === 'failed' && i.detectAt !== null && T.t < i.detectAt));
    const log = m => { T.events.push({ t: T.t, m }); if (T.events.length > 40) T.events.shift(); };

    T.setDegraded = v => { p.degraded = v; if (T.inst[0]) T.inst[0].slow = v; };
    T.failAz = (az, down) => {
      if (down) {
        T.azDown.add(az);
        T.inst.forEach(i => { if (i.az === az && i.state !== 'terminated') { i.state = 'failed'; i.detectAt = T.t + p.hcS; i.q = 0; } });
        log(`AZ ${az} unavailable — health checks will remove its instances in ~${p.hcS}s`);
      } else {
        T.azDown.delete(az);
        T.inst.forEach(i => { if (i.az === az && i.state === 'failed') { i.state = 'provisioning'; i.readyAt = T.t + p.delayS; i.detectAt = null; } });
        log(`AZ ${az} restored — replacement instances launching`);
      }
    };
    T.failOne = () => {
      const h = T.inst.find(i => i.state === 'healthy');
      if (h) { h.state = 'failed'; h.detectAt = T.t + p.hcS; h.q = 0; h.single = true; log(`instance ${h.id} (AZ ${h.az}) crashed`); }
    };
    T.addInstance = () => {
      const up = AZ.filter(a => !T.azDown.has(a)); if (!up.length) return;
      const counts = up.map(a => T.inst.filter(i => i.az === a && i.state !== 'terminated' && i.state !== 'failed').length);
      const az = up[counts.indexOf(Math.min(...counts))];
      T.inst.push(mk(az, 'provisioning', T.t + p.delayS)); log(`launching instance in AZ ${az} (ready in ${p.delayS}s)`);
    };
    T.removeInstance = () => {
      const live = T.inst.filter(i => i.state === 'healthy' || i.state === 'provisioning');
      if (live.length <= 1) return; const v = live[live.length - 1]; v.state = 'terminated'; log(`terminated instance ${v.id}`);
    };

    T.step = (dt, rps) => {
      T.t += dt;
      // lifecycle
      T.inst.forEach(i => {
        if (i.state === 'provisioning' && T.t >= i.readyAt) { i.state = 'healthy'; log(`instance ${i.id} passed health checks`); }
        if (i.state === 'failed' && i.detectAt !== null && T.t >= i.detectAt) {
          i.detectAt = null; log(`load balancer stopped routing to instance ${i.id}`);
          if (i.single && p.auto) { i.state = 'terminated'; T.addInstance(); }
        }
      });
      T.inst = T.inst.filter(i => i.state !== 'terminated' || false);
      const svc = inService();
      const arrivals = rps * dt;
      T.totals.offered += arrivals;
      let served = 0, rejected = 0, failed = 0, latW = 0, maxLat = 0;
      if (!svc.length) { rejected += arrivals; }
      else {
        const share = new Map(svc.map(i => [i, 0]));
        if (p.strategy === 'rr') svc.forEach(i => share.set(i, arrivals / svc.length));
        else { // least outstanding requests: water-filling in parcels toward the lowest normalized backlog
          const parcels = 24, chunk = arrivals / parcels;
          const proj = new Map(svc.map(i => [i, i.q]));
          for (let k = 0; k < parcels; k++) {
            let best = null, bv = Infinity;
            for (const i of svc) { const v = i.state === 'failed' ? (proj.get(i)) / p.cap : proj.get(i) / capOf(i); if (v < bv) { bv = v; best = i; } }
            share.set(best, share.get(best) + chunk); proj.set(best, proj.get(best) + chunk);
          }
        }
        for (const i of svc) {
          const a = share.get(i);
          if (i.state === 'failed') { failed += a; continue; } // routed to a dead target before health checks notice
          const c = capOf(i);
          i.q += a;
          const s = Math.min(i.q, c * dt); i.q -= s; served += s;
          const qmax = c * p.timeoutS;
          if (i.q > qmax) { rejected += i.q - qmax; i.q = qmax; }
          i.util = s / (c * dt);
          i.lat = p.procMs + (i.q / c) * 1000;
          latW += s * i.lat; maxLat = Math.max(maxLat, i.lat);
        }
      }
      T.inst.forEach(i => { if (i.state !== 'healthy') i.util = 0; });
      T.totals.served += served; T.totals.rejected += rejected; T.totals.failed += failed;
      const healthy = T.inst.filter(i => i.state === 'healthy');
      const capTotal = healthy.reduce((s, i) => s + capOf(i), 0);
      const util = capTotal ? Math.min(1, (served / dt) / capTotal) : 0;
      const pt = { t: T.t, offered: rps, served: served / dt, rejected: rejected / dt, failed: failed / dt, lat: served ? latW / served : 0, maxLat, util, healthy: healthy.length, capTotal };
      T.hist.push(pt); while (T.hist.length && T.hist[0].t < T.t - 90) T.hist.shift();
      // autoscaling on average utilization over the last 10 s
      if (p.auto) {
        const win = T.hist.filter(h => h.t > T.t - 10); const avgU = win.reduce((s, h) => s + h.util, 0) / Math.max(1, win.length);
        const prov = T.inst.filter(i => i.state === 'provisioning').length;
        const n = healthy.length + prov;
        if (avgU > p.target && T.t - T.lastScale > p.cooldownS && n < p.max) {
          const want = Math.min(p.max, Math.ceil(healthy.length * avgU / p.target) + (avgU >= 0.999 ? 1 : 0));
          const add = Math.max(1, want - n); for (let k = 0; k < add && n + k < p.max; k++) T.addInstance();
          T.lastScale = T.t; T.lowSince = null;
        } else if (avgU < p.target * 0.45 && n > p.min && prov === 0) {
          if (T.lowSince === null) T.lowSince = T.t;
          if (T.t - T.lowSince > 30 && T.t - T.lastScale > p.cooldownS) { T.removeInstance(); T.lastScale = T.t; T.lowSince = null; }
        } else T.lowSince = null;
      }
      return pt;
    };
    T.capacity = () => T.inst.filter(i => i.state === 'healthy').reduce((s, i) => s + capOf(i), 0);
    return T;
  };
})(typeof window !== 'undefined' ? window : globalThis);

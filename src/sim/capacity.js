/* On-premises vs. cloud capacity model (Chapter 1).
   Weekly time steps. All prices are adjustable, illustrative assumptions — not provider list prices. */
(function (G) {
  const SIM = G.SIM = G.SIM || {};

  SIM.capacityDefaults = {
    weeks: 156,            // simulation horizon
    baseUsers: 20000,      // peak concurrent-ish users served at week 0
    growthPct: 60,         // demand growth per year, %
    seasonPct: 15,         // seasonal swing amplitude, %
    spikeWeek: 40,         // a launch / marketing spike
    spikeMult: 2.2,        // demand multiplier during the spike
    spikeWeeks: 3,
    usersPerServer: 2000,  // capacity of one server
    onpremServers: 14,     // initial purchase
    leadWeeks: 10,         // time from purchase order to racked server
    buyAt: 0.8,            // order more when projected utilization exceeds this
    capex: 6000,           // $ per on-prem server (hardware), paid at order time
    lifeYears: 5,          // hardware depreciation period used for the amortized comparison
    opexWeek: 30,          // $ per on-prem server-week (power, space, maintenance share)
    cloudWeek: 90,         // $ per cloud server-week (on-demand style)
    cloudTarget: 0.7       // autoscaling target utilization
  };

  SIM.demandAt = (p, w) => {
    const growth = Math.pow(1 + p.growthPct / 100, w / 52);
    const season = 1 + (p.seasonPct / 100) * Math.sin(2 * Math.PI * w / 52);
    const spike = (w >= p.spikeWeek && w < p.spikeWeek + p.spikeWeeks) ? p.spikeMult : 1;
    return p.baseUsers * growth * season * spike;
  };

  SIM.capacity = function (opts) {
    const p = Object.assign({}, SIM.capacityDefaults, opts || {});
    const out = { p, weeks: [], demand: [], onCap: [], cloudCap: [], onServed: [], cloudServed: [], onCost: [], cloudCost: [] };
    let onServers = p.onpremServers, pending = []; // {arrive, n}
    let onCash = p.onpremServers * p.capex, onCum = 0, cloudCum = 0; const amort = p.capex / (p.lifeYears * 52);
    let onUnserved = 0, cloudUnserved = 0, totalDemand = 0, onUtilSum = 0, cloudUtilSum = 0, purchases = [{ week: 0, n: p.onpremServers }];
    for (let w = 0; w < p.weeks; w++) {
      // deliveries
      pending = pending.filter(o => { if (o.arrive <= w) { onServers += o.n; return false; } return true; });
      const d = SIM.demandAt(p, w);
      // On-prem planning: look ahead by lead time using the trend (not the spike — spikes are hard to forecast)
      const ahead = p.baseUsers * Math.pow(1 + p.growthPct / 100, (w + p.leadWeeks) / 52) * (1 + p.seasonPct / 100);
      const onOrder = pending.reduce((s, o) => s + o.n, 0);
      const projCap = (onServers + onOrder) * p.usersPerServer;
      if (ahead / projCap > p.buyAt) {
        const need = Math.ceil(ahead / (p.usersPerServer * 0.6)) - (onServers + onOrder);
        if (need > 0) { pending.push({ arrive: w + p.leadWeeks, n: need }); onCash += need * p.capex; purchases.push({ week: w, n: need }); }
      }
      const onCap = onServers * p.usersPerServer;
      // Cloud: capacity follows demand at the target utilization (weekly granularity hides minutes of scale-out delay)
      const cloudServers = Math.max(1, Math.ceil(d / (p.usersPerServer * p.cloudTarget)));
      const cloudCap = cloudServers * p.usersPerServer;
      const onServed = Math.min(d, onCap), cloudServed = Math.min(d, cloudCap);
      onUnserved += d - onServed; cloudUnserved += d - cloudServed; totalDemand += d;
      onUtilSum += onServed / onCap; cloudUtilSum += cloudServed / cloudCap;
      onCash += onServers * p.opexWeek; onCum += onServers * (p.opexWeek + amort); cloudCum += cloudServers * p.cloudWeek;
      out.weeks.push(w); out.demand.push(d); out.onCap.push(onCap); out.cloudCap.push(cloudCap);
      out.onServed.push(onServed); out.cloudServed.push(cloudServed); out.onCost.push(onCum); out.cloudCost.push(cloudCum);
    }
    out.summary = {
      onUnservedPct: 100 * onUnserved / totalDemand, cloudUnservedPct: 100 * cloudUnserved / totalDemand,
      onUtil: onUtilSum / p.weeks, cloudUtil: cloudUtilSum / p.weeks,
      onCost: onCum, onCash, cloudCost: cloudCum, purchases, finalOnServers: onServers + pending.reduce((s, o) => s + o.n, 0)
    };
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);

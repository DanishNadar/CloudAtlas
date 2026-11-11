/* Architecture trade-off model (Chapter 11). Unit prices are illustrative educational assumptions, editable in the UI.
   For real estimates use the AWS Pricing Calculator. */
(function (G) {
  const SIM = G.SIM = G.SIM || {};
  SIM.costUnits = {
    instance: { small: 30, medium: 60, large: 120 },          // $/month per instance, on-demand style
    instanceRps: { small: 150, medium: 300, large: 600 },     // sustainable requests/s per instance at the app tier
    lb: 25, natPerAz: 35, cache: 50, cdn: 40, waf: 20,
    db: { ec2: 60, rds: 110, rdsMulti: 220, dynamo: 90 },     // $/month for the workload's database tier
    monitoring: { basic: 0, standard: 30, full: 90 },
    purchase: { ondemand: 1, reserved: 0.65, spot: 0.35 },    // multiplier on instance cost
    egressGB: 0.09, egressGBMonth: 2000
  };
  SIM.costDefaults = { peakRps: 1200, size: 'medium', count: 6, azs: 2, db: 'rds', cache: false, cdn: true, waf: false, monitoring: 'standard', purchase: 'ondemand', budget: 1200, natPerAz: true };

  SIM.costEval = function (opts, unitsIn) {
    const d = Object.assign({}, SIM.costDefaults, opts || {});
    const U = unitsIn || SIM.costUnits;
    const items = [];
    const add = (label, v, note) => { items.push({ label, v, note }); return v; };
    const perInst = U.instance[d.size] * U.purchase[d.purchase];
    add(`App instances (${d.count} × ${d.size}, ${d.purchase})`, d.count * perInst);
    add('Load balancer', U.lb);
    const nats = d.natPerAz ? d.azs : 1;
    add(`NAT gateway${nats > 1 ? 's' : ''} (${nats})`, nats * U.natPerAz, 'Often a surprise line item; one per AZ avoids cross-AZ dependency.');
    add({ ec2: 'Database on EC2 (self-managed)', rds: 'Managed relational DB (single-AZ)', rdsMulti: 'Managed relational DB (Multi-AZ standby)', dynamo: 'Key-value DB (on-demand)' }[d.db], U.db[d.db]);
    if (d.cache) add('In-memory cache', U.cache);
    if (d.cdn) add('CDN', U.cdn);
    if (d.waf) add('Web application firewall', U.waf);
    add(`Monitoring (${d.monitoring})`, U.monitoring[d.monitoring]);
    const egressGB = U.egressGBMonth * (d.cdn ? 0.4 : 1);
    add(`Data transfer out (~${egressGB} GB)`, egressGB * U.egressGB, d.cdn ? 'CDN caching reduces origin egress (assumed 60%).' : 'No CDN: all bytes leave from the origin.');
    const total = items.reduce((s, i) => s + i.v, 0);

    const instRps = U.instanceRps[d.size] * (d.cache ? 1.3 : 1); // cache offloads repeated reads from the app tier
    const cap = d.count * instRps;
    const dbCap = { ec2: 1500, rds: 1500, rdsMulti: 1500, dynamo: 1e9 }[d.db] * (d.cache ? 2.5 : 1);
    const effCap = Math.min(cap, dbCap);
    const perAz = d.azs > 0 ? Math.floor(d.count / d.azs) : d.count;
    const afterInst = Math.min((d.count - 1) * instRps, dbCap);
    const afterAz = d.azs > 1 ? Math.min((d.count - Math.ceil(d.count / d.azs)) * instRps, dbCap) : 0;
    const dbSurvivesAz = d.db === 'rdsMulti' || d.db === 'dynamo';
    const notes = [];
    if (effCap < d.peakRps) notes.push({ k: 'bad', pillar: 'Performance efficiency', m: `Capacity ${Math.round(effCap)} req/s is below the ${d.peakRps} req/s peak${dbCap < cap ? ' — the database tier is the bottleneck' : ''}.` });
    if (afterInst < d.peakRps) notes.push({ k: 'warn', pillar: 'Reliability', m: 'Losing one instance drops capacity below peak.' });
    if (d.azs === 1) notes.push({ k: 'warn', pillar: 'Reliability', m: 'Single AZ: an AZ outage takes the whole application down.' });
    else if (afterAz < d.peakRps) notes.push({ k: 'warn', pillar: 'Reliability', m: `If one AZ fails, the remaining ${d.count - Math.ceil(d.count / d.azs)} instances handle ~${Math.round(afterAz)} req/s — degraded at peak.` });
    if (d.azs > 1 && !dbSurvivesAz) notes.push({ k: 'warn', pillar: 'Reliability', m: 'The app spans AZs but the database does not: a database-AZ outage still stops writes and reads.' });
    if (d.purchase === 'spot') notes.push({ k: 'warn', pillar: 'Cost optimization', m: 'Spot capacity can be interrupted with short notice; fine for fault-tolerant work, risky as the only capacity.' });
    if (d.purchase === 'reserved') notes.push({ k: 'info', pillar: 'Cost optimization', m: 'Reserved-style pricing lowers cost in exchange for a 1–3 year commitment.' });
    if (d.db === 'ec2') notes.push({ k: 'info', pillar: 'Operational excellence', m: 'Self-managed database: you own patching, backups, replication and failover.' });
    if (d.monitoring === 'basic') notes.push({ k: 'warn', pillar: 'Operational excellence', m: 'Basic monitoring only: slower detection and diagnosis of incidents.' });
    if (!d.waf) notes.push({ k: 'info', pillar: 'Security', m: 'No WAF: common web attacks are handled only by your application code.' });
    if (total > d.budget) notes.push({ k: 'bad', pillar: 'Cost optimization', m: `Over budget by $${Math.round(total - d.budget)}/month.` });
    const util = Math.min(1, d.peakRps / Math.max(1, effCap));
    if (util < 0.4) notes.push({ k: 'info', pillar: 'Sustainability', m: `Peak uses only ${Math.round(util * 100)}% of capacity: you may be paying for idle headroom.` });
    const ops = 1 + (d.db === 'ec2' ? 3 : 0) + (d.azs > 1 ? 1 : 0) + (d.cache ? 1 : 0) + (d.purchase === 'spot' ? 1 : 0) + (d.waf ? 0.5 : 0);
    return { d, items, total, cap: effCap, appCap: cap, dbCap, afterInst, afterAz, dbSurvivesAz, notes, ops, util, perAz };
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* AI infrastructure models (Chapter 12–13). Every constant here is an illustrative assumption, shown in the UI.
   - SIM.llmPlan: memory fit, batching, per-replica throughput and an M/M/c queue for an LLM inference fleet.
   - SIM.parallel: CPU vs GPU time for N independent (or dependent) tasks, including transfer and launch overhead.
   - SIM.distJob: a partitioned map → shuffle → reduce job on W workers. */
(function (G) {
  const SIM = G.SIM = G.SIM || {};

  // Architecture assumptions resemble common open-weight decoder models that use grouped-query attention.
  SIM.llmModels = {
    '8b': { label: '8B parameters', params: 8e9, layers: 32, kvDim: 1024, stepBaseMs: 12, stepPerSeqMs: 0.15, prefillTokS: 8000 },
    '70b': { label: '70B parameters', params: 70e9, layers: 80, kvDim: 1024, stepBaseMs: 45, stepPerSeqMs: 0.5, prefillTokS: 2000 }
  };
  SIM.llmDefaults = { model: '8b', rps: 4, inTok: 1200, outTok: 300, batch: 16, replicas: 2, gpus: 1, gpuMemGB: 80, bytesPerParam: 2, comm: 0.12, gpuHour: 4, loadS: 180 };

  // KV cache bytes per token = 2 (K and V) × layers × kvDim × bytes per value
  SIM.kvBytesPerToken = m => 2 * m.layers * m.kvDim * 2;
  SIM.tpSpeedup = (g, comm) => g / (1 + comm * (g - 1)); // tensor-parallel speedup with communication overhead

  SIM.llmPlan = function (opts) {
    const p = Object.assign({}, SIM.llmDefaults, opts || {});
    const m = SIM.llmModels[p.model];
    const memGB = p.gpus * p.gpuMemGB;
    const weightsGB = m.params * p.bytesPerParam / 1e9;
    const reserveGB = 0.1 * memGB; // activations, runtime, fragmentation
    const freeGB = memGB - weightsGB - reserveGB;
    const kvPerSeqGB = SIM.kvBytesPerToken(m) * (p.inTok + p.outTok) / 1e9;
    const fits = freeGB > kvPerSeqGB;
    const memBatch = fits ? Math.floor(freeGB / kvPerSeqGB) : 0;
    const batch = Math.max(0, Math.min(p.batch, memBatch));
    const sp = SIM.tpSpeedup(p.gpus, p.comm);
    const stepMs = (m.stepBaseMs + m.stepPerSeqMs * batch) / sp;
    const prefillS = p.inTok / (m.prefillTokS * sp);
    const serviceS = prefillS + p.outTok * stepMs / 1000; // time one request occupies a batch slot
    const slots = p.replicas * batch;
    const mu = serviceS > 0 ? 1 / serviceS : 0;
    const q = fits && slots > 0 ? SIM.mmc(p.rps, mu, slots) : { stable: false, rho: Infinity, Wq: Infinity, pw: 1 };
    const capRps = slots * mu;
    const ttft = q.Wq + prefillS + stepMs / 1000;
    const latency = q.Wq + serviceS;
    const tokPerSec = Math.min(p.rps, capRps) * p.outTok;
    const costHr = p.replicas * p.gpus * p.gpuHour;
    const costPerMTok = tokPerSec > 0 ? costHr / (tokPerSec * 3600) * 1e6 : Infinity;
    const perStreamTokS = stepMs > 0 ? 1000 / stepMs : 0;
    const backlog = Math.max(0, p.rps - capRps) * p.loadS; // requests that pile up while a new replica loads
    return { p, m, memGB, weightsGB, reserveGB, freeGB, kvPerSeqGB, fits, memBatch, batch, sp, stepMs, prefillS, serviceS, slots, capRps,
      rho: q.rho, stable: q.stable, pw: q.pw, waitS: q.Wq, ttft, latency, tokPerSec, costHr, costPerMTok, perStreamTokS, backlog,
      kvUsedGB: batch * kvPerSeqGB };
  };

  SIM.parallelDefaults = { n: 4096, opsPerTask: 1, dependent: false, cpuCores: 8, cpuTicksPerOp: 1, gpuLanes: 512, gpuTicksPerOp: 4, transferTasksPerTick: 128, launchTicks: 30 };
  SIM.parallel = function (opts) {
    const p = Object.assign({}, SIM.parallelDefaults, opts || {});
    const k = p.opsPerTask;
    const transfer = 2 * Math.ceil(p.n / p.transferTasksPerTick); // copy inputs to the device and results back
    let cpu, gpuCompute;
    if (p.dependent) { cpu = p.n * k * p.cpuTicksPerOp; gpuCompute = p.n * k * p.gpuTicksPerOp; }
    else { cpu = Math.ceil(p.n / p.cpuCores) * k * p.cpuTicksPerOp; gpuCompute = Math.ceil(p.n / p.gpuLanes) * k * p.gpuTicksPerOp; }
    const gpu = p.launchTicks + transfer + gpuCompute;
    const lanesUsed = p.dependent ? 1 : Math.min(p.gpuLanes, p.n);
    return { p, cpu, gpu, gpuCompute, transfer, launch: p.launchTicks, winner: cpu < gpu ? 'cpu' : gpu < cpu ? 'gpu' : 'tie', speedup: cpu / gpu, gpuUtil: lanesUsed / p.gpuLanes };
  };

  SIM.distDefaults = { dataGB: 200, partitions: 64, workers: 8, skew: 0.3, rateGBs: 0.5, taskOverheadS: 2, shuffleFrac: 0.3, netGBs: 0.25, schedPerTaskS: 0.05 };
  SIM.distJob = function (opts) {
    const p = Object.assign({}, SIM.distDefaults, opts || {});
    const w = []; let sum = 0;
    for (let i = 0; i < p.partitions; i++) { const v = 1 / Math.pow(i + 1, p.skew); w.push(v); sum += v; }
    const sizes = w.map(v => p.dataGB * v / sum);
    const tasks = sizes.map(s => s / p.rateGBs + p.taskOverheadS).sort((a, b) => b - a);
    const load = new Array(p.workers).fill(0); const assign = [];
    tasks.forEach((t, i) => { let k = 0; for (let j = 1; j < load.length; j++) if (load[j] < load[k]) k = j; assign.push({ task: i, worker: k, start: load[k], dur: t }); load[k] += t; });
    const mapS = Math.max(...load);
    const shuffleGB = p.dataGB * p.shuffleFrac;
    const shuffleS = p.workers > 1 ? (shuffleGB * (p.workers - 1) / p.workers) / (p.workers * p.netGBs) : 0;
    const reduceS = shuffleGB / (p.workers * p.rateGBs) + p.taskOverheadS;
    const schedS = p.partitions * p.schedPerTaskS;
    const total = mapS + shuffleS + reduceS + schedS;
    const serial = p.dataGB / p.rateGBs + shuffleGB / p.rateGBs;
    const avgLoad = load.reduce((a, b) => a + b, 0) / p.workers;
    return { p, sizes, assign, load, mapS, shuffleS, reduceS, schedS, total, serial, speedup: serial / total, balance: avgLoad / mapS };
  };
})(typeof window !== 'undefined' ? window : globalThis);

// Unit tests for the simulation engines — run with: node tools/sim-tests.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = vm.createContext({ console });
for (const f of ['capacity', 'queue', 'vpc', 'iam', 'ai', 'cost', 'studio']) vm.runInContext(readFileSync(new URL(`../src/sim/${f}.js`, import.meta.url), 'utf8'), ctx);
const SIM = ctx.SIM;
let pass = 0, fail = 0;
const t = (name, cond, extra = '') => { if (cond) pass++; else { fail++; console.log('FAIL', name, extra); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// --- capacity
{
  const r = SIM.capacity({});
  t('capacity: horizon', r.weeks.length === 156);
  t('capacity: on-prem ties up cash up front', r.summary.onCash > r.summary.onCost);
  t('capacity: cloud never under-serves', r.summary.cloudUnservedPct === 0);
  t('capacity: on-prem misses the unforecast spike', r.summary.onUnservedPct > 0);
  t('capacity: cloud util near target', r.summary.cloudUtil > 0.6 && r.summary.cloudUtil <= 0.7 + 1e-9);
  const flat = SIM.capacity({ growthPct: 0, seasonPct: 0, spikeMult: 1, onpremServers: 12 });
  t('capacity: steady demand — on-prem can be cheaper', flat.summary.onCost < flat.summary.cloudCost, `${flat.summary.onCost} vs ${flat.summary.cloudCost}`);
}
// --- erlang C / M/M/c
{
  t('mmc: M/M/1 matches 1/(mu-lambda)', near(SIM.mmc(0.5, 1, 1).W, 2, 1e-9));
  t('erlangC: c=2 a=1 is 1/3', near(SIM.erlangC(2, 1), 1 / 3, 1e-9));
  t('mmc: unstable when rho>=1', SIM.mmc(10, 1, 10).stable === false);
}
// --- traffic
{
  const T = SIM.Traffic({ rps: 300, cap: 100, azs: 2, perAz: 2 });
  let pt; for (let i = 0; i < 300; i++) pt = T.step(0.1, 300);
  t('traffic: under capacity serves all', near(pt.served, 300, 1) && pt.rejected < 1e-6, JSON.stringify(pt));
  t('traffic: util 0.75', near(pt.util, 0.75, 0.01));
  T.failAz('b', true);
  for (let i = 0; i < 30; i++) pt = T.step(0.1, 300); // within health-check window
  t('traffic: requests fail before health checks detect', pt.failed > 0);
  for (let i = 0; i < 600; i++) pt = T.step(0.1, 300);
  t('traffic: after AZ loss, throughput capped at remaining capacity', near(pt.served, 200, 1), JSON.stringify(pt));
  t('traffic: excess rejected', near(pt.rejected, 100, 2));
  t('traffic: latency includes queueing at timeout', pt.lat > 1500);
  const A = SIM.Traffic({ rps: 300, cap: 100, azs: 2, perAz: 1, auto: true, target: 0.7, delayS: 10, cooldownS: 5 });
  for (let i = 0; i < 900; i++) pt = A.step(0.1, 300);
  t('traffic: autoscaling recovers', pt.healthy >= 5 && pt.rejected < 1e-6, JSON.stringify(pt));
  const RR = SIM.Traffic({ rps: 250, cap: 100, azs: 1, perAz: 3, strategy: 'rr', degraded: true });
  const LO = SIM.Traffic({ rps: 250, cap: 100, azs: 1, perAz: 3, strategy: 'least', degraded: true });
  let a, b; for (let i = 0; i < 400; i++) { a = RR.step(0.1, 250); b = LO.step(0.1, 250); }
  t('traffic: least-outstanding beats round robin with a slow instance', b.rejected < a.rejected, `${a.rejected} ${b.rejected}`);
}
// --- vpc
{
  const ok = id => SIM.vpcEval({}, id).ok;
  t('vpc: defaults allow intended paths', ok('web') && ok('alb-app') && ok('app-db') && ok('app-out'));
  t('vpc: defaults block direct access', !ok('net-app') && !ok('net-db'));
  t('vpc: no NAT breaks outbound from private', !SIM.vpcEval({ nat: false }, 'app-out').ok);
  t('vpc: public subnet without public IP still unreachable', !SIM.vpcEval({ appSubnet: 'public', sgAppFrom: 'world' }, 'net-app').ok);
  t('vpc: public subnet + public IP + open SG is reachable', SIM.vpcEval({ appSubnet: 'public', appPublicIp: true, sgAppFrom: 'world' }, 'net-app').ok);
  t('vpc: SG blocks even with public IP', !SIM.vpcEval({ appSubnet: 'public', appPublicIp: true, sgAppFrom: 'alb' }, 'net-app').ok);
  t('vpc: stateless NACL without ephemeral rule breaks reply', !SIM.vpcEval({ dbNacl: 'noEphemeral' }, 'app-db').ok);
  t('vpc: correct NACL works', SIM.vpcEval({ dbNacl: 'good' }, 'app-db').ok);
  t('vpc: NACL written for private CIDR blocks app moved to public', !SIM.vpcEval({ dbNacl: 'good', appSubnet: 'public' }, 'app-db').ok);
  t('vpc: db open to world still unreachable from internet (no route/IP)', !SIM.vpcEval({ sgDbFrom: 'world' }, 'net-db').ok);
}
// --- iam
{
  const L = SIM.iamPresets.least;
  const d = (sts, r) => SIM.iamEval(sts, r.action, r.resource).decision;
  const R = Object.fromEntries(SIM.iamRequests.map(r => [r.id, r]));
  t('iam: least privilege allows needed', ['r1', 'r2', 'r3', 'r4'].every(k => d(L, R[k]) === 'Allow'));
  t('iam: least privilege denies the rest', ['r5', 'r6', 'r7'].every(k => d(L, R[k]) === 'ImplicitDeny'));
  t('iam: explicit deny overrides allow', d(SIM.iamPresets.guard, R.r5) === 'ExplicitDeny');
  t('iam: admin allows everything', SIM.iamRequests.every(r => d(SIM.iamPresets.admin, r) === 'Allow'));
  t('iam: ListBucket needs the bucket ARN, not /*', d(SIM.iamPresets.broken, R.r3) === 'ImplicitDeny');
  t('iam: action matching is case-insensitive', SIM.iamEval([{ Effect: 'Allow', Action: 'S3:getobject', Resource: '*' }], 's3:GetObject', 'x').decision === 'Allow');
}
// --- ai
{
  const a = SIM.llmPlan({});
  t('llm: 8B fits one 80 GB GPU', a.fits && near(a.weightsGB, 16, 1e-9));
  t('llm: KV per token 8B = 131072 B', SIM.kvBytesPerToken(SIM.llmModels['8b']) === 131072);
  t('llm: 70B does not fit one GPU', !SIM.llmPlan({ model: '70b', gpus: 1 }).fits);
  const b2 = SIM.llmPlan({ model: '70b', gpus: 2 });
  t('llm: 70B on 2 GPUs is memory-limited', b2.fits && b2.memBatch < 16, b2.memBatch);
  t('llm: more replicas lower latency', SIM.llmPlan({ rps: 6, replicas: 3 }).latency < SIM.llmPlan({ rps: 6, replicas: 2 }).latency);
  t('llm: TP speedup sublinear', SIM.tpSpeedup(4, 0.12) < 4 && SIM.tpSpeedup(4, 0.12) > 1);
  t('llm: overload unstable', !SIM.llmPlan({ rps: 50 }).stable);
  const p1 = SIM.parallel({ n: 64 }), p2 = SIM.parallel({ n: 100000, opsPerTask: 8 }), p3 = SIM.parallel({ n: 4096, dependent: true });
  t('parallel: small job favors CPU', p1.winner === 'cpu');
  t('parallel: large intense job favors GPU', p2.winner === 'gpu');
  t('parallel: dependent chain favors CPU', p3.winner === 'cpu');
  const j1 = SIM.distJob({ workers: 4 }), j2 = SIM.distJob({ workers: 32 });
  t('dist: more workers faster', j2.total < j1.total);
  t('dist: speedup sublinear', j2.speedup / j1.speedup < 8);
  t('dist: skew hurts balance', SIM.distJob({ skew: 1.2 }).balance < SIM.distJob({ skew: 0 }).balance);
}
// --- cost & studio
{
  const c = SIM.costEval({});
  t('cost: items sum to total', near(c.items.reduce((s, i) => s + i.v, 0), c.total, 1e-9));
  t('cost: reserved cheaper than on-demand', SIM.costEval({ purchase: 'reserved' }).total < c.total);
  t('cost: db bottleneck detected', SIM.costEval({ count: 12 }).cap === 1500);
  for (const k of Object.keys(SIM.studioChallenges)) t(`studio: example passes ${k}`, SIM.studioCheck(k, SIM.studioExamples[k]).pass, JSON.stringify(SIM.studioCheck(k, SIM.studioExamples[k]).checks.filter(x => !x.pass && x.level === 'required')));
  t('studio: empty design fails', !SIM.studioCheck('webapp', SIM.studioDefaults()).pass);
  const pub = Object.assign({}, SIM.studioExamples.webapp, { dbPublic: true });
  t('studio: public DB flagged', SIM.studioCheck('webapp', pub).checks.some(x => !x.pass && /not publicly/.test(x.msg)));
  t('studio: AZ failure kills single-AZ db', SIM.studioFail('webapp', Object.assign({}, SIM.studioExamples.webapp, { multiAz: false }), 'az').some(x => x.k === 'bad'));
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

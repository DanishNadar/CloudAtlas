/* Chapter 8 (security/IAM) · Chapter 9 (deployment, containers) · Chapter 10 (operations) · Chapter 11 (cost & Well-Architected) */

scene({
  id: 'iam', section: 'explore', ch: 8, kicker: 'Security and shared responsibility', title: 'How do engineers protect cloud systems?', short: 'IAM policy laboratory', lab: 'Write a policy; see allow, explicit deny and implicit deny.',
  objectives: ['Separate authentication (who) from authorization (what)', 'Write least-privilege policies with actions and resources', 'Apply evaluation: explicit deny > allow > implicit deny'],
  html: `
  <div class="split even">
    <div class="col">
      <div class="controls" id="pre"></div>
      <div id="sts" style="display:grid;gap:8px"></div>
      <div class="controls"><button class="btn" id="add" type="button">Add statement</button></div>
      <details class="explain" open><summary style="cursor:pointer;font-weight:600">Policy JSON</summary><pre class="code" id="json" style="margin-top:8px"></pre></details>
    </div>
    <div class="rail">
      <div class="explain"><h4>The app role "pixelpost-api" makes these calls</h4><p>Only the first four are part of its job.</p></div>
      <div class="tscroll"><table class="t" id="req"></table></div>
      <div class="tiles" id="tiles"></div>
      <div class="explain" id="why" aria-live="polite"></div>
      <div class="engbox eng-only"><b>What this lab models</b><p>Identity-based policies with Action and Resource wildcards. Explicit Deny beats Allow; no matching Allow = implicit deny.</p><p>Not modeled: Conditions, NotAction, resource-based policies (e.g. bucket policies), permission boundaries, SCPs, session policies, cross-account access. This is a learning tool, not a policy validator — use IAM Access Analyzer and the policy simulator for real policies.</p></div>
    </div>
  </div>`,
  notice: 'Green rows the app needs should be allowed; red rows it doesn\'t need should be denied. Anything extra allowed is risk.',
  myth: 'Encryption doesn\'t replace authorization. If a role is allowed to read an encrypted object, the service decrypts it for that role.',
  mount(el) {
    let sts = JSON.parse(JSON.stringify(SIM.iamPresets.admin)); let pick = 'r1';
    const box = el.querySelector('#sts');
    function editor() {
      box.innerHTML = '';
      sts.forEach((s, i) => {
        const c = document.createElement('div'); c.className = 'card'; c.style.padding = '10px 12px';
        c.innerHTML = `<div class="controls" style="justify-content:space-between"><span class="kicker" style="color:var(--dim)">Statement ${i + 1}</span><span class="controls"></span></div><div class="chips act" style="margin-top:6px"></div>`;
        const tools = c.querySelectorAll('.controls')[1];
        U.seg(tools, [['Allow', 'Allow'], ['Deny', 'Deny']], s.Effect, v => { s.Effect = v; eval_(); }, 'Effect');
        U.select(tools, 'Resource', SIM.iamResources.map(r => [r, r.replace('arn:aws:', '').replace(':123456789012', '')]), [].concat(s.Resource)[0], v => { s.Resource = v; eval_(); });
        U.btn(tools, 'Remove', () => { sts.splice(i, 1); editor(); eval_(); });
        const act = c.querySelector('.act');
        SIM.iamActions.forEach(a => { const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.textContent = a; const has = () => [].concat(s.Action).includes(a); b.setAttribute('aria-pressed', String(has()));
          b.onclick = () => { let A = [].concat(s.Action); A = has() ? A.filter(x => x !== a) : A.concat(a); s.Action = A.length === 1 ? A[0] : A; b.setAttribute('aria-pressed', String(has())); eval_(); }; act.appendChild(b); });
        box.appendChild(c);
      });
    }
    const D = { Allow: ['allowed', 'c-green'], ExplicitDeny: ['explicit deny', 'c-red'], ImplicitDeny: ['implicit deny', 'c-amber'] };
    function eval_() {
      el.querySelector('#json').textContent = SIM.iamJson(sts.map(s => ({ Effect: s.Effect, Action: s.Action, Resource: s.Resource })));
      const rs = SIM.iamRequests.map(r => ({ r, e: SIM.iamEval(sts, r.action, r.resource) }));
      el.querySelector('#req').innerHTML = `<thead><tr><th>Call</th><th>Needed</th><th>Result</th></tr></thead><tbody>${rs.map(({ r, e }) => `<tr data-id="${r.id}" style="cursor:pointer${r.id === pick ? ';background:var(--panel2)' : ''}"><td>${r.label}<div class="mono c-dim" style="font-size:11.5px">${r.action}</div></td><td>${r.needed ? '<span class="c-green">yes</span>' : '<span class="c-muted">no</span>'}</td><td class="${D[e.decision][1]}">${D[e.decision][0]}${e.by.length ? ` <span class="c-dim">(stmt ${e.by.map(x => x + 1).join(', ')})</span>` : ''}</td></tr>`).join('')}</tbody>`;
      el.querySelectorAll('#req tr[data-id]').forEach(tr => tr.onclick = () => { pick = tr.dataset.id; eval_(); });
      const need = rs.filter(x => x.r.needed), extra = rs.filter(x => !x.r.needed);
      const okNeed = need.filter(x => x.e.decision === 'Allow').length, okExtra = extra.filter(x => x.e.decision === 'Allow').length;
      U.tiles(el.querySelector('#tiles'), [['Needed calls allowed', `${okNeed}/${need.length}`, okNeed === need.length ? 'good' : 'bad'], ['Unneeded calls allowed', `${okExtra}/${extra.length}`, okExtra ? 'bad' : 'good', okExtra ? 'excess privilege' : 'least privilege']]);
      const p = rs.find(x => x.r.id === pick); const r = p.r, e = p.e;
      const ex = e.decision === 'ExplicitDeny' ? `Statement ${e.by.map(x => x + 1).join(', ')} explicitly denies <code class="k">${r.action}</code>. An explicit deny overrides every allow${e.matches.length > e.by.length ? ', including the matching allow in statement ' + e.matches.filter(m => !e.by.includes(m)).map(x => x + 1).join(', ') : ''}.`
        : e.decision === 'Allow' ? `Statement ${e.by.map(x => x + 1).join(', ')} allows <code class="k">${r.action}</code> on <code class="k">${r.resource}</code>, and no statement denies it.`
        : `No statement allows <code class="k">${r.action}</code> on <code class="k">${r.resource}</code>, so it is denied by default.${r.action === 's3:ListBucket' ? ' Note: ListBucket applies to the bucket ARN (…:::photos-bucket), not to objects (…/photos-bucket/*).' : ''}`;
      el.querySelector('#why').innerHTML = `<h4>${r.label}: ${D[e.decision][0]}</h4><p>${ex}</p>`;
      if (okNeed === need.length && okExtra === 0) U.markDone('iam');
    }
    const pre = el.querySelector('#pre');
    [['admin', 'Admin (*:*)'], ['s3full', 'Service-wide'], ['broken', 'Almost right'], ['least', 'Least privilege'], ['guard', 'Allow + deny guard']].forEach(([k, l]) => U.btn(pre, l, () => { sts = JSON.parse(JSON.stringify(SIM.iamPresets[k])); editor(); eval_(); }));
    el.querySelector('#add').onclick = () => { sts.push({ Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::photos-bucket/*' }); editor(); eval_(); };
    editor(); eval_();
  },
  notes: {
    objective: 'Learners write a least-privilege policy and can predict allow / explicit deny / implicit deny.',
    say: ['Authentication proves who you are. Authorization decides what you may do. IAM policies are authorization.', 'Start with Admin: everything works — including deleting orders and reading the billing bucket. That\'s why "it works" isn\'t the goal.', 'Load "Almost right": listing the bucket fails, because ListBucket targets the bucket itself, not the objects inside. Fix it by adding a statement on the bucket ARN.'],
    demo: ['Admin → Almost right (fix it live) → Least privilege → Allow + deny guard (click "Delete a photo" to see the override).'],
    ask: 'Why do teams prefer roles with temporary credentials over access keys stored in code?',
    answer: 'Temporary credentials expire automatically and are never written into code or images, so a leak has a short blast radius and nothing to rotate manually.',
    transition: 'Our app now has code, permissions and infrastructure. How does a change get from a laptop to production safely?'
  },
  check: { q: 'A policy has an Allow for s3:* on a bucket and a Deny for s3:DeleteObject on *. A role calls s3:DeleteObject on that bucket. Result?', opts: ['Allowed — the allow is more specific', 'Denied — explicit deny overrides allow', 'Allowed — later statements win', 'Depends on statement order'], a: 1, why: 'In IAM evaluation an explicit Deny always wins over any Allow; order doesn\'t matter.' }
});

const IAC = {
  tf: `# Terraform (HCL)
resource "aws_s3_bucket" "photos" {
  bucket = "pixelpost-photos"
}

resource "aws_s3_bucket_public_access_block" "photos" {
  bucket                  = aws_s3_bucket.photos.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}`,
  cfn: `# AWS CloudFormation (YAML)
Resources:
  PhotosBucket:
    Type: AWS::S3::Bucket
    Properties:
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true`,
  docker: `# Dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
USER 1000
CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:server"]`
};
scene({
  id: 'pipeline', section: 'explore', ch: 9, kicker: 'Deployment, DevOps and Infrastructure as Code', title: 'How does code become a running cloud application?', short: 'The deployment pipeline', lab: 'CI/CD with injected failures and three rollout strategies.',
  objectives: ['Trace commit → test → build → artifact → deploy → health checks', 'Compare rolling, blue/green and canary rollouts', 'Know what a pipeline should do when each stage fails'],
  html: `
  <div class="split rev">
    <div class="col">
      <div class="viz auto" style="padding:12px"><div class="cvhost" style="position:relative;height:170px" id="pl"></div></div>
      <div class="explain"><h4>Production traffic</h4><div id="split" style="display:flex;height:30px;border-radius:6px;overflow:hidden;margin-top:6px;border:1px solid var(--line)"></div><div class="controls" style="margin-top:6px;font-size:13.5px" id="fleet"></div></div>
      <div class="log" id="log" aria-live="polite"></div>
      <div class="eng-only"><div class="tabs" id="codetabs"></div><pre class="code" id="code"></pre></div>
    </div>
    <div class="rail">
      <div class="controls" id="run"></div>
      <div class="controls stack" id="faults"></div>
      <div class="explain" id="out" aria-live="polite"><h4>Ship version 2.0</h4><p>Pick a rollout strategy, optionally inject a failure, then run the pipeline.</p></div>
    </div>
  </div>`,
  notice: 'Each stage is a gate: later stages run only if earlier ones pass. Good pipelines fail early, and production keeps serving the last good version.',
  myth: 'Infrastructure as Code isn\'t just automation: the code is reviewed, versioned and repeatable, so environments don\'t drift apart.',
  mount(el, slide) {
    const k = U.tok(slide);
    const ST = ['Commit', 'Tests', 'Build', 'Image', 'Deploy', 'Health', 'Live'];
    const F = { test: false, build: false, config: false, unhealthy: false }; let strat = 'canary', busy = false;
    let state = ST.map(() => 'idle'), v2 = 0, fleet = [1, 1, 1, 1];
    const pc = U.canvas(el.querySelector('#pl'), draw);
    function draw() {
      const { ctx, W, H } = pc; ctx.clearRect(0, 0, W, H); const n = ST.length, gap = 10, w = (W - gap * (n - 1)) / n, y = 50, h = 64;
      ST.forEach((s, i) => { const x = i * (w + gap); const st = state[i]; const col = st === 'ok' ? k.green : st === 'run' ? k.cyan : st === 'fail' ? k.red : st === 'skip' ? k.dim : k.line;
        ctx.fillStyle = U.a(col, st === 'idle' ? 0 : 0.14); ctx.strokeStyle = col; ctx.lineWidth = st === 'run' ? 2.5 : 1.5; ctx.beginPath(); ctx.roundRect(x, y, w, h, 9); ctx.fill(); ctx.stroke();
        ctx.fillStyle = st === 'skip' ? k.dim : k.fg; ctx.font = k.sans; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x + w / 2, y + 24);
        ctx.font = k.monoS; ctx.fillStyle = col === k.line ? k.dim : col; ctx.fillText({ idle: 'waiting', run: 'running…', ok: 'passed', fail: 'FAILED', skip: 'skipped' }[st], x + w / 2, y + 46);
        if (i < n - 1) { ctx.strokeStyle = k.line; ctx.beginPath(); ctx.moveTo(x + w + 1, y + h / 2); ctx.lineTo(x + w + gap - 1, y + h / 2); ctx.stroke(); } });
      ctx.font = k.monoS; ctx.fillStyle = k.dim; ctx.textAlign = 'left'; ctx.fillText('developer → repository → CI → registry → orchestrator (ECS) → load balancer health checks → production', 0, 20);
    }
    const logEl = el.querySelector('#log'); const log = (m, c = '') => { logEl.insertAdjacentHTML('beforeend', `<div class="${c}">${m}</div>`); logEl.scrollTop = 1e9; };
    const traffic = () => {
      el.querySelector('#split').innerHTML = `<div style="flex:${100 - v2};background:color-mix(in srgb,var(--blue) 35%,var(--panel));display:grid;place-items:center;font:600 12px var(--f-mono)">${100 - v2 > 8 ? `v1.9 · ${100 - v2}%` : ''}</div><div style="flex:${v2};background:color-mix(in srgb,var(--green) 40%,var(--panel));display:grid;place-items:center;font:600 12px var(--f-mono)">${v2 > 8 ? `v2.0 · ${v2}%` : ''}</div>`;
      el.querySelector('#fleet').innerHTML = fleet.map((v, i) => `<span class="pill" style="color:${v === 2 ? 'var(--green)' : v === -1 ? 'var(--red)' : 'var(--blue)'}">task ${i + 1}: ${v === 2 ? 'v2.0' : v === -1 ? 'v2.0 crashing' : 'v1.9'}</span>`).join('');
    };
    const wait = ms => new Promise(r => setTimeout(r, U.RM ? 0 : ms));
    async function run() {
      if (busy) return; busy = true; state = ST.map(() => 'idle'); v2 = 0; fleet = [1, 1, 1, 1]; logEl.innerHTML = ''; draw(); traffic();
      const stage = async (i, ok, msg, ms = 650) => { state[i] = 'run'; draw(); await wait(ms); state[i] = ok ? 'ok' : 'fail'; draw(); log(msg, ok ? '' : 'c-red'); if (!ok) for (let j = i + 1; j < ST.length; j++) state[j] = 'skip'; draw(); return ok; };
      const end = (cls, h, p) => { el.querySelector('#out').innerHTML = `<div class="verdict ${cls}">${h}</div><p style="margin-top:8px;color:var(--muted)">${p}</p>`; busy = false; };
      log('<b>git push</b> main → commit 7f3c2e1 "feed: infinite scroll"');
      await stage(0, true, 'webhook → pipeline triggered');
      if (!await stage(1, !F.test, F.test ? '✗ 3 of 214 tests failed: test_feed_pagination' : '✓ 214 unit + 18 integration tests passed', 900)) return end('no', 'Stopped at tests', 'Nothing was built or deployed. Production keeps serving v1.9 untouched. The developer gets the failing test names and fixes the code. This is the cheapest place to catch a bug.');
      if (!await stage(2, !F.build, F.build ? '✗ build failed: dependency "imagelib==4.0" not found' : '✓ build complete, 2m 10s')) return end('no', 'Stopped at build', 'No artifact exists, so there is nothing to deploy. Pin dependency versions and cache them so builds are reproducible.');
      await stage(3, true, '✓ pushed image pixelpost:2.0 (sha256:9c1e…) to the container registry; scanned for known vulnerabilities');
      state[4] = 'run'; draw();
      const bad = F.config ? 'config' : F.unhealthy ? 'unhealthy' : null;
      if (strat === 'canary') {
        log('deploy (canary): 1 of 4 tasks → v2.0, 10% of traffic'); fleet[0] = bad === 'config' ? -1 : 2; v2 = bad === 'config' ? 0 : 10; traffic(); await wait(900);
      } else if (strat === 'rolling') {
        for (let t = 0; t < 4; t++) { fleet[t] = bad === 'config' ? -1 : 2; v2 = bad === 'config' ? 0 : (t + 1) * 25; traffic(); log(`deploy (rolling): task ${t + 1} → v2.0`); await wait(600); if (bad === 'config') break; if (bad === 'unhealthy' && t === 1) break; }
      } else {
        log('deploy (blue/green): started 4 green tasks on v2.0 alongside 4 blue tasks on v1.9'); await wait(700);
        if (bad !== 'config') { v2 = 100; fleet = [2, 2, 2, 2]; traffic(); log('switched listener: 100% of traffic → green'); await wait(700); } else { fleet = [-1, -1, -1, -1]; traffic(); }
      }
      state[4] = 'ok'; draw();
      if (bad === 'config') {
        await stage(5, false, '✗ health check failed: container exited (KeyError: PAYMENTS_URL not set)');
        fleet = [1, 1, 1, 1]; v2 = 0; traffic(); log('rollback: new tasks stopped; v1.9 continues', 'c-amber');
        return end('warn', 'Rolled back: missing configuration', `The new version crashed on startup because an environment variable wasn't configured. Health checks failed before any traffic shifted${strat === 'blue' ? ' (green never received traffic)' : ''}, so users saw nothing. Store configuration per environment (and secrets in a secrets store), and validate required settings at startup.`);
      }
      if (bad === 'unhealthy') {
        await stage(5, false, '✗ alarm: v2.0 error rate 4.8% (threshold 1%) and p99 latency 2.4 s');
        const exposed = v2; fleet = [1, 1, 1, 1]; v2 = 0; traffic(); log('automatic rollback to v1.9', 'c-amber');
        const why = strat === 'canary' ? 'Only 10% of requests hit v2.0 before the alarm fired: the canary limited the blast radius.' : strat === 'rolling' ? `${exposed}% of traffic was already on v2.0 when the alarm fired, because a rolling update keeps going while metrics catch up.` : 'All traffic moved at once, so every user was exposed — but rollback is instant: switch the listener back to blue, which was still running.';
        return end('warn', 'Rolled back: unhealthy release', `The new version started fine but performed badly under real traffic (it passed tests). ${why}`);
      }
      await stage(5, true, '✓ health checks passing; error rate 0.1%, p99 310 ms');
      if (strat === 'canary') { for (const p of [25, 50, 100]) { v2 = p; fleet = fleet.map((_, i) => i < p / 25 ? 2 : 1); traffic(); log(`canary healthy → ${p}% of traffic`); await wait(500); } }
      await stage(6, true, '✓ v2.0 live for 100% of users');
      U.markDone('pipeline');
      end('ok', 'Deployed', `Every gate passed and production now runs v2.0. ${strat === 'blue' ? 'Blue (v1.9) can stay up briefly for instant rollback.' : strat === 'canary' ? 'Traffic increased in steps while metrics stayed healthy.' : 'Tasks were replaced one at a time with no downtime.'}`);
    }
    const r = el.querySelector('#run');
    U.seg(r, [['canary', 'Canary'], ['rolling', 'Rolling'], ['blue', 'Blue/green']], strat, v => strat = v, 'Rollout strategy');
    U.btn(r, 'Run pipeline', run, 'primary');
    const f = el.querySelector('#faults'); f.insertAdjacentHTML('beforeend', '<div class="kicker" style="color:var(--dim)">Inject one failure</div>');
    const opts = [['none', 'No failure'], ['test', 'A unit test fails'], ['build', 'The build fails'], ['config', 'Missing configuration'], ['unhealthy', 'Unhealthy release (slow & erroring)']];
    U.select(f, 'Failure', opts, 'none', v => { Object.keys(F).forEach(x => F[x] = false); if (v !== 'none') F[v] = true; });
    U.tabs(el.querySelector('#codetabs'), [['tf', 'Terraform'], ['cfn', 'CloudFormation'], ['docker', 'Dockerfile']], v => el.querySelector('#code').textContent = IAC[v]);
    draw(); traffic();
    return () => pc.destroy();
  },
  notes: {
    objective: 'Learners describe each pipeline gate and choose rollout strategies by blast radius vs rollback speed.',
    say: ['Run it clean with a canary: 10% first, then more as metrics stay healthy.', 'Inject "A unit test fails": production never notices. That\'s the cheapest failure.', 'Inject "Unhealthy release" and compare all three strategies: canary limits who\'s hurt, blue/green rolls back fastest, rolling sits in between.'],
    demo: ['Engineer mode shows the same S3 bucket in Terraform and CloudFormation, plus a Dockerfile.'],
    ask: 'Tests passed but the release still broke production. What does that tell you about tests?',
    answer: 'Tests can\'t cover real traffic, data and dependencies. That\'s why deployments need health checks, metrics-based alarms and automatic rollback.',
    transition: 'We keep saying "containers". How are they different from virtual machines?'
  },
  check: { q: 'Which rollout limits the number of users exposed to a bad release?', opts: ['Blue/green', 'Canary', 'Deploying everything at once', 'Rolling'], a: 1, why: 'A canary sends a small share of traffic to the new version first and widens only if metrics stay healthy.' }
});

scene({
  id: 'containers', section: 'explore', ch: 9, kicker: 'Containers versus virtual machines', title: 'What actually separates a container from a virtual machine?', short: 'Containers vs VMs', paper: true,
  objectives: ['Place hypervisors, guest OSes, container runtimes and workloads in the stack', 'Explain why containers start fast and pack densely', 'Qualify isolation differences'],
  html: `
  <div class="split even">
    <div class="col"><div class="kicker" style="color:var(--blue)">Virtual machines</div><div id="vm" class="stk"></div></div>
    <div class="col"><div class="kicker" style="color:var(--green)">Containers</div><div id="ct" class="stk"></div></div>
  </div>
  <div class="grid3"><div class="explain" id="lx" style="grid-column:span 2"><h4>Click any layer</h4><p>Each layer explains what it does and what it isolates.</p></div>
  <div class="engbox eng-only"><b>Isolation, qualified</b><p>Containers isolate processes with kernel namespaces and cgroups but share the host kernel, so a kernel vulnerability can cross containers. VMs each run their own kernel on a hypervisor. Systems like Firecracker microVMs (used by Lambda and Fargate) combine container-like speed with VM-level isolation.</p></div></div>`,
  notice: 'Every VM carries a whole guest operating system. Containers share the host\'s kernel and package only the app and its dependencies.',
  myth: 'Containers aren\'t simply "lightweight VMs": they share a kernel, which changes both their efficiency and their isolation guarantees.',
  mount(el) {
    const st = document.createElement('style'); st.textContent = `.stk{display:flex;flex-direction:column;gap:5px}.stk .row{display:flex;gap:5px}.stk button{flex:1;padding:22px 10px;border-radius:8px;border:1.5px solid var(--line);background:var(--panel);font:600 14px var(--f-body);cursor:pointer;text-align:center}.stk button.app{border-color:var(--green);background:color-mix(in srgb,var(--green) 12%,var(--panel))}.stk button.os{border-color:var(--blue);background:color-mix(in srgb,var(--blue) 12%,var(--panel))}.stk button.rt{border-color:var(--violet);background:color-mix(in srgb,var(--violet) 12%,var(--panel))}.stk button.sel{outline:2px solid var(--fg)}`; el.appendChild(st);
    const INFO = {
      app: ['Application + libraries', 'Your code and the exact library versions it needs. In a container this is the image; in a VM it is installed onto the guest OS.'],
      guest: ['Guest operating system', 'A complete OS (kernel + userland) per VM. It must be patched, takes memory and disk, and boots in seconds to minutes.'],
      hyper: ['Hypervisor', 'Slices physical hardware into VMs and isolates them at the hardware-virtualization level (e.g. the Nitro hypervisor on EC2).'],
      runtime: ['Container runtime', 'containerd / Docker start processes in isolated namespaces with resource limits (cgroups). No second kernel.'],
      hostos: ['Host operating system', 'One kernel shared by every container on the host. Its security matters to all of them.'],
      hw: ['Physical server', 'CPU, memory, disks and network cards. In the cloud the provider owns and operates this layer.']
    };
    const make = (host, rows) => rows.forEach(r => { const row = document.createElement('div'); row.className = 'row'; r.forEach(([id, label, cls]) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls || ''; b.textContent = label; b.onclick = () => { el.querySelectorAll('.stk button').forEach(x => x.classList.toggle('sel', x.dataset.id === id)); el.querySelector('#lx').innerHTML = `<h4>${INFO[id][0]}</h4><p>${INFO[id][1]}</p>`; }; b.dataset.id = id; row.appendChild(b); }); host.appendChild(row); });
    make(el.querySelector('#vm'), [[['app', 'App A', 'app'], ['app', 'App B', 'app'], ['app', 'App C', 'app']], [['guest', 'Guest OS', 'os'], ['guest', 'Guest OS', 'os'], ['guest', 'Guest OS', 'os']], [['hyper', 'Hypervisor', 'rt']], [['hw', 'Physical server']]]);
    make(el.querySelector('#ct'), [[['app', 'App A', 'app'], ['app', 'App B', 'app'], ['app', 'App C', 'app'], ['app', 'App D', 'app'], ['app', 'App E', 'app']], [['runtime', 'Container runtime', 'rt']], [['hostos', 'Host OS (shared kernel)', 'os']], [['hw', 'Physical server (or a VM)']]]);
  },
  notes: { objective: 'Learners can draw both stacks and explain the trade-off without calling containers "small VMs".', say: ['Left: every app gets its own operating system. Right: apps share one kernel and ship only what they need. That\'s why containers start in a second and pack densely.', 'In the cloud, containers usually run inside VMs anyway — ECS on EC2, or Fargate.'], ask: 'Why might a security team run untrusted customer code in microVMs rather than plain containers?', answer: 'A shared kernel is a shared attack surface; a separate kernel per workload adds an isolation boundary.', transition: 'Once code is running, how do you know it\'s healthy?' },
  check: { q: 'What do containers on the same host share that separate VMs don\'t?', opts: ['Application code', 'The operating system kernel', 'Their container images', 'Nothing'], a: 1, why: 'Containers are isolated processes on one kernel; each VM runs its own kernel on a hypervisor.' }
});

const INCIDENTS = [
  { id: 'pool', title: 'Monday 09:12 — "the feed spins forever"', root: 'pool' },
  { id: 'deploy', title: 'Tuesday 14:30 — "some page loads fail"', root: 'deploy' },
  { id: 'cache', title: 'Wednesday 18:05 — "everything got slow"', root: 'cache' },
  { id: 'pay', title: 'Thursday 11:40 — "checkout is broken"', root: 'pay' },
  { id: 'leak', title: 'Friday 03:20 — "slow every few hours"', root: 'leak' }
];
const CAUSES = [['cpu', 'Not enough app servers (CPU saturated)'], ['pool', 'Database connection pool exhausted'], ['deploy', 'Faulty deploy on one instance'], ['cache', 'Cache failure overloading the database'], ['pay', 'Slow third-party payment dependency'], ['leak', 'Memory leak in the application']];
const INC_WHY = {
  pool: 'App CPU is low (servers are waiting, not working), DB connections are pinned at the 100 maximum while DB CPU is only moderate, and logs show "could not acquire connection". Requests queue for a connection, not for compute.',
  deploy: 'Errors come almost entirely from instance i-3, which received a new version exactly when errors began (the purple deploy marker). Other instances are healthy. Roll back i-3.',
  cache: 'Cache hit ratio collapsed from ~95% to near zero and "connection refused" appears in logs; every read now hits the database, whose CPU jumps to ~95%.',
  pay: 'Overall p50 latency is normal, but p99 and errors rose only on /checkout. Traces show the external payments span taking ~8 s. Add a timeout, a circuit breaker and a retry policy.',
  leak: 'Memory climbs steadily on every instance until it restarts (sawtooth); latency spikes just before each restart from garbage-collection pressure. CPU and the database look normal.'
};
scene({
  id: 'outage', section: 'explore', ch: 10, kicker: 'Monitoring, reliability and operations', title: 'How do you know your application is healthy?', short: 'Diagnose the outage', lab: 'Five incidents; find the root cause from metrics, logs and traces.',
  objectives: ['Use metrics, logs and traces together', 'Read latency percentiles, error rates and saturation', 'Tell symptoms from root causes'],
  html: `
  <div class="controls" id="inc"></div>
  <div class="split rev">
    <div class="col">
      <div class="tabs" id="tabs"></div>
      <div id="view" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;flex:1;min-height:0"></div>
    </div>
    <div class="rail">
      <div class="explain"><h4>Your diagnosis</h4><p>Inspect at least two views, then pick the most likely root cause.</p></div>
      <div class="chips" id="causes" style="flex-direction:column;align-items:stretch"></div>
      <div id="fb" aria-live="polite"></div>
      <div class="engbox eng-only"><b>Golden signals</b><p>Latency (p50 = typical, p99 = worst 1%), traffic, errors, saturation. An SLI is a measured indicator (e.g. % of requests under 300 ms); an SLO is its target (99.9% over 30 days). Alert on SLO burn, not on every metric.</p></div>
    </div>
  </div>`,
  notice: 'Symptoms show up everywhere; causes show up in one place. Look for the metric that changed first and the component that differs from its peers.',
  myth: 'Monitoring isn\'t observability: dashboards tell you that something is wrong; logs and traces help you ask why.',
  mount(el, slide) {
    const k = U.tok(slide); let inc = 'pool', tab = 'overview', seen = new Set(); const charts = [];
    const N = 40, dm = 18; // 40 one-minute points, incident starts at minute 18
    const gen = (id, seed) => { const r = U.rng(seed); const nz = s => (r() - 0.5) * s; const on = i => i >= dm; const ramp = i => Math.max(0, Math.min(1, (i - dm) / 4)); const S = {};
      const base = { p50: i => 120 + nz(15), p99: i => 420 + nz(60), err: i => 0.2 + Math.abs(nz(0.2)), cpu: i => 38 + nz(6), mem: i => 52 + nz(3), dbconn: i => 42 + nz(6), dbcpu: i => 35 + nz(5), hit: i => 95 + nz(1.5), pay: i => 340 + nz(40), co: i => 0.3 + Math.abs(nz(0.3)) };
      const m = Object.assign({}, base);
      if (id === 'pool') Object.assign(m, { p50: i => on(i) ? 2200 * ramp(i) + 120 + nz(150) : base.p50(i), p99: i => on(i) ? 5000 * ramp(i) + 400 + nz(200) : base.p99(i), err: i => on(i) ? 6 * ramp(i) + nz(1) : base.err(i), cpu: i => on(i) ? 18 + nz(4) : base.cpu(i), dbconn: i => on(i) ? Math.min(100, 42 + 80 * ramp(i)) : base.dbconn(i), dbcpu: i => on(i) ? 48 + nz(5) : base.dbcpu(i), co: i => on(i) ? 6 * ramp(i) : base.co(i) });
      if (id === 'deploy') Object.assign(m, { err: i => on(i) ? 31 + nz(3) : base.err(i), p99: i => on(i) ? 700 + nz(80) : base.p99(i) });
      if (id === 'cache') Object.assign(m, { hit: i => on(i) ? 95 - 92 * ramp(i) : base.hit(i), dbcpu: i => on(i) ? 35 + 60 * ramp(i) + nz(3) : base.dbcpu(i), p50: i => on(i) ? 120 + 480 * ramp(i) + nz(40) : base.p50(i), p99: i => on(i) ? 400 + 1900 * ramp(i) + nz(100) : base.p99(i), dbconn: i => on(i) ? 42 + 30 * ramp(i) + nz(4) : base.dbconn(i), err: i => on(i) ? 1.5 * ramp(i) + Math.abs(nz(0.5)) : base.err(i) });
      if (id === 'pay') Object.assign(m, { pay: i => on(i) ? 8000 + nz(600) : base.pay(i), p99: i => on(i) ? 3200 + nz(300) : base.p99(i), co: i => on(i) ? 22 + nz(3) : base.co(i), err: i => on(i) ? 1.4 + Math.abs(nz(0.4)) : base.err(i) });
      if (id === 'leak') Object.assign(m, { mem: i => 50 + ((i * 7) % 48) + nz(1), p99: i => ((i * 7) % 48) > 38 ? 2600 + nz(300) : base.p99(i), err: i => ((i * 7) % 48) > 44 ? 3 : base.err(i) });
      Object.keys(m).forEach(key => S[key] = Array.from({ length: N }, (_, i) => Math.max(0, m[key](i))));
      S.inst = [0, 1, 2].map(j => Array.from({ length: N }, (_, i) => id === 'deploy' && j === 2 && i >= dm ? 92 + nz(4) : Math.abs(nz(0.4))));
      return S; };
    const LOGS = {
      pool: ['09:12:41 WARN  api  GET /feed 504 after 5003ms', '09:12:41 ERROR api  TimeoutError: could not acquire connection from pool within 5000ms (pool size 25, 25 in use)', '09:12:43 INFO  db   connections: 100/100 (max_connections reached)', '09:12:44 WARN  api  GET /profile/88 504 after 5001ms'],
      deploy: ['14:15:02 INFO  deploy  instance i-3 → version 2.4.1 (canary)', '14:15:40 ERROR api[i-3] KeyError: \'FEED_RANKING_URL\'', '14:30:10 INFO  api[i-1] GET /feed 200 118ms', '14:30:11 ERROR api[i-3] GET /feed 500 9ms'],
      cache: ['18:05:00 ERROR api  redis: dial tcp 10.0.2.40:6379: connection refused', '18:05:01 WARN  api  cache unavailable, falling back to database', '18:05:30 WARN  db   slow query 1.8s SELECT * FROM posts WHERE …', '18:06:02 ERROR api  redis: connection refused'],
      pay: ['11:40:12 WARN  api  POST /checkout 200 8211ms', '11:40:15 ERROR api  payments-api: request timeout after 8000ms', '11:40:16 INFO  api  GET /feed 200 121ms', '11:40:19 WARN  api  POST /checkout 502'],
      leak: ['03:02:11 WARN  api[i-2] GC pause 1.4s', '03:04:50 ERROR api[i-2] container OOMKilled (memory limit 2 GiB)', '03:05:20 INFO  ecs  task restarted on i-2', '03:19:44 WARN  api[i-1] GC pause 1.6s']
    };
    const TRACES = {
      pool: [['GET /feed', 5003], ['auth.verify', 4], ['db.acquire_connection', 4960], ['db.query', 0]],
      deploy: [['GET /feed (i-3)', 9], ['config.load', 6], ['error: KeyError', 0]],
      cache: [['GET /feed', 1940], ['cache.get', 2], ['db.query posts', 1870], ['render', 30]],
      pay: [['POST /checkout', 8211], ['cart.load', 14], ['payments-api.charge', 8150], ['db.insert order', 9]],
      leak: [['GET /feed', 2480], ['gc.pause', 1600], ['db.query', 35], ['render', 820]]
    };
    let S;
    const view = el.querySelector('#view');
    const panel = (title, series, ymax, fmt, opts = {}) => { const d = document.createElement('div'); d.className = 'viz'; d.style.minHeight = '150px'; d.innerHTML = `<div class="cvhost"></div>`; view.appendChild(d);
      const c = U.canvas(d.firstChild, () => U.chart(c, Object.assign({ k, x: [0, N - 1], y: [0, ymax], xFmt: v => '-' + Math.round(N - 1 - v) + 'm', yFmt: fmt, yLabel: title, legend: series.length > 1, padL: 50, series, bands: opts.deploy ? [{ from: dm - 0.25, to: dm + 0.25, color: U.a(k.violet, 0.9) }] : [] }, opts))); charts.push(c); };
    function show() {
      charts.splice(0).forEach(c => c.destroy()); view.innerHTML = ''; seen.add(tab);
      const ms = v => U.fmt(v) + '', pc = v => U.fmt(v) + '%';
      if (tab === 'overview') { panel('latency ms (load balancer)', [{ data: S.p50, color: k.cyan, label: 'p50' }, { data: S.p99, color: k.amber, label: 'p99' }], Math.max(1000, ...S.p99) * 1.1, ms); panel('5xx error rate %', [{ data: S.err, color: k.red }], Math.max(5, ...S.err) * 1.15, pc); }
      if (tab === 'app') { panel('app CPU % (avg)', [{ data: S.cpu, color: k.green }], 100, pc); panel('app memory %', [{ data: S.mem, color: k.violet }], 100, pc); panel('errors % by instance', [{ data: S.inst[0], color: k.cyan, label: 'i-1' }, { data: S.inst[1], color: k.blue, label: 'i-2' }, { data: S.inst[2], color: k.red, label: 'i-3' }], 100, pc, { deploy: inc === 'deploy' }); }
      if (tab === 'db') { panel('DB connections (max 100)', [{ data: S.dbconn, color: k.amber }], 110, ms, { hlines: [{ v: 100, color: k.red, label: 'max' }] }); panel('DB CPU %', [{ data: S.dbcpu, color: k.green }], 100, pc); }
      if (tab === 'cache') panel('cache hit ratio %', [{ data: S.hit, color: k.cyan }], 100, pc);
      if (tab === 'deps') { panel('payments API latency ms', [{ data: S.pay, color: k.amber }], Math.max(1000, ...S.pay) * 1.1, ms); panel('/checkout error %', [{ data: S.co, color: k.red }], Math.max(5, ...S.co) * 1.15, pc); }
      if (tab === 'logs') { const d = document.createElement('div'); d.className = 'log'; d.style.gridColumn = 'span 2'; d.style.maxHeight = 'none'; d.innerHTML = LOGS[inc].map(l => `<div class="${/ERROR/.test(l) ? 'c-red' : /WARN/.test(l) ? 'c-amber' : ''}">${U.esc(l)}</div>`).join(''); view.appendChild(d); }
      if (tab === 'traces') { const tr = TRACES[inc]; const tot = tr[0][1] || 1; const d = document.createElement('div'); d.className = 'explain'; d.style.gridColumn = 'span 2'; d.innerHTML = `<h4>Slowest sampled request</h4>` + tr.map(([n, ms], i) => `<div style="display:grid;grid-template-columns:200px 1fr 80px;gap:8px;align-items:center;margin-top:6px;font-size:13.5px"><span class="mono" style="padding-left:${i ? 14 : 0}px">${n}</span><span style="height:12px;background:var(--grid);border-radius:3px;position:relative"><span style="position:absolute;inset:0 auto 0 0;width:${Math.max(1, ms / tot * 100)}%;background:${ms / tot > 0.5 && i ? 'var(--red)' : 'var(--cyan)'};border-radius:3px"></span></span><span class="mono c-muted">${ms} ms</span></div>`).join(''); view.appendChild(d); }
    }
    const fb = el.querySelector('#fb');
    const causes = el.querySelector('#causes');
    CAUSES.forEach(([v, l]) => { const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.textContent = l; b.style.textAlign = 'left'; b.style.borderRadius = '8px'; b.onclick = () => {
      causes.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      const right = v === INCIDENTS.find(i => i.id === inc).root;
      fb.innerHTML = right ? `<div class="verdict ok">Root cause found</div><p style="margin-top:8px;color:var(--muted)">${INC_WHY[inc]}</p>` : `<div class="verdict warn">Not supported by the evidence yet</div><p style="margin-top:8px;color:var(--muted)">${seen.size < 3 ? 'Inspect more views. ' : ''}${v === 'cpu' ? 'Check app CPU: is it actually high?' : 'Look for the component that changed first, or that differs from its peers.'}</p>`;
      if (right) { U.store.done['outage-' + inc] = 1; U.save(); if (INCIDENTS.filter(i => U.store.done['outage-' + i.id]).length >= 3) U.markDone('outage'); }
    }; causes.appendChild(b); });
    let tabsApi;
    const load = id => { inc = id; S = gen(id, id.length * 977 + id.charCodeAt(0)); seen = new Set(); fb.innerHTML = ''; causes.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', 'false')); if (tabsApi) tabsApi.sel('overview'); };
    U.seg(el.querySelector('#inc'), INCIDENTS.map(i => [i.id, i.title]), inc, load, 'Incident');
    load(inc);
    tabsApi = U.tabs(el.querySelector('#tabs'), [['overview', 'Overview'], ['app', 'App servers'], ['db', 'Database'], ['cache', 'Cache'], ['deps', 'Dependencies'], ['logs', 'Logs'], ['traces', 'Traces']], v => { tab = v; show(); });
    return () => charts.forEach(c => c.destroy());
  },
  notes: {
    objective: 'Learners triangulate a root cause from metrics, logs and traces instead of reacting to the loudest symptom.',
    say: ['Incident 1: latency and errors are up. The reflex is "add servers". Check App servers: CPU went down. They\'re waiting on something.', 'Database tab: connections are at the maximum while DB CPU is moderate. Logs confirm: can\'t get a connection. More app servers would make it worse — more clients fighting for the same connections.'],
    demo: ['Let groups each take a different incident and present their evidence chain.'],
    ask: 'Why is p99 latency often more useful than the average?',
    answer: 'Averages hide the tail; the slowest 1% of requests are often your most frustrated users and the first sign of saturation.',
    transition: 'Reliability, speed, security — all cost money. What makes an architecture "good"?'
  },
  check: { q: 'Latency is high, app CPU is low, and DB connections are at their maximum. Most likely?', opts: ['Not enough app servers', 'Connection pool or database connection exhaustion', 'A CDN problem', 'The DNS TTL is too low'], a: 1, why: 'Low CPU means the app is waiting, and pinned connections show what it\'s waiting for.' }
});

scene({
  id: 'cost', section: 'explore', ch: 11, kicker: 'Cost engineering and the Well-Architected Framework', title: 'What makes a cloud architecture good?', short: 'Architecture trade-offs', lab: 'Budget vs capacity vs availability vs operations.',
  objectives: ['Name the six Well-Architected pillars', 'Find cost drivers: idle capacity, NAT, data transfer, redundancy', 'Make and defend a trade-off'],
  html: `
  <div class="split" style="grid-template-columns:minmax(290px,0.85fr) minmax(0,2fr)">
    <div class="rail" style="gap:10px">
      <p class="lede">Pixelpost must handle <b id="pk">1,200</b> req/s at peak on a monthly budget.</p>
      <div class="controls stack" id="ctl"></div>
    </div>
    <div class="col">
      <div class="tiles" id="tiles"></div>
      <div class="grid2" style="align-items:start">
        <div class="explain"><h4>Monthly cost (illustrative)</h4><div id="bars"></div></div>
        <div class="explain"><h4>Trade-offs by pillar</h4><div id="pillars"></div></div>
      </div>
      <div class="engbox eng-only"><b>Assumptions you can edit</b><div id="units" class="controls" style="margin-top:6px"></div><p style="margin-top:6px">Unit prices are teaching values, not AWS list prices. Instance capacity: small 150, medium 300, large 600 req/s; the relational database tier saturates at 1,500 req/s (×2.5 with a cache). Real estimates: <a href="https://calculator.aws/" target="_blank" rel="noopener" style="color:var(--cyan)">AWS Pricing Calculator</a>.</p></div>
    </div>
  </div>`,
  notice: 'There is no single right answer. Each choice moves cost, capacity, availability and operational load in different directions.',
  myth: 'Cloud bills aren\'t just compute: NAT gateways, data transfer, idle capacity and over-redundancy are common surprises.',
  mount(el) {
    const d = Object.assign({}, SIM.costDefaults); const units = JSON.parse(JSON.stringify(SIM.costUnits));
    function upd() {
      const r = SIM.costEval(d, units); el.querySelector('#pk').textContent = U.fmt(d.peakRps);
      U.tiles(el.querySelector('#tiles'), [['Monthly cost', U.money(r.total), r.total > d.budget ? 'bad' : 'good', `budget ${U.money(d.budget)}`], ['Capacity', U.fmt(r.cap) + ' req/s', r.cap >= d.peakRps ? 'good' : 'bad', `peak ${U.fmt(d.peakRps)}${r.dbCap < r.appCap ? ' · DB-bound' : ''}`], ['Lose 1 instance', U.fmt(r.afterInst) + ' req/s', r.afterInst >= d.peakRps ? 'good' : 'warn'], ['Lose 1 AZ', d.azs > 1 ? (r.dbSurvivesAz ? U.fmt(r.afterAz) + ' req/s' : 'DB lost') : 'down', d.azs > 1 && r.afterAz >= d.peakRps && r.dbSurvivesAz ? 'good' : d.azs > 1 ? 'warn' : 'bad'], ['Ops load', ['', 'low', 'low', 'moderate', 'moderate', 'high', 'high', 'very high'][Math.min(7, Math.round(r.ops))], r.ops > 4 ? 'warn' : '']]);
      const mx = Math.max(...r.items.map(i => i.v), 1);
      el.querySelector('#bars').innerHTML = r.items.map(i => `<div style="display:grid;grid-template-columns:minmax(0,1.3fr) 1fr 60px;gap:8px;align-items:center;margin-top:6px;font-size:13.5px" title="${U.esc(i.note || '')}"><span>${i.label}</span><span style="height:10px;background:var(--grid);border-radius:3px;position:relative"><span style="position:absolute;inset:0 auto 0 0;width:${i.v / mx * 100}%;background:var(--amber);border-radius:3px"></span></span><span class="mono" style="text-align:right">${U.money(i.v)}</span></div>`).join('') + `<div style="margin-top:8px;display:flex;justify-content:space-between;font-weight:600"><span>Total</span><span class="mono">${U.money(r.total)}</span></div>`;
      const P = ['Operational excellence', 'Security', 'Reliability', 'Performance efficiency', 'Cost optimization', 'Sustainability'];
      el.querySelector("#pillars").innerHTML = P.map(p => { const ns = r.notes.filter(n => n.pillar === p); return `<div style="margin-top:8px"><div class="kicker" style="color:var(--dim)">${p}</div>${ns.length ? ns.map(n => `<p style="margin:3px 0 0;font-size:14px" class="${n.k === 'bad' ? 'c-red' : n.k === 'warn' ? 'c-amber' : 'c-muted'}">${n.m}</p>`).join('') : '<p style="margin:3px 0 0;font-size:14px" class="c-green">No concerns with these choices.</p>'}</div>`; }).join('');
      if (r.total <= d.budget && r.cap >= d.peakRps && d.azs > 1 && r.dbSurvivesAz) U.markDone('cost');
    }
    const c = el.querySelector('#ctl');
    U.slider(c, { label: 'Monthly budget', min: 400, max: 3000, step: 50, value: d.budget, fmt: v => U.money(v) }, v => { d.budget = v; upd(); });
    U.slider(c, { label: 'Peak traffic', min: 200, max: 4000, step: 100, value: d.peakRps, fmt: v => U.fmt(v) + '/s' }, v => { d.peakRps = v; upd(); });
    U.seg(c, [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']], d.size, v => { d.size = v; upd(); }, 'Instance size');
    U.slider(c, { label: 'Instances', min: 1, max: 16, step: 1, value: d.count }, v => { d.count = v; upd(); });
    U.seg(c, [['1', '1 AZ'], ['2', '2 AZs'], ['3', '3 AZs']], String(d.azs), v => { d.azs = +v; upd(); }, 'AZs');
    U.select(c, 'Database', [['ec2', 'Self-managed on EC2'], ['rds', 'Managed, single-AZ'], ['rdsMulti', 'Managed, Multi-AZ'], ['dynamo', 'DynamoDB (key-value)']], d.db, v => { d.db = v; upd(); });
    U.select(c, 'Purchase', [['ondemand', 'On-demand'], ['reserved', 'Reserved / Savings Plan style'], ['spot', 'Spot']], d.purchase, v => { d.purchase = v; upd(); });
    U.select(c, 'Monitoring', [['basic', 'Basic'], ['standard', 'Standard'], ['full', 'Full + tracing']], d.monitoring, v => { d.monitoring = v; upd(); });
    U.check(c, { label: 'In-memory cache', checked: d.cache }, v => { d.cache = v; upd(); });
    U.check(c, { label: 'CDN in front', checked: d.cdn }, v => { d.cdn = v; upd(); });
    U.check(c, { label: 'Web application firewall', checked: d.waf }, v => { d.waf = v; upd(); });
    U.check(c, { label: 'One NAT gateway per AZ', checked: d.natPerAz }, v => { d.natPerAz = v; upd(); });
    const u = el.querySelector('#units');
    [['Medium instance $/mo', 'instance.medium', 20, 200, 5], ['NAT gateway $/mo', 'natPerAz', 0, 100, 5], ['Multi-AZ DB $/mo', 'db.rdsMulti', 50, 600, 10], ['Egress $/GB', 'egressGB', 0, 0.2, 0.01]].forEach(([l, path, mn, mxv, st]) => { const [a, b] = path.split('.'); U.slider(u, { label: l, min: mn, max: mxv, step: st, value: b ? units[a][b] : units[a], fmt: v => '$' + v }, v => { if (b) units[a][b] = v; else units[a] = v; if (path === 'instance.medium') { units.instance.small = v / 2; units.instance.large = v * 2; } upd(); }); });
    upd();
  },
  notes: {
    objective: 'Learners defend an architecture as a set of trade-offs across the six pillars, and spot hidden cost drivers.',
    say: ['Default: in budget, enough capacity — but the database is single-AZ, so a second AZ for servers buys less than it seems.', 'Switch to Multi-AZ DB: reliability improves and you\'re over budget. Now find savings: reserved pricing, a cache that lets you run fewer instances, or one NAT gateway (which reintroduces a cross-AZ dependency).', 'Push instances to 12: capacity stops growing at 1,500 — the database is the bottleneck. Add the cache.'],
    ask: 'Spot capacity is 65% cheaper here. When is it a good idea?',
    answer: 'For fault-tolerant, interruptible work (batch jobs, some ML training, a portion of a stateless fleet) — not as the only capacity for a latency-sensitive app.',
    transition: 'Everything so far serves web requests. Next, the request that changes the economics completely: an AI prompt.'
  },
  check: { q: 'Adding app instances stopped increasing capacity. What\'s the most likely reason in this model?', opts: ['The load balancer is full', 'The database tier became the bottleneck', 'The CDN is misconfigured', 'Reserved pricing limits capacity'], a: 1, why: 'Scaling one tier just moves the bottleneck to the next. Here the database saturates first; caching or a different database changes that.' }
});

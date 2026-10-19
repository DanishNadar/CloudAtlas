/* Chapter 12 (cloud for AI) · Chapter 13 (ML pipelines, MLOps, distributed processing) */

scene({
  id: 'llm', section: 'ai', ai: true, ch: 12, kicker: 'How the cloud powers AI', title: 'What infrastructure exists behind an AI model?', short: 'Inside an LLM request', lab: 'Gateway, retrieval, prompt assembly, GPU inference and token streaming.',
  objectives: ['Trace a prompt through gateway, retrieval, inference and streaming', 'Explain tokens, context windows, TTFT and throughput', 'See why an LLM app needs much more than a GPU'],
  html: `
  <div class="split rev">
    <div class="col">
      <div class="controls" id="opts"></div>
      <div class="viz grid" style="min-height:300px"><div class="cvhost" id="fl"></div></div>
      <div class="grid2" style="align-items:stretch">
        <div class="explain"><h4>Pixelpost Assistant</h4><p class="mono" style="font-size:13px;color:var(--fg)">You: How do I reset my password?</p><p id="ans" style="margin-top:6px;color:var(--fg);min-height:3.2em"></p></div>
        <div class="explain"><h4>Context window</h4><div id="ctx"></div></div>
      </div>
    </div>
    <div class="rail">
      <div id="sp"></div>
      <div class="explain" id="exp" aria-live="polite"></div>
      <div class="engbox eng-only" id="eng"></div>
      <div class="explain"><h4>Inference server (illustrative)</h4><div id="gpu"></div></div>
    </div>
  </div>`,
  notice: 'The model call is one step of many. Authentication, retrieval, prompt assembly, queueing and monitoring all sit around it.',
  myth: 'Retrieval-augmented generation is not fine-tuning. RAG supplies documents at request time; fine-tuning changes the model\'s weights.',
  mount(el, slide) {
    const k = U.tok(slide); const O = { rag: true, cache: true, repeat: false };
    const nodes = { user: { x: 80, y: 210, label: 'User', sub: 'chat UI', kind: 'client', w: 120 }, gw: { x: 260, y: 210, label: 'API gateway', sub: 'auth · limits', w: 150 }, app: { x: 460, y: 210, label: 'Orchestrator', sub: 'Lambda / ECS', w: 150 },
      cache: { x: 460, y: 70, label: 'Response cache', sub: 'exact / semantic', w: 160 }, emb: { x: 660, y: 70, label: 'Embedding model', sub: 'text → vector', w: 160, kind: 'ai' }, vec: { x: 860, y: 70, label: 'Vector index', sub: 'top-k search', w: 150 },
      llm: { x: 760, y: 210, label: 'LLM inference', sub: 'GPU servers', w: 170, kind: 'ai', h: 60 }, docs: { x: 860, y: 340, label: 'Documents', sub: 'S3', w: 140 }, mon: { x: 460, y: 340, label: 'Monitoring', sub: 'tokens · latency · cost', w: 170 } };
    const F = U.flow(el.querySelector('#fl'), { size: [960, 400], nodes, edges: [['user', 'gw'], ['gw', 'app'], ['app', 'cache'], ['app', 'emb'], ['emb', 'vec'], ['vec', 'app', 'dash'], ['app', 'llm'], ['app', 'mon'], ['docs', 'vec', 'dash'], ['llm', 'mon', 'dash']], boundaries: [{ x: 570, y: 140, w: 380, h: 140, label: 'MODEL SERVING', kind: 'ai' }], label: 'LLM application architecture' });
    const ANS = { rag: 'Open Settings → Security → Reset password. We email you a link that stays valid for 30 minutes. If it expires, request a new one. [source: help/account-security.md]', plain: 'I don\'t have Pixelpost-specific instructions, but most apps let you reset a password from the sign-in screen with a "Forgot password?" link.' };
    const tok = { sys: 320, q: 12, passage: 380 };
    const ctxBox = el.querySelector('#ctx'); const WIN = 8192;
    const ctx = (show) => { const parts = [['system prompt', tok.sys, 'var(--blue)'], ['question', tok.q, 'var(--cyan)']].concat(O.rag && show ? [['4 retrieved passages', tok.passage * 4, 'var(--violet)']] : []); const used = parts.reduce((s, p) => s + p[1], 0); const out = 60;
      ctxBox.innerHTML = `<div style="display:flex;height:18px;border-radius:4px;overflow:hidden;background:var(--grid);margin-top:4px">${parts.map(p => `<span title="${p[0]}" style="width:${p[1] / WIN * 100}%;background:${p[2]}"></span>`).join('')}<span style="width:${out / WIN * 100}%;background:var(--green)"></span></div><p style="margin-top:6px;font-size:13.5px">${parts.map(p => `${p[0]} ${U.fmt(p[1])}`).join(' · ')} · answer ~${out} → <b>${U.fmt(used + out)}</b> of an assumed ${U.fmt(WIN)}-token window. Input tokens drive prefill time and cost.</p>`; return used; };
    const gpu = el.querySelector('#gpu');
    const gpuPanel = (active) => { const P = SIM.llmPlan({ inTok: ctx(O.rag), outTok: 60, batch: 16 }); const mem = P.memGB; const seg = (v, c, l) => `<span title="${l}" style="width:${v / mem * 100}%;background:${c}"></span>`;
      const kvUsed = (active ? 11 : 10) * P.kvPerSeqGB;
      gpu.innerHTML = `<div style="display:flex;height:16px;border-radius:4px;overflow:hidden;background:var(--grid)">${seg(P.weightsGB, 'var(--violet)', 'weights')}${seg(kvUsed, 'var(--cyan)', 'KV cache')}${seg(P.reserveGB, 'var(--dim)', 'runtime')}</div>
        <p style="margin-top:6px;font-size:13.5px">80 GB accelerator: weights ${U.fmt(P.weightsGB)} GB (8B params × 2 bytes) · KV cache ${U.fmt(kvUsed, 1)} GB for ${active ? 11 : 10} active requests · ${U.fmt(mem - P.weightsGB - kvUsed - P.reserveGB)} GB free.</p>
        <div style="display:flex;gap:3px;margin-top:6px">${Array.from({ length: 16 }, (_, i) => `<span style="flex:1;height:14px;border-radius:2px;background:${i < 10 ? 'color-mix(in srgb,var(--violet) 45%,var(--panel))' : i === 10 && active ? 'var(--cyan)' : 'var(--grid)'}"></span>`).join('')}</div><p style="margin-top:4px;font-size:12.5px" class="c-muted">batch slots: 10 other users' requests + ${active ? 'yours' : '—'} decode together, one token per step.</p>`; };
    const steps = () => {
      const s = [{ t: 'You send a prompt', n: ['user'], h: [], e: 'The chat app sends your question plus a sign-in token to the backend.', g: 'POST /chat {conversation_id, message}. Streaming responses typically use server-sent events or WebSockets.' },
        { t: 'Gateway: authenticate and limit', n: ['gw'], h: [['user', 'gw']], e: 'Is this a signed-in user? Are they within their usage quota? Is the input a reasonable size? Inference is expensive, so these checks run first.', g: 'JWT validation (e.g. Cognito authorizer), per-user throttling, request-size limits, and optionally input safety filters.' },
        { t: 'Orchestrator takes over', n: ['app'], h: [['gw', 'app']], e: 'Application code decides what context to gather and how to call the model.', g: 'Loads conversation history, applies the system prompt and tenant policies.' }];
      if (O.cache) s.push(O.repeat ? { t: 'Cache hit', n: ['cache'], h: [['app', 'cache'], ['cache', 'app', 'ret']], e: 'This exact question was answered recently, so the cached answer is returned. No GPU time, almost no cost.', g: 'Exact-match caches are safe; semantic caches (similar questions) need a similarity threshold and care with personalized answers.', hit: true }
        : { t: 'Cache miss', n: ['cache'], h: [['app', 'cache'], ['cache', 'app', 'ret']], e: 'Not answered recently, so the request continues to the model.', g: 'Cache key = hash(normalized prompt, model, parameters, relevant context version).' });
      if (!(O.cache && O.repeat)) {
        if (O.rag) s.push({ t: 'Retrieve relevant documents', n: ['emb', 'vec'], h: [['app', 'emb'], ['emb', 'vec'], ['vec', 'app', 'ret']], e: 'The question becomes a vector (embedding). A vector index finds the help-center passages with the closest meaning.', g: 'Embedding dimension ~1,000; k-nearest-neighbor search (HNSW/IVF) returns top-4 chunks with similarity scores. Documents were chunked and embedded ahead of time from S3.' });
        s.push({ t: 'Assemble the prompt', n: ['app'], h: [], ctx: true, e: `System instructions + ${O.rag ? 'retrieved passages + ' : ''}your question must fit in the model's context window, counted in tokens (word pieces).`, g: 'Token budget: leave room for the answer. More context = longer prefill and higher input-token cost.' });
        s.push({ t: 'Queue and prefill', n: ['llm'], h: [['app', 'llm']], gpu: true, e: 'On the GPU server your request joins a batch with other users\' requests. First the model reads the whole prompt (prefill).', g: 'Prefill processes all input tokens in parallel; it dominates time-to-first-token (TTFT) for long prompts. Continuous batching admits new requests between decode steps.' });
        s.push({ t: 'Generate and stream tokens', n: ['llm', 'user'], h: [['llm', 'app', 'ret'], ['app', 'gw', 'ret'], ['gw', 'user', 'ret']], stream: true, gpu: true, e: 'The model produces one token at a time; each is streamed to you as soon as it exists, so you start reading before it finishes.', g: 'Decode is memory-bandwidth bound: each step reads the weights and the KV cache. Per-stream speed ≈ 1 ÷ step time; batching raises total throughput.' });
      } else s.push({ t: 'Return cached answer', n: ['user'], h: [['app', 'gw', 'ret'], ['gw', 'user', 'ret']], stream: true, e: 'The stored answer is returned immediately.', g: 'Cache hits still need authorization checks: never serve one user\'s cached private answer to another.' });
      s.push({ t: 'Record and monitor', n: ['mon'], h: [['app', 'mon']], e: 'Every request logs tokens in/out, latency, errors and cost, so the team can watch quality, budgets and capacity.', g: 'Track TTFT, tokens/s, queue time, GPU utilization, cost per request, and quality signals (thumbs, evals). Redact sensitive data in logs.' });
      return s;
    };
    const ans = el.querySelector('#ans'); let streamT = null;
    const stream = (txt, anim) => new Promise(res => { clearInterval(streamT); const w = txt.split(' '); if (!anim) { ans.textContent = txt; return res(); } let i = 0; ans.textContent = ''; streamT = setInterval(() => { ans.textContent += (i ? ' ' : '') + w[i++]; if (i >= w.length) { clearInterval(streamT); res(); } }, O.cache && O.repeat ? 12 : 70); });
    const render = async (i, anim) => {
      const S = steps(); const s = S[i]; F.clear(); S.slice(0, i).forEach(p => p.n.forEach(n => F.state(n, 'done')));
      ['emb', 'vec', 'docs'].forEach(n => F.state(n, O.rag ? (F.N[n].g.getAttribute('class').includes('done') ? 'done' : '') : 'off')); if (!O.cache) F.state('cache', 'off');
      el.querySelector('#exp').innerHTML = `<h4>${i + 1}. ${s.t}</h4><p>${s.e}</p>`; el.querySelector('#eng').innerHTML = `<b>Engineering detail</b><p>${s.g}</p>`;
      if (i === 0) ans.textContent = '';
      ctx(s.ctx || i > S.findIndex(x => x.ctx));
      gpuPanel(!!s.gpu);
      for (const [a, b, c] of s.h) { F.edgeOn(a, b); if (anim) await F.packet(a, b, c === 'ret' ? 'pk ret' : (a === 'llm' || b === 'llm' || b === 'emb') ? 'pk ai' : 'pk', 480); }
      s.n.forEach(n => F.state(n, 'on'));
      if (s.stream) await stream(O.rag || O.repeat ? ANS.rag : ANS.plain, anim);
      const si = S.findIndex(x => x.stream); if (si >= 0 && i > si && !ans.textContent) ans.textContent = O.rag || O.repeat ? ANS.rag : ANS.plain;
      if (i === S.length - 1) U.markDone('llm');
    };
    const sp = U.stepper(el.querySelector('#sp'), { count: () => steps().length, render, autoMs: 900 });
    const o = el.querySelector('#opts');
    U.check(o, { label: 'Retrieval (RAG)', checked: O.rag }, v => { O.rag = v; sp.stop(); sp.go(0, false); });
    U.check(o, { label: 'Response cache', checked: O.cache }, v => { O.cache = v; sp.stop(); sp.go(0, false); });
    U.check(o, { label: 'Same question asked again', checked: O.repeat }, v => { O.repeat = v; sp.stop(); sp.go(0, false); });
    sp.go(0, false);
    return () => { sp.destroy(); clearInterval(streamT); };
  },
  notes: {
    objective: 'Learners see an LLM product as a distributed system: gateway, orchestration, retrieval, model serving, streaming, monitoring.',
    say: ['The thing you think of as "the AI" is the purple box. Everything else exists to make it safe, grounded, affordable and observable.', 'Play with RAG on: the answer cites a help article. Turn RAG off: the same model gives a generic answer. Same weights, different context.', 'Turn on "same question again": the cache answers without touching a GPU. Caching is the cheapest inference.'],
    ask: 'Why does a longer prompt make the first token arrive later?',
    answer: 'The model must process every input token (prefill) before generating the first output token.',
    transition: 'Why GPUs at all? Let\'s race a CPU and a GPU.'
  },
  check: { q: 'What does retrieval-augmented generation (RAG) change?', opts: ['The model\'s weights', 'The context supplied with each request', 'The GPU type', 'The tokenizer'], a: 1, why: 'RAG retrieves relevant documents at request time and adds them to the prompt; the model itself is unchanged.' }
});

scene({
  id: 'gpu', section: 'ai', ai: true, ch: 12, kicker: 'CPU versus GPU', title: 'Why do AI workloads run on GPUs — and when don\'t they need to?', short: 'CPU vs GPU', lab: 'Parallel vs sequential work, transfer overhead and arithmetic intensity.',
  objectives: ['Explain parallelism with few fast cores vs many simpler lanes', 'Account for transfer and launch overhead', 'Recognize workloads that don\'t benefit'],
  html: `
  <div class="split" style="grid-template-columns:minmax(280px,0.8fr) minmax(0,2.2fr)">
    <div class="rail">
      <p class="lede">Each square is one independent task, like multiplying one row of a matrix.</p>
      <div class="controls stack" id="ctl"></div>
      <div class="controls" id="run"></div>
      <div class="tiles" id="tiles"></div>
      <div class="explain" id="why" aria-live="polite"></div>
      <div class="engbox eng-only"><b>Model (abstract ticks, not a benchmark)</b><p>CPU: 8 cores, 1 tick per operation. GPU: 512 lanes, 4 ticks per operation each (simpler, slower lanes), 30-tick kernel launch, data transfer 128 tasks per tick each way. Dependent tasks run one after another on either device.</p><p>Real speedups depend on memory bandwidth, data layout, precision and the libraries used.</p></div>
    </div>
    <div class="col"><div class="viz" style="min-height:380px"><div class="cvhost" id="cv"></div></div></div>
  </div>`,
  notice: 'Large, parallel, compute-heavy jobs favor the GPU. Small jobs lose to transfer overhead; dependent chains can\'t use the lanes at all.',
  myth: 'GPUs aren\'t simply faster processors. They are faster only for work that can be split into many independent pieces and kept on the device.',
  mount(el, slide) {
    const k = U.tok(slide); const P = { n: 4096, opsPerTask: 4, dependent: false }; let R, t = 0, playing = false;
    const c = U.canvas(el.querySelector('#cv'), draw);
    function calc() { R = SIM.parallel(P); t = 0; report(); draw(); }
    function lane(ctx, x, y, w, h, label, total, phases, doneFrac, col) {
      ctx.fillStyle = k.fg; ctx.font = k.sans; ctx.textAlign = 'left'; ctx.fillText(label, x, y - 10);
      let px = x; const max = Math.max(R.cpu, R.gpu);
      phases.forEach(([name, v, pc]) => { const ww = v / max * w; ctx.fillStyle = U.a(pc, 0.18); ctx.fillRect(px, y, ww, h); ctx.strokeStyle = pc; ctx.strokeRect(px, y, ww, h); if (ww > 70) { ctx.fillStyle = k.muted; ctx.font = k.monoS; ctx.fillText(name, px + 6, y + h / 2 + 4); } px += ww; });
      const tx = x + Math.min(t, total) / max * w; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, y - 4); ctx.lineTo(tx, y + h + 4); ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = k.muted; ctx.font = k.monoS; ctx.textAlign = 'right'; ctx.fillText(`${U.fmt(total)} ticks`, x + w, y - 10);
    }
    function grid(ctx, x, y, w, h, frac, lanes, col) {
      const cols = 64, rows = Math.max(1, Math.ceil(Math.min(P.n, 2048) / cols)); const cw = w / cols, ch = Math.min(10, h / rows);
      const shown = Math.min(P.n, 2048), done = Math.floor(shown * frac);
      for (let i = 0; i < shown; i++) { const cx = x + (i % cols) * cw, cy = y + Math.floor(i / cols) * ch; ctx.fillStyle = i < done ? col : k.grid; ctx.fillRect(cx + 0.5, cy + 0.5, cw - 1, ch - 1); }
      ctx.fillStyle = k.dim; ctx.font = k.monoS; ctx.textAlign = 'left'; ctx.fillText(`${U.fmt(P.n)} tasks${P.n > 2048 ? ' (first 2,048 drawn)' : ''} · ${lanes} active lane${lanes > 1 ? 's' : ''}`, x, y + rows * ch + 14);
    }
    function draw() {
      if (!R) return; const { ctx, W, H } = c; ctx.clearRect(0, 0, W, H);
      const x = 24, w = W - 48;
      lane(ctx, x, 40, w, 26, 'CPU · 8 fast cores', R.cpu, [['compute', R.cpu, k.blue]], 0, k.blue);
      lane(ctx, x, 108, w, 26, 'GPU · 512 lanes', R.gpu, [['launch', R.launch, k.dim], ['copy in', R.transfer / 2, k.amber], ['compute', R.gpuCompute, k.violet], ['copy out', R.transfer / 2, k.amber]], 0, k.violet);
      const cpuFrac = Math.min(1, t / R.cpu); const gpuFrac = Math.max(0, Math.min(1, (t - R.launch - R.transfer / 2) / R.gpuCompute));
      const half = (W - 72) / 2;
      ctx.fillStyle = k.fg; ctx.font = k.sans; ctx.textAlign = 'left'; ctx.fillText('CPU progress', x, 176); ctx.fillText('GPU progress', x + half + 24, 176);
      grid(ctx, x, 186, half, H - 220, cpuFrac, P.dependent ? 1 : Math.min(8, P.n), k.blue);
      grid(ctx, x + half + 24, 186, half, H - 220, gpuFrac, P.dependent ? 1 : Math.min(512, P.n), k.violet);
    }
    function report() {
      U.tiles(el.querySelector('#tiles'), [['CPU', U.fmt(R.cpu) + ' ticks', R.winner === 'cpu' ? 'good' : ''], ['GPU', U.fmt(R.gpu) + ' ticks', R.winner === 'gpu' ? 'good' : ''], ['GPU speedup', '×' + U.fmt(R.speedup, R.speedup < 10 ? 2 : 0), R.speedup > 1 ? 'ai' : 'warn'], ['GPU lanes busy', U.fmt(R.gpuUtil * 100) + '%', R.gpuUtil < 0.5 ? 'warn' : '']]);
      let m;
      if (P.dependent) m = 'Each task needs the previous result, so only one lane can work at a time. The GPU\'s slower individual lanes lose to a fast CPU core.';
      else if (R.winner === 'cpu' && R.transfer + R.launch > R.gpuCompute) m = `The job is too small: copying data to the GPU and launching the kernel (${U.fmt(R.transfer + R.launch)} ticks) costs more than the compute it saves.`;
      else if (R.winner === 'cpu') m = 'Not enough work per task to repay the GPU overhead. Raise operations per task or the number of tasks.';
      else m = `Thousands of independent tasks run side by side on 512 lanes. Compute dominates the overhead, so the GPU finishes ${U.fmt(R.speedup, 1)}× sooner. Neural networks are mostly this kind of work: huge matrix multiplications.`;
      el.querySelector('#why').innerHTML = `<h4>Why</h4><p>${m}</p>`;
      if (R.winner === 'gpu' && R.speedup > 5) U.markDone('gpu');
    }
    const ctl = el.querySelector('#ctl');
    const sizes = [16, 64, 256, 1024, 4096, 16384, 65536, 262144];
    U.slider(ctl, { label: 'Number of tasks', min: 0, max: sizes.length - 1, step: 1, value: 4, fmt: v => U.fmt(sizes[v]) }, v => { P.n = sizes[v]; calc(); });
    U.slider(ctl, { label: 'Operations per task', min: 1, max: 32, step: 1, value: P.opsPerTask, fmt: v => v }, v => { P.opsPerTask = v; calc(); });
    U.check(ctl, { label: 'Tasks depend on each other (sequential)', checked: false }, v => { P.dependent = v; calc(); });
    const r = el.querySelector('#run'); let stop = null;
    U.btn(r, 'Race', () => { t = 0; playing = true; if (U.RM) { t = Math.max(R.cpu, R.gpu); draw(); return; } }, 'primary');
    U.btn(r, 'Show result', () => { t = Math.max(R.cpu, R.gpu); draw(); });
    calc();
    stop = U.loop(dt => { if (!playing) return; const max = Math.max(R.cpu, R.gpu); t += dt * max / 3; if (t >= max) { t = max; playing = false; } draw(); });
    return () => { stop(); c.destroy(); };
  },
  notes: {
    objective: 'Learners explain GPU advantage as massive parallelism minus overhead, and identify where it disappears.',
    say: ['Default: 4,096 tasks, 4 operations each. Race: the GPU waits for launch and copy, then sweeps through.', 'Drop to 64 tasks: the CPU wins — the copy costs more than the work.', 'Tick "depend on each other": no parallelism, so one GPU lane versus one CPU core, and the CPU core is faster.'],
    ask: 'Why do LLMs need GPUs for inference but not for, say, a web server?',
    answer: 'Generating each token is dominated by large matrix multiplications over billions of weights — highly parallel. A web request is mostly sequential logic and I/O.',
    transition: 'One GPU serves one model. How do you serve thousands of users?'
  },
  check: { q: 'A tiny job of 64 simple tasks runs slower on the GPU. Why?', opts: ['GPUs can\'t do math', 'Transfer and launch overhead exceed the compute saved', 'The CPU has more lanes', 'GPUs only run neural networks'], a: 1, why: 'Fixed overheads (copying data, launching kernels) dominate when there isn\'t enough parallel work to amortize them.' }
});

scene({
  id: 'inference', section: 'ai', ai: true, ch: 12, kicker: 'AI inference scaling', title: 'How do you serve a model to thousands of users?', short: 'Inference scaling lab', lab: 'Memory, batching, replicas, queueing, latency and cost per token.',
  objectives: ['Size GPU memory for weights and KV cache', 'Trade batch size and replicas against latency and cost', 'Explain why more GPUs give sublinear speedups'],
  html: `
  <div class="split" style="grid-template-columns:minmax(290px,0.85fr) minmax(0,2.1fr)">
    <div class="rail" style="gap:10px">
      <div class="controls stack" id="ctl"></div>
      <div class="engbox eng-only"><b>Model</b><p>Weights = params × 2 bytes (FP16). KV cache per token = 2 × layers × KV width × 2 bytes. Batch ≤ free memory ÷ KV per request. Decode step = (base + per-sequence × batch) ÷ tensor-parallel speedup, speedup = g ÷ (1 + 0.12(g−1)). A request occupies one batch slot for prefill + output × step. Waiting from M/M/c (Erlang C) with c = replicas × batch.</p><p>All rates are illustrative assumptions; real engines (continuous batching, paged KV, quantization) behave differently. Measure your own workload.</p></div>
    </div>
    <div class="col">
      <div class="tiles" id="tiles"></div>
      <div class="grid2" style="align-items:stretch">
        <div class="explain"><h4>One replica's memory</h4><div id="mem"></div></div>
        <div class="explain" id="why" aria-live="polite"></div>
      </div>
      <div class="grid2"><div class="viz" style="min-height:210px"><div class="cvhost" id="c1"></div></div><div class="viz" style="min-height:210px"><div class="cvhost" id="c2"></div></div></div>
      <div class="explain eng-only"><h4>Training vs inference</h4><p>Training runs forward and backward passes over a dataset for hours to weeks, keeping gradients and optimizer state in memory (several times the weights) and synchronizing GPUs constantly. Inference only runs forward passes, must answer within seconds, and is sized for request traffic. Different hardware choices and cost profiles follow.</p></div>
    </div>
  </div>`,
  notice: 'Latency stays flat until utilization approaches 100%, then rises steeply. Replicas push that wall to the right — and add cost linearly.',
  myth: 'More GPUs don\'t guarantee proportionally faster AI. Communication between GPUs, memory limits and queueing all eat into the gain.',
  mount(el, slide) {
    const k = U.tok(slide); const P = Object.assign({}, SIM.llmDefaults);
    const c1 = U.canvas(el.querySelector('#c1'), draw), c2 = U.canvas(el.querySelector('#c2'), draw); let R;
    function upd() { R = SIM.llmPlan(P); report(); draw(); }
    function report() {
      const lat = R.stable ? U.fmt(R.latency, 1) + ' s' : 'overloaded';
      U.tiles(el.querySelector('#tiles'), [
        ['Fits in memory', R.fits ? 'yes' : 'no', R.fits ? 'good' : 'bad', R.fits ? `batch ≤ ${R.memBatch} by memory` : 'add GPUs per replica'],
        ['Effective batch', R.batch, R.batch < P.batch ? 'warn' : '', R.batch < P.batch ? 'memory-limited' : 'as configured'],
        ['Capacity', U.fmt(R.capRps, 1) + ' req/s', R.capRps > P.rps ? 'good' : 'bad', `${R.slots} concurrent slots`],
        ['Utilization', R.fits ? U.fmt(Math.min(R.rho, 9.99) * 100) + '%' : '—', R.rho >= 1 ? 'bad' : R.rho > 0.8 ? 'warn' : ''],
        ['Time to first token', R.stable ? U.fmt(R.ttft, 2) + ' s' : '∞', R.stable && R.ttft < 1 ? 'good' : 'warn'],
        ['End-to-end latency', lat, R.stable ? (R.waitS > 1 ? 'warn' : '') : 'bad', R.stable ? `queue wait ${U.fmt(R.waitS, 2)} s` : 'queue grows without bound'],
        ['Per-user speed', U.fmt(R.perStreamTokS) + ' tok/s', 'ai'],
        ['Cost', U.money(R.costHr) + '/hr', '', R.stable && R.tokPerSec > 0 ? `${U.money(R.costPerMTok)} per 1M output tokens` : '']
      ]);
      const mem = R.memGB, seg = (v, c, l) => v > 0 ? `<span title="${l}" style="width:${Math.min(100, v / mem * 100)}%;background:${c}"></span>` : '';
      el.querySelector('#mem').innerHTML = `<div style="display:flex;height:20px;border-radius:4px;overflow:hidden;background:var(--grid);margin-top:4px">${seg(R.weightsGB, 'var(--violet)', 'weights')}${seg(R.reserveGB, 'var(--dim)', 'runtime')}${seg(Math.max(0, R.kvUsedGB), 'var(--cyan)', 'KV cache')}</div>
        <p style="margin-top:6px;font-size:13.5px">${P.gpus} × ${P.gpuMemGB} GB = ${mem} GB · weights <b>${U.fmt(R.weightsGB)} GB</b> · runtime ${U.fmt(R.reserveGB)} GB · KV cache ${U.fmt(R.kvPerSeqGB * 1000, 0)} MB per request × ${R.batch} = <b>${U.fmt(R.kvUsedGB, 1)} GB</b>${R.weightsGB > mem ? ' · <span class="c-red">weights alone exceed memory</span>' : ''}</p>`;
      let m;
      if (!R.fits) m = `The ${R.m.label} model needs ${U.fmt(R.weightsGB)} GB for weights alone (plus KV cache), more than ${mem} GB. Split it across more GPUs per replica (tensor parallelism) or use a smaller / quantized model.`;
      else if (!R.stable) m = `Demand (${P.rps} req/s) exceeds capacity (${U.fmt(R.capRps, 1)} req/s). The queue grows without limit. Add replicas, raise the batch size, or shorten outputs. A new replica takes about ${P.loadS} s to load the model, so ~${U.fmt(R.backlog)} requests would pile up meanwhile.`;
      else if (R.rho > 0.85) m = `At ${U.fmt(R.rho * 100)}% utilization a small traffic increase causes large waits. This is the "knee" of the latency curve.`;
      else if (R.rho < 0.3) m = `Only ${U.fmt(R.rho * 100)}% utilized: latency is good but you're paying for idle GPUs (${U.money(R.costHr)}/hr).`;
      else m = `Healthy: ${U.fmt(R.rho * 100)}% utilized with ${U.fmt(R.waitS, 2)} s average queueing.`;
      if (P.gpus > 1 && R.fits) m += ` With ${P.gpus} GPUs per replica, compute speeds up only ×${U.fmt(R.sp, 2)} because GPUs must exchange activations every layer.`;
      el.querySelector('#why').innerHTML = `<h4>What the numbers say</h4><p>${m}</p>`;
      if (R.stable && R.rho > 0.4 && R.rho < 0.85) U.markDone('inference');
    }
    function draw() {
      if (!R) return;
      const xs = [], lat = [], maxR = Math.max(1, R.capRps * 1.3, P.rps * 1.2);
      for (let i = 0; i <= 60; i++) { const r = maxR * i / 60; const q = SIM.llmPlan(Object.assign({}, P, { rps: r })); xs.push(r); lat.push(q.stable ? q.latency : NaN); }
      const finite = lat.filter(v => isFinite(v)); const ymax = Math.max(1, ...finite.slice(0, -1)) * 1.1 || 10;
      U.chart(c1, { k, x: [0, maxR], y: [0, Math.min(ymax, (R.serviceS || 1) * 6)], xFmt: v => U.fmt(v, 1), yFmt: v => U.fmt(v, 0) + 's', xLabel: 'req/s', yLabel: 'end-to-end latency', padL: 44,
        series: [{ xs, data: lat.map(v => isFinite(v) ? v : 1e9), color: k.violet }], hlines: [], points: [{ x: P.rps, y: R.stable ? R.latency : 1e9, color: R.stable ? k.cyan : k.red, label: 'you' }],
        bands: [{ from: Math.min(R.capRps, maxR), to: maxR, color: U.a(k.red, 0.08) }] });
      const g = [1, 2, 4, 8]; const sp = g.map(x => SIM.tpSpeedup(x, P.comm));
      U.chart(c2, { k, x: [1, 8], y: [0, 8], xTicks: 7, xFmt: v => Math.round(v) + ' GPU', yFmt: v => '×' + U.fmt(v), yLabel: 'compute speedup per replica', legend: true, padL: 40,
        series: [{ xs: g, data: g, color: k.dim, dash: [4, 4], label: 'ideal' }, { xs: g, data: sp, color: k.violet, label: 'with communication', dot: true }], points: [{ x: P.gpus, y: SIM.tpSpeedup(P.gpus, P.comm), color: k.cyan }] });
    }
    const c = el.querySelector('#ctl');
    U.seg(c, [['8b', '8B model'], ['70b', '70B model']], P.model, v => { P.model = v; upd(); }, 'Model');
    U.slider(c, { label: 'Requests per second', min: 0.5, max: 60, step: 0.5, value: P.rps, fmt: v => v }, v => { P.rps = v; upd(); });
    U.slider(c, { label: 'Input tokens (avg)', min: 100, max: 8000, step: 100, value: P.inTok, fmt: v => U.fmt(v) }, v => { P.inTok = v; upd(); });
    U.slider(c, { label: 'Output tokens (avg)', min: 20, max: 2000, step: 20, value: P.outTok, fmt: v => U.fmt(v) }, v => { P.outTok = v; upd(); });
    U.slider(c, { label: 'Max batch size', min: 1, max: 64, step: 1, value: P.batch, fmt: v => v }, v => { P.batch = v; upd(); });
    U.slider(c, { label: 'Replicas', min: 1, max: 16, step: 1, value: P.replicas, fmt: v => v }, v => { P.replicas = v; upd(); });
    U.seg(c, [['1', '1 GPU'], ['2', '2'], ['4', '4'], ['8', '8']], String(P.gpus), v => { P.gpus = +v; upd(); }, 'GPUs per replica');
    const e1 = U.slider(c, { label: '$ per GPU-hour', min: 0.5, max: 12, step: 0.5, value: P.gpuHour, fmt: v => '$' + v }, v => { P.gpuHour = v; upd(); });
    const e2 = U.slider(c, { label: 'Model load time', min: 30, max: 900, step: 30, value: P.loadS, fmt: v => v + ' s' }, v => { P.loadS = v; upd(); });
    [e1, e2].forEach(s => s.el.classList.add('eng-only'));
    upd();
    return () => { c1.destroy(); c2.destroy(); };
  },
  notes: {
    objective: 'Learners reason about inference capacity from memory, batching, replicas and queueing, and connect it to cost.',
    say: ['8B model on one 80 GB GPU: weights take 16 GB, the rest holds KV cache — each request\'s attention memory.', 'Push requests per second: latency stays flat, then climbs a wall near 100% utilization. Add a replica: the wall moves right; the hourly cost doubles.', 'Switch to 70B: it doesn\'t fit. Two GPUs: it fits, but with barely room for 8 requests. Four GPUs: plenty of room — but only about 3× faster, not 4×.'],
    ask: 'Your bill doubled when you added a replica, but average latency barely changed. Was it a mistake?',
    answer: 'Maybe not: it buys headroom for spikes and failures. But if utilization stays low, scale replicas with traffic, or improve batching, instead.',
    transition: 'Serving is the end of the story. Where do models come from?'
  },
  check: { q: 'A 70B-parameter model at 2 bytes per parameter needs about how much memory just for weights?', opts: ['14 GB', '70 GB', '140 GB', '700 GB'], a: 2, why: '70 × 10⁹ parameters × 2 bytes = 140 × 10⁹ bytes ≈ 140 GB, before any KV cache.' }
});

const ML_STAGES = [
  { id: 'collect', t: 'Collect', s: 'App events, uploads, labels', res: 'Event streams, object storage', aws: 'Amazon S3, Kinesis', fail: 'Missing consent, biased sampling, no labels' },
  { id: 'ingest', t: 'Ingest & ETL', s: 'Clean, join, validate', res: 'Batch clusters (CPU), schedulers', aws: 'AWS Glue, Amazon EMR (Spark)', fail: 'Schema changes break jobs; silent nulls' },
  { id: 'lake', t: 'Data lake / warehouse', s: 'Raw + curated tables', res: 'Cheap storage, query engines', aws: 'S3 data lake, Amazon Redshift, Athena', fail: 'No versioning: can\'t reproduce a model' },
  { id: 'features', t: 'Features & datasets', s: 'Train / validation / test splits', res: 'CPU, sometimes GPU for embeddings', aws: 'SageMaker AI Feature Store, Glue', fail: 'Leakage: test data seen in training' },
  { id: 'train', t: 'Train', s: 'Fit model on GPUs', res: 'GPU clusters, fast interconnect', aws: 'SageMaker AI training jobs, EC2 GPU instances', fail: 'Out-of-memory, divergence, spot interruptions without checkpoints' },
  { id: 'eval', t: 'Evaluate', s: 'Accuracy, bias, latency checks', res: 'CPU/GPU for test runs', aws: 'SageMaker AI Experiments / evaluation', fail: 'Metrics that don\'t match the business goal' },
  { id: 'registry', t: 'Registry', s: 'Versioned, approved models', res: 'Metadata + artifacts in S3', aws: 'SageMaker AI Model Registry', fail: 'Shipping an unapproved or unknown model' },
  { id: 'deploy', t: 'Deploy', s: 'Endpoint, canary', res: 'GPU or CPU inference servers', aws: 'SageMaker AI endpoints, EKS/ECS, Bedrock (for managed foundation models)', fail: 'Training/serving skew: features computed differently' },
  { id: 'monitor', t: 'Monitor', s: 'Latency, errors, drift', res: 'Metrics and logging', aws: 'CloudWatch, SageMaker AI Model Monitor', fail: 'Drift goes unnoticed; quality degrades silently' }
];
scene({
  id: 'mlops', section: 'ai', ai: true, ch: 13, kicker: 'ML training, data pipelines and MLOps', title: 'How does a model move from raw data to production?', short: 'ML lifecycle explorer', lab: 'Stages, resources, failure points and the retraining loop.',
  objectives: ['Name each stage from data collection to monitoring', 'Match stages to resources and AWS services', 'Distinguish managed foundation models, custom training and self-hosted inference'],
  html: `
  <div class="viz grid auto" style="min-height:260px;height:260px"><div class="cvhost" id="fl"></div></div>
  <div class="controls" id="ctl"></div>
  <div class="grid2" style="align-items:start">
    <div class="explain" id="mlstage" aria-live="polite"></div>
    <div class="tscroll"><table class="t"><thead><tr><th></th><th>Managed foundation model</th><th>Custom training</th><th>Self-hosted inference</th></tr></thead><tbody>
      <tr><td>Example</td><td>Amazon Bedrock</td><td>SageMaker AI training</td><td>Open model on EKS / EC2 GPUs</td></tr>
      <tr><td>You manage</td><td>Prompts, data, access</td><td>Data, training code, evaluation</td><td>Servers, scaling, drivers, model serving</td></tr>
      <tr><td>Choose when</td><td>General capabilities suffice; fastest path</td><td>Your own task or data needs a specialized model</td><td>Steady high volume, custom models, full control</td></tr>
      <tr><td>Trade-off</td><td>Per-token pricing, less control</td><td>Expertise, GPU cost, MLOps</td><td>Highest operational burden</td></tr></tbody></table></div>
  </div>`,
  notice: 'The lifecycle is a loop: monitoring in production feeds new data and retraining.',
  myth: 'A model isn\'t "done" at deployment. Data changes over time (drift), and an unmonitored model quietly gets worse.',
  mount(el) {
    const nodes = {}; ML_STAGES.forEach((s, i) => { nodes[s.id] = { x: 70 + i * 113, y: i % 2 ? 150 : 70, label: s.t, sub: s.s.length > 18 ? s.s.slice(0, 17) + '…' : s.s, w: 104, h: 50, kind: ['train', 'eval', 'deploy'].includes(s.id) ? 'ai' : '' }; });
    const edges = ML_STAGES.slice(1).map((s, i) => [ML_STAGES[i].id, s.id]);
    const F = U.flow(el.querySelector('#fl'), { size: [1040, 250], nodes, edges, onClick: pick, label: 'ML lifecycle' });
    const loop = U.svg('path', { d: 'M974 175 C 974 235, 70 235, 70 95', fill: 'none', class: 'fe dash', id: 'loop' }, F.svg); const lt = U.svg('text', { x: 470, y: 238, class: 'lbl' }, F.svg); lt.textContent = 'retrain with new data';
    function pick(id) { const s = ML_STAGES.find(x => x.id === id); Object.keys(F.N).forEach(n => F.state(n, n === id ? 'on' : '')); el.querySelector('#mlstage').innerHTML = `<h4>${s.t}</h4><p>${s.s}.</p><p><b>Resources.</b> ${s.res}</p><p><b>AWS options.</b> ${s.aws}</p><p class="c-amber"><b>Fails when.</b> ${s.fail}</p>`; }
    let busy = false;
    const flowRun = async drift => { if (busy) return; busy = true; F.clear(); for (let i = 0; i < ML_STAGES.length - 1; i++) { F.state(ML_STAGES[i].id, 'done'); await F.packet(ML_STAGES[i].id, ML_STAGES[i + 1].id, i >= 3 && i <= 6 ? 'pk ai' : 'pk', 380); }
      F.state('monitor', drift ? 'warn' : 'good');
      if (drift) { el.querySelector('#mlstage').innerHTML = `<div class="verdict warn">Drift detected</div><p style="margin-top:8px;color:var(--muted)">Input data in production no longer looks like the training data (e.g. new phone cameras change photo statistics). Accuracy on recent labeled samples fell below the threshold, so the pipeline triggers retraining on fresh data, then re-evaluates before any new model ships.</p>`; loop.classList.add('on'); await new Promise(r => setTimeout(r, U.RM ? 0 : 700)); loop.classList.remove('on'); F.state('collect', 'on'); U.markDone('mlops'); }
      else el.querySelector('#mlstage').innerHTML = `<div class="verdict ok">Model in production</div><p style="margin-top:8px;color:var(--muted)">Data flowed from collection to a monitored endpoint. Click any stage to inspect its resources and failure points.</p>`;
      busy = false; };
    const c = el.querySelector('#ctl');
    U.btn(c, 'Run the pipeline', () => flowRun(false), 'primary'); U.btn(c, 'Simulate data drift', () => flowRun(true), 'warn');
    pick('train');
  },
  notes: { objective: 'Learners describe the ML lifecycle as a loop with distinct resources and failure modes per stage.', say: ['Most of the work is data: collecting, cleaning and versioning it. Training is one box.', 'Simulate drift: the model didn\'t change — the world did. Monitoring catches it and triggers retraining.'], ask: 'Pixelpost wants photo captions. Bedrock, custom training, or self-hosting?', answer: 'Start with a managed model for speed; train or fine-tune only if quality or cost demands it; self-host only at high, steady volume with a team to run it.', transition: 'Data preparation runs on many machines at once. How does that work?' },
  check: { q: 'Production accuracy drops while the model is unchanged. Most likely?', opts: ['The GPU is too slow', 'Data drift', 'The registry is full', 'Too many replicas'], a: 1, why: 'When real-world inputs shift away from the training distribution, a fixed model gets less accurate. Monitoring and retraining handle it.' }
});

scene({
  id: 'distributed', section: 'ai', ai: true, ch: 13, kicker: 'Distributed data processing', title: 'Why does adding workers stop helping?', short: 'Distributed processing', lab: 'Partitions, skew, shuffle and scheduling overhead (Spark-style).',
  objectives: ['Explain partitions, tasks and workers', 'See skew create stragglers', 'Account for shuffle data movement'],
  html: `
  <div class="split" style="grid-template-columns:minmax(280px,0.8fr) minmax(0,2.2fr)">
    <div class="rail">
      <p class="lede">Count every hashtag in 200 GB of Pixelpost posts. Split the data, process pieces in parallel, then combine.</p>
      <div class="controls stack" id="ctl"></div>
      <div class="tiles" id="tiles"></div>
      <div class="explain" id="why" aria-live="polite"></div>
      <div class="engbox eng-only"><b>Model</b><p>Partition sizes follow 1/(i+1)^skew. Tasks are assigned longest-first to the least-loaded worker. Shuffle moves a fraction of the data across the network (aggregate bandwidth grows with workers). Each task pays a fixed startup overhead; the driver pays scheduling cost per task. This is how Spark jobs on Amazon EMR or AWS Glue behave qualitatively.</p></div>
    </div>
    <div class="col"><div class="viz" style="min-height:250px"><div class="cvhost" id="g"></div></div><div class="viz" style="min-height:170px"><div class="cvhost" id="s"></div></div></div>
  </div>`,
  notice: 'The job finishes when the slowest worker finishes. Skewed partitions and data shuffles cap the speedup.',
  myth: 'Parallelism isn\'t free: coordinating and moving data between machines costs time that grows with the number of workers.',
  mount(el, slide) {
    const k = U.tok(slide); const P = Object.assign({}, SIM.distDefaults); let R;
    const g = U.canvas(el.querySelector('#g'), draw), s = U.canvas(el.querySelector('#s'), draw);
    function upd() { R = SIM.distJob(P); report(); draw(); }
    function draw() {
      if (!R) return; const { ctx, W, H } = g; ctx.clearRect(0, 0, W, H);
      const pl = 70, pr = 16, top = 28, rows = P.workers, rh = Math.max(4, Math.min(22, (H - top - 30) / rows)); const X = t => pl + t / R.total * (W - pl - pr);
      ctx.font = k.monoS; ctx.fillStyle = k.dim; ctx.textAlign = 'left'; ctx.fillText('worker timelines — map tasks, then shuffle, then reduce', pl, 16);
      for (let w = 0; w < rows; w++) { const y = top + w * rh; if (rh >= 9) { ctx.fillStyle = k.dim; ctx.textAlign = 'right'; ctx.fillText('w' + (w + 1), pl - 6, y + rh * 0.7); } ctx.fillStyle = k.grid; ctx.fillRect(pl, y + 1, W - pl - pr, rh - 2); }
      R.assign.forEach(a => { const y = top + a.worker * rh; ctx.fillStyle = U.a(k.cyan, 0.55); ctx.fillRect(X(a.start) + 0.5, y + 1, Math.max(1, X(a.start + a.dur) - X(a.start) - 1), rh - 2); });
      const m = R.mapS; ctx.fillStyle = U.a(k.amber, 0.5); ctx.fillRect(X(m), top, X(m + R.shuffleS) - X(m), rows * rh); ctx.fillStyle = U.a(k.violet, 0.5); ctx.fillRect(X(m + R.shuffleS), top, X(m + R.shuffleS + R.reduceS) - X(m + R.shuffleS), rows * rh);
      ctx.fillStyle = k.muted; ctx.textAlign = 'left'; ctx.fillText(`map ${U.fmt(R.mapS)} s · shuffle ${U.fmt(R.shuffleS)} s · reduce ${U.fmt(R.reduceS)} s · scheduling ${U.fmt(R.schedS)} s`, pl, H - 8);
      const ws = [1, 2, 4, 8, 16, 32, 64, 128]; const sp = ws.map(w => SIM.distJob(Object.assign({}, P, { workers: w })).speedup);
      const pos = Math.log2(P.workers);
      U.chart(s, { k, x: [0, 7], y: [0, Math.max(...sp, ...ws.map((_, i) => 0)) * 1.2 || 1], xTicks: 7, xFmt: v => U.fmt(Math.pow(2, v)), yFmt: v => '×' + U.fmt(v), yLabel: 'speedup vs. one machine', xLabel: 'workers (log scale)', padL: 46,
        series: [{ xs: ws.map((_, i) => i), data: sp, color: k.violet, dot: true }], points: [{ x: pos, y: R.speedup, color: k.cyan, label: `${P.workers} workers` }] });
    }
    function report() {
      U.tiles(el.querySelector('#tiles'), [['Job time', U.fmt(R.total) + ' s', ''], ['Speedup', '×' + U.fmt(R.speedup, 1), 'ai', `vs ${U.fmt(R.serial)} s on one machine`], ['Load balance', U.fmt(R.balance * 100) + '%', R.balance < 0.7 ? 'warn' : 'good', 'avg ÷ busiest worker']]);
      const parts = [['map', R.mapS], ['shuffle', R.shuffleS], ['reduce', R.reduceS], ['scheduling', R.schedS]].sort((a, b) => b[1] - a[1]);
      let m = `The biggest share of time is <b>${parts[0][0]}</b>. `;
      if (R.balance < 0.7) m += 'A few huge partitions (skew) keep some workers busy while others sit idle — repartition or salt hot keys. ';
      if (P.partitions < P.workers) m += 'There are fewer partitions than workers, so some workers have nothing to do. ';
      if (R.schedS > R.mapS * 0.3) m += 'Too many tiny tasks: scheduling overhead dominates. ';
      if (parts[0][0] === 'shuffle') m += 'Moving data between machines is the bottleneck; reduce what you shuffle (aggregate locally first).';
      el.querySelector('#why').innerHTML = `<h4>Where the time goes</h4><p>${m}</p>`;
    }
    const c = el.querySelector('#ctl');
    U.slider(c, { label: 'Workers', min: 1, max: 64, step: 1, value: P.workers }, v => { P.workers = v; upd(); });
    U.slider(c, { label: 'Partitions', min: 4, max: 2000, step: 4, value: P.partitions }, v => { P.partitions = v; upd(); });
    U.slider(c, { label: 'Data skew', min: 0, max: 1.5, step: 0.05, value: P.skew, fmt: v => v.toFixed(2) }, v => { P.skew = v; upd(); if (v > 0.9) U.markDone('distributed'); });
    U.slider(c, { label: 'Data shuffled', min: 0, max: 1, step: 0.05, value: P.shuffleFrac, fmt: v => Math.round(v * 100) + '%' }, v => { P.shuffleFrac = v; upd(); });
    upd();
    return () => { g.destroy(); s.destroy(); };
  },
  notes: { objective: 'Learners explain sublinear scaling of distributed jobs from skew, shuffle and overhead.', say: ['Each bar is a task on a worker. The job ends when the last bar ends.', 'Raise skew: one partition is huge, one worker becomes the straggler.', 'Raise workers to 64: the map phase shrinks, but shuffle and scheduling don\'t, so the curve flattens.'], ask: 'Why do Spark jobs often aggregate locally before shuffling?', answer: 'It reduces the data sent over the network, which is usually far slower than local processing.', transition: 'You\'ve seen every building block. Let\'s see them combined in real products.' },
  check: { q: 'Doubling workers barely sped up a job; one worker finishes long after the rest. Cause?', opts: ['Too few partitions overall', 'Data skew creating a straggler', 'The CDN', 'IAM permissions'], a: 1, why: 'With skewed partitions, one task dominates and the job waits for it no matter how many other workers there are.' }
});

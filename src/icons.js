/* Original line-icon set (24×24, stroke = currentColor) and service-category colors.
   Category hues follow the convention cloud diagrams use (compute warm, storage green, database blue, networking purple…);
   the glyphs themselves are drawn for Cloud Atlas and are not any provider's icons. */
(function () {
  if (typeof U === 'undefined') return;
  const IC = {
    server: '<rect x="4" y="3.5" width="16" height="7" rx="1.6"/><rect x="4" y="13.5" width="16" height="7" rx="1.6"/><circle cx="7.8" cy="7" r=".9" fill="currentColor"/><circle cx="7.8" cy="17" r=".9" fill="currentColor"/><path d="M11.5 7h5M11.5 17h5"/>',
    rack: '<rect x="5" y="2.5" width="14" height="19" rx="1.5"/><path d="M5 7.5h14M5 12h14M5 16.5h14"/><circle cx="8" cy="5" r=".7" fill="currentColor"/><circle cx="8" cy="9.8" r=".7" fill="currentColor"/><circle cx="8" cy="14.3" r=".7" fill="currentColor"/><circle cx="8" cy="19" r=".7" fill="currentColor"/>',
    db: '<ellipse cx="12" cy="5.5" rx="7" ry="2.6"/><path d="M5 5.5v13c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-13"/><path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6"/>',
    bucket: '<ellipse cx="12" cy="6" rx="8" ry="2.4"/><path d="M4 6l1.9 13.2c.2 1.1 2.9 1.8 6.1 1.8s5.9-.7 6.1-1.8L20 6"/><path d="M7.5 12.5c2.8 1 6.2 1 9 0"/>',
    fn: '<path d="M14.5 4h-1.2a3 3 0 0 0-3 3v13"/><path d="M7 10.5h6.5"/><path d="M14 14l5 6M19 14l-5 6"/>',
    container: '<path d="M12 2.8l8 4.4v9.6l-8 4.4-8-4.4V7.2z"/><path d="M4 7.2l8 4.4 8-4.4M12 11.6v9.6"/>',
    cluster: '<circle cx="12" cy="12" r="2.6"/><circle cx="12" cy="3.8" r="1.8"/><circle cx="19.3" cy="16.2" r="1.8"/><circle cx="4.7" cy="16.2" r="1.8"/><path d="M12 5.6v3.8M17.7 15.3l-3.4-2M6.3 15.3l3.4-2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.2 3.2 3.2 14.8 0 18M12 3c-3.2 3.2-3.2 14.8 0 18"/>',
    cdn: '<circle cx="12" cy="12" r="6.5"/><path d="M5.5 12h13M12 5.5c2 2 2 11 0 13M12 5.5c-2 2-2 11 0 13"/><circle cx="3.6" cy="3.6" r="1.5"/><circle cx="20.4" cy="3.6" r="1.5"/><circle cx="20.4" cy="20.4" r="1.5"/><circle cx="3.6" cy="20.4" r="1.5"/>',
    dns: '<path d="M12 2.5v19"/><path d="M5.5 5.5h11l2.5 2.6-2.5 2.6h-11z"/><path d="M18.5 13.3h-11l-2.5 2.6 2.5 2.6h11z"/>',
    lb: '<circle cx="4.8" cy="12" r="2.2"/><path d="M7 12h3.5M10.5 12l6.5-6.5M10.5 12h6.5M10.5 12l6.5 6.5"/><circle cx="19" cy="5.5" r="1.7"/><circle cx="19" cy="12" r="1.7"/><circle cx="19" cy="18.5" r="1.7"/>',
    gateway: '<path d="M4 21V10a8 8 0 0 1 16 0v11"/><path d="M8.5 21v-7.5a3.5 3.5 0 0 1 7 0V21"/><path d="M2.5 21h19"/>',
    shield: '<path d="M12 2.8l8 3.1v6.2c0 4.6-3.4 8.1-8 9.1-4.6-1-8-4.5-8-9.1V5.9z"/><path d="M8.6 12.2l2.4 2.4 4.5-4.9"/>',
    key: '<circle cx="7.5" cy="15.5" r="4"/><path d="M10.5 12.5L20 3M16 7l2.4 2.4M13.8 9.2l2 2"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7.2a4 4 0 0 1 8 0v3.3"/><circle cx="12" cy="15.5" r="1.3" fill="currentColor"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.6 4.4-7 8-7s7 2.4 8 7"/>',
    users: '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c.8-4 3.5-6 6.5-6s5.7 2 6.5 6"/><circle cx="17" cy="7" r="2.6"/><path d="M16.5 12.5c2.6.2 4.4 2 5 5"/>',
    queue: '<rect x="2.5" y="7.5" width="4.4" height="9" rx="1"/><rect x="8.6" y="7.5" width="4.4" height="9" rx="1"/><rect x="14.7" y="7.5" width="4.4" height="9" rx="1"/><path d="M20.4 12h1.6"/>',
    cache: '<path d="M13.2 2.5L5 14h6.2l-1.4 7.5L19 10h-6.4z"/>',
    gpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6" rx=".8"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    ai: '<path d="M11 3l1.9 5.3L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.7z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    chart: '<path d="M3.5 20.5h17"/><path d="M5.5 16l4.2-5 3.3 3 6-7.5"/><path d="M15.5 6.5H19V10"/>',
    pipe: '<circle cx="4.6" cy="12" r="2.3"/><circle cx="12" cy="12" r="2.3"/><circle cx="19.4" cy="12" r="2.3"/><path d="M6.9 12h2.8M14.3 12h2.8"/>',
    cloud: '<path d="M7 18.5h10.6a4.1 4.1 0 0 0 .4-8.2 6.2 6.2 0 0 0-11.8 1.3A3.5 3.5 0 0 0 7 18.5z"/>',
    pin: '<path d="M12 21.5s-6.2-6.3-6.2-11.2a6.2 6.2 0 0 1 12.4 0c0 4.9-6.2 11.2-6.2 11.2z"/><circle cx="12" cy="10.2" r="2.3"/>',
    building: '<rect x="4" y="3.5" width="16" height="17.5" rx="1.2"/><path d="M8 7.5h2M14 7.5h2M8 11.5h2M14 11.5h2M10.2 21v-4.5h3.6V21"/>',
    laptop: '<rect x="5" y="4.5" width="14" height="10" rx="1.5"/><path d="M2.8 19h18.4l-2-4.5H4.8z"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 21h4"/>',
    dollar: '<circle cx="12" cy="12" r="9"/><path d="M15 9.2c-.4-1-1.6-1.7-3-1.7-1.7 0-3 .9-3 2.1s1.3 1.7 3 2c1.7.3 3 .9 3 2.1s-1.3 2.1-3 2.1c-1.4 0-2.6-.7-3-1.7M12 5.8v1.7M12 16.5v1.7"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.8 4l-3.6 16"/>',
    branch: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="7.5" r="2"/><path d="M6 7v10M18 9.5c0 4.5-6.5 3.2-11.4 7.8"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12.5l9 5 9-5"/><path d="M3 16.5l9 5 9-5"/>',
    network: '<rect x="2.8" y="2.8" width="18.4" height="18.4" rx="3" stroke-dasharray="3 2.4"/><circle cx="8" cy="9" r="1.8"/><circle cx="16" cy="9" r="1.8"/><circle cx="12" cy="16" r="1.8"/><path d="M9.8 9h4.4M9 10.6l2.1 3.8M15 10.6l-2.1 3.8"/>',
    scale: '<path d="M4 20.5v-5M9.3 20.5v-8.5M14.6 20.5V8.5M20 20.5V4"/><path d="M14 4h6v6" />',
    disk: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="16.5" cy="12" r="1.3"/><path d="M6.5 12h6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9.5 2.5v3.5M14.5 2.5v3.5M9.5 18v3.5M14.5 18v3.5M2.5 9.5H6M2.5 14.5H6M18 9.5h3.5M18 14.5h3.5"/><path d="M10 10h4v4h-4z"/>',
    fan: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.6"/><path d="M12 10.4C11 7 12 4.5 14.5 5s1.4 3.8-1.2 5.8M13.6 12c3.4-1 5.9 0 5.4 2.5s-3.8 1.4-5.8-1.2M12 13.6c1 3.4 0 5.9-2.5 5.4s-1.4-3.8 1.2-5.8M10.4 12C7 13 4.5 12 5 9.5s3.8-1.4 5.8 1.2"/>',
    bolt: '<path d="M13.2 2.5L5 14h6.2l-1.4 7.5L19 10h-6.4z"/>',
    doc: '<path d="M6 2.5h8.5l3.5 3.5v15.5H6z"/><path d="M14.5 2.5V6H18M9 10.5h6M9 14h6M9 17.5h4"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.7 2.7L16.2 9"/>',
    warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v4.8M12 17.8v.4"/>',
    router: '<rect x="3" y="13" width="18" height="7.5" rx="2"/><path d="M7 16.8h.01M10.5 16.8h.01M8.2 9.3a5.5 5.5 0 0 1 7.6 0M5.6 6.6a9.2 9.2 0 0 1 12.8 0"/>',
    tree: '<rect x="9" y="2.5" width="6" height="4.5" rx="1"/><rect x="2.5" y="17" width="6" height="4.5" rx="1"/><rect x="15.5" y="17" width="6" height="4.5" rx="1"/><path d="M12 7v5M5.5 17v-5h13v5"/>',
    rocket: '<path d="M12 2.5c3.5 2.5 5 6.5 4.2 11.5H7.8C7 9 8.5 5 12 2.5z"/><circle cx="12" cy="9" r="1.7"/><path d="M7.8 14L5 17.5h4M16.2 14l2.8 3.5h-4M10.5 17.5l1.5 4 1.5-4"/>',
    book: '<path d="M4 4.5A2 2 0 0 1 6 2.5h14v16H6a2 2 0 0 0-2 2z"/><path d="M4 20.5a2 2 0 0 0 2 1h14"/>',
    map: '<path d="M3 6.5l6-3 6 3 6-3v14l-6 3-6-3-6 3z"/><path d="M9 3.5v14M15 6.5v14"/>',
    flag: '<path d="M5 21.5V3.5M5 4h12l-2.5 4 2.5 4H5"/>',
    timeline: '<path d="M3 12h18"/><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 4v4M12 16v4M18 4v4"/>',
    swap: '<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>',
    puzzle: '<path d="M10 3.5h4v2.2a1.8 1.8 0 1 0 3.5 0V3.5H20.5v5h-2.2a1.8 1.8 0 1 0 0 3.5h2.2v8H15v-2.2a1.8 1.8 0 1 0-3.5 0v2.2h-8v-5.5h2.2a1.8 1.8 0 1 0 0-3.5H3.5v-4.5H10z"/>',
    wave: '<path d="M2 12c2.5-5 5-5 7.5 0s5 5 7.5 0 3.3-3.3 5-1.5"/>',
    plug: '<path d="M9 2.5v5M15 2.5v5M6.5 7.5h11v3a5.5 5.5 0 0 1-11 0z"/><path d="M12 16v5.5"/>',
    box: '<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9M7.8 5.2l8.5 4.6"/>',
    thermo: '<path d="M10 4a2 2 0 0 1 4 0v10.2a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>'
  };
  const CAT = {
    compute: '#F28C1E', storage: '#5FA829', database: '#4E7BF6', network: '#9061F9', security: '#E5484D', ai: '#A78BFA',
    mgmt: '#E8478B', integration: '#E8478B', client: '#7C8DB0', edge: '#9061F9', devops: '#14B8A6', cost: '#FBBC04',
    aws: '#FF9900', azure: '#0A84E8', gcp: '#4285F4', basics: '#38BDF8', career: '#34A853'
  };
  U.IC = IC; U.CAT = CAT;
  U.icon = (n, cls = '') => IC[n] ? `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[n]}</svg>` : '';
  U.badge = (n, cat, cls = '') => `<span class="badge ${cls}" style="--c:${CAT[cat] || cat || CAT.client}">${U.icon(n)}</span>`;
  const GUESS = [
    [/\bdns\b|route 53|resolver/i, 'dns', 'network'], [/\bcdn\b|edge|cloudfront|front door/i, 'cdn', 'network'], [/load bal|\belb\b|\balb\b/i, 'lb', 'network'],
    [/^internet(?!\s*(gw|gateway))/i, 'globe', 'client'], [/\bnat\b|gateway|\bigw\b|internet/i, 'gateway', 'network'], [/\bwaf\b|firewall|shield|guard/i, 'shield', 'security'], [/\biam\b|identity|auth|cognito|entra|sign-in/i, 'key', 'security'],
    [/secret|\bkms\b|vault/i, 'lock', 'security'], [/\bgpu|accelerat|tpu/i, 'gpu', 'ai'], [/model|llm|embed|vector|\brag\b|inference|train|sagemaker|bedrock|vertex|feature/i, 'ai', 'ai'],
    [/browser|client|laptop|mobile|\buser|visitor/i, 'laptop', 'client'], [/queue|\bsqs\b|pub\/?sub|kafka|kinesis|stream|bus\b|event/i, 'queue', 'integration'],
    [/cache|redis|elasticache|memorystore/i, 'cache', 'database'], [/\bs3\b|object|bucket|blob|static|storage|archive|glacier|lake/i, 'bucket', 'storage'],
    [/\bdb\b|database|\brds\b|aurora|dynamo|\bsql|postgres|table|warehouse|cosmos|firestore|replica|primary|shard/i, 'db', 'database'],
    [/lambda|function|serverless/i, 'fn', 'compute'], [/container|\becs\b|\beks\b|k8s|kube|fargate|\bpod/i, 'container', 'compute'],
    [/monitor|cloudwatch|metric|\blogs?\b|alarm|trace|observ/i, 'chart', 'mgmt'], [/scal/i, 'scale', 'compute'], [/pipeline|ci\/?cd|build|deploy|\bgit/i, 'pipe', 'devops'],
    [/server|\bapp\b|ec2|\bvm\b|instance|\bapi\b|web|compute|worker|service|backend/i, 'server', 'compute']
  ];
  U.guessIcon = t => { for (const [re, i, c] of GUESS) if (re.test(t)) return [i, c]; return null; };
  U.SCENE_IC = {
    journey: ['globe', 'network'], 'why-cloud': ['building', 'compute'], responsibility: ['layers', 'security'], global: ['map', 'network'],
    assemble: ['puzzle', 'compute'], vpc: ['network', 'network'], surge: ['scale', 'compute'], storage: ['db', 'database'], iam: ['key', 'security'],
    pipeline: ['pipe', 'devops'], containers: ['container', 'compute'], outage: ['warn', 'mgmt'], cost: ['dollar', 'cost'], llm: ['ai', 'ai'], gpu: ['gpu', 'ai'],
    inference: ['scale', 'ai'], mlops: ['pipe', 'ai'], distributed: ['cluster', 'ai'], cases: ['book', 'basics'], studio: ['puzzle', 'devops'],
    careers: ['users', 'career'], roadmap: ['flag', 'career'], reference: ['search', 'basics']
  };
})();

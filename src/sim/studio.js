/* Architecture Studio validator (Chapter 15).
   A design is a set of chosen components plus a few properties. Connections are derived from compatibility rules.
   Every check is listed to the learner with its reasoning; nothing is scored in secret. */
(function (G) {
  const SIM = G.SIM = G.SIM || {};
  SIM.studioParts = [
    { id: 'dns', lane: 'edge', name: 'DNS', aws: 'Route 53', cost: 1 },
    { id: 'cdn', lane: 'edge', name: 'CDN', aws: 'CloudFront', cost: 40 },
    { id: 'waf', lane: 'edge', name: 'Web firewall', aws: 'AWS WAF', cost: 20 },
    { id: 'apigw', lane: 'edge', name: 'API gateway', aws: 'API Gateway', cost: 15 },
    { id: 'alb', lane: 'edge', name: 'Load balancer', aws: 'Elastic Load Balancing (ALB)', cost: 25 },
    { id: 'ec2', lane: 'compute', name: 'Virtual servers', aws: 'EC2 (+ Auto Scaling)', cost: 60 },
    { id: 'ecs', lane: 'compute', name: 'Containers', aws: 'ECS on Fargate', cost: 55 },
    { id: 'lambda', lane: 'compute', name: 'Functions', aws: 'Lambda', cost: 10 },
    { id: 'bedrock', lane: 'compute', name: 'Managed foundation models', aws: 'Amazon Bedrock', cost: 150 },
    { id: 'sagemaker', lane: 'compute', name: 'Managed model endpoint', aws: 'SageMaker AI endpoint', cost: 900 },
    { id: 'gpuec2', lane: 'compute', name: 'Self-hosted GPU servers', aws: 'EC2 GPU instances', cost: 2800 },
    { id: 's3', lane: 'data', name: 'Object storage', aws: 'S3', cost: 5 },
    { id: 'rds', lane: 'data', name: 'Relational database', aws: 'RDS', cost: 110 },
    { id: 'dynamo', lane: 'data', name: 'Key-value database', aws: 'DynamoDB', cost: 40 },
    { id: 'cache', lane: 'data', name: 'In-memory cache', aws: 'ElastiCache', cost: 50 },
    { id: 'vector', lane: 'data', name: 'Vector index', aws: 'OpenSearch / pgvector', cost: 120 },
    { id: 'private', lane: 'security', name: 'Private subnets', aws: 'VPC', cost: 35 },
    { id: 'iam', lane: 'security', name: 'Least-privilege roles', aws: 'IAM', cost: 0 },
    { id: 'secrets', lane: 'security', name: 'Secrets store', aws: 'Secrets Manager', cost: 2 },
    { id: 'auth', lane: 'security', name: 'User sign-in', aws: 'Amazon Cognito', cost: 10 },
    { id: 'cw', lane: 'ops', name: 'Metrics, logs, alarms', aws: 'CloudWatch', cost: 30 },
    { id: 'trail', lane: 'ops', name: 'API audit log', aws: 'CloudTrail', cost: 5 }
  ];
  SIM.studioDefaults = () => ({ on: {}, count: 2, azs: 1, asg: false, multiAz: false, dbPublic: false });
  const P = id => SIM.studioParts.find(p => p.id === id);

  SIM.studioChallenges = {
    static: { title: 'Deploy a static website', brief: 'A personal portfolio: HTML, CSS and images. Low traffic, global visitors, a custom domain.', peak: 50 },
    webapp: { title: 'Build a secure web application', brief: 'A sign-in-free store front with a product catalog and orders. Customer data must not be reachable from the internet.', peak: 300 },
    spike: { title: 'Survive a traffic spike', brief: 'A launch will push the store to 2,000 req/s for an hour. It must keep serving if one instance — or one AZ — fails. Assume one server handles 300 req/s.', peak: 2000 },
    ai: { title: 'Build an AI application', brief: 'A support chatbot that answers from company documents for signed-in users, with usage monitoring.', peak: 20 }
  };
  SIM.studioExamples = {
    static: { on: { dns: 1, cdn: 1, s3: 1 }, count: 2, azs: 1, asg: false, multiAz: false, dbPublic: false },
    webapp: { on: { dns: 1, cdn: 1, waf: 1, alb: 1, ecs: 1, rds: 1, private: 1, iam: 1, secrets: 1, cw: 1, trail: 1 }, count: 2, azs: 2, asg: true, multiAz: true, dbPublic: false },
    spike: { on: { dns: 1, cdn: 1, alb: 1, ec2: 1, rds: 1, cache: 1, private: 1, iam: 1, secrets: 1, cw: 1 }, count: 12, azs: 3, asg: true, multiAz: true, dbPublic: false },
    ai: { on: { dns: 1, apigw: 1, waf: 1, lambda: 1, bedrock: 1, s3: 1, vector: 1, dynamo: 1, auth: 1, iam: 1, secrets: 1, cw: 1, trail: 1 }, count: 2, azs: 1, asg: false, multiAz: false, dbPublic: false }
  };

  SIM.studioEdges = d => {
    const on = id => !!d.on[id]; const e = [];
    const entry = on('cdn') ? 'cdn' : null;
    if (on('dns')) { if (entry) e.push(['dns', entry]); else if (on('alb')) e.push(['dns', 'alb']); else if (on('apigw')) e.push(['dns', 'apigw']); }
    if (on('waf')) ['cdn', 'alb', 'apigw'].filter(on).slice(0, 1).forEach(x => e.push(['waf', x]));
    if (on('cdn')) { if (on('s3')) e.push(['cdn', 's3']); if (on('alb')) e.push(['cdn', 'alb']); else if (on('apigw')) e.push(['cdn', 'apigw']); }
    const comp = ['ec2', 'ecs'].filter(on);
    if (on('alb')) comp.forEach(c => e.push(['alb', c]));
    if (on('apigw')) { if (on('lambda')) e.push(['apigw', 'lambda']); else if (on('alb') === false) comp.forEach(c => e.push(['apigw', c])); }
    const apps = ['ec2', 'ecs', 'lambda'].filter(on);
    apps.forEach(a => {
      ['rds', 'dynamo', 'cache', 's3', 'vector', 'bedrock', 'sagemaker', 'gpuec2'].filter(on).forEach(t => e.push([a, t]));
      if (on('secrets') && on('rds')) e.push([a, 'secrets']);
    });
    if (on('auth') && on('apigw')) e.push(['auth', 'apigw']);
    return e;
  };

  SIM.studioCheck = function (key, d) {
    const on = id => !!d.on[id];
    const chk = []; const R = (pass, msg, why) => chk.push({ level: 'required', pass: !!pass, msg, why }); const S = (pass, msg, why) => chk.push({ level: 'recommended', pass: !!pass, msg, why });
    const servers = on('ec2') || on('ecs');
    const compute = servers || on('lambda');
    const db = on('rds') || on('dynamo');
    const perInst = 300;
    if (key === 'static') {
      R(on('s3'), 'Object storage holds the site files', 'Static files need durable storage; S3 serves them without any server to patch.');
      R(on('cdn'), 'A CDN delivers the files', 'Global visitors get files from a nearby edge cache, and the bucket can stay private behind it.');
      R(on('dns'), 'DNS maps the custom domain', 'Visitors type a name, not an address; DNS points that name at the CDN.');
      S(!servers, 'No servers for static content', servers ? 'Servers here add cost, patching and a failure point with no new capability for static files.' : 'Nothing to patch or scale.');
      S(!db, 'No database for a static site', db ? 'A database stores dynamic data; this site has none, so it only adds cost and attack surface.' : 'Right-sized for the requirement.');
    }
    if (key === 'webapp' || key === 'spike') {
      R(on('dns'), 'DNS for the store\'s domain', 'Users reach the app by name.');
      R(compute, 'Compute runs the application code', 'Something must execute the catalog and order logic.');
      R(db, 'A database stores orders', on('s3') && !db ? 'Object storage holds files, not transactional order records.' : 'Orders need durable, queryable records.');
      if (servers) R(on('alb'), 'A load balancer fronts the servers', 'It spreads traffic, runs health checks and lets servers stay private.');
      if (servers || on('rds')) R(on('private'), 'Servers and database sit in private subnets', 'Private subnets have no route from the internet; only the load balancer is public.');
      if (on('rds')) R(!d.dbPublic, 'The database is not publicly accessible', d.dbPublic ? 'This database is exposed to the public network, which this scenario doesn\'t need and which increases risk.' : 'Only the application tier can reach it.');
      if (on('rds')) S(on('secrets'), 'Database credentials live in a secrets store', 'Hard-coded passwords leak through code and logs; a secrets store supports rotation.');
      R(on('iam'), 'Least-privilege IAM roles for the app', 'The app gets temporary credentials scoped to exactly what it needs.');
      S(on('waf'), 'A web application firewall filters common attacks', 'WAF rules block known bad patterns before they reach your code.');
      S(on('cw'), 'Metrics, logs and alarms', 'You can\'t operate what you can\'t see.');
      if (key === 'webapp') S(on('trail'), 'API activity is audited', 'CloudTrail records who changed what in the account.');
    }
    if (key === 'spike') {
      const peak = 2000;
      if (servers) {
        const cap = d.count * perInst;
        R(cap >= peak || d.asg, `Capacity covers ${peak} req/s`, d.asg ? `Auto Scaling can add servers; it starts at ${cap} req/s and needs launch time, so pre-scale before the launch.` : `${d.count} servers × ${perInst} = ${cap} req/s.`);
        R(d.azs >= 2, 'Servers span at least two Availability Zones', d.azs >= 2 ? `Spread across ${d.azs} AZs.` : 'Everything in one AZ fails together.');
        const afterAz = (d.count - Math.ceil(d.count / Math.max(1, d.azs))) * perInst;
        R(d.azs >= 2 && (afterAz >= peak || d.asg), 'Survives losing one AZ at peak', d.azs < 2 ? 'Single AZ.' : `After losing an AZ, ${d.count - Math.ceil(d.count / d.azs)} servers remain = ${afterAz} req/s${afterAz < peak ? (d.asg ? '; Auto Scaling must replace the rest, so users see degraded service for several minutes' : ' — not enough') : ''}.`);
        if (on('rds')) R(d.multiAz, 'Database has a standby in another AZ', d.multiAz ? 'Multi-AZ failover.' : 'The app survives an AZ loss but its single-AZ database may not.');
      } else if (on('lambda')) S(true, 'Functions scale with requests', 'Lambda scales per request within account concurrency limits; check the limit and downstream database capacity.');
      S(on('cache'), 'A cache absorbs repeated reads', 'Product pages are read far more than written; a cache keeps the database from becoming the bottleneck.');
      S(on('cdn'), 'A CDN serves images and static assets', 'Offloads the majority of bytes from the origin.');
    }
    if (key === 'ai') {
      R(on('apigw') || on('alb'), 'An API entry point', 'Validates requests and applies throttling before expensive inference.');
      R(on('auth'), 'Users sign in', 'Only signed-in users may use the bot, and usage is attributable per user.');
      R(on('bedrock') || on('sagemaker') || on('gpuec2'), 'A model serves inference', 'Something must generate the answers.');
      R(compute, 'Application logic assembles prompts', 'Code retrieves context, builds the prompt, calls the model and enforces policy.');
      S(on('vector') && on('s3'), 'Documents in object storage and a vector index for retrieval', 'Retrieval-augmented generation finds relevant passages at request time without retraining the model.');
      S(on('dynamo') || on('rds'), 'Conversation history is stored', 'Multi-turn chat needs previous messages.');
      R(on('cw'), 'Usage, latency and error monitoring', 'Token usage drives cost; latency and errors drive experience.');
      S(on('iam'), 'Least-privilege role for model and data access', 'The app should invoke only the model and read only the documents it needs.');
      if (on('gpuec2')) S(false, 'Self-hosted GPUs are a deliberate choice', 'You own capacity planning, drivers, model serving and scaling. Justified for custom models or steady high volume.');
      if (on('bedrock') && (on('sagemaker') || on('gpuec2'))) S(false, 'Pick one inference path', 'Running managed and self-hosted inference together doubles cost unless each serves a distinct model.');
    }
    const cost = SIM.studioParts.filter(p => on(p.id)).reduce((s, p) => s + p.cost * ((p.id === 'ec2' || p.id === 'ecs') ? d.count : 1), 0) + (on('rds') && d.multiAz ? 110 : 0);
    const req = chk.filter(c => c.level === 'required');
    return { checks: chk, pass: req.every(c => c.pass), passed: req.filter(c => c.pass).length, required: req.length, cost };
  };

  // Failure injection for the current design: what keeps working?
  SIM.studioFail = function (key, d, kind) {
    const on = id => !!d.on[id]; const servers = on('ec2') || on('ecs');
    const peak = (SIM.studioChallenges[key] || {}).peak || 300; const perInst = 300;
    const out = [];
    if (kind === 'instance') {
      if (servers) {
        const left = d.count - 1;
        if (left <= 0) out.push({ k: 'bad', m: 'The only server failed: the application is down until a replacement launches.' });
        else if (!on('alb')) out.push({ k: 'bad', m: 'No load balancer: clients pointed at the failed server get errors; nothing reroutes them.' });
        else out.push({ k: left * perInst >= peak ? 'good' : 'warn', m: `Health checks remove the failed server; ${left} remain = ${left * perInst} req/s vs ${peak} needed.${d.asg ? ' Auto Scaling launches a replacement.' : ''}` });
      } else if (on('lambda')) out.push({ k: 'good', m: 'Functions have no long-lived server for you to lose; failed invocations are retried or return errors to the caller.' });
      else out.push({ k: 'good', m: 'No servers in this design; managed services handle host failures.' });
    }
    if (kind === 'az') {
      if (servers) {
        if (d.azs < 2) out.push({ k: 'bad', m: 'All servers were in that AZ: the application is down.' });
        else { const left = d.count - Math.ceil(d.count / d.azs); out.push({ k: left * perInst >= peak ? 'good' : 'warn', m: `${left} servers remain in other AZs = ${left * perInst} req/s vs ${peak} needed.` }); }
      }
      if (on('rds')) out.push({ k: d.multiAz ? 'good' : 'bad', m: d.multiAz ? 'The database fails over to its standby (a short interruption).' : 'The single-AZ database was in that AZ: reads and writes fail until it is restored.' });
      if (on('dynamo') || on('s3') || on('lambda') || on('bedrock')) out.push({ k: 'good', m: 'Regional managed services in the design (S3, DynamoDB, Lambda, Bedrock) are built to tolerate the loss of an AZ.' });
      if (on('sagemaker') || on('gpuec2')) out.push({ k: 'warn', m: 'Inference servers survive only if instances were placed in more than one AZ.' });
    }
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* Simplified VPC reachability engine (Chapter 5).
   Models: one VPC 10.0.0.0/16; a public subnet (ALB, NAT gateway); an app subnet that can be placed in the public or a
   private subnet; a private DB subnet. Evaluates, in order: routes, internet gateway, public IPs, network ACLs
   (stateless — return traffic needs its own rule) and security groups (stateful — return traffic is allowed).
   Simplifications: one route table per subnet type, NACLs are configurable only on the DB subnet, no VPC endpoints,
   no IPv6, no prefix lists, no DNS resolution step. */
(function (G) {
  const SIM = G.SIM = G.SIM || {};

  SIM.vpcDefaults = {
    igw: true, publicDefaultRoute: true, nat: true, privateDefaultRoute: true,
    appSubnet: 'private', appPublicIp: false,
    sgAlb443: true, sgAppFrom: 'alb', sgDbFrom: 'app', sgAppEgress: true,
    dbNacl: 'default'
  };
  const CIDR = { public: '10.0.1.0/24', private: '10.0.2.0/24', db: '10.0.3.0/24', world: '0.0.0.0/0' };

  SIM.vpcScenarios = [
    { id: 'web', label: 'Internet user → load balancer :443', expect: 'allowed' },
    { id: 'alb-app', label: 'Load balancer → app server :8080', expect: 'allowed' },
    { id: 'app-db', label: 'App server → database :5432', expect: 'allowed' },
    { id: 'app-out', label: 'App server → internet :443 (OS updates)', expect: 'allowed' },
    { id: 'net-app', label: 'Internet → app server :8080 directly', expect: 'blocked' },
    { id: 'net-db', label: 'Internet → database :5432 directly', expect: 'blocked' }
  ];

  SIM.vpcEval = function (cfgIn, scenario) {
    const c = Object.assign({}, SIM.vpcDefaults, cfgIn || {});
    const hops = []; const path = [];
    let ok = true;
    const H = (label, pass, why) => { hops.push({ label, ok: pass, why }); if (!pass) ok = false; return pass; };
    const appCidr = c.appSubnet === 'public' ? CIDR.public : CIDR.private;
    const rtOf = sub => sub === 'public' ? 'public' : 'private';
    const defaultRoute = sub => rtOf(sub) === 'public' ? (c.publicDefaultRoute ? 'igw' : null) : (c.privateDefaultRoute ? (c.nat ? 'nat' : 'nat (deleted)') : null);
    const subOf = n => n === 'alb' || n === 'nat' ? 'public' : n === 'app' ? c.appSubnet : 'db';
    const cidrOf = n => n === 'internet' ? CIDR.world : n === 'app' ? appCidr : n === 'db' ? CIDR.db : CIDR.public;

    // Network ACL evaluation (only the DB subnet is customized)
    const naclIn = (sub, port, srcCidr) => {
      if (sub !== 'db' || c.dbNacl === 'default') return [true, 'Default NACL allows all inbound traffic.'];
      if (c.dbNacl === 'deny') return [false, 'DB subnet NACL denies all inbound traffic.'];
      if (port === 5432 && srcCidr === CIDR.private) return [true, `NACL rule 100 allows TCP 5432 from ${CIDR.private}.`];
      return [false, `NACL only allows TCP 5432 from ${CIDR.private}; this traffic comes from ${srcCidr}.`];
    };
    const naclOutEphemeral = (sub, dstCidr) => {
      if (sub !== 'db' || c.dbNacl === 'default') return [true, 'Default NACL allows all outbound traffic.'];
      if (c.dbNacl === 'deny') return [true, 'Outbound is allowed (inbound is what this NACL blocks).'];
      if (c.dbNacl === 'noEphemeral') return [false, 'NACLs are stateless: the reply leaves on an ephemeral port (1024–65535) and no outbound rule allows it.'];
      if (dstCidr === CIDR.private) return [true, `NACL allows outbound TCP 1024–65535 to ${CIDR.private} (the reply).`];
      return [false, `NACL outbound rule only covers ${CIDR.private}.`];
    };
    const sgIn = (dst, port, src) => {
      if (dst === 'alb') return c.sgAlb443 && port === 443 ? [true, 'sg-alb allows TCP 443 from 0.0.0.0/0.'] : [false, 'sg-alb has no inbound rule for this traffic.'];
      if (dst === 'app') {
        if (port !== 8080) return [false, 'sg-app only opens TCP 8080.'];
        if (c.sgAppFrom === 'world') return [true, 'sg-app allows TCP 8080 from 0.0.0.0/0 (anyone).'];
        if (c.sgAppFrom === 'alb') return src === 'alb' ? [true, 'sg-app allows TCP 8080 from sg-alb.'] : [false, 'sg-app only allows TCP 8080 from sg-alb, and this source is not in sg-alb.'];
        return [false, 'sg-app has no inbound rules.'];
      }
      if (dst === 'db') {
        if (port !== 5432) return [false, 'sg-db only opens TCP 5432.'];
        if (c.sgDbFrom === 'world') return [true, 'sg-db allows TCP 5432 from 0.0.0.0/0 (anyone).'];
        if (c.sgDbFrom === 'app') return src === 'app' ? [true, 'sg-db allows TCP 5432 from sg-app.'] : [false, 'sg-db only allows TCP 5432 from sg-app.'];
        return [false, 'sg-db has no inbound rules.'];
      }
      return [false, 'no rule'];
    };
    const sgEgress = src => src === 'app' ? (c.sgAppEgress ? [true, 'sg-app allows all outbound traffic.'] : [false, 'sg-app has no outbound rules.']) : [true, `sg-${src} allows outbound traffic.`];
    const hasPublicIp = n => n === 'alb' ? true : n === 'app' ? c.appPublicIp : false;

    const inbound = (dst, port) => {
      path.push('internet', 'igw', dst);
      if (!H('Internet gateway', c.igw, c.igw ? 'An internet gateway is attached to the VPC.' : 'No internet gateway is attached, so nothing in the VPC is reachable from the internet.')) return;
      const sub = subOf(dst);
      const r = defaultRoute(sub);
      if (!H(`Route table (${rtOf(sub)})`, r === 'igw', r === 'igw' ? `0.0.0.0/0 → igw in the ${rtOf(sub)} route table, so replies can return to the internet.` :
        r ? `This subnet's 0.0.0.0/0 route points to the NAT gateway. NAT only supports connections that start inside the VPC.` : 'This subnet has no route to the internet gateway, so it is not a public subnet.')) return;
      if (!H('Public IP address', hasPublicIp(dst), hasPublicIp(dst) ? `${dst === 'alb' ? 'The internet-facing load balancer has' : 'The instance has'} a public IP.` :
        'The resource has no public IP. Being in a public subnet is not enough: the internet gateway can only translate traffic for resources with a public IP.')) return;
      const n = naclIn(sub, port, CIDR.world); if (!H('Network ACL (inbound)', n[0], n[1])) return;
      const s = sgIn(dst, port, 'internet'); if (!H('Security group (inbound)', s[0], s[1])) return;
      const o = naclOutEphemeral(sub, CIDR.world); if (!H('Network ACL (reply)', o[0], o[1])) return;
      H('Reply', true, 'Security groups are stateful, so the reply is allowed automatically.');
    };
    const internal = (src, dst, port) => {
      path.push(src, dst);
      H('Route (local)', true, `10.0.0.0/16 → local: every route table includes the VPC's local route.`);
      const e = sgEgress(src); if (!H('Security group (outbound)', e[0], e[1])) return;
      const n = naclIn(subOf(dst), port, cidrOf(src)); if (!H('Network ACL (inbound)', n[0], n[1])) return;
      const s = sgIn(dst, port, src); if (!H('Security group (inbound)', s[0], s[1])) return;
      const o = naclOutEphemeral(subOf(dst), cidrOf(src)); if (!H('Network ACL (reply)', o[0], o[1])) return;
      H('Reply', true, 'The security group allows the reply because it tracks the connection.');
    };
    const outbound = () => {
      path.push('app');
      const e = sgEgress('app'); if (!H('Security group (outbound)', e[0], e[1])) return;
      const sub = c.appSubnet; const r = defaultRoute(sub);
      if (sub === 'public') {
        path.push('igw', 'internet');
        if (!H('Route table (public)', r === 'igw', r === 'igw' ? '0.0.0.0/0 → igw.' : 'No default route to the internet gateway.')) return;
        if (!H('Public IP address', c.appPublicIp, c.appPublicIp ? 'The instance has a public IP, so the IGW can translate its traffic.' : 'The instance is in a public subnet but has no public IP, so its traffic cannot reach the internet through the IGW.')) return;
        if (!H('Internet gateway', c.igw, c.igw ? 'Internet gateway attached.' : 'No internet gateway attached.')) return;
      } else {
        path.push('nat', 'igw', 'internet');
        if (!H('Route table (private)', !!r, r ? `0.0.0.0/0 → ${r}.` : 'The private route table has no 0.0.0.0/0 route, so the packet has nowhere to go.')) return;
        if (!H('NAT gateway', c.nat, c.nat ? 'A NAT gateway in the public subnet translates the private address.' : 'The route points to a NAT gateway that no longer exists (a blackhole route).')) return;
        if (!H('Route table (public, for the NAT)', c.publicDefaultRoute, c.publicDefaultRoute ? 'The NAT gateway\'s subnet routes 0.0.0.0/0 → igw.' : 'The NAT gateway sits in a subnet with no route to the IGW.')) return;
        if (!H('Internet gateway', c.igw, c.igw ? 'Internet gateway attached.' : 'No internet gateway attached.')) return;
      }
      H('Reply', true, 'Replies to a connection the instance started are allowed back in.');
    };
    switch (scenario) {
      case 'web': inbound('alb', 443); break;
      case 'alb-app': internal('alb', 'app', 8080); break;
      case 'app-db': internal('app', 'db', 5432); break;
      case 'app-out': outbound(); break;
      case 'net-app': inbound('app', 8080); break;
      case 'net-db': inbound('db', 5432); break;
    }
    return { ok, hops, path: [...new Set(path)] };
  };
})(typeof window !== 'undefined' ? window : globalThis);

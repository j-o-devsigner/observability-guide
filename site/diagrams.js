/* Architecture diagrams (inline SVG). Inlined by site/build.py after charts.js.
   Colors: orange = path to Dynatrace, blue = path to the open-source stack, gray = into the pipeline.
   Every arrow carries a label; wide diagrams scroll inside their own box on phones. */
(function () {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const COL = { n: 'var(--muted)', dt: 'var(--viz-s2)', os: 'var(--viz-s1)', key: 'var(--accent)' };
  let uid = 0;

  function make(host, title, caption, W, H, minW, draw) {
    const id = 'dg' + (++uid);
    const defs = `<defs>${Object.keys(COL).map(k => `<marker id="${id}-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" style="fill:${COL[k]}"/></marker>`).join('')}</defs>`;
    const g = { box, arrow, text, pill, id };
    function box(x, y, w, h, title, sub = [], kind) {
      const stroke = kind ? COL[kind] : 'var(--line)';
      const sw = kind ? 1.75 : 1;
      return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" style="fill:var(--bg);stroke:${stroke};stroke-width:${sw}"/>` +
        `<text x="${x + 12}" y="${y + 21}" class="dg-t">${esc(title)}</text>` +
        sub.map((s, i) => `<text x="${x + 12}" y="${y + 38 + i * 15}" class="dg-s">${esc(s)}</text>`).join('') + '</g>';
    }
    function arrow(d, kind, label, lx, ly, opts = {}) {
      return `<path d="${d}" style="fill:none;stroke:${COL[kind]};stroke-width:1.75${opts.dash ? ';stroke-dasharray:5 4' : ''}" marker-end="url(#${id}-${kind})"/>` +
        (label ? text(lx, ly, label, opts.anchor || 'middle') : '');
    }
    function text(x, y, s, anchor = 'start', cls = 'dg-l') {
      return `<text x="${x}" y="${y}" text-anchor="${anchor}" class="${cls}">${esc(s)}</text>`;
    }
    function pill(x, y, s, kind) {
      const w = s.length * 6.3 + 20;
      return `<g><rect x="${x}" y="${y}" width="${w}" height="22" rx="11" style="fill:var(--viz-surface);stroke:${COL[kind] || 'var(--line)'};stroke-width:1"/><text x="${x + 10}" y="${y + 15}" class="dg-p">${esc(s)}</text></g>`;
    }
    host.className = 'viz diagram';
    host.innerHTML = `<figure><div class="viz-title">${esc(title)}</div><div class="dg-scroll"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(caption)}" style="min-width:${minW}px">${defs}${draw(g)}</svg></div><figcaption>${esc(caption)}</figcaption></figure>`;
  }

  function legend(g, y) {
    const items = [['dt', 'to Dynatrace'], ['os', 'to the open-source stack'], ['n', 'into the pipeline']];
    return items.map(([k, s], i) => { const x = 24 + i * 190; return `<line x1="${x}" y1="${y}" x2="${x + 28}" y2="${y}" style="stroke:${COL[k]};stroke-width:1.75"/>` + g.text(x + 36, y + 4, s); }).join('') +
      `<line x1="${24 + 3 * 190}" y1="${y}" x2="${24 + 3 * 190 + 28}" y2="${y}" style="stroke:var(--muted);stroke-width:1.75;stroke-dasharray:5 4"/>` + g.text(24 + 3 * 190 + 36, y + 4, 'query');
  }

  const D = {
    'dt-architecture'(host) {
      make(host, 'OpenTelemetry collects, Dynatrace analyzes',
        'Services are instrumented with OpenTelemetry (or OneAgent for selected tier-1 services). Agents read node data and buffer on disk, one cluster collector watches the Kubernetes API, and the gateway applies every rule once before exporting to Dynatrace. The ActiveGate adds Kubernetes monitoring and routes OneAgent traffic. A second backend is optional: one more exporter.',
        900, 420, 760, g => [
          `<rect x="8" y="30" width="652" height="350" rx="12" class="dg-frame"/>`, g.text(20, 22, 'Kubernetes cluster', 'start', 'dg-s'),
          g.box(24, 52, 208, 62, 'Tier-1 services (optional)', ['OneAgent code module']),
          g.box(24, 142, 208, 62, 'Services', ['OTel auto-instrumentation']),
          g.box(24, 232, 208, 62, 'Nodes', ['container logs · kubelet']),
          g.box(24, 318, 208, 50, 'Kubernetes API', ['objects · events']),
          g.box(270, 142, 170, 104, 'OTel agent', ['DaemonSet', 'k8sattributes · logs', 'disk buffer'], 'key'),
          g.box(270, 300, 170, 62, 'Cluster collector', ['1 replica', 'k8s_cluster · events']),
          g.box(470, 160, 170, 150, 'OTel gateway', ['identity · redact', 'label allow-list', 'to delta', 'self-monitoring'], 'key'),
          g.box(470, 46, 170, 76, 'ActiveGate', ['k8s monitoring', 'OneAgent routing']),
          g.box(740, 120, 150, 140, 'Dynatrace', ['Grail · Davis', 'SLOs · alerts', 'dashboards', 'Workflows'], 'dt'),
          g.box(740, 300, 150, 50, 'Second backend', ['optional']),
          g.arrow('M232,80 L468,80', 'dt', 'OneAgent traffic', 350, 72),
          g.arrow('M232,174 L268,178', 'n', 'OTLP', 250, 168),
          g.arrow('M232,262 L268,226', 'n', 'read', 250, 256),
          g.arrow('M232,343 L268,334', 'n', 'watch', 250, 330),
          g.arrow('M440,196 L468,204', 'n', 'OTLP', 454, 190),
          g.arrow('M440,330 L468,292', 'n', 'OTLP', 458, 322),
          g.arrow('M640,235 L738,205', 'dt', 'OTLP/HTTP · delta', 690, 210),
          g.arrow('M640,84 C690,84 690,140 738,148', 'dt', '443', 694, 100),
          g.arrow('M640,286 L738,322', 'n', 'optional', 690, 318, { dash: true }),
          `<line x1="24" y1="402" x2="52" y2="402" style="stroke:var(--viz-s2);stroke-width:1.75"/>`, g.text(60, 406, 'to Dynatrace'),
          `<line x1="190" y1="402" x2="218" y2="402" style="stroke:var(--muted);stroke-width:1.75"/>`, g.text(226, 406, 'inside the pipeline'),
          `<line x1="380" y1="402" x2="408" y2="402" style="stroke:var(--muted);stroke-width:1.75;stroke-dasharray:5 4"/>`, g.text(416, 406, 'optional'),
        ].join(''));
    },
    'dt-paths'(host) {
      make(host, 'Same service, two ways into Dynatrace',
        'The OpenTelemetry path adds one hop: your gateway. That hop is where you decide what is sent and paid for, and where the same data could also go to a second backend. The OneAgent path needs almost no work and gives more depth, but sends what the agent captures.',
        900, 384, 760, g => [
          g.text(20, 30, 'OneAgent path', 'start', 'dg-h'),
          g.box(20, 44, 180, 60, 'Service pod', ['+ OneAgent code module']),
          g.box(480, 44, 150, 60, 'ActiveGate', ['routing']),
          g.box(700, 44, 160, 60, 'Dynatrace', ['traces · code-level', 'topology · Davis'], 'dt'),
          g.arrow('M200,74 L478,74', 'dt', 'automatic deep traces, everything captured', 339, 66),
          g.arrow('M630,74 L698,74', 'dt', '', 0, 0),
          g.pill(20, 116, 'Billed: Full-Stack memory GiB-hours (trace + metric allowance included)', 'dt'),
          `<line x1="20" y1="160" x2="880" y2="160" class="dg-frame"/>`,
          g.text(20, 190, 'OpenTelemetry path', 'start', 'dg-h'),
          g.box(20, 204, 180, 60, 'Service pod', ['+ OTel auto-instrumentation']),
          g.box(250, 196, 180, 76, 'OTel agent → gateway', ['filter · drop labels', 'mask · sample · delta'], 'key'),
          g.box(700, 204, 160, 60, 'Dynatrace', ['what you chose to send'], 'dt'),
          g.box(250, 296, 180, 38, 'Second backend (optional)', []),
          g.arrow('M200,234 L248,234', 'n', 'OTLP', 224, 226),
          g.arrow('M430,234 L698,234', 'dt', 'OTLP/HTTP · delta (direct or via ActiveGate)', 564, 226),
          g.arrow('M340,272 L340,294', 'n', 'same stream', 348, 287, { anchor: 'start', dash: true }),
          g.text(340, 188, 'the control point', 'middle', 'dg-k'),
          g.pill(20, 352, 'Billed: metric data points (histogram = 10) · trace GiB · log GiB · no pod-hours', 'n'),
        ].join(''));
    },
    'sre-flow'(host) {
      make(host, 'Incident flow in Dynatrace: one alert source per symptom, one page',
        'Custom alerts and SLO burn-rate alerts cover service symptoms (per client, per version, business); Davis covers infrastructure and Kubernetes anomalies and groups related events into one problem. A Workflow routes the problem to the owning team, and the engineer then uses each view for the question it answers best.',
        900, 320, 760, g => [
          g.box(20, 40, 210, 62, 'Custom alerts · SLO burn', ['per client · per version', 'business · pipeline'], 'dt'),
          g.box(20, 140, 210, 62, 'Davis', ['k8s / infra anomalies', 'OOM · restarts'], 'dt'),
          g.box(300, 86, 170, 70, 'Problem + Workflow', ['grouped by Davis', 'route by team']),
          g.box(530, 94, 110, 54, 'On-call', ['one page']),
          g.box(700, 20, 190, 60, 'L1 service dashboard', ['who? which version?'], 'dt'),
          g.box(700, 100, 190, 60, 'Problems · Smartscape', ['what else broke?'], 'dt'),
          g.box(700, 180, 190, 60, 'Traces · logs', ['why, in the code?']),
          g.box(300, 250, 340, 50, 'Fix · postmortem · update the guide', ['playbook status, alert tuning']),
          g.arrow('M230,71 C265,71 265,110 298,110', 'dt', 'event', 238, 62, { anchor: 'start' }),
          g.arrow('M230,171 C265,171 265,134 298,134', 'dt', 'event', 238, 192, { anchor: 'start' }),
          g.arrow('M470,121 L528,121', 'n', 'page', 499, 113),
          g.arrow('M640,108 C670,108 670,50 698,50', 'n', '1', 664, 74),
          g.arrow('M640,121 L698,128', 'n', '2', 670, 118),
          g.arrow('M640,134 C670,134 670,210 698,210', 'n', '3', 664, 184),
          g.arrow('M585,148 L585,248', 'n', 'resolved', 593, 205, { anchor: 'start' }),
        ].join(''));
    },
    'collector-tiers'(host) {
      make(host, 'Collector tiers: where each signal is read, buffered and exported',
        'Agents read node-local data and keep a durable buffer on disk. One cluster collector watches the Kubernetes API. The gateway applies every rule once and is the only component that talks to Dynatrace. When Dynatrace is slow, the gateway blocks and the agents hold the data.',
        900, 330, 760, g => [
          `<rect x="8" y="24" width="618" height="290" rx="12" class="dg-frame"/>`, g.text(20, 16, 'Kubernetes cluster', 'start', 'dg-s'),
          g.box(24, 44, 160, 54, 'Pods (apps)', ['OTel auto-instr. / SDK']),
          g.box(24, 128, 160, 54, 'Node: /var/log/pods', ['container stdout/stderr']),
          g.box(24, 212, 160, 54, 'Kubelet', ['node · pod · container stats']),
          g.box(234, 96, 170, 120, 'Agent (DaemonSet)', ['k8sattributes', 'parse JSON logs', '', 'disk queue + checkpoints'], 'key'),
          g.box(234, 236, 170, 62, 'Cluster collector', ['1 replica · k8s API', 'objects, events, httpcheck']),
          g.box(450, 120, 160, 120, 'Gateway (2+, PDB)', ['identity · redact', 'label allow-list', 'drop health checks', 'to delta'], 'key'),
          g.box(700, 120, 180, 120, 'Dynatrace', ['metrics · logs · traces', 'self-monitoring', 'alerts · SLOs'], 'dt'),
          g.arrow('M184,71 L232,120', 'n', 'OTLP', 210, 88),
          g.arrow('M184,155 L232,155', 'n', 'filelog', 208, 148),
          g.arrow('M184,239 L232,190', 'n', 'kubeletstats', 200, 228),
          g.arrow('M404,156 L448,166', 'n', 'OTLP', 426, 152),
          g.arrow('M404,266 L448,214', 'n', 'OTLP', 432, 252),
          g.arrow('M610,180 L698,180', 'dt', 'OTLP/HTTP · delta', 654, 172),
          g.arrow('M698,204 L612,204', 'n', 'backpressure', 654, 222, { dash: true }),
          g.text(319, 88, 'durable', 'middle', 'dg-k'), g.text(530, 262, 'stateless', 'middle', 'dg-k'),
        ].join(''));
    },
    'frontend-flow'(host) {
      make(host, 'Frontend and backend linked: real users, synthetic checks, one trace',
        'The RUM agent in the browser measures what users experience and adds a W3C traceparent header to backend calls. Backend services instrumented with OpenTelemetry continue the same trace through the collectors. Synthetic monitors exercise key journeys from outside, even with no users.',
        900, 260, 760, g => [
          g.box(20, 40, 190, 76, 'Browser', ['RUM JavaScript', 'Web Vitals · errors · actions']),
          g.box(20, 160, 190, 60, 'Synthetic monitor', ['login · checkout journeys'], 'dt'),
          g.box(330, 40, 190, 76, 'Backend services', ['OTel auto-instrumentation', 'continue the trace']),
          g.box(330, 160, 190, 60, 'OTel collectors', ['agent → gateway']),
          g.box(660, 90, 210, 90, 'Dynatrace', ['sessions + Web Vitals', 'backend traces', 'one end-to-end trace'], 'dt'),
          g.arrow('M210,70 L328,70', 'n', 'traceparent header', 269, 62),
          g.arrow('M425,116 L425,158', 'n', 'OTLP', 433, 142, { anchor: 'start' }),
          g.arrow('M520,190 L658,150', 'dt', 'OTLP', 590, 186),
          g.arrow('M115,40 C115,10 760,10 760,88', 'dt', 'RUM beacons', 440, 22),
          g.arrow('M210,190 C270,190 270,100 328,100', 'dt', 'scripted requests', 262, 214),
        ].join(''));
    },
    'onboarding-flow'(host) {
      make(host, 'Onboarding a service: one file in, everything generated',
        'A team merges a short observability.yaml. The pipeline validates it, labels the workload so OpenTelemetry instruments it, and renders SLOs, alerts and routing from the shared templates with Monaco. Telemetry and configuration both land in Dynatrace, without a ticket to the SRE team.',
        900, 300, 760, g => [
          g.box(20, 104, 180, 76, 'observability.yaml', ['service · team · tier', 'SLO targets · runbook']),
          g.box(260, 90, 180, 104, 'CI / GitOps', ['validate (definition of done)', 'render from templates', 'deploy'], 'key'),
          g.box(260, 222, 180, 62, 'Templates (one side)', ['dashboard · SLO · alerts'], 'key'),
          g.box(510, 30, 190, 76, 'Kubernetes', ['namespace annotation', 'labels: team, version']),
          g.box(510, 180, 190, 76, 'Dynatrace config', ['SLO (slo-v2) · alerts', 'routing · dashboard var']),
          g.box(760, 100, 120, 90, 'Dynatrace', ['data + config', 'per service'], 'dt'),
          g.arrow('M200,142 L258,142', 'n', 'PR merged', 229, 134),
          g.arrow('M350,222 L350,196', 'n', 'parameters', 358, 213, { anchor: 'start' }),
          g.arrow('M440,120 C475,120 475,68 508,68', 'n', 'Helm / Argo CD', 474, 86),
          g.arrow('M440,166 C475,166 475,218 508,218', 'n', 'Monaco', 474, 206),
          g.arrow('M700,68 C730,68 730,120 758,120', 'dt', 'OTel telemetry', 732, 62),
          g.arrow('M700,218 C730,218 730,170 758,170', 'dt', 'API', 732, 236),
        ].join(''));
    },
    'microservice-template'(host) {
      make(host, 'One template for every microservice: baseline + archetype + parameters',
        'Every microservice gets the same baseline because it emits the same OpenTelemetry signals. The archetype add-on covers what differs by kind of service, and a few parameters from the service file (SLO targets, critical routes, clients) make it specific. The pipeline renders the combination for each service.',
        900, 250, 760, g => [
          g.box(20, 20, 430, 58, '3 · Service parameters (observability.yaml)', ['SLO targets · critical routes · clients · business KPIs']),
          g.box(20, 92, 430, 58, '2 · Archetype add-on', ['API · queue consumer · batch · gateway/BFF · frontend'], 'key'),
          g.box(20, 164, 430, 58, '1 · Baseline (every service, automatic)', ['RED · saturation · dependencies · logs + trace_id · service.version'], 'dt'),
          g.box(560, 40, 320, 62, 'checkout', ['baseline + API add-on', 'SLO 99.9% · critical route /pay · per client']),
          g.box(560, 140, 320, 62, 'orders-worker', ['baseline + queue-consumer add-on', 'SLO: oldest message < 60 s']),
          g.arrow('M450,121 C505,121 505,71 558,71', 'n', 'rendered', 505, 86),
          g.arrow('M450,121 C505,121 505,171 558,171', 'n', 'rendered', 505, 164),
        ].join(''));
    },
    'internal-deps'(host) {
      make(host, 'A request is a chain: internal SLOs must be stricter',
        'Users only see checkout, but checkout depends on internal services, which depend on shared platform services. Each hop is measured from the caller (client spans) and protected by a timeout and a retry budget. Because failures multiply along the chain, every dependency needs a better target than the service that relies on it.',
        900, 310, 760, g => [
          g.box(20, 125, 100, 52, 'Users', ['RUM / journey']),
          g.box(170, 115, 170, 72, 'checkout', ['user-facing SLO 99.9%'], 'key'),
          g.box(420, 30, 170, 62, 'payments-api', ['internal SLO 99.95%']),
          g.box(420, 120, 170, 62, 'inventory', ['internal SLO 99.95%']),
          g.box(420, 210, 170, 62, 'auth', ['internal SLO 99.95%']),
          `<rect x="640" y="20" width="250" height="272" rx="12" class="dg-frame"/>`, g.text(652, 40, 'Platform services · platform team', 'start', 'dg-s'),
          g.box(660, 52, 210, 56, 'PostgreSQL', ['SLO 99.99% · consumers listed'], 'dt'),
          g.box(660, 128, 210, 56, 'Redis', ['hit ratio · evictions · memory'], 'dt'),
          g.box(660, 204, 210, 56, 'Kafka', ['lag per partition · replication'], 'dt'),
          g.arrow('M120,151 L168,151', 'n', 'requests', 144, 143),
          g.arrow('M340,138 C380,138 380,61 418,61', 'n', 'timeout 300 ms', 368, 92),
          g.arrow('M340,151 L418,151', 'n', 'retry ≤ 1', 379, 143),
          g.arrow('M340,164 C380,164 380,241 418,241', 'n', 'client spans', 372, 222),
          g.arrow('M590,61 C625,61 625,80 658,80', 'n', 'pool 20', 624, 56),
          g.arrow('M590,151 L658,156', 'n', 'cache', 624, 146),
          g.arrow('M590,72 C630,72 630,232 658,232', 'n', 'events', 618, 205),
        ].join(''));
    },
    'log-masking': function (host) {
      make(host, 'Masking in layers: each stage removes what the previous one missed',
        'Most leaks are stopped in the code and the logger. The collector gateway applies one rule set to every service, including third-party libraries. Dynatrace OpenPipeline masks again at ingest, before storage, for every channel. Buckets then limit how long and to whom the remaining data is visible.',
        900, 250, 760, g => [
          g.box(20, 70, 140, 92, 'Service code', ["don't log secrets", 'log fields, not objects']),
          g.box(185, 70, 140, 92, 'Logger', ['redaction policies', 'hash user IDs']),
          g.box(405, 70, 150, 92, 'OTel gateway', ['transform/redact', 'tokens · JWT · email', 'cards · URL query'], 'key'),
          g.box(580, 70, 145, 92, 'OpenPipeline', ['masking processor', 'all ingest channels'], 'dt'),
          g.box(752, 46, 138, 44, 'app logs bucket', ['35 days']),
          g.box(752, 98, 138, 44, 'audit bucket', ['1+ year · restricted']),
          g.box(752, 150, 138, 44, 'debug bucket', ['7 days']),
          g.text(90, 50, '1 · don\'t log it', 'middle', 'dg-k'), g.text(255, 50, '2 · logger', 'middle', 'dg-k'),
          g.text(480, 50, '3 · gateway', 'middle', 'dg-k'), g.text(652, 50, '4 · ingest', 'middle', 'dg-k'), g.text(821, 30, '5 · storage', 'middle', 'dg-k'),
          g.arrow('M160,116 L183,116', 'n', '', 0, 0),
          g.arrow('M325,116 L403,116', 'n', 'stdout/OTLP', 364, 108),
          g.arrow('M555,116 L578,116', 'dt', '', 0, 0),
          g.arrow('M725,100 C738,100 738,68 750,68', 'dt', '', 0, 0),
          g.arrow('M725,116 L750,120', 'dt', '', 0, 0),
          g.arrow('M725,132 C738,132 738,172 750,172', 'dt', '', 0, 0),
          g.text(420, 196, 'agent parses JSON on the way (container logs → attributes, level, trace_id)', 'middle', 'dg-s'),
          g.text(700, 214, 'buckets by rule: retention + access', 'middle', 'dg-s'),
        ].join(''));
    },
    'incident-lifecycle'(host) {
      make(host, 'The incident loop: every phase has a metric, every incident improves the system',
        'An alert links to its runbook; the incident moves through acknowledge, mitigate and resolve; the postmortem produces tracked actions that improve alerts, runbooks, dashboards and the guide. The time between phases is what section 23 measures.',
        900, 260, 760, g => [
          g.box(20, 40, 110, 56, 'Detect', ['alert / customer']),
          g.box(180, 40, 110, 56, 'Acknowledge', ['on-call owns it']),
          g.box(340, 40, 110, 56, 'Mitigate', ['users OK again']),
          g.box(500, 40, 110, 56, 'Resolve', ['stable, closed']),
          g.box(660, 40, 220, 56, 'Postmortem', ['blameless · tracked actions'], 'key'),
          g.box(240, 170, 420, 56, 'Improve', ['alerts · runbooks · dashboards · playbooks · this guide'], 'key'),
          g.arrow('M130,68 L178,68', 'n', 'MTTA', 154, 60),
          g.arrow('M290,68 L338,68', 'n', 'runbook', 314, 60),
          g.arrow('M450,68 L498,68', 'n', '', 0, 0),
          g.arrow('M610,68 L658,68', 'n', 'SEV1/2', 634, 60),
          g.arrow('M770,96 C770,140 700,198 662,198', 'n', 'actions', 760, 150),
          g.arrow('M240,198 C75,198 75,130 75,98', 'n', 'better detection', 120, 150),
          g.text(75, 28, 'MTTD', 'middle', 'dg-k'), g.text(395, 28, 'time to mitigate', 'middle', 'dg-k'), g.text(555, 28, 'MTTR', 'middle', 'dg-k'),
        ].join(''));
    },
    'dash-hierarchy'(host) {
      make(host, 'Dashboard hierarchy: click down, one question per level',
        'Alerts open L1 with the service already selected. Each level links to the next with variables or data links, so nobody searches through 200 dashboards during an incident.',
        900, 220, 720, g => [
          g.box(10, 62, 165, 76, 'L0 · Overview', ['all services', 'worst first']),
          g.box(245, 62, 165, 76, 'L1 · Service', ['SLO · RED', 'per client · version'], 'key'),
          g.box(480, 62, 165, 76, 'L2 · Component', ['pods · DB · queue', 'external API']),
          g.box(715, 62, 165, 76, 'L3 · Explore', ['traces · logs', 'profiles']),
          g.arrow('M175,100 L243,100', 'n', '$service', 209, 92),
          g.arrow('M410,100 L478,100', 'n', 'data link', 444, 92),
          g.arrow('M645,100 L713,100', 'n', 'trace_id', 679, 92),
          g.arrow('M327,24 L327,60', 'n', 'alert link (dashboard_url)', 335, 40, { anchor: 'start' }),
          g.text(92, 162, 'on-call · leadership', 'middle', 'dg-s'),
          g.text(327, 162, 'on-call · service team', 'middle', 'dg-s'),
          g.text(562, 162, 'service · platform team', 'middle', 'dg-s'),
          g.text(797, 162, 'whoever is debugging', 'middle', 'dg-s'),
          g.text(92, 190, 'Which service?', 'middle', 'dg-l'), g.text(327, 190, 'What, for whom, since when?', 'middle', 'dg-l'),
          g.text(562, 190, 'Which part?', 'middle', 'dg-l'), g.text(797, 190, 'Why exactly?', 'middle', 'dg-l'),
        ].join(''));
    },
  };
  window.ObsDiagrams = D;
})();

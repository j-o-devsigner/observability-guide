/* Charts for the Observability Guide page. Inlined by site/build.py.
   Method: one y-axis per chart, thin marks (2px lines, <=24px bars), hairline solid grid, legend for 2+ series
   plus selective direct labels, text in ink tokens (never series color), status colors only for state and always
   with an icon/word, hover tooltip on every chart, "Show data" table view. All data here is EXAMPLE data. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- deterministic example data ----------
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const range = n => Array.from({ length: n }, (_, i) => i);
  const hhmm = mins => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

  // 12:00 → 18:00 every 5 min; deploy 14:02, rollback 14:14, recovered 14:19
  const T = range(73).map(i => 720 + i * 5);
  const reqs = T.map(t => +(78 + 22 * Math.sin((t - 720) / 360 * Math.PI) + (rnd() - 0.5) * 6).toFixed(1));
  const errs = T.map(t => {
    const base = 0.25 + (rnd() - 0.5) * 0.12;
    if (t >= 845 && t <= 855) return +(base + (t === 845 ? 1.6 : t === 850 ? 2.6 : 2.2)).toFixed(2);
    if (t === 860) return +(base + 0.6).toFixed(2);
    return +base.toFixed(2);
  });

  // ---------- tooltip ----------
  const tip = document.createElement('div');
  tip.className = 'viz-tip'; tip.hidden = true; tip.setAttribute('role', 'status');
  document.body.appendChild(tip);
  function showTip(html, cx, cy) {
    tip.innerHTML = html; tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let x = cx + 14, y = cy + 14;
    if (x + r.width > innerWidth - 8) x = cx - r.width - 14;
    if (y + r.height > innerHeight - 8) y = cy - r.height - 14;
    tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
  }
  const hideTip = () => { tip.hidden = true; };

  // ---------- helpers ----------
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const html = (tag, cls, inner) => { const n = document.createElement(tag); if (cls) n.className = cls; if (inner != null) n.innerHTML = inner; return n; };
  function dataTable(cols, rows) {
    return `<details class="viz-data"><summary>Show data</summary><div class="tw"><table><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
  }
  function card(host, title, sub) {
    host.className = 'viz';
    host.innerHTML = `<div class="viz-head"><div class="viz-title">${esc(title)}</div>${sub ? `<div class="viz-sub">${esc(sub)}</div>` : ''}</div><div class="viz-body"></div><div class="viz-foot"><span class="viz-example">Example data</span></div>`;
    return host.querySelector('.viz-body');
  }
  function legend(items) {
    return `<div class="viz-legend">${items.map(i => `<span><i class="key ${i.kind || 'line'}" style="--c:${i.color}"></i>${esc(i.name)}</span>`).join('')}</div>`;
  }
  function responsive(node, draw) {
    let last = 0;
    const run = () => { const w = Math.round(node.clientWidth); if (w && Math.abs(w - last) > 4) { last = w; draw(w); } };
    if ('ResizeObserver' in window) new ResizeObserver(run).observe(node);
    run();
  }
  const niceMax = v => { const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(s => n <= s)) * p; };

  // ---------- line chart (one y-axis) ----------
  function lineChart(host, cfg) {
    const H = cfg.height || 170;
    const api = { setHover: () => {}, clear: () => {} };
    responsive(host, W => {
      host.innerHTML = '';
      const m = { l: 46, r: cfg.labelRoom ?? 92, t: 10, b: 22 };
      const n = cfg.x.length, iw = W - m.l - m.r, ih = H - m.t - m.b;
      const all = cfg.series.flatMap(s => s.values.filter(v => v != null));
      const yMax = cfg.yMax || niceMax(Math.max(...all) * 1.1);
      const X = i => m.l + (n === 1 ? 0 : i * iw / (n - 1));
      const Y = v => m.t + (1 - v / yMax) * ih;
      const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': cfg.aria || cfg.series.map(s => s.name).join(', ') }, host);
      // bands (alert zones) behind everything
      (cfg.bands || []).forEach(b => {
        el('rect', { x: m.l, width: iw, y: Y(Math.min(b.to, yMax)), height: Y(b.from) - Y(Math.min(b.to, yMax)), fill: 'var(--viz-band)', class: 'band' }, svg);
        const t = el('text', { x: m.l + 6, y: Y(Math.min(b.to, yMax)) + 13, class: 'viz-note' }, svg); t.textContent = b.label;
      });
      // grid + y ticks
      const ticks = cfg.yTicks || 4;
      for (let k = 0; k <= ticks; k++) {
        const v = yMax * k / ticks, y = Y(v);
        el('line', { x1: m.l, x2: m.l + iw, y1: y, y2: y, class: k === 0 ? 'viz-axis' : 'viz-grid' }, svg);
        const t = el('text', { x: m.l - 6, y: y + 4, 'text-anchor': 'end', class: 'viz-tick' }, svg); t.textContent = cfg.yFmt(v, true);
      }
      // x labels
      const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 70))));
      for (let i = 0; i < n; i += every) { const t = el('text', { x: X(i), y: H - 6, 'text-anchor': 'middle', class: 'viz-tick' }, svg); t.textContent = cfg.x[i]; }
      // reference lines
      (cfg.refs || []).forEach(r => {
        el('line', { x1: m.l, x2: m.l + iw, y1: Y(r.y), y2: Y(r.y), class: 'viz-ref' }, svg);
        const t = r.inside
          ? el('text', { x: m.l + 6, y: Y(r.y) - 5, class: 'viz-note' }, svg)
          : el('text', { x: m.l + iw + 6, y: Y(r.y) + 4, class: 'viz-note' }, svg);
        t.textContent = r.label;
      });
      // markers (deploy, rollback)
      (cfg.markers || []).forEach(mk => {
        el('line', { x1: X(mk.i), x2: X(mk.i), y1: m.t, y2: m.t + ih, class: 'viz-marker' }, svg);
        const left = mk.anchor === 'end';
        const t = el('text', { x: X(mk.i) + (left ? -4 : 4), y: m.t + 10, 'text-anchor': left ? 'end' : 'start', class: 'viz-note' }, svg); t.textContent = mk.label;
      });
      // series
      cfg.series.forEach(s => {
        let d = '', a = '', pen = false, first = -1, lastI = -1;
        s.values.forEach((v, i) => {
          if (v == null) { if (pen && s.area) a += `L${X(lastI)},${Y(0)}Z`; pen = false; return; }
          if (!pen) { d += `M${X(i)},${Y(v)}`; if (s.area) a += `M${X(i)},${Y(0)}L${X(i)},${Y(v)}`; first = first < 0 ? i : first; }
          else { d += `L${X(i)},${Y(v)}`; if (s.area) a += `L${X(i)},${Y(v)}`; }
          pen = true; lastI = i;
        });
        if (pen && s.area) a += `L${X(lastI)},${Y(0)}Z`;
        if (s.area) el('path', { d: a, fill: s.color, 'fill-opacity': 0.1, stroke: 'none' }, svg);
        el('path', { d, fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'stroke-dasharray': s.dash ? '6 4' : 'none' }, svg);
        if (lastI >= 0 && cfg.endDots !== false) {
          el('circle', { cx: X(lastI), cy: Y(s.values[lastI]), r: 4, fill: s.color, stroke: 'var(--viz-surface)', 'stroke-width': 2 }, svg);
          if (cfg.labelRoom !== 0 && s.label !== false) {
            const t = el('text', { x: X(lastI) + 8, y: Y(s.values[lastI]) + (s.dy || 4), class: 'viz-label' }, svg);
            t.textContent = s.endLabel || (cfg.series.length === 1 ? cfg.yFmt(s.values[lastI]) : `${s.name} ${cfg.yFmt(s.values[lastI])}`);
          }
        }
      });
      // hover layer
      const cross = el('g', { class: 'viz-cross', visibility: 'hidden' }, svg);
      const vline = el('line', { y1: m.t, y2: m.t + ih }, cross);
      const dots = cfg.series.map(s => el('circle', { r: 4, fill: s.color, stroke: 'var(--viz-surface)', 'stroke-width': 2 }, cross));
      const hit = el('rect', { x: m.l, y: m.t, width: iw, height: ih, fill: 'transparent' }, svg);
      const setHover = (i, cx, cy, withTip) => {
        if (i == null) { cross.setAttribute('visibility', 'hidden'); return; }
        cross.setAttribute('visibility', 'visible');
        vline.setAttribute('x1', X(i)); vline.setAttribute('x2', X(i));
        cfg.series.forEach((s, k) => { const v = s.values[i]; dots[k].setAttribute('visibility', v == null ? 'hidden' : 'visible'); if (v != null) { dots[k].setAttribute('cx', X(i)); dots[k].setAttribute('cy', Y(v)); } });
        if (withTip) showTip(`<b>${esc(cfg.x[i])}</b>` + cfg.series.map(s => `<div><i class="key line" style="--c:${s.color}"></i>${esc(s.name)} <b>${s.values[i] == null ? '–' : esc(cfg.yFmt(s.values[i]))}</b></div>`).join(''), cx, cy);
      };
      api.setHover = setHover;
      const idx = e => { const r = svg.getBoundingClientRect(); return Math.max(0, Math.min(n - 1, Math.round((e.clientX - r.left - m.l) / iw * (n - 1)))); };
      hit.addEventListener('pointermove', e => { const i = idx(e); setHover(i, e.clientX, e.clientY, true); cfg.onHover && cfg.onHover(i); });
      hit.addEventListener('pointerleave', () => { setHover(null); hideTip(); cfg.onHover && cfg.onHover(null); });
    });
    return api;
  }

  // ---------- stat tiles ----------
  function sparkline(values) {
    const w = 120, h = 30, mx = Math.max(...values), mn = Math.min(...values), n = values.length;
    const X = i => i * (w - 6) / (n - 1) + 1, Y = v => h - 4 - (v - mn) / (mx - mn || 1) * (h - 8);
    const d = values.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
    return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="var(--viz-deemph)" stroke-width="1.5" stroke-linejoin="round"/><circle cx="${X(n - 1)}" cy="${Y(values[n - 1])}" r="3.5" fill="var(--viz-s1)" stroke="var(--viz-surface)" stroke-width="1.5"/></svg>`;
  }
  function tiles(host, title, sub, items) {
    const body = card(host, title, sub);
    body.innerHTML = `<div class="tiles"${items.length === 6 ? ' style="grid-template-columns:repeat(auto-fit,minmax(230px,1fr))"' : ''}>${items.map(t => `<div class="tile">
      <div class="tile-label">${esc(t.label)}</div>
      <div class="tile-value">${esc(t.value)}${t.unit ? `<span class="tile-unit">${esc(t.unit)}</span>` : ''}</div>
      ${t.meter != null ? `<div class="meter" role="img" aria-label="${esc(t.label)} ${t.meter}%"><span style="width:${t.meter}%;background:var(--viz-${t.meterStatus || 's1'})"></span></div>` : ''}
      ${t.delta ? `<div class="tile-delta ${t.good ? 'up-good' : 'down-bad'}" title="${t.good ? 'Better' : 'Worse'}">${t.dir === 'down' ? '▼' : '▲'} ${esc(t.delta)} <span class="sr">(${t.good ? 'better' : 'worse'})</span></div>` : ''}
      ${t.note ? `<div class="tile-note">${esc(t.note)}</div>` : ''}
      ${t.spark ? sparkline(t.spark) : ''}</div>`).join('')}</div>` +
      dataTable(['Tile', 'Value', 'Comparison'], items.map(t => [t.label, t.value + (t.unit || ''), t.delta || t.note || '']));
    body.querySelectorAll('.tile').forEach((d, k) => {
      const t = items[k]; if (!t.spark) return;
      d.addEventListener('pointermove', e => showTip(`<b>${esc(t.label)}</b><div>Last ${t.spark.length} periods: ${t.spark.map(v => esc(v)).join(' · ')}</div>`, e.clientX, e.clientY));
      d.addEventListener('pointerleave', hideTip);
    });
  }

  // ---------- charts ----------
  const pct = (v, tick) => (tick ? +v.toFixed(2) : v.toFixed(2)) + '%';
  const C = {
    'kpi-tiles'(host) {
      tiles(host, 'checkout · SLO status', 'Top row of the service dashboard', [
        { label: 'Availability (28d)', value: '99.94', unit: '%', delta: '+0.02 pts vs previous 28d', good: true, spark: [99.91, 99.92, 99.9, 99.93, 99.92, 99.94, 99.93, 99.95, 99.94, 99.93, 99.94, 99.94] },
        { label: 'Error budget left', value: '61', unit: '%', meter: 61, meterStatus: 's1', note: 'SLO 99.9% · resets on a rolling 28d window' },
        { label: 'Burn rate (1h)', value: '0.8', unit: '×', note: '1× = spending exactly the budget; page at 14.4×', spark: [0.6, 0.7, 0.9, 1.1, 0.8, 0.7, 0.6, 0.9, 1.0, 0.8, 0.7, 0.8] },
        { label: 'Requests', value: '84', unit: ' req/s', delta: '+6% vs same hour last week', good: true, spark: [61, 66, 72, 79, 84, 88, 90, 87, 85, 82, 83, 84] },
      ]);
    },
    'dora-tiles'(host) {
      tiles(host, 'payments team · DORA metrics', 'Last 30 days vs previous 30 days', [
        { label: 'Deployment frequency', value: '23', unit: ' / week', delta: '+4 vs previous', good: true, spark: [14, 15, 17, 16, 18, 19, 21, 20, 22, 21, 23, 23] },
        { label: 'Change lead time (median)', value: '1.8', unit: ' days', delta: '−0.6 days', good: true, dir: 'down', spark: [3.1, 2.9, 2.8, 2.6, 2.7, 2.4, 2.4, 2.2, 2.1, 2.0, 1.9, 1.8] },
        { label: 'Change failure rate', value: '8.7', unit: '%', delta: '−2.1 pts', good: true, dir: 'down', spark: [12, 11.5, 12.4, 11, 10.8, 10.9, 10.2, 9.8, 9.5, 9.1, 8.9, 8.7] },
        { label: 'Failed deployment recovery', value: '14', unit: ' min', delta: '−26 min', good: true, dir: 'down', spark: [52, 48, 45, 41, 40, 33, 30, 26, 22, 19, 16, 14] },
        { label: 'Deployment rework rate', value: '4', unit: '%', delta: '+1 pt', good: false, spark: [3, 3, 2, 3, 3, 4, 3, 3, 4, 3, 3, 4] },
      ]);
    },
    'case-results'(host) {
      tiles(host, 'Case study · results after one quarter', 'Before → after the transition', [
        { label: 'Pages per week', value: '1', delta: 'from ~9', good: true, dir: 'down' },
        { label: 'Pages acted on', value: '90', unit: '%', delta: 'from 12%', good: true },
        { label: 'Time to detect (median)', value: '4', unit: ' min', delta: 'from 40 min (client reported)', good: true, dir: 'down' },
        { label: 'Alert rules', value: '9', delta: 'from 38', good: true, dir: 'down' },
      ]);
    },
    'red-stack'(host) {
      const body = card(host, 'checkout · requests and error %', 'Two charts, one time axis, one shared crosshair');
      body.innerHTML = '<div class="viz-mini">Requests (req/s)</div><div class="c1"></div><div class="viz-mini">Error ratio (%)</div><div class="c2"></div>' +
        dataTable(['Time', 'req/s', 'error %'], T.map((t, i) => [hhmm(t), reqs[i], errs[i] + '%']).filter((_, i) => i % 3 === 0));
      const x = T.map(hhmm), markers = [{ i: 24.4, label: 'deploy 1.42.0', anchor: 'end' }, { i: 26.8, label: 'rollback' }];
      let a, b;
      a = lineChart(body.querySelector('.c1'), { x, height: 140, series: [{ name: 'req/s', color: 'var(--viz-s1)', values: reqs, area: true }], yFmt: (v, t) => t ? Math.round(v) : v.toFixed(0) + ' req/s', markers, onHover: i => b && b.setHover(i) });
      b = lineChart(body.querySelector('.c2'), { x, height: 150, series: [{ name: 'error %', color: 'var(--viz-s1)', values: errs }], yMax: 3, yFmt: pct, markers, bands: [{ from: 1.44, to: 3, label: 'fast-burn zone (> 1.44%)' }], onHover: i => a && a.setHover(i) });
    },
    'version-split'(host) {
      const body = card(host, 'checkout · error % by version', 'Rolling update 14:02, rollback 14:14');
      const mins = range(41).map(i => 830 + i);
      const v1 = mins.map(() => +(0.2 + (rnd() - 0.5) * 0.08).toFixed(2));
      const v2 = mins.map(t => t < 842 || t > 855 ? null : +(Math.min(4.1, 0.8 + (t - 842) * 0.6) + (rnd() - 0.5) * 0.2).toFixed(2));
      body.innerHTML = legend([{ name: '1.41.3 (previous)', color: 'var(--viz-s1)' }, { name: '1.42.0 (new)', color: 'var(--viz-s2)' }]) + '<div class="c"></div>' +
        dataTable(['Time', '1.41.3', '1.42.0'], mins.map((t, i) => [hhmm(t), v1[i] + '%', v2[i] == null ? '–' : v2[i] + '%']).filter((_, i) => i % 2 === 0));
      lineChart(body.querySelector('.c'), { x: mins.map(hhmm), height: 190, yMax: 5, yFmt: pct, labelRoom: 104,
        series: [{ name: '1.41.3', color: 'var(--viz-s1)', values: v1 }, { name: '1.42.0', color: 'var(--viz-s2)', values: v2, dy: -4 }],
        markers: [{ i: 12, label: 'deploy', anchor: 'end' }, { i: 24, label: 'rollback' }] });
    },
    'budget-burndown'(host) {
      const body = card(host, 'Fabrikam · error budget remaining (SLO 99.95%, 28 days)', 'Actual vs even burn');
      const days = range(29);
      const actual = days.map(d => d < 17 ? +(100 - d * 1.75 - (rnd() * 0.6)).toFixed(1) : +(100 - d * 1.75 - 11 - rnd() * 0.6).toFixed(1));
      const even = days.map(d => +(100 - d * 100 / 28).toFixed(1));
      body.innerHTML = legend([{ name: 'Actual', color: 'var(--viz-s1)' }, { name: 'Even burn (budget lasts exactly 28d)', color: 'var(--viz-deemph)' }]) + '<div class="c"></div>' +
        dataTable(['Day', 'Actual', 'Even burn'], days.map(d => ['Day ' + d, actual[d] + '%', even[d] + '%']).filter((_, i) => i % 2 === 0));
      lineChart(body.querySelector('.c'), { x: days.map(d => 'day ' + d), height: 200, yMax: 100, yFmt: (v, t) => Math.round(v) + '%', labelRoom: 110,
        series: [{ name: 'Even burn', color: 'var(--viz-deemph)', values: even, endLabel: 'even burn 0%' }, { name: 'Actual', color: 'var(--viz-s1)', values: actual, endLabel: `actual ${actual[28]}%` }],
        refs: [{ y: 50, label: 'notify team (50%)' }],
        markers: [{ i: 17, label: 'incident −11%' }] });
    },
    'latency-heatmap'(host) {
      const body = card(host, 'checkout · latency distribution', 'Requests per latency bucket, 10-min columns');
      const cols = range(36).map(i => 720 + i * 10), rows = ['≤ 50 ms', '100 ms', '250 ms', '500 ms', '1.2 s', '2.5 s'];
      const grid = cols.map(t => rows.map((_, r) => {
        let v = [120, 900, 620, 90, 12, 3][r] * (0.85 + rnd() * 0.3);
        if (t >= 840 && t <= 870 && r === 4) v = 380 + rnd() * 120;
        return Math.round(v);
      }));
      const max = Math.max(...grid.flat());
      body.innerHTML = '<div class="c"></div><div class="viz-scale"><span>fewer</span><i></i><span>more requests</span></div>' +
        dataTable(['Time', ...rows], cols.map((t, i) => [hhmm(t), ...grid[i]]).filter((_, i) => i % 3 === 0));
      responsive(body.querySelector('.c'), W => {
        const host2 = body.querySelector('.c'); host2.innerHTML = '';
        const m = { l: 62, r: 8, t: 6, b: 22 }, H = 200, cw = (W - m.l - m.r) / cols.length, ch = (H - m.t - m.b) / rows.length;
        const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Latency heatmap' }, host2);
        rows.forEach((r, k) => { const t = el('text', { x: m.l - 6, y: m.t + (rows.length - 1 - k) * ch + ch / 2 + 4, 'text-anchor': 'end', class: 'viz-tick' }, svg); t.textContent = r; });
        cols.forEach((c, i) => {
          if (i % Math.ceil(cols.length / Math.max(2, Math.floor((W - m.l) / 70))) === 0) { const t = el('text', { x: m.l + i * cw + cw / 2, y: H - 6, 'text-anchor': 'middle', class: 'viz-tick' }, svg); t.textContent = hhmm(c); }
          rows.forEach((r, k) => {
            const v = grid[i][k];
            const rect = el('rect', { x: m.l + i * cw + 1, y: m.t + (rows.length - 1 - k) * ch + 1, width: Math.max(1, cw - 2), height: ch - 2, rx: 2, fill: 'var(--viz-s1)', 'fill-opacity': (0.06 + 0.94 * Math.sqrt(v / max)).toFixed(3) }, svg);
            rect.addEventListener('pointermove', e => showTip(`<b>${hhmm(c)}–${hhmm(c + 10)}</b><div>${esc(r)}: <b>${v.toLocaleString()}</b> requests</div>`, e.clientX, e.clientY));
            rect.addEventListener('pointerleave', hideTip);
          });
        });
      });
    },
    'client-meters'(host) {
      const body = card(host, 'checkout · error budget left per client', 'Sorted by the worst; status from the error budget policy');
      const rows = [['Fabrikam', 11, 'critical', '✕', 'below 25%'], ['Contoso', 48, 'warn', '!', '25–50%'], ['Northwind', 72, 'good', '✓', 'above 50%']];
      body.innerHTML = `<div class="meters">${rows.map(r => `<div class="mrow" tabindex="0" data-tip="${esc(r[0])}: ${r[1]}% of budget left (${esc(r[4])})">
        <span class="mname">${esc(r[0])}</span><span class="mbar"><span style="width:${r[1]}%;background:var(--viz-${r[2]})"></span></span>
        <span class="mval">${r[1]}%</span><span class="status s-${r[2]}"><b>${r[3]}</b>${r[2] === 'good' ? 'healthy' : r[2] === 'warn' ? 'watch' : 'act now'}</span></div>`).join('')}</div>` +
        dataTable(['Client', 'Budget left', 'Status'], rows.map(r => [r[0], r[1] + '%', r[4]]));
      body.querySelectorAll('.mrow').forEach(n => { n.addEventListener('pointermove', e => showTip(esc(n.dataset.tip), e.clientX, e.clientY)); n.addEventListener('pointerleave', hideTip); });
    },
    'traffic-share'(host) {
      const body = card(host, 'checkout · traffic share by client', 'One whole, three parts');
      const parts = [['Northwind', 70, 's1'], ['Contoso', 25, 's2'], ['Fabrikam', 5, 's3']];
      body.innerHTML = `<div class="segbar" role="img" aria-label="${parts.map(p => `${p[0]} ${p[1]}%`).join(', ')}">${parts.map(p => `<span style="flex:${p[1]};background:var(--viz-${p[2]})" data-tip="${p[0]}: ${p[1]}% of requests">${p[1] >= 10 ? p[1] + '%' : ''}</span>`).join('')}</div>` +
        legend(parts.map(p => ({ name: p[0], color: `var(--viz-${p[2]})`, kind: 'sq' }))) +
        `<p class="viz-sub" style="margin-top:6px">Fabrikam is too narrow for a label: hover it, or open the data. It is also the client that broke in the case study.</p>` +
        dataTable(['Client', 'Share of requests'], parts.map(p => [p[0], p[1] + '%']));
      body.querySelectorAll('.segbar span').forEach(n => { n.addEventListener('pointermove', e => showTip(esc(n.dataset.tip), e.clientX, e.clientY)); n.addEventListener('pointerleave', hideTip); });
    },
    'state-timeline'(host) {
      const body = card(host, 'Alert states, 13:30 → 15:00', 'Pending = condition true, waiting for the alert window; firing = problem open');
      const start = 810, end = 900;
      const rows = [
        ['Release regression · checkout', [[810, 847, 'ok'], [847, 849, 'pending'], [849, 856, 'firing'], [856, 900, 'ok']]],
        ['Client error ratio · Fabrikam', [[810, 846, 'ok'], [846, 851, 'pending'], [851, 859, 'firing'], [859, 900, 'ok']]],
        ['SLO burn rate · checkout', [[810, 900, 'ok']]],
      ];
      const label = { ok: 'OK', pending: 'Pending', firing: 'Firing' }, icon = { ok: '✓', pending: '…', firing: '!' };
      body.innerHTML = legend([{ name: 'OK', color: 'var(--viz-track)', kind: 'sq' }, { name: 'Pending', color: 'var(--viz-warn)', kind: 'sq' }, { name: 'Firing', color: 'var(--viz-critical)', kind: 'sq' }]) +
        `<div class="stl">${rows.map(([name, segs]) => `<div class="stl-row"><span class="stl-name">${esc(name)}</span><span class="stl-track">${segs.map(s => {
          const w = (s[1] - s[0]) / (end - start) * 100;
          return `<span class="stl-seg st-${s[2]}" style="width:${w}%" data-tip="${esc(name)}: ${label[s[2]]} ${hhmm(s[0])}–${hhmm(s[1])}">${w > 9 && s[2] !== 'ok' ? `${icon[s[2]]} ${label[s[2]]}` : ''}</span>`;
        }).join('')}</span></div>`).join('')}<div class="stl-row"><span></span><span class="stl-axis"><span>13:30</span><span>14:00</span><span>14:30</span><span>15:00</span></span></div></div>
        <p class="viz-sub" style="margin-top:6px">The burn-rate page never fired: Fabrikam is 5% of traffic, so the total stayed under 1.44%. The per-client alert caught it.</p>` +
        dataTable(['Alert', 'State', 'From', 'To'], rows.flatMap(([n, segs]) => segs.map(s => [n, label[s[2]], hhmm(s[0]), hhmm(s[1])])));
      body.querySelectorAll('.stl-seg').forEach(n => { n.addEventListener('pointermove', e => showTip(esc(n.dataset.tip), e.clientX, e.clientY)); n.addEventListener('pointerleave', hideTip); });
    },
    'maturity-dumbbell'(host) {
      const body = card(host, 'Maturity score per dimension, before → after one quarter', 'Case study team; levels 0 Blind → 4 Proactive');
      const rows = [['Instrumentation', 2, 3], ['Context', 1, 3], ['Alerting', 1, 3], ['Dashboards', 1, 3], ['Delivery', 0, 2], ['Ownership', 1, 2], ['Process', 1, 2], ['Culture', 1, 2]];
      body.innerHTML = legend([{ name: 'Before', color: 'var(--viz-s1-light)', kind: 'dot' }, { name: 'After', color: 'var(--viz-s1)', kind: 'dot' }]) + '<div class="c"></div>' +
        dataTable(['Dimension', 'Before', 'After'], rows.map(r => [r[0], r[1], r[2]]));
      responsive(body.querySelector('.c'), W => {
        const h2 = body.querySelector('.c'); h2.innerHTML = '';
        const m = { l: 112, r: 16, t: 8, b: 24 }, rh = 26, H = m.t + m.b + rows.length * rh, iw = W - m.l - m.r, X = v => m.l + v / 4 * iw;
        const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Maturity before and after' }, h2);
        [0, 1, 2, 3, 4].forEach(v => { el('line', { x1: X(v), x2: X(v), y1: m.t, y2: H - m.b, class: v ? 'viz-grid' : 'viz-axis' }, svg); const t = el('text', { x: X(v), y: H - 6, 'text-anchor': 'middle', class: 'viz-tick' }, svg); t.textContent = v; });
        rows.forEach((r, k) => {
          const y = m.t + k * rh + rh / 2;
          const t = el('text', { x: m.l - 10, y: y + 4, 'text-anchor': 'end', class: 'viz-label' }, svg); t.textContent = r[0];
          el('line', { x1: X(r[1]), x2: X(r[2]), y1: y, y2: y, stroke: 'var(--viz-deemph)', 'stroke-width': 2 }, svg);
          el('circle', { cx: X(r[1]), cy: y, r: 5, fill: 'var(--viz-s1-light)', stroke: 'var(--viz-surface)', 'stroke-width': 2 }, svg);
          el('circle', { cx: X(r[2]), cy: y, r: 5, fill: 'var(--viz-s1)', stroke: 'var(--viz-surface)', 'stroke-width': 2 }, svg);
          const hit = el('rect', { x: m.l, y: y - rh / 2, width: iw, height: rh, fill: 'transparent' }, svg);
          hit.addEventListener('pointermove', e => showTip(`<b>${esc(r[0])}</b><div>Before ${r[1]} → after ${r[2]}</div>`, e.clientX, e.clientY));
          hit.addEventListener('pointerleave', hideTip);
        });
      });
    },
    'incident-timeline'(host) {
      const body = card(host, 'Incident timeline · 14:00 → 14:30', 'Detect 4 min after first errors · restore 14 min');
      const ev = [[842, 'deploy', 'Deploy 1.42.0'], [845, 'impact', 'First Fabrikam errors'], [849, 'alert', 'Release regression alert'], [851, 'alert', 'Fabrikam error-ratio alert'], [854, 'action', 'Rollback'], [859, 'ok', 'Recovered']];
      const s = 840, e = 870, P = t => (t - s) / (e - s) * 100;
      body.innerHTML = `<div class="itl"><div class="itl-track"><span class="itl-impact" style="left:${P(845)}%;width:${P(859) - P(845)}%" data-tip="Impact window 14:05–14:19 (14 min)"></span>${ev.map(x => `<span class="itl-ev ev-${x[1]}" style="left:${P(x[0])}%" data-tip="${hhmm(x[0])} · ${esc(x[2])}"></span>`).join('')}</div>
        <div class="itl-axis">${[840, 845, 850, 855, 860, 865, 870].map(t => `<span style="left:${P(t)}%">${hhmm(t)}</span>`).join('')}</div>
        <ol class="itl-list">${ev.map(x => `<li><i class="ev-${x[1]}"></i><b>${hhmm(x[0])}</b> ${esc(x[2])}</li>`).join('')}</ol></div>` +
        dataTable(['Time', 'Event'], ev.map(x => [hhmm(x[0]), x[2]]));
      body.querySelectorAll('[data-tip]').forEach(n => { n.addEventListener('pointermove', ev2 => showTip(esc(n.dataset.tip), ev2.clientX, ev2.clientY)); n.addEventListener('pointerleave', hideTip); });
    },
    'capacity-forecast'(host) {
      const body = card(host, 'checkout · weekly peak demand vs capacity', 'Actual 13 weeks, forecast 13 weeks; capacity from the last load test');
      const wk = range(27), actual = [], fc = [];
      wk.forEach(w => {
        const v = Math.round(830 + w * 17 + (w <= 13 ? (rnd() - 0.5) * 50 : 0));
        actual.push(w <= 13 ? v : null); fc.push(w >= 13 ? v : null);
      });
      actual[13] = fc[13];
      const cross = wk.find(w => fc[w] != null && fc[w] >= 1200);
      body.innerHTML = legend([{ name: 'Actual peak', color: 'var(--viz-s1)' }, { name: 'Forecast', color: 'var(--viz-s1)', kind: 'dash' }]) + '<div class="c"></div>' +
        dataTable(['Week', 'Actual peak req/s', 'Forecast req/s'], wk.map(w => ['W' + (w - 13 >= 0 ? '+' : '') + (w - 13), actual[w] ?? '–', fc[w] ?? '–']));
      lineChart(body.querySelector('.c'), { x: wk.map(w => w === 13 ? 'now' : (w < 13 ? `−${13 - w}w` : `+${w - 13}w`)), height: 210, yMax: 1600, yTicks: 4,
        yFmt: (v, t) => t ? Math.round(v) : Math.round(v) + ' req/s', labelRoom: 150,
        series: [{ name: 'Actual peak', color: 'var(--viz-s1)', values: actual, label: false }, { name: 'Forecast', color: 'var(--viz-s1)', values: fc, dash: true, endLabel: `forecast ${fc[26]} req/s` }],
        refs: [{ y: 1400, label: 'tested capacity: 14 pods × 100 req/s', inside: true }, { y: 1200, label: 'N+2 limit: 12 pods (2 may be down)', inside: true }],
        markers: [{ i: 13, label: 'now', anchor: 'end' }, { i: cross, label: `crosses N+2 in ${cross - 13} weeks` }] });
    },
    'capacity-tiles'(host) {
      tiles(host, 'checkout · capacity review', 'Monthly, tier-1 services', [
        { label: 'Peak (30 days)', value: '1,050', unit: ' req/s', delta: '+6% vs previous month', good: false, spark: [880, 900, 910, 930, 950, 960, 980, 990, 1000, 1020, 1040, 1050] },
        { label: 'Tested capacity', value: '1,400', unit: ' req/s', note: '14 pods × 100 req/s within the SLO (load test, 2 weeks ago)' },
        { label: 'Headroom left to the N+2 limit', value: '13', unit: '%', meter: 13, meterStatus: 'warn', note: 'N+2 limit = 12 pods = 1,200 req/s' },
        { label: 'Forecast to cross N+2', value: '9', unit: ' weeks', note: 'Action: new load test + node pool in 6 weeks' },
      ]);
    },
    'queue-flow'(host) {
      const body = card(host, 'orders queue · arrival vs processing, and the backlog', 'Consumers capped at 5 (500 msg/s); a traffic burst from minute 15 to 35');
      body.innerHTML = legend([{ name: 'Arrival rate', color: 'var(--viz-s1)' }, { name: 'Processing rate', color: 'var(--viz-s2)' }]) +
        '<div class="viz-mini">Messages per second</div><div class="c1"></div><div class="viz-mini">Backlog (messages) · wait ≈ backlog ÷ processing rate</div><div class="c2"></div>';
      const mins = range(61); let backlog = 0; const arr = [], proc = [], back = [];
      mins.forEach(m => {
        const a = Math.round((m >= 15 && m <= 35 ? 680 : 400) + (rnd() - 0.5) * 30);
        const p = Math.min(500, a + backlog / 60);
        backlog = Math.max(0, backlog + (a - p) * 60);
        arr.push(a); proc.push(Math.round(p)); back.push(Math.round(backlog));
      });
      body.insertAdjacentHTML('beforeend', dataTable(['Minute', 'Arrival msg/s', 'Processing msg/s', 'Backlog', 'Wait (s)'],
        mins.filter(m => m % 3 === 0).map(m => [m, arr[m], proc[m], back[m], Math.round(back[m] / Math.max(proc[m], 1))])));
      const x = mins.map(m => `${m} min`), markers = [{ i: 15, label: 'burst', anchor: 'end' }, { i: 35, label: 'burst ends' }];
      let a, b;
      a = lineChart(body.querySelector('.c1'), { x, height: 150, yMax: 800, labelRoom: 120, markers,
        yFmt: (v, t) => t ? Math.round(v) : Math.round(v) + ' msg/s',
        series: [{ name: 'Arrival', color: 'var(--viz-s1)', values: arr, dy: 16 }, { name: 'Processing', color: 'var(--viz-s2)', values: proc, dy: -6 }],
        onHover: i => b && b.setHover(i) });
      b = lineChart(body.querySelector('.c2'), { x, height: 140, labelRoom: 120, markers, yMax: 250000, yTicks: 5,
        yFmt: (v, t) => t ? (v >= 1000 ? Math.round(v / 1000) + 'k' : Math.round(v)) : Math.round(v).toLocaleString() + ' msgs',
        series: [{ name: 'Backlog', color: 'var(--viz-s1)', values: back, area: true }],
        onHover: i => a && a.setHover(i) });
    },
    'severity-matrix'(host) {
      const body = card(host, 'Incident severity = service tier × user impact', 'Starting point; when unsure, pick the higher level');
      const cols = ['Most users down, data loss or security', 'Many users, or one SLA client', 'Some users, workaround exists', 'No user impact yet'];
      const rows = [['Tier 1', [1, 2, 3, 4]], ['Tier 2', [2, 3, 3, 4]], ['Tier 3', [3, 3, 4, 4]]];
      const cls = { 1: 'sev1', 2: 'sev2', 3: 'sev3', 4: 'sev4' }, name = { 1: 'Critical', 2: 'Major', 3: 'Minor', 4: 'Low' };
      body.innerHTML = `<div class="tw sevm"><table><thead><tr><th>Service tier</th>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(([t, v]) =>
        `<tr><th scope="row">${t}</th>${v.map((n, i) => `<td class="${cls[n]}" title="${t} · ${esc(cols[i])} → SEV${n}"><b>SEV${n}</b><span>${name[n]}</span></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    },
    'effectiveness-tiles'(host) {
      tiles(host, 'Observability effectiveness · this quarter', 'Same definitions every quarter; compare with the previous one', [
        { label: 'Incidents detected by monitoring', value: '86', unit: '%', delta: 'from 41%', good: true, spark: [41, 45, 52, 58, 63, 70, 74, 79, 82, 84, 85, 86] },
        { label: 'Time to detect (median)', value: '4', unit: ' min', delta: 'from 38 min', good: true, dir: 'down', spark: [38, 35, 31, 26, 20, 15, 12, 9, 7, 6, 5, 4] },
        { label: 'Pages acted on (precision)', value: '89', unit: '%', delta: 'from 14%', good: true, spark: [14, 18, 25, 36, 48, 59, 67, 74, 80, 84, 87, 89] },
        { label: 'Pages per on-call shift', value: '0.6', delta: 'from 4.1', good: true, dir: 'down', spark: [4.1, 3.8, 3.2, 2.7, 2.1, 1.6, 1.3, 1.0, 0.9, 0.8, 0.7, 0.6] },
        { label: 'Tier-1 services meeting DoD', value: '92', unit: '%', meter: 92, meterStatus: 'good', note: '11 of 12 tier-1 services' },
        { label: 'Toil', value: '31', unit: '%', delta: 'from 55%', good: true, dir: 'down', spark: [55, 54, 50, 48, 45, 42, 40, 37, 35, 33, 32, 31] },
      ]);
    },
    'detection-trend'(host) {
      const body = card(host, 'Who finds problems first, and how fast', 'Quarterly; example of an observability program that works');
      const q = ['Q1 25', 'Q2 25', 'Q3 25', 'Q4 25', 'Q1 26', 'Q2 26', 'Q3 26', 'Q4 26'];
      const mon = [41, 48, 55, 63, 71, 78, 83, 86], mttd = [38, 31, 24, 17, 11, 8, 5, 4];
      body.innerHTML = '<div class="viz-mini">Incidents detected by monitoring (%)</div><div class="c1"></div><div class="viz-mini">Median time to detect (minutes)</div><div class="c2"></div>' +
        dataTable(['Quarter', '% detected by monitoring', 'Median MTTD (min)'], q.map((x, i) => [x, mon[i] + '%', mttd[i]]));
      let a, b;
      a = lineChart(body.querySelector('.c1'), { x: q, height: 140, yMax: 100, labelRoom: 70, yFmt: (v, t) => Math.round(v) + '%',
        series: [{ name: 'detected by monitoring', color: 'var(--viz-s1)', values: mon }], refs: [{ y: 80, label: 'target 80%', inside: true }],
        onHover: i => b && b.setHover(i) });
      b = lineChart(body.querySelector('.c2'), { x: q, height: 130, yMax: 40, labelRoom: 70, yFmt: (v, t) => t ? Math.round(v) : Math.round(v) + ' min',
        series: [{ name: 'MTTD', color: 'var(--viz-s1)', values: mttd, area: true }], onHover: i => a && a.setHover(i) });
    },
    'layers'(host) {
      host.className = 'viz layers';
      const L = [['Business', 'Is the business doing well?', 'Custom KPIs', 'orders/min · revenue · price vs goal'],
                 ['User experience', 'Can users actually use it?', 'Synthetic + RUM', 'external checks · journey success'],
                 ['Service', 'Is my endpoint healthy?', 'RED · Golden Signals', 'req/s · error % · p99 · saturation'],
                 ['Resources', 'Is something underneath saturated?', 'USE', 'throttling · memory vs limit · queues']];
      host.innerHTML = `<div class="lay-grid"><div class="lay-axis"><span>symptoms<br>alert here</span><span>causes<br>diagnose here</span></div><div class="lay-stack">${L.map(l => `<div class="lay"><b>${l[0]}</b><span class="lay-q">${l[1]}</span><span class="lay-m">${l[2]}</span><span class="lay-ex">${l[3]}</span></div>`).join('')}</div>
        <div class="lay-delivery"><b>Delivery</b><span>DORA + release markers</span><span class="lay-ex">"What changed?" crosses every layer</span></div></div>`;
    },
  };

  window.ObsCharts = { render(node) { const f = C[node.dataset.chart] || (window.ObsDiagrams && window.ObsDiagrams[node.dataset.chart]); if (f) f(node); else node.textContent = 'Unknown chart: ' + node.dataset.chart; } };
})();

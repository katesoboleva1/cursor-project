/** Shared helpers for building page templates */

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(n) {
  if (n == null || n === '') return '—';
  const x = Number(n);
  return Number.isNaN(x) ? esc(n) : x.toLocaleString('en-US');
}

function fmtM(p) {
  const x = Number(p);
  if (!x || Number.isNaN(x)) return '—';
  return x >= 1e6 ? `${(x / 1e6).toFixed(2)}M` : x >= 1000 ? `${Math.round(x / 1000)}k` : fmt(x);
}

function fmtPrice(p, purpose) {
  const x = Number(p);
  if (!x) return '—';
  if (String(purpose).includes('rent')) return `${fmt(x)} AED/yr`;
  return `${fmtM(x)} AED`;
}

function groupByFloor(listings) {
  const map = new Map();
  for (const r of listings || []) {
    const f = r.floor == null || r.floor === '' ? null : Number(r.floor);
    const key = Number.isFinite(f) ? f : -1;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([floor, rows]) => ({
      floor: floor < 0 ? null : floor,
      id: floor < 0 ? 'na' : String(floor),
      label: floor < 0 ? 'n/a' : String(floor),
      rows: rows.slice(0, 20).sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)),
    }));
}

function sparkPolyline(series, opts = {}) {
  const vals = (series || []).map((p) => Number(p.med_pps) || 0);
  const months = (series || []).map((p) => p.m);
  if (!vals.length) {
    return { poly: '', first: null, last: null, deltaPct: null, median: null, vsMedPct: null, svgExtra: '', chartSvg: '' };
  }
  const W = opts.W || 340;
  const H = opts.H || 130;
  const pad = { l: 2, r: 36, t: 22, b: 10 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const sorted = vals.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const dist = Math.max(Math.max(...vals) - median, median - Math.min(...vals), median * 0.05) * 1.25 || 1;
  let min = median - dist;
  let max = median + dist;
  if (min <= 0) min = Math.min(...vals, median) * 0.9;
  const span = max - min || 1;
  const yOf = (v) => pad.t + ih - ((v - min) / span) * ih;
  const xOf = (i) => pad.l + (vals.length === 1 ? iw / 2 : (i / (vals.length - 1)) * iw);
  const pts = vals.map((v, i) => ({ x: xOf(i), y: yOf(v), v, m: months[i] }));
  const poly = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const first = vals[0];
  const last = vals[vals.length - 1];
  const deltaPct = first ? Math.round(((last - first) / first) * 1000) / 10 : null;
  const vsMedPct = median ? Math.round(((last - median) / median) * 1000) / 10 : null;
  const medY = yOf(median);
  const lastPt = pts[pts.length - 1];
  const stroke = opts.stroke || 'currentColor';
  const gradId = opts.gradId || 'ppsGrad';
  const fmtVal =
    opts.formatValue ||
    ((v) => {
      const n = Math.round(Number(v) || 0);
      if (n >= 10000) return `${Math.round(n / 100) / 10}k`;
      if (n >= 1000) return `${Math.round(n / 10) / 100}k`.replace(/\.0+k$/, 'k');
      return String(n);
    });

  const area =
    pts.length > 1
      ? `<path d="M${pts[0].x.toFixed(1)},${(pad.t + ih).toFixed(1)} ${pts
          .map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          .join(' ')} L${pts[pts.length - 1].x.toFixed(1)},${(pad.t + ih).toFixed(1)} Z" fill="url(#${gradId})" opacity=".55"/>`
      : '';

  const dropBand =
    lastPt && vsMedPct != null
      ? (() => {
          const top = Math.min(medY, lastPt.y);
          const bot = Math.max(medY, lastPt.y);
          const h = Math.max(bot - top, 1.5);
          const fill = vsMedPct < 0 ? 'rgba(255,122,122,.28)' : 'rgba(94,228,168,.22)';
          const bandStroke = vsMedPct < 0 ? '#ff7a7a' : '#5ee4a8';
          const bandX = Math.max(pad.l, lastPt.x - 22);
          return [
            `<rect x="${bandX.toFixed(1)}" y="${top.toFixed(1)}" width="${(W - pad.r - bandX).toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" />`,
            `<line x1="${lastPt.x.toFixed(1)}" y1="${medY.toFixed(1)}" x2="${lastPt.x.toFixed(1)}" y2="${lastPt.y.toFixed(1)}" stroke="${bandStroke}" stroke-width="1.2" stroke-dasharray="2 2" />`,
          ].join('');
        })()
      : '';

  // Label every point when ≤8, else every other + ends
  const labelStep = pts.length <= 8 ? 1 : 2;
  const labels = pts
    .map((p, i) => {
      const show = i === 0 || i === pts.length - 1 || i % labelStep === 0;
      if (!show) {
        return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="1.6" fill="${stroke}" opacity=".7"/>`;
      }
      const vs = median ? Math.round(((p.v - median) / median) * 1000) / 10 : null;
      const pctTxt = vs == null ? '' : vs > 0 ? `+${vs}%` : `${vs}%`;
      const col = vs == null ? '#8aa3ad' : vs < 0 ? '#ff7a7a' : vs > 0 ? '#5ee4a8' : '#8aa3ad';
      const above = p.y > pad.t + ih * 0.45;
      const yVal = above ? p.y - 10 : p.y + 11;
      const yPct = above ? p.y - 18 : p.y + 19;
      return [
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.2" fill="${col}" stroke="#07131a" stroke-width="0.8"/>`,
        `<text x="${p.x.toFixed(1)}" y="${yVal.toFixed(1)}" fill="#eef6f4" font-size="7.5" text-anchor="middle" font-weight="700">${esc(fmtVal(p.v))}</text>`,
        pctTxt
          ? `<text x="${p.x.toFixed(1)}" y="${yPct.toFixed(1)}" fill="${col}" font-size="6.5" text-anchor="middle" font-weight="800">${esc(pctTxt)}</text>`
          : '',
      ].join('');
    })
    .join('');

  const medLabel = `<text x="${(W - pad.r + 2).toFixed(1)}" y="${(medY + 2.5).toFixed(1)}" fill="#d8c3a5" font-size="7" font-weight="700">med ${esc(fmtVal(median))}</text>`;

  const svgExtra = [
    `<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="currentColor" stop-opacity=".28"/><stop offset="100%" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>`,
    `<line x1="${pad.l}" y1="${medY.toFixed(1)}" x2="${(W - pad.r).toFixed(1)}" y2="${medY.toFixed(1)}" stroke="rgba(216,195,165,.75)" stroke-width="1" stroke-dasharray="3 3" />`,
    medLabel,
    dropBand,
    area,
  ].join('');

  const chartSvg = `${svgExtra}
    <polyline fill="none" stroke="${stroke}" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" points="${poly}" />
    ${labels}`;

  return { poly, first, last, deltaPct, median, vsMedPct, svgExtra, chartSvg, W, H };
}

/** Dual-series AED/sqft chart: ask (red) + DLD (green) on shared month axis. */
function sparkDualPps(askSeries, dldSeries, opts = {}) {
  const W = opts.W || 420;
  const H = opts.H || 150;
  const pad = { l: 2, r: 44, t: 22, b: 10 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const askMap = new Map();
  const allowZero = !!opts.allowZero;
  for (const p of askSeries || []) {
    const m = String(p.m || '');
    const v = Number(p.med_pps);
    if (/^\d{4}-\d{2}$/.test(m) && Number.isFinite(v) && (v > 0 || allowZero)) askMap.set(m, v);
  }
  const dldMap = new Map();
  for (const p of dldSeries || []) {
    const m = String(p.m || '');
    const v = Number(p.med_pps);
    if (/^\d{4}-\d{2}$/.test(m) && Number.isFinite(v) && (v > 0 || allowZero)) dldMap.set(m, v);
  }
  const months =
    Array.isArray(opts.months) && opts.months.length
      ? opts.months.map(String).filter((m) => /^\d{4}-\d{2}$/.test(m))
      : [...new Set([...askMap.keys(), ...dldMap.keys()])].sort();
  if (!months.length) {
    return { chartSvg: '', W, H, months: [], askLast: null, dldLast: null, askMedian: null, dldMedian: null };
  }
  const askVals = months.map((m) => askMap.get(m)).filter((v) => v != null);
  const dldVals = months.map((m) => dldMap.get(m)).filter((v) => v != null);
  const all = [...askVals, ...dldVals];
  const independentScale = !!opts.independentScale;
  const median = medianOf(all) || all[0];
  const dist = Math.max(Math.max(...all) - median, median - Math.min(...all), median * 0.05) * 1.3 || 1;
  let min = median - dist;
  let max = median + dist;
  if (min <= 0) min = Math.min(...all) * 0.9;
  const span = max - min || 1;
  const yOfShared = (v) => pad.t + ih - ((v - min) / span) * ih;

  function yRangeFor(map) {
    const vals = months.map((m) => map.get(m)).filter((v) => v != null);
    if (!vals.length) return null;
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const padV = Math.max((hi - lo) * 0.12, hi * 0.08, 1);
    return { min: Math.max(0, lo - padV), max: hi + padV };
  }
  const askRange = independentScale ? yRangeFor(askMap) : null;
  const dldRange = independentScale ? yRangeFor(dldMap) : null;
  const yOfAsk = (v) => {
    if (!askRange) return yOfShared(v);
    const s = askRange.max - askRange.min || 1;
    return pad.t + ih - ((v - askRange.min) / s) * ih;
  };
  const yOfDld = (v) => {
    if (!dldRange) return yOfShared(v);
    const s = dldRange.max - dldRange.min || 1;
    return pad.t + ih - ((v - dldRange.min) / s) * ih;
  };
  const xOf = (i) => pad.l + (months.length === 1 ? iw / 2 : (i / (months.length - 1)) * iw);
  const fmtVal =
    opts.formatValue ||
    ((v) => {
      const n = Math.round(Number(v) || 0);
      if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 1 : 2)}k`.replace(/\.00k$/, 'k').replace(/(\.\d)0k$/, '$1k');
      return String(n);
    });

  function line(map, color, gradId, softLabels, yOf) {
    const segmentGaps = !!opts.segmentGaps;
    const ptsAll = months.map((m, i) => {
      const v = map.get(m);
      if (v == null) return null;
      return { x: xOf(i), y: yOf(v), v, m, i };
    });
    const segments = segmentGaps
      ? ptsAll.reduce((acc, p) => {
          if (!p) {
            if (acc.length && acc[acc.length - 1].length) acc.push([]);
            return acc;
          }
          if (!acc.length || !acc[acc.length - 1]) acc.push([]);
          acc[acc.length - 1].push(p);
          return acc;
        }, []).filter((seg) => seg.length)
      : [ptsAll.filter(Boolean)];
    if (!segments.length || !segments.some((s) => s.length)) return '';
    const floorY = (pad.t + ih).toFixed(1);
    return segments
      .map((pts) => {
        const poly = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        const area =
          pts.length > 1
            ? `<path d="M${pts[0].x.toFixed(1)},${floorY} ${pts
                .map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`)
                .join(' ')} L${pts[pts.length - 1].x.toFixed(1)},${floorY} Z" fill="url(#${gradId})" opacity=".35"/>`
            : '';
        const labelStep = pts.length <= 6 ? 1 : 2;
        const labels = pts
          .map((p, i) => {
            const show = softLabels && (i === 0 || i === pts.length - 1 || i % labelStep === 0);
            if (!show) {
              return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="1.8" fill="${color}" opacity=".85"/>`;
            }
            const above = p.y > pad.t + ih * 0.45;
            const yVal = above ? p.y - 9 : p.y + 11;
            return [
              `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.3" fill="${color}" stroke="#07131a" stroke-width="0.8"/>`,
              `<text x="${p.x.toFixed(1)}" y="${yVal.toFixed(1)}" fill="${color}" font-size="7" text-anchor="middle" font-weight="700">${esc(fmtVal(p.v))}</text>`,
            ].join('');
          })
          .join('');
        return `${area}<polyline fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="${poly}" />${labels}`;
      })
      .join('');
  }

  const askColor = opts.askColor || '#f0a0a0';
  const dldColor = opts.dldColor || '#7ddeb8';
  const askGrad = opts.askGradId || 'dualAskGrad';
  const dldGrad = opts.dldGradId || 'dualDldGrad';
  const medLine = independentScale
    ? ''
    : (() => {
        const medY = yOfShared(median);
        return `<line x1="${pad.l}" y1="${medY.toFixed(1)}" x2="${(W - pad.r).toFixed(1)}" y2="${medY.toFixed(1)}" stroke="rgba(216,195,165,.55)" stroke-width="1" stroke-dasharray="3 3" />` +
          `<text x="${(W - pad.r + 2).toFixed(1)}" y="${(medY + 2.5).toFixed(1)}" fill="#d8c3a5" font-size="7" font-weight="700">med ${esc(fmtVal(median))}</text>`;
      })();
  const chartSvg = [
    `<defs>`,
    `<linearGradient id="${askGrad}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${askColor}" stop-opacity=".3"/><stop offset="100%" stop-color="${askColor}" stop-opacity="0"/></linearGradient>`,
    `<linearGradient id="${dldGrad}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${dldColor}" stop-opacity=".3"/><stop offset="100%" stop-color="${dldColor}" stop-opacity="0"/></linearGradient>`,
    `</defs>`,
    medLine,
    line(askMap, askColor, askGrad, true, yOfAsk),
    line(dldMap, dldColor, dldGrad, true, yOfDld),
  ].join('');

  const askLast = askVals.length ? askVals[askVals.length - 1] : null;
  const dldLast = dldVals.length ? dldVals[dldVals.length - 1] : null;
  return {
    chartSvg,
    W,
    H,
    months,
    askLast,
    dldLast,
    askMedian: medianOf(askVals),
    dldMedian: medianOf(dldVals),
    askFirst: askVals.length ? askVals[0] : null,
    dldFirst: dldVals.length ? dldVals[0] : null,
  };
}

/** Simple count chart (no percent labels). */
function sparkDealsCountChart(series, opts = {}) {
  const rows = series || [];
  const vals = rows.map((p) => Number(p.med_pps) || 0);
  const months = rows.map((p) => p.m);
  if (!vals.length) {
    return { chartSvg: '', W: opts.W || 420, H: opts.H || 150, months: [] };
  }
  const W = opts.W || 420;
  const H = opts.H || 150;
  const pad = { l: 2, r: 44, t: 22, b: 10 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const sorted = vals.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  const dist = Math.max(
    Math.max(...vals) - median,
    median - Math.min(...vals),
    median * 0.05
  ) * 1.25 || 1;
  let min = median - dist;
  let max = median + dist;
  if (min <= 0) min = Math.min(...vals, median) * 0.9;
  const span = max - min || 1;
  const yOf = (v) => pad.t + ih - ((v - min) / span) * ih;
  const xOf = (i) => pad.l + (vals.length === 1 ? iw / 2 : (i / (vals.length - 1)) * iw);
  const color = opts.color || '#7ddeb8';
  const gradId = opts.gradId || 'dealsCountGrad';
  const fmtVal =
    opts.formatValue ||
    ((v) => {
      const n = Math.round(Number(v) || 0);
      if (n >= 1000) return `${Math.round(n / 100) / 10}k`;
      return String(n);
    });

  const pts = vals.map((v, i) => ({ x: xOf(i), y: yOf(v), v, m: months[i] }));
  const poly = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const labelStep = pts.length <= 8 ? 1 : 2;

  const labels = pts
    .map((p, i) => {
      const show = i === 0 || i === pts.length - 1 || i % labelStep === 0;
      if (!show) {
        return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="1.6" fill="${color}" opacity=".75"/>`;
      }
      const above = p.y > pad.t + ih * 0.45;
      const yVal = above ? p.y - 9 : p.y + 11;
      return [
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.3" fill="${color}" stroke="#07131a" stroke-width="0.8"/>`,
        `<text x="${p.x.toFixed(1)}" y="${yVal.toFixed(1)}" fill="#eef6f4" font-size="7.5" text-anchor="middle" font-weight="800">${esc(fmtVal(p.v))}</text>`,
      ].join('');
    })
    .join('');

  const medY = yOf(median || 0);
  const medLabel = `<text x="${(W - pad.r + 2).toFixed(1)}" y="${(medY + 2.5).toFixed(1)}" fill="#d8c3a5" font-size="7" font-weight="700">med ${esc(fmtVal(median))}</text>`;

  const area =
    pts.length > 1
      ? `<path d="M${pts[0].x.toFixed(1)},${(pad.t + ih).toFixed(1)} ${pts
          .map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          .join(' ')} L${pts[pts.length - 1].x.toFixed(1)},${(pad.t + ih).toFixed(1)} Z" fill="url(#${gradId})" opacity=".45"/>`
      : '';

  const svgExtra = [
    `<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity=".35"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`,
    `<line x1="${pad.l}" y1="${medY.toFixed(1)}" x2="${(W - pad.r).toFixed(1)}" y2="${medY.toFixed(1)}" stroke="rgba(216,195,165,.75)" stroke-width="1" stroke-dasharray="3 3" />`,
    medLabel,
    area,
  ].join('');

  const chartSvg = `${svgExtra}
    <polyline fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" points="${poly}" />
    ${labels}`;

  return { chartSvg, W, H, months };
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shortMonthLabel(m) {
  const s = String(m || '');
  const parts = s.split('-');
  if (parts.length >= 2) {
    const mo = Number(parts[1]);
    if (mo >= 1 && mo <= 12) return MONTH_SHORT[mo - 1];
  }
  return s.slice(0, 7);
}

function ppsMini(title, series, dealsSeries) {
  // Legacy ask AED/sqft card (gallery etc.). Prefer dldFactMini for DLD Fact hero cards.
  const rows = series || [];
  const isRent = /rent/i.test(title);
  const kind = isRent ? 'rent' : 'sale';
  const s = sparkPolyline(rows, {
    gradId: `ppsGrad-${kind}`,
    formatValue: (v) => {
      const n = Math.round(Number(v) || 0);
      if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 1 : 2)}k`.replace(/\.00k$/, 'k').replace(/(\.\d)0k$/, '$1k');
      return String(n);
    },
  });
  const period = s.deltaPct == null ? '—' : `${s.deltaPct > 0 ? '+' : ''}${s.deltaPct}%`;
  const vsMed =
    s.vsMedPct == null
      ? null
      : s.vsMedPct < 0
        ? `↓ ${s.vsMedPct}%`
        : s.vsMedPct > 0
          ? `↑ +${s.vsMedPct}%`
          : '0%';
  const vsCls = s.vsMedPct == null ? '' : s.vsMedPct < 0 ? 'pps-drop' : s.vsMedPct > 0 ? 'pps-up' : '';
  const step = rows.length > 6 ? Math.ceil(rows.length / 6) : 1;
  const dates =
    rows.length > 0
      ? `<div class="pps-dates" aria-hidden="true">${rows
          .map((p, i) => {
            const show = i === 0 || i === rows.length - 1 || i % step === 0;
            return `<span class="${show ? '' : 'is-hide'}" title="${esc(p.m)}">${show ? esc(shortMonthLabel(p.m)) : ''}</span>`;
          })
          .join('')}</div>`
      : '';
  const dropBig =
    vsMed != null
      ? `<span class="pps-drop-big ${vsCls}">${esc(vsMed)}</span>`
      : period !== '—'
        ? `<span class="pps-drop-big">${esc(period)}</span>`
        : '';
  const vw = s.W || 340;
  const vh = s.H || 130;
  void dealsSeries;
  return `<div class="pps pps--ask" data-pps="${esc(kind)}">
    <div class="pps-top">
      <div class="pps-l">${esc(title)}</div>
      ${dropBig}
    </div>
    <div class="pps-v">${s.last != null ? fmt(Math.round(s.last)) : '—'}</div>
    <div class="pps-vs">med ${s.median != null ? fmt(Math.round(s.median)) : '—'} · ${esc(vsMed || '—')} · 12m ${esc(period)}</div>
    <div class="pps-chart">
      <svg viewBox="0 0 ${vw} ${vh}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-label="AED/sqft vs median">
        ${s.chartSvg || ''}
      </svg>
    </div>
    ${dates}
  </div>`;
}

function medianOf(arr) {
  const a = (arr || []).filter((x) => Number.isFinite(x) && x > 0).sort((x, y) => x - y);
  if (!a.length) return null;
  return a[Math.floor(a.length / 2)];
}

/** Monthly DLD med AED/sqft + deal counts from ticker rows (+ optional deals dynamics counts). */
function monthlyDldSeries(tickerRows, dealsCounts) {
  const by = new Map();
  for (const r of tickerRows || []) {
    const m = String(r.d || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(m)) continue;
    if (!by.has(m)) by.set(m, { pps: [], n: 0 });
    const g = by.get(m);
    g.n += 1;
    const pps = Number(r.pps);
    if (Number.isFinite(pps) && pps > 0) g.pps.push(pps);
  }
  for (const p of dealsCounts || []) {
    const m = String(p.m || '');
    if (!/^\d{4}-\d{2}$/.test(m)) continue;
    if (!by.has(m)) by.set(m, { pps: [], n: 0 });
    const n = Number(p.n) || 0;
    if (n > 0) by.get(m).n = n;
  }
  return [...by.keys()]
    .sort()
    .map((m) => {
      const g = by.get(m);
      return { m, med_pps: medianOf(g.pps), n: g.n };
    })
    .filter((p) => p.med_pps != null || p.n > 0);
}

/**
 * DLD-only fact card: AED/sqft from deals + deal counts. No ask listings.
 * Flip: front = DLD AED/sqft, back = deals/mo.
 */
function dldFactMini(kind, tickerRows, dealsCounts) {
  const isRent = kind === 'rent';
  const rows = monthlyDldSeries(tickerRows, dealsCounts);
  const ppsRows = rows.filter((p) => p.med_pps != null).map((p) => ({ m: p.m, med_pps: p.med_pps }));
  const dealRows = rows.map((p) => ({ m: p.m, med_pps: Number(p.n) || 0, n: Number(p.n) || 0 }));
  const s = sparkPolyline(ppsRows, {
    gradId: `ppsGrad-dld-pps-${kind}`,
    formatValue: (v) => {
      const n = Math.round(Number(v) || 0);
      if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 1 : 2)}k`.replace(/\.00k$/, 'k').replace(/(\.\d)0k$/, '$1k');
      return String(n);
    },
  });
  const d = sparkPolyline(dealRows, {
    gradId: `ppsGrad-dld-n-${kind}`,
    formatValue: (v) => String(Math.round(Number(v) || 0)),
  });
  const period = s.deltaPct == null ? '—' : `${s.deltaPct > 0 ? '+' : ''}${s.deltaPct}%`;
  const vsMed =
    s.vsMedPct == null
      ? null
      : s.vsMedPct < 0
        ? `↓ ${s.vsMedPct}%`
        : s.vsMedPct > 0
          ? `↑ +${s.vsMedPct}%`
          : '0%';
  const vsCls = s.vsMedPct == null ? '' : s.vsMedPct < 0 ? 'pps-drop' : s.vsMedPct > 0 ? 'pps-up' : '';
  const dropBig =
    vsMed != null
      ? `<span class="pps-drop-big ${vsCls}">${esc(vsMed)}</span>`
      : period !== '—'
        ? `<span class="pps-drop-big">${esc(period)}</span>`
        : '';
  const dealsTotal = dealRows.reduce((a, p) => a + (Number(p.n) || 0), 0);
  const dealsLast = dealRows.length ? Number(dealRows[dealRows.length - 1].n) || 0 : 0;
  const dealsPeriod = d.deltaPct == null ? '—' : `${d.deltaPct > 0 ? '+' : ''}${d.deltaPct}%`;
  const dealsVsMed =
    d.vsMedPct == null
      ? null
      : d.vsMedPct < 0
        ? `↓ ${d.vsMedPct}%`
        : d.vsMedPct > 0
          ? `↑ +${d.vsMedPct}%`
          : '0%';
  const dealsVsCls = d.vsMedPct == null ? '' : d.vsMedPct < 0 ? 'pps-drop' : d.vsMedPct > 0 ? 'pps-up' : '';
  const dealsDropBig =
    dealsVsMed != null
      ? `<span class="pps-drop-big ${dealsVsCls}">${esc(dealsVsMed)}</span>`
      : dealsPeriod !== '—'
        ? `<span class="pps-drop-big">${esc(dealsPeriod)}</span>`
        : '';
  const ppsStep = ppsRows.length > 6 ? Math.ceil(ppsRows.length / 6) : 1;
  const ppsDates =
    ppsRows.length > 0
      ? `<div class="pps-dates" aria-hidden="true">${ppsRows
          .map((p, i) => {
            const show = i === 0 || i === ppsRows.length - 1 || i % ppsStep === 0;
            return `<span class="${show ? '' : 'is-hide'}" title="${esc(p.m)}">${show ? esc(shortMonthLabel(p.m)) : ''}</span>`;
          })
          .join('')}</div>`
      : '';
  const nStep = dealRows.length > 6 ? Math.ceil(dealRows.length / 6) : 1;
  const nDates =
    dealRows.length > 0
      ? `<div class="pps-dates" aria-hidden="true">${dealRows
          .map((p, i) => {
            const show = i === 0 || i === dealRows.length - 1 || i % nStep === 0;
            return `<span class="${show ? '' : 'is-hide'}" title="${esc(p.m)}">${show ? esc(shortMonthLabel(p.m)) : ''}</span>`;
          })
          .join('')}</div>`
      : '';
  const factTitle = isRent ? 'DLD Fact rent' : 'DLD Fact sale';
  const lastPps = s.last != null ? Math.round(s.last) : null;

  return `<div class="pps pps-flip pps--fact" data-pps="dld-${esc(kind)}" role="button" tabindex="0" title="Нажми — DLD AED/sqft / deals">
    <div class="pps-flip-inner">
      <div class="pps-face pps-face--front">
        <div class="pps-top">
          <div class="pps-l">${esc(factTitle)}</div>
          ${dropBig}
        </div>
        <div class="pps-v">${lastPps != null ? fmt(lastPps) : '—'} <em style="font-style:normal;font-size:11px;color:var(--muted);font-weight:700">AED/sqft</em></div>
        <div class="pps-vs">${fmt(dealsLast)} deals/mo · 12m ${fmt(dealsTotal)} deals · med ${s.median != null ? fmt(Math.round(s.median)) : '—'} · ${esc(vsMed || period)}</div>
        <div class="pps-chart">
          ${
            ppsRows.length
              ? `<svg viewBox="0 0 ${s.W || 340} ${s.H || 130}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-label="DLD AED/sqft">
            ${s.chartSvg || ''}
          </svg>`
              : '<div class="pps-vs" style="margin-top:12px">Нет DLD AED/sqft по зданию</div>'
          }
        </div>
        ${ppsDates}
        <div class="pps-flip-hint">↻ DLD deals count</div>
      </div>
      <div class="pps-face pps-face--back">
        <div class="pps-top">
          <div class="pps-l">${esc(factTitle)} · deals</div>
          ${dealsDropBig || '<span class="pps-drop-big">↻</span>'}
        </div>
        <div class="pps-v">${dealRows.length ? fmt(dealsLast) : '—'} <em style="font-style:normal;font-size:11px;color:var(--muted);font-weight:700">deals/mo</em></div>
        <div class="pps-vs">12m total ${fmt(dealsTotal)} · med ${d.median != null ? fmt(Math.round(d.median)) : '—'}/mo · ${esc(dealsVsMed || dealsPeriod)}</div>
        <div class="pps-chart">
          ${
            dealRows.length
              ? `<svg viewBox="0 0 ${d.W || 340} ${d.H || 130}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-label="DLD deals count">
            ${d.chartSvg || ''}
          </svg>`
              : '<div class="pps-vs" style="margin-top:12px">Нет DLD сделок по зданию</div>'
          }
        </div>
        ${nDates}
        <div class="pps-flip-hint">↻ DLD AED/sqft</div>
      </div>
    </div>
  </div>`;
}

/** AED/sqft from a listing row (ask, not DLD). */
function listingAskPps(u) {
  const pps = Number(u && u.pps);
  if (Number.isFinite(pps) && pps > 0) return pps;
  const area = Number(u && u.area_sqft);
  const price = Number(u && u.price);
  if (Number.isFinite(area) && area > 0 && Number.isFinite(price) && price > 0) return price / area;
  return null;
}

/**
 * Monthly ask AED/sqft: prefer purpose-filtered listing dynamics (pps_dynamics),
 * else a single point from current portal listings. Never uses DLD deals.
 */
function askSeriesFromListings(listings, fallbackSeries) {
  const fromDyn = (fallbackSeries || [])
    .map((p) => ({ m: p.m, med_pps: Number(p.med_pps) || 0, n: Number(p.n) || 0 }))
    .filter((p) => p.m && p.med_pps > 0);
  if (fromDyn.length >= 2) return fromDyn;

  const curMed = medianOf((listings || []).map(listingAskPps));
  if (curMed == null) return fromDyn;
  const m = new Date().toISOString().slice(0, 7);
  return [{ m, med_pps: Math.round(curMed), n: (listings || []).length }];
}

/** Two red ask-listing cards — counts + AED/sqft from listings arrays (not DLD rent/sale). */
function listingsMini(saleListings, rentListings, saleFallbackSeries, rentFallbackSeries) {
  function card(kind, listings, fallbackSeries) {
    const list = listings || [];
    const count = list.length;
    const curMed = medianOf(list.map(listingAskPps));
    const rows = askSeriesFromListings(list, fallbackSeries);
    const s = sparkPolyline(rows, {
      gradId: `ppsGrad-listings-${kind}`,
      formatValue: (v) => {
        const n = Math.round(Number(v) || 0);
        if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 1 : 2)}k`.replace(/\.00k$/, 'k').replace(/(\.\d)0k$/, '$1k');
        return String(n);
      },
    });
    const last = curMed != null ? Math.round(curMed) : s.last != null ? Math.round(s.last) : null;
    const vsCur =
      curMed != null && s.median != null && s.median > 0
        ? Math.round(((curMed - s.median) / s.median) * 1000) / 10
        : s.vsMedPct;
    const period = s.deltaPct == null ? '—' : `${s.deltaPct > 0 ? '+' : ''}${s.deltaPct}%`;
    const vsMed =
      vsCur == null
        ? null
        : vsCur < 0
          ? `↓ ${vsCur}%`
          : vsCur > 0
            ? `↑ +${vsCur}%`
            : '0%';
    const vsCls = vsCur == null ? '' : vsCur < 0 ? 'pps-drop' : vsCur > 0 ? 'pps-up' : '';
    const dropBig =
      vsMed != null
        ? `<span class="pps-drop-big ${vsCls}">${esc(vsMed)}</span>`
        : period !== '—'
          ? `<span class="pps-drop-big">${esc(period)}</span>`
          : '';
    const step = rows.length > 6 ? Math.ceil(rows.length / 6) : 1;
    const dates =
      rows.length > 0
        ? `<div class="pps-dates" aria-hidden="true">${rows
            .map((p, i) => {
              const show = i === 0 || i === rows.length - 1 || i % step === 0;
              return `<span class="${show ? '' : 'is-hide'}" title="${esc(p.m)}">${show ? esc(shortMonthLabel(p.m)) : ''}</span>`;
            })
            .join('')}</div>`
        : '';
    const title = kind === 'sale' ? 'Ask listing · sale' : 'Ask listing · rent';
    const vw = s.W || 340;
    const vh = s.H || 130;
    return `<div class="pps pps--ask" data-pps="ask-${esc(kind)}">
      <div class="pps-top">
        <div class="pps-l">${esc(title)}</div>
        ${dropBig}
      </div>
      <div class="pps-v">${fmt(count)} <em style="font-style:normal;font-size:12px;color:var(--muted);font-weight:700">listings</em></div>
      <div class="pps-vs">ask AED/sqft med ${last != null ? fmt(last) : '—'} · from listings · ${esc(vsMed || period)}</div>
      <div class="pps-chart">
        ${
          rows.length
            ? `<svg viewBox="0 0 ${vw} ${vh}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-label="${esc(kind)} ask listing AED/sqft">
          ${s.chartSvg || ''}
        </svg>`
            : '<div class="pps-vs" style="margin-top:12px">Нет ask AED/sqft по листингам</div>'
        }
      </div>
      ${dates}
    </div>`;
  }

  return (
    card('sale', saleListings, saleFallbackSeries) + card('rent', rentListings, rentFallbackSeries)
  );
}

/**
 * Month axis for count charts: span from earliest to latest month across ask + fact,
 * so ask listings line continues even when DLD/Ejari has gaps or stops earlier.
 */
function monthRangeForCounts(askSeries, factSeries, curMonth) {
  const keys = [];
  for (const series of [askSeries, factSeries]) {
    for (const p of series || []) {
      const m = String(p.m || '');
      if (/^\d{4}-\d{2}$/.test(m)) keys.push(m);
    }
  }
  if (curMonth && /^\d{4}-\d{2}$/.test(curMonth)) keys.push(curMonth);
  if (!keys.length) return [];
  keys.sort();
  const start = keys[0];
  const end = keys[keys.length - 1];
  const out = [];
  let [y, mo] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  while (y < ey || (y === ey && mo <= em)) {
    out.push(`${y}-${String(mo).padStart(2, '0')}`);
    mo += 1;
    if (mo > 12) {
      mo = 1;
      y += 1;
    }
  }
  return out;
}

/**
 * Sale: Ask vs DLD AED/sqft · flip → DLD deals count
 * Rent: Ejari fact deals / asking rent listing (counts) · flip → AED/sqft
 */
function askDldCompareMini(kind, listings, askFallbackSeries, dldTicker, dealsCounts, stock, opts) {
  opts = opts || {};
  const dldHref = opts.dldHref || '';
  const isRent = kind === 'rent';
  const factName = isRent ? 'Ejari' : 'DLD';
  const list = listings || [];
  const stockInfo = stock || {};
  const uniquePermits = new Set(
    list.map((u) => String(u.permit_number || '').trim()).filter(Boolean)
  ).size;
  const listingOffers = list.length;
  const longTermContracts =
    stockInfo.rented_now != null
      ? Number(stockInfo.rented_now) || 0
      : stockInfo.rented_12m != null
        ? Number(stockInfo.rented_12m) || 0
        : null;
  const askRows = askSeriesFromListings(list, askFallbackSeries);
  const dldRows = monthlyDldSeries(dldTicker, dealsCounts).filter((p) => p.med_pps != null);
  const dual = sparkDualPps(askRows, dldRows, {
    askGradId: `dualAsk-${kind}`,
    dldGradId: `dualDld-${kind}`,
  });
  const askMed = medianOf(list.map(listingAskPps));
  const askLast = askMed != null ? Math.round(askMed) : dual.askLast != null ? Math.round(dual.askLast) : null;
  const dldLast = dual.dldLast != null ? Math.round(dual.dldLast) : null;
  const dealsTotal = (dldRows || []).reduce((a, p) => a + (Number(p.n) || 0), 0);
  const dealsLast = dldRows.length ? Number(dldRows[dldRows.length - 1].n) || 0 : 0;
  const gap =
    askLast != null && dldLast != null && dldLast > 0
      ? Math.round(((askLast - dldLast) / dldLast) * 1000) / 10
      : null;
  const gapTxt =
    gap == null
      ? '—'
      : gap > 0
        ? `ask +${gap}% vs ${factName} · ${factName} ниже ask`
        : gap < 0
          ? `ask ${gap}% vs ${factName} · ${factName} выше ask`
          : `ask = ${factName}`;
  const gapCls = gap == null ? '' : gap > 0 ? 'pps-drop' : gap < 0 ? 'pps-up' : '';
  const ppsTitle = isRent ? 'Ask vs Ejari · rent' : 'Ask vs DLD · sale';
  const step = dual.months.length > 6 ? Math.ceil(dual.months.length / 6) : 1;
  const dates =
    dual.months.length > 0
      ? `<div class="pps-dates" aria-hidden="true">${dual.months
          .map((m, i) => {
            const show = i === 0 || i === dual.months.length - 1 || i % step === 0;
            return `<span class="${show ? '' : 'is-hide'}" title="${esc(m)}">${show ? esc(shortMonthLabel(m)) : ''}</span>`;
          })
          .join('')}</div>`
      : '';

  // Asking listing counts by month (from pps_dynamics.n) + fact deals counts
  const askCountSeries = (askFallbackSeries || [])
    .map((p) => ({ m: p.m, med_pps: Number(p.n) || 0 }))
    .filter((p) => p.m && p.med_pps > 0);
  // Always pin current ask offers on this month so "сейчас" видно на графике
  const curMonth = new Date().toISOString().slice(0, 7);
  const curAskN = list.length;
  if (curAskN > 0) {
    const idx = askCountSeries.findIndex((p) => p.m === curMonth);
    if (idx >= 0) askCountSeries[idx] = { m: curMonth, med_pps: curAskN };
    else askCountSeries.push({ m: curMonth, med_pps: curAskN });
    askCountSeries.sort((a, b) => String(a.m).localeCompare(String(b.m)));
  }
  const factCountSeries = (dealsCounts || []).map((p) => ({
    m: p.m,
    med_pps: Number(p.n) || 0,
  }));
  const askCountLast = curAskN > 0
    ? curAskN
    : askCountSeries.length
      ? Number(askCountSeries[askCountSeries.length - 1].med_pps) || 0
      : 0;
  const countMonths = monthRangeForCounts(askCountSeries, factCountSeries, curAskN > 0 ? curMonth : '');
  const countDual = sparkDualPps(askCountSeries, factCountSeries, {
    askGradId: `dualAskN-${kind}`,
    dldGradId: `dualFactN-${kind}`,
    formatValue: (v) => String(Math.round(Number(v) || 0)),
    independentScale: true,
    segmentGaps: true,
    allowZero: true,
    months: countMonths,
  });
  const dldGo = dldHref
    ? `<a class="pps-dld-go" href="${esc(dldHref)}#${isRent ? 'rent' : 'sale'}" onclick="event.stopPropagation()">${isRent ? 'DLD Rent →' : 'DLD Sale →'}</a>`
    : '';
  const countStep = countDual.months.length > 6 ? Math.ceil(countDual.months.length / 6) : 1;
  const countDates =
    countDual.months.length > 0
      ? `<div class="pps-dates" aria-hidden="true">${countDual.months
          .map((m, i) => {
            const show = i === 0 || i === countDual.months.length - 1 || i % countStep === 0;
            return `<span class="${show ? '' : 'is-hide'}" title="${esc(m)}">${show ? esc(shortMonthLabel(m)) : ''}</span>`;
          })
          .join('')}</div>`
      : '';

  const ppsFace = `
      <div class="pps-top">
        <div class="pps-l">${esc(ppsTitle)} · AED/sqft</div>
        <span class="pps-drop-big ${gapCls}">${esc(gapTxt)}</span>
      </div>
      <div class="pps-v pps-v--split">
        <span class="pps-ask">${askLast != null ? fmt(askLast) : '—'} <em>ask AED/sqft</em></span>
        <span class="pps-dld">${dldLast != null ? fmt(dldLast) : '—'} <em>${esc(factName)} AED/sqft</em></span>
      </div>
      <div class="pps-vs">цена за фут · ${fmt(list.length)} listings · ${fmt(dealsLast)} ${esc(factName)} deals/mo · 12m ${fmt(dealsTotal)} deals</div>
      <div class="pps-legend" aria-hidden="true">
        <span class="lg-ask"><i></i>Ask listing AED/sqft</span>
        <span class="lg-dld"><i></i>${esc(factName)} Fact AED/sqft</span>
        ${dldGo}
      </div>
      <div class="pps-chart pps-chart--dual">
        ${
          dual.chartSvg
            ? `<svg viewBox="0 0 ${dual.W} ${dual.H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-label="${esc(kind)} ask vs ${esc(factName)} AED/sqft">
        ${dual.chartSvg}
      </svg>`
            : `<div class="pps-vs" style="margin-top:12px">Нет данных ask / ${esc(factName)} AED/sqft</div>`
        }
      </div>
      ${dates}`;

  // Rent: front = dual counts (Ejari deals + asking listings) + permits / long-term contracts
  if (isRent) {
    const ltTxt =
      longTermContracts != null
        ? `${fmt(longTermContracts)} long-term contracts`
        : `${fmt(dealsTotal)} Ejari 12m`;
    return `<div class="pps pps-flip pps--compare" data-pps="compare-rent" role="button" tabindex="0" title="Нажми — Ejari / ask counts · AED/sqft">
    <div class="pps-flip-inner">
      <div class="pps-face pps-face--front">
        <div class="pps-top">
          <div class="pps-l">Ejari fact deals / asking rent listing</div>
          <span class="pps-drop-big">${fmt(dealsLast)} / ${fmt(askCountLast)}</span>
        </div>
        <div class="pps-v pps-v--split">
          <span class="pps-ask">${fmt(listingOffers)} <em>listings</em></span>
          <span class="pps-dld">${fmt(uniquePermits)} <em>permits</em></span>
        </div>
        <div class="pps-vs">${fmt(listingOffers)} предложений · ${fmt(uniquePermits)} unique permit_number · ${esc(ltTxt)} · ${fmt(dealsLast)} Ejari/mo</div>
        <div class="pps-legend" aria-hidden="true">
          <span class="lg-ask"><i></i>Asking rent listing</span>
          <span class="lg-dld"><i></i>Ejari fact deals</span>
          ${dldGo}
        </div>
        <div class="pps-chart pps-chart--dual">
          ${
            countDual.chartSvg
              ? `<svg viewBox="0 0 ${countDual.W} ${countDual.H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-label="Ejari deals vs asking rent listing count">
        ${countDual.chartSvg}
      </svg>`
              : '<div class="pps-vs" style="margin-top:12px">Нет counts Ejari / ask</div>'
          }
        </div>
        ${countDates}
        <div class="pps-flip-hint">↻ AED/sqft</div>
      </div>
      <div class="pps-face pps-face--back">
        ${ppsFace}
        <div class="pps-vs" style="margin-top:6px">${fmt(listingOffers)} ask listings · ${fmt(uniquePermits)} unique permits · ${esc(ltTxt)}</div>
        <div class="pps-flip-hint">↻ deals / listings count</div>
      </div>
    </div>
  </div>`;
  }

  // Sale: front = AED/sqft, back = DLD deals + current ask listings on one chart
  return `<div class="pps pps-flip pps--compare" data-pps="compare-sale" role="button" tabindex="0" title="Нажми — Ask vs DLD / deals · listings count">
    <div class="pps-flip-inner">
      <div class="pps-face pps-face--front">
        ${ppsFace}
        <div class="pps-flip-hint">↻ deals / listings</div>
      </div>
      <div class="pps-face pps-face--back">
        <div class="pps-top">
          <div class="pps-l">DLD deals / asking sale listing</div>
          <span class="pps-drop-big">${fmt(dealsLast)} / ${fmt(listingOffers)}</span>
        </div>
        <div class="pps-v pps-v--split">
          <span class="pps-ask">${fmt(listingOffers)} <em>сейчас на продажу</em></span>
          <span class="pps-dld">${fmt(dealsLast)} <em>DLD deals/mo</em></span>
        </div>
        <div class="pps-vs">${fmt(listingOffers)} предложений сейчас · ${fmt(uniquePermits)} unique permit · ${fmt(dealsLast)} ${esc(factName)}/mo · 12m ${fmt(dealsTotal)} deals · <span style="opacity:.85">график — раздельный масштаб</span></div>
        <div class="pps-legend" aria-hidden="true">
          <span class="lg-ask"><i></i>Ask listings (сейчас ${fmt(listingOffers)})</span>
          <span class="lg-dld"><i></i>${esc(factName)} deals / mo</span>
          ${dldGo}
        </div>
        <div class="pps-chart pps-chart--dual">
          ${
            countDual.chartSvg
              ? `<svg viewBox="0 0 ${countDual.W} ${countDual.H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-label="sale DLD deals vs ask listings count">
        ${countDual.chartSvg}
      </svg>`
              : '<div class="pps-vs" style="margin-top:12px">Нет counts DLD / ask</div>'
          }
        </div>
        ${countDates}
        <div class="pps-flip-hint">↻ AED/sqft</div>
      </div>
    </div>
  </div>`;
}

function fmtTickerPrice(p, isRent) {
  const x = Number(p);
  if (!x) return '—';
  if (isRent) return `${fmt(x)} AED/yr`;
  return x >= 1e6 ? `${(x / 1e6).toFixed(2)}M AED` : `${fmt(x)} AED`;
}

function medianNum(arr) {
  const a = arr.filter((x) => Number.isFinite(x) && x > 0).sort((x, y) => x - y);
  if (!a.length) return null;
  return a[Math.floor(a.length / 2)];
}

function vsMedBadge(pps, median) {
  if (!median || !Number.isFinite(Number(pps)) || !Number(pps)) return '';
  const pct = Math.round(((Number(pps) - median) / median) * 1000) / 10;
  const tone = pct < 0 ? 'down' : pct > 0 ? 'up' : 'flat';
  const arrow = pct < 0 ? '↓' : pct > 0 ? '↑' : '·';
  const label = `${pct > 0 ? '+' : ''}${pct}%`;
  return `<span class="tick-vs tick-vs--${tone}">${arrow} ${esc(label)} vs med</span>`;
}

function dldTickerItemHtml(row, kind, medianPps) {
  const isRent = kind === 'rent';
  const label = isRent ? 'DLD RENT' : `DLD ${String(row.procedure || 'SALE')}`.toUpperCase();
  const bits = [
    row.d ? String(row.d).slice(0, 10) : null,
    row.rooms != null && row.rooms !== '' ? `${row.rooms}BR` : null,
    row.floor != null && row.floor !== '' ? `fl ${row.floor}` : null,
    row.unit ? `#${row.unit}` : null,
    fmtTickerPrice(row.price, isRent),
    row.pps ? `${fmt(Math.round(Number(row.pps)))}/sqft` : null,
  ].filter(Boolean);
  const badge = vsMedBadge(row.pps, medianPps);
  return `<span class="tick-item"><b>${esc(label)}</b> · ${bits.map((x) => esc(x)).join(' · ')}${badge ? ' · ' + badge : ''}</span>`;
}

/** CSS marquee: sale → left, rent → right (LTR). Shows $/sqft vs median on each deal. */
function dldTickerHtml(items, kind) {
  const rows = items || [];
  if (!rows.length) {
    return `<div class="dld-ticker dld-ticker--${kind}"><div class="dld-ticker-label">DLD ${kind}</div><div class="dld-ticker-track"><span class="tick-item">нет транзакций</span></div></div>`;
  }
  const medianPps = medianNum(rows.map((r) => Number(r.pps)));
  const latest = rows[0];
  const latestVs = latest && medianPps ? Math.round(((Number(latest.pps) - medianPps) / medianPps) * 1000) / 10 : null;
  const headTone = latestVs == null ? '' : latestVs < 0 ? 'down' : latestVs > 0 ? 'up' : 'flat';
  const headLabel =
    latestVs == null
      ? kind === 'sale'
        ? 'DLD SALE →'
        : '← DLD RENT'
      : `${kind === 'sale' ? 'DLD SALE' : 'DLD RENT'} ${latestVs < 0 ? '↓' : latestVs > 0 ? '↑' : '·'}${latestVs > 0 ? '+' : ''}${latestVs}%`;

  const strip = rows.map((r) => dldTickerItemHtml(r, kind, medianPps)).join('<span class="tick-sep">✦</span>');
  return `<div class="dld-ticker dld-ticker--${kind}" aria-label="DLD ${kind} ticker">
    <div class="dld-ticker-label dld-ticker-label--${headTone}">${esc(headLabel)}</div>
    <div class="dld-ticker-viewport">
      <div class="dld-ticker-track">${strip}<span class="tick-sep">✦</span>${strip}</div>
    </div>
  </div>`;
}

function dldTickerCss() {
  return `
    .dld-ticker {
      display:flex; align-items:stretch; gap:0; flex:0 0 auto;
      border-bottom:1px solid var(--line); background:rgba(3,16,22,.96);
      overflow:hidden; min-height:34px;
    }
    .dld-ticker--rent { border-bottom:1px solid var(--line); border-top:0; margin-top:0; }
    .dld-ticker-label {
      flex:0 0 220px; width:220px; min-width:220px; max-width:220px; padding:0 14px; display:flex; align-items:center; justify-content:center;
      font-size:11px; letter-spacing:.06em; text-transform:uppercase; font-weight:800;
      color:#1a1208; background:var(--sand); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    .dld-ticker--rent .dld-ticker-label { background:var(--sea); color:#031016; }
    .dld-ticker-label--down { background:#ff7a7a !important; color:#1a0808 !important; }
    .dld-ticker-label--up { background:#5ee4a8 !important; color:#031016 !important; }
    .dld-ticker-viewport { flex:1; overflow:hidden; mask-image:linear-gradient(90deg,transparent,#000 4%,#000 96%,transparent); }
    .dld-ticker-track {
      display:inline-flex; align-items:center; gap:0; white-space:nowrap;
      padding:8px 0; width:max-content; will-change:transform;
    }
    .dld-ticker--sale .dld-ticker-track { animation: dld-left 330s linear infinite; }
    .dld-ticker--rent .dld-ticker-track { animation: dld-right 360s linear infinite; }
    .tick-item { font-size:12px; color:var(--text); padding:0 6px; font-variant-numeric:tabular-nums; }
    .tick-item b { color:var(--sand); font-weight:800; }
    .dld-ticker--rent .tick-item b { color:var(--sea); }
    .tick-vs { font-weight:800; font-size:11px; padding:2px 6px; border-radius:999px; }
    .tick-vs--down { color:#ffb4b4; background:rgba(255,122,122,.18); }
    .tick-vs--up { color:#9af0c8; background:rgba(94,228,168,.16); }
    .tick-vs--flat { color:var(--muted); background:rgba(255,255,255,.06); }
    .tick-sep { color:var(--muted); padding:0 14px; opacity:.55; font-size:10px; }
    @keyframes dld-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    @keyframes dld-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
    @media (prefers-reduced-motion: reduce) {
      .dld-ticker-track { animation:none !important; }
    }
  `;
}

module.exports = {
  esc,
  fmt,
  fmtM,
  fmtPrice,
  groupByFloor,
  sparkPolyline,
  sparkDualPps,
  ppsMini,
  dldFactMini,
  listingsMini,
  askDldCompareMini,
  shortMonthLabel,
  dldTickerHtml,
  dldTickerCss,
};

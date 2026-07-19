/**
 * DLD transactions subpage for a building (sale + rent tabs).
 * Same hero header as Split Desk (tickers + metrics).
 */
const { esc, fmt } = require('./shared');
const { buildingHeroCss, buildingHeroHtml } = require('./buildingHero');

function medianNum(arr) {
  const a = arr.filter((x) => Number.isFinite(x) && x > 0).sort((x, y) => x - y);
  if (!a.length) return null;
  return a[Math.floor(a.length / 2)];
}

function fmtP(p, isRent) {
  const x = Number(p);
  if (!x) return '—';
  if (isRent) return `${fmt(x)} AED/yr`;
  return x >= 1e6 ? `${(x / 1e6).toFixed(2)}M AED` : `${fmt(x)} AED`;
}

function vsMed(pps, med) {
  if (!med || !Number(pps)) return { txt: '—', tone: 'flat' };
  const pct = Math.round(((Number(pps) - med) / med) * 1000) / 10;
  return {
    txt: `${pct > 0 ? '+' : ''}${pct}%`,
    tone: pct < 0 ? 'down' : pct > 0 ? 'up' : 'flat',
  };
}

/** Monthly median AED/sqft from DLD deal rows (fallback if pps_dynamics empty). */
function monthlyFromDeals(rows) {
  const by = new Map();
  for (const r of rows || []) {
    const d = String(r.d || '').slice(0, 7);
    const pps = Number(r.pps);
    if (!/^\d{4}-\d{2}$/.test(d) || !Number.isFinite(pps) || pps <= 0) continue;
    if (!by.has(d)) by.set(d, []);
    by.get(d).push(pps);
  }
  return [...by.keys()]
    .sort()
    .map((m) => ({ m, med_pps: medianNum(by.get(m)), n: by.get(m).length }))
    .filter((x) => x.med_pps != null);
}

function fmtAxis(v, isRent) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  if (isRent) return String(Math.round(n));
  if (n >= 1000) return `${Math.round(n / 100) / 10}k`;
  return String(Math.round(n));
}

function dldChartSvg(series, kind) {
  const isRent = kind === 'rent';
  const pts = (series || [])
    .map((p) => ({ m: p.m, v: Number(p.med_pps), n: Number(p.n) || 0 }))
    .filter((p) => p.m && Number.isFinite(p.v) && p.v > 0);
  if (pts.length < 2) {
    return `<div class="chart-empty">Недостаточно точек для графика ${isRent ? 'аренды' : 'продаж'}</div>`;
  }
  const W = 720;
  const H = 220;
  const pad = { l: 54, r: 18, t: 18, b: 36 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const vals = pts.map((p) => p.v);
  const sorted = vals.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  // Scale so median sits near vertical center
  const dist = Math.max(Math.max(...vals) - median, median - Math.min(...vals), median * 0.04) * 1.25;
  let min = median - dist;
  let max = median + dist;
  if (min <= 0) min = Math.min(...vals) * 0.92;
  const n = pts.length;
  const x = (i) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v) => pad.t + ih - ((v - min) / (max - min)) * ih;
  const stroke = isRent ? '#3ecfcf' : '#d8c3a5';
  const fill = isRent ? 'rgba(62,207,207,.10)' : 'rgba(216,195,165,.10)';
  const medY = y(median);
  const lastPt = { x: x(n - 1), y: y(pts[n - 1].v), v: pts[n - 1].v };
  const vsMedPct = median ? Math.round(((lastPt.v - median) / median) * 1000) / 10 : 0;
  const dropBelow = lastPt.v < median;
  const bandFill = dropBelow ? 'rgba(255,122,122,.38)' : 'rgba(94,228,168,.28)';
  const bandStroke = dropBelow ? '#ff7a7a' : '#5ee4a8';
  const bandTop = Math.min(medY, lastPt.y);
  const bandH = Math.max(Math.abs(medY - lastPt.y), 2);
  const bandX = Math.max(pad.l, lastPt.x - iw * 0.16);
  const bandW = W - pad.r - bandX;
  const dropLabel =
    vsMedPct === 0 ? '0%' : dropBelow ? `↓ ${vsMedPct}%` : `↑ +${vsMedPct}%`;

  let grid = '';
  for (let k = 0; k <= 4; k++) {
    const v = min + ((max - min) * k) / 4;
    const yy = y(v);
    grid += `<line x1="${pad.l}" y1="${yy}" x2="${W - pad.r}" y2="${yy}" stroke="rgba(255,255,255,.07)"/>
      <text x="${pad.l - 8}" y="${yy + 3}" fill="#8aa3ad" font-size="10" text-anchor="end">${esc(fmtAxis(v, isRent))}</text>`;
  }

  const line = pts
    .map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`)
    .join(' ');
  const area =
    `M${x(0).toFixed(1)},${(pad.t + ih).toFixed(1)} ` +
    pts.map((p, i) => `L${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ') +
    ` L${x(n - 1).toFixed(1)},${(pad.t + ih).toFixed(1)} Z`;

  const medianLayer = `
    <line x1="${pad.l}" y1="${medY.toFixed(1)}" x2="${W - pad.r}" y2="${medY.toFixed(1)}"
      stroke="rgba(216,195,165,.85)" stroke-width="1.6" stroke-dasharray="5 4"/>
    <text x="${W - pad.r}" y="${(medY - 5).toFixed(1)}" fill="#d8c3a5" font-size="10" text-anchor="end" font-weight="700">med ${esc(fmt(Math.round(median)))}</text>
    <rect x="${bandX.toFixed(1)}" y="${bandTop.toFixed(1)}" width="${bandW.toFixed(1)}" height="${bandH.toFixed(1)}" fill="${bandFill}"/>
    <line x1="${lastPt.x.toFixed(1)}" y1="${medY.toFixed(1)}" x2="${lastPt.x.toFixed(1)}" y2="${lastPt.y.toFixed(1)}"
      stroke="${bandStroke}" stroke-width="2.2"/>
    <circle cx="${lastPt.x.toFixed(1)}" cy="${medY.toFixed(1)}" r="2.4" fill="#d8c3a5"/>
    <circle cx="${lastPt.x.toFixed(1)}" cy="${lastPt.y.toFixed(1)}" r="4" fill="${bandStroke}" stroke="#07131a" stroke-width="1.4"/>
    <text x="${(bandX + 8).toFixed(1)}" y="${(bandTop + Math.max(bandH / 2, 8) + 4).toFixed(1)}"
      fill="${bandStroke}" font-size="15" font-weight="800">${esc(dropLabel)}</text>
  `;

  const dots = pts
    .map((p, i) => {
      if (i === n - 1) return '';
      return `<circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="2.8" fill="${stroke}" opacity=".85">
          <title>${esc(p.m)} · ${esc(fmt(Math.round(p.v)))} AED/sqft · n=${p.n}</title>
        </circle>`;
    })
    .join('');

  const step = Math.max(1, Math.ceil((n - 1) / 5));
  let xlab = '';
  for (let i = 0; i < n; i++) {
    if (i !== 0 && i !== n - 1 && i % step !== 0) continue;
    const label = String(pts[i].m).slice(2);
    xlab += `<text x="${x(i)}" y="${H - 10}" fill="#8aa3ad" font-size="10" text-anchor="middle">${esc(label)}</text>`;
  }

  const first = pts[0].v;
  const last = pts[pts.length - 1].v;
  const delta = first ? Math.round(((last - first) / first) * 1000) / 10 : 0;
  const deltaCls = vsMedPct < 0 ? 'down' : vsMedPct > 0 ? 'up' : 'flat';
  const deltaTxt = `${delta > 0 ? '+' : ''}${delta}%`;
  const dropWord = dropBelow ? 'упало' : vsMedPct > 0 ? 'выросло' : 'как med';

  return `<div class="chart-card">
    <div class="chart-head">
      <div>
        <div class="chart-k">${isRent ? 'Rent' : 'Sale'} · median AED/sqft</div>
        <div class="chart-v">${esc(fmt(Math.round(last)))} <em>AED/sqft</em></div>
      </div>
      <div class="chart-delta chart-delta--${deltaCls}">
        <strong style="font-size:1.35rem;display:block;line-height:1.1">${esc(dropLabel)}</strong>
        <span>${esc(dropWord)} от медианы · med ${esc(fmt(Math.round(median)))} · period ${esc(deltaTxt)}</span>
      </div>
    </div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="auto" role="img" aria-label="${isRent ? 'Rent' : 'Sale'} AED/sqft vs median">
      ${grid}
      <path d="${area}" fill="${fill}"/>
      ${medianLayer}
      <path d="${line}" fill="none" stroke="${stroke}" stroke-width="2.4"/>
      ${dots}
      ${xlab}
    </svg>
    <div class="chart-tip">${esc(pts[0].m)} → ${esc(pts[pts.length - 1].m)} · ${pts.length} мес · последняя точка ${esc(dropLabel)} от медианы периода</div>
  </div>`;
}

function pickSeries(ppsDyn, deals, kind) {
  const fromDyn = ((ppsDyn && ppsDyn[kind]) || []).filter((p) => Number(p.med_pps) > 0);
  if (fromDyn.length >= 2) return fromDyn;
  return monthlyFromDeals(deals);
}

function rowsTable(rows, kind) {
  const isRent = kind === 'rent';
  const med = medianNum((rows || []).map((r) => Number(r.pps)));
  const body = (rows || [])
    .map((r) => {
      const v = vsMed(r.pps, med);
      return `<tr>
        <td>${esc(String(r.d || '').slice(0, 10))}</td>
        <td>${esc(r.rooms != null && r.rooms !== '' ? `${r.rooms} BR` : '—')}</td>
        <td>${esc(r.floor != null && r.floor !== '' ? r.floor : '—')}</td>
        <td>${esc(r.unit ? `#${r.unit}` : '—')}</td>
        <td class="num">${esc(fmtP(r.price, isRent))}</td>
        <td class="num">${r.pps ? esc(fmt(Math.round(Number(r.pps)))) : '—'}</td>
        <td class="vs vs--${v.tone}">${esc(v.txt)}</td>
        <td class="muted">${esc(isRent ? 'rent' : r.procedure || 'sale')}</td>
      </tr>`;
    })
    .join('');
  return `<div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Date</th><th>Rooms</th><th>Floor</th><th>Unit</th>
          <th>Price</th><th>AED/sqft</th><th>vs med</th><th>Type</th>
        </tr>
      </thead>
      <tbody>${body || '<tr><td colspan="8" class="muted">Нет транзакций</td></tr>'}</tbody>
    </table>
  </div>
  <p class="note">median AED/sqft = ${med != null ? fmt(Math.round(med)) : '—'} · rows ${fmt((rows || []).length)}</p>`;
}

function rentSearchHtml() {
  return `<div class="dld-search" id="rent-search-wrap">
    <label class="dld-search-l" for="rent-search">Поиск по DLD Rent</label>
    <input type="search" id="rent-search" class="dld-search-input" placeholder="Дата, rooms, floor, unit, цена, AED/sqft…" autocomplete="off" />
    <div class="dld-search-meta"><span id="rent-search-count"></span></div>
  </div>`;
}

function renderDldSubpageHtml(page) {
  const b = page.building || '—';
  const district = page.district || '—';
  const dld = page.dld_ticker || { sale: [], rent: [] };
  const pps = page.pps_dynamics || { sale: [], rent: [] };
  const saleSeries = pickSeries(pps, dld.sale, 'sale');
  const rentSeries = pickSeries(pps, dld.rent, 'rent');
  const base =
    'building_' +
    String(b)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 60);
  const splitHref = `${base}_b_split.html`;
  const heroBlock = buildingHeroHtml(page, {
    kicker: `DLD · ${district}`,
    h1: (page.seo && page.seo.h1) || b,
    saleHref: '#sale',
    rentHref: '#rent',
  });

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DLD · ${esc(b)} · Refty</title>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Manrope:wght@500;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg:#07131a; --card:#0d1c24; --elev:#132830; --line:#1c3340;
      --text:#eef6f4; --muted:#8aa3ad; --sand:#d8c3a5; --sea:#3ecfcf; --bad:#ff7a7a; --good:#5ee4a8;
    }
    * { box-sizing:border-box; }
    body { margin:0; font:14px/1.45 Manrope,system-ui,sans-serif; background:var(--bg); color:var(--text); }
    ${buildingHeroCss()}
    .wrap { max-width:1200px; margin:0 auto; padding:20px 16px 40px; }
    .page-title { margin:0 0 4px; font-family:Fraunces,serif; font-size:clamp(1.35rem,2.5vw,1.75rem); }
    .sub { color:var(--muted); margin:0 0 12px; }
    .nav { display:flex; flex-wrap:wrap; gap:8px; margin:0 0 16px; }
    .nav a, .nav button {
      min-height:40px; padding:0 14px; border-radius:999px; border:1px solid var(--line);
      background:var(--card); color:var(--muted); font:inherit; font-weight:700; cursor:pointer; text-decoration:none;
      display:inline-flex; align-items:center;
    }
    .nav .is-on { background:var(--sand); color:#1a1208; border-color:var(--sand); }
    .nav .is-on.rent { background:var(--sea); color:#031016; border-color:var(--sea); }
    .panel { display:none; }
    .panel.is-on { display:block; }
    .chart-card {
      margin:0 0 14px; padding:14px 16px 12px; border-radius:16px; border:1px solid var(--line);
      background:var(--card);
    }
    .chart-head { display:flex; justify-content:space-between; align-items:flex-end; gap:12px; margin-bottom:8px; }
    .chart-k { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); font-weight:800; }
    .chart-v { font-size:1.45rem; font-weight:800; font-variant-numeric:tabular-nums; margin-top:2px; }
    .chart-v em { font-style:normal; font-size:12px; color:var(--muted); font-weight:700; margin-left:4px; }
    .chart-delta { font-weight:800; font-size:14px; text-align:right; }
    .chart-delta span { display:block; font-size:11px; color:var(--muted); font-weight:650; }
    .chart-delta--up { color:var(--good); }
    .chart-delta--down { color:var(--bad); }
    .chart-delta--flat { color:var(--muted); }
    .chart-card svg { display:block; width:100%; height:auto; }
    .chart-tip { margin-top:6px; font-size:12px; color:var(--muted); }
    .chart-empty { padding:28px 12px; text-align:center; color:var(--muted); border:1px dashed var(--line); border-radius:14px; margin-bottom:14px; }
    .table-wrap {
      border:1px solid var(--line); border-radius:16px; overflow:auto; max-height:70vh;
      background:var(--card);
    }
    table { width:100%; border-collapse:collapse; font-variant-numeric:tabular-nums; }
    th, td { padding:10px 12px; text-align:left; border-bottom:1px solid var(--line); white-space:nowrap; }
    th { position:sticky; top:0; background:#102028; font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
    tr:hover td { background:var(--elev); }
    .num { font-weight:750; }
    .vs--down { color:var(--bad); font-weight:800; }
    .vs--up { color:var(--good); font-weight:800; }
    .muted { color:var(--muted); }
    .note { margin-top:10px; font-size:12px; color:var(--muted); }
    .dld-search {
      margin:14px 0 12px; padding:12px 14px; border-radius:14px; border:1px solid var(--line);
      background:var(--card); display:grid; gap:8px;
    }
    .dld-search-l { font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); font-weight:800; }
    .dld-search-input {
      width:100%; box-sizing:border-box; min-height:44px; padding:10px 14px; border-radius:12px;
      border:1px solid var(--line); background:#0a141a; color:var(--text); font:inherit; font-size:14px; font-weight:650;
    }
    .dld-search-input:focus { outline:none; border-color:var(--sea); box-shadow:0 0 0 3px rgba(62,207,207,.15); }
    .dld-search-input::placeholder { color:#5f7380; }
    .dld-search-meta { font-size:12px; color:var(--muted); font-weight:650; }
    .table-wrap tr.is-hide { display:none; }
  </style>
</head>
<body>
  ${heroBlock}
  <div class="wrap">
    <h2 class="page-title">DLD transactions · ${esc(b)}</h2>
    <p class="sub">${esc(district)} · sale ${fmt((dld.sale || []).length)} · rent ${fmt((dld.rent || []).length)}</p>
    <div class="nav">
      <a href="${esc(splitHref)}">← Split Desk</a>
      <button type="button" class="is-on" data-panel="sale">DLD Sale</button>
      <button type="button" data-panel="rent">DLD Rent</button>
    </div>
    <section class="panel is-on" id="panel-sale">
      ${dldChartSvg(saleSeries, 'sale')}
      ${rowsTable(dld.sale, 'sale')}
    </section>
    <section class="panel" id="panel-rent">
      ${dldChartSvg(rentSeries, 'rent')}
      ${rowsTable(dld.rent, 'rent')}
      ${rentSearchHtml()}
    </section>
  </div>
  <script>
  (function(){
    function show(kind){
      document.querySelectorAll('.panel').forEach(function(p){ p.classList.toggle('is-on', p.id==='panel-'+kind); });
      document.querySelectorAll('.nav button[data-panel]').forEach(function(b){
        var on = b.getAttribute('data-panel')===kind;
        b.classList.toggle('is-on', on);
        b.classList.toggle('rent', on && kind==='rent');
      });
      try { history.replaceState(null,'','#'+kind); } catch(e){}
    }
    document.querySelectorAll('.nav button[data-panel]').forEach(function(b){
      b.onclick=function(){ show(b.getAttribute('data-panel')); };
    });
    document.querySelectorAll('a.dld-full').forEach(function(a){
      a.addEventListener('click', function(e){
        var href = a.getAttribute('href') || '';
        if (href.charAt(0) === '#') {
          e.preventDefault();
          show(href.slice(1) === 'rent' ? 'rent' : 'sale');
          var wrap = document.querySelector('.wrap');
          if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
    var h=(location.hash||'').replace('#','');
    show(h==='rent'?'rent':'sale');

    var rentInput = document.getElementById('rent-search');
    var rentCount = document.getElementById('rent-search-count');
    function filterRent(){
      var panel = document.getElementById('panel-rent');
      if (!panel || !rentInput) return;
      var q = String(rentInput.value || '').trim().toLowerCase();
      var rows = panel.querySelectorAll('.table-wrap tbody tr');
      var shown = 0;
      rows.forEach(function(tr){
        if (tr.querySelector('td[colspan]')) { tr.classList.remove('is-hide'); return; }
        var hay = (tr.textContent || '').toLowerCase().replace(/\\s+/g, ' ');
        var ok = !q || hay.indexOf(q) !== -1;
        tr.classList.toggle('is-hide', !ok);
        if (ok) shown++;
      });
      if (rentCount) {
        rentCount.textContent = q
          ? ('Найдено ' + shown + ' из ' + rows.length)
          : (rows.length + ' транзакций');
      }
    }
    if (rentInput) {
      rentInput.addEventListener('input', filterRent);
      filterRent();
    }
  })();
  </script>
</body>
</html>`;
}

module.exports = { renderDldSubpageHtml, rowsTable };

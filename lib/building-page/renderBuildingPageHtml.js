/**
 * Building page — elevator scroll (floors high→low) · center unit with all photos · pin details
 */

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

function sparkPolyline(series) {
  const vals = (series || []).map((p) => Number(p.med_pps) || 0);
  if (!vals.length) return { poly: '', first: null, last: null, deltaPct: null };
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const poly = vals
    .map((v, i) => {
      const x = vals.length === 1 ? 50 : (i / (vals.length - 1)) * 100;
      const y = 92 - ((v - min) / span) * 78;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const first = vals[0];
  const last = vals[vals.length - 1];
  const deltaPct = first ? Math.round(((last - first) / first) * 1000) / 10 : null;
  return { poly, first, last, deltaPct };
}

function ppsCardHtml(title, series) {
  const s = sparkPolyline(series);
  const delta = s.deltaPct == null ? '—' : `${s.deltaPct > 0 ? '+' : ''}${s.deltaPct}%`;
  const tone = s.deltaPct == null ? 'flat' : s.deltaPct > 0 ? 'up' : s.deltaPct < 0 ? 'down' : 'flat';
  const fromTo =
    s.first != null && s.last != null ? `${fmt(Math.round(s.first))} → ${fmt(Math.round(s.last))}` : '—';
  return `<div class="t-card pps-card">
    <div class="t-label">${esc(title)}</div>
    <div class="pps-head">
      <div class="t-value">${s.last != null ? esc(fmt(Math.round(s.last))) : '—'}<span class="unit"> AED/sqft</span></div>
      <div class="delta delta--${tone}">${esc(delta)}</div>
    </div>
    <div class="spark" aria-hidden="true"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline fill="none" stroke="currentColor" stroke-width="2.4" points="${s.poly}" /></svg></div>
    <div class="t-note">${esc(fromTo)} · 12 мес · median</div>
  </div>`;
}

/** Month-over-month % change of median pps */
function momPctSeries(series) {
  const rows = series || [];
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = Number(rows[i - 1].med_pps) || 0;
    const cur = Number(rows[i].med_pps) || 0;
    if (!prev) continue;
    out.push({
      m: rows[i].m,
      mom: Math.round(((cur - prev) / prev) * 1000) / 10,
    });
  }
  return out;
}

/** Rebase to 100 at first month */
function index100Series(series) {
  const rows = series || [];
  const base = Number(rows[0]?.med_pps) || 0;
  if (!base) return [];
  return rows.map((r) => ({
    m: r.m,
    idx: Math.round(((Number(r.med_pps) || 0) / base) * 1000) / 10,
  }));
}

function momBarsSvg(momRows) {
  if (!momRows.length) return '';
  const vals = momRows.map((r) => r.mom);
  const maxAbs = Math.max(...vals.map(Math.abs), 1);
  const w = 100;
  const h = 100;
  const zeroY = 50;
  const gap = 2;
  const barW = Math.max(2, (w - gap * (vals.length + 1)) / vals.length);
  const rects = vals
    .map((v, i) => {
      const x = gap + i * (barW + gap);
      const bh = (Math.abs(v) / maxAbs) * 42;
      const y = v >= 0 ? zeroY - bh : zeroY;
      const fill = v > 0 ? 'var(--bad)' : v < 0 ? 'var(--good)' : 'var(--muted)';
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(bh, 0.8).toFixed(1)}" fill="${fill}" rx="0.8" />`;
    })
    .join('');
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><line x1="0" y1="${zeroY}" x2="${w}" y2="${zeroY}" stroke="rgba(255,255,255,.18)" stroke-width="1" />${rects}</svg>`;
}

function dualIndexSvg(saleIdx, rentIdx) {
  const months = [...new Set([...saleIdx.map((r) => r.m), ...rentIdx.map((r) => r.m)])].sort();
  if (months.length < 2) return '';
  const saleMap = Object.fromEntries(saleIdx.map((r) => [r.m, r.idx]));
  const rentMap = Object.fromEntries(rentIdx.map((r) => [r.m, r.idx]));
  const vals = months.flatMap((m) => [saleMap[m], rentMap[m]].filter((v) => v != null));
  const min = Math.min(...vals, 90);
  const max = Math.max(...vals, 110);
  const span = max - min || 1;
  const poly = (map) =>
    months
      .map((m, i) => {
        const v = map[m];
        if (v == null) return null;
        const x = months.length === 1 ? 50 : (i / (months.length - 1)) * 100;
        const y = 92 - ((v - min) / span) * 78;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none">
    <polyline fill="none" stroke="var(--accent)" stroke-width="2.2" points="${poly(saleMap)}" />
    <polyline fill="none" stroke="#60a5fa" stroke-width="2.2" stroke-dasharray="3 2" points="${poly(rentMap)}" />
  </svg>`;
}

function growthTempoSectionHtml(pps) {
  const saleMom = momPctSeries(pps.sale);
  const rentMom = momPctSeries(pps.rent);
  const saleIdx = index100Series(pps.sale);
  const rentIdx = index100Series(pps.rent);

  const lastMom = (rows) => {
    if (!rows.length) return { txt: '—', tone: 'flat' };
    const v = rows[rows.length - 1].mom;
    return {
      txt: `${v > 0 ? '+' : ''}${v}%`,
      tone: v > 0 ? 'up' : v < 0 ? 'down' : 'flat',
    };
  };
  const sMom = lastMom(saleMom);
  const rMom = lastMom(rentMom);
  const lastIdxS = saleIdx.length ? saleIdx[saleIdx.length - 1].idx : null;
  const lastIdxR = rentIdx.length ? rentIdx[rentIdx.length - 1].idx : null;

  return `<section class="growth" aria-label="Growth tempo charts">
    <div class="t-card pps-card growth-card">
      <div class="t-label">Темп · MoM Sale</div>
      <div class="pps-head">
        <div class="t-value">${esc(sMom.txt)}<span class="unit"> last mo</span></div>
        <div class="delta delta--${sMom.tone}">MoM %</div>
      </div>
      <div class="spark spark--bars" aria-hidden="true">${momBarsSvg(saleMom)}</div>
      <div class="t-note">месяц к месяцу · median AED/sqft sale</div>
    </div>
    <div class="t-card pps-card growth-card">
      <div class="t-label">Темп · MoM Rent</div>
      <div class="pps-head">
        <div class="t-value">${esc(rMom.txt)}<span class="unit"> last mo</span></div>
        <div class="delta delta--${rMom.tone}">MoM %</div>
      </div>
      <div class="spark spark--bars" aria-hidden="true">${momBarsSvg(rentMom)}</div>
      <div class="t-note">месяц к месяцу · median AED/sqft rent</div>
    </div>
    <div class="t-card pps-card growth-card">
      <div class="t-label">Индекс 100 · Sale vs Rent</div>
      <div class="pps-head">
        <div class="t-value">${lastIdxS != null ? esc(String(lastIdxS)) : '—'}<span class="unit"> sale</span></div>
        <div class="delta delta--flat">${lastIdxR != null ? `rent ${lastIdxR}` : '—'}</div>
      </div>
      <div class="spark" aria-hidden="true">${dualIndexSvg(saleIdx, rentIdx)}</div>
      <div class="t-note"><span class="leg leg--sale">sale</span> · <span class="leg leg--rent">rent</span> · база 100 = первый месяц</div>
    </div>
  </section>`;
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
      rows: rows.slice(0, 15).sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)),
    }));
}

function shortDesc(text, n = 160) {
  const t = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return 'Нет описания — открой unit для деталей.';
  return t.length > n ? `${t.slice(0, n).trim()}…` : t;
}

function renderBuildingPageHtml(page) {
  const b = page.building || '—';
  const district = page.district || '—';
  const date = String(page.generated_at || new Date().toISOString()).slice(0, 10);
  const pps = page.pps_dynamics || { sale: [], rent: [] };
  const sale = page.listings_sale || [];
  const rent = page.listings_rent || [];
  const buildingFloors =
    page.building_floors || Math.max(...sale.concat(rent).map((r) => Number(r.floor) || 0), 0);
  const seo = page.seo || {};
  const reviews = page.reviews || [];
  const blog = page.blog || [];
  const tplIndex =
    'building_' +
    String(b)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 60) +
    '_templates.html';

  const payload = {
    building: b,
    district,
    buildingFloors,
    sale: groupByFloor(sale),
    rent: groupByFloor(rent),
  };

  const reviewHtml = reviews
    .map(
      (rv) => `<article class="review">
      <div class="review-media">${rv.photo ? `<img src="${esc(rv.photo)}" alt="" width="160" height="120" loading="lazy" decoding="async" />` : ''}</div>
      <div class="review-body">
        <div class="review-top"><strong>${esc(rv.author || 'Resident')}</strong><span class="stars">${'★'.repeat(Math.min(5, Number(rv.rating) || 5))}</span></div>
        <p>${esc(rv.text)}</p>
        <span class="review-meta">${esc(rv.meta || '')}</span>
      </div>
    </article>`
    )
    .join('\n');

  const blogHtml = (blog || [])
    .map(
      (a) => `<a class="blog-card" href="${esc(a.href || '#')}"><span class="blog-kicker">${esc(a.kicker || 'Article')}</span><strong>${esc(a.title)}</strong><span class="blog-meta">${esc(a.meta || '')}</span></a>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${esc(b)} · Elevator · Refty</title>
  <meta name="description" content="${esc(seo.meta_description || `${b} ${district}`)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg:#07090d; --elev:#0c1016; --card:#121820; --card2:#171e28;
      --line:#1e2836; --line2:#2a3548; --text:#f2f5f8; --muted:#8b97a8;
      --accent:#efff00; --good:#36d399; --warn:#fbbf24; --bad:#f87171;
      --focus:#efff00; --safe-b: env(safe-area-inset-bottom, 0px);
      --cabin-h: min(78vh, 720px);
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin:0; font-family:Inter,system-ui,sans-serif; color:var(--text);
      background:
        radial-gradient(900px 420px at 8% -8%, rgba(239,255,0,.07), transparent 55%),
        radial-gradient(700px 360px at 100% 0%, rgba(54,211,153,.05), transparent 50%),
        var(--bg);
      line-height:1.45;
    }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; text-underline-offset:3px; }
    :focus-visible { outline:2px solid var(--focus); outline-offset:3px; }
    img { display:block; max-width:100%; object-fit:cover; }
    .wrap { max-width:1280px; margin:0 auto; padding:16px 14px calc(36px + var(--safe-b)); }

    .traffic { display:grid; grid-template-columns:1.15fr 1.15fr auto; gap:10px; margin-bottom:10px; }
    .growth { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; margin-bottom:12px; }
    .t-card,.t-pill { background:linear-gradient(160deg,var(--card2),var(--card)); border:1px solid var(--line); border-radius:16px; padding:14px 16px; }
    .t-label { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); font-weight:600; }
    .t-value { margin-top:4px; font-size:clamp(1.15rem,2.2vw,1.55rem); font-weight:800; letter-spacing:-.03em; font-variant-numeric:tabular-nums; }
    .t-value .unit { font-size:.45em; color:var(--muted); font-weight:600; margin-left:4px; }
    .t-note { margin-top:6px; font-size:12px; color:var(--muted); }
    .pps-head { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
    .delta { font-size:13px; font-weight:800; padding:4px 8px; border-radius:999px; }
    .delta--down { color:var(--good); background:rgba(54,211,153,.12); }
    .delta--up { color:var(--bad); background:rgba(248,113,113,.12); }
    .delta--flat { color:var(--muted); background:var(--elev); }
    .pps-card .spark { margin-top:10px; height:52px; color:var(--accent); background:var(--elev); border:1px solid var(--line); border-radius:10px; padding:6px 8px; }
    .pps-card .spark svg { width:100%; height:100%; display:block; }
    .spark--bars { padding:4px 6px; }
    .leg { font-weight:700; }
    .leg--sale { color:var(--accent); }
    .leg--rent { color:#60a5fa; }
    .t-pill { display:flex; flex-direction:column; justify-content:center; min-width:130px; text-align:center; border-color:rgba(239,255,0,.35); background:rgba(239,255,0,.08); }
    .t-pill strong { font-size:1.2rem; color:var(--accent); }
    .t-pill span { font-size:11px; color:var(--muted); }

    .hero {
      display:flex; flex-wrap:wrap; gap:12px; justify-content:space-between; align-items:flex-end;
      background:var(--card); border:1px solid var(--line); border-radius:16px; padding:14px 16px; margin-bottom:12px;
    }
    .hero h1 { margin:0; font-size:clamp(1.35rem,2.5vw,1.85rem); letter-spacing:-.03em; font-weight:800; }
    .hero .sub { margin-top:4px; color:var(--muted); font-size:13px; }
    .tabs { display:flex; gap:6px; }
    .tab {
      min-height:44px; min-width:108px; padding:0 16px; border-radius:999px; border:1px solid var(--line2);
      background:var(--elev); color:var(--muted); font:inherit; font-size:13px; font-weight:700; cursor:pointer;
    }
    .tab.is-on { background:var(--accent); color:#0a0c00; border-color:var(--accent); }

    /* ELEVATOR STAGE */
    .elevator {
      display:grid; grid-template-columns:76px minmax(0,1fr); gap:12px; align-items:stretch;
      margin-bottom:14px;
    }
    .shaft {
      position:sticky; top:10px; height:var(--cabin-h); max-height:calc(100vh - 20px);
      background:var(--card); border:1px solid var(--line); border-radius:18px; padding:8px 6px;
      display:flex; flex-direction:column; overflow:hidden;
    }
    .shaft-label { font-size:9px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); text-align:center; font-weight:700; padding:4px 0 8px; }
    .shaft-scroll { flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:4px; scrollbar-width:thin; }
    .floor-btn {
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      min-height:44px; border-radius:12px; border:1px solid transparent; background:var(--elev);
      color:var(--text); cursor:pointer; font:inherit; padding:6px 4px;
    }
    .floor-btn strong { font-size:14px; font-weight:800; line-height:1; }
    .floor-btn span { font-size:10px; color:var(--muted); margin-top:2px; }
    .floor-btn.is-on, .floor-btn:hover { border-color:rgba(239,255,0,.45); background:rgba(239,255,0,.1); color:var(--accent); }
    .floor-btn.is-on span { color:rgba(239,255,0,.8); }
    .cab-lamp {
      margin-top:8px; text-align:center; font-size:11px; font-weight:800; color:var(--accent);
      padding:8px 4px; border-radius:10px; border:1px solid rgba(239,255,0,.3); background:rgba(239,255,0,.08);
    }

    .cabin-wrap {
      background:var(--card); border:1px solid var(--line); border-radius:18px; overflow:hidden;
      height:var(--cabin-h); position:relative;
    }
    .cabins {
      height:100%; overflow-y:auto; scroll-snap-type:y mandatory; scroll-behavior:smooth;
      scrollbar-width:thin;
    }
    .cabin {
      height:var(--cabin-h); scroll-snap-align:start; scroll-snap-stop:always;
      display:grid; grid-template-rows:auto minmax(0,1fr); padding:12px 14px 14px; border-bottom:1px solid var(--line);
      position:relative;
    }
    .cabin-head {
      display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px;
    }
    .cabin-head h2 { margin:0; font-size:1.05rem; font-weight:800; }
    .cabin-head h2 em { font-style:normal; color:var(--accent); }
    .cabin-head .meta { font-size:12px; color:var(--muted); }

    .unit-strip {
      display:flex; gap:8px; overflow-x:auto; padding-bottom:10px; margin-bottom:10px;
      scroll-snap-type:x proximity; scrollbar-width:thin;
    }
    .unit-chip {
      flex:0 0 auto; width:72px; border-radius:12px; border:1px solid var(--line2); background:var(--elev);
      overflow:hidden; cursor:pointer; padding:0; font:inherit; color:inherit; text-align:left;
    }
    .unit-chip img { width:72px; height:54px; object-fit:cover; background:#0a0e14; }
    .unit-chip .chip-meta { padding:5px 6px; font-size:10px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .unit-chip.is-on { border-color:var(--accent); box-shadow:0 0 0 1px rgba(239,255,0,.35); }

    .focus {
      display:grid; grid-template-columns:minmax(0,1.35fr) minmax(240px,.85fr); gap:14px; min-height:0; height:100%;
    }
    .gallery {
      position:relative; border-radius:14px; overflow:hidden; background:var(--elev); border:1px solid var(--line);
      min-height:280px; height:100%;
    }
    .gallery-track {
      display:flex; height:100%; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none;
    }
    .gallery-track::-webkit-scrollbar { display:none; }
    .gallery-track img {
      flex:0 0 100%; width:100%; height:100%; object-fit:cover; scroll-snap-align:center; background:#0a0e14;
    }
    .gallery-nav {
      position:absolute; inset:auto 10px 10px; display:flex; justify-content:space-between; gap:8px; pointer-events:none;
    }
    .gallery-nav button, .pin-btn, .open-btn {
      pointer-events:auto; min-width:44px; min-height:40px; border-radius:10px; border:1px solid rgba(239,255,0,.35);
      background:rgba(7,9,13,.75); color:var(--accent); font:inherit; font-weight:700; cursor:pointer; backdrop-filter:blur(6px);
    }
    .gallery-dots {
      position:absolute; left:50%; bottom:12px; transform:translateX(-50%);
      display:flex; gap:5px; pointer-events:none;
    }
    .gallery-dots i { width:6px; height:6px; border-radius:50%; background:rgba(255,255,255,.35); }
    .gallery-dots i.on { background:var(--accent); }

    .focus-copy {
      display:flex; flex-direction:column; gap:10px; min-height:0; overflow:auto;
      background:var(--elev); border:1px solid var(--line); border-radius:14px; padding:14px;
    }
    .focus-copy .price { font-size:1.35rem; font-weight:800; color:var(--accent); letter-spacing:-.02em; }
    .focus-copy .title { font-size:1rem; font-weight:750; }
    .focus-copy .desc { font-size:13px; color:var(--muted); margin:0; }
    .signal-box {
      margin-top:10px; padding:10px 12px; border-radius:12px; background:var(--elev); border:1px solid var(--line);
      display:grid; gap:8px;
    }
    .signal-box .sig-head {
      display:flex; justify-content:space-between; gap:8px; align-items:center;
      font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); font-weight:700;
    }
    .signal-box .sig-spark { height:36px; color:var(--accent); }
    .signal-box .sig-spark svg { width:100%; height:100%; display:block; }
    .signal-box .sig-steps, .signal-box .sig-listers { margin:0; padding:0; list-style:none; display:grid; gap:4px; }
    .signal-box .sig-steps li, .signal-box .sig-listers li {
      display:grid; grid-template-columns:72px 1fr auto; gap:8px; align-items:baseline;
      font-size:12px; font-variant-numeric:tabular-nums;
    }
    .signal-box .sig-listers li { grid-template-columns:1fr auto; }
    .signal-box .sig-steps .d, .signal-box .muted { color:var(--muted); }
    .signal-box .sig-steps .who { color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .pin-body .signal-box { margin-top:14px; }
    .pin-body .signal-box .sig-steps li { grid-template-columns:78px minmax(0,1fr) auto; }
    .stats { display:flex; flex-wrap:wrap; gap:6px; }
    .stats span {
      display:inline-flex; align-items:center; min-height:28px; padding:0 9px; border-radius:999px;
      background:var(--card); border:1px solid var(--line2); font-size:11px; font-weight:600; color:var(--muted);
    }
    .stats span b { color:var(--text); margin-left:4px; font-weight:750; }
    .actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:auto; }
    .pin-btn.is-pinned { background:var(--accent); color:#0a0c00; border-color:var(--accent); }
    .open-btn { text-decoration:none; display:inline-flex; align-items:center; justify-content:center; }

    /* PINNED OVERLAY */
    .pin-layer {
      position:absolute; inset:0; background:rgba(7,9,13,.88); backdrop-filter:blur(8px);
      z-index:5; display:none; padding:16px; overflow:auto;
    }
    .pin-layer.is-on { display:block; }
    .pin-card {
      max-width:920px; margin:0 auto; background:var(--card); border:1px solid var(--line2);
      border-radius:18px; overflow:hidden;
    }
    .pin-top { display:flex; justify-content:space-between; gap:10px; align-items:center; padding:12px 14px; border-bottom:1px solid var(--line); }
    .pin-grid { display:grid; grid-template-columns:1.2fr .8fr; gap:0; }
    .pin-photos { display:grid; grid-template-columns:repeat(3,1fr); gap:4px; padding:8px; max-height:420px; overflow:auto; }
    .pin-photos img { width:100%; height:110px; border-radius:8px; background:#0a0e14; }
    .pin-photos img:first-child { grid-column:1 / -1; height:220px; }
    .pin-body { padding:16px; border-left:1px solid var(--line); }
    .pin-body h3 { margin:0 0 8px; font-size:1.2rem; }
    .pin-body p { color:var(--muted); font-size:13px; }
    .close-pin {
      min-width:44px; min-height:40px; border-radius:10px; border:1px solid var(--line2);
      background:var(--elev); color:var(--text); font:inherit; font-weight:700; cursor:pointer;
    }

    .seo-block,.reviews-block,.blog-block { margin-top:14px; background:var(--card); border:1px solid var(--line); border-radius:16px; padding:18px; }
    .seo-block h2,.reviews-block h2,.blog-block h2 { margin:0 0 12px; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); }
    .seo-block h3 { margin:0 0 8px; font-size:1.15rem; }
    .seo-block p { margin:0 0 12px; color:var(--muted); font-size:14px; max-width:75ch; }
    .seo-chips { display:flex; flex-wrap:wrap; gap:8px; }
    .seo-chips span { display:inline-flex; align-items:center; min-height:34px; padding:0 12px; border-radius:999px; background:var(--elev); border:1px solid var(--line2); font-size:12px; font-weight:600; }
    .reviews-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; }
    .review { display:grid; grid-template-columns:100px 1fr; gap:12px; padding:12px; border-radius:14px; background:var(--elev); border:1px solid var(--line); }
    .review-media { border-radius:10px; overflow:hidden; height:80px; background:var(--bg); }
    .review-media img { width:100%; height:80px; }
    .review-top { display:flex; justify-content:space-between; gap:8px; }
    .stars { color:var(--accent); font-size:12px; }
    .review-body p { margin:6px 0; font-size:13px; }
    .review-meta { font-size:11px; color:var(--muted); }
    .blog-list { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:8px; }
    .blog-card { display:grid; gap:2px; padding:12px; border-radius:12px; background:var(--elev); border:1px solid var(--line); color:inherit; text-decoration:none; }
    .blog-kicker { font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--accent); font-weight:700; }
    .blog-meta { font-size:12px; color:var(--muted); }
    .foot-note { margin-top:12px; font-size:11px; color:var(--muted); }
    .tpl-tag { position:fixed; right:12px; bottom:calc(12px + var(--safe-b)); z-index:30;
      background:var(--accent); color:#0a0c00; font-weight:800; font-size:11px; padding:8px 12px; border-radius:999px; text-decoration:none; }
    .empty { color:var(--muted); padding:40px; text-align:center; }

    @media (max-width:980px) {
      .traffic { grid-template-columns:1fr 1fr; }
      .growth { grid-template-columns:1fr 1fr; }
      .t-pill { grid-column:1/-1; border-radius:16px; flex-direction:row; justify-content:space-between; }
      .focus { grid-template-columns:1fr; }
      .pin-grid { grid-template-columns:1fr; }
      .pin-body { border-left:0; border-top:1px solid var(--line); }
      :root { --cabin-h: min(88vh, 820px); }
    }
    @media (max-width:640px) {
      .traffic { grid-template-columns:1fr; }
      .growth { grid-template-columns:1fr; }
      .elevator { grid-template-columns:60px 1fr; }
      .review { grid-template-columns:72px 1fr; }
    }
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior:auto; }
      .cabins { scroll-behavior:auto; }
      *,*::before,*::after { animation-duration:.01ms !important; transition-duration:.01ms !important; }
    }
  </style>
</head>
<body>
  <a class="tpl-tag" href="${esc(tplIndex)}">Templates ▾</a>
  <div class="wrap">
    <section class="traffic" aria-label="Price per sqft dynamics">
      ${ppsCardHtml('Sale · AED / sqft', pps.sale || [])}
      ${ppsCardHtml('Rent · AED / sqft / yr', pps.rent || [])}
      <div class="t-pill"><strong>${buildingFloors || '—'}</strong><span>floors · elevator</span></div>
    </section>
    ${growthTempoSectionHtml(pps)}

    <header class="hero">
      <div>
        <h1>${esc(b)}</h1>
        <div class="sub">${esc(district)} · лифт по этажам · sale ${fmt(sale.length)} · rent ${fmt(rent.length)} · ${esc(date)}</div>
      </div>
      <div class="tabs" role="tablist">
        <button type="button" class="tab is-on" data-tab="sale" role="tab" aria-selected="true">for-sale</button>
        <button type="button" class="tab" data-tab="rent" role="tab" aria-selected="false">for-rent</button>
      </div>
    </header>

    <section class="elevator" aria-label="Elevator listings">
      <aside class="shaft" aria-label="Floor buttons">
        <div class="shaft-label">этажи</div>
        <div class="shaft-scroll" id="floor-buttons"></div>
        <div class="cab-lamp" id="cab-lamp">—</div>
      </aside>
      <div class="cabin-wrap">
        <div class="cabins" id="cabins" tabindex="0"></div>
        <div class="pin-layer" id="pin-layer" hidden>
          <div class="pin-card">
            <div class="pin-top">
              <strong id="pin-title">Pinned unit</strong>
              <button type="button" class="close-pin" id="close-pin" aria-label="Close pinned unit">Закрыть</button>
            </div>
            <div class="pin-grid">
              <div class="pin-photos" id="pin-photos"></div>
              <div class="pin-body" id="pin-body"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="seo-block">
      <h2>SEO · Dubai Marina</h2>
      <h3>${esc(seo.title || `${b} in Dubai Marina`)}</h3>
      ${(seo.paragraphs || []).map((p) => `<p>${p}</p>`).join('\n')}
      <div class="seo-chips">${(seo.chips || []).map((c) => `<span>${esc(c)}</span>`).join('')}</div>
    </section>

    <section class="reviews-block">
      <h2>Отзывы · с фото</h2>
      <div class="reviews-grid">${reviewHtml}</div>
    </section>

    <section class="blog-block">
      <h2>Blog · статьи</h2>
      <div class="blog-list">${blogHtml}</div>
    </section>
    <p class="foot-note">Refty elevator building page · scroll = descend floors · click unit = pin details</p>
  </div>

  <script type="application/json" id="elev-data">${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>
  <script>
    (function () {
      const data = JSON.parse(document.getElementById('elev-data').textContent);
      let tab = 'sale';
      let activeFloorId = null;
      let activeUnitKey = null;
      let pinned = null;

      const cabinsEl = document.getElementById('cabins');
      const buttonsEl = document.getElementById('floor-buttons');
      const lamp = document.getElementById('cab-lamp');
      const pinLayer = document.getElementById('pin-layer');
      const pinPhotos = document.getElementById('pin-photos');
      const pinBody = document.getElementById('pin-body');
      const pinTitle = document.getElementById('pin-title');

      function fmtPrice(p, purpose) {
        const x = Number(p);
        if (!x) return '—';
        if (String(purpose).includes('rent')) return x.toLocaleString('en-US') + ' AED/yr';
        return (x >= 1e6 ? (x/1e6).toFixed(2)+'M' : x.toLocaleString('en-US')) + ' AED';
      }
      function fmtP(p) {
        const x = Number(p);
        if (!x) return '—';
        return x >= 1e6 ? (x/1e6).toFixed(2)+'M' : x.toLocaleString('en-US');
      }
      function shortAgency(a) {
        a = String(a || '').trim();
        if (!a || a === '—') return '';
        return a.length > 28 ? a.slice(0, 26).trim() + '…' : a;
      }
      function sparkSignal(tl) {
        const vals = (tl || []).map((t) => Number(t.p) || 0);
        if (vals.length < 1) return '';
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const span = max - min || 1;
        const pts = vals.map((v, i) => {
          const x = vals.length === 1 ? 50 : (i / (vals.length - 1)) * 100;
          const y = 88 - ((v - min) / span) * 72;
          return x.toFixed(1) + ',' + y.toFixed(1);
        }).join(' ');
        return '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline fill="none" stroke="currentColor" stroke-width="2.4" points="'+pts+'" /></svg>';
      }
      function signalHtml(u, compact) {
        const s = u.signal;
        if (!s || (!(s.timeline && s.timeline.length) && !(s.listers && s.listers.length))) {
          return '<div class="signal-box"><div class="sig-head"><span>Refty Signal</span><span>нет истории</span></div></div>';
        }
        const delta = s.delta_pct == null ? '—' : ((s.delta_pct > 0 ? '+' : '') + s.delta_pct + '%');
        const feed = (s.events && s.events.length ? s.events : s.steps || []).slice(0, compact ? 5 : 10);
        const listers = (s.listers || []).slice(0, compact ? 3 : 6);
        const priceChanged = (s.steps || []).length > 1;
        return '<div class="signal-box">' +
          '<div class="sig-head"><span>Refty Signal · цена</span><span>'+delta+(priceChanged ? '' : ' flat')+' · '+(s.timeline||[]).length+' pts</span></div>' +
          (s.timeline && s.timeline.length > 1 ? '<div class="sig-spark" aria-hidden="true">'+sparkSignal(s.timeline)+'</div>' : '') +
          '<ul class="sig-steps">' + feed.map((t) =>
            '<li><span class="d">'+(t.d||'')+'</span><span class="who">'+(t.broker && t.broker !== '—' ? t.broker : shortAgency(t.agency) || (t.source||''))+(t.source ? ' <span class="muted">'+t.source.replace('property_finder','PF').replace('bayut','Bayut')+'</span>' : '')+'</span><span>'+fmtP(t.p)+'</span></li>'
          ).join('') + '</ul>' +
          (listers.length
            ? '<div class="sig-head" style="margin-top:4px"><span>Кто размещал</span><span>'+listers.length+'</span></div>' +
              '<ul class="sig-listers">' + listers.map((L) =>
                '<li><span><b>'+(L.broker||'—')+'</b>'+(L.agency && L.agency !== '—' ? ' · '+shortAgency(L.agency) : '') +
                  '<span class="muted"> · '+(L.sources||[]).map((x)=>x.replace('property_finder','PF').replace('bayut','Bayut')).join('/')+'</span></span>' +
                  '<span class="muted">'+(L.from||'')+(L.to && L.to !== L.from ? '→'+L.to.slice(5) : '')+'</span></li>'
              ).join('') + '</ul>'
            : '') +
        '</div>';
      }
      function unitLabel(u) {
        return [u.rooms, u.unit_number ? '#'+u.unit_number : null].filter(Boolean).join(' · ') || 'Unit';
      }
      function keyOf(floorId, idx) { return floorId + ':' + idx; }
      function shortDesc(t) {
        t = String(t || '').replace(/\\s+/g, ' ').trim();
        if (!t) return 'Нет описания — запинь unit для деталей.';
        return t.length > 180 ? t.slice(0,180).trim() + '…' : t;
      }

      function floors() { return data[tab] || []; }

      function renderButtons() {
        const fl = floors();
        buttonsEl.innerHTML = fl.map((f,i) =>
          '<button type="button" class="floor-btn'+(i===0?' is-on':'')+'" data-floor="'+f.id+'"><strong>'+f.label+'</strong><span>'+f.rows.length+'</span></button>'
        ).join('');
        buttonsEl.querySelectorAll('.floor-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-floor');
            const cabin = cabinsEl.querySelector('[data-floor="'+id+'"]');
            if (cabin) cabin.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        });
      }

      function renderCabins() {
        const fl = floors();
        if (!fl.length) {
          cabinsEl.innerHTML = '<div class="empty">Нет листингов</div>';
          return;
        }
        cabinsEl.innerHTML = fl.map((f, fi) => {
          const first = f.rows[0];
          return '<section class="cabin" data-floor="'+f.id+'" id="cabin-'+tab+'-'+f.id+'">' +
            '<div class="cabin-head"><h2>Floor <em>'+f.label+'</em></h2><div class="meta">'+f.rows.length+' units · swipe photos</div></div>' +
            '<div class="unit-strip" data-strip="'+f.id+'">' +
              f.rows.map((u, ui) => {
                const ph = (u.photos && u.photos[0]) || u.photo || '';
                return '<button type="button" class="unit-chip'+(ui===0?' is-on':'')+'" data-unit="'+keyOf(f.id,ui)+'">' +
                  (ph ? '<img src="'+ph+'" alt="" loading="lazy" decoding="async" width="72" height="54" />' : '<div style="height:54px;background:#0a0e14"></div>') +
                  '<div class="chip-meta">'+unitLabel(u)+'</div></button>';
              }).join('') +
            '</div>' +
            '<div class="focus" data-focus="'+f.id+'"></div>' +
          '</section>';
        }).join('');

        cabinsEl.querySelectorAll('.unit-chip').forEach((chip) => {
          chip.addEventListener('click', () => selectUnit(chip.getAttribute('data-unit'), false));
        });

        // default select first unit each floor for focus render
        fl.forEach((f) => selectUnit(keyOf(f.id, 0), true));
        activeFloorId = fl[0].id;
        lamp.textContent = fl[0].label;
      }

      function findUnit(unitKey) {
        const [floorId, idx] = unitKey.split(':');
        const floor = floors().find((f) => f.id === floorId);
        if (!floor) return null;
        return { floor, unit: floor.rows[Number(idx)], floorId, idx: Number(idx), unitKey };
      }

      function selectUnit(unitKey, silent) {
        const found = findUnit(unitKey);
        if (!found) return;
        activeUnitKey = unitKey;
        const strip = cabinsEl.querySelector('[data-strip="'+found.floorId+'"]');
        if (strip) {
          strip.querySelectorAll('.unit-chip').forEach((c) => c.classList.toggle('is-on', c.getAttribute('data-unit') === unitKey));
          const on = strip.querySelector('.unit-chip.is-on');
          if (on && !silent) on.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
        }
        renderFocus(found);
      }

      function renderFocus(found) {
        const u = found.unit;
        const focus = cabinsEl.querySelector('[data-focus="'+found.floorId+'"]');
        if (!focus) return;
        const photos = (u.photos && u.photos.length ? u.photos : (u.photo ? [u.photo] : []));
        const pvm = u.pvm_pct == null ? '—' : ((u.pvm_pct > 0 ? '+' : '') + u.pvm_pct + '%');
        focus.innerHTML =
          '<div class="gallery">' +
            '<div class="gallery-track" data-track="'+found.unitKey+'">' +
              (photos.length ? photos.map((ph) => '<img src="'+ph+'" alt="" loading="lazy" decoding="async" />').join('') : '<div class="empty">no photos</div>') +
            '</div>' +
            '<div class="gallery-nav">' +
              '<button type="button" data-prev="'+found.unitKey+'" aria-label="Prev photo">‹</button>' +
              '<button type="button" data-next="'+found.unitKey+'" aria-label="Next photo">›</button>' +
            '</div>' +
            '<div class="gallery-dots" data-dots="'+found.unitKey+'">' +
              photos.map((_,i) => '<i class="'+(i===0?'on':'')+'"></i>').join('') +
            '</div>' +
          '</div>' +
          '<div class="focus-copy">' +
            '<div class="title">'+unitLabel(u)+' · Floor '+(found.floor.label)+'</div>' +
            '<div class="price">'+fmtPrice(u.price, tab)+'</div>' +
            '<div class="stats">' +
              '<span>PvM <b>'+pvm+'</b></span>' +
              '<span>Score <b>'+(u.score != null ? u.score : '—')+'</b></span>' +
              '<span>Exp <b>'+(u.exp != null ? u.exp+'d' : '—')+'</b></span>' +
              '<span>CA <b>'+(u.ca != null ? u.ca : '—')+'</b></span>' +
            '</div>' +
            '<p class="desc">'+shortDesc(u.description || u.title)+'</p>' +
            '<div class="stats"><span>Broker <b>'+(u.broker || '—')+'</b></span><span class="mono">'+(u.permit_number || '')+'</span></div>' +
            signalHtml(u, true) +
            '<div class="actions">' +
              '<button type="button" class="pin-btn" data-pin="'+found.unitKey+'">📌 Запинить unit</button>' +
              (u.url ? '<a class="open-btn" href="'+u.url+'" target="_blank" rel="noopener">Open listing</a>' : '') +
            '</div>' +
          '</div>';

        const track = focus.querySelector('[data-track]');
        const dots = [...focus.querySelectorAll('[data-dots] i')];
        function syncDots() {
          if (!track || !photos.length) return;
          const i = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
          dots.forEach((d, di) => d.classList.toggle('on', di === i));
        }
        if (track) track.addEventListener('scroll', syncDots, { passive: true });
        focus.querySelector('[data-prev]')?.addEventListener('click', () => {
          track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' });
        });
        focus.querySelector('[data-next]')?.addEventListener('click', () => {
          track.scrollBy({ left: track.clientWidth, behavior: 'smooth' });
        });
        focus.querySelector('[data-pin]')?.addEventListener('click', () => pinUnit(found.unitKey));
      }

      function pinUnit(unitKey) {
        const found = findUnit(unitKey);
        if (!found) return;
        pinned = found;
        const u = found.unit;
        const photos = (u.photos && u.photos.length ? u.photos : (u.photo ? [u.photo] : []));
        pinTitle.textContent = unitLabel(u) + ' · Floor ' + found.floor.label;
        pinPhotos.innerHTML = photos.map((ph) => '<img src="'+ph+'" alt="" loading="lazy" decoding="async" />').join('') || '<div class="empty">no photos</div>';
        const pvm = u.pvm_pct == null ? '—' : ((u.pvm_pct > 0 ? '+' : '') + u.pvm_pct + '%');
        pinBody.innerHTML =
          '<h3>'+fmtPrice(u.price, tab)+'</h3>' +
          '<div class="stats" style="margin-bottom:10px">' +
            '<span>PvM <b>'+pvm+'</b></span><span>Score <b>'+(u.score??'—')+'</b></span><span>Exp <b>'+(u.exp!=null?u.exp+'d':'—')+'</b></span>' +
          '</div>' +
          '<p>'+String(u.description || u.title || 'Нет описания').replace(/</g,'&lt;')+'</p>' +
          '<p><b>'+(u.broker||'—')+'</b> · '+(u.agency||'')+'</p>' +
          '<p class="mono">'+(u.permit_number||'')+'</p>' +
          signalHtml(u, false) +
          (u.url ? '<p><a class="open-btn" href="'+u.url+'" target="_blank" rel="noopener">Open on portal</a></p>' : '');
        pinLayer.hidden = false;
        pinLayer.classList.add('is-on');
      }

      function unpin() {
        pinned = null;
        pinLayer.classList.remove('is-on');
        pinLayer.hidden = true;
      }
      document.getElementById('close-pin').addEventListener('click', unpin);
      pinLayer.addEventListener('click', (e) => { if (e.target === pinLayer) unpin(); });

      // Intersection: which floor cabin is in view
      let observer = null;
      function observeCabins() {
        if (observer) observer.disconnect();
        observer = new IntersectionObserver((entries) => {
          const visible = entries.filter((e) => e.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (!visible) return;
          const id = visible.target.getAttribute('data-floor');
          activeFloorId = id;
          lamp.textContent = id === 'na' ? 'n/a' : id;
          buttonsEl.querySelectorAll('.floor-btn').forEach((b) => b.classList.toggle('is-on', b.getAttribute('data-floor') === id));
          const onBtn = buttonsEl.querySelector('.floor-btn.is-on');
          if (onBtn) onBtn.scrollIntoView({ block: 'nearest' });
        }, { root: cabinsEl, threshold: [0.55] });
        cabinsEl.querySelectorAll('.cabin').forEach((c) => observer.observe(c));
      }

      function mount() {
        unpin();
        renderButtons();
        renderCabins();
        observeCabins();
        cabinsEl.scrollTop = 0;
      }

      document.querySelectorAll('.tab').forEach((t) => {
        t.addEventListener('click', () => {
          tab = t.getAttribute('data-tab');
          document.querySelectorAll('.tab').forEach((x) => {
            const on = x === t;
            x.classList.toggle('is-on', on);
            x.setAttribute('aria-selected', on ? 'true' : 'false');
          });
          mount();
        });
      });

      // keyboard elevator
      window.addEventListener('keydown', (e) => {
        if (pinLayer.classList.contains('is-on') && e.key === 'Escape') return unpin();
        const fl = floors();
        const idx = fl.findIndex((f) => f.id === activeFloorId);
        if (e.key === 'ArrowDown' || e.key === 'PageDown') {
          e.preventDefault();
          const next = fl[Math.min(fl.length - 1, idx + 1)];
          if (next) document.getElementById('cabin-'+tab+'-'+next.id)?.scrollIntoView({ behavior: 'smooth' });
        }
        if (e.key === 'ArrowUp' || e.key === 'PageUp') {
          e.preventDefault();
          const prev = fl[Math.max(0, idx - 1)];
          if (prev) document.getElementById('cabin-'+tab+'-'+prev.id)?.scrollIntoView({ behavior: 'smooth' });
        }
      });

      mount();
    })();
  </script>
</body>
</html>`;
}

module.exports = { renderBuildingPageHtml, esc, fmt, fmtM, groupByFloor, shortDesc };

/**
 * Shared building page hero (photo, Google rating, listings count, Sale/Rent AED/sqft, DLD tickers).
 */
const { esc, fmt, askDldCompareMini, dldTickerHtml, dldTickerCss } = require('./shared');

function median(arr) {
  const a = (arr || []).filter((x) => x != null && !Number.isNaN(Number(x))).map(Number).sort((x, y) => x - y);
  if (!a.length) return null;
  return a[Math.floor(a.length / 2)];
}

function starGlyphs(rating) {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  const filled = Math.min(5, Math.floor(r + 0.5));
  return { text: '★'.repeat(filled) + '☆'.repeat(5 - filled), value: r };
}

function googleRatingHtml(place) {
  if (!place) return '';
  if (place.rating == null) {
    if (!place.maps_url) return '';
    const label = place.note
      ? 'Google Maps · отзывы локации'
      : 'Open on Google Maps';
    return `<a class="google-rating" href="${esc(place.maps_url)}" target="_blank" rel="noopener noreferrer" title="${esc(place.note || 'Open on Google Maps')}"><span class="g-score">${esc(label)}</span></a>`;
  }
  const { text } = starGlyphs(place.rating);
  const n = place.reviews_count != null ? fmt(place.reviews_count) : null;
  const label = `${Number(place.rating).toFixed(1)} · ${n != null ? `${n} Google reviews` : 'Google'}`;
  const inner = `<span class="g-stars" aria-hidden="true">${esc(text)}</span><span class="g-score">${esc(label)}</span>`;
  if (place.maps_url) {
    return `<a class="google-rating" href="${esc(place.maps_url)}" target="_blank" rel="noopener noreferrer" title="Open on Google Maps">${inner}</a>`;
  }
  return `<div class="google-rating">${inner}</div>`;
}

function trustBitsHtml(stock) {
  const bits = [];
  if (stock?.developer) bits.push(esc(stock.developer));
  if (stock?.units != null) bits.push(`${fmt(stock.units)} units`);
  if (stock?.age_years != null) bits.push(`~${fmt(stock.age_years)}y`);
  if (!bits.length) return '';
  return `<div class="trust-bits">${bits.map((b) => `<span>${b}</span>`).join('<i>·</i>')}</div>`;
}

function buildingHeroCss() {
  return `
    .hero {
      position:relative; display:block; overflow:visible;
      background:#041018 center/cover no-repeat;
    }
    .hero-inner { padding:28px 20px 22px; max-width:1400px; width:100%; margin:0 auto; }
    .kicker { font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--sand); font-weight:800; }
    .hero h1 { margin:6px 0 0; font-family:Fraunces,serif; font-size:clamp(1.85rem,4.5vw,3rem); letter-spacing:-.03em; font-weight:800; }
    .hero .sub { margin-top:8px; color:var(--muted); max-width:52ch; }
    .trust-strip {
      display:flex; flex-wrap:wrap; align-items:center; gap:10px 14px; margin-top:12px;
    }
    .google-rating {
      display:inline-flex; align-items:center; gap:8px; text-decoration:none; color:inherit;
      padding:6px 12px; border-radius:999px; border:1px solid rgba(251,188,5,.35);
      background:rgba(251,188,5,.1);
    }
    .google-rating .g-stars { color:#fbbc05; letter-spacing:1px; font-size:13px; }
    .google-rating .g-score { font-size:12px; font-weight:750; color:var(--sand); }
    .trust-bits {
      display:inline-flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:12px; color:var(--muted); font-weight:650;
    }
    .trust-bits i { font-style:normal; opacity:.5; }
    .trust-bits span { color:var(--sand); }
    .metrics {
      display:flex; flex-wrap:wrap; align-items:stretch; justify-content:flex-start;
      gap:12px; margin-top:14px; max-width:1480px;
    }
    .metrics .pps, .metrics .stat {
      flex:0 1 300px; width:300px; max-width:calc(100vw - 28px);
      background:rgba(13,28,36,.78); border:1px solid var(--line); border-radius:12px; padding:10px 12px; backdrop-filter:blur(10px);
    }
    .metrics .pps.pps-flip {
      cursor:pointer; padding:0; background:transparent; border:0; perspective:900px;
      min-height:220px;
    }
    .pps-flip-inner {
      position:relative; width:100%; height:100%; min-height:220px;
      transition: transform .55s cubic-bezier(.2,.8,.2,1);
      transform-style: preserve-3d;
    }
    .pps-flip.is-flipped .pps-flip-inner { transform: rotateY(180deg); }
    .pps-face {
      position:absolute; inset:0; backface-visibility:hidden; -webkit-backface-visibility:hidden;
      border:1px solid var(--line); border-radius:12px; padding:12px 14px;
      background:rgba(13,28,36,.88); display:flex; flex-direction:column;
    }
    .pps-face--back { transform: rotateY(180deg); border-color:rgba(62,207,207,.35); }
    .pps-flip-hint {
      margin-top:auto; padding-top:8px; font-size:9px; letter-spacing:.06em; text-transform:uppercase;
      color:var(--muted); font-weight:700; opacity:.75;
    }
    .pps-deals-chart { flex:1; display:flex; align-items:flex-end; margin-top:8px; min-height:72px; }
    .pps-deals-bars {
      display:flex; align-items:flex-end; gap:3px; width:100%; height:72px;
    }
    .pps-deals-bars i {
      flex:1 1 0; min-width:0; border-radius:3px 3px 1px 1px;
      background:linear-gradient(180deg, var(--sea), rgba(62,207,207,.35));
      display:block;
    }
    .pps { color:var(--sea); }
    .pps.pps--ask {
      color:#f0a0a0;
      border-color:rgba(255,122,122,.4);
      background:rgba(255,122,122,.08);
    }
    .pps.pps--ask .pps-l { color:#f5b4b4; }
    .pps.pps--compare {
      flex:1 1 520px; width:520px; max-width:calc(100vw - 28px);
      border:1px solid rgba(216,195,165,.28);
      background:linear-gradient(135deg, rgba(255,122,122,.07), rgba(94,228,168,.07));
    }
    .pps.pps--compare .pps-face--front {
      border-color:rgba(255,122,122,.35);
      background:rgba(255,122,122,.06);
    }
    .pps.pps--compare .pps-face--back {
      border-color:rgba(94,228,168,.35);
      background:rgba(94,228,168,.06);
    }
    .pps-v--split {
      display:flex; align-items:baseline; justify-content:space-between; gap:12px;
      font-size:1.25em;
    }
    .pps-v--split .pps-ask { color:#f0a0a0; font-weight:800; }
    .pps-v--split .pps-dld { color:#7ddeb8; font-weight:800; }
    .pps-v--split em {
      font-style:normal; font-size:10px; font-weight:700; color:var(--muted); margin-left:4px;
      display:inline-block; max-width:9em; line-height:1.15;
    }
    .pps-legend {
      display:flex; gap:14px; margin-top:6px; font-size:10px; font-weight:700;
      letter-spacing:.04em; text-transform:uppercase; color:var(--muted);
    }
    .pps-legend i {
      display:inline-block; width:10px; height:3px; border-radius:2px; margin-right:5px; vertical-align:middle;
    }
    .pps-legend .lg-ask { color:#f0a0a0; }
    .pps-legend .lg-ask i { background:#f0a0a0; }
    .pps-legend .lg-dld { color:#7ddeb8; }
    .pps-legend .lg-dld i { background:#7ddeb8; }
    .pps-dld-go {
      margin-left:auto; font-size:10px; font-weight:800; letter-spacing:.04em; text-transform:uppercase;
      color:var(--sea); text-decoration:none; padding:4px 8px; border-radius:999px;
      border:1px solid rgba(62,207,207,.35); background:rgba(62,207,207,.1);
    }
    .pps-dld-go:hover { background:rgba(62,207,207,.2); color:#dffcff; }
    .pps-legend { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
    .pps-chart--dual svg { height:140px; }
    .pps.pps--fact { color:#7ddeb8; }
    .pps.pps--fact .pps-face--front,
    .pps.pps--fact .pps-face--back {
      border-color:rgba(94,228,168,.4);
      background:rgba(94,228,168,.08);
    }
    .pps.pps--fact .pps-l { color:#9eebc8; }
    .pps-top { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:2px; }
    .pps-l,.stat-l { font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); font-weight:700; }
    .pps-drop-big {
      font-size:15px; font-weight:900; font-variant-numeric:tabular-nums; line-height:1;
      color:var(--sand); white-space:nowrap;
    }
    .pps-drop-big.pps-drop { color:var(--bad); }
    .pps-drop-big.pps-up { color:var(--good); }
    .pps-v,.stat-v { font-weight:800; font-variant-numeric:tabular-nums; font-size:1.45em; line-height:1.15; }
    .pps-vs { font-size:11px; color:var(--muted); margin-top:2px; font-weight:650; line-height:1.25; }
    .pps-chart { position:relative; margin-top:10px; flex:1 1 auto; min-height:110px; }
    .pps-chart svg { display:block; width:100%; height:110px; overflow:visible; }
    .pps-dates {
      display:flex; justify-content:space-between; gap:0; margin-top:6px;
      font-size:9px; line-height:1.1; color:var(--muted); font-variant-numeric:tabular-nums; font-weight:600;
    }
    .pps-dates span { flex:1 1 0; text-align:center; overflow:hidden; white-space:nowrap; min-height:10px; }
    .pps-dates span.is-hide { visibility:hidden; }
    .stat-note { font-size:11px; color:var(--muted); margin-top:4px; }
    .dld-full {
      display:block; width:100%; margin:0; padding:0; position:relative; z-index:6;
      border:0; border-bottom:1px solid var(--line); overflow:hidden; background:#031016;
      cursor:pointer; font:inherit; color:inherit; text-align:left; text-decoration:none;
    }
    .dld-full:hover { outline:1px solid rgba(216,195,165,.35); outline-offset:-1px; }
    .dld-full--under { border-top:1px solid var(--line); }
    .dld-full .dld-ticker { border:0; min-height:44px; width:100%; background:#031016; pointer-events:none; }
    ${dldTickerCss()}
    @media (max-width:900px) {
      .metrics .pps, .metrics .stat { flex-basis:300px; width:300px; }
      .pps-chart svg { height:72px; }
    }
    @media (max-width:640px) {
      .metrics { max-width:100%; }
      .metrics .pps, .metrics .stat { flex:1 1 100%; width:100%; max-width:100%; }
      .metrics .pps.pps-flip, .pps-flip-inner { min-height:240px; }
      .pps-chart svg { height:88px; }
      .hero-inner { padding:20px 14px 16px; }
    }
  `;
}

function ppsFlipBootScript() {
  return `<script>
(function(){
  function bind(el){
    if(!el || el.__ppsFlip) return;
    el.__ppsFlip = true;
    function flip(e){
      if (e.target.closest('a.pps-dld-go')) return;
      e.preventDefault();
      el.classList.toggle('is-flipped');
    }
    el.addEventListener('click', flip);
    el.addEventListener('keydown', function(e){
      if(e.key==='Enter' || e.key===' '){ flip(e); }
    });
  }
  document.querySelectorAll('.pps-flip').forEach(bind);
})();
</script>`;
}

/**
 * @param {object} page
 * @param {{ kicker?: string, h1?: string, saleHref?: string, rentHref?: string }} opts
 */
function buildingHeroHtml(page, opts = {}) {
  const b = page.building || '—';
  const district = page.district || '—';
  const seo = page.seo || {};
  const google = page.google_place || null;
  const stock = page.building_stock || {};
  const sale = page.listings_sale || [];
  const rent = page.listings_rent || [];
  const pps = page.pps_dynamics || { sale: [], rent: [] };
  const dld = page.dld_ticker || { sale: [], rent: [] };
  let deals = page.dld_deals_dynamics || { sale: [], rent: [] };
  if (!(deals.sale && deals.sale.length) && !(deals.rent && deals.rent.length)) {
    const fromTicker = (rows) => {
      const by = new Map();
      for (const r of rows || []) {
        const m = String(r.d || '').slice(0, 7);
        if (!/^\d{4}-\d{2}$/.test(m)) continue;
        by.set(m, (by.get(m) || 0) + 1);
      }
      return [...by.keys()].sort().map((m) => ({ m, n: by.get(m) }));
    };
    deals = { sale: fromTicker(dld.sale), rent: fromTicker(dld.rent) };
  }
  const dldSaleTick = (dld.sale || []).slice(0, 48);
  const dldRentTick = (dld.rent || []).slice(0, 48);
  const hero =
    sale.find((r) => r.photo)?.photo ||
    rent.find((r) => r.photo)?.photo ||
    '';
  const kicker = opts.kicker || `Building · ${district}`;
  const h1 = opts.h1 || seo.h1 || b;
  const saleHref = opts.saleHref || '#sale';
  const rentHref = opts.rentHref || '#rent';
  const heroBg = hero
    ? `background-image:linear-gradient(180deg,rgba(7,19,26,.2),rgba(7,19,26,.94) 55%, #07131a),url('${esc(hero)}');`
    : '';

  return `
  <a class="dld-full" id="dld-sale" href="${esc(saleHref)}" title="DLD Sale">
    ${dldTickerHtml(dldSaleTick, 'sale')}
  </a>
  <header class="hero" style="${heroBg}">
    <div class="hero-inner">
      <div class="kicker">${esc(kicker)}</div>
      <h1>${esc(h1)}</h1>
      <div class="trust-strip">
        ${googleRatingHtml(google)}
        ${trustBitsHtml(stock)}
      </div>
      <div class="metrics">
        ${askDldCompareMini('sale', sale, pps.sale, dld.sale, deals.sale, stock, { dldHref: opts.dldPageHref || '' })}
        ${askDldCompareMini('rent', rent, pps.rent, dld.rent, deals.rent, stock, { dldHref: opts.dldPageHref || '' })}
      </div>
    </div>
  </header>
  <a class="dld-full dld-full--under" id="dld-rent" href="${esc(rentHref)}" title="DLD Rent">
    ${dldTickerHtml(dldRentTick, 'rent')}
  </a>
  ${ppsFlipBootScript()}`;
}

module.exports = {
  median,
  googleRatingHtml,
  trustBitsHtml,
  buildingHeroCss,
  buildingHeroHtml,
  ppsFlipBootScript,
};

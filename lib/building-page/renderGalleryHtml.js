/**
 * Template C — Gallery / mosaic
 * Photo-first unit grid + filters + slide-over with Signal
 */
const { esc, fmt, fmtM, ppsMini } = require('./shared');

function renderGalleryHtml(page) {
  const b = page.building || '—';
  const district = page.district || '—';
  const date = String(page.generated_at || '').slice(0, 10);
  const pps = page.pps_dynamics || { sale: [], rent: [] };
  const sale = page.listings_sale || [];
  const rent = page.listings_rent || [];
  const floors = page.building_floors || 0;
  const tplIndex =
    'building_' +
    String(b)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 60) +
    '_templates.html';
  const hero =
    sale.find((r) => r.photo)?.photo ||
    rent.find((r) => r.photo)?.photo ||
    '';

  const payload = {
    building: b,
    district,
    buildingFloors: floors,
    sale,
    rent,
  };

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(b)} · Gallery · Refty</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Manrope:wght@500;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg:#07131a; --ink:#031016; --card:#0d1c24; --line:#1c3340;
      --text:#eef6f4; --muted:#8aa3ad; --sand:#d8c3a5; --sea:#3ecfcf; --bad:#ff7a7a; --good:#5ee4a8;
      --safe: env(safe-area-inset-bottom,0px);
    }
    * { box-sizing:border-box; }
    body { margin:0; font:15px/1.45 Manrope,system-ui,sans-serif; background:var(--bg); color:var(--text); }
    a { color:var(--sea); }
    .hero {
      position:relative; min-height:42vh; display:grid; align-items:end;
      background: #041018 center/cover no-repeat;
      ${hero ? `background-image:linear-gradient(180deg,rgba(7,19,26,.25),rgba(7,19,26,.92)),url('${esc(hero)}');` : ''}
    }
    .hero-inner { padding:28px 18px 22px; max-width:1200px; width:100%; margin:0 auto; }
    .kicker { font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--sand); font-weight:800; }
    .hero h1 { margin:6px 0 0; font-family:Fraunces,serif; font-size:clamp(2rem,5vw,3.4rem); letter-spacing:-.03em; font-weight:800; }
    .hero .sub { margin-top:8px; color:var(--muted); max-width:42ch; }
    .metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-top:18px; }
    .metrics .pps, .metrics .stat {
      background:rgba(13,28,36,.72); border:1px solid var(--line); border-radius:14px; padding:10px 12px; backdrop-filter:blur(8px);
    }
    .pps { color:var(--sea); }
    .pps-l,.stat-l { font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); font-weight:700; }
    .pps-v,.stat-v { font-weight:800; font-variant-numeric:tabular-nums; }
    .pps-v em { font-style:normal; color:var(--sand); font-size:12px; margin-left:6px; }
    .pps-chart { position:relative; margin-top:6px; }
    .pps-chart svg { display:block; width:100%; height:42px; overflow:visible; }
    .pps-dates {
      display:flex; justify-content:space-between; gap:0; margin-top:5px;
      font-size:9px; line-height:1.1; color:var(--muted); font-variant-numeric:tabular-nums; font-weight:600;
    }
    .pps-dates span { flex:1 1 0; text-align:center; overflow:hidden; white-space:nowrap; }
    .bar {
      position:sticky; top:0; z-index:4; display:flex; flex-wrap:wrap; gap:8px; align-items:center;
      padding:12px 18px; background:rgba(7,19,26,.92); border-bottom:1px solid var(--line); backdrop-filter:blur(10px);
    }
    .chip {
      min-height:38px; padding:0 14px; border-radius:999px; border:1px solid var(--line);
      background:var(--card); color:var(--muted); font:inherit; font-weight:700; cursor:pointer;
    }
    .chip.is-on { background:var(--sand); color:#1a1208; border-color:var(--sand); }
    .chip input,.chip select { background:transparent; border:0; color:inherit; font:inherit; font-weight:700; outline:none; }
    .wrap { max-width:1200px; margin:0 auto; padding:16px 18px calc(40px + var(--safe)); }
    .grid {
      display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px;
    }
    .card {
      display:flex; flex-direction:column; border:1px solid var(--line); border-radius:18px; overflow:hidden;
      background:var(--card); cursor:pointer; color:inherit; text-align:left; padding:0; font:inherit;
      transition: transform .18s ease, border-color .18s ease;
    }
    .card:hover { transform:translateY(-2px); border-color:#2f5160; }
    .card .ph { aspect-ratio:4/3; background:#02080c; overflow:hidden; }
    .card .ph img { width:100%; height:100%; object-fit:cover; display:block; }
    .card .body { padding:12px 12px 14px; display:grid; gap:4px; }
    .card .price { font-weight:800; color:var(--sand); font-size:1.05rem; }
    .card .t { font-weight:750; }
    .card .m { font-size:12px; color:var(--muted); }
    .badge { display:inline-flex; gap:6px; flex-wrap:wrap; }
    .badge i { font-style:normal; font-size:11px; padding:2px 7px; border-radius:999px; background:#132830; color:var(--muted); }
    .badge i.hot { color:#1a1208; background:var(--sand); font-weight:800; }
    .drawer {
      position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:20; display:none; justify-content:flex-end;
    }
    .drawer.is-on { display:flex; }
    .panel {
      width:min(480px,100%); height:100%; background:var(--ink); border-left:1px solid var(--line);
      overflow:auto; padding:16px; animation:slide .22s ease;
    }
    @keyframes slide { from { transform:translateX(24px); opacity:.5; } to { transform:none; opacity:1; } }
    .panel h2 { margin:0; font-family:Fraunces,serif; font-size:1.45rem; }
    .panel .price { font-size:1.5rem; font-weight:800; color:var(--sand); margin:8px 0 12px; }
    .panel .photos { display:grid; grid-template-columns:1fr 1fr; gap:4px; margin-bottom:12px; }
    .panel .photos img { width:100%; height:110px; object-fit:cover; border-radius:10px; }
    .panel .photos img:first-child { grid-column:1/-1; height:200px; }
    .stats { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; }
    .stats span { font-size:12px; padding:4px 9px; border-radius:999px; background:var(--card); border:1px solid var(--line); }
    .signal { margin-top:14px; padding:12px; border-radius:14px; background:var(--card); border:1px solid var(--line); }
    .signal h3 { margin:0 0 8px; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); }
    .signal ul { list-style:none; margin:0; padding:0; display:grid; gap:5px; }
    .signal li { display:grid; grid-template-columns:78px 1fr auto; gap:8px; font-size:12px; font-variant-numeric:tabular-nums; }
    .muted { color:var(--muted); }
    .close { float:right; border:0; background:var(--card); color:var(--text); width:36px; height:36px; border-radius:999px; cursor:pointer; font-size:18px; }
    .empty { color:var(--muted); padding:40px; text-align:center; }
    .tpl-tag { position:fixed; left:12px; bottom:calc(12px + var(--safe)); z-index:9;
      background:var(--sand); color:#1a1208; font-weight:800; font-size:11px; padding:8px 12px; border-radius:999px; text-decoration:none; }
    @media (max-width:800px) {
      .metrics { grid-template-columns:1fr 1fr; }
    }
  </style>
</head>
<body>
  <a class="tpl-tag" href="${esc(tplIndex)}">Templates ▾</a>
  <header class="hero">
    <div class="hero-inner">
      <div class="kicker">Gallery template · ${esc(district)}</div>
      <h1>${esc(b)}</h1>
      <p class="sub">${fmt(sale.length)} for-sale · ${fmt(rent.length)} for-rent · ${floors || '—'} floors · photo-first · ${esc(date)}</p>
      <div class="metrics">
        ${ppsMini('Sale AED/sqft', pps.sale)}
        ${ppsMini('Rent AED/sqft', pps.rent)}
        <div class="stat"><div class="stat-l">Sale median</div><div class="stat-v">${fmtM((() => { const a=sale.map(r=>Number(r.price)).filter(Boolean).sort((x,y)=>x-y); return a.length?a[Math.floor(a.length/2)]:0; })())}</div></div>
        <div class="stat"><div class="stat-l">High-floor sale</div><div class="stat-v">${fmt(sale.filter(r=>Number(r.floor)>=floors*0.7).length)}</div></div>
      </div>
    </div>
  </header>
  <div class="bar">
    <button type="button" class="chip is-on" data-tab="sale">for-sale</button>
    <button type="button" class="chip" data-tab="rent">for-rent</button>
    <label class="chip">Rooms
      <select id="rooms"><option value="">all</option><option>studio</option><option>1</option><option>2</option><option>3</option><option>4</option></select>
    </label>
    <label class="chip">Floor
      <select id="band"><option value="">all</option><option value="high">high</option><option value="mid">mid</option><option value="low">low</option></select>
    </label>
    <label class="chip">Sort
      <select id="sort"><option value="floor">floor ↓</option><option value="price">price ↑</option><option value="pvm">PvM ↑</option></select>
    </label>
    <span class="muted" id="count" style="margin-left:auto;font-size:12px"></span>
  </div>
  <div class="wrap"><div class="grid" id="grid"></div></div>
  <div class="drawer" id="drawer" hidden>
    <div class="panel" id="panel"></div>
  </div>
  <script type="application/json" id="data">${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>
  <script>
  (function(){
    const data = JSON.parse(document.getElementById('data').textContent);
    let tab = 'sale';
    const grid = document.getElementById('grid');
    const drawer = document.getElementById('drawer');
    const panel = document.getElementById('panel');
    const countEl = document.getElementById('count');
    const roomsEl = document.getElementById('rooms');
    const bandEl = document.getElementById('band');
    const sortEl = document.getElementById('sort');

    function fmtP(p, purpose) {
      const x = Number(p); if (!x) return '—';
      if (String(purpose).includes('rent')) return x.toLocaleString('en-US') + ' AED/yr';
      return (x >= 1e6 ? (x/1e6).toFixed(2)+'M' : x.toLocaleString('en-US')) + ' AED';
    }
    function shortA(a){ a=String(a||''); return a.length>28?a.slice(0,26)+'…':a; }
    function bandOf(f){
      const max = data.buildingFloors || 60;
      f = Number(f); if (!Number.isFinite(f)) return 'na';
      if (f >= max*0.7) return 'high';
      if (f >= max*0.35) return 'mid';
      return 'low';
    }
    function list(){
      let rows = (data[tab]||[]).slice();
      const rooms = roomsEl.value;
      const band = bandEl.value;
      if (rooms) rows = rows.filter(u => String(u.rooms||'').toLowerCase().includes(rooms.toLowerCase()) || (rooms==='studio' && /studio|0/i.test(String(u.rooms))));
      if (band) rows = rows.filter(u => bandOf(u.floor)===band);
      const sort = sortEl.value;
      rows.sort((a,b)=>{
        if (sort==='price') return (Number(a.price)||0)-(Number(b.price)||0);
        if (sort==='pvm') return (Number(a.pvm_pct)||0)-(Number(b.pvm_pct)||0);
        return (Number(b.floor)||0)-(Number(a.floor)||0);
      });
      return rows;
    }

    function render(){
      const rows = list();
      countEl.textContent = rows.length + ' units';
      if (!rows.length){ grid.innerHTML='<div class="empty">Нет лотов под фильтр</div>'; return; }
      grid.innerHTML = rows.map((u,i)=>{
        const ph=(u.photos&&u.photos[0])||u.photo||'';
        const pvm=u.pvm_pct==null?'—':((u.pvm_pct>0?'+':'')+u.pvm_pct+'%');
        const hot = Number(u.pvm_pct)!=null && Number(u.pvm_pct)<=0;
        return '<button type="button" class="card" data-i="'+i+'">' +
          '<div class="ph">'+(ph?'<img src="'+ph+'" alt="" loading="lazy"/>':'')+'</div>' +
          '<div class="body"><div class="price">'+fmtP(u.price,tab)+'</div>' +
          '<div class="t">'+(u.rooms||'')+(u.unit_number?' · #'+u.unit_number:'')+' · fl '+(u.floor??'—')+'</div>' +
          '<div class="m">'+(u.broker||'—')+'</div>' +
          '<div class="badge"><i class="'+(hot?'hot':'')+'">PvM '+pvm+'</i><i>score '+(u.score??'—')+'</i><i>'+(u.exp!=null?u.exp+'d':'—')+'</i></div>' +
          '</div></button>';
      }).join('');
      const map = rows;
      grid.querySelectorAll('.card').forEach(btn=>{
        btn.onclick=()=>openUnit(map[+btn.getAttribute('data-i')]);
      });
    }

    function openUnit(u){
      if (!u) return;
      const photos=(u.photos&&u.photos.length?u.photos:(u.photo?[u.photo]:[])).slice(0,10);
      const pvm=u.pvm_pct==null?'—':((u.pvm_pct>0?'+':'')+u.pvm_pct+'%');
      const s=u.signal;
      const feed=s?((s.events&&s.events.length?s.events:s.steps||[]).slice(0,8)):[];
      const listers=s?(s.listers||[]).slice(0,4):[];
      const delta=s&&s.delta_pct!=null?((s.delta_pct>0?'+':'')+s.delta_pct+'%'):'—';
      panel.innerHTML =
        '<button type="button" class="close" id="close">×</button>' +
        '<h2>'+(u.rooms||'')+(u.unit_number?' · #'+u.unit_number:'')+'</h2>' +
        '<div class="muted">Floor '+(u.floor??'—')+' · '+(u.permit_number||'')+'</div>' +
        '<div class="price">'+fmtP(u.price,tab)+'</div>' +
        '<div class="photos">'+(photos.map(ph=>'<img src="'+ph+'" alt="" loading="lazy"/>').join('')||'')+'</div>' +
        '<div class="stats"><span>PvM <b>'+pvm+'</b></span><span>Score <b>'+(u.score??'—')+'</b></span><span>Exp <b>'+(u.exp!=null?u.exp+'d':'—')+'</b></span><span>CA <b>'+(u.ca??'—')+'</b></span></div>' +
        '<p class="muted">'+String(u.description||u.title||'').replace(/</g,'&lt;').slice(0,360)+'</p>' +
        '<p><b>'+(u.broker||'—')+'</b> · '+(u.agency||'')+'</p>' +
        (u.url?'<p><a href="'+u.url+'" target="_blank" rel="noopener">Open listing</a></p>':'') +
        '<div class="signal"><h3>Refty Signal · '+delta+'</h3><ul>' +
          feed.map(t=>'<li><span class="muted">'+(t.d||'')+'</span><span>'+(t.broker&&t.broker!=='—'?t.broker:shortA(t.agency))+'</span><span>'+fmtP(t.p,tab)+'</span></li>').join('') +
        '</ul>' +
        (listers.length?'<h3 style="margin-top:10px">Кто размещал</h3><ul>'+listers.map(L=>
          '<li><span class="muted">'+(L.from||'')+'</span><span><b>'+(L.broker||'—')+'</b></span><span class="muted">'+shortA(L.agency)+'</span></li>'
        ).join('')+'</ul>':'') +
        '</div>';
      drawer.hidden=false; drawer.classList.add('is-on');
      document.getElementById('close').onclick=close;
    }
    function close(){ drawer.classList.remove('is-on'); drawer.hidden=true; }
    drawer.addEventListener('click', e=>{ if(e.target===drawer) close(); });

    document.querySelectorAll('.chip[data-tab]').forEach(c=>{
      c.onclick=()=>{
        tab=c.getAttribute('data-tab');
        document.querySelectorAll('.chip[data-tab]').forEach(x=>x.classList.toggle('is-on',x===c));
        render();
      };
    });
    [roomsEl,bandEl,sortEl].forEach(el=>el.addEventListener('change', render));
    render();
  })();
  </script>
</body>
</html>`;
}

module.exports = { renderGalleryHtml };

/**
 * Embed: CVH 1BR floor scatter chart (from cvh_1br_floors_interactive)
 * Slim data + self-contained CSS/HTML/JS for building split desk pages.
 */
const fs = require('fs');
const path = require('path');

const DATA_CANDIDATES = [
  path.join(__dirname, '../../var/cvh_1br_floors_interactive.json'),
  path.join(__dirname, '../../public/cvh_1br_floors_interactive.json'),
];

function loadSlimCvh1brData(towerFilter) {
  let raw = null;
  for (const p of DATA_CANDIDATES) {
    if (fs.existsSync(p)) {
      raw = JSON.parse(fs.readFileSync(p, 'utf8'));
      break;
    }
  }
  if (!raw) return null;

  const tower = towerFilter ? String(towerFilter).toUpperCase() : null;
  let units = (raw.units || []).map((u) => ({
    unit: u.unit,
    floor: Number(u.floor) || 0,
    price: Number(u.price) || 0,
    pps: Number(u.pps) || 0,
    permit: String(u.permit || ''),
    tower: u.tower || 'A',
    area_sqft: u.area_sqft != null ? Number(u.area_sqft) : null,
    exposure_days: Number(u.exposure_days) || 0,
    archive: !!u.archive,
  }));
  if (tower) units = units.filter((u) => String(u.tower).toUpperCase() === tower);

  return {
    building: raw.building,
    rooms: raw.rooms || '1',
    floorsA: raw.floorsA,
    floorsB: raw.floorsB,
    towerFilter: tower,
    subject: {
      unit: raw.subject?.unit,
      floor: Number(raw.subject?.floor) || 0,
      ask: Number(raw.subject?.ask) || 0,
      pps: Number(raw.subject?.pps) || 0,
      permit: String(raw.subject?.permit || ''),
      archive: true,
      tower: raw.subject?.tower || 'A',
      area_sqft: raw.subject?.area_sqft != null ? Number(raw.subject.area_sqft) : null,
    },
    defaultPermit: raw.defaultPermit || (units[0] && units[0].permit) || null,
    floors: (raw.floors || []).map((f) => ({
      floor: Number(f.floor) || 0,
      med_ask_pps: f.med_ask_pps != null ? Number(f.med_ask_pps) : null,
      med_ask_price: f.med_ask_price != null ? Number(f.med_ask_price) : null,
      med_dld_pps: f.med_dld_pps != null ? Number(f.med_dld_pps) : null,
      med_dld_price: f.med_dld_price != null ? Number(f.med_dld_price) : null,
      n_dld: Number(f.n_dld) || 0,
      n_ask: Number(f.n_ask) || 0,
    })),
    units,
    dld_1br_12m: raw.dld_1br_12m || null,
  };
}

function towerFromBuildingName(building) {
  const m = String(building || '').match(/tower\s*([ab])/i);
  return m ? m[1].toUpperCase() : null;
}

function shouldEmbedCvh1brChart(building) {
  return /creek\s+vista\s+heights/i.test(String(building || ''));
}

function cvh1brFloorChartCss() {
  return `
    .cvh1br-chart {
      --cvh-bg:#0f1419; --cvh-surface:#1a222d; --cvh-surface2:#232d3b; --cvh-border:#2d3a4d;
      --cvh-text:#e8eef4; --cvh-muted:#8b9cb3; --cvh-accent:#38bdf8; --cvh-ask:#f0a0a0; --cvh-dld:#7ddeb8;
      --cvh-p0:#4ade80; --cvh-lost:#f87171; --cvh-high:#5ee4a8; --cvh-mid:#f5d76e; --cvh-low:#ff7a7a; --cvh-cheap:#fbbf24;
      max-width:1400px; margin:0 auto; padding:12px 20px 4px; color:var(--cvh-text);
    }
    .cvh1br-chart .chart-card{
      background:var(--cvh-surface); border:1px solid var(--cvh-border); border-radius:14px;
      padding:.9rem 1rem 1rem; box-shadow:0 10px 40px rgba(0,0,0,.25);
    }
    .cvh1br-chart .chart-top{
      display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; flex-wrap:wrap; margin-bottom:.55rem;
    }
    .cvh1br-chart .chart-title{font-size:.68rem; letter-spacing:.06em; text-transform:uppercase; color:var(--cvh-muted); font-weight:800}
    .cvh1br-chart .chart-title strong{display:block; margin-top:.2rem; font-size:1.05rem; letter-spacing:0; text-transform:none; color:var(--cvh-text); font-weight:800}
    .cvh1br-chart .chart-title a{color:var(--cvh-accent); font-weight:700; font-size:.78rem; text-transform:none; letter-spacing:0}
    .cvh1br-chart .chart-cta{
      display:inline-flex; align-items:center; gap:.4rem;
      border:0; cursor:pointer; font:inherit; font-weight:800; font-size:.82rem;
      padding:.55rem .9rem; border-radius:10px;
      background:linear-gradient(135deg,#38bdf8,#0ea5e9); color:#061018;
      box-shadow:0 8px 24px rgba(56,189,248,.35);
    }
    .cvh1br-chart .chart-cta:hover{filter:brightness(1.06)}
    .cvh1br-chart .chart-cta:active{transform:translateY(1px)}
    .cvh1br-chart .seg-btns{display:inline-flex; gap:.3rem; flex-wrap:wrap}
    .cvh1br-chart .seg-btn{
      border:1px solid var(--cvh-border); background:var(--cvh-surface2); color:var(--cvh-muted);
      border-radius:8px; padding:.35rem .55rem; cursor:pointer; font:inherit; font-size:.72rem; font-weight:700;
    }
    .cvh1br-chart .seg-btn.is-on{border-color:var(--cvh-accent); background:rgba(56,189,248,.12); color:var(--cvh-text); box-shadow:inset 0 0 0 1px rgba(56,189,248,.35)}
    .cvh1br-chart .seg-btn.seg-high.is-on{color:var(--cvh-high)}
    .cvh1br-chart .seg-btn.seg-mid.is-on{color:var(--cvh-mid)}
    .cvh1br-chart .seg-btn.seg-low.is-on{color:var(--cvh-low)}
    .cvh1br-chart .mode-tabs{display:inline-flex; gap:.3rem; margin:0 0 .65rem; padding:.2rem; background:var(--cvh-surface2); border:1px solid var(--cvh-border); border-radius:10px}
    .cvh1br-chart .mode-tab{border:0; background:transparent; color:var(--cvh-muted); font:inherit; font-size:.78rem; font-weight:700; padding:.4rem .75rem; border-radius:8px; cursor:pointer}
    .cvh1br-chart .mode-tab.is-on{background:rgba(56,189,248,.16); color:var(--cvh-text); box-shadow:inset 0 0 0 1px rgba(56,189,248,.45)}
    .cvh1br-chart .chart-head{display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:.45rem; flex-wrap:wrap}
    .cvh1br-chart .chart-k{font-size:.68rem; letter-spacing:.06em; text-transform:uppercase; color:var(--cvh-muted); font-weight:700}
    .cvh1br-chart .chart-v{font-size:1.35rem; font-weight:800; margin-top:.15rem}
    .cvh1br-chart .chart-v em{font-style:normal; font-size:.75rem; color:var(--cvh-muted); font-weight:600; margin-left:.25rem}
    .cvh1br-chart .verdict{margin-top:.35rem; font-size:.8rem; font-weight:700}
    .cvh1br-chart .verdict.bad{color:var(--cvh-lost)}
    .cvh1br-chart .verdict.good{color:var(--cvh-p0)}
    .cvh1br-chart .verdict.mid{color:var(--cvh-mid)}
    .cvh1br-chart .chart-side{text-align:right; font-size:.72rem; color:var(--cvh-muted)}
    .cvh1br-chart .chart-side b{color:var(--cvh-accent); font-size:1rem}
    .cvh1br-chart .legend{display:flex; gap:1rem; flex-wrap:wrap; font-size:.68rem; color:var(--cvh-muted); margin:.35rem 0}
    .cvh1br-chart .legend span{display:inline-flex; align-items:center; gap:.3rem}
    .cvh1br-chart .legend i{width:10px; height:10px; border-radius:50%; display:inline-block}
    .cvh1br-chart .legend i.line{width:14px; height:3px; border-radius:2px}
    .cvh1br-chart #cvhFloorChart{width:100%; height:auto; display:block}
    .cvh1br-chart .hint{font-size:.68rem; color:var(--cvh-muted); margin-top:.35rem}
    .cvh1br-chart .chart-cheap-hit{cursor:pointer; display:inline-block; padding:.15rem .35rem; margin-top:.2rem; border-radius:6px; border:1px solid rgba(251,191,36,.4); background:rgba(251,191,36,.08); color:#fbbf24; font-weight:700; font-size:.72rem; text-align:right}
    .cvh1br-chart .chart-cheap-hit:hover{background:rgba(251,191,36,.18)}
    .cvh1br-chart .chart-cheap-hit em{font-style:normal; color:var(--cvh-text); font-weight:800}
    .cvh1br-chart .chart-ladder-hit{cursor:pointer;display:inline-block;padding:.2rem .4rem;margin-top:.25rem;border-radius:7px;border:1px solid rgba(94,228,168,.45);background:rgba(94,228,168,.1);color:#86efac;font-weight:700;font-size:.72rem;text-align:right;line-height:1.35}
    .cvh1br-chart .chart-ladder-hit:hover{background:rgba(94,228,168,.18)}
    .cvh1br-chart .chart-ladder-hit em{font-style:normal;color:#bbf7d0;font-weight:800}
    .cvh1br-chart .chart-ladder-hit b{color:var(--cvh-text)}
    @media (max-width:720px){
      .cvh1br-chart{padding:10px 14px 2px}
      .cvh1br-chart .chart-side{text-align:left}
    }
  `;
}

function cvh1brFloorChartHtml({ tower, fullHref } = {}) {
  const tLabel = tower ? `Tower ${tower}` : 'Heights';
  const link = fullHref || 'cvh_1br_floors_sell_my_home.html';
  return `
  <section class="cvh1br-chart" id="cvh-1br-chart" aria-label="CVH 1BR floor chart">
    <div class="chart-card">
      <div class="chart-top">
        <div class="chart-title">
          1BR · юниты на графике
          <strong>Creek Vista Heights · ${tLabel}</strong>
          <a href="${link}" target="_blank" rel="noopener">полный Refty Analytics →</a>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:.45rem">
          <button type="button" class="chart-cta" id="cvhStartBrokerChat">💬 Начать чат с брокером</button>
          <div class="seg-btns" role="tablist" aria-label="Floor segment">
            <button type="button" class="seg-btn is-on" data-seg="all">All floors</button>
            <button type="button" class="seg-btn seg-high" data-seg="high">High</button>
            <button type="button" class="seg-btn seg-mid" data-seg="mid">Mid</button>
            <button type="button" class="seg-btn seg-low" data-seg="low">Low</button>
          </div>
        </div>
      </div>
      <div class="mode-tabs" role="tablist">
        <button type="button" class="mode-tab is-on" data-mode="pps" role="tab">Цена за фут · AED/sqft</button>
        <button type="button" class="mode-tab" data-mode="price" role="tab">Цена за объект · AED</button>
      </div>
      <div class="chart-head">
        <div>
          <div class="chart-k" id="cvhChartK">Selected unit</div>
          <div class="chart-v"><span id="cvhChartVal">—</span> <em id="cvhChartUnit">AED/sqft</em></div>
          <div class="verdict mid" id="cvhChartVerdict">выбери юнит</div>
        </div>
        <div class="chart-side">
          <span id="cvhChartModeLabel">unit</span> <b id="cvhChartFloor">—</b><br/>
          vs floor med <b id="cvhVsFloor">—</b><br/>
          vs seg med <b id="cvhVsSeg">—</b><br/>
          <button type="button" class="chart-cheap-hit" id="cvhVsCheapBtn" title="Показать лучший дешевле на графике" hidden>
            дешевле на <em id="cvhVsCheapSave">—</em><br/>
            <span id="cvhVsCheapUnit">—</span>
          </button>
          <span id="cvhVsCheapNone" style="color:var(--cvh-muted)">нет дешевле в сегменте</span>
          <button type="button" class="chart-ladder-hit" id="cvhVsLadderBtn" title="Спуститься на более низкие этажи дешевле медианы сегмента" hidden>
            ↓ ниже этажи · <b id="cvhVsLadderBand">mid</b><br/>
            дешевле med · <em id="cvhVsLadderUnit">—</em>
          </button>
        </div>
      </div>
      <div class="legend">
        <span><i style="background:var(--cvh-ask)"></i>юниты ask</span>
        <span><i style="background:#fbbf24"></i>дешевле выбранного</span>
        <span><i style="background:var(--cvh-dld)"></i>DLD сделка / med</span>
        <span><i class="line" style="background:#fbbf24"></i>ask med сегмента</span>
        <span><i class="line" style="background:#7ddeb8"></i>DLD med сегмента</span>
        <span><i style="background:var(--cvh-accent)"></i>выбранный</span>
        <span><i style="background:var(--cvh-lost)"></i>архив 3502</span>
      </div>
      <svg id="cvhFloorChart" viewBox="0 0 720 250" width="100%" height="auto"></svg>
      <div class="hint" id="cvhChartHint">Точки = текущие 1BR · клик = выбор юнита</div>
    </div>
  </section>`;
}

function cvh1brFloorChartBootScript(slimData) {
  if (!slimData || !(slimData.units && slimData.units.length)) return '';
  const json = JSON.stringify(slimData).replace(/</g, '\\u003c');
  return `
<script type="application/json" id="cvh1br-data">${json}</script>
<script>
(function(){
  const root=document.getElementById('cvh-1br-chart');
  const dataEl=document.getElementById('cvh1br-data');
  const svg=document.getElementById('cvhFloorChart');
  if(!root||!dataEl||!svg) return;
  const DATA=JSON.parse(dataEl.textContent);
  const SEG={
    high:{title:'High floors',color:'#5ee4a8'},
    mid:{title:'Mid floors',color:'#f5d76e'},
    low:{title:'Low floors',color:'#ff7a7a'},
    all:{title:'All floors',color:'#38bdf8'}
  };
  const maxF=Math.max(DATA.floorsA||55, DATA.floorsB||59, ...(DATA.floors||[]).map(f=>f.floor), 1);
  let mode='pps';
  let segment='all';
  let showArchive=false;
  let selectedPermit=DATA.defaultPermit || (DATA.units[0]&&DATA.units[0].permit) || null;

  function floorBand(f){
    const t=(f-1)/(maxF-1||1);
    if(t>=0.66) return 'high';
    if(t>=0.33) return 'mid';
    return 'low';
  }
  function bandRange(key){
    if(key==='low') return {lo:1,hi:Math.floor(1+(maxF-1)*0.33)};
    if(key==='mid') return {lo:Math.floor(1+(maxF-1)*0.33)+1,hi:Math.ceil(1+(maxF-1)*0.66)-1};
    if(key==='high') return {lo:Math.ceil(1+(maxF-1)*0.66),hi:maxF};
    return {lo:1,hi:maxF};
  }
  function med(arr){const a=arr.filter(v=>v!=null&&!Number.isNaN(v)).slice().sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:null;}
  function fmt(n){if(n==null||Number.isNaN(n))return '—'; n=Number(n); if(n>=1000) return Math.round(n).toLocaleString('en-US'); return String(Math.round(n*10)/10);}
  function fm(n){if(n==null||Number.isNaN(n))return '—'; n=Number(n); if(n>=1e6) return (n/1e6).toFixed(n%1e6?2:0)+'M'; if(n>=1e3) return Math.round(n).toLocaleString('en-US'); return String(Math.round(n));}
  function fmtY(v){return mode==='pps'?fmt(v):fm(v);}
  function unitY(u){if(!u)return null; if(u.archive) return mode==='pps'?DATA.subject.pps:DATA.subject.ask; return mode==='pps'?u.pps:u.price;}
  function floorAskY(f){return mode==='pps'?f.med_ask_pps:f.med_ask_price;}
  function floorDldY(f){return mode==='pps'?f.med_dld_pps:f.med_dld_price;}
  function pctVs(a,b){if(a==null||b==null||!b)return null; return Math.round(((a-b)/b)*1000)/10;}
  function verdictHtml(p){if(p==null)return {cls:'mid',txt:'выбери юнит'}; if(p>=8)return {cls:'bad',txt:'дороже сегмента · риск'}; if(p<=-5)return {cls:'good',txt:'дешевле сегмента · интересно'}; return {cls:'mid',txt:'около медианы сегмента'};}
  function unitArea(u){
    if(!u) return null;
    if(u.area_sqft!=null && Number(u.area_sqft)>0) return Math.round(Number(u.area_sqft));
    const price=u.price!=null?u.price:u.ask;
    const pps=u.pps;
    if(price!=null && pps!=null && Number(pps)>0) return Math.round(Number(price)/Number(pps));
    return null;
  }
  function selectedUnit(){
    if(showArchive) return Object.assign({archive:true}, DATA.subject);
    return DATA.units.find(u=>String(u.permit)===String(selectedPermit)) || DATA.units[0] || DATA.subject;
  }
  function unitPriceSeg(u){return floorBand(u.floor);}
  /** Same as floors interactive: same floor price-segment, ask OR AED/sqft. */
  function cheaperInSegment(u, limit){
    if(!u || u.archive) return [];
    const band=unitPriceSeg(u);
    const curPrice=Number(u.price!=null?u.price:u.ask);
    const curPps=Number(u.pps);
    if(!Number.isFinite(curPrice) || curPrice<=0) return [];
    return DATA.units
      .filter(x => floorBand(x.floor)===band && String(x.permit)!==String(u.permit))
      .filter(x => {
        const p=Number(x.price!=null?x.price:x.ask);
        const pps=Number(x.pps);
        const priceOk=Number.isFinite(p) && p>0 && p<curPrice;
        const ppsOk=Number.isFinite(pps) && pps>0 && Number.isFinite(curPps) && curPps>0 && pps<curPps;
        return priceOk || ppsOk;
      })
      .map(x=>{
        const p=Number(x.price!=null?x.price:x.ask);
        return Object.assign({}, x, {_saveAed: Math.round(curPrice-p)});
      })
      .sort((a,b)=>b._saveAed-a._saveAed)
      .slice(0, limit||12);
  }
  function cheapestInSegmentMark(u){
    const raw=DATA.rooms_label||((DATA.rooms!=null?DATA.rooms:'1')+' BR');
    const rooms=String(raw).replace(/(\\d)\\s*BR/i,'$1 BR').replace(/\\s+/g,' ').trim()||'1 BR';
    const band=unitPriceSeg(u);
    const segEn=band==='high'?'high floor':(band==='mid'?'mid floor':'low floor');
    return 'Самый дешёвый '+rooms+' в сегменте '+segEn+' по цене за юнит';
  }
  function nextLowerBand(band){
    if(band==='high') return 'mid';
    if(band==='mid') return 'low';
    return null;
  }
  function cheaperLadderDown(u, limit){
    if(!u || u.archive) return [];
    const curY=unitY(u);
    if(curY==null) return [];
    const out=[];
    let band=nextLowerBand(unitPriceSeg(u));
    while(band){
      const st=segmentStats(band);
      const medAsk=st.medAsk;
      const cands=DATA.units
        .filter(x => String(x.permit)!==String(u.permit))
        .filter(x => floorBand(x.floor)===band)
        .filter(x => Number(x.floor) < Number(u.floor))
        .filter(x => unitY(x)!=null && unitY(x)>0 && unitY(x)<curY)
        .filter(x => medAsk==null || unitY(x)<medAsk)
        .map(x => Object.assign({}, x, {
          _ladderBand:band,
          _saveAed: mode==='pps' ? Math.round((curY-unitY(x))*(unitArea(u)||600)) : Math.round(curY-unitY(x)),
          _segMed:medAsk,
          _vsMed: medAsk!=null ? pctVs(unitY(x), medAsk) : null
        }))
        .sort((a,b)=>unitY(a)-unitY(b));
      for(const c of cands){
        out.push(c);
        if(out.length>=(limit||12)) return out;
      }
      band=nextLowerBand(band);
    }
    return out;
  }
  function bestLadderStep(u){
    const next=nextLowerBand(unitPriceSeg(u));
    if(!next) return null;
    return cheaperLadderDown(u,99).filter(x=>x._ladderBand===next)[0]||null;
  }
  function goLadderStep(x){
    if(!x) return;
    if(x._ladderBand){
      segment=x._ladderBand;
      root.querySelectorAll('.seg-btn').forEach(b=>b.classList.toggle('is-on', b.getAttribute('data-seg')===segment));
    }
    selectUnit(x.permit);
  }
  function segmentStats(key){
    const rows = key==='all'?DATA.floors:DATA.floors.filter(f=>floorBand(f.floor)===key);
    const units = DATA.units.filter(u => key==='all' || floorBand(u.floor)===key);
    const range=bandRange(key);
    return {
      lo:range.lo, hi:range.hi,
      medAsk: med(units.map(unitY).filter(Boolean)) || med(rows.map(floorAskY).filter(v=>v!=null)),
      medDld: med(rows.map(floorDldY).filter(v=>v!=null))
    };
  }

  function selectUnit(permit){
    showArchive=false;
    selectedPermit=String(permit);
    renderChart();
    trySyncBuildingDesk(permit);
  }
  function selectArchive(){ showArchive=true; renderChart(); }
  function selectFloor(f){
    const onFloor=DATA.units.filter(u=>u.floor===f && unitY(u)>0).sort((a,b)=>unitY(a)-unitY(b));
    if(onFloor[0]) selectUnit(onFloor[0].permit);
  }
  function trySyncBuildingDesk(permit){
    // best-effort: highlight matching card in split desk if present
    const cards=document.querySelectorAll('.ucard[data-permit], .unit-card[data-permit], [data-permit]');
    let hit=null;
    cards.forEach(el=>{ if(String(el.getAttribute('data-permit'))===String(permit)) hit=el; });
    if(hit){
      hit.scrollIntoView({behavior:'smooth', block:'nearest'});
      hit.click();
    }
  }

  function renderChart(){
    const st=segmentStats(segment);
    const u=selectedUnit();
    const cheapSet = new Set(cheaperInSegment(u, 999).map(x=>x.permit));
    const chartFloors=DATA.floors.filter(f=>floorAskY(f)!=null||floorDldY(f)!=null).sort((a,b)=>a.floor-b.floor);
    const units = DATA.units.filter(x=>unitY(x)>0);
    const W=720,H=250,pad={l:48,r:18,t:30,b:32};
    const iw=W-pad.l-pad.r, ih=H-pad.t-pad.b;
    const xs=[...chartFloors.map(f=>f.floor), ...units.map(x=>x.floor), DATA.subject.floor];
    const ys=[...units.map(unitY), ...chartFloors.map(floorAskY), ...chartFloors.map(floorDldY), st.medAsk, st.medDld, unitY(u)].filter(v=>v!=null);
    let ymin=Math.min(...ys), ymax=Math.max(...ys);
    const py=(ymax-ymin)*0.12; ymin-=py; ymax+=py;
    if(ymin<=0) ymin=Math.min(...ys.filter(v=>v>0))*0.9;
    const xmin=Math.min(...xs), xmax=Math.max(...xs);
    const x=f=>pad.l+((f-xmin)/(xmax-xmin||1))*iw;
    const y=v=>pad.t+ih-((v-ymin)/(ymax-ymin||1))*ih;

    let grid='';
    for(let k=0;k<=3;k++){
      const v=ymin+(ymax-ymin)*k/3; const yy=y(v);
      grid+='<line x1="'+pad.l+'" y1="'+yy.toFixed(1)+'" x2="'+(W-pad.r)+'" y2="'+yy.toFixed(1)+'" stroke="#2d3a4d"/>'+
        '<text x="'+(pad.l-6)+'" y="'+(yy+3).toFixed(1)+'" fill="#8b9cb3" font-size="9" text-anchor="end">'+fmtY(v)+'</text>';
    }
    const uniqF=[...new Set(xs)].sort((a,b)=>a-b);
    const step=Math.max(1,Math.ceil(uniqF.length/8));
    let xlab='';
    uniqF.forEach((f,i)=>{ if(i%step&&i&&i!==uniqF.length-1)return; xlab+='<text x="'+x(f).toFixed(1)+'" y="'+(H-8)+'" fill="#8b9cb3" font-size="9" text-anchor="middle">'+f+'</text>'; });

    let band='';
    if(segment!=='all'){
      const x0=x(st.lo), x1=x(st.hi); const col=SEG[segment].color;
      band='<rect x="'+Math.min(x0,x1).toFixed(1)+'" y="'+pad.t+'" width="'+Math.abs(x1-x0).toFixed(1)+'" height="'+ih+'" fill="'+col+'" opacity=".08"/>';
    }

    const askPts=chartFloors.filter(f=>floorAskY(f)!=null);
    const askPoly=askPts.map(f=>x(f.floor).toFixed(1)+','+y(floorAskY(f)).toFixed(1)).join(' ');
    const dldDots=chartFloors.filter(f=>floorDldY(f)!=null).map(f=>{
      const dim=segment!=='all'&&floorBand(f.floor)!==segment;
      const cx=x(f.floor).toFixed(1), cy=y(floorDldY(f)).toFixed(1);
      const title=(f.n_dld||0)+' DLD · fl.'+f.floor+' · med '+(mode==='pps'?fmt(floorDldY(f)):fm(floorDldY(f)));
      return '<circle class="cvh-dld-dot" data-f="'+f.floor+'" cx="'+cx+'" cy="'+cy+'" r="2.8" fill="#7ddeb8" opacity="'+(dim?'.2':'.9')+'" stroke="#0f1419" stroke-width="0.6" style="cursor:pointer"></circle>'+
        '<circle class="cvh-dld-hit" data-f="'+f.floor+'" cx="'+cx+'" cy="'+cy+'" r="10" fill="transparent" style="cursor:pointer"><title>'+title+'</title></circle>';
    }).join('');

    const unitDots=units.map(uu=>{
      const dim=segment!=='all'&&floorBand(uu.floor)!==segment;
      const on=uu.permit===selectedPermit&&!showArchive;
      const cheap=cheapSet.has(uu.permit);
      const r=on?5:(cheap?3.4:2.6);
      const fill=on?'#38bdf8':(cheap?'#fbbf24':'#f0a0a0');
      const op=dim?'.18':(on||cheap?'1':'.55');
      return '<circle class="cvh-unit-dot" data-p="'+uu.permit+'" cx="'+x(uu.floor).toFixed(1)+'" cy="'+y(unitY(uu)).toFixed(1)+'" r="'+r+'" fill="'+fill+'" opacity="'+op+'" stroke="#0f1419" stroke-width="'+(on?1.4:0.6)+'" style="cursor:pointer"><title>'+uu.unit+' · '+fm(uu.price)+' · '+fmt(uu.pps)+'/sqft'+(unitArea(uu)!=null?(' · '+unitArea(uu)+' sqft'):'')+(cheap?' · cheaper':'')+'</title></circle>';
    }).join('');

    const a3502=DATA.subject;
    const archDot='<circle class="cvh-arch-dot" cx="'+x(a3502.floor).toFixed(1)+'" cy="'+y(mode==='pps'?a3502.pps:a3502.ask).toFixed(1)+'" r="'+(showArchive?6:3.5)+'" fill="#f87171" stroke="#0f1419" stroke-width="1.2" style="cursor:pointer" opacity="'+(segment!=='all'&&floorBand(a3502.floor)!==segment?'.25':'1')+'"><title>Archive 3502 · 1.70M</title></circle>';

    let medLines='';
    if(st.medAsk!=null){
      const yy=y(st.medAsk);
      medLines+='<line x1="'+pad.l+'" y1="'+yy.toFixed(1)+'" x2="'+(W-pad.r)+'" y2="'+yy.toFixed(1)+'" stroke="#fbbf24" stroke-width="2" stroke-dasharray="6 4"/>'+
        '<text x="'+(W-pad.r)+'" y="'+(yy-5).toFixed(1)+'" fill="#fbbf24" font-size="10" font-weight="800" text-anchor="end">ask med '+fmtY(st.medAsk)+'</text>';
    }
    let dldMed=st.medDld;
    const dldPack=DATA.dld_1br_12m||{};
    if(dldMed==null && segment==='all'){
      dldMed = mode==='pps' ? dldPack.med_pps : dldPack.med_price;
    }
    if(dldMed!=null){
      const yy=y(dldMed);
      const askY=st.medAsk!=null?y(st.medAsk):null;
      let labelDy=-5;
      if(askY!=null && Math.abs(yy-askY)<14) labelDy = (yy>=askY)?14:-16;
      medLines+='<line x1="'+pad.l+'" y1="'+yy.toFixed(1)+'" x2="'+(W-pad.r)+'" y2="'+yy.toFixed(1)+'" stroke="#7ddeb8" stroke-width="2" stroke-dasharray="5 4" opacity=".95"/>'+
        '<text x="'+(W-pad.r)+'" y="'+(yy+labelDy).toFixed(1)+'" fill="#7ddeb8" font-size="10" font-weight="800" text-anchor="end">DLD med '+fmtY(dldMed)+'</text>';
    }

    const liveUnits=units.filter(function(uu){ return unitY(uu)>0; });
    let cheapestU=null;
    liveUnits.forEach(function(uu){ if(!cheapestU || unitY(uu)<unitY(cheapestU)) cheapestU=uu; });
    const bandNow=u?unitPriceSeg(u):segment;
    const segUnits=liveUnits.filter(function(uu){ return floorBand(uu.floor)===bandNow; });
    let cheapestSegU=null;
    segUnits.forEach(function(uu){ if(!cheapestSegU || unitY(uu)<unitY(cheapestSegU)) cheapestSegU=uu; });
    const noCheaperInSeg=!!(u && !u.archive && cheaperInSegment(u,999).length===0);
    const isCheapestGlobal=!!(u && cheapestU && !u.archive && String(u.permit)===String(cheapestU.permit));
    const isCheapestSeg=!!(u && !u.archive && (noCheaperInSeg || (cheapestSegU && String(u.permit)===String(cheapestSegU.permit))));
    const isCheapest=isCheapestGlobal || isCheapestSeg;
    const cheapLabel=isCheapestGlobal||isCheapestSeg?cheapestInSegmentMark(u):'';

    let marker='';
    if(u && unitY(u)!=null){
      const cx=x(u.floor), cy=y(unitY(u));
      const labelMain=(u.archive?'3502 ARCH':u.unit)+' · '+fmtY(unitY(u))+(unitArea(u)!=null?(' · '+unitArea(u)+'sqft'):'');
      const badgeW=Math.min(320, 12+cheapLabel.length*6.2);
      let badgeY=cy-40;
      if(badgeY<pad.t+2) badgeY=Math.min(cy+12, pad.t+ih-36);
      const textY=badgeY+12;
      const cheapBadge=cheapLabel
        ? ('<rect x="'+(cx-badgeW/2).toFixed(1)+'" y="'+badgeY.toFixed(1)+'" width="'+badgeW+'" height="18" rx="6" fill="#14532d" stroke="#4ade80" stroke-width="1.2"/>'+
           '<text x="'+cx.toFixed(1)+'" y="'+textY.toFixed(1)+'" fill="#bbf7d0" font-size="8.5" font-weight="800" text-anchor="middle">'+cheapLabel+'</text>')
        : '';
      const unitLabelY = (cheapLabel && badgeY<cy) ? (badgeY-4) : (cy-14);
      marker='<line x1="'+cx.toFixed(1)+'" y1="'+pad.t+'" x2="'+cx.toFixed(1)+'" y2="'+(pad.t+ih)+'" stroke="rgba(56,189,248,.35)" stroke-dasharray="3 3"/>'+
        '<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+(isCheapest?9:8)+'" fill="none" stroke="'+(isCheapest?'#4ade80':'#38bdf8')+'" stroke-width="2.2"><animate attributeName="r" values="'+(isCheapest?'7;10;7':'6.5;9;6.5')+'" dur="1.4s" repeatCount="indefinite"/></circle>'+
        cheapBadge+
        '<text x="'+cx.toFixed(1)+'" y="'+unitLabelY.toFixed(1)+'" fill="'+(isCheapest?'#86efac':'#38bdf8')+'" font-size="11" font-weight="800" text-anchor="middle">'+labelMain+'</text>';
    }
    let cheapestMark='';
    if(cheapestU && unitY(cheapestU)!=null && !(u && !u.archive && String(u.permit)===String(cheapestU.permit))){
      const cx=x(cheapestU.floor), cy=y(unitY(cheapestU));
      const markTxt=cheapestInSegmentMark(cheapestU);
      cheapestMark=
        '<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="6.5" fill="none" stroke="#4ade80" stroke-width="1.4" opacity=".9"/>'+
        '<text x="'+cx.toFixed(1)+'" y="'+(cy-12).toFixed(1)+'" fill="#4ade80" font-size="8" font-weight="800" text-anchor="middle">'+markTxt+'</text>';
    }

    const floorRow=DATA.floors.find(f=>f.floor===u.floor)||{};
    const floorMed=mode==='pps'?floorRow.med_ask_pps:floorRow.med_ask_price;
    const vsF=pctVs(unitY(u), floorMed);
    const vsS=pctVs(unitY(u), st.medAsk);
    const cheapAll = cheaperInSegment(u, 999);
    const ver=verdictHtml(vsS!=null?vsS:vsF);
    document.getElementById('cvhChartK').textContent=(u.archive?'Архив ':'')+'Tower '+(u.tower||'A')+' · '+u.unit+' · fl.'+u.floor;
    document.getElementById('cvhChartVal').textContent=mode==='pps'?fmt(unitY(u)):fm(unitY(u));
    document.getElementById('cvhChartUnit').textContent=mode==='pps'?'AED/sqft':'AED';
    const vEl=document.getElementById('cvhChartVerdict');
    vEl.className='verdict '+ver.cls; vEl.textContent=ver.txt;
    document.getElementById('cvhChartFloor').textContent=u.unit+' · fl.'+u.floor;
    document.getElementById('cvhVsFloor').textContent=vsF==null?'—':((vsF>0?'+':'')+vsF+'%');
    document.getElementById('cvhVsFloor').style.color=vsF==null?'':(vsF>=8?'#f87171':vsF<=-5?'#4ade80':'#f5d76e');
    document.getElementById('cvhVsSeg').textContent=vsS==null?'—':((vsS>0?'+':'')+vsS+'%');
    document.getElementById('cvhVsSeg').style.color=vsS==null?'':(vsS>=8?'#f87171':vsS<=-5?'#4ade80':'#f5d76e');
    const bestCheap = cheapAll.slice().sort((a,b)=>b._saveAed-a._saveAed)[0] || cheapAll[0];
    const btn=document.getElementById('cvhVsCheapBtn');
    const none=document.getElementById('cvhVsCheapNone');
    const ladderBtn=document.getElementById('cvhVsLadderBtn');
    const ladderStep=(!bestCheap && u && !u.archive) ? bestLadderStep(u) : null;
    if(bestCheap){
      btn.hidden=false; none.hidden=true;
      if(ladderBtn) ladderBtn.hidden=true;
      document.getElementById('cvhVsCheapSave').textContent=fm(bestCheap._saveAed)+' AED';
      document.getElementById('cvhVsCheapUnit').textContent=bestCheap.unit+' · '+fm(bestCheap.price);
      btn.onclick=()=>selectUnit(bestCheap.permit);
    } else {
      btn.hidden=true;
      if(ladderStep && ladderBtn){
        none.hidden=true;
        ladderBtn.hidden=false;
        document.getElementById('cvhVsLadderBand').textContent=SEG[ladderStep._ladderBand].title;
        const medBit=ladderStep._segMed!=null?(mode==='pps'?fmt(ladderStep._segMed):fm(ladderStep._segMed)):'—';
        document.getElementById('cvhVsLadderUnit').textContent=ladderStep.unit+' · '+(mode==='pps'?fmt(unitY(ladderStep)):fm(unitY(ladderStep)))+' (med '+medBit+')';
        ladderBtn.onclick=()=>goLadderStep(ladderStep);
      } else {
        none.hidden=false;
        none.textContent=cheapestInSegmentMark(u);
        none.style.color='var(--good,#4ade80)';
        none.style.fontWeight='800';
        if(ladderBtn) ladderBtn.hidden=true;
      }
    }
    const ladderHint=ladderStep?(' · ↓ дальше: '+SEG[ladderStep._ladderBand].title+' дешевле med'):'';
    document.getElementById('cvhChartHint').textContent='Выбран: '+u.unit+' · '+SEG[unitPriceSeg(u)].title+' · дешевле в сегменте: '+cheapAll.length+ladderHint+' · exposure '+(u.exposure_days||0)+'d · n='+units.length;

    svg.innerHTML=grid+band+
      '<polyline fill="none" stroke="#f0a0a0" stroke-width="1.2" opacity=".35" points="'+askPoly+'"/>'+
      dldDots+unitDots+archDot+medLines+cheapestMark+marker+xlab;
    svg.querySelectorAll('.cvh-unit-dot').forEach(c=>c.addEventListener('click',()=>selectUnit(c.getAttribute('data-p'))));
    svg.querySelectorAll('.cvh-arch-dot').forEach(c=>c.addEventListener('click',()=>selectArchive()));
    svg.querySelectorAll('.cvh-dld-dot,.cvh-dld-hit').forEach(c=>c.addEventListener('click',function(e){
      e.stopPropagation();
      const f=Number(c.getAttribute('data-f'));
      if(Number.isFinite(f)) selectFloor(f);
    }));
  }

  root.querySelectorAll('.mode-tab').forEach(btn=>{
    btn.addEventListener('click',()=>{
      mode=btn.getAttribute('data-mode');
      root.querySelectorAll('.mode-tab').forEach(b=>b.classList.toggle('is-on', b===btn));
      renderChart();
    });
  });
  root.querySelectorAll('.seg-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      segment=btn.getAttribute('data-seg');
      root.querySelectorAll('.seg-btn').forEach(b=>b.classList.toggle('is-on', b===btn));
      renderChart();
    });
  });

  const startBtn=document.getElementById('cvhStartBrokerChat');
  if(startBtn){
    startBtn.addEventListener('click',function(){
      const u=selectedUnit();
      const tower=u.tower||DATA.towerFilter||'A';
      const area=unitArea(u);
      const viewBits=[];
      if(u.floor) viewBits.push('fl.'+u.floor);
      if(area) viewBits.push(area+' sqft');
      if(u.unit) viewBits.push('unit '+u.unit);
      const view=viewBits.join(' · ');
      const priceBit=mode==='pps'
        ? (fmt(unitY(u))+' AED/sqft')
        : (fm(unitY(u))+' AED');
      const text=u.archive
        ? ('Смотрю архивный 3502 · Tower '+tower+' · '+priceBit+' — нужен похожий 1BR / актуальные офферы.')
        : ('Интересует 1BR #'+u.unit+' · Tower '+tower+' · fl.'+u.floor+' · '+priceBit+(area?(' · '+area+' sqft'):'')+' — хочу обсудить с брокером / посмотреть.');
      if(typeof window.reftyStartBrokerChat==='function'){
        window.reftyStartBrokerChat({
          purpose:'for-sale',
          rooms:'1',
          view:view,
          text:text,
          autoSubmit:true
        });
      } else {
        const el=document.getElementById('building-room')||document.getElementById('building-under');
        if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
      }
    });
  }

  renderChart();
})();
</script>`;
}

function cvh1brFloorChartEmbed(building) {
  if (!shouldEmbedCvh1brChart(building)) return { css: '', html: '', boot: '' };
  const tower = towerFromBuildingName(building);
  const slim = loadSlimCvh1brData(tower);
  if (!slim || !slim.units.length) return { css: '', html: '', boot: '' };
  return {
    css: cvh1brFloorChartCss(),
    html: cvh1brFloorChartHtml({
      tower,
      fullHref: 'cvh_1br_floors_sell_my_home.html',
    }),
    boot: cvh1brFloorChartBootScript(slim),
  };
}

module.exports = {
  shouldEmbedCvh1brChart,
  towerFromBuildingName,
  loadSlimCvh1brData,
  cvh1brFloorChartCss,
  cvh1brFloorChartHtml,
  cvh1brFloorChartBootScript,
  cvh1brFloorChartEmbed,
};

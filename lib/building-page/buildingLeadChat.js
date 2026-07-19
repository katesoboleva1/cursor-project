/**
 * Building Lead Chat — buyer requests under a building; brokers race for the lead.
 * Cascade Early Access: 4 brokers unlock at 0 / +30m / +1h / +1.5h.
 * After +2h: ask client; if yes → round-robin offer to all brokers in the building.
 */
const { esc, fmt } = require('./shared');
const { loadBuildingDeployConfig } = require('./loadDeployConfig');

function deployUi() {
  try {
    return loadBuildingDeployConfig();
  } catch (e) {
    return null;
  }
}

const _ui = deployUi();
const INVITE = _ui?.inviteUrl || 'https://refty.ai/invite?ref=24WNXAJP';
const SLOT_UNLOCK_MIN = _ui?.earlyUnlockMinutes || [0, 30, 60, 90];
const OPEN_ALL_MIN = _ui?.askClientAfterMinutes || 120;

function buildingBrokers(sale, rent) {
  return buildingBrokersByRooms(sale, rent, null);
}

/** Unique brokers with listings; if rooms is set (e.g. '1'), only those with that BR. */
function buildingBrokersByRooms(sale, rent, rooms) {
  const want = rooms == null || rooms === '' ? null : String(rooms);
  const names = [];
  const seen = new Set();
  for (const u of [...(sale || []), ...(rent || [])]) {
    if (want != null && String(u.rooms || '') !== want) continue;
    const n = String(u.broker || '').trim();
    if (!n || seen.has(n)) continue;
    seen.add(n);
    names.push(n);
  }
  if (!names.length) {
    return ['Broker A', 'Broker B', 'Broker C', 'Broker D'];
  }
  return names;
}

function slotUnlockLabel(slotIdx) {
  const m = SLOT_UNLOCK_MIN[slotIdx] ?? 0;
  if (m === 0) return 'сразу';
  if (m < 60) return `через ${m} мин`;
  if (m === 60) return 'через 1 час';
  if (m === 90) return 'через 1,5 часа';
  return `через ${m} мин`;
}

function seedLeads(building, sale, rent) {
  const samples = [];
  const roomsOf = (arr) =>
    [...new Set((arr || []).map((u) => String(u.rooms || '')).filter(Boolean))].slice(0, 4);
  const viewOf = (arr) => {
    const v = (arr || []).find((u) => u.view && u.view !== 'No view');
    return v ? v.view : 'Marina view';
  };
  const saleRooms = roomsOf(sale);
  const rentRooms = roomsOf(rent);
  samples.push({
    id: 'seed-inv-1br',
    role: 'buyer',
    purpose: 'for-sale',
    rooms: '1',
    view: viewOf(sale) || 'Marina view',
    text: `Инвестор ищет 1 BR в ${building} под сдачу · вид ${viewOf(sale) || 'Marina'}. Готов смотреть / бронировать быстро.`,
    minsAgo: 2,
    slotMin: 30,
    slotsTotal: 4,
    slotTaken: 0,
    claims: 0,
    status: 'early',
    hot: true,
  });
  if (saleRooms.length) {
    samples.push({
      id: 'seed-sale-1',
      role: 'buyer',
      purpose: 'for-sale',
      rooms: saleRooms[0] || '1',
      view: viewOf(sale),
      text: `Ищу ${saleRooms[0] || '1'} BR на продажу в ${building} · вид ${viewOf(sale)}. Готов смотреть сегодня.`,
      minsAgo: 4,
      slotMin: 30,
      slotsTotal: 4,
      slotTaken: 1,
      claims: 1,
      status: 'early',
    });
  }
  if (rentRooms.length) {
    samples.push({
      id: 'seed-rent-1',
      role: 'buyer',
      purpose: 'for-rent',
      rooms: rentRooms.includes('1') ? '1' : rentRooms[0] || '1',
      view: viewOf(rent),
      text: `Нужен ${rentRooms.includes('1') ? '1' : rentRooms[0] || '1'} BR в аренду · ${viewOf(rent)}. Бюджет около рынка.`,
      minsAgo: 11,
      slotMin: 30,
      slotsTotal: 4,
      slotTaken: 3,
      claims: 3,
      status: 'early',
    });
  }
  samples.push({
    id: 'seed-sale-2',
    role: 'buyer',
    purpose: 'for-sale',
    rooms: '2',
    view: 'Partial marina',
    text: `2 BR · high floor · тихий вид. Если есть офф-маркет — пишите.`,
    minsAgo: 125,
    slotMin: 30,
    slotsTotal: 4,
    slotTaken: 4,
    claims: 4,
    status: 'ask',
  });
  samples.push({
    id: 'seed-queue-1',
    role: 'buyer',
    purpose: 'for-rent',
    rooms: '1',
    view: 'Marina view',
    text: `1 BR аренда · Marina. Клиент подтвердил интерес общаться — round robin здания.`,
    minsAgo: 140,
    slotMin: 30,
    slotsTotal: 4,
    slotTaken: 4,
    claims: 4,
    status: 'queue',
    rrPos: 0,
    rrOffers: 0,
  });
  return samples;
}

function buildingLeadChatCss() {
  return `
    .bld-leads {
      max-width:1400px; width:100%; margin:18px auto 0; padding:0 16px 8px 0;
    }
    .bld-leads-card {
      border:1px solid var(--line); border-radius:18px; overflow:hidden;
      background:linear-gradient(180deg,#101820 0%,#0a1218 100%);
      box-shadow:0 18px 50px rgba(0,0,0,.35);
    }
    .bld-leads-head {
      display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:12px;
      padding:16px 18px; border-bottom:1px solid rgba(255,255,255,.06);
    }
    .bld-leads-head h2 {
      margin:0; font-family:Fraunces,serif; font-size:1.35rem; letter-spacing:-.02em; font-weight:800;
    }
    .bld-leads-head p { margin:6px 0 0; color:var(--muted); font-size:13px; max-width:52ch; line-height:1.4; }
    .bld-leads-tiers {
      display:flex; flex-wrap:wrap; gap:8px;
    }
    .bld-tier {
      display:grid; gap:2px; min-width:140px; padding:10px 12px; border-radius:12px;
      border:1px solid rgba(94,228,168,.35); background:rgba(94,228,168,.08); text-decoration:none; color:inherit;
    }
    .bld-tier:hover { border-color:rgba(94,228,168,.65); background:rgba(94,228,168,.14); }
    .bld-tier b { font-size:12px; color:var(--good); }
    .bld-tier span { font-size:11px; color:var(--muted); }
    .bld-tier--hot { border-color:rgba(251,188,5,.4); background:rgba(251,188,5,.08); }
    .bld-tier--hot b { color:#fbbc05; }
    .bld-leads-body {
      display:block;
      min-height:280px;
    }
    .bld-leads-body--feed .bld-feed {
      border-right:none;
      max-height:480px;
    }
    .bld-request {
      width:100%; margin:0 0 14px; padding:0;
    }
    .bld-request-card {
      border:1px solid rgba(94,228,168,.28); border-radius:18px; overflow:hidden;
      background:linear-gradient(135deg, rgba(94,228,168,.1) 0%, rgba(62,207,207,.06) 45%, #0a1218 100%);
      box-shadow:0 18px 50px rgba(0,0,0,.32);
    }
    .bld-request-head {
      padding:16px 18px 12px; border-bottom:1px solid rgba(255,255,255,.06);
    }
    .bld-request-head h2 {
      margin:0; font-family:Fraunces,serif; font-size:1.35rem; letter-spacing:-.02em; font-weight:800;
    }
    .bld-request-head p { margin:6px 0 0; color:var(--muted); font-size:13px; max-width:62ch; line-height:1.45; }
    .bld-request-head b { color:var(--good); font-weight:800; }
    .bld-request .bld-compose {
      padding:14px 18px 16px; background:transparent;
    }
    .bld-request .bld-compose h3 { display:none; }
    .bld-request .bld-compose-row { grid-template-columns:repeat(3, minmax(0, 1fr)); }
    @media (max-width:900px) {
      .bld-request .bld-compose-row { grid-template-columns:1fr 1fr; }
    }
    @media (max-width:560px) {
      .bld-request .bld-compose-row { grid-template-columns:1fr; }
    }
    .bld-feed {
      padding:12px 14px; border-right:1px solid rgba(255,255,255,.06);
      max-height:420px; overflow:auto;
    }
    .bld-lead {
      display:grid; gap:8px; padding:12px; margin:0 0 10px; border-radius:14px;
      border:1px solid rgba(255,255,255,.07); background:rgba(0,0,0,.22);
    }
    .bld-lead.is-early { border-color:rgba(251,188,5,.4); background:rgba(251,188,5,.06); }
    .bld-lead.is-hot {
      border-color:rgba(255,122,122,.55);
      background:linear-gradient(135deg, rgba(255,122,122,.14), rgba(251,188,5,.1));
      box-shadow:0 0 0 1px rgba(255,122,122,.2);
    }
    .bld-lead.is-claimed { opacity:.72; }
    .bld-pill--ask { background:rgba(62,207,207,.16); color:var(--sea); }
    .bld-pill--queue { background:rgba(94,228,168,.18); color:var(--good); }
    .bld-ask-box {
      margin-top:4px; padding:10px 12px; border-radius:12px;
      border:1px dashed rgba(62,207,207,.4); background:rgba(62,207,207,.08);
      font-size:13px; line-height:1.4;
    }
    .bld-ask-box b { color:var(--sea); }
    .bld-lead-top { display:flex; flex-wrap:wrap; align-items:center; gap:8px; font-size:11px; color:var(--muted); }
    .bld-pill {
      display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:999px;
      font-weight:800; font-size:10px; letter-spacing:.04em; text-transform:uppercase;
      background:rgba(62,207,207,.12); color:var(--sea);
    }
    .bld-pill--early { background:rgba(251,188,5,.16); color:#fbbc05; }
    .bld-pill--open { background:rgba(94,228,168,.14); color:var(--good); }
    .bld-pill--claimed { background:rgba(255,122,122,.14); color:#ff9a9a; }
    .bld-lead-text { margin:0; font-size:14px; line-height:1.4; color:var(--text); }
    .bld-lead-meta { font-size:12px; color:var(--muted); }
    .bld-lead-actions { display:flex; flex-wrap:wrap; gap:8px; }
    .bld-btn {
      appearance:none; border:1px solid var(--line); background:var(--card); color:var(--sand);
      font:inherit; font-weight:750; font-size:12px; padding:8px 12px; border-radius:999px; cursor:pointer;
    }
    .bld-btn:hover { border-color:rgba(216,195,165,.45); }
    .bld-btn--go {
      background:var(--sand); color:#1a1208; border-color:var(--sand);
    }
    .bld-btn--go:hover { filter:brightness(1.05); }
    .bld-compose {
      padding:14px 16px; display:flex; flex-direction:column; gap:10px; background:rgba(0,0,0,.18);
    }
    .bld-compose h3 {
      margin:0; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--sand); font-weight:800;
    }
    .bld-compose label { display:grid; gap:4px; font-size:11px; color:var(--muted); font-weight:700; }
    .bld-compose select, .bld-compose input, .bld-compose textarea {
      width:100%; box-sizing:border-box; border-radius:10px; border:1px solid var(--line);
      background:#07131a; color:var(--text); font:inherit; padding:9px 10px;
    }
    .bld-compose textarea { min-height:72px; resize:vertical; }
    .bld-compose-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .bld-compose-note { margin:0; font-size:11px; color:var(--muted); line-height:1.35; }
    .bld-compose-note b { color:var(--good); }
    .bld-slots {
      display:flex; align-items:flex-start; gap:8px; flex-wrap:wrap; margin-top:4px;
    }
    .bld-slot-cell {
      display:grid; gap:3px; justify-items:center; min-width:52px;
    }
    .bld-slot-cell i {
      display:block; width:100%; height:8px; border-radius:99px;
      background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.08);
    }
    .bld-slot-cell i.is-on {
      background:linear-gradient(90deg,#fbbc05,#5ee4a8); border-color:transparent;
    }
    .bld-slot-cell i.is-next {
      background:rgba(251,188,5,.35); border-color:rgba(251,188,5,.5);
    }
    .bld-slot-cell em {
      font-style:normal; font-size:9px; color:var(--muted); font-weight:700; text-align:center; line-height:1.2;
    }
    .bld-slots > span.bld-slots-note { font-size:11px; color:var(--muted); font-weight:700; align-self:center; }
    @media (max-width:900px) {
      .bld-leads { padding:0 10px 8px; }
    }
  `;
}

function roomOptionsFromListings(sale, rent) {
  const roomOpts = [...new Set(
    (sale || []).concat(rent || []).map((u) => String(u.rooms || '')).filter(Boolean)
  )].sort((a, b) => Number(a) - Number(b));
  if (!roomOpts.length) roomOpts.push('1', '2', '3');
  return roomOpts;
}

function leadComposeFormHtml(roomOpts, brokersCount) {
  const n = Number(brokersCount) || 0;
  return `
        <form class="bld-compose" id="bld-compose">
          <h3>Новый запрос под здание</h3>
          <div class="bld-compose-row">
            <label>Цель
              <select name="purpose">
                <option value="for-sale">Купить</option>
                <option value="for-rent">Снять</option>
              </select>
            </label>
            <label>Комнаты
              <select name="rooms">
                ${roomOpts.map((r) => `<option value="${esc(r)}">${esc(r)} BR</option>`).join('')}
              </select>
            </label>
            <label>Вид / пожелания
              <input name="view" type="text" placeholder="Marina view, high floor…" maxlength="80" />
            </label>
          </div>
          <label>Сообщение
            <textarea name="text" placeholder="Что ищете, бюджет, когда готовы смотреть — брокеры ответят лучшими офферами" maxlength="280" required></textarea>
          </label>
          <p class="bld-compose-note">Запрос увидят <b>${n || 'все'}</b> брокеров здания · Early Access каскад → через <b>2 часа</b> round robin. <a href="${esc(INVITE)}" target="_blank" rel="noopener">купить слот</a></p>
          <button type="submit" class="bld-btn bld-btn--go">Отправить всем брокерам</button>
        </form>`;
}

function buildingLeadRequestHtml(page) {
  const building = page.building || 'Building';
  const sale = page.listings_sale || [];
  const rent = page.listings_rent || [];
  const roomOpts = roomOptionsFromListings(sale, rent);
  const brokersCount = buildingBrokers(sale, rent).length;
  return `
  <section class="bld-request" id="building-request" data-building="${esc(building)}">
    <div class="bld-request-card">
      <div class="bld-request-head">
        <h2>Новый запрос под здание</h2>
        <p>Отправь запрос <b>всем брокерам ${esc(building)}</b> — они предложат тебе лучшие офферы по sale / rent. Укажи BR, вид и пожелания.</p>
      </div>
      ${leadComposeFormHtml(roomOpts, brokersCount)}
    </div>
  </section>`;
}

function buildingLeadChatHtml(page) {
  const building = page.building || 'Building';

  return `
  <section class="bld-leads" id="building-leads" data-building="${esc(building)}">
    <div class="bld-leads-card">
      <div class="bld-leads-head">
        <div>
          <h2>Разговорчики · ${esc(building)}</h2>
          <p>Лента запросов и ответов брокеров. Early Access: <b>сразу → 30 мин → 1 ч → 1,5 ч</b>. <b>Через 2 часа</b> спрашиваем клиента — если «да», <b>round robin</b> по брокерам здания.</p>
        </div>
        <div class="bld-leads-tiers">
          <a class="bld-tier bld-tier--hot" href="${esc(INVITE)}" target="_blank" rel="noopener noreferrer">
            <b>4 слота · каскад</b>
            <span>0 → 30м → 1ч → 1,5ч</span>
          </a>
          <a class="bld-tier" href="${esc(INVITE)}" target="_blank" rel="noopener noreferrer">
            <b>Round robin здания</b>
            <span>после 2ч · если клиент сказал «да»</span>
          </a>
        </div>
      </div>
      <div class="bld-leads-body bld-leads-body--feed">
        <div class="bld-feed" id="bld-feed" aria-live="polite"></div>
      </div>
    </div>
  </section>`;
}

function buildingLeadChatBootScript(page) {
  const building = page.building || 'Building';
  const seeds = seedLeads(building, page.listings_sale || [], page.listings_rent || []);
  const brokers = buildingBrokers(page.listings_sale || [], page.listings_rent || []);
  return `<script>
(function(){
  const building = ${JSON.stringify(building)};
  const storeKey = 'refty_bld_leads_v6_' + building.toLowerCase().replace(/[^a-z0-9]+/g,'_');
  const rrKey = 'refty_bld_rr_v1_' + building.toLowerCase().replace(/[^a-z0-9]+/g,'_');
  const invite = ${JSON.stringify(INVITE)};
  const seeds = ${JSON.stringify(seeds)};
  const brokers = ${JSON.stringify(brokers)};
  const unlockMin = ${JSON.stringify(SLOT_UNLOCK_MIN)};
  const openAllMin = ${OPEN_ALL_MIN};
  const unlockLabels = ${JSON.stringify(SLOT_UNLOCK_MIN.map((_, i) => slotUnlockLabel(i)))};
  const feed = document.getElementById('bld-feed');
  const form = document.getElementById('bld-compose');
  if (!feed) return;

  function submitLeadPayload(payload){
    payload = payload || {};
    const purpose = String(payload.purpose || 'for-sale');
    const rooms = String(payload.rooms || '1');
    const view = String(payload.view || '').trim();
    const text = String(payload.text || '').trim();
    if (!text) return null;
    const lead = {
      id: 'lead-' + Date.now(),
      role: 'buyer',
      purpose: purpose,
      rooms: rooms,
      view: view,
      text: text,
      slotMin: 30,
      slotsTotal: 4,
      slotTaken: 0,
      claims: 0,
      status: 'early',
      createdAt: Date.now(),
    };
    leads = [lead].concat(leads);
    save(leads);
    if (form) form.reset();
    render();
    feed.scrollTop = 0;
    return lead;
  }
  window.reftySubmitBuildingLead = submitLeadPayload;

  function loadRrCursor(){
    try {
      const n = parseInt(localStorage.getItem(rrKey) || '0', 10);
      if (Number.isFinite(n) && n >= 0) return n % Math.max(1, brokers.length);
    } catch (e) {}
    return 0;
  }
  function saveRrCursor(n){
    try { localStorage.setItem(rrKey, String(n % Math.max(1, brokers.length))); } catch (e) {}
  }
  let rrCursor = loadRrCursor();

  function load(){
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) {}
    return seeds.map(function(x){
      const row = Object.assign({}, x, { createdAt: Date.now() - (x.minsAgo||0)*60000 });
      if (row.status === 'queue' && (row.rrPos == null)) {
        row.rrPos = rrCursor;
        row.rrOffers = row.rrOffers || 0;
      }
      return row;
    });
  }
  function save(list){
    try { localStorage.setItem(storeKey, JSON.stringify(list)); } catch (e) {}
  }
  let leads = load();

  function brokerAt(pos){
    if (!brokers.length) return 'брокер';
    return brokers[((pos % brokers.length) + brokers.length) % brokers.length];
  }
  function escHtml(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function nextRrIndex(from){
    return (from + 1) % Math.max(1, brokers.length);
  }
  /** Start round-robin offer for a lead; advances global cursor for the *next* lead. */
  function startRoundRobin(L){
    const pos = rrCursor;
    rrCursor = nextRrIndex(pos);
    saveRrCursor(rrCursor);
    return Object.assign({}, L, {
      status: 'queue',
      rrPos: pos,
      rrOffers: 0,
      rrStartedAt: Date.now(),
    });
  }
  /** Pass current broker → next in circle (same lead). */
  function passRoundRobin(L){
    const pos = nextRrIndex(L.rrPos == null ? 0 : L.rrPos);
    return Object.assign({}, L, {
      rrPos: pos,
      rrOffers: (L.rrOffers || 0) + 1,
    });
  }

  function ago(ts){
    const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (m < 1) return 'только что';
    if (m < 60) return m + ' мин назад';
    return Math.round(m/60) + ' ч назад';
  }
  function statusPill(L){
    const total = L.slotsTotal || 4;
    const taken = Math.min(total, L.slotTaken || 0);
    if (L.hot && L.status === 'early' && taken === 0) {
      return '<span class="bld-pill bld-pill--hot">🔥 Hot · инвестор 1 BR · сразу</span>';
    }
    if (L.status === 'early') {
      const next = Math.min(total, taken + 1);
      const when = unlockLabels[taken] || unlockLabels[0];
      return '<span class="bld-pill bld-pill--early">Слот ' + next + '/4 · ' + when + '</span>';
    }
    if (L.status === 'ask') return '<span class="bld-pill bld-pill--ask">Спросить клиента</span>';
    if (L.status === 'queue') return '<span class="bld-pill bld-pill--queue">Round robin</span>';
    if (L.status === 'closed') return '<span class="bld-pill bld-pill--claimed">Без интереса</span>';
    if (L.status === 'claimed') return '<span class="bld-pill bld-pill--claimed">Забран</span>';
    return '<span class="bld-pill bld-pill--open">Открыт</span>';
  }
  function slotBar(L){
    const total = L.slotsTotal || 4;
    const taken = Math.min(total, L.slotTaken || 0);
    const cells = [];
    for (let i = 0; i < total; i++) {
      const on = i < taken;
      const next = i === taken && L.status === 'early';
      const cls = on ? 'is-on' : (next ? 'is-next' : '');
      cells.push(
        '<span class="bld-slot-cell">' +
          '<i class="' + cls + '" title="Брокер ' + (i+1) + ' · ' + (unlockLabels[i] || '') + '"></i>' +
          '<em>#' + (i+1) + '<br/>' + (unlockLabels[i] || '') + '</em>' +
        '</span>'
      );
    }
    return '<div class="bld-slots" aria-label="каскад слотов">' + cells.join('') +
      '<span class="bld-slots-note">→ 2ч спросить → round robin</span></div>';
  }
  function render(){
    if (!leads.length) {
      feed.innerHTML = '<p class="bld-compose-note">Пока тихо — будь первым запросом по ' + building + '.</p>';
      return;
    }
    feed.innerHTML = leads.map(function(L){
      const cls = (L.hot ? ' is-hot' : '') + (L.status === 'early' ? ' is-early' : (L.status === 'claimed' || L.status === 'closed' ? ' is-claimed' : ''));
      const total = L.slotsTotal || 4;
      const taken = Math.min(total, L.slotTaken || 0);
      const canTakeSlot = L.status === 'early' && taken < total;
      const when = unlockLabels[taken] || 'сразу';
      let actions = '';
      let extra = '';
      if (L.status === 'ask') {
        extra = '<div class="bld-ask-box"><b>Через 2 часа:</b> спросить клиента — есть интерес общаться дальше?<br/>Если да — предложим <b>round robin</b> всем брокерам в ' + building + ' (' + brokers.length + ' в круге).</div>';
        actions =
          '<button type="button" class="bld-btn bld-btn--go" data-interest="yes" data-id="' + L.id + '">Да, интерес есть → round robin</button>' +
          '<button type="button" class="bld-btn" data-interest="no" data-id="' + L.id + '">Нет интереса</button>';
      } else if (L.status === 'queue') {
        const pos = L.rrPos == null ? 0 : L.rrPos;
        const name = brokerAt(pos);
        const nameEsc = escHtml(name);
        const n = (pos % brokers.length) + 1;
        const offers = L.rrOffers || 0;
        extra = '<div class="bld-ask-box"><b>Клиент сказал «да».</b> Round robin по ' + brokers.length + ' брокерам здания.<br/>Сейчас предложение у: <b>#' + n + ' ' + nameEsc + '</b>' +
          (offers ? ' · пропусков: ' + offers : '') +
          '.<br/><span style="opacity:.85">Следующий новый лид стартует с курсора #' + ((rrCursor % brokers.length) + 1) + '.</span></div>';
        actions =
          '<button type="button" class="bld-btn bld-btn--go" data-claim="' + L.id + '">Взять (я ' + nameEsc + ')</button>' +
          '<button type="button" class="bld-btn" data-rr-pass="' + L.id + '">Пропуск → следующий в круге</button>' +
          '<a class="bld-btn" href="' + invite + '" target="_blank" rel="noopener">Я брокер этого здания</a>';
      } else if (L.status === 'claimed') {
        actions = '<span class="bld-lead-meta">Взял: ' + (L.claimedBy || 'брокер') + '</span>';
      } else if (L.status === 'closed') {
        actions = '<span class="bld-lead-meta">Клиент без интереса — round robin не открывали</span>';
      } else if (canTakeSlot) {
        const claimLabel = L.hot && taken === 0
          ? 'Забрать лида раньше всех · инвестор 1 BR (сразу)'
          : 'Взять слот ' + (taken + 1) + '/4 · ' + when;
        actions =
          '<button type="button" class="bld-btn bld-btn--go" data-claim="' + L.id + '">' + claimLabel + '</button>' +
          '<a class="bld-btn" href="' + invite + '" target="_blank" rel="noopener">Купить слот</a>';
      } else {
        actions = '<span class="bld-lead-meta">Все 4 слота заняты · через 2 часа спросим клиента</span>' +
          '<button type="button" class="bld-btn" data-force-ask="' + L.id + '">Симулировать: прошло 2 часа</button>';
      }
      return '<article class="bld-lead' + cls + '" data-id="' + L.id + '">' +
        '<div class="bld-lead-top">' +
          statusPill(L) +
          '<span class="bld-pill">' + (L.purpose === 'for-rent' ? 'RENT' : 'SALE') + '</span>' +
          '<span>' + (L.rooms || '?') + ' BR</span>' +
          (L.view ? '<span>· ' + L.view + '</span>' : '') +
          '<span style="margin-left:auto">' + ago(L.createdAt || Date.now()) + '</span>' +
        '</div>' +
        '<p class="bld-lead-text">' + L.text + '</p>' +
        (L.status === 'early' || taken > 0 ? slotBar(L) : '') +
        extra +
        '<div class="bld-lead-meta">Early: сразу → 30м → 1ч → 1,5ч · потом спросить → round robin · ' + (L.claims||0) + ' в гонке</div>' +
        '<div class="bld-lead-actions">' + actions + '</div>' +
      '</article>';
    }).join('');
  }

  feed.addEventListener('click', function(e){
    const interestBtn = e.target.closest('[data-interest]');
    if (interestBtn) {
      const id = interestBtn.getAttribute('data-id');
      const yes = interestBtn.getAttribute('data-interest') === 'yes';
      leads = leads.map(function(L){
        if (L.id !== id) return L;
        if (!yes) return Object.assign({}, L, { status: 'closed' });
        return startRoundRobin(L);
      });
      save(leads);
      render();
      return;
    }
    const rrPass = e.target.closest('[data-rr-pass]');
    if (rrPass) {
      const id = rrPass.getAttribute('data-rr-pass');
      leads = leads.map(function(L){
        if (L.id !== id || L.status !== 'queue') return L;
        return passRoundRobin(L);
      });
      save(leads);
      render();
      return;
    }
    const forceAsk = e.target.closest('[data-force-ask]');
    if (forceAsk) {
      const id = forceAsk.getAttribute('data-force-ask');
      leads = leads.map(function(L){
        if (L.id !== id) return L;
        return Object.assign({}, L, { status: 'ask', slotTaken: L.slotsTotal || 4 });
      });
      save(leads);
      render();
      return;
    }
    const btn = e.target.closest('[data-claim]');
    if (!btn) return;
    const id = btn.getAttribute('data-claim');
    leads = leads.map(function(L){
      if (L.id !== id) return L;
      const total = L.slotsTotal || 4;
      let taken = L.slotTaken || 0;
      let status = L.status;
      let claimedBy = L.claimedBy;
      if (status === 'early' && taken < total) {
        taken += 1;
        claimedBy = 'Ты · слот ' + taken + '/4 · ' + (unlockLabels[taken - 1] || '');
        if (taken >= total) status = 'ask';
      } else if (status === 'queue' || status === 'open') {
        if (status === 'queue') {
          const pos = L.rrPos == null ? 0 : L.rrPos;
          claimedBy = 'Ты · RR #' + ((pos % brokers.length) + 1) + ' ' + brokerAt(pos);
        } else {
          claimedBy = 'Ты (после Early)';
        }
        status = 'claimed';
      }
      return Object.assign({}, L, {
        status: status,
        claimedBy: claimedBy,
        slotTaken: taken,
        claims: (L.claims||0) + 1,
      });
    });
    save(leads);
    render();
  });

  if (form) {
  form.addEventListener('submit', function(e){
    e.preventDefault();
    const fd = new FormData(form);
    submitLeadPayload({
      purpose: fd.get('purpose'),
      rooms: fd.get('rooms'),
      view: fd.get('view'),
      text: fd.get('text'),
    });
  });
  }

  window.reftyBoostInvestor1BrLead = function(){
    const hot = {
      id: 'lead-inv-1br-' + Date.now(),
      role: 'buyer',
      purpose: 'for-sale',
      rooms: '1',
      view: 'Marina view',
      text: 'Инвестор ищет 1 BR в ' + building + ' под сдачу · Marina view. Готов смотреть / бронировать быстро.',
      slotMin: 30,
      slotsTotal: 4,
      slotTaken: 0,
      claims: 0,
      status: 'early',
      hot: true,
      createdAt: Date.now(),
    };
    leads = [hot].concat(leads.filter(function(L){ return L.id !== 'seed-inv-1br'; }));
    save(leads);
    render();
    feed.scrollTop = 0;
  };

  window.reftyPrefillBuildingLead = function(opts){
    opts = opts || {};
    const roomForm = document.getElementById('bld-room-compose');
    const target = roomForm || form;
    if (!target) return;
    if (opts.purpose && target.purpose) target.purpose.value = opts.purpose;
    if (opts.rooms && target.rooms) {
      const opt = Array.from(target.rooms.options).find(function(o){ return o.value === String(opts.rooms); });
      if (opt) target.rooms.value = String(opts.rooms);
    }
    if (opts.view && target.view) target.view.value = opts.view;
    if (opts.text && target.text) target.text.value = opts.text;
    const el = document.getElementById('building-room') || document.getElementById('building-leads');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (target.text) target.text.focus();
  };

  render();
})();
</script>`;
}

module.exports = {
  buildingLeadChatCss,
  buildingLeadRequestHtml,
  buildingLeadChatHtml,
  buildingLeadChatBootScript,
  roomOptionsFromListings,
  seedLeads,
  buildingBrokers,
  buildingBrokersByRooms,
};

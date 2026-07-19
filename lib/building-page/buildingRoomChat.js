/**
 * Building room chat — shared thread under the building:
 * investor ↔ brokers who have matching BR (default 1 BR) in this tower.
 */
const { esc } = require('./shared');
const { buildingBrokersByRooms, roomOptionsFromListings } = require('./buildingLeadChat');
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
const ROOM_FOCUS = _ui?.focusRooms || '1';
/** Investor Split Desk: hide «Запрос брокерам · off-market» block (keep code for later). */
const SHOW_INVESTOR_OFFMARKET_ROOM = false;

/** 5 dog breeds — each broker gets one by index % 5. */
const DOG_TYPES = [
  { id: 'husky', emoji: '🐺', label: 'Хаски', bark: 'Ау-у-у!' },
  { id: 'beagle', emoji: '🐶', label: 'Бигль', bark: 'Гав-гав!' },
  { id: 'golden', emoji: '🦮', label: 'Golden', bark: 'Аф-аф!' },
  { id: 'poodle', emoji: '🐩', label: 'Пудель', bark: 'Тяф-тяф!' },
  { id: 'bulldog', emoji: '🐕', label: 'Бульдог', bark: 'Ррр-гав!' },
];

function brokerDog(i) {
  return DOG_TYPES[((Number(i) || 0) % DOG_TYPES.length + DOG_TYPES.length) % DOG_TYPES.length];
}

function seedRoomMessages() {
  return [];
}

function buildingRoomChatCss() {
  return `
    /* Feature flag: SHOW_INVESTOR_OFFMARKET_ROOM=false → hide whole under-building off-market block */
    ${SHOW_INVESTOR_OFFMARKET_ROOM ? '' : '#building-under{display:none!important}'}
    .bld-under {
      max-width:1400px; width:100%; margin:18px auto 0; padding:0 16px 8px 0;
    }
    .bld-under-grid {
      display:grid; grid-template-columns:minmax(0,1.15fr) minmax(300px,0.85fr); gap:14px; align-items:stretch;
    }
    .bld-under-grid--investor { grid-template-columns:1fr; max-width:720px; margin:0 auto; }
    .bld-under .bld-leads { max-width:none; width:auto; margin:0; padding:0; }
    .bld-room {
      border:1px solid var(--line); border-radius:18px; overflow:hidden;
      background:linear-gradient(180deg,#0e1a22 0%,#081018 100%);
      box-shadow:0 18px 50px rgba(0,0,0,.35);
      display:flex; flex-direction:column; min-height:480px; max-height:640px;
      transition:box-shadow .35s ease, border-color .35s ease;
    }
    #building-room.is-flash {
      border-color:rgba(56,189,248,.55);
      box-shadow:0 0 0 2px rgba(56,189,248,.4), 0 18px 50px rgba(56,189,248,.2);
    }
    .bld-room-head {
      padding:14px 16px; border-bottom:1px solid rgba(255,255,255,.06);
      display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:10px;
    }
    .bld-room-head h2 {
      margin:0; font-family:Fraunces,serif; font-size:1.2rem; letter-spacing:-.02em; font-weight:800;
    }
    .bld-room-head p { margin:5px 0 0; color:var(--muted); font-size:12px; line-height:1.4; max-width:36ch; }
    .bld-room-badge {
      display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px;
      border:1px solid rgba(94,228,168,.35); background:rgba(94,228,168,.1);
      font-size:11px; font-weight:800; color:var(--good); white-space:nowrap;
    }
    .bld-room-badge i {
      width:7px; height:7px; border-radius:50%; background:var(--good);
      box-shadow:0 0 0 3px rgba(94,228,168,.2); display:inline-block;
    }
    .bld-room-invited {
      padding:8px 14px 10px; border-bottom:1px solid rgba(255,255,255,.06);
      background:rgba(94,228,168,.05);
    }
    .bld-room-invited-label {
      margin:0 0 6px; font-size:10px; font-weight:800; letter-spacing:.06em;
      text-transform:uppercase; color:var(--good);
    }
    .bld-room-invited-label span { color:var(--sand); }
    .bld-room-chip.is-joining {
      animation: bld-chip-join 0.55s ease-out;
    }
    @keyframes bld-chip-join {
      0% { opacity:0; transform:scale(0.6) translateY(6px); }
      70% { transform:scale(1.06) translateY(-2px); }
      100% { opacity:1; transform:scale(1) translateY(0); }
    }
    .bld-room-stage {
      flex:1 1 auto; min-height:0; display:flex; flex-direction:column;
      overflow:hidden;
    }
    .bld-room-prechat {
      flex:1 1 auto; display:flex; flex-direction:column; align-items:center; justify-content:center;
      gap:8px; padding:24px 16px; text-align:center;
    }
    .bld-room-prechat p { margin:0; font-size:12px; color:var(--muted); line-height:1.45; max-width:28ch; }
    .bld-room-prechat strong { color:var(--sand); font-size:13px; display:block; margin-bottom:4px; }
    .bld-room-invite-anim {
      flex:1 1 auto; display:none; flex-direction:column; gap:10px;
      padding:16px 14px; overflow:auto;
    }
    .bld-room-invite-anim.is-on { display:flex; }
    .bld-room-invite-anim .bld-invite-pulse {
      text-align:center; padding:12px; border-radius:14px;
      border:1px dashed rgba(94,228,168,.4); background:rgba(94,228,168,.08);
      animation: bld-invite-pulse 1.4s ease-in-out infinite;
    }
    @keyframes bld-invite-pulse {
      0%,100% { box-shadow:0 0 0 0 rgba(94,228,168,.15); }
      50% { box-shadow:0 0 0 6px rgba(94,228,168,.08); }
    }
    .bld-invite-pulse b { display:block; font-size:12px; color:var(--good); margin-bottom:4px; }
    .bld-invite-pulse span { font-size:11px; color:var(--muted); font-weight:700; }
    .bld-invite-joins { display:grid; gap:6px; }
    .bld-invite-row {
      display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:12px;
      border:1px solid rgba(255,255,255,.08); background:rgba(0,0,0,.22);
      opacity:0; transform:translateX(12px);
      transition:opacity 0.35s ease, transform 0.35s ease;
    }
    .bld-invite-row.is-in { opacity:1; transform:translateX(0); }
    .bld-invite-row em {
      flex:0 0 auto; width:28px; height:28px; border-radius:50%;
      display:inline-flex; align-items:center; justify-content:center;
      font-style:normal; font-size:15px; border:1px solid rgba(255,255,255,.12);
    }
    .bld-invite-row span { font-size:12px; font-weight:700; color:var(--sand); }
    .bld-invite-row i { margin-left:auto; font-style:normal; font-size:10px; color:var(--good); font-weight:800; }
    .bld-room-thread.is-hidden { display:none; }
    .bld-room-thread:not(.is-hidden) { flex:1 1 auto; }
    .bld-room-follow {
      flex:0 0 auto; display:none; grid-template-columns:1fr auto; gap:8px; align-items:end;
      padding:10px 12px; border-top:1px solid rgba(255,255,255,.06); background:rgba(0,0,0,.28);
    }
    .bld-room-follow.is-on { display:grid; }
    .bld-room-follow textarea {
      width:100%; box-sizing:border-box; min-height:40px; max-height:88px; resize:vertical;
      border-radius:12px; border:1px solid var(--line); background:#07131a; color:var(--text);
      font:inherit; font-size:13px; padding:9px 10px;
    }
    .bld-room-follow button {
      appearance:none; border:1px solid var(--sand); background:var(--sand); color:#1a1208;
      font:inherit; font-weight:800; font-size:12px; padding:10px 14px; border-radius:999px; cursor:pointer;
    }
    .bld-room.is-locked .bld-room-compose .bld-room-lead-hint::after { content:' · invite после отправки'; }
    .bld-room-chips {
      display:flex; flex-wrap:wrap; gap:5px; max-height:64px; overflow:auto;
    }
    .bld-room-chip {
      display:inline-flex; align-items:center; gap:5px; padding:3px 8px 3px 3px;
      border-radius:999px; border:1px solid rgba(255,255,255,.1);
      background:rgba(0,0,0,.28); font-size:10px; font-weight:700; color:var(--sand);
      max-width:140px;
    }
    .bld-room-chip em {
      flex:0 0 auto; width:22px; height:22px; border-radius:50%;
      display:inline-flex; align-items:center; justify-content:center;
      font-style:normal; font-size:13px; line-height:1;
      background:rgba(0,0,0,.25); border:1px solid rgba(255,255,255,.12);
    }
    .bld-room-chip.bld-dog--husky em { background:linear-gradient(145deg,#5a7fc7,#3d5a9a); }
    .bld-room-chip.bld-dog--beagle em { background:linear-gradient(145deg,#c9a66b,#8b6914); }
    .bld-room-chip.bld-dog--golden em { background:linear-gradient(145deg,#e8c468,#b8860b); }
    .bld-room-chip.bld-dog--poodle em { background:linear-gradient(145deg,#e8b4c8,#c77da0); }
    .bld-room-chip.bld-dog--bulldog em { background:linear-gradient(145deg,#a89888,#6b5d4f); }
    .bld-room-chip span {
      overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    }
    .bld-room-chip--more {
      border-style:dashed; color:var(--muted); padding:3px 9px;
    }
    .bld-msg--system {
      align-self:center; max-width:100%;
      border-style:dashed; border-color:rgba(94,228,168,.35);
      background:rgba(94,228,168,.06); text-align:center;
    }
    .bld-msg--system .bld-msg-meta { justify-content:center; text-transform:none; letter-spacing:0; }
    .bld-msg--system .who { color:var(--good); }
    .bld-room-thread {
      flex:1 1 auto; min-height:0; overflow:auto; padding:12px 14px;
      display:flex; flex-direction:column; gap:10px;
    }
    .bld-msg {
      max-width:92%; padding:10px 12px; border-radius:14px;
      border:1px solid rgba(255,255,255,.07); background:rgba(0,0,0,.28);
    }
    .bld-msg--investor {
      align-self:flex-start;
      border-color:rgba(251,188,5,.35); background:rgba(251,188,5,.08);
    }
    .bld-msg--broker {
      align-self:flex-end;
      border-color:rgba(62,207,207,.3); background:rgba(62,207,207,.08);
    }
    .bld-msg--dog .bld-dog-face {
      flex:0 0 auto; width:26px; height:26px; border-radius:50%;
      display:inline-flex; align-items:center; justify-content:center;
      font-size:15px; line-height:1; border:1px solid rgba(255,255,255,.15);
      background:rgba(0,0,0,.3);
    }
    .bld-msg--dog.bld-dog--husky .bld-dog-face { background:linear-gradient(145deg,#5a7fc7,#3d5a9a); }
    .bld-msg--dog.bld-dog--beagle .bld-dog-face { background:linear-gradient(145deg,#c9a66b,#8b6914); }
    .bld-msg--dog.bld-dog--golden .bld-dog-face { background:linear-gradient(145deg,#e8c468,#b8860b); }
    .bld-msg--dog.bld-dog--poodle .bld-dog-face { background:linear-gradient(145deg,#e8b4c8,#c77da0); }
    .bld-msg--dog.bld-dog--bulldog .bld-dog-face { background:linear-gradient(145deg,#a89888,#6b5d4f); }
    .bld-msg-meta .role-dog { color:#fbbc05; font-size:9px; }
    .bld-msg--typing {
      align-self:flex-end; opacity:.85; border-style:dashed;
      animation: bld-dog-pant 1.2s ease-in-out infinite;
    }
    @keyframes bld-dog-pant {
      0%,100% { opacity:.7; transform:translateY(0); }
      50% { opacity:1; transform:translateY(-1px); }
    }
    .bld-msg--me {
      align-self:flex-end;
      border-color:rgba(94,228,168,.4); background:rgba(94,228,168,.1);
    }
    .bld-msg-meta {
      display:flex; flex-wrap:wrap; gap:6px; align-items:center;
      font-size:10px; color:var(--muted); font-weight:700; margin:0 0 4px;
      text-transform:uppercase; letter-spacing:.04em;
    }
    .bld-msg-meta .who { color:var(--sand); }
    .bld-msg-meta .role-inv { color:#fbbc05; }
    .bld-msg-meta .role-br { color:var(--sea); }
    .bld-msg p { margin:0; font-size:13px; line-height:1.4; color:var(--text); }
    .bld-room-compose {
      flex:0 0 auto; border-bottom:1px solid rgba(255,255,255,.06); padding:10px 12px 12px;
      display:grid; gap:8px; background:rgba(0,0,0,.22);
    }
    .bld-room-lead-bar {
      display:flex; flex-wrap:wrap; align-items:baseline; justify-content:space-between; gap:6px;
    }
    .bld-room-lead-title {
      font-family:Fraunces,serif; font-size:14px; font-weight:800; color:var(--sand); letter-spacing:-.02em;
    }
    .bld-room-lead-hint { font-size:11px; color:var(--muted); font-weight:700; }
    .bld-room-lead-filters {
      display:grid; grid-template-columns:minmax(0,1fr) minmax(0,0.7fr) minmax(0,1.2fr); gap:6px;
    }
    .bld-room-lead-filters select, .bld-room-lead-filters input {
      width:100%; box-sizing:border-box; border-radius:10px; border:1px solid var(--line);
      background:#07131a; color:var(--text); font:inherit; font-size:11px; padding:7px 9px;
    }
    .bld-room-row {
      display:grid; grid-template-columns:1fr auto; gap:8px; align-items:end;
    }
    .bld-room-row textarea {
      width:100%; box-sizing:border-box; min-height:44px; max-height:100px; resize:vertical;
      border-radius:12px; border:1px solid var(--line); background:#07131a; color:var(--text);
      font:inherit; font-size:13px; padding:10px 11px;
    }
    .bld-room-row button {
      appearance:none; border:1px solid var(--sand); background:var(--sand); color:#1a1208;
      font:inherit; font-weight:800; font-size:12px; padding:11px 14px; border-radius:999px; cursor:pointer;
      white-space:nowrap;
    }
    .bld-room-row button:hover { filter:brightness(1.05); }
    .bld-room-note {
      margin:0; font-size:11px; color:var(--muted); line-height:1.35;
    }
    .bld-room-note a { color:var(--good); }
    @media (max-width:980px) {
      .bld-under { padding:0 10px 8px; }
      .bld-under-grid { grid-template-columns:1fr; }
      .bld-room { min-height:400px; max-height:620px; }
      .bld-room-lead-filters { grid-template-columns:1fr 1fr; }
    }
    @media (max-width:480px) {
      .bld-room-lead-filters { grid-template-columns:1fr; }
    }
  `;
}

function buildingRoomChatHtml(page) {
  const building = page.building || 'Building';
  const rooms = ROOM_FOCUS;
  const sale = page.listings_sale || [];
  const rent = page.listings_rent || [];
  const roomOpts = roomOptionsFromListings(sale, rent);
  const brokers = buildingBrokersByRooms(sale, rent, rooms);
  const roomSelect = roomOpts
    .map((r) => `<option value="${esc(r)}"${r === rooms ? ' selected' : ''}>${esc(r)} BR</option>`)
    .join('');
  return `
  <aside class="bld-room is-locked" id="building-room" data-building="${esc(building)}" data-rooms="${esc(rooms)}" data-brokers="${brokers.length}">
    <div class="bld-room-head">
      <div>
        <h2>Запрос брокерам · off-market</h2>
        <p>Отправь <b>off-market запрос</b> — invite <b>${brokers.length} брокеров</b>, первые 5 зайдут с офферами.</p>
      </div>
      <span class="bld-room-badge"><i></i>🦴 ${rooms} BR · <span id="bld-badge-count">0</span>/${brokers.length}</span>
    </div>
    <div class="bld-room-invited">
      <p class="bld-room-invited-label">Стая · online <span id="bld-joined-count">0</span> / ${brokers.length}</p>
      <div class="bld-room-chips" id="bld-room-chips-live"></div>
    </div>
    <form class="bld-room-compose" id="bld-room-compose">
      <div class="bld-room-lead-bar">
        <span class="bld-room-lead-title">🦴 Off-market запрос под здание</span>
        <span class="bld-room-lead-hint">Заполни и отправь брокерам</span>
      </div>
      <div class="bld-room-lead-filters">
        <select name="purpose" aria-label="Цель">
          <option value="for-sale">Купить</option>
          <option value="for-rent">Снять</option>
        </select>
        <select name="rooms" aria-label="Комнаты">${roomSelect}</select>
        <input name="view" type="text" placeholder="Вид: Marina, high floor…" maxlength="80" />
      </div>
      <div class="bld-room-row">
        <textarea name="text" id="bld-room-text" placeholder="Что ищете off-market — брокеры ответят скрытыми / лучшими офферами…" maxlength="500" required></textarea>
        <button type="submit" id="bld-room-submit">Отправить 🐕</button>
      </div>
      <p class="bld-room-note">Invite ${brokers.length} брокеров · off-market откроется после отправки · <a href="${esc(INVITE)}" target="_blank" rel="noopener">invite</a></p>
    </form>
    <div class="bld-room-stage" id="bld-room-stage">
      <div class="bld-room-prechat" id="bld-room-prechat">
        <strong>Off-market пока закрыт</strong>
        <p>Отправь запрос сверху — разошлём invite <b>${brokers.length}</b> брокерам с ${esc(rooms)} BR. Первые 5 зайдут по одному.</p>
      </div>
      <div class="bld-room-invite-anim" id="bld-room-invite-anim" aria-live="polite">
        <div class="bld-invite-pulse" id="bld-invite-pulse">
          <b>📨 Off-market invite…</b>
          <span id="bld-invite-status">${brokers.length} брокеров · ${esc(rooms)} BR · ${esc(building)}</span>
        </div>
        <div class="bld-invite-joins" id="bld-invite-joins"></div>
      </div>
      <div class="bld-room-thread is-hidden" id="bld-room-thread" aria-live="polite"></div>
    </div>
    <form class="bld-room-follow" id="bld-room-follow">
      <textarea name="text" id="bld-room-follow-text" placeholder="Дописать брокерам в off-market…" maxlength="500"></textarea>
      <button type="submit">🐕</button>
    </form>
  </aside>`;
}

function buildingUnderBuildingHtml(page) {
  // Investor page: only off-market request. Broker «Разговорчики» feed is separate
  // (lib/building-page/brokerRazgovorchiki.stub.js → https://b2b.refty.ai/inbox?tab=property).
  // Hidden when SHOW_INVESTOR_OFFMARKET_ROOM=false (CSS + aria-hidden).
  const hiddenAttrs = SHOW_INVESTOR_OFFMARKET_ROOM
    ? ''
    : ' hidden aria-hidden="true" data-feature="investor-offmarket-room-off"';
  return `
  <section class="bld-under" id="building-under"${hiddenAttrs}>
    <div class="bld-under-grid bld-under-grid--investor">
      ${buildingRoomChatHtml(page)}
    </div>
  </section>`;
}

function buildingRoomChatBootScript(page) {
  const building = page.building || 'Building';
  const rooms = ROOM_FOCUS;
  const brokers = buildingBrokersByRooms(page.listings_sale || [], page.listings_rent || [], rooms);
  const dogTypes = DOG_TYPES;
  const brokerTotal = brokers.length;
  return `<script>
(function(){
  const building = ${JSON.stringify(building)};
  const rooms = ${JSON.stringify(rooms)};
  const brokerTotal = ${brokerTotal};
  const storeKey = 'refty_bld_room_v5_' + rooms + 'br_' + building.toLowerCase().replace(/[^a-z0-9]+/g,'_');
  const unlockKey = 'refty_bld_room_unlock_v1_' + rooms + 'br_' + building.toLowerCase().replace(/[^a-z0-9]+/g,'_');
  const brokers = ${JSON.stringify(brokers)};
  const DOG_TYPES = ${JSON.stringify(dogTypes)};
  const roomEl = document.getElementById('building-room');
  const thread = document.getElementById('bld-room-thread');
  const prechat = document.getElementById('bld-room-prechat');
  const inviteAnim = document.getElementById('bld-room-invite-anim');
  const inviteJoins = document.getElementById('bld-invite-joins');
  const invitePulse = document.getElementById('bld-invite-pulse');
  const inviteStatus = document.getElementById('bld-invite-status');
  const chipsLive = document.getElementById('bld-room-chips-live');
  const joinedCountEl = document.getElementById('bld-joined-count');
  const badgeCountEl = document.getElementById('bld-badge-count');
  const form = document.getElementById('bld-room-compose');
  const followForm = document.getElementById('bld-room-follow');
  const submitBtn = document.getElementById('bld-room-submit');
  if (!thread || !form) return;
  let replyTimers = [];
  let inviteRunning = false;
  let joinedCount = 0;

  function isUnlocked(){
    try { return localStorage.getItem(unlockKey) === '1'; } catch(e){ return false; }
  }
  function setUnlocked(on){
    try { localStorage.setItem(unlockKey, on ? '1' : '0'); } catch(e){}
  }
  let chatUnlocked = isUnlocked();

  function brokerDog(i){
    return DOG_TYPES[((Number(i) || 0) % DOG_TYPES.length + DOG_TYPES.length) % DOG_TYPES.length];
  }
  function dogById(id){
    return DOG_TYPES.find(function(d){ return d.id === id; }) || DOG_TYPES[0];
  }
  function escHtml(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function load(){
    if (!chatUnlocked) return [];
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  }
  function save(list){
    if (!chatUnlocked) return;
    try { localStorage.setItem(storeKey, JSON.stringify(list)); } catch (e) {}
  }
  let msgs = load();

  function updateJoinedUi(){
    if (joinedCountEl) joinedCountEl.textContent = String(joinedCount);
    if (badgeCountEl) badgeCountEl.textContent = String(joinedCount);
  }
  function chipHtml(name, i){
    const dog = brokerDog(i);
    return '<span class="bld-room-chip bld-dog--' + dog.id + ' is-joining" title="' + escHtml(dog.label + ' · ' + name) + '">' +
      '<em>' + dog.emoji + '</em><span>' + escHtml(name) + '</span></span>';
  }
  function addJoinedChip(name, i){
    if (!chipsLive) return;
    joinedCount += 1;
    updateJoinedUi();
    chipsLive.insertAdjacentHTML('beforeend', chipHtml(name, i));
    if (joinedCount === 5 && brokerTotal > 5) {
      chipsLive.insertAdjacentHTML('beforeend',
        '<span class="bld-room-chip bld-room-chip--more">+' + (brokerTotal - 5) + ' в invite</span>');
    }
  }
  function renderJoinedChipsFromState(n){
    joinedCount = 0;
    if (chipsLive) chipsLive.innerHTML = '';
    const pack = brokers.slice(0, Math.min(5, n || 5));
    pack.forEach(function(name, i){ addJoinedChip(name, i); });
  }
  function unlockChatUi(){
    chatUnlocked = true;
    setUnlocked(true);
    if (roomEl) roomEl.classList.remove('is-locked');
    if (prechat) prechat.style.display = 'none';
    if (inviteAnim) inviteAnim.classList.remove('is-on');
    thread.classList.remove('is-hidden');
    if (followForm) followForm.classList.add('is-on');
    if (submitBtn) submitBtn.textContent = 'Ещё off-market 🐕';
  }
  function runInviteAnimation(done){
    if (!inviteAnim || !inviteJoins) { done(); return; }
    inviteRunning = true;
    if (prechat) prechat.style.display = 'none';
    inviteAnim.classList.add('is-on');
    inviteJoins.innerHTML = '';
    if (invitePulse) {
      invitePulse.querySelector('b').textContent = '📨 Off-market invite отправлен';
    }
    if (inviteStatus) {
      inviteStatus.textContent = brokerTotal + ' брокеров получили invite · ' + rooms + ' BR · ' + building;
    }
    const pack = brokers.slice(0, 5);
    if (!pack.length) pack.push('Broker Dog');
    let delay = 600;
    pack.forEach(function(name, i){
      const dog = brokerDog(i);
      const row = document.createElement('div');
      row.className = 'bld-invite-row';
      row.innerHTML = '<em>' + dog.emoji + '</em><span>#' + (i + 1) + ' · ' + escHtml(name) + '</span><i>заходит…</i>';
      inviteJoins.appendChild(row);
      setTimeout(function(){
        row.classList.add('is-in');
        addJoinedChip(name, i);
        row.querySelector('i').textContent = 'online · ' + dog.bark;
      }, delay);
      delay += 650;
    });
    setTimeout(function(){
      if (invitePulse) {
        invitePulse.querySelector('b').textContent = '✅ ' + Math.min(5, pack.length) + ' в off-market · invite ' + brokerTotal;
      }
      inviteRunning = false;
      unlockChatUi();
      done();
    }, delay + 400);
  }

  function ago(ts){
    const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (m < 1) return 'сейчас';
    if (m < 60) return m + 'м';
    return Math.round(m/60) + 'ч';
  }
  function msgHtml(M){
    if (M.role === 'system') {
      return '<div class="bld-msg bld-msg--system">' +
        '<div class="bld-msg-meta"><span class="who">' + escHtml(M.name || 'Refty') + '</span>' +
          '<span style="margin-left:auto">' + ago(M.createdAt || Date.now()) + '</span></div>' +
        '<p>' + escHtml(M.text || '') + '</p>' +
      '</div>';
    }
    if (M.typing) {
      const dog = dogById(M.dogId || 'beagle');
      return '<div class="bld-msg bld-msg--broker bld-msg--dog bld-msg--typing bld-dog--' + dog.id + '">' +
        '<div class="bld-msg-meta"><span class="bld-dog-face" aria-hidden="true">' + dog.emoji + '</span>' +
          '<span class="who">' + escHtml(dog.label) + '</span>' +
          '<span class="role-dog">🦴 лает…</span></div>' +
        '<p>аф… аф…</p></div>';
    }
    const isInv = M.role === 'investor';
    const dog = M.dogId ? dogById(M.dogId) : null;
    const cls = isInv ? 'bld-msg--investor' : (M.me ? 'bld-msg--me' : 'bld-msg--broker') +
      (dog ? ' bld-msg--dog bld-dog--' + dog.id : '');
    const roleLabel = isInv ? 'инвестор' : (dog ? '🦴 ' + dog.label : 'брокер');
    const roleCls = isInv ? 'role-inv' : (dog ? 'role-dog' : 'role-br');
    const whoLabel = isInv ? escHtml(M.name || 'Инвестор') :
      (dog ? escHtml(dog.label + ' · ' + (M.name || '')) : escHtml(M.name || ''));
    const face = dog ? '<span class="bld-dog-face" aria-hidden="true">' + dog.emoji + '</span>' : '';
    return '<div class="bld-msg ' + cls + '">' +
      '<div class="bld-msg-meta">' + face +
        '<span class="who">' + whoLabel + '</span>' +
        '<span class="' + roleCls + '">' + roleLabel + '</span>' +
        '<span style="margin-left:auto">' + ago(M.createdAt || Date.now()) + '</span></div>' +
      '<p>' + escHtml(M.text || '') + '</p>' +
    '</div>';
  }
  function render(){
    if (!chatUnlocked) return;
    thread.innerHTML = msgs.length ? msgs.map(msgHtml).join('') : '';
    thread.scrollTop = thread.scrollHeight;
  }
  function pushMsg(M, skipSave){
    msgs = msgs.concat([M]);
    if (!skipSave) save(msgs);
    render();
  }
  function clearReplyTimers(){
    replyTimers.forEach(function(t){ clearTimeout(t); });
    replyTimers = [];
    msgs = msgs.filter(function(m){ return !m.typing; });
  }
  function dogReplyText(dog, brokerName, ctx){
    const snip = ctx.text.length > 48 ? ctx.text.slice(0, 46) + '…' : ctx.text;
    const pool = [
      dog.bark + ' Аф аф аф! Мой лид! ' + ctx.rooms + ' BR · ' + snip,
      dog.bark + ' Гав! ' + brokerName + ' — лучший оффер уже в зубах!',
      dog.bark + ' Тяф-тяф! Early Access — я первый, не отдам лид!',
      dog.bark + ' Ррр… ' + (ctx.view || 'Marina view') + ' — мой запах, мой клиент!',
      dog.bark + ' Аф-аф! Off-market ' + ctx.rooms + ' BR — мой хвост первый!',
    ];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function simulateDogPack(ctx){
    if (!chatUnlocked) return;
    clearReplyTimers();
    const pack = brokers.slice(0, 5).map(function(name, i){
      return { name: name, dog: brokerDog(i), idx: i };
    });
    if (!pack.length) pack.push({ name: 'Broker Dog', dog: brokerDog(0), idx: 0 });
    const count = Math.min(pack.length, 3 + Math.floor(Math.random() * 2));
    const order = pack.slice().sort(function(){ return Math.random() - 0.5; }).slice(0, count);
    let delay = 400;
    order.forEach(function(b, i){
      const typingId = 'typing-' + Date.now() + '-' + i;
      replyTimers.push(setTimeout(function(){
        pushMsg({ id: typingId, role: 'broker', typing: true, dogId: b.dog.id, createdAt: Date.now() }, true);
      }, delay));
      delay += 700 + Math.floor(Math.random() * 400);
      replyTimers.push(setTimeout(function(){
        msgs = msgs.filter(function(m){ return m.id !== typingId; });
        pushMsg({
          id: 'rm-dog-' + Date.now() + '-' + i,
          role: 'broker',
          name: b.name,
          dogId: b.dog.id,
          text: dogReplyText(b.dog, b.name, ctx),
          createdAt: Date.now(),
        });
      }, delay));
      delay += 900 + Math.floor(Math.random() * 700);
    });
  }
  function submitLeadToFeed(payload){
    if (typeof window.reftySubmitBuildingLead === 'function') {
      window.reftySubmitBuildingLead(payload);
    }
  }
  function postInvestorMessage(text, meta){
    pushMsg({
      id: 'rm-' + Date.now(),
      role: 'investor',
      name: 'Инвестор',
      text: text,
      me: true,
      createdAt: Date.now(),
    });
    if (meta) simulateDogPack(meta);
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    if (inviteRunning) return;
    const fd = new FormData(form);
    const purpose = String(fd.get('purpose') || 'for-sale');
    const roomsVal = String(fd.get('rooms') || rooms);
    const view = String(fd.get('view') || '').trim();
    const text = String(fd.get('text') || '').trim();
    if (!text) return;
    const purposeLabel = purpose === 'for-rent' ? 'снять' : 'купить';
    const fullText = (view ? view + ' · ' : '') + text;
    const msgText = '📋 ' + purposeLabel + ' ' + roomsVal + ' BR · ' + fullText;
    const ctx = { text: text, rooms: roomsVal, view: view, purpose: purpose };

    function afterOpen(){
      postInvestorMessage(msgText, ctx);
      submitLeadToFeed({ purpose: purpose, rooms: roomsVal, view: view, text: text });
      form.text.value = '';
      if (form.view) form.view.value = '';
    }

    if (!chatUnlocked) {
      if (submitBtn) submitBtn.disabled = true;
      runInviteAnimation(function(){
        if (submitBtn) submitBtn.disabled = false;
        afterOpen();
      });
    } else {
      afterOpen();
    }
  });

  if (followForm) {
    followForm.addEventListener('submit', function(e){
      e.preventDefault();
      if (!chatUnlocked) return;
      const text = String(followForm.text.value || '').trim();
      if (!text) return;
      postInvestorMessage(text, { text: text, rooms: rooms, view: '', purpose: 'for-sale' });
      followForm.text.value = '';
    });
  }

  window.reftyBuildingRoomPost = function(opts){
    opts = opts || {};
    const text = String(opts.text || '').trim();
    if (!text || !chatUnlocked) return;
    pushMsg({
      id: 'rm-' + Date.now(),
      role: opts.role !== 'broker' ? 'investor' : 'broker',
      name: opts.role !== 'broker' ? 'Инвестор' : String(opts.name || brokers[0] || 'Брокер'),
      dogId: opts.role !== 'broker' ? null : (opts.dogId || brokerDog(0).id),
      text: text,
      me: !!opts.me,
      createdAt: Date.now(),
    });
  };

  /** Prefill room compose + scroll; autoSubmit=true → сразу invite / старт чата. */
  window.reftyStartBrokerChat = function(opts){
    opts = opts || {};
    const purpose = String(opts.purpose || 'for-sale');
    const roomsVal = String(opts.rooms || rooms);
    const view = String(opts.view || '').trim();
    const text = String(opts.text || '').trim() ||
      ('Интересует ' + roomsVal + ' BR в ' + building + ' — свяжитесь, пожалуйста.');
    if (form.purpose) form.purpose.value = purpose;
    if (form.rooms) {
      const has = [...form.rooms.options].some((o) => o.value === roomsVal);
      if (has) form.rooms.value = roomsVal;
    }
    if (form.view) form.view.value = view;
    if (form.text) form.text.value = text;
    if (typeof window.reftyPrefillBuildingLead === 'function') {
      window.reftyPrefillBuildingLead({ purpose: purpose, rooms: roomsVal, view: view, text: text });
    }
    const el = document.getElementById('building-room') || document.getElementById('building-under');
    if (el) {
      el.classList.add('is-flash');
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(function(){ el.classList.remove('is-flash'); }, 1600);
    }
    if (opts.autoSubmit) {
      setTimeout(function(){
        if (inviteRunning) return;
        if (typeof form.requestSubmit === 'function') form.requestSubmit();
        else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }, 350);
    } else if (form.text) {
      setTimeout(function(){ form.text.focus(); }, 400);
    }
  };

  if (chatUnlocked) {
    unlockChatUi();
    renderJoinedChipsFromState(5);
    render();
  } else {
    updateJoinedUi();
  }
})();
</script>`;
}

module.exports = {
  buildingRoomChatCss,
  buildingRoomChatHtml,
  buildingRoomChatBootScript,
  buildingUnderBuildingHtml,
  seedRoomMessages,
};

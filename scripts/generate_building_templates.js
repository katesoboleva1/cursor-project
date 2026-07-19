#!/usr/bin/env node
/**
 * Generate 3 building page template formats from page JSON (or live CH via generate_building_page).
 * Usage:
 *   node scripts/generate_building_templates.js
 *   node scripts/generate_building_templates.js "Marina Gate 2"
 *   CONFIG=config/building_page.deploy.json node scripts/generate_building_templates.js
 */
const fs = require('fs');
const path = require('path');

const { renderBuildingPageHtml } = require('../lib/building-page/renderBuildingPageHtml');
const { renderSplitDeskHtml } = require('../lib/building-page/renderSplitDeskHtml');
const { renderGalleryHtml } = require('../lib/building-page/renderGalleryHtml');
const { renderDldSubpageHtml } = require('../lib/building-page/renderDldSubpageHtml');
const { loadBuildingDeployConfig, slugBuilding } = require('../lib/building-page/loadDeployConfig');

function slug(s) {
  return slugBuilding(s);
}

function renderIndex(page, files) {
  const b = page.building || 'Building';
  const cards = [
    {
      id: 'A',
      name: 'Elevator',
      file: files.elevator,
      blurb: 'Вертикальный лифт: этажи сверху вниз, кабина с фото и pin-unit. Лучше для «прогулки» по башне.',
    },
    {
      id: 'B',
      name: 'Split Desk',
      file: files.split,
      blurb: 'Три колонки: этаж → список лотов → детали + Refty Signal. Клик по DLD-ленте → соседняя вкладка.',
    },
    {
      id: 'C',
      name: 'Gallery',
      file: files.gallery,
      blurb: 'Photo-first сетка с фильтрами (rooms / floor band / sort) и slide-over. Для сканирования лотов.',
    },
    {
      id: 'D',
      name: 'DLD Transactions',
      file: files.dld,
      blurb: 'Отдельная подстраница DLD Sale / Rent по зданию. Таблицы сделок vs median AED/sqft.',
    },
  ];
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${b} · templates · Refty</title>
  <style>
    :root { --bg:#07090d; --card:#12151c; --line:#2a3140; --text:#f2f4f8; --muted:#9aa3b2; --accent:#efff00; }
    * { box-sizing:border-box; }
    body { margin:0; font:16px/1.5 ui-sans-serif,system-ui,sans-serif; background:radial-gradient(1200px 600px at 20% -10%,#1a2030,var(--bg)); color:var(--text); min-height:100vh; }
    .wrap { max-width:960px; margin:0 auto; padding:40px 18px 60px; }
    h1 { margin:0; font-size:clamp(1.8rem,4vw,2.6rem); letter-spacing:-.03em; }
    .sub { color:var(--muted); margin-top:8px; }
    .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; margin-top:28px; }
    @media (min-width:900px){ .grid { grid-template-columns:repeat(4,minmax(0,1fr)); } }
    a.card {
      display:flex; flex-direction:column; gap:10px; padding:18px; border-radius:18px;
      background:linear-gradient(160deg,#171b24,var(--card)); border:1px solid var(--line);
      color:inherit; text-decoration:none; min-height:220px;
      transition: border-color .15s, transform .15s;
    }
    a.card:hover { border-color:rgba(239,255,0,.55); transform:translateY(-2px); }
    .id { font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:var(--accent); font-weight:800; }
    .name { font-size:1.35rem; font-weight:800; letter-spacing:-.02em; }
    .blurb { color:var(--muted); font-size:14px; flex:1; }
    .go { font-weight:800; color:var(--accent); font-size:13px; }
    @media (max-width:800px){ .grid { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${b}</h1>
    <p class="sub">Шаблоны building page · одни и те же данные ClickHouse / Signal / DLD</p>
    <div class="grid">
      ${cards
        .map(
          (c) => `<a class="card" href="${c.file}">
        <div class="id">Template ${c.id}</div>
        <div class="name">${c.name}</div>
        <p class="blurb">${c.blurb}</p>
        <div class="go">Открыть →</div>
      </a>`
        )
        .join('\n')}
    </div>
  </div>
</body>
</html>`;
}

function writeAll(page) {
  const base = slug(page.building || 'building');
  const outDir = path.join(__dirname, '..', 'public');
  const files = {
    elevator: `building_${base}_a_elevator.html`,
    split: `building_${base}_b_split.html`,
    gallery: `building_${base}_c_gallery.html`,
    dld: `building_${base}_dld.html`,
    index: `building_${base}_templates.html`,
    classic: `building_${base}.html`,
  };

  const elevator = renderBuildingPageHtml(page);
  const split = renderSplitDeskHtml(page);
  const gallery = renderGalleryHtml(page);
  const dld = renderDldSubpageHtml(page);
  const index = renderIndex(page, files);

  fs.writeFileSync(path.join(outDir, files.elevator), elevator);
  fs.writeFileSync(path.join(outDir, files.split), split);
  fs.writeFileSync(path.join(outDir, files.gallery), gallery);
  fs.writeFileSync(path.join(outDir, files.dld), dld);
  fs.writeFileSync(path.join(outDir, files.index), index);
  // keep classic alias = elevator
  fs.writeFileSync(path.join(outDir, files.classic), elevator);

  return files;
}

function main() {
  let deploy = null;
  try {
    deploy = loadBuildingDeployConfig();
  } catch (e) {
    /* optional */
  }
  const name = process.argv[2] || deploy?.buildingName || 'Marina Gate 2';
  const base = slug(name);
  const jsonPath = path.join(__dirname, '..', 'public', `building_${base}_page.json`);
  if (!fs.existsSync(jsonPath)) {
    console.error('No page JSON at', jsonPath, '— run: node scripts/generate_building_page.js "' + name + '"');
    process.exit(1);
  }
  const page = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (deploy) {
    page.deploy = {
      invite_url: deploy.inviteUrl,
      focus_rooms: deploy.focusRooms,
      queue_mode: deploy.queueMode,
      config_path: deploy.path,
    };
  }
  const files = writeAll(page);
  console.log('Wrote templates:');
  Object.values(files).forEach((f) => console.log(' ', 'public/' + f));
  if (deploy) console.log('Deploy config:', deploy.path);
}

if (require.main === module) main();

module.exports = { writeAll, renderIndex };

#!/usr/bin/env node
/**
 * Batch-generate building pages (same as Marina Gate 2 split desk) for Dubai buildings.
 *
 *   node scripts/generate_all_building_pages.js
 *   node scripts/generate_all_building_pages.js --min-listings 20
 *   node scripts/generate_all_building_pages.js --limit 100
 *   node scripts/generate_all_building_pages.js --concurrency 2
 *   node scripts/generate_all_building_pages.js --only-split
 *   node scripts/generate_all_building_pages.js --force
 *   node scripts/generate_all_building_pages.js --index-only
 *
 * Progress: var/building_pages_batch.jsonl
 * Hub:      public/buildings_dubai_index.html
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { writeAll } = require('./generate_building_templates');
const { slugBuilding } = require('../lib/building-page/loadDeployConfig');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const varDir = path.join(root, 'var');
const progressPath = path.join(varDir, 'building_pages_batch.jsonl');
const statePath = path.join(varDir, 'building_pages_batch_state.json');

function parseArgs(argv) {
  const out = {
    minListings: 20,
    limit: 0,
    concurrency: 2,
    onlySplit: false,
    force: false,
    indexOnly: false,
    offset: 0,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--min-listings') out.minListings = Math.max(1, Number(argv[++i]) || 20);
    else if (a === '--limit') out.limit = Math.max(0, Number(argv[++i]) || 0);
    else if (a === '--concurrency') out.concurrency = Math.max(1, Math.min(6, Number(argv[++i]) || 2));
    else if (a === '--offset') out.offset = Math.max(0, Number(argv[++i]) || 0);
    else if (a === '--only-split') out.onlySplit = true;
    else if (a === '--force') out.force = true;
    else if (a === '--index-only') out.indexOnly = true;
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/generate_all_building_pages.js [options]
  --min-listings N   active listings threshold (default 20)
  --limit N          max buildings (0 = all matching)
  --offset N         skip first N from the ranked list
  --concurrency N    parallel workers 1..6 (default 2)
  --only-split       write page.json + b_split.html only
  --force            regenerate even if split exists
  --index-only       rebuild hub index from existing public/*.html`);
      process.exit(0);
    }
  }
  return out;
}

const auth = Buffer.from(`${process.env.CLICKHOUSE_USER}:${process.env.CLICKHOUSE_PASSWORD}`).toString('base64');

function q(sql) {
  return new Promise((res, rej) => {
    const req = https.request(
      {
        hostname: process.env.CLICKHOUSE_HOST,
        port: Number(process.env.CLICKHOUSE_PORT || 8443),
        path: '/',
        method: 'POST',
        headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'text/plain' },
      },
      (r) => {
        let x = '';
        r.on('data', (c) => (x += c));
        r.on('end', () => {
          if (r.statusCode >= 400) rej(new Error(x.slice(0, 800)));
          else res(x.trim() ? x.trim().split('\n').map(JSON.parse) : []);
        });
      }
    );
    req.on('error', rej);
    req.end(sql + ' FORMAT JSONEachRow');
  });
}

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function appendProgress(row) {
  fs.mkdirSync(varDir, { recursive: true });
  fs.appendFileSync(progressPath, JSON.stringify(row) + '\n');
}

function writeState(state) {
  fs.mkdirSync(varDir, { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

async function fetchBuildings(minListings, limit, offset) {
  const lim = limit > 0 ? `LIMIT ${limit}` : '';
  const off = offset > 0 ? `OFFSET ${offset}` : '';
  return q(`
SELECT
  building,
  count() AS n,
  countIf(lower(trim(purpose)) = 'for-sale') AS sale_n,
  countIf(lower(trim(purpose)) = 'for-rent') AS rent_n,
  any(district) AS district
FROM refty.unified_properties_table
WHERE building != ''
  AND isActive = 1
GROUP BY building
HAVING n >= ${Number(minListings)}
ORDER BY n DESC
${lim}
${off}
`);
}

function splitPath(building) {
  return path.join(publicDir, `building_${slugBuilding(building)}_b_split.html`);
}

function jsonPath(building) {
  return path.join(publicDir, `building_${slugBuilding(building)}_page.json`);
}

function alreadyDone(building) {
  return fs.existsSync(splitPath(building)) && fs.existsSync(jsonPath(building));
}

function runOne(building) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(__dirname, 'generate_building_page.js'), building], {
      cwd: root,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => {
      out += d;
    });
    child.stderr.on('data', (d) => {
      err += d;
    });
    child.on('close', (code) => {
      resolve({ code, out, err });
    });
  });
}

function writeOnlySplit(building) {
  const jp = jsonPath(building);
  if (!fs.existsSync(jp)) return false;
  const page = JSON.parse(fs.readFileSync(jp, 'utf8'));
  const base = slugBuilding(page.building || building);
  const split = require('../lib/building-page/renderSplitDeskHtml').renderSplitDeskHtml(page);
  fs.writeFileSync(path.join(publicDir, `building_${base}_b_split.html`), split);
  return true;
}

function collectExistingSplits() {
  return fs
    .readdirSync(publicDir)
    .filter((f) => /^building_.+_b_split\.html$/.test(f))
    .map((f) => {
      const base = f.replace(/^building_/, '').replace(/_b_split\.html$/, '');
      const jp = path.join(publicDir, `building_${base}_page.json`);
      let building = base.replace(/_/g, ' ');
      let district = '';
      let sale = 0;
      let rent = 0;
      if (fs.existsSync(jp)) {
        try {
          const page = JSON.parse(fs.readFileSync(jp, 'utf8'));
          building = page.building || building;
          district = page.district || '';
          sale = (page.listings_sale || []).length;
          rent = (page.listings_rent || []).length;
        } catch (e) {
          /* ignore */
        }
      }
      return { building, district, sale, rent, file: f, base };
    })
    .sort((a, b) => String(a.building).localeCompare(String(b.building)));
}

function writeHubIndex(rows, meta) {
  const cards = rows
    .map(
      (r) => `<a class="card" href="${escHtml(r.file)}">
      <div class="name">${escHtml(r.building)}</div>
      <div class="meta">${escHtml(r.district || 'Dubai')} · sale ${r.sale} · rent ${r.rent}</div>
      <div class="go">Split Desk →</div>
    </a>`
    )
    .join('\n');
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dubai buildings · Split Desk · Refty</title>
  <style>
    :root { --bg:#07090d; --card:#12151c; --line:#2a3140; --text:#f2f4f8; --muted:#9aa3b2; --accent:#efff00; }
    * { box-sizing:border-box; }
    body { margin:0; font:15px/1.45 ui-sans-serif,system-ui,sans-serif; background:radial-gradient(1200px 600px at 15% -10%,#1a2030,var(--bg)); color:var(--text); min-height:100vh; }
    .wrap { max-width:1100px; margin:0 auto; padding:36px 16px 60px; }
    h1 { margin:0; font-size:clamp(1.6rem,3.5vw,2.4rem); letter-spacing:-.03em; }
    .sub { color:var(--muted); margin:8px 0 0; }
    .stats { margin-top:14px; font-size:13px; color:var(--muted); }
    .stats b { color:var(--accent); }
    input#q {
      width:100%; margin-top:20px; padding:12px 14px; border-radius:12px; border:1px solid var(--line);
      background:#0c1018; color:var(--text); font:inherit;
    }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; margin-top:18px; }
    a.card {
      display:flex; flex-direction:column; gap:6px; padding:14px 16px; border-radius:14px;
      background:linear-gradient(160deg,#171b24,var(--card)); border:1px solid var(--line);
      color:inherit; text-decoration:none; min-height:110px;
    }
    a.card:hover { border-color:rgba(239,255,0,.5); }
    .name { font-weight:800; letter-spacing:-.02em; }
    .meta { color:var(--muted); font-size:12px; flex:1; }
    .go { font-size:12px; font-weight:800; color:var(--accent); }
    a.card.is-hide { display:none; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Dubai · building pages</h1>
    <p class="sub">Тот же формат, что <code>building_*_b_split.html</code> (Marina Gate 2).</p>
    <p class="stats"><b>${rows.length}</b> зданий · min listings ${escHtml(meta.minListings)} · generated ${escHtml(meta.generatedAt)}</p>
    <input id="q" type="search" placeholder="Поиск здания…" autocomplete="off" />
    <div class="grid" id="grid">
      ${cards}
    </div>
  </div>
  <script>
    const q = document.getElementById('q');
    const cards = [...document.querySelectorAll('a.card')];
    q.addEventListener('input', () => {
      const s = q.value.trim().toLowerCase();
      cards.forEach((c) => {
        const t = (c.querySelector('.name')?.textContent || '').toLowerCase();
        c.classList.toggle('is-hide', s && !t.includes(s));
      });
    });
  </script>
</body>
</html>`;
  fs.writeFileSync(path.join(publicDir, 'buildings_dubai_index.html'), html);
  return path.join(publicDir, 'buildings_dubai_index.html');
}

async function mapPool(items, concurrency, worker) {
  let i = 0;
  let ok = 0;
  let fail = 0;
  let skip = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (i < items.length) {
      const idx = i++;
      const item = items[idx];
      const r = await worker(item, idx);
      if (r === 'ok') ok++;
      else if (r === 'skip') skip++;
      else fail++;
      if ((ok + fail + skip) % 10 === 0 || idx === items.length - 1) {
        console.log(`Progress ${ok + fail + skip}/${items.length} · ok ${ok} · skip ${skip} · fail ${fail}`);
        writeState({ ok, fail, skip, done: ok + fail + skip, total: items.length, at: new Date().toISOString() });
      }
    }
  });
  await Promise.all(workers);
  return { ok, fail, skip };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!process.env.CLICKHOUSE_HOST && !opts.indexOnly) {
    console.error('Missing CLICKHOUSE_* in .env');
    process.exit(1);
  }

  if (opts.indexOnly) {
    const rows = collectExistingSplits();
    const hub = writeHubIndex(rows, {
      minListings: '—',
      generatedAt: new Date().toISOString(),
    });
    console.log(`Index: ${hub} (${rows.length} buildings)`);
    return;
  }

  console.log('Fetching buildings from ClickHouse…', {
    minListings: opts.minListings,
    limit: opts.limit || 'all',
    offset: opts.offset,
    concurrency: opts.concurrency,
    onlySplit: opts.onlySplit,
  });

  const buildings = await fetchBuildings(opts.minListings, opts.limit, opts.offset);
  console.log(`Queue: ${buildings.length} buildings`);

  const started = Date.now();
  const result = await mapPool(buildings, opts.concurrency, async (row, idx) => {
    const name = String(row.building || '').trim();
    if (!name) return 'fail';
    if (!opts.force && alreadyDone(name)) {
      appendProgress({
        t: new Date().toISOString(),
        building: name,
        status: 'skip',
        n: row.n,
      });
      return 'skip';
    }
    const t0 = Date.now();
    try {
      if (opts.onlySplit && fs.existsSync(jsonPath(name)) && !opts.force) {
        writeOnlySplit(name);
        appendProgress({
          t: new Date().toISOString(),
          building: name,
          status: 'ok-split',
          ms: Date.now() - t0,
          n: row.n,
        });
        return 'ok';
      }
      const r = await runOne(name);
      if (r.code !== 0) {
        appendProgress({
          t: new Date().toISOString(),
          building: name,
          status: 'fail',
          code: r.code,
          err: (r.err || r.out || '').slice(0, 400),
          n: row.n,
        });
        console.error(`FAIL [${idx + 1}] ${name}:`, (r.err || r.out || '').slice(0, 200));
        return 'fail';
      }
      if (opts.onlySplit) {
        // generate_building_page already writes all templates; trim extras if requested
        const base = slugBuilding(name);
        for (const f of [
          `building_${base}_a_elevator.html`,
          `building_${base}_c_gallery.html`,
          `building_${base}_dld.html`,
          `building_${base}_templates.html`,
          `building_${base}.html`,
        ]) {
          const p = path.join(publicDir, f);
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
      }
      appendProgress({
        t: new Date().toISOString(),
        building: name,
        status: 'ok',
        ms: Date.now() - t0,
        n: row.n,
        district: row.district,
      });
      console.log(`OK [${idx + 1}/${buildings.length}] ${name} (${row.n} ads, ${Date.now() - t0}ms)`);
      return 'ok';
    } catch (e) {
      appendProgress({
        t: new Date().toISOString(),
        building: name,
        status: 'fail',
        err: String(e.message || e).slice(0, 400),
        n: row.n,
      });
      console.error(`FAIL [${idx + 1}] ${name}:`, e.message || e);
      return 'fail';
    }
  });

  const rows = collectExistingSplits();
  const hub = writeHubIndex(rows, {
    minListings: opts.minListings,
    generatedAt: new Date().toISOString(),
  });

  writeState({
    ...result,
    total: buildings.length,
    elapsed_ms: Date.now() - started,
    hub,
    at: new Date().toISOString(),
    opts,
  });

  console.log('Done:', result);
  console.log('Hub:', hub);
  console.log(`Elapsed ${Math.round((Date.now() - started) / 1000)}s`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});

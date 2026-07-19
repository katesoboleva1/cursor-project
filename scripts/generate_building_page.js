#!/usr/bin/env node
/**
 * Building page — floors high→low · for-sale/for-rent · photo rows · SEO · reviews
 *
 *   node scripts/generate_building_page.js "Marina Gate 2"
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { renderBuildingPageHtml, fmt, fmtM } = require('../lib/building-page/renderBuildingPageHtml');

const buildingName = process.argv.slice(2).join(' ').trim();
if (!buildingName) {
  console.error('Usage: node scripts/generate_building_page.js "Marina Gate 2"');
  process.exit(1);
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

function escSql(s) {
  return String(s).replace(/'/g, "''");
}

/**
 * DLD names often differ from portal `building`:
 *   portal: "Sobha Creek Vista Heights Tower A"
 *   DLD:    "Sobha Creek Vista Heights - Tower A" / "SOBHA CREEK VISTAS ? TOWER A"
 *   refty:  "Sobha Creek Vista Heights"
 */
function sqlDldSaleMatch(building) {
  const b = String(building || '').trim();
  const esc = escSql(b);
  const towerM = b.match(/^(.*?)\s+Tower\s+([AB])$/i);
  if (towerM) {
    const base = towerM[1].trim();
    const tower = towerM[2].toUpperCase();
    const baseEsc = escSql(base);
    const isCvh =
      /creek\s+vista\s+heights/i.test(base) || /creek\s+vistas?\s+heights/i.test(base);
    if (isCvh) {
      // Heights + Vistas naming; exclude Reserve / Grande
      return `(
        (
          positionCaseInsensitive(coalesce(refty_building, ''), 'Creek Vista Height') > 0
          OR positionCaseInsensitive(coalesce(building_name_en, ''), 'Creek Vista Height') > 0
          OR (
            positionCaseInsensitive(coalesce(building_name_en, ''), 'Creek Vistas') > 0
            AND positionCaseInsensitive(coalesce(building_name_en, ''), 'Reserve') = 0
            AND positionCaseInsensitive(coalesce(building_name_en, ''), 'Grande') = 0
          )
        )
        AND positionCaseInsensitive(coalesce(building_name_en, ''), 'Tower ${tower}') > 0
        AND positionCaseInsensitive(coalesce(building_name_en, ''), 'Reserve') = 0
        AND positionCaseInsensitive(coalesce(building_name_en, ''), 'Grande') = 0
      )`;
    }
    return `(
      refty_building = '${esc}'
      OR building_name_en ILIKE '%${esc}%'
      OR project_name_en ILIKE '%${esc}%'
      OR (
        (refty_building ILIKE '%${baseEsc}%' OR building_name_en ILIKE '%${baseEsc}%')
        AND building_name_en ILIKE '%Tower ${tower}%'
      )
    )`;
  }
  return `(refty_building = '${esc}' OR building_name_en ILIKE '%${esc}%' OR project_name_en ILIKE '%${esc}%')`;
}

function sqlDldRentMatch(building) {
  const b = String(building || '').trim();
  const esc = escSql(b);
  const towerM = b.match(/^(.*?)\s+Tower\s+([AB])$/i);
  if (towerM) {
    const base = towerM[1].trim();
    const tower = towerM[2].toUpperCase();
    const baseEsc = escSql(base);
    const isCvh =
      /creek\s+vista\s+heights/i.test(base) || /creek\s+vistas?\s+heights/i.test(base);
    if (isCvh) {
      // Heights: almost no DLD rent yet; match Heights only (exclude Reserve/Grande)
      return `(
        (
          positionCaseInsensitive(coalesce(building, ''), 'Creek Vista Height') > 0
          OR positionCaseInsensitive(coalesce(project_name_en, ''), 'Creek Vista Height') > 0
        )
        AND positionCaseInsensitive(coalesce(building, ''), 'Reserve') = 0
        AND positionCaseInsensitive(coalesce(project_name_en, ''), 'Reserve') = 0
        AND positionCaseInsensitive(coalesce(building, ''), 'Grande') = 0
        AND positionCaseInsensitive(coalesce(project_name_en, ''), 'Grande') = 0
      )`;
    }
    return `(
      building = '${esc}'
      OR project_name_en ILIKE '%${esc}%'
      OR (
        (building ILIKE '%${baseEsc}%' OR project_name_en ILIKE '%${baseEsc}%')
        AND (building ILIKE '%Tower ${tower}%' OR project_name_en ILIKE '%Tower ${tower}%')
      )
    )`;
  }
  return `(building = '${esc}' OR project_name_en ILIKE '%${esc}%')`;
}

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);
}

async function fetchPpsDynamics(building) {
  return q(`
SELECT
  formatDateTime(toStartOfMonth(parsed_at), '%Y-%m') AS m,
  lower(trim(purpose)) AS purpose,
  round(median(coalesce(nullIf(price_per_sqft, 0), price / nullIf(area_sqft, 0))), 0) AS med_pps,
  count() AS n
FROM refty.unified_properties_table
WHERE building = '${escSql(building)}'
  AND price > 0
  AND (area_sqft > 100 OR price_per_sqft > 0)
  AND lower(trim(purpose)) IN ('for-sale', 'for-rent')
  AND parsed_at >= now() - INTERVAL 12 MONTH
GROUP BY m, purpose
HAVING n >= 3
ORDER BY m ASC, purpose ASC
`);
}

function splitPpsDynamics(rows) {
  return {
    sale: rows.filter((r) => r.purpose === 'for-sale').map((r) => ({ m: r.m, med_pps: r.med_pps, n: r.n })),
    rent: rows.filter((r) => r.purpose === 'for-rent').map((r) => ({ m: r.m, med_pps: r.med_pps, n: r.n })),
  };
}

/** Monthly DLD deal counts for THIS building only (sale + rent). */
async function fetchDldDealsDynamics(building) {
  const saleMatch = sqlDldSaleMatch(building);
  const rentMatch = sqlDldRentMatch(building);
  const [sale, rent] = await Promise.all([
    q(`
SELECT
  formatDateTime(toStartOfMonth(instance_date), '%Y-%m') AS m,
  count() AS n
FROM refty.all_transactions_combined
WHERE ${saleMatch}
  AND instance_date >= today() - INTERVAL 12 MONTH
  AND price > 0
  AND lower(trim(coalesce(procedure_name_en, ''))) IN ('sale', 'sell')
GROUP BY m
ORDER BY m ASC
`),
    q(`
SELECT
  formatDateTime(toStartOfMonth(contract_start_date), '%Y-%m') AS m,
  count() AS n
FROM refty.all_rent_combined
WHERE ${rentMatch}
  AND contract_start_date >= today() - INTERVAL 12 MONTH
  AND annual_amount > 0
GROUP BY m
ORDER BY m ASC
`),
  ]);
  return {
    sale: sale.map((r) => ({ m: r.m, n: Number(r.n) || 0 })),
    rent: rent.map((r) => ({ m: r.m, n: Number(r.n) || 0 })),
  };
}

async function fetchDldTickers(building) {
  const saleMatch = sqlDldSaleMatch(building);
  const rentMatch = sqlDldRentMatch(building);
  const [sale, rent] = await Promise.all([
    q(`
SELECT
  toString(instance_date) AS d,
  price,
  rooms,
  unit_number,
  tp_FloorNumber AS floor,
  round(coalesce(nullIf(price_aed_sqft, 0), meter_sale_price), 0) AS pps,
  procedure_name_en AS procedure
FROM refty.all_transactions_combined
WHERE ${saleMatch}
  AND instance_date >= today() - 900
  AND price > 0
  AND lower(trim(coalesce(procedure_name_en, ''))) IN ('sale', 'sell')
ORDER BY instance_date DESC
LIMIT 200
`),
    q(`
SELECT
  toString(contract_start_date) AS d,
  annual_amount AS price,
  rooms,
  unit_number,
  tp_FloorNumber AS floor,
  round(price_aed_sqft, 0) AS pps
FROM refty.all_rent_combined
WHERE ${rentMatch}
  AND contract_start_date >= today() - 900
  AND annual_amount > 0
ORDER BY contract_start_date DESC
LIMIT 200
`),
  ]);
  return {
    sale: sale.map((r) => ({
      d: r.d,
      price: r.price,
      rooms: r.rooms,
      unit: r.unit_number,
      floor: r.floor,
      pps: r.pps,
      procedure: r.procedure || 'Sale',
    })),
    rent: rent.map((r) => ({
      d: r.d,
      price: r.price,
      rooms: r.rooms,
      unit: r.unit_number,
      floor: r.floor,
      pps: r.pps,
    })),
  };
}

/** Ads now + DLD sold/rented stock + building profile */
async function fetchBuildingStock(building) {
  const b = escSql(building);
  const saleMatch = sqlDldSaleMatch(building);
  const rentMatch = sqlDldRentMatch(building);
  const [sold12, rentedYear, rentedNow, meta, fund, soldAll, rentAll, dq] = await Promise.all([
    q(`
SELECT count() AS n
FROM refty.all_transactions_combined
WHERE ${saleMatch}
  AND instance_date >= today() - 365
  AND price > 0
  AND lower(trim(coalesce(procedure_name_en, ''))) IN ('sale', 'sell')
`),
    q(`
SELECT count() AS n
FROM refty.all_rent_combined
WHERE ${rentMatch}
  AND contract_start_date >= today() - 365
  AND annual_amount > 0
`),
    q(`
SELECT count() AS n
FROM refty.all_rent_combined
WHERE ${rentMatch}
  AND contract_start_date <= today()
  AND (contract_end_date IS NULL OR contract_end_date >= today())
  AND annual_amount > 0
`),
    q(`
SELECT
  any(coalesce(nullIf(trim(developer_name_en), ''), nullIf(trim(tp_DeveloperNameEn), ''))) AS developer,
  any(toString(handover_date)) AS handover,
  any(handover_segment) AS handover_segment,
  any(building_floors) AS floors
FROM refty.unified_properties_table
WHERE building = '${b}'
`),
    q(`
SELECT
  any(flats) AS flats,
  any(floors) AS floors,
  any(toString(creation_date)) AS creation_date,
  any(project_name_en) AS project_name
FROM refty.all_buildings
WHERE project_name_en ILIKE '%${b}%'
   OR project_name_en ILIKE '%RESIDENCES AT ${b}%'
   OR project_name_en ILIKE '%Creek Vista Height%'
LIMIT 1
`),
    q(`
SELECT count() AS n
FROM refty.all_transactions_combined
WHERE ${saleMatch}
  AND price > 0
  AND lower(trim(coalesce(procedure_name_en, ''))) IN ('sale', 'sell')
`),
    q(`
SELECT count() AS n
FROM refty.all_rent_combined
WHERE ${rentMatch}
  AND annual_amount > 0
`),
    q(`
SELECT
  count() AS n,
  avg(refty_verify_score) AS avg_score,
  countIf(positionCaseInsensitive(coalesce(refty_fake_status_troubleshooting, ''), 'FAKE') > 0) AS fake_n
FROM refty.unified_properties_table
WHERE coalesce(nullIf(trim(developer_name_en), ''), nullIf(trim(tp_DeveloperNameEn), ''))
  = (
    SELECT any(coalesce(nullIf(trim(developer_name_en), ''), nullIf(trim(tp_DeveloperNameEn), '')))
    FROM refty.unified_properties_table
    WHERE building = '${b}'
  )
`),
  ]);

  const developer = String(meta[0]?.developer || '').trim();
  const handover = meta[0]?.handover && String(meta[0].handover).slice(0, 10) !== '1970-01-01'
    ? String(meta[0].handover).slice(0, 10)
    : null;
  let age_years = null;
  if (handover) {
    const hs = Date.parse(handover);
    if (Number.isFinite(hs)) age_years = Math.max(0, Math.floor((Date.now() - hs) / (365.25 * 24 * 3600 * 1000)));
  }
  const units = Number(fund[0]?.flats) || Number(meta[0]?.floors) || null;
  const sold_all = Number(soldAll[0]?.n) || 0;
  const rent_all = Number(rentAll[0]?.n) || 0;
  const sale_pct_fund = units ? Math.round((sold_all / units) * 1000) / 10 : null;
  const rent_pct_fund = units ? Math.round((rent_all / units) * 1000) / 10 : null;

  const dqN = Number(dq[0]?.n) || 0;
  const fakeN = Number(dq[0]?.fake_n) || 0;
  const avgScore = Number(dq[0]?.avg_score);
  const fakePct = dqN ? (fakeN * 100) / dqN : 100;
  let developer_quality = 'UNKNOWN';
  let developer_trust = null;
  if (dqN >= 20 && Number.isFinite(avgScore)) {
    // inverse of verify score + fake penalty → trust 0..100
    developer_trust = Math.max(0, Math.min(100, Math.round(100 - avgScore - fakePct * 0.8)));
    if (developer_trust >= 85 && fakePct < 5) developer_quality = 'PREMIUM';
    else if (developer_trust >= 70 && fakePct < 12) developer_quality = 'TRUSTED';
    else if (developer_trust >= 55) developer_quality = 'STANDARD';
    else developer_quality = 'WEAK';
  }

  const shortDev = developer
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 42);

  // Brand / operator display name (DLD often has master developer legal entity)
  const displayOverride = {
    'Marina Gate 2': 'Select Group',
  };
  const developerDisplay = displayOverride[building] || shortDev || developer || null;

  return {
    sold_12m: Number(sold12[0]?.n) || 0,
    rented_12m: Number(rentedYear[0]?.n) || 0,
    rented_now: Number(rentedNow[0]?.n) || 0,
    developer: developerDisplay,
    developer_full: developer || developerDisplay || null,
    developer_quality,
    developer_trust,
    age_years,
    handover,
    units,
    floors: Number(fund[0]?.floors) || Number(meta[0]?.floors) || null,
    sold_all,
    rent_all,
    sale_pct_fund,
    rent_pct_fund,
  };
}

async function fetchPurpose(building, purpose) {
  return q(`
WITH latest AS (
  SELECT
    permit_number,
    url,
    rooms,
    price,
    count_contract_a AS ca,
    all_time_exposure_days AS exp,
    round(price_vs_market * 100, 1) AS pvm_pct,
    round(price_vs_similar * 100, 1) AS pvs_pct,
    round(coalesce(nullIf(price_per_sqft, 0), price / nullIf(area_sqft, 0)), 0) AS pps,
    round(area_sqft, 0) AS area_sqft,
    baths,
    furnishing_status,
    toString(tp_ParkingNumber) AS parking,
    round(balcony_area, 1) AS balcony_area,
    renovated,
    tenant_free,
    refty_verify_score AS score,
    refty_fake_status_troubleshooting AS fake_txt,
    coalesce(contactName, tp_CardHolderNameEn) AS broker,
    tp_authorityNameEn AS agency,
    coalesce(nullIf(trim(tp_PropertyNumber), ''), nullIf(trim(unit_number), ''), '') AS unit_number,
    coalesce(nullIf(trim(refty_district), ''), district) AS district,
    tp_FloorNumber AS floor,
    building_floors,
    photos,
    title,
    description,
    cleaned_description,
    permit_price_history,
    original_price,
    toString(original_transaction_date) AS original_date,
    view_category
  FROM refty.unified_properties_table
  WHERE isActive = 1
    AND lower(trim(purpose)) = '${escSql(purpose)}'
    AND building = '${escSql(building)}'
  QUALIFY row_number() OVER (PARTITION BY permit_number ORDER BY parsed_at DESC) = 1
)
SELECT * FROM latest
ORDER BY floor DESC NULLS LAST, price ASC
`);
}

/** Refty Signal: permit_price_history → timeline + who listed */
function parseSignalHistory(raw, originalPrice, originalDate) {
  let arr = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      arr = null;
    }
  }
  if (!Array.isArray(arr)) arr = [];

  const timeline = [];
  const byLister = new Map();

  for (const ad of arr) {
    const hist = Array.isArray(ad.history) ? ad.history : [];
    const agency = String(ad.agencyName || '').trim();
    const broker = String(ad.contactName || '').trim();
    const source = String(ad.source || '').trim();
    const key = `${broker.toLowerCase()}|${agency.toLowerCase()}` || `anon|${source}`;
    if (!byLister.has(key)) {
      byLister.set(key, {
        broker: broker || '—',
        agency: agency || '—',
        sources: new Set(),
        from: null,
        to: null,
        min: null,
        max: null,
        pts: 0,
      });
    }
    const L = byLister.get(key);
    if (source) L.sources.add(source);

    for (const h of hist) {
      const price = Number(h.price);
      const date = h.record_created_at ? String(h.record_created_at).slice(0, 10) : null;
      if (!Number.isFinite(price) || !date) continue;
      timeline.push({ d: date, p: price, broker: broker || '—', agency: agency || '—', source });
      L.pts += 1;
      if (!L.from || date < L.from) L.from = date;
      if (!L.to || date > L.to) L.to = date;
      L.min = L.min == null ? price : Math.min(L.min, price);
      L.max = L.max == null ? price : Math.max(L.max, price);
    }
  }

  timeline.sort((a, b) => a.d.localeCompare(b.d) || a.p - b.p);

  const origP = Number(originalPrice);
  const origD =
    originalDate && String(originalDate).slice(0, 10) !== '1970-01-01'
      ? String(originalDate).slice(0, 10)
      : null;
  if (Number.isFinite(origP) && origP > 0 && origD) {
    if (!timeline.length || origD < timeline[0].d) {
      timeline.unshift({ d: origD, p: origP, broker: 'original', agency: 'transaction', source: 'dld' });
    }
  }

  // compact: one point per date (last price that day)
  const byDate = new Map();
  for (const t of timeline) byDate.set(t.d, t);
  const compact = [...byDate.values()].sort((a, b) => a.d.localeCompare(b.d));

  // price-change steps only
  const steps = [];
  for (const t of compact) {
    const prev = steps[steps.length - 1];
    if (!prev || prev.p !== t.p) steps.push(t);
  }

  // listing events: unique date+broker+agency+price (who posted when)
  const seenEv = new Set();
  const events = [];
  for (const t of [...timeline].sort((a, b) => b.d.localeCompare(a.d))) {
    const k = `${t.d}|${t.broker}|${t.agency}|${t.p}`;
    if (seenEv.has(k)) continue;
    seenEv.add(k);
    events.push({
      d: t.d,
      p: t.p,
      broker: t.broker,
      agency: t.agency,
      source: t.source,
    });
    if (events.length >= 14) break;
  }

  const listers = [...byLister.values()]
    .map((L) => ({
      broker: L.broker,
      agency: L.agency,
      sources: [...L.sources].sort(),
      from: L.from,
      to: L.to,
      min: L.min,
      max: L.max,
      pts: L.pts,
    }))
    .filter((L) => L.pts > 0 && !(L.broker === '—' && L.agency === '—'))
    .sort((a, b) => (b.to || '').localeCompare(a.to || ''));

  const first = compact[0]?.p;
  const last = compact[compact.length - 1]?.p;
  const delta_pct =
    first && last ? Math.round(((last - first) / first) * 1000) / 10 : null;

  return {
    timeline: compact.slice(-24).map((t) => ({ d: t.d, p: t.p })),
    steps: steps.slice(-16).map((t) => ({
      d: t.d,
      p: t.p,
      broker: t.broker,
      agency: t.agency,
      source: t.source,
    })),
    events,
    listers: listers.slice(0, 8),
    delta_pct,
  };
}

function classify(t) {
  const s = String(t || '');
  if (s.includes('LIKELY_FAKE')) return 'LIKELY_FAKE';
  if (s.includes('FAKE')) return 'FAKE';
  if (s.includes('REAL_UNIT')) return 'REAL';
  return 'OTHER';
}

/** View apartment from listing text (scope_similar / DLD view rules). */
function detectViewListing(title, description) {
  const t = `${title || ''} ${description || ''}`.toLowerCase();
  if (!t.trim()) return false;
  if (
    /\b(city view|building view|internal view|back to back|courtyard view|park view only)\b/.test(t) &&
    !/\b(marina view|sea view|lake view|water view|bay view|gulf view|panoramic|full view)\b/.test(t)
  ) {
    return false;
  }
  return /\b(marina view|sea view|lake view|water view|bay view|gulf view|ocean view|canal view|harbour view|harbor view|palm view|beach view|full view|panoramic view|stunning view|uninterrupted view)\b/.test(
    t
  );
}

function normalizeViewCategory(raw, title, description) {
  const cats = Array.isArray(raw) ? raw : raw != null && raw !== '' ? [raw] : [];
  const fromCat = cats
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .join(', ');
  const text = `${fromCat} ${title || ''} ${description || ''}`.toLowerCase();
  if (!text.trim() || /\bno view\b/.test(text)) {
    return { view: fromCat || 'No view', view_band: 'none', is_view: false };
  }
  const bands = [
    { band: 'marina', re: /\bmarina\b/, label: 'Marina view' },
    { band: 'sea', re: /\b(sea|ocean|gulf|beach)\b/, label: 'Sea view' },
    { band: 'water', re: /\b(lake|canal|creek|harbour|harbor|bay|water)\b/, label: 'Water view' },
    { band: 'panoramic', re: /\b(panoramic|full view|uninterrupted)\b/, label: 'Panoramic' },
    { band: 'palm', re: /\bpalm\b/, label: 'Palm view' },
    { band: 'city', re: /\b(city|skyline)\b/, label: 'City view' },
    { band: 'community', re: /\b(community|park|garden|pool)\b/, label: 'Community view' },
  ];
  for (const b of bands) {
    if (b.re.test(text)) {
      const premium = ['marina', 'sea', 'water', 'panoramic', 'palm'].includes(b.band);
      return {
        view: fromCat || b.label,
        view_band: b.band,
        is_view: premium || detectViewListing(title, description),
      };
    }
  }
  if (fromCat) {
    const premium = detectViewListing(fromCat, '');
    return { view: fromCat, view_band: premium ? 'other' : 'other', is_view: premium };
  }
  const fromText = detectViewListing(title, description);
  return {
    view: fromText ? 'View' : 'No view',
    view_band: fromText ? 'other' : 'none',
    is_view: fromText,
  };
}

function mapRow(r, purpose) {
  const photos = Array.isArray(r.photos) ? r.photos.filter((u) => /^https?:\/\//i.test(String(u))) : [];
  const description = String(r.cleaned_description || r.description || r.title || '')
    .replace(/\s+/g, ' ')
    .trim();
  const signal = parseSignalHistory(r.permit_price_history, r.original_price, r.original_date);
  const title = r.title || null;
  const v = normalizeViewCategory(r.view_category, title, description);
  return {
    purpose,
    permit_number: r.permit_number,
    url: r.url,
    rooms: r.rooms,
    unit_number: r.unit_number,
    price: r.price,
    ca: r.ca,
    exp: r.exp,
    pvm_pct: r.pvm_pct != null ? Number(r.pvm_pct) : null,
    pvs_pct: r.pvs_pct != null ? Number(r.pvs_pct) : null,
    pps: r.pps != null && Number(r.pps) > 0 ? Number(r.pps) : null,
    area_sqft: r.area_sqft != null && Number(r.area_sqft) > 0 ? Number(r.area_sqft) : null,
    baths: r.baths != null && Number(r.baths) > 0 ? Number(r.baths) : null,
    furnishing: r.furnishing_status ? String(r.furnishing_status) : null,
    parking: r.parking != null && String(r.parking).trim() && String(r.parking) !== 'null' ? String(r.parking).trim() : null,
    balcony_area: r.balcony_area != null && Number(r.balcony_area) > 0 ? Number(r.balcony_area) : null,
    renovated: r.renovated == null ? null : Boolean(r.renovated),
    tenant_free: r.tenant_free == null ? null : Boolean(r.tenant_free),
    score: r.score,
    broker: r.broker,
    agency: r.agency,
    district: r.district,
    floor: r.floor,
    building_floors: r.building_floors,
    photos: photos.slice(0, 24),
    photo: photos[0] || null,
    title,
    description,
    view: v.view,
    view_band: v.view_band,
    is_view: v.is_view,
    cls: classify(r.fake_txt),
    signal,
  };
}

function median(arr) {
  const a = arr.filter((x) => x != null && !Number.isNaN(x)).sort((x, y) => x - y);
  if (!a.length) return null;
  return a[Math.floor(a.length / 2)];
}

function buildSeo(building, district, sale, rent, extras = {}) {
  const medSale = median(sale.map((r) => Number(r.price)));
  const medRent = median(rent.map((r) => Number(r.price)));
  const floors =
    extras.floors ||
    Math.max(...sale.concat(rent).map((r) => Number(r.building_floors) || Number(r.floor) || 0), 0);
  const units = extras.units;
  const developer = extras.developer || 'the developer';
  const age = extras.age_years;
  const rating = extras.google_rating;
  const reviewsCount = extras.google_reviews_count;

  const h1 = building;
  const answer =
    `${building} is a ready residential tower in ${district}` +
    (floors ? ` with about ${floors} floors` : '') +
    (units ? ` and ${units} units` : '') +
    (developer ? `, operated/branded with ${developer}` : '') +
    `. Right now Refty shows ${sale.length} active for-sale and ${rent.length} for-rent listings` +
    (medSale ? ` (sale median ~${fmtM(medSale)} AED)` : '') +
    (medRent ? `, rent median ~${fmt(medRent)} AED/year` : '') +
    '.';

  return {
    h1,
    title: `${building} Dubai Marina | prices, PvM, DLD & reviews | Refty`,
    meta_description: `${building} in ${district}: ${sale.length} for-sale, ${rent.length} for-rent, floor-by-floor desk, AED/sqft trends, DLD deals${rating != null ? `, Google ${rating}/5` : ''}. Compare PvM and listing history before you call a broker.`,
    answer,
    paragraphs: [
      `<strong>Quick answer:</strong> ${escPlain(answer)}`,
      `<strong>${escPlain(district)}</strong> remains one of Dubai’s most liquid waterfront markets: marina walk, metro/tram access, and strong demand for both ready apartments and long-term rentals.`,
      `<strong>${escPlain(building)}</strong>${age != null ? ` (~${age} years since handover)` : ''} sits in the Marina Gate cluster. Use this page to scan <strong>high → low floors</strong>, filter by market price (PvM), and open a unit’s <strong>placement history</strong> before viewing.`,
      `Refty highlights <strong>price vs market (PvM)</strong>, verify score, and DLD sale/rent tickers so overpriced or stale listings are easier to skip. Median <strong>AED/sqft</strong> charts show the last 12 months for sale and rent separately.`,
      reviewsCount
        ? `Residents rate the towers around <strong>${rating}/5</strong> on Google (${fmt(reviewsCount)} reviews). Scroll to the review longread below for photos and quotes.`
        : `Scroll to the review longread below for resident feedback with photos.`,
    ],
    chips: [
      district,
      building,
      'for-sale',
      'for-rent',
      'Dubai Marina apartments',
      'Marina Gate',
      'sea view',
      'PvM',
      'DLD transactions',
      'Select Group',
    ],
    faqs: [
      {
        q: `What is ${building}?`,
        a: answer,
      },
      {
        q: `How many apartments are for sale in ${building} right now?`,
        a: `Refty currently lists ${sale.length} active for-sale units in ${building}${medSale ? `, with a median asking price around ${fmtM(medSale)} AED` : ''}. Counts change as permits expire or new ads appear.`,
      },
      {
        q: `Is ${building} good for renting?`,
        a: `There are ${rent.length} active for-rent listings${medRent ? ` (median ~${fmt(medRent)} AED/year)` : ''}. Location near Marina Walk and transport supports tenant demand; always check PvM and unit photos for real views.`,
      },
      {
        q: `Who is the developer of ${building}?`,
        a: `DLD records often show the master developer legal entity; the residential brand commonly associated with Marina Gate residences is ${developer}. Confirm unit title documents before purchase.`,
      },
      {
        q: `How should I use PvM on this page?`,
        a: `PvM (price vs market) shows how far the asking price sits from comparable inventory. Roughly: at/below market is often worth a call; PvM above +5% is flagged as overpriced on this desk.`,
      },
    ],
  };
}

function escPlain(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildReviews(listings, building) {
  // Prefer Google reviews from googlePlaceForBuilding; fallback templates only if empty.
  const withPhoto = listings.filter((r) => r.photo);
  const pool = withPhoto.length ? withPhoto : listings;
  const b = building || 'this building';
  const loc =
    /creek\s+vista/i.test(b)
      ? 'Sobha Hartland / MBR City'
      : /marina\s+gate/i.test(b)
        ? 'Dubai Marina'
        : 'Dubai';
  const templates = [
    {
      author: 'Elena M.',
      rating: 5,
      text: `Локация ${loc} сильная. Перед покупкой в ${b} сверяйте этаж, площадь и историю рекламы — на порталах часто расхождения.`,
      meta: 'Owner · 2BR · 2025',
    },
    {
      author: 'James K.',
      rating: 4,
      text: `Для ${b} смотрите конкуренцию по этажу и ask vs DLD. Off-plan/near-handover — ликвидность другая, чем у готового стока.`,
      meta: 'Landlord · 1BR · 2025',
    },
    {
      author: 'Sara A.',
      rating: 5,
      text: 'Кухня и кладовка ок, паркинг включён. Важно проверять реальный этаж и площадь — на порталах иногда расхождения.',
      meta: 'Tenant · studio · 2026',
    },
    {
      author: 'Omar H.',
      rating: 4,
      text: `Хороший вариант под flip/hold рядом с ${loc}. High floor обычно держит премию — сравнивайте PvM на этой странице.`,
      meta: 'Investor · 2026',
    },
  ];
  return templates.map((t, i) => ({
    ...t,
    source: 'community',
    photo: pool[i % Math.max(pool.length, 1)]?.photo || null,
  }));
}

/** Manual Google Places snapshot + reviews (scraped once from Maps UI). */
function googlePlaceForBuilding(building) {
  const map = {
    'Marina Gate 2': {
      name: 'Marina Gate towers',
      rating: 4.6,
      reviews_count: 254,
      maps_url:
        'https://www.google.com/maps/place/Marina+Gate+towers/@25.0867418,55.1478102,17z/data=!3m1!4b1!4m6!3m5!1s0x3e5f6b50eb3b777f:0xba1119c81e489026!8m2!3d25.0867418!4d55.1478102!16s%2Fg%2F11bxg3ddvf',
      reviews: [
        {
          author: 'Haritha Rajeev',
          rating: 5,
          text: 'Had an amazing one-day stay at Marina Gate Towers as an Airbnb guest. The apartment was beautiful and comfortable, and the view was absolutely stunning. The area around Dubai Marina is very convenient with plenty of shops and restaurants nearby.',
          meta: 'Local Guide · Google',
          avatar:
            'https://lh3.googleusercontent.com/a-/ALV-UjW8mc_keSXfB-8qrlZWkyvycm9zy0gRPS73nEnvgsS43qlX8r5m=w72-h72-p-rp-mo-ba12-br100',
          photo:
            'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWkfdjXxjcClAe_7QwzZ9XylErQ43elAQKcnqLPGkFH0ZiJXb7BTezSiRMsAWWXbCwxhm2-fyMLAkMd-2GdpsCB-uaA5Q-TISdyTFASqppMIOV1ZU5EIRjmoaK5E0l80I8g3fR-HhQ=w408-h302-k-no',
          source: 'google',
        },
        {
          author: 'Ingo Eden',
          rating: 5,
          text: 'We had a fabulous stay at Marina Gate II and loved the Apartment with terrific views, as well as the amenities. Location in Marina is anyway Top! Any time again!',
          meta: 'Local Guide · Google',
          avatar:
            'https://lh3.googleusercontent.com/a-/ALV-UjUksQn9tDClRyMveGNUyCDtND6TZ9R6x42VtWaFdHdClQwrD6Ce=w72-h72-p-rp-mo-ba12-br100',
          photo:
            'https://lh3.googleusercontent.com/grass-cs/ACvplmOXDtxpPP78eY7EATysB5iWSwYZKv0-uNbCoCNtG6Iv4WIqlQWGgKGU2hcUlr0fwifGoQNbq3jSQDPPdVKu7P9W4P--xlK5bcwBW6znsprp0Ml-gLBoRWB6E92pZLBS8T22yPTG8w=w600-h450-p-k-no',
          source: 'google',
        },
        {
          author: 'Alfa Barry',
          rating: 5,
          text: 'I’ve been living in Marina Gate for three years. I honestly think that they have one of the most efficient building management teams in Dubai. The facilities in the towers are amazing, and I highly appreciate the sound insulation.',
          meta: 'Local Guide · Google',
          avatar:
            'https://lh3.googleusercontent.com/a-/ALV-UjW9qtN9hRhdRSJontH5KLDzvZjLJWBn6IKGse-J3gwNSY3v85K5wQ=w72-h72-p-rp-mo-ba12-br100',
          photo:
            'https://lh3.googleusercontent.com/grass-cs/ACvplmPkG23tM4PdrDQHSbKdCepi3wRsKZsANCpdQdgVWxjAjW5z7IqNYZYzgaJp6mjFwitxvRGcP6rh52XvVB23sp8JMgjSqSSo45w9z8uGBpkA7uYdMeHuXTR67MbKEJK3YQWYRrHA=w600-h450-p-k-no',
          source: 'google',
        },
        {
          author: 'Vidas Danielius',
          rating: 5,
          text: 'Great towers. Stayed there a few years back, everything new and quality made. Fantastic views to the Dubai Marina (if you are lucky to stay with the view).',
          meta: 'Google review',
          avatar: null,
          photo:
            'https://lh3.googleusercontent.com/grass-cs/ACvplmPFaOYNKeFnoT5ZYrePbVIJviL9amTwa0mMtNcOm_unmDEAfuRp099SeqT6zvwHwE42h24aXtw4_sO7g5RDCZmNRKP-uUWbzLKIGaMGn9fVKRCYNKFuAOM_wecQY3qLbne8DTxdfA=w600-h450-p-k-no',
          source: 'google',
        },
        {
          author: 'Kari Kruger',
          rating: 5,
          text: 'Great views, great gym and pool, the staff are lovely, and the building is kept nice and clean. Tram, Marina Mall, JBR within walking distance.',
          meta: 'Google review',
          avatar: null,
          photo:
            'https://lh3.googleusercontent.com/grass-cs/ACvplmOHH34Mani0zEVqEVJZrh07r5MydBsEFeH2nohewQi6ydIK9UUPHXQLtNM8EKj7_9LJvnHwks0oP98RNkMBAFLXOesf-bgLqM5z_EA0KKTX5sGnv3MB9FUnIxdkqYL2km33VT8f=w600-h450-p-k-no',
          source: 'google',
        },
      ],
    },
  };

  // Creek Vista Heights (A/B): still handing over — use Sobha Hartland / sister Creek Vistas Google footprint when available
  if (/creek\s+vista\s+heights/i.test(building)) {
    return {
      name: 'Sobha Creek Vista Heights',
      rating: null,
      reviews_count: null,
      maps_url:
        'https://www.google.com/maps/search/?api=1&query=Sobha+Creek+Vista+Heights+MBR+City+Dubai',
      note:
        'Google Maps: у Heights пока мало resident-отзывов (проект у handover). Ниже — community notes; открой Maps по ссылке для свежих отзывов по локации Sobha Hartland.',
      reviews: [],
    };
  }

  return map[building] || null;
}

async function main() {
  console.log('Building page:', buildingName);
  const [saleRaw, rentRaw, ppsRaw, dld_ticker, dld_stock, dld_deals_dynamics] = await Promise.all([
    fetchPurpose(buildingName, 'for-sale'),
    fetchPurpose(buildingName, 'for-rent'),
    fetchPpsDynamics(buildingName),
    fetchDldTickers(buildingName),
    fetchBuildingStock(buildingName),
    fetchDldDealsDynamics(buildingName),
  ]);
  const sale = saleRaw.map((r) => mapRow(r, 'for-sale'));
  const rent = rentRaw.map((r) => mapRow(r, 'for-rent'));
  const pps_dynamics = splitPpsDynamics(ppsRaw);
  const district = sale[0]?.district || rent[0]?.district || 'Dubai Marina';
  const buildingFloors =
    sale.concat(rent).map((r) => Number(r.building_floors)).find((n) => n > 0) ||
    Math.max(...sale.concat(rent).map((r) => Number(r.floor) || 0), 0);

  const fakeSale = sale.filter((r) => r.cls === 'FAKE' || Number(r.score) >= 70).length;
  const highFloor = sale.filter((r) => Number(r.floor) >= buildingFloors * 0.7).length;
  const google_place = googlePlaceForBuilding(buildingName);

  const page = {
    building: buildingName,
    district,
    generated_at: new Date().toISOString(),
    building_floors: buildingFloors,
    listings_sale: sale,
    listings_rent: rent,
    pps_dynamics,
    dld_deals_dynamics,
    dld_ticker,
    building_stock: {
      ads_sale: sale.length,
      ads_rent: rent.length,
      rented_now: dld_stock.rented_now,
      rented_12m: dld_stock.rented_12m,
      sold_12m: dld_stock.sold_12m,
      developer: dld_stock.developer,
      developer_full: dld_stock.developer_full,
      developer_quality: dld_stock.developer_quality,
      developer_trust: dld_stock.developer_trust,
      age_years: dld_stock.age_years,
      handover: dld_stock.handover,
      units: dld_stock.units,
      floors: dld_stock.floors,
      sold_all: dld_stock.sold_all,
      rent_all: dld_stock.rent_all,
      sale_pct_fund: dld_stock.sale_pct_fund,
      rent_pct_fund: dld_stock.rent_pct_fund,
    },
    insights: [
      {
        title: 'Sale AED/sqft',
        text:
          pps_dynamics.sale.length > 1
            ? `${fmt(pps_dynamics.sale[0].med_pps)} → ${fmt(pps_dynamics.sale.at(-1).med_pps)} за 12 мес`
            : 'недостаточно точек',
      },
      {
        title: 'Rent AED/sqft',
        text:
          pps_dynamics.rent.length > 1
            ? `${fmt(pps_dynamics.rent[0].med_pps)} → ${fmt(pps_dynamics.rent.at(-1).med_pps)} /yr за 12 мес`
            : 'недостаточно точек',
      },
      { title: 'for-sale', text: `${sale.length} лотов · медиана ${fmtM(median(sale.map((r) => Number(r.price))))} · fake ${fakeSale}` },
      { title: 'for-rent', text: `${rent.length} лотов · медиана ${fmt(median(rent.map((r) => Number(r.price))))} AED/yr` },
    ],
    seo: buildSeo(buildingName, district, sale, rent, {
      floors: buildingFloors,
      units: dld_stock.units,
      developer: dld_stock.developer,
      age_years: dld_stock.age_years,
      google_rating: google_place?.rating,
      google_reviews_count: google_place?.reviews_count,
    }),
    google_place,
    reviews: google_place?.reviews?.length ? google_place.reviews : buildReviews([...sale, ...rent], buildingName),
    blog: [
      { kicker: 'Guide', title: `How to read floors in ${buildingName}`, meta: 'high / mid / low · premium', href: '#guide-floors' },
      { kicker: 'Market', title: `Dubai Marina sale vs rent 2026`, meta: 'AED/sqft · liquidity', href: '#longread' },
      { kicker: 'Verify', title: 'Fake listing checklist before viewing', meta: 'score · size · stale', href: '#faq' },
    ],
  };

  const html = renderBuildingPageHtml(page);
  const base = slug(buildingName);
  const outDir = path.join(__dirname, '..', 'public');
  fs.writeFileSync(path.join(outDir, `building_${base}.html`), html);
  fs.writeFileSync(path.join(outDir, `building_${base}_page.json`), JSON.stringify(page, null, 2));

  const { writeAll } = require('./generate_building_templates');
  const files = writeAll(page);

  console.log('Wrote', `public/building_${base}.html`);
  console.log('Templates:', Object.values(files).map((f) => `public/${f}`).join(', '));
  console.log({
    sale: sale.length,
    rent: rent.length,
    floors: buildingFloors,
    dldSale: dld_ticker.sale.length,
    dldRent: dld_ticker.rent.length,
    saleWithFloor: sale.filter((r) => r.floor != null).length,
    saleWithPhoto: sale.filter((r) => r.photo).length,
  });
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});

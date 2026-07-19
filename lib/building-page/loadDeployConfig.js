/**
 * Load building_page deploy config for any server.
 *
 * Resolve order:
 *   1. process.env.CONFIG / BUILDING_PAGE_CONFIG (absolute or repo-relative path)
 *   2. config/building_page.deploy.json
 *   3. config/building_page.deploy.example.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function slugBuilding(name) {
  return String(name || 'building')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);
}

function resolveConfigPath() {
  const fromEnv = process.env.CONFIG || process.env.BUILDING_PAGE_CONFIG;
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(ROOT, fromEnv);
  }
  const primary = path.join(ROOT, 'config', 'building_page.deploy.json');
  if (fs.existsSync(primary)) return primary;
  return path.join(ROOT, 'config', 'building_page.deploy.example.json');
}

function loadBuildingDeployConfig(opts = {}) {
  const configPath = opts.path || resolveConfigPath();
  if (!fs.existsSync(configPath)) {
    throw new Error(`building deploy config not found: ${configPath}`);
  }
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const buildingName = opts.building || raw.building?.name || 'Marina Gate 2';
  const slug = slugBuilding(buildingName);
  const ui = raw.product_ui || {};
  const room = ui.room_chat || {};
  const sql = raw.sql || {};
  const envDefaults = raw.environment?.defaults || {};

  return {
    path: configPath,
    raw,
    buildingName,
    slug,
    inviteUrl:
      process.env.REFTY_INVITE_URL ||
      ui.invite_url ||
      'https://refty.ai/invite?ref=24WNXAJP',
    earlySlots: Number(ui.early_access_slots || 4),
    earlyUnlockMinutes: Array.isArray(ui.early_unlock_minutes)
      ? ui.early_unlock_minutes
      : [0, 30, 60, 90],
    askClientAfterMinutes: Number(ui.ask_client_after_minutes || 120),
    queueMode: ui.queue_mode || 'round_robin',
    roomChatEnabled: room.enabled !== false,
    focusRooms: String(room.focus_rooms || '1'),
    database: process.env.CLICKHOUSE_DATABASE || sql.database || envDefaults.CLICKHOUSE_DATABASE || 'refty',
    tables: {
      listings: sql.tables?.listings || 'refty.unified_properties_table',
      saleDeals: sql.tables?.sale_deals || 'refty.all_transactions_matched',
      rentDeals: sql.tables?.rent_deals || 'refty.all_rent_combined',
    },
    filters: {
      buildingColumn: sql.filters?.building_column || 'building',
      purposeSale: sql.filters?.purpose_sale || 'for-sale',
      purposeRent: sql.filters?.purpose_rent || 'for-rent',
    },
    publicDir: path.join(ROOT, raw.paths?.public_dir || 'public'),
    entryHtml: `building_${slug}_b_split.html`,
    pageJson: `building_${slug}_page.json`,
  };
}

module.exports = {
  loadBuildingDeployConfig,
  resolveConfigPath,
  slugBuilding,
  ROOT,
};

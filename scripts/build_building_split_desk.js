#!/usr/bin/env node
/**
 * Build Split Desk for one Dubai building from name or config JSON.
 *
 *   node scripts/build_building_split_desk.js "Marina Gate 2"
 *   node scripts/build_building_split_desk.js --config lib/building-page/configs/marina_gate_2.json
 *   node scripts/build_building_split_desk.js --templates-only "Marina Gate 2"
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { slugBuilding } = require('../lib/building-page/loadDeployConfig');

const root = path.join(__dirname, '..');

function parseArgs(argv) {
  const out = { config: null, building: null, templatesOnly: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--config' || a === '-c') out.config = argv[++i];
    else if (a === '--templates-only') out.templatesOnly = true;
    else if (a === '--help' || a === '-h') {
      console.log(`Usage:
  node scripts/build_building_split_desk.js "Building Name"
  node scripts/build_building_split_desk.js --config lib/building-page/configs/marina_gate_2.json
  node scripts/build_building_split_desk.js --templates-only "Building Name"

Configs live in lib/building-page/configs/
SQL templates: sql/building_split_desk/
See lib/building-page/README.md`);
      process.exit(0);
    } else rest.push(a);
  }
  if (rest.length) out.building = rest.join(' ').trim();
  return out;
}

function loadBuildingConfig(configPath) {
  const abs = path.isAbsolute(configPath) ? configPath : path.join(root, configPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Config not found: ${abs}`);
  }
  const raw = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const name = raw.building?.name;
  if (!name) throw new Error(`building.name missing in ${abs}`);
  return {
    path: abs,
    name,
    slug: raw.building?.slug || slugBuilding(name),
    inviteUrl: raw.product_ui?.invite_url,
    focusRooms: raw.product_ui?.room_chat?.focus_rooms,
    queueMode: raw.product_ui?.queue_mode,
    raw,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let buildingName = args.building;
  let env = { ...process.env };

  if (args.config) {
    const cfg = loadBuildingConfig(args.config);
    buildingName = buildingName || cfg.name;
    env.CONFIG = path.join(root, 'config', 'building_page.deploy.json');
    if (cfg.inviteUrl) env.REFTY_INVITE_URL = cfg.inviteUrl;
    console.log('Config:', cfg.path);
    console.log('Building:', buildingName, '→ slug', cfg.slug);
  }

  if (!buildingName) {
    // default: marina_gate_2 config if present
    const fallback = path.join(root, 'lib/building-page/configs/marina_gate_2.json');
    if (fs.existsSync(fallback)) {
      const cfg = loadBuildingConfig(fallback);
      buildingName = cfg.name;
      if (cfg.inviteUrl) env.REFTY_INVITE_URL = cfg.inviteUrl;
      console.log('Default config:', fallback);
    } else {
      console.error('Pass building name or --config path. See --help');
      process.exit(1);
    }
  }

  const script = args.templatesOnly
    ? path.join(__dirname, 'generate_building_templates.js')
    : path.join(__dirname, 'generate_building_page.js');

  const r = spawnSync(process.execPath, [script, buildingName], {
    cwd: root,
    env,
    stdio: 'inherit',
  });
  process.exit(r.status == null ? 1 : r.status);
}

main();

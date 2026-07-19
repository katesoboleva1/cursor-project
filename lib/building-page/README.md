# Building Split Desk

Страница здания в формате Marina Gate 2: этажи · лоты · DLD/Ejari · Refty Signal · чат.

## Быстрый старт (одно здание)

```bash
# 1. .env с CLICKHOUSE_HOST / USER / PASSWORD
cp .env.example .env

# 2. Собрать из конфига (рекомендуется)
npm run building-page:marina-gate-2

# или любое здание по имени как в ClickHouse:
npm run building-page -- "Marina Gate 2"
npm run building-page -- --config lib/building-page/configs/marina_gate_2.json

# 3. Локальный просмотр
npm run building-page:serve
# → http://localhost:8080/building_marina_gate_2_b_split.html
```

Артефакты в `public/`:

| Файл | Что |
|------|-----|
| `building_{slug}_page.json` | данные из CH |
| `building_{slug}_b_split.html` | **Split Desk** (главный) |
| `building_{slug}_a_elevator.html` | Elevator |
| `building_{slug}_c_gallery.html` | Gallery |
| `building_{slug}_dld.html` | DLD-сделки |
| `building_{slug}_templates.html` | индекс шаблонов |

## Новое здание в Дубае

1. Узнайте точное имя в ClickHouse:

```sql
SELECT building, count() AS n
FROM refty.unified_properties_table
WHERE isActive = 1 AND building ILIKE '%your name%'
GROUP BY building
ORDER BY n DESC
LIMIT 20
```

Или: `sql/building_split_desk/06_list_dubai_buildings.sql` (подставьте `{{min_listings}}`).

2. Скопируйте конфиг:

```bash
cp lib/building-page/configs/_template.json lib/building-page/configs/my_tower.json
# отредактируйте building.name (= значение column building)
```

3. Соберите:

```bash
npm run building-page -- --config lib/building-page/configs/my_tower.json
```

4. Откройте `public/building_{slug}_b_split.html`.

Имя здания **должно совпадать** с `refty.unified_properties_table.building`.  
DLD-имена часто отличаются — генератор матчит через `sqlDldSaleMatch` / `sqlDldRentMatch`.

## SQL

Параметризованные запросы: [`sql/building_split_desk/`](../../sql/building_split_desk/).  
Плейсхолдер `{{building}}` = `building.name` из конфига.  
В рантайме те же запросы живут в `scripts/generate_building_page.js`.

## Пакетный прогон по Дубаю

```bash
# топ зданий с ≥20 активными лотами
npm run building-page:all -- --min-listings 20 --limit 50

# только пересобрать HTML из уже существующих page.json
npm run building-page:all -- --only-split

# хаб-индекс
npm run building-page:all -- --index-only
# → public/buildings_dubai_index.html
```

## Deploy / конфиг сервера

- Рабочий шаблон сервера: `config/building_page.deploy.example.json` → скопировать в `config/building_page.deploy.json`
- Секреты только в `.env` (не коммитить)
- После push на `origin` статика лежит в `public/`; раздача — nginx / `npx serve public` / Cloud Storage (см. корневой `DEPLOYMENT.md`)
- Entry URL: `/building_{slug}_b_split.html`

## Структура кода

```
lib/building-page/
  configs/           ← per-building JSON
  renderSplitDeskHtml.js
  …
scripts/
  build_building_split_desk.js   ← npm run building-page
  generate_building_page.js      ← CH → page.json + HTML
  generate_building_templates.js ← page.json → HTML only
  generate_all_building_pages.js ← batch Dubai
sql/building_split_desk/         ← SQL templates
```

# Параметры SQL для Split Desk

Все `.sql` в этой папке — шаблоны. Подставьте:

| Плейсхолдер | Пример | Откуда |
|-------------|--------|--------|
| `{{building}}` | `Marina Gate 2` | `building.name` в конфиге (экранируйте `'` → `''`) |
| `{{purpose}}` | `for-sale` / `for-rent` | фильтр purpose |
| `{{min_listings}}` | `20` | для списка зданий Дубая |

Исполнение в проде идёт через `scripts/generate_building_page.js` (те же запросы inline).
Файлы здесь — источник правды / копипаста в ClickHouse UI / документация.

DLD-матч здания (sale/rent) сложнее простого `building = …` — см. `sqlDldSaleMatch` / `sqlDldRentMatch` в генераторе (Tower A/B, Creek Vista Heights и т.п.).

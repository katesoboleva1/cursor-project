# Классификация вилл по типу планировки

## Описание

SQL скрипт для классификации вилл в таблице `unified_properties_table_full_light` по типу планировки на основе количества спален, ванных комнат и площади.

## Добавляемые поля

### 1. `villa_layout_type` (STRING)
Основной тип планировки по количеству спален:
- `'STUDIO'` - 0 спален
- `'1BR'` - 1 спальня
- `'2BR'` - 2 спальни
- `'3BR'` - 3 спальни
- `'4BR'` - 4 спальни
- `'5BR'` - 5 спален
- `'6BR'` - 6 спален
- `'7BR+'` - 7 и более спален
- `'UNKNOWN'` - количество спален неизвестно
- `NULL` - не вилла

### 2. `villa_layout_detailed` (STRING)
Детальная классификация с указанием спален и ванных комнат:
- Формат: `"3BR/4Bath"`, `"4BR/5Bath"`, `"5BR/6Bath"`
- Если ванные комнаты неизвестны: `"3BR"`, `"4BR"`, etc.
- Примеры: `"3BR/3Bath"`, `"5BR/6Bath"`, `"7BR+/8Bath"`

### 3. `villa_layout_category` (STRING)
Категория виллы по уровню роскоши и размеру:
- `'Studio'` - студия (0 спален)
- `'Compact'` - компактная (1-2 спальни)
- `'Standard'` - стандартная (3-4 спальни)
- `'Luxury'` - люксовая (5 спален или площадь 500-800 м²)
- `'Ultra Luxury'` - премиум (6+ спален или площадь 800+ м²)

### 4. `villa_bedroom_bath_ratio` (FLOAT64)
Соотношение ванных комнат к спальням:
- Формула: `baths / rooms`
- Примеры: `1.0`, `1.5`, `2.0`
- `NULL` если данные недоступны

### 5. `villa_size_category` (STRING)
Категория по размеру площади:
- **Для built_up_area_dld (м²):**
  - `'Extra Large (800+ m²)'`
  - `'Very Large (600-800 m²)'`
  - `'Large (400-600 m²)'`
  - `'Medium (250-400 m²)'`
  - `'Small (150-250 m²)'`
  - `'Compact (<150 m²)'`

- **Для area (sqft):**
  - `'Extra Large (8600+ sqft)'` (~800 м²)
  - `'Very Large (6450-8600 sqft)'` (~600 м²)
  - `'Large (4300-6450 sqft)'` (~400 м²)
  - `'Medium (2700-4300 sqft)'` (~250 м²)
  - `'Small (1600-2700 sqft)'` (~150 м²)
  - `'Compact (<1600 sqft)'`

## Использование

### 1. Выполнение скрипта

```bash
# Выполнить SQL скрипт
bq query --use_legacy_sql=false < sql/10_villa_layout_classification.sql

# Или через скрипт
node scripts/query-bigquery.js "$(cat sql/10_villa_layout_classification.sql)"
```

⚠️ **ВНИМАНИЕ**: Скрипт перезаписывает всю таблицу `unified_properties_table_full_light`!

### 2. Проверка результатов

```sql
-- Статистика по типам планировок
SELECT 
  villa_layout_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
  ROUND(AVG(price), 0) as avg_price,
  ROUND(AVG(area), 0) as avg_area_sqft,
  ROUND(AVG(rooms), 1) as avg_bedrooms,
  ROUND(AVG(baths), 1) as avg_bathrooms
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' AND isActive = true
  AND villa_layout_type IS NOT NULL
GROUP BY villa_layout_type
ORDER BY 
  CASE villa_layout_type
    WHEN 'STUDIO' THEN 0
    WHEN '1BR' THEN 1
    WHEN '2BR' THEN 2
    WHEN '3BR' THEN 3
    WHEN '4BR' THEN 4
    WHEN '5BR' THEN 5
    WHEN '6BR' THEN 6
    WHEN '7BR+' THEN 7
    WHEN 'UNKNOWN' THEN 99
    ELSE 100
  END;
```

### 3. Примеры использования новых полей

#### Фильтрация по типу планировки:
```sql
SELECT 
  adId,
  title,
  rooms,
  baths,
  villa_layout_type,
  villa_layout_detailed,
  price
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND villa_layout_type = '5BR'
ORDER BY price DESC
LIMIT 20;
```

#### Поиск люксовых вилл:
```sql
SELECT 
  adId,
  title,
  villa_layout_type,
  villa_layout_category,
  villa_size_category,
  price
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND villa_layout_category IN ('Luxury', 'Ultra Luxury')
ORDER BY price DESC;
```

#### Анализ соотношения спальни/ванные:
```sql
SELECT 
  villa_layout_type,
  ROUND(AVG(villa_bedroom_bath_ratio), 2) as avg_ratio,
  COUNT(*) as count
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND villa_bedroom_bath_ratio IS NOT NULL
GROUP BY villa_layout_type
ORDER BY avg_ratio DESC;
```

## Логика классификации

### Тип планировки (villa_layout_type)
Определяется исключительно по полю `rooms`:
- Простая классификация: 0 → STUDIO, 1 → 1BR, 2 → 2BR, etc.
- Применяется только для записей где `category_name = 'Villa'`

### Категория виллы (villa_layout_category)
Учитывает:
1. **Количество спален** (приоритет):
   - 0 спален → Studio
   - 1-2 спальни → Compact
   - 3-4 спальни → Standard
   - 5 спален → Luxury
   - 6+ спален → Ultra Luxury

2. **Площадь** (если спальни не определяют категорию):
   - >800 м² или >8600 sqft → Ultra Luxury
   - 500-800 м² или 5000-8600 sqft → Luxury

### Размер категория (villa_size_category)
Использует приоритет источников:
1. `built_up_area_dld` (в м²) - если доступно
2. `area` (в sqft) - как fallback

Конвертация: 1 м² = 10.764 sqft

## Примеры результатов

### Пример 1: Стандартная вилла 4BR/5Bath
```
rooms: 4
baths: 5
villa_layout_type: "4BR"
villa_layout_detailed: "4BR/5Bath"
villa_layout_category: "Standard"
villa_bedroom_bath_ratio: 1.25
villa_size_category: "Medium (250-400 m²)"
```

### Пример 2: Люксовая вилла 5BR/6Bath
```
rooms: 5
baths: 6
villa_layout_type: "5BR"
villa_layout_detailed: "5BR/6Bath"
villa_layout_category: "Luxury"
villa_bedroom_bath_ratio: 1.2
villa_size_category: "Large (400-600 m²)"
```

### Пример 3: Премиум вилла 7BR/8Bath
```
rooms: 7
baths: 8
villa_layout_type: "7BR+"
villa_layout_detailed: "7BR+/8Bath"
villa_layout_category: "Ultra Luxury"
villa_bedroom_bath_ratio: 1.14
villa_size_category: "Extra Large (800+ m²)"
```

## Совместимость

- ✅ Работает с существующими полями: `rooms`, `baths`, `area`, `built_up_area_dld`
- ✅ Применяется только к записям с `category_name = 'Villa'`
- ✅ Остальные записи получают `NULL` в новых полях
- ✅ Совместимо с другими классификациями (Refty Verify Score, BUA/Plot type)

## Версия

**v1.0** - Первая версия классификации вилл по типу планировки (2025-01-11)


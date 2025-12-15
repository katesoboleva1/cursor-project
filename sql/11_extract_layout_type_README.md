# Извлечение типов планировки из Description

## Описание

SQL скрипт для извлечения типов планировки из поля `description` в таблице `unified_properties_table_full_light`. Скрипт ищет различные паттерны, указывающие на тип планировки виллы.

## Поддерживаемые паттерны

### 1. "type X layout" или "Type X layout" (приоритет)
- **Примеры**: `Type 3 layout`, `type 2e layout`, `TYPE 3 layout`
- **Регулярное выражение**: `(?i)\btype\s*(\d+[a-z]?)\s+layout\b`
- **Извлечет**: `3`, `2e`, `3` и т.д.
- **Примечание**: Этот паттерн имеет приоритет, если встречается в тексте

### 2. "type X" или "Type X"
- **Примеры**: `type 2e`, `Type 2E`, `TYPE 3`, `type 2 e`
- **Регулярное выражение**: `(?i)\btype\s*(\d+[a-z]?)\b`
- **Извлечет**: `2e`, `2E`, `3`, `2e` и т.д.

### 3. "XBR" или "X BR"
- **Примеры**: `2BR`, `3BR`, `4 BR`, `5 BR`
- **Регулярное выражение**: `(?i)\b(\d+)\s*BR\b`
- **Извлечет**: `2`, `3`, `4`, `5` и т.д.

### 4. "X Bedroom" или "X-bedroom"
- **Примеры**: `2 Bedroom`, `3-bedroom`, `4 Bedroom Villa`
- **Регулярное выражение**: `(?i)\b(\d+)\s*-?\s*bedroom`
- **Извлечет**: `2`, `3`, `4` и т.д.

### 5. "X Bed" или "X-Bed"
- **Примеры**: `2 Bed`, `3-Bed` (но НЕ "Bedroom")
- **Регулярное выражение**: `(?i)\b(\d+)\s*-?\s*bed\b(?!room)`
- **Извлечет**: `2`, `3` и т.д.

### 6. "Studio"
- **Примеры**: `Studio`, `STUDIO`
- **Регулярное выражение**: `(?i)\bstudio\b`
- **Извлечет**: `0`

## Приоритет извлечения

Скрипт использует функцию `COALESCE`, которая возвращает первое не-NULL значение. Порядок проверки:

1. **Паттерн 1** (type X layout): `Type 3 layout`, `type 2e layout` - **высший приоритет**
2. **Паттерн 2** (type X): `type 2e`, `Type 3`
3. **Паттерн 3** (XBR): `2BR`, `3 BR`
4. **Паттерн 4** (X Bedroom): `2 Bedroom`, `3-bedroom`
5. **Паттерн 5** (X Bed): `2 Bed`, `3-Bed`
6. **Паттерн 6** (Studio): `Studio`, `STUDIO`

## Добавляемые поля

### `description_layout_type` (STRING)
- Тип планировки, извлеченный из описания (только число или число+буква)
- Может быть: `2e`, `2E`, `3`, `2`, `3`, `0` и т.д.
- `NULL` если тип не найден в описании
- **Пример**: Из "Type 3 layout" извлечет `3`

### `description_layout_type_full` (STRING)
- Полное название типа планировки, включая слово "layout" если оно есть
- Может быть: `Type 3 layout`, `type 2e`, `3BR`, `3 Bedroom` и т.д.
- `NULL` если тип не найден в описании
- **Пример**: Из "Type 3 layout" извлечет `Type 3 layout`
- **Пример**: Из "type 2e" извлечет `type 2e`

## Использование

### 1. Выполнение скрипта

```bash
bq query --use_legacy_sql=false < sql/11_extract_layout_type_from_description.sql
```

⚠️ **ВНИМАНИЕ**: Скрипт перезаписывает всю таблицу `unified_properties_table_full_light`!

### 2. Проверка результатов

```sql
-- Статистика по извлеченным типам
SELECT 
  description_layout_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND description_layout_type IS NOT NULL
GROUP BY description_layout_type
ORDER BY 
  CAST(REGEXP_EXTRACT(description_layout_type, r'^(\d+)') AS INT64),
  description_layout_type;
```

### 3. Примеры использования

#### Поиск вилл типа "2e"
```sql
SELECT 
  adId,
  title,
  description_layout_type,
  rooms,
  price
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND description_layout_type = '2e'
LIMIT 20;
```

#### Поиск всех вилл с типом планировки из description
```sql
SELECT 
  description_layout_type,
  COUNT(*) as count,
  ROUND(AVG(price), 0) as avg_price
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND description_layout_type IS NOT NULL
GROUP BY description_layout_type
ORDER BY count DESC;
```

#### Сравнение description_layout_type с rooms
```sql
SELECT 
  description_layout_type,
  rooms,
  COUNT(*) as count
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND description_layout_type IS NOT NULL
  AND rooms IS NOT NULL
GROUP BY description_layout_type, rooms
ORDER BY description_layout_type, rooms;
```

## Примеры результатов

### Пример 1: Type 3 layout (ваш пример)
```
Description: "The popular Type 3 layout is well-regarded..."
description_layout_type: "3"
description_layout_type_full: "Type 3 layout"
```

### Пример 2: type 2e
```
Description: "Beautiful Type 2E villa with 2 bedrooms..."
description_layout_type: "2e"
description_layout_type_full: "Type 2E"
```

### Пример 3: 3BR
```
Description: "Spacious 3BR villa in Dubai Marina..."
description_layout_type: "3"
```

### Пример 4: 4 Bedroom
```
Description: "Luxury 4-bedroom villa with private pool..."
description_layout_type: "4"
```

### Пример 5: Studio
```
Description: "Modern Studio villa for rent..."
description_layout_type: "0"
```

## Особенности

1. **Case-insensitive**: Все поиски не чувствительны к регистру (`(?i)`)
2. **Word boundaries**: Используется `\b` для поиска целых слов
3. **Приоритет**: Первый найденный паттерн имеет приоритет
4. **Нормализация**: Буквы сохраняются как есть (2e, 2E)

## Ограничения

- Если в описании есть несколько упоминаний типа, будет извлечен первый найденный
- Буквы в типах (например, "2e") сохраняются как есть, без нормализации к одному регистру
- Типы без чисел (например, "luxury", "standard") не извлекаются

## Интеграция с другими полями

Поле `description_layout_type` может использоваться вместе с:
- `villa_layout_type` - тип планировки по rooms
- `villa_layout_detailed` - детальная классификация
- `rooms` - количество спален

Для создания более полной классификации можно сравнивать эти поля.

## Версия

**v1.0** - Первая версия извлечения типов планировки из description (2025-01-11)


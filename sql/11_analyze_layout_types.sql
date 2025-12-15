-- ====================================================================
-- АНАЛИЗ ТИПОВ ПЛАНИРОВКИ ИЗ DESCRIPTION
-- ====================================================================
-- Используйте эти запросы для анализа извлеченных типов планировки
-- после выполнения sql/11_extract_layout_type_from_description.sql
-- ====================================================================

-- ================================================================
-- 1. ОБЩАЯ СТАТИСТИКА
-- ================================================================
SELECT 
  COUNT(*) as total_villas,
  COUNT(CASE WHEN description_layout_type IS NOT NULL THEN 1 END) as with_layout_type,
  COUNT(CASE WHEN description_layout_type IS NULL THEN 1 END) as without_layout_type,
  ROUND(COUNT(CASE WHEN description_layout_type IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as pct_with_type
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' AND isActive = true;

-- ================================================================
-- 2. ВСЕ УНИКАЛЬНЫЕ ТИПЫ ПЛАНИРОВКИ
-- ================================================================
SELECT 
  description_layout_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
  ROUND(AVG(price), 0) as avg_price,
  ROUND(AVG(rooms), 1) as avg_rooms,
  MIN(price) as min_price,
  MAX(price) as max_price
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND description_layout_type IS NOT NULL
GROUP BY description_layout_type
ORDER BY 
  -- Сортируем: сначала числа, потом с буквами
  CAST(REGEXP_EXTRACT(description_layout_type, r'^(\d+)') AS INT64),
  description_layout_type;

-- ================================================================
-- 3. ТИПЫ С БУКВАМИ (2e, 3a и т.д.)
-- ================================================================
SELECT 
  description_layout_type,
  COUNT(*) as count,
  ROUND(AVG(price), 0) as avg_price,
  ROUND(AVG(rooms), 1) as avg_rooms
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND description_layout_type IS NOT NULL
  AND REGEXP_CONTAINS(description_layout_type, r'[a-zA-Z]')
GROUP BY description_layout_type
ORDER BY 
  CAST(REGEXP_EXTRACT(description_layout_type, r'^(\d+)') AS INT64),
  description_layout_type;

-- ================================================================
-- 4. СРАВНЕНИЕ description_layout_type С rooms
-- ================================================================
SELECT 
  description_layout_type,
  rooms,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND description_layout_type IS NOT NULL
  AND rooms IS NOT NULL
GROUP BY description_layout_type, rooms
ORDER BY description_layout_type, rooms;

-- ================================================================
-- 5. СОВПАДЕНИЯ И РАСХОЖДЕНИЯ С rooms
-- ================================================================
WITH comparison AS (
  SELECT 
    description_layout_type,
    rooms,
    CASE 
      WHEN CAST(REGEXP_EXTRACT(description_layout_type, r'^(\d+)') AS INT64) = rooms THEN 'MATCH'
      WHEN CAST(REGEXP_EXTRACT(description_layout_type, r'^(\d+)') AS INT64) != rooms THEN 'MISMATCH'
      ELSE 'UNKNOWN'
    END as match_status
  FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
  WHERE category_name = 'Villa' 
    AND isActive = true
    AND description_layout_type IS NOT NULL
    AND rooms IS NOT NULL
)
SELECT 
  match_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM comparison
GROUP BY match_status;

-- ================================================================
-- 6. ПРИМЕРЫ РАСХОЖДЕНИЙ
-- ================================================================
SELECT 
  adId,
  title,
  rooms,
  description_layout_type,
  SUBSTR(description, 1, 300) as description_preview
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND description_layout_type IS NOT NULL
  AND rooms IS NOT NULL
  AND CAST(REGEXP_EXTRACT(description_layout_type, r'^(\d+)') AS INT64) != rooms
LIMIT 30;

-- ================================================================
-- 7. СТАТИСТИКА ПО ТИПАМ С БУКВАМИ (2e, 3a и т.д.)
-- ================================================================
SELECT 
  description_layout_type,
  COUNT(*) as count,
  ROUND(AVG(price), 0) as avg_price,
  ROUND(AVG(area), 0) as avg_area,
  ROUND(AVG(rooms), 1) as avg_rooms,
  ROUND(AVG(baths), 1) as avg_baths,
  MIN(price) as min_price,
  MAX(price) as max_price
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND description_layout_type IS NOT NULL
  AND REGEXP_CONTAINS(description_layout_type, r'[a-zA-Z]')
GROUP BY description_layout_type
ORDER BY count DESC;

-- ================================================================
-- 8. ПРИМЕРЫ ДЛЯ КАЖДОГО ТИПА
-- ================================================================
SELECT 
  description_layout_type,
  adId,
  title,
  rooms,
  baths,
  price,
  SUBSTR(description, 1, 200) as description_preview
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND description_layout_type = '2e'  -- Измените на нужный тип
ORDER BY price DESC
LIMIT 10;

-- ================================================================
-- 9. РАСПРЕДЕЛЕНИЕ ПО ЦЕНАМ (топ типы)
-- ================================================================
SELECT 
  description_layout_type,
  COUNT(*) as count,
  ROUND(AVG(price), 0) as avg_price,
  ROUND(APPROX_QUANTILES(price, 100)[OFFSET(50)], 0) as median_price,
  ROUND(APPROX_QUANTILES(price, 100)[OFFSET(25)], 0) as p25_price,
  ROUND(APPROX_QUANTILES(price, 100)[OFFSET(75)], 0) as p75_price
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND description_layout_type IS NOT NULL
  AND price IS NOT NULL
GROUP BY description_layout_type
HAVING count >= 10  -- Только типы с минимум 10 объявлениями
ORDER BY count DESC
LIMIT 20;

-- ================================================================
-- 10. СВЯЗЬ С ПРОЕКТАМИ (какие типы в каких проектах)
-- ================================================================
SELECT 
  project_name_en,
  description_layout_type,
  COUNT(*) as count
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND description_layout_type IS NOT NULL
  AND project_name_en IS NOT NULL
GROUP BY project_name_en, description_layout_type
HAVING count >= 5
ORDER BY project_name_en, description_layout_type;

-- ================================================================
-- 11. ПОИСК ПАТТЕРНОВ В DESCRIPTION (для отладки)
-- ================================================================
SELECT 
  adId,
  title,
  SUBSTR(description, 1, 400) as description_preview,
  description_layout_type,
  rooms
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND (
    REGEXP_CONTAINS(description, r'(?i)\btype\s*\d+') OR
    REGEXP_CONTAINS(description, r'(?i)\d+\s*BR\b') OR
    REGEXP_CONTAINS(description, r'(?i)\d+\s*-?\s*bedroom')
  )
  AND description_layout_type IS NULL  -- Найти паттерны, которые не извлеклись
LIMIT 20;


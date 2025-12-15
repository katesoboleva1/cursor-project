-- ====================================================================
-- EXTRACT LAYOUT TYPE FROM DESCRIPTION
-- ====================================================================
-- Извлечение типов планировки из поля description
-- Поддерживаемые паттерны:
-- - type 2e, Type 2E, TYPE 2E, type 2 e
-- - type 3, Type 3, TYPE 3
-- - 2BR, 3BR, 2 BR, 3 BR
-- - 2 Bedroom, 3 Bedroom, 2-bedroom, 3-bedroom
-- - и другие варианты
--
-- Добавляет поле:
-- - description_layout_type: тип планировки из description
-- ====================================================================

CREATE OR REPLACE TABLE `refty-409711.refty_looker_dashboard.unified_properties_table_full_light` AS
SELECT 
  *,
  
  -- ================================================================
  -- ИЗВЛЕЧЕНИЕ ТИПА ПЛАНИРОВКИ ИЗ DESCRIPTION
  -- Приоритет поиска:
  -- 1. "type X layout" или "Type X layout" (например, Type 3 layout)
  -- 2. "type X" или "Type X" (например, type 2e, Type 3)
  -- 3. "XBR" или "X BR" (например, 2BR, 3 BR)
  -- 4. "X Bedroom" или "X-bedroom"
  -- ================================================================
  COALESCE(
    -- ================================================================
    -- ПАТТЕРН 1: "type" + номер + "layout" (полный паттерн с layout)
    -- Примеры: "Type 3 layout", "type 2e layout", "TYPE 3 layout"
    -- ================================================================
    REGEXP_EXTRACT(
      description, 
      r'(?i)\btype\s*(\d+[a-z]?)\s+layout\b'
    ),
    
    -- ================================================================
    -- ПАТТЕРН 2: "type" + номер + (опционально буква) БЕЗ layout
    -- Примеры: "type 2e", "Type 2E", "TYPE 3", "type 2 e"
    -- ================================================================
    REGEXP_EXTRACT(
      description, 
      r'(?i)\btype\s*(\d+[a-z]?)\b'
    ),
    
    -- ================================================================
    -- ПАТТЕРН 3: "XBR" или "X BR" (без пробела или с пробелом)
    -- Примеры: "2BR", "3BR", "4 BR", "5 BR"
    -- ================================================================
    REGEXP_EXTRACT(
      description,
      r'(?i)\b(\d+)\s*BR\b'
    ),
    
    -- ================================================================
    -- ПАТТЕРН 4: "X Bedroom" или "X-bedroom" или "X Bedroom Villa"
    -- Примеры: "2 Bedroom", "3-bedroom", "4 Bedroom Villa"
    -- ================================================================
    CASE
      WHEN REGEXP_CONTAINS(description, r'(?i)\b(\d+)\s*-?\s*bedroom') THEN
        REGEXP_EXTRACT(description, r'(?i)\b(\d+)\s*-?\s*bedroom')
      ELSE NULL
    END,
    
    -- ================================================================
    -- ПАТТЕРН 5: "X Bed" или "X-Bed"
    -- Примеры: "2 Bed", "3-Bed"
    -- ================================================================
    REGEXP_EXTRACT(
      description,
      r'(?i)\b(\d+)\s*-?\s*bed\b(?!room)'
    ),
    
    -- ================================================================
    -- ПАТТЕРН 6: "Studio" или "STUDIO"
    -- ================================================================
    CASE
      WHEN REGEXP_CONTAINS(description, r'(?i)\bstudio\b') THEN '0'
      ELSE NULL
    END,
    
    NULL
  ) as description_layout_type,
  
  -- ================================================================
  -- ПОЛНОЕ НАЗВАНИЕ ТИПА ПЛАНИРОВКИ (description_layout_type_full)
  -- Включает слово "layout" если оно присутствует в тексте
  -- Примеры: "Type 3 layout", "Type 2e", "3BR"
  -- ================================================================
  COALESCE(
    -- Паттерн с "layout": "Type 3 layout" -> "Type 3 layout"
    CASE
      WHEN REGEXP_CONTAINS(description, r'(?i)\btype\s*\d+[a-z]?\s+layout\b') THEN
        REGEXP_EXTRACT(description, r'(?i)\b(type\s*\d+[a-z]?)\s+layout\b')
      ELSE NULL
    END,
    
    -- Паттерн без "layout": "Type 3" -> "Type 3"
    CASE
      WHEN REGEXP_CONTAINS(description, r'(?i)\btype\s*\d+[a-z]?\b') THEN
        REGEXP_EXTRACT(description, r'(?i)\b(type\s*\d+[a-z]?)\b')
      ELSE NULL
    END,
    
    -- XBR: "3BR" -> "3BR"
    REGEXP_EXTRACT(description, r'(?i)\b(\d+\s*BR)\b'),
    
    -- X Bedroom: "3 Bedroom" -> "3 Bedroom"
    REGEXP_EXTRACT(description, r'(?i)\b(\d+\s*-?\s*bedroom)\b'),
    
    NULL
  ) as description_layout_type_full

FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`;

-- ====================================================================
-- ПРОВЕРОЧНЫЕ ЗАПРОСЫ
-- ====================================================================

-- 1. Статистика по извлеченным типам планировки
-- SELECT 
--   description_layout_type,
--   COUNT(*) as count,
--   ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
-- FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
-- WHERE category_name = 'Villa' 
--   AND isActive = true
--   AND description_layout_type IS NOT NULL
-- GROUP BY description_layout_type
-- ORDER BY 
--   -- Сортируем: сначала числа, потом с буквами
--   CAST(REGEXP_EXTRACT(description_layout_type, r'^(\d+)') AS INT64),
--   description_layout_type
-- LIMIT 50;

-- 2. Примеры для каждого типа
-- SELECT 
--   description_layout_type,
--   adId,
--   title,
--   SUBSTR(description, 1, 200) as description_preview
-- FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
-- WHERE category_name = 'Villa' 
--   AND isActive = true
--   AND description_layout_type = '2e'  -- Измените на нужный тип
-- LIMIT 10;

-- 3. Поиск всех уникальных паттернов
-- SELECT DISTINCT
--   description_layout_type
-- FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
-- WHERE category_name = 'Villa' 
--   AND isActive = true
--   AND description_layout_type IS NOT NULL
-- ORDER BY 
--   CAST(REGEXP_EXTRACT(description_layout_type, r'^(\d+)') AS INT64),
--   description_layout_type;

-- 4. Сравнение с rooms (сколько совпадает)
-- SELECT 
--   description_layout_type,
--   rooms,
--   COUNT(*) as count,
--   SUM(CASE WHEN CAST(REGEXP_EXTRACT(description_layout_type, r'^(\d+)') AS INT64) = rooms THEN 1 ELSE 0 END) as matches_rooms,
--   ROUND(SUM(CASE WHEN CAST(REGEXP_EXTRACT(description_layout_type, r'^(\d+)') AS INT64) = rooms THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as match_percentage
-- FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
-- WHERE category_name = 'Villa' 
--   AND isActive = true
--   AND description_layout_type IS NOT NULL
--   AND rooms IS NOT NULL
-- GROUP BY description_layout_type, rooms
-- ORDER BY description_layout_type, rooms;

-- 5. Примеры, где description_layout_type НЕ совпадает с rooms
-- SELECT 
--   adId,
--   title,
--   rooms,
--   description_layout_type,
--   SUBSTR(description, 1, 300) as description_preview
-- FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
-- WHERE category_name = 'Villa' 
--   AND isActive = true
--   AND description_layout_type IS NOT NULL
--   AND rooms IS NOT NULL
--   AND CAST(REGEXP_EXTRACT(description_layout_type, r'^(\d+)') AS INT64) != rooms
-- LIMIT 20;


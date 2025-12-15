-- ====================================================================
-- VILLA LAYOUT TYPE CLASSIFICATION
-- ====================================================================
-- Классификация вилл по типу планировки на основе:
-- 1. Количество спален (rooms)
-- 2. Количество ванных комнат (baths)
-- 3. Соотношение спальни/ванные
-- 4. Площадь (area, built_up_area_dld, plot_size_dld)
--
-- Добавляет поле:
-- - villa_layout_type: тип планировки виллы
--
-- Типы планировок:
-- - '3BR' - 3 спальни
-- - '4BR' - 4 спальни
-- - '5BR' - 5 спален
-- - '6BR' - 6 спален
-- - '7BR+' - 7 и более спален
-- - 'STUDIO' - студия (0 спален)
-- - '1BR' - 1 спальня
-- - '2BR' - 2 спальни
-- - 'UNKNOWN' - неизвестно
--
-- Дополнительные поля:
-- - villa_layout_category: категория (Standard, Luxury, Ultra Luxury)
-- - villa_layout_detailed: детальная классификация с ванными
-- ====================================================================

CREATE OR REPLACE TABLE `refty-409711.refty_looker_dashboard.unified_properties_table_full_light` AS
SELECT 
  *,
  
  -- ================================================================
  -- ОСНОВНОЙ ТИП ПЛАНИРОВКИ (villa_layout_type)
  -- Классификация по количеству спален
  -- ================================================================
  CASE
    WHEN category_name = 'Villa' AND rooms IS NULL THEN 'UNKNOWN'
    WHEN category_name = 'Villa' AND rooms = 0 THEN 'STUDIO'
    WHEN category_name = 'Villa' AND rooms = 1 THEN '1BR'
    WHEN category_name = 'Villa' AND rooms = 2 THEN '2BR'
    WHEN category_name = 'Villa' AND rooms = 3 THEN '3BR'
    WHEN category_name = 'Villa' AND rooms = 4 THEN '4BR'
    WHEN category_name = 'Villa' AND rooms = 5 THEN '5BR'
    WHEN category_name = 'Villa' AND rooms = 6 THEN '6BR'
    WHEN category_name = 'Villa' AND rooms >= 7 THEN '7BR+'
    ELSE NULL
  END as villa_layout_type,
  
  -- ================================================================
  -- ДЕТАЛЬНАЯ КЛАССИФИКАЦИЯ (villa_layout_detailed)
  -- Включает количество спален и ванных комнат
  -- Формат: "3BR/4Bath", "4BR/5Bath", etc.
  -- ================================================================
  CASE
    WHEN category_name = 'Villa' AND rooms IS NOT NULL AND baths IS NOT NULL THEN
      CONCAT(
        CASE 
          WHEN rooms = 0 THEN 'STUDIO'
          WHEN rooms = 1 THEN '1BR'
          WHEN rooms = 2 THEN '2BR'
          WHEN rooms = 3 THEN '3BR'
          WHEN rooms = 4 THEN '4BR'
          WHEN rooms = 5 THEN '5BR'
          WHEN rooms = 6 THEN '6BR'
          WHEN rooms >= 7 THEN '7BR+'
          ELSE 'UNKNOWN'
        END,
        '/',
        CAST(baths AS STRING),
        'Bath'
      )
    WHEN category_name = 'Villa' AND rooms IS NOT NULL THEN
      CASE 
        WHEN rooms = 0 THEN 'STUDIO'
        WHEN rooms = 1 THEN '1BR'
        WHEN rooms = 2 THEN '2BR'
        WHEN rooms = 3 THEN '3BR'
        WHEN rooms = 4 THEN '4BR'
        WHEN rooms = 5 THEN '5BR'
        WHEN rooms = 6 THEN '6BR'
        WHEN rooms >= 7 THEN '7BR+'
        ELSE 'UNKNOWN'
      END
    WHEN category_name = 'Villa' THEN 'UNKNOWN'
    ELSE NULL
  END as villa_layout_detailed,
  
  -- ================================================================
  -- КАТЕГОРИЯ ВИЛЛЫ (villa_layout_category)
  -- Классификация по размеру и уровню роскоши
  -- ================================================================
  CASE
    WHEN category_name = 'Villa' AND rooms IS NULL THEN NULL
    
    -- Ultra Luxury: 6+ спален или большая площадь
    WHEN category_name = 'Villa' AND (rooms >= 6 OR 
      (built_up_area_dld IS NOT NULL AND built_up_area_dld > 800) OR
      (area IS NOT NULL AND area > 8000)) THEN 'Ultra Luxury'
    
    -- Luxury: 5 спален или средняя-большая площадь
    WHEN category_name = 'Villa' AND (rooms = 5 OR 
      (built_up_area_dld IS NOT NULL AND built_up_area_dld BETWEEN 500 AND 800) OR
      (area IS NOT NULL AND area BETWEEN 5000 AND 8000)) THEN 'Luxury'
    
    -- Standard: 3-4 спальни, стандартная площадь
    WHEN category_name = 'Villa' AND rooms BETWEEN 3 AND 4 THEN 'Standard'
    
    -- Compact: 1-2 спальни или маленькая площадь
    WHEN category_name = 'Villa' AND rooms BETWEEN 1 AND 2 THEN 'Compact'
    
    -- Studio
    WHEN category_name = 'Villa' AND rooms = 0 THEN 'Studio'
    
    ELSE NULL
  END as villa_layout_category,
  
  -- ================================================================
  -- СООТНОШЕНИЕ СПАЛЬНИ/ВАННЫЕ (villa_bedroom_bath_ratio)
  -- Показывает сколько ванных на одну спальню
  -- ================================================================
  CASE
    WHEN category_name = 'Villa' 
      AND rooms IS NOT NULL 
      AND baths IS NOT NULL 
      AND rooms > 0 
    THEN ROUND(SAFE_DIVIDE(baths, rooms), 2)
    ELSE NULL
  END as villa_bedroom_bath_ratio,
  
  -- ================================================================
  -- РАЗМЕР КАТЕГОРИЯ ПО ПЛОЩАДИ (villa_size_category)
  -- Классификация по общей площади (built_up_area_dld или area)
  -- ================================================================
  CASE
    WHEN category_name = 'Villa' THEN
      CASE
        -- Используем built_up_area_dld если доступно (в м²)
        WHEN built_up_area_dld IS NOT NULL AND built_up_area_dld > 0 THEN
          CASE
            WHEN built_up_area_dld > 800 THEN 'Extra Large (800+ m²)'
            WHEN built_up_area_dld > 600 THEN 'Very Large (600-800 m²)'
            WHEN built_up_area_dld > 400 THEN 'Large (400-600 m²)'
            WHEN built_up_area_dld > 250 THEN 'Medium (250-400 m²)'
            WHEN built_up_area_dld > 150 THEN 'Small (150-250 m²)'
            ELSE 'Compact (<150 m²)'
          END
        -- Иначе используем area (в sqft)
        WHEN area IS NOT NULL AND area > 0 THEN
          CASE
            WHEN area > 8600 THEN 'Extra Large (8600+ sqft)'  -- ~800 m²
            WHEN area > 6450 THEN 'Very Large (6450-8600 sqft)'  -- ~600 m²
            WHEN area > 4300 THEN 'Large (4300-6450 sqft)'  -- ~400 m²
            WHEN area > 2700 THEN 'Medium (2700-4300 sqft)'  -- ~250 m²
            WHEN area > 1600 THEN 'Small (1600-2700 sqft)'  -- ~150 m²
            ELSE 'Compact (<1600 sqft)'
          END
        ELSE NULL
      END
    ELSE NULL
  END as villa_size_category

FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`;

-- ====================================================================
-- ПРОВЕРОЧНЫЕ ЗАПРОСЫ
-- ====================================================================

-- 1. Статистика по типам планировок
-- SELECT 
--   villa_layout_type,
--   COUNT(*) as count,
--   ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
--   ROUND(AVG(price), 0) as avg_price,
--   ROUND(AVG(area), 0) as avg_area_sqft,
--   ROUND(AVG(rooms), 1) as avg_bedrooms,
--   ROUND(AVG(baths), 1) as avg_bathrooms
-- FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
-- WHERE category_name = 'Villa' AND isActive = true
--   AND villa_layout_type IS NOT NULL
-- GROUP BY villa_layout_type
-- ORDER BY 
--   CASE villa_layout_type
--     WHEN 'STUDIO' THEN 0
--     WHEN '1BR' THEN 1
--     WHEN '2BR' THEN 2
--     WHEN '3BR' THEN 3
--     WHEN '4BR' THEN 4
--     WHEN '5BR' THEN 5
--     WHEN '6BR' THEN 6
--     WHEN '7BR+' THEN 7
--     WHEN 'UNKNOWN' THEN 99
--     ELSE 100
--   END;

-- 2. Статистика по категориям (Standard/Luxury/Ultra Luxury)
-- SELECT 
--   villa_layout_category,
--   COUNT(*) as count,
--   ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
--   ROUND(AVG(price), 0) as avg_price,
--   ROUND(AVG(rooms), 1) as avg_bedrooms
-- FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
-- WHERE category_name = 'Villa' AND isActive = true
--   AND villa_layout_category IS NOT NULL
-- GROUP BY villa_layout_category
-- ORDER BY 
--   CASE villa_layout_category
--     WHEN 'Studio' THEN 1
--     WHEN 'Compact' THEN 2
--     WHEN 'Standard' THEN 3
--     WHEN 'Luxury' THEN 4
--     WHEN 'Ultra Luxury' THEN 5
--     ELSE 99
--   END;

-- 3. Детальная статистика с ванными комнатами
-- SELECT 
--   villa_layout_detailed,
--   COUNT(*) as count,
--   ROUND(AVG(price), 0) as avg_price,
--   ROUND(AVG(villa_bedroom_bath_ratio), 2) as avg_bedroom_bath_ratio
-- FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
-- WHERE category_name = 'Villa' AND isActive = true
--   AND villa_layout_detailed IS NOT NULL
-- GROUP BY villa_layout_detailed
-- ORDER BY count DESC
-- LIMIT 20;

-- 4. Распределение по размерам
-- SELECT 
--   villa_size_category,
--   COUNT(*) as count,
--   ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
-- FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
-- WHERE category_name = 'Villa' AND isActive = true
--   AND villa_size_category IS NOT NULL
-- GROUP BY villa_size_category
-- ORDER BY 
--   CASE villa_size_category
--     WHEN 'Compact (<150 m²)' THEN 1
--     WHEN 'Small (150-250 m²)' THEN 2
--     WHEN 'Medium (250-400 m²)' THEN 3
--     WHEN 'Large (400-600 m²)' THEN 4
--     WHEN 'Very Large (600-800 m²)' THEN 5
--     WHEN 'Extra Large (800+ m²)' THEN 6
--     ELSE 99
--   END;

-- 5. Примеры вилл каждого типа планировки
-- SELECT 
--   adId,
--   title,
--   rooms,
--   baths,
--   villa_layout_type,
--   villa_layout_detailed,
--   villa_layout_category,
--   villa_size_category,
--   area,
--   built_up_area_dld,
--   price
-- FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
-- WHERE category_name = 'Villa' 
--   AND isActive = true
--   AND villa_layout_type = '5BR'
-- LIMIT 10;


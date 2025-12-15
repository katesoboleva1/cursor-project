-- ====================================================================
-- ПРОВЕРОЧНЫЕ ЗАПРОСЫ ДЛЯ КЛАССИФИКАЦИИ ВИЛЛ
-- ====================================================================
-- Используйте эти запросы для проверки результатов классификации
-- после выполнения sql/10_villa_layout_classification.sql
-- ====================================================================

-- ================================================================
-- 1. ОБЩАЯ СТАТИСТИКА ПО ВИЛЛАМ
-- ================================================================
SELECT 
  COUNT(*) as total_villas,
  COUNT(CASE WHEN villa_layout_type IS NOT NULL THEN 1 END) as with_layout_type,
  COUNT(CASE WHEN villa_layout_detailed IS NOT NULL THEN 1 END) as with_detailed,
  COUNT(CASE WHEN villa_layout_category IS NOT NULL THEN 1 END) as with_category,
  COUNT(CASE WHEN villa_size_category IS NOT NULL THEN 1 END) as with_size_category,
  ROUND(COUNT(CASE WHEN villa_layout_type IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as pct_classified
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' AND isActive = true;

-- ================================================================
-- 2. РАСПРЕДЕЛЕНИЕ ПО ТИПАМ ПЛАНИРОВКИ
-- ================================================================
SELECT 
  villa_layout_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
  ROUND(AVG(price), 0) as avg_price,
  ROUND(AVG(area), 0) as avg_area_sqft,
  ROUND(AVG(rooms), 1) as avg_bedrooms,
  ROUND(AVG(baths), 1) as avg_bathrooms,
  MIN(price) as min_price,
  MAX(price) as max_price
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

-- ================================================================
-- 3. РАСПРЕДЕЛЕНИЕ ПО КАТЕГОРИЯМ (Standard/Luxury/Ultra Luxury)
-- ================================================================
SELECT 
  villa_layout_category,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
  ROUND(AVG(price), 0) as avg_price,
  ROUND(AVG(rooms), 1) as avg_bedrooms,
  ROUND(AVG(baths), 1) as avg_bathrooms,
  ROUND(AVG(area), 0) as avg_area_sqft
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' AND isActive = true
  AND villa_layout_category IS NOT NULL
GROUP BY villa_layout_category
ORDER BY 
  CASE villa_layout_category
    WHEN 'Studio' THEN 1
    WHEN 'Compact' THEN 2
    WHEN 'Standard' THEN 3
    WHEN 'Luxury' THEN 4
    WHEN 'Ultra Luxury' THEN 5
    ELSE 99
  END;

-- ================================================================
-- 4. ТОП 20 ДЕТАЛЬНЫХ КЛАССИФИКАЦИЙ
-- ================================================================
SELECT 
  villa_layout_detailed,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
  ROUND(AVG(price), 0) as avg_price,
  ROUND(AVG(villa_bedroom_bath_ratio), 2) as avg_bedroom_bath_ratio,
  ROUND(AVG(area), 0) as avg_area_sqft
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' AND isActive = true
  AND villa_layout_detailed IS NOT NULL
GROUP BY villa_layout_detailed
ORDER BY count DESC
LIMIT 20;

-- ================================================================
-- 5. РАСПРЕДЕЛЕНИЕ ПО РАЗМЕРАМ
-- ================================================================
SELECT 
  villa_size_category,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
  ROUND(AVG(price), 0) as avg_price,
  ROUND(AVG(rooms), 1) as avg_bedrooms
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' AND isActive = true
  AND villa_size_category IS NOT NULL
GROUP BY villa_size_category
ORDER BY 
  CASE 
    WHEN villa_size_category LIKE 'Compact%' THEN 1
    WHEN villa_size_category LIKE 'Small%' THEN 2
    WHEN villa_size_category LIKE 'Medium%' THEN 3
    WHEN villa_size_category LIKE 'Large%' THEN 4
    WHEN villa_size_category LIKE 'Very Large%' THEN 5
    WHEN villa_size_category LIKE 'Extra Large%' THEN 6
    ELSE 99
  END;

-- ================================================================
-- 6. СООТНОШЕНИЕ СПАЛЬНИ/ВАННЫЕ ПО ТИПАМ
-- ================================================================
SELECT 
  villa_layout_type,
  ROUND(AVG(villa_bedroom_bath_ratio), 2) as avg_bedroom_bath_ratio,
  MIN(villa_bedroom_bath_ratio) as min_ratio,
  MAX(villa_bedroom_bath_ratio) as max_ratio,
  COUNT(*) as count
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND villa_bedroom_bath_ratio IS NOT NULL
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
    ELSE 99
  END;

-- ================================================================
-- 7. КРОСС-АНАЛИЗ: КАТЕГОРИЯ vs РАЗМЕР
-- ================================================================
SELECT 
  villa_layout_category,
  villa_size_category,
  COUNT(*) as count,
  ROUND(AVG(price), 0) as avg_price
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND villa_layout_category IS NOT NULL
  AND villa_size_category IS NOT NULL
GROUP BY villa_layout_category, villa_size_category
ORDER BY villa_layout_category, 
  CASE 
    WHEN villa_size_category LIKE 'Compact%' THEN 1
    WHEN villa_size_category LIKE 'Small%' THEN 2
    WHEN villa_size_category LIKE 'Medium%' THEN 3
    WHEN villa_size_category LIKE 'Large%' THEN 4
    WHEN villa_size_category LIKE 'Very Large%' THEN 5
    WHEN villa_size_category LIKE 'Extra Large%' THEN 6
    ELSE 99
  END;

-- ================================================================
-- 8. ПРИМЕРЫ ВИЛЛ КАЖДОГО ТИПА ПЛАНИРОВКИ
-- ================================================================
SELECT 
  adId,
  title,
  rooms,
  baths,
  villa_layout_type,
  villa_layout_detailed,
  villa_layout_category,
  villa_size_category,
  area,
  built_up_area_dld,
  price,
  refty_district
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND villa_layout_type = '5BR'  -- Измените на нужный тип
ORDER BY price DESC
LIMIT 10;

-- ================================================================
-- 9. ВИЛЛЫ БЕЗ КЛАССИФИКАЦИИ (UNKNOWN)
-- ================================================================
SELECT 
  COUNT(*) as unknown_count,
  COUNT(CASE WHEN rooms IS NULL THEN 1 END) as missing_rooms,
  COUNT(CASE WHEN rooms IS NOT NULL THEN 1 END) as has_rooms_but_unknown
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND villa_layout_type = 'UNKNOWN';

-- Примеры вилл без классификации
SELECT 
  adId,
  title,
  rooms,
  baths,
  area,
  description
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND villa_layout_type = 'UNKNOWN'
LIMIT 20;

-- ================================================================
-- 10. СТАТИСТИКА ПО ЦЕНАМ В РАЗРЕЗЕ ТИПОВ
-- ================================================================
SELECT 
  villa_layout_type,
  COUNT(*) as count,
  ROUND(AVG(price), 0) as avg_price,
  ROUND(PERCENTILE_CONT(price, 0.5) OVER(PARTITION BY villa_layout_type), 0) as median_price,
  ROUND(PERCENTILE_CONT(price, 0.25) OVER(PARTITION BY villa_layout_type), 0) as p25_price,
  ROUND(PERCENTILE_CONT(price, 0.75) OVER(PARTITION BY villa_layout_type), 0) as p75_price,
  MIN(price) as min_price,
  MAX(price) as max_price
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND villa_layout_type IS NOT NULL
  AND price IS NOT NULL
GROUP BY villa_layout_type, price
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
    ELSE 99
  END;

-- Альтернативный запрос (без оконных функций)
SELECT 
  villa_layout_type,
  COUNT(*) as count,
  ROUND(AVG(price), 0) as avg_price,
  ROUND(APPROX_QUANTILES(price, 100)[OFFSET(50)], 0) as median_price,
  ROUND(APPROX_QUANTILES(price, 100)[OFFSET(25)], 0) as p25_price,
  ROUND(APPROX_QUANTILES(price, 100)[OFFSET(75)], 0) as p75_price,
  MIN(price) as min_price,
  MAX(price) as max_price
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND villa_layout_type IS NOT NULL
  AND price IS NOT NULL
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
    ELSE 99
  END;


-- ====================================================================
-- ЭТАП 1: ИДЕНТИФИКАЦИЯ ПРОЕКТОВ БЕЗ ЗАСТРОЙЩИКА
-- ====================================================================
-- Находит проекты, у которых отсутствует developer_name_en
-- Группирует по building (тип недвижимости) и district (район)
-- ====================================================================

SELECT 
  DISTINCT building as property_type,
  district,
  project_name_en,
  project_id,
  COUNT(*) as properties_count,
  MIN(price) as min_price,
  MAX(price) as max_price,
  AVG(price) as avg_price,
  COUNT(DISTINCT rooms) as unique_bedrooms,
  COUNT(DISTINCT area) as unique_areas
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE 1=1
  AND city = 'Dubai'
  AND isActive = true
  AND developer_name_en IS NULL
  AND project_id IS NOT NULL
  AND project_name_en IS NOT NULL
GROUP BY 
  building,
  district,
  project_name_en,
  project_id
ORDER BY 
  properties_count DESC,
  district,
  project_name_en;

-- ====================================================================
-- ПРИМЕР: Конкретный район (Dubai Marina)
-- ====================================================================

-- SELECT 
--   DISTINCT building,
--   developer_name_en,
--   project_name_en,
--   project_id,
--   COUNT(*) as properties_count
-- FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
-- WHERE 1=1
--   AND city = 'Dubai'
--   AND isActive = true
--   AND district = 'Dubai Marina'
--   AND developer_name_en IS NULL
-- GROUP BY 
--   building,
--   developer_name_en,
--   project_name_en,
--   project_id
-- ORDER BY properties_count DESC;


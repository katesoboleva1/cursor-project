-- ====================================================================
-- CREATE VIEW WITH BUA AND PLOT FIELDS FROM DESCRIPTION
-- ====================================================================
-- Создание VIEW с 4 дополнительными полями для извлечения BUA и Plot
-- из description без изменения оригинальной таблицы
--
-- ПРЕИМУЩЕСТВА VIEW:
-- - Не перезаписывает оригинальную таблицу
-- - Быстрое создание (не копирует данные)
-- - Автоматически обновляется при изменении базовой таблицы
-- ====================================================================

CREATE OR REPLACE VIEW `refty-409711.refty_looker_dashboard.unified_properties_with_bua_plot` AS
SELECT 
  *,
  
  -- ================================================================
  -- ПОЛЕ 1: bua_listing_sqft - BUA из description (оригинал sqft)
  -- ================================================================
  SAFE_CAST(
    REGEXP_REPLACE(
      COALESCE(
        REGEXP_EXTRACT(description, r'(?i)BUA[:\s]*([0-9,]+(?:\.[0-9]+)?)', 1),
        REGEXP_EXTRACT(description, r'(?i)Built[-\s]*up[-\s]*Area[:\s]*([0-9,]+(?:\.[0-9]+)?)', 1),
        REGEXP_EXTRACT(description, r'(?i)([0-9,]+(?:\.[0-9]+)?)\s*(?:sq\s*ft|sqft|sq\.ft)\s*BUA', 1),
        REGEXP_EXTRACT(description, r'(?i)BUA[:\s]*([0-9,]+(?:\.[0-9]+)?)\s*(?:sq\s*ft|sqft|sq\.ft)', 1)
      ),
      ',', ''
    ) AS FLOAT64
  ) as bua_listing_sqft,
  
  -- ================================================================
  -- ПОЛЕ 2: bua_listing_m2 - BUA в м² (конвертированный)
  -- Формула: sqft * 0.092903 = m²
  -- ================================================================
  SAFE_CAST(
    REGEXP_REPLACE(
      COALESCE(
        REGEXP_EXTRACT(description, r'(?i)BUA[:\s]*([0-9,]+(?:\.[0-9]+)?)', 1),
        REGEXP_EXTRACT(description, r'(?i)Built[-\s]*up[-\s]*Area[:\s]*([0-9,]+(?:\.[0-9]+)?)', 1),
        REGEXP_EXTRACT(description, r'(?i)([0-9,]+(?:\.[0-9]+)?)\s*(?:sq\s*ft|sqft|sq\.ft)\s*BUA', 1),
        REGEXP_EXTRACT(description, r'(?i)BUA[:\s]*([0-9,]+(?:\.[0-9]+)?)\s*(?:sq\s*ft|sqft|sq\.ft)', 1)
      ),
      ',', ''
    ) AS FLOAT64
  ) * 0.092903 as bua_listing_m2,
  
  -- ================================================================
  -- ПОЛЕ 3: plot_listing_sqft - Plot из description (оригинал sqft)
  -- ================================================================
  SAFE_CAST(
    REGEXP_REPLACE(
      COALESCE(
        REGEXP_EXTRACT(description, r'(?i)Plot[:\s]*([0-9,]+(?:\.[0-9]+)?)', 1),
        REGEXP_EXTRACT(description, r'(?i)Plot[-\s]*Size[:\s]*([0-9,]+(?:\.[0-9]+)?)', 1),
        REGEXP_EXTRACT(description, r'(?i)PLOT[:\s]*([0-9,]+(?:\.[0-9]+)?)', 1),
        REGEXP_EXTRACT(description, r'(?i)([0-9,]+(?:\.[0-9]+)?)\s*(?:sq\s*ft|sqft|sq\.ft)\s*[Pp]lot', 1),
        REGEXP_EXTRACT(description, r'(?i)Land[-\s]*Size[:\s]*([0-9,]+(?:\.[0-9]+)?)', 1),
        REGEXP_EXTRACT(description, r'(?i)Plot[-\s]*Area[:\s]*([0-9,]+(?:\.[0-9]+)?)', 1)
      ),
      ',', ''
    ) AS FLOAT64
  ) as plot_listing_sqft,
  
  -- ================================================================
  -- ПОЛЕ 4: plot_listing_m2 - Plot в м² (конвертированный)
  -- Формула: sqft * 0.092903 = m²
  -- ================================================================
  SAFE_CAST(
    REGEXP_REPLACE(
      COALESCE(
        REGEXP_EXTRACT(description, r'(?i)Plot[:\s]*([0-9,]+(?:\.[0-9]+)?)', 1),
        REGEXP_EXTRACT(description, r'(?i)Plot[-\s]*Size[:\s]*([0-9,]+(?:\.[0-9]+)?)', 1),
        REGEXP_EXTRACT(description, r'(?i)PLOT[:\s]*([0-9,]+(?:\.[0-9]+)?)', 1),
        REGEXP_EXTRACT(description, r'(?i)([0-9,]+(?:\.[0-9]+)?)\s*(?:sq\s*ft|sqft|sq\.ft)\s*[Pp]lot', 1),
        REGEXP_EXTRACT(description, r'(?i)Land[-\s]*Size[:\s]*([0-9,]+(?:\.[0-9]+)?)', 1),
        REGEXP_EXTRACT(description, r'(?i)Plot[-\s]*Area[:\s]*([0-9,]+(?:\.[0-9]+)?)', 1)
      ),
      ',', ''
    ) AS FLOAT64
  ) * 0.092903 as plot_listing_m2

FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`;

-- ====================================================================
-- ПРИМЕРЫ REGEX PATTERNS
-- ====================================================================
-- Поддерживаемые форматы в description:
-- 
-- BUA:
-- - "BUA: 5000"
-- - "BUA 5,000"
-- - "Built-up Area: 5000"
-- - "5000 sqft BUA"
-- - "BUA: 5000 sq ft"
--
-- PLOT:
-- - "Plot: 7000"
-- - "Plot Size: 7,000"
-- - "PLOT 7000"
-- - "7000 sqft plot"
-- - "Land Size: 7000"
-- - "Plot Area: 7000"
-- ====================================================================

-- ====================================================================
-- ТЕСТОВЫЕ ЗАПРОСЫ
-- ====================================================================

-- Проверить покрытие BUA для Villa:
-- SELECT 
--   COUNT(*) as total_villas,
--   COUNT(CASE WHEN bua_listing_m2 IS NOT NULL THEN 1 END) as has_bua_from_desc,
--   COUNT(CASE WHEN built_up_area_dld IS NOT NULL THEN 1 END) as has_bua_from_dld,
--   ROUND(COUNT(CASE WHEN bua_listing_m2 IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as pct_desc,
--   ROUND(COUNT(CASE WHEN built_up_area_dld IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as pct_dld
-- FROM `refty-409711.refty_looker_dashboard.unified_properties_with_bua_plot`
-- WHERE category_name = 'Villa';

-- Сравнить BUA из description с BUA из DLD:
-- SELECT 
--   bua_listing_sqft,
--   bua_listing_m2,
--   built_up_area_dld,
--   ABS(bua_listing_m2 - built_up_area_dld) as diff_m2,
--   ROUND(ABS(bua_listing_m2 - built_up_area_dld) / built_up_area_dld * 100, 2) as diff_pct
-- FROM `refty-409711.refty_looker_dashboard.unified_properties_with_bua_plot`
-- WHERE category_name = 'Villa'
--   AND bua_listing_m2 IS NOT NULL
--   AND built_up_area_dld IS NOT NULL
-- ORDER BY diff_pct DESC
-- LIMIT 20;


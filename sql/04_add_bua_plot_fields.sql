-- ====================================================================
-- ADD BUA AND PLOT FIELDS FROM DESCRIPTION
-- ====================================================================
-- Создание 4 новых полей для извлечения BUA и Plot из description:
-- 1. bua_listing_m2 - BUA в м² (конвертированный из sqft)
-- 2. plot_listing_m2 - Plot в м² (конвертированный из sqft)
-- 3. bua_listing_sqft - BUA оригинальные значения в sqft
-- 4. plot_listing_sqft - Plot оригинальные значения в sqft
--
-- Эти поля будут использоваться для улучшенной проверки SIZE_MISMATCH
-- для Villa/Townhouse без built_up_area_dld
-- ====================================================================

CREATE OR REPLACE TABLE `refty-409711.refty_looker_dashboard.unified_properties_table_full_light` AS
SELECT 
  *,
  
  -- ================================================================
  -- ПОЛЕ 1: bua_listing_sqft - BUA из description (sqft)
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
  -- 1 sqft = 0.092903 м²
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
  -- ПОЛЕ 3: plot_listing_sqft - Plot из description (sqft)
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
  -- 1 sqft = 0.092903 м²
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
-- ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
-- ====================================================================

-- 1️⃣ Проверить сколько объявлений имеют BUA в description:
-- SELECT 
--   COUNT(*) as total,
--   COUNT(CASE WHEN bua_listing_m2 IS NOT NULL THEN 1 END) as has_bua,
--   ROUND(COUNT(CASE WHEN bua_listing_m2 IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as pct
-- FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
-- WHERE category_name = 'Villa';

-- 2️⃣ Сравнить bua_listing_m2 с built_up_area_dld:
-- SELECT 
--   bua_listing_m2,
--   built_up_area_dld,
--   ABS(bua_listing_m2 - built_up_area_dld) as diff,
--   ROUND(ABS(bua_listing_m2 - built_up_area_dld) / built_up_area_dld * 100, 2) as diff_pct
-- FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
-- WHERE category_name = 'Villa'
--   AND bua_listing_m2 IS NOT NULL
--   AND built_up_area_dld IS NOT NULL
-- LIMIT 10;

-- 3️⃣ Использовать в SIZE_MISMATCH:
-- Для Villa/Townhouse без built_up_area_dld можно использовать bua_listing_m2
-- вместо listing_area для более точной проверки


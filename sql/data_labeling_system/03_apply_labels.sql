-- ====================================================================
-- ЭТАП 3: ПРИМЕНЕНИЕ РАЗМЕТКИ К ОСНОВНОЙ ТАБЛИЦЕ
-- ====================================================================
-- Валидирует и применяет разметку к unified_properties_table_full_light
-- ====================================================================

-- ====================================================================
-- ШАГ 1: ВАЛИДАЦИЯ РАЗМЕТКИ
-- ====================================================================
-- Проверяет, что разметка корректна и застройщик существует
-- ====================================================================

WITH validated_labels AS (
  SELECT 
    pdl.project_id,
    pdl.developer_name_en,
    pdl.developer_id,
    pdl.confidence_level,
    pdl.labeling_method,
    d.developer_id as matched_developer_id,
    CASE 
      WHEN d.developer_id IS NOT NULL THEN TRUE
      ELSE FALSE
    END as developer_exists,
    CASE 
      WHEN pdl.confidence_level = 'HIGH' AND d.developer_id IS NOT NULL THEN TRUE
      WHEN pdl.confidence_level = 'MEDIUM' AND d.developer_id IS NOT NULL THEN TRUE
      ELSE FALSE
    END as is_valid
  FROM `refty-409711.refty_looker_dashboard.project_developer_labeling` pdl
  LEFT JOIN `refty-409711.refty_looker_dashboard.developers` d
    ON LOWER(TRIM(pdl.developer_name_en)) = LOWER(TRIM(d.developer_name_en))
  WHERE pdl.developer_name_en IS NOT NULL
    AND pdl.validated = FALSE
)

SELECT 
  COUNT(*) as total_labels,
  COUNT(CASE WHEN developer_exists THEN 1 END) as developers_found,
  COUNT(CASE WHEN is_valid THEN 1 END) as valid_labels,
  COUNT(CASE WHEN NOT is_valid THEN 1 END) as invalid_labels
FROM validated_labels;

-- ====================================================================
-- ШАГ 2: СОЗДАНИЕ ВРЕМЕННОЙ ТАБЛИЦЫ С ОБНОВЛЕННЫМИ ДАННЫМИ
-- ====================================================================
-- Создает таблицу с примененной разметкой (для проверки перед обновлением)
-- ====================================================================

-- CREATE OR REPLACE TABLE `refty-409711.refty_looker_dashboard.unified_properties_with_labels_preview` AS
-- SELECT 
--   up.* EXCEPT(developer_name_en, developer_id),
--   COALESCE(
--     vl.developer_name_en,
--     up.developer_name_en
--   ) as developer_name_en,
--   COALESCE(
--     vl.matched_developer_id,
--     vl.developer_id,
--     up.developer_id
--   ) as developer_id
-- FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light` up
-- LEFT JOIN (
--   SELECT 
--     pdl.project_id,
--     pdl.developer_name_en,
--     d.developer_id as matched_developer_id,
--     pdl.developer_id
--   FROM `refty-409711.refty_looker_dashboard.project_developer_labeling` pdl
--   LEFT JOIN `refty-409711.refty_looker_dashboard.developers` d
--     ON LOWER(TRIM(pdl.developer_name_en)) = LOWER(TRIM(d.developer_name_en))
--   WHERE pdl.developer_name_en IS NOT NULL
--     AND pdl.confidence_level IN ('HIGH', 'MEDIUM')
--     AND pdl.validated = TRUE
-- ) vl
--   ON up.project_id = vl.project_id
-- WHERE up.isActive = true;

-- ====================================================================
-- ШАГ 3: ОБНОВЛЕНИЕ ОСНОВНОЙ ТАБЛИЦЫ (ОСТОРОЖНО!)
-- ====================================================================
-- ВНИМАНИЕ: Этот запрос обновляет основную таблицу!
-- Рекомендуется сначала проверить preview таблицу
-- ====================================================================

-- MERGE `refty-409711.refty_looker_dashboard.unified_properties_table_full_light` AS target
-- USING (
--   SELECT 
--     pdl.project_id,
--     pdl.developer_name_en,
--     d.developer_id
--   FROM `refty-409711.refty_looker_dashboard.project_developer_labeling` pdl
--   INNER JOIN `refty-409711.refty_looker_dashboard.developers` d
--     ON LOWER(TRIM(pdl.developer_name_en)) = LOWER(TRIM(d.developer_name_en))
--   WHERE pdl.developer_name_en IS NOT NULL
--     AND pdl.confidence_level = 'HIGH'
--     AND pdl.validated = TRUE
-- ) AS source
-- ON target.project_id = source.project_id
--   AND target.developer_name_en IS NULL
-- WHEN MATCHED THEN
--   UPDATE SET
--     developer_name_en = source.developer_name_en,
--     developer_id = source.developer_id;

-- ====================================================================
-- ШАГ 4: ОТМЕТКА РАЗМЕТКИ КАК ПРИМЕНЕННОЙ
-- ====================================================================

-- UPDATE `refty-409711.refty_looker_dashboard.project_developer_labeling`
-- SET 
--   validated = TRUE,
--   validated_by = 'SYSTEM',
--   validated_at = CURRENT_TIMESTAMP(),
--   updated_at = CURRENT_TIMESTAMP()
-- WHERE project_id IN (
--   SELECT DISTINCT project_id
--   FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
--   WHERE developer_name_en IS NOT NULL
--     AND project_id IN (
--       SELECT project_id 
--       FROM `refty-409711.refty_looker_dashboard.project_developer_labeling`
--     )
-- );

-- ====================================================================
-- СТАТИСТИКА ПОСЛЕ ПРИМЕНЕНИЯ
-- ====================================================================

-- SELECT 
--   COUNT(*) as total_properties,
--   COUNT(CASE WHEN developer_name_en IS NOT NULL THEN 1 END) as with_developer,
--   COUNT(CASE WHEN developer_name_en IS NULL THEN 1 END) as without_developer,
--   ROUND(
--     COUNT(CASE WHEN developer_name_en IS NOT NULL THEN 1 END) * 100.0 / 
--     COUNT(*), 
--     2
--   ) as coverage_percentage
-- FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
-- WHERE isActive = true;


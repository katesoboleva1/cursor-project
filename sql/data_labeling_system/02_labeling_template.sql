-- ====================================================================
-- ЭТАП 2: ШАБЛОН ДЛЯ РАЗМЕТКИ ПРОЕКТОВ
-- ====================================================================
-- Создает таблицу для хранения разметки застройщиков
-- ====================================================================

-- Создание таблицы для разметки
CREATE TABLE IF NOT EXISTS `refty-409711.refty_looker_dashboard.project_developer_labeling` (
  project_id STRING NOT NULL,
  project_name_en STRING,
  district STRING,
  building STRING,
  developer_name_en STRING,
  developer_id STRING,
  developer_name_original STRING,
  confidence_level STRING, -- HIGH, MEDIUM, LOW
  labeling_method STRING,  -- MANUAL, AUTOMATED, MATCHED
  labeled_by STRING,
  labeled_at TIMESTAMP,
  validated BOOL DEFAULT FALSE,
  validated_by STRING,
  validated_at TIMESTAMP,
  notes STRING,
  source STRING, -- Источник информации
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(created_at)
CLUSTER BY district, building;

-- ====================================================================
-- ВСТАВКА ДАННЫХ ДЛЯ РАЗМЕТКИ
-- ====================================================================
-- Пример: Разметка проектов из Dubai Marina
-- ====================================================================

-- INSERT INTO `refty-409711.refty_looker_dashboard.project_developer_labeling`
-- (
--   project_id,
--   project_name_en,
--   district,
--   building,
--   developer_name_en,
--   developer_id,
--   confidence_level,
--   labeling_method,
--   labeled_by,
--   labeled_at,
--   notes
-- )
-- SELECT DISTINCT
--   project_id,
--   project_name_en,
--   district,
--   building,
--   NULL as developer_name_en,  -- ЗАПОЛНИТЬ ВРУЧНУЮ
--   NULL as developer_id,        -- ЗАПОЛНИТЬ ВРУЧНУЮ
--   'LOW' as confidence_level,   -- ИЗМЕНИТЬ ПОСЛЕ РАЗМЕТКИ
--   'MANUAL' as labeling_method,
--   'USER_NAME' as labeled_by,   -- ЗАМЕНИТЬ НА РЕАЛЬНОЕ ИМЯ
--   CURRENT_TIMESTAMP() as labeled_at,
--   'Требуется разметка' as notes
-- FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
-- WHERE city = 'Dubai'
--   AND isActive = true
--   AND developer_name_en IS NULL
--   AND project_id IS NOT NULL
--   AND project_name_en IS NOT NULL
--   AND project_id NOT IN (
--     SELECT project_id 
--     FROM `refty-409711.refty_looker_dashboard.project_developer_labeling`
--   );

-- ====================================================================
-- ОБНОВЛЕНИЕ РАЗМЕТКИ
-- ====================================================================

-- UPDATE `refty-409711.refty_looker_dashboard.project_developer_labeling`
-- SET 
--   developer_name_en = 'DEVELOPER_NAME',
--   developer_id = 'DEVELOPER_ID',
--   confidence_level = 'HIGH',
--   labeling_method = 'MANUAL',
--   labeled_by = 'USER_NAME',
--   labeled_at = CURRENT_TIMESTAMP(),
--   notes = 'Разметка выполнена',
--   updated_at = CURRENT_TIMESTAMP()
-- WHERE project_id = 'PROJECT_ID';

-- ====================================================================
-- ПОИСК ЗАСТРОЙЩИКА В ТАБЛИЦЕ DEVELOPERS
-- ====================================================================

-- SELECT 
--   pdl.project_id,
--   pdl.project_name_en,
--   pdl.developer_name_en as suggested_developer,
--   d.developer_id,
--   d.developer_name_en as matched_developer,
--   CASE 
--     WHEN LOWER(TRIM(pdl.developer_name_en)) = LOWER(TRIM(d.developer_name_en)) 
--     THEN 'EXACT_MATCH'
--     WHEN LOWER(TRIM(pdl.developer_name_en)) LIKE CONCAT('%', LOWER(TRIM(d.developer_name_en)), '%')
--     THEN 'PARTIAL_MATCH'
--     ELSE 'NO_MATCH'
--   END as match_type
-- FROM `refty-409711.refty_looker_dashboard.project_developer_labeling` pdl
-- LEFT JOIN `refty-409711.refty_looker_dashboard.developers` d
--   ON LOWER(TRIM(pdl.developer_name_en)) = LOWER(TRIM(d.developer_name_en))
-- WHERE pdl.developer_name_en IS NOT NULL
--   AND pdl.validated = FALSE;


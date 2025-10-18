-- ====================================================================
-- ADD UNIT_SERIES FIELD TO ALL_TRANSACTIONS_COMBINED
-- ====================================================================
-- Создание поля unit_series для определения серии юнита
-- путем удаления номера этажа из номера юнита
--
-- Логика:
-- 1. JOIN с таблицей enriched_units для получения данных юнитов
-- 2. Удалить tp_FloorNumber из начала unit_number
-- 3. Получить оставшуюся часть как unit_series
-- 4. Применяется для типа "Unit" (property_type_en = 'Unit')
--
-- Пример: unit_number = "1205", tp_FloorNumber = "12" → unit_series = "05"
-- Пример: unit_number = "C2701", tp_FloorNumber = "27" → unit_series = "01"
-- ====================================================================

CREATE OR REPLACE TABLE `dev.all_transactions_combined` AS
SELECT 
  t.*,
  
  -- ================================================================
  -- ПОЛЕ: unit_series - Серия юнита (остаток после удаления этажа)
  -- ================================================================
  CASE
    -- Приоритет 1: Использовать данные из enriched_units
    WHEN t.property_type_en = 'Unit' 
      AND eu.unit_number IS NOT NULL 
      AND eu.tp_FloorNumber IS NOT NULL
    THEN
      -- Удалить номер этажа из начала unit_number, затем убрать все буквы
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          CAST(eu.unit_number AS STRING),
          CONCAT('^', CAST(eu.tp_FloorNumber AS STRING)),
          ''
        ),
        r'[^0-9]',
        ''
      )
    
    -- Приоритет 2: Fallback на данные из all_transactions_combined
    WHEN t.property_type_en = 'Unit' 
      AND t.unit_number IS NOT NULL 
      AND t.tp_FloorNumber IS NOT NULL
    THEN
      -- Удалить номер этажа из начала unit_number, затем убрать все буквы
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          CAST(t.unit_number AS STRING),
          CONCAT('^', CAST(t.tp_FloorNumber AS STRING)),
          ''
        ),
        r'[^0-9]',
        ''
      )
    
    -- Приоритет 3: Расчет по permit_number из enriched_units
    WHEN t.property_type_en = 'Unit' 
      AND t.permit_number IS NOT NULL
      AND eu.permit_number IS NOT NULL
      AND eu.unit_number IS NOT NULL
      AND eu.tp_FloorNumber IS NOT NULL
    THEN
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          CAST(eu.unit_number AS STRING),
          CONCAT('^', CAST(eu.tp_FloorNumber AS STRING)),
          ''
        ),
        r'[^0-9]',
        ''
      )
    
    ELSE NULL
  END as unit_series

FROM `dev.all_transactions_combined` t

-- LEFT JOIN с enriched_units для обогащения данных
LEFT JOIN `refty-409711.refty_looker_dashboard.enriched_units` eu
  ON t.permit_number = eu.permit_number
  AND t.property_type_en = 'Unit';

-- ====================================================================
-- ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ И ПРОВЕРКИ
-- ====================================================================

-- 1️⃣ Проверить распределение unit_series:
-- SELECT 
--   unit_series,
--   COUNT(*) as count,
--   COUNT(DISTINCT permit_number) as unique_permits,
--   ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
-- FROM `dev.all_transactions_combined`
-- WHERE unit_series IS NOT NULL
-- GROUP BY unit_series
-- ORDER BY count DESC
-- LIMIT 50;

-- 2️⃣ Найти юниты с одинаковой серией в здании:
-- SELECT 
--   permit_number,
--   tp_FloorNumber,
--   unit_number,
--   unit_series,
--   COUNT(*) OVER (PARTITION BY permit_number, unit_series) as units_with_same_series
-- FROM `dev.all_transactions_combined`
-- WHERE unit_series IS NOT NULL
--   AND property_type_en = 'Unit'
-- ORDER BY permit_number, unit_series, tp_FloorNumber
-- LIMIT 200;

-- 3️⃣ Анализ серий по проектам:
-- SELECT 
--   project_name_en,
--   MIN(unit_series) as min_series,
--   MAX(unit_series) as max_series,
--   COUNT(DISTINCT unit_series) as unique_series,
--   COUNT(*) as total_units,
--   ROUND(AVG(unit_series), 2) as avg_series
-- FROM `dev.all_transactions_combined`
-- WHERE unit_series IS NOT NULL
--   AND project_name_en IS NOT NULL
-- GROUP BY project_name_en
-- HAVING COUNT(*) >= 10
-- ORDER BY unique_series DESC
-- LIMIT 20;

-- 4️⃣ Проверка корректности расчета (сравнение с enriched_units):
-- SELECT 
--   t.permit_number,
--   t.unit_number as trans_unit_number,
--   t.tp_FloorNumber as trans_floor,
--   t.unit_series,
--   -- Проверка логики: unit_number должен начинаться с tp_FloorNumber
--   STARTS_WITH(CAST(t.unit_number AS STRING), CAST(t.tp_FloorNumber AS STRING)) as starts_with_floor,
--   -- Ручная проверка: что получается после удаления
--   REGEXP_REPLACE(CAST(t.unit_number AS STRING), CONCAT('^', CAST(t.tp_FloorNumber AS STRING)), '') as manual_series,
--   -- Данные из enriched_units для сравнения
--   eu.unit_number as enriched_unit_number,
--   eu.tp_FloorNumber as enriched_floor
-- FROM `dev.all_transactions_combined` t
-- LEFT JOIN `refty-409711.refty_looker_dashboard.enriched_units` eu
--   ON t.permit_number = eu.permit_number
-- WHERE t.unit_series IS NOT NULL
--   AND t.property_type_en = 'Unit'
-- ORDER BY t.permit_number, t.tp_FloorNumber, t.unit_number
-- LIMIT 100;

-- 5️⃣ Статистика покрытия: сколько юнитов получили unit_series:
-- SELECT 
--   property_type_en,
--   COUNT(*) as total,
--   COUNT(CASE WHEN unit_series IS NOT NULL THEN 1 END) as with_unit_series,
--   ROUND(COUNT(CASE WHEN unit_series IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as coverage_pct
-- FROM `dev.all_transactions_combined`
-- WHERE property_type_en = 'Unit'
-- GROUP BY property_type_en;

-- 6️⃣ Поиск аномалий (пустые или некорректные значения):
-- SELECT 
--   permit_number,
--   project_name_en,
--   unit_number,
--   tp_FloorNumber,
--   unit_series,
--   LENGTH(unit_series) as series_length,
--   CASE
--     WHEN unit_series = '' THEN 'EMPTY_SERIES'
--     WHEN unit_series = unit_number THEN 'NOT_REMOVED'
--     WHEN LENGTH(unit_series) > 4 THEN 'TOO_LONG'
--     WHEN REGEXP_CONTAINS(unit_series, r'[^0-9]') THEN 'NON_NUMERIC'
--     ELSE 'NORMAL'
--   END as anomaly_type
-- FROM `dev.all_transactions_combined`
-- WHERE unit_series IS NOT NULL
--   AND (
--     unit_series = '' 
--     OR unit_series = unit_number 
--     OR LENGTH(unit_series) > 4
--     OR REGEXP_CONTAINS(unit_series, r'[^0-9]')
--   )
-- ORDER BY anomaly_type, permit_number
-- LIMIT 100;

-- 7️⃣ Топ зданий по разнообразию серий:
-- SELECT 
--   permit_number,
--   project_name_en,
--   COUNT(DISTINCT unit_series) as unique_series,
--   COUNT(*) as total_units,
--   MIN(unit_series) as min_series,
--   MAX(unit_series) as max_series,
--   STRING_AGG(DISTINCT unit_series, ', ' ORDER BY unit_series) as all_series
-- FROM `dev.all_transactions_combined`
-- WHERE unit_series IS NOT NULL
--   AND permit_number IS NOT NULL
-- GROUP BY permit_number, project_name_en
-- HAVING COUNT(DISTINCT unit_series) > 1
-- ORDER BY unique_series DESC
-- LIMIT 30;

-- 8️⃣ Примеры работы с разными форматами unit_number:
-- Демонстрация как работает удаление префикса этажа
-- SELECT 
--   unit_number,
--   tp_FloorNumber,
--   unit_series,
--   -- Примеры:
--   -- unit_number = "1205", floor = "12" → series = "05"
--   -- unit_number = "305", floor = "3" → series = "05"
--   -- unit_number = "2101", floor = "21" → series = "01"
--   CONCAT('unit: ', unit_number, ' | floor: ', tp_FloorNumber, ' → series: ', unit_series) as example
-- FROM `dev.all_transactions_combined`
-- WHERE unit_series IS NOT NULL
--   AND property_type_en = 'Unit'
--   AND unit_series != ''
-- ORDER BY RAND()
-- LIMIT 50;


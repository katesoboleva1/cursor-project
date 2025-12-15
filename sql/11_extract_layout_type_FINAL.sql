-- ====================================================================
-- EXTRACT LAYOUT TYPE FROM DESCRIPTION - FINAL VERSION
-- ====================================================================
-- Извлечение типов планировки из поля description
-- Поддерживает паттерны:
-- - "Amber D1M layout", "ProjectName ModelName layout" (приоритет)
-- - "Type 3 layout", "type 2e", "Type 3"
--
-- Добавляет поля:
-- - description_layout_type: краткий тип (например, "D1M", "3", "2e")
-- - description_layout_type_full: полный тип (например, "Amber D1M layout", "Type 3 layout", "type 2e")
-- ====================================================================

CREATE OR REPLACE TABLE `refty-409711.refty_looker_dashboard.unified_properties_table_full_light` AS
SELECT 
  *,
  
  -- ================================================================
  -- КРАТКИЙ ТИП ПЛАНИРОВКИ (description_layout_type)
  -- Извлекает только число или число+букву/модель
  -- Примеры: "3", "2e", "2", "D1M", "0"
  -- ================================================================
  COALESCE(
    -- ПАТТЕРН 1: "ProjectName ModelName layout" - "Amber D1M layout" -> "D1M"
    -- Ищет паттерн: слово (название проекта) + пробел + буквы/цифры (модель) + " layout"
    -- Извлекаем только модель (вторую группу)
    REGEXP_EXTRACT(
      description, 
      r'(?i)\b[A-Z][a-z]+\s+([A-Z0-9]+[A-Z0-9]*)\s+layout\b'
    ),
    
    -- ПАТТЕРН 2: "type X layout" - "Type 3 layout" -> "3"
    REGEXP_EXTRACT(
      description, 
      r'(?i)\btype\s*(\d+[a-z]?)\s+layout\b'
    ),
    
    -- ПАТТЕРН 3: "type X" - "type 2e" -> "2e", "Type 3" -> "3"
    REGEXP_EXTRACT(
      description, 
      r'(?i)\btype\s*(\d+[a-z]?)\b'
    ),
    
    NULL
  ) as description_layout_type,
  
  -- ================================================================
  -- ПОЛНЫЙ ТИП ПЛАНИРОВКИ (description_layout_type_full)
  -- Сохраняет полное название включая название проекта/модели и "layout" если есть
  -- Примеры: "Amber D1M layout", "Type 3 layout", "type 2e", "Type 3"
  -- ================================================================
  COALESCE(
    -- ПАТТЕРН 1: "ProjectName ModelName layout" - извлекает "ProjectName ModelName"
    -- Пример: "Amber D1M layout" -> "Amber D1M"
    CASE
      WHEN REGEXP_CONTAINS(description, r'(?i)\b([A-Z][a-z]+)\s+([A-Z0-9]+[A-Z0-9]*)\s+layout\b') THEN
        REGEXP_EXTRACT(description, r'(?i)\b([A-Z][a-z]+\s+[A-Z0-9]+[A-Z0-9]*)\s+layout\b')
      ELSE NULL
    END,
    
    -- ПАТТЕРН 2: "Type X layout" - извлекает "Type X"
    CASE
      WHEN REGEXP_CONTAINS(description, r'(?i)\btype\s*\d+[a-z]?\s+layout\b') THEN
        REGEXP_EXTRACT(description, r'(?i)\b(type\s*\d+[a-z]?)\s+layout\b')
      ELSE NULL
    END,
    
    -- ПАТТЕРН 3: "type X" - извлекает "type X"
    CASE
      WHEN REGEXP_CONTAINS(description, r'(?i)\btype\s*\d+[a-z]?\b') THEN
        REGEXP_EXTRACT(description, r'(?i)\b(type\s*\d+[a-z]?)\b')
      ELSE NULL
    END,
    
    NULL
  ) as description_layout_type_full

FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`;

-- ====================================================================
-- ПРОВЕРОЧНЫЙ ЗАПРОС
-- ====================================================================
-- Выполните этот запрос после обновления таблицы, чтобы проверить результаты

SELECT 
  description_layout_type,
  description_layout_type_full,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE category_name = 'Villa' 
  AND isActive = true
  AND description_layout_type IS NOT NULL
GROUP BY description_layout_type, description_layout_type_full
ORDER BY count DESC
LIMIT 50;


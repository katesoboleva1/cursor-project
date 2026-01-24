# 🏷️ 3-Ступенчатая система разметки данных

## 📋 Описание

Система для разметки проектов, у которых отсутствует информация о застройщике (`developer_name_en IS NULL`).

## 🎯 Цель

Создать базу знаний с разметкой застройщиков для проектов, где эта информация отсутствует.

---

## 📊 Этапы разметки

### **Этап 1: Идентификация** 🔍
**Файл:** `01_identify_missing_developers.sql`

**Что делает:**
- Находит все проекты без `developer_name_en`
- Группирует по:
  - `building` (тип недвижимости)
  - `district` (район)
  - `project_name_en` (название проекта)
  - `project_id` (ID проекта)

**Результат:**
- Список проектов, требующих разметки
- Статистика по каждому проекту (количество объектов, цены, площади)

---

### **Этап 2: Разметка** ✏️
**Файл:** `02_labeling_template.sql`

**Что делает:**
- Создает таблицу для хранения разметки
- Позволяет вручную или автоматически присваивать `developer_name_en` проектам

**Структура разметки:**
- `project_id` - ID проекта
- `project_name_en` - Название проекта
- `developer_name_en` - Название застройщика (размечается)
- `developer_id` - ID застройщика (из таблицы developers, если есть)
- `confidence_level` - Уровень уверенности (HIGH, MEDIUM, LOW)
- `labeling_method` - Метод разметки (MANUAL, AUTOMATED, MATCHED)
- `labeled_by` - Кто разметил
- `labeled_at` - Когда разметили
- `notes` - Примечания

---

### **Этап 3: Валидация и применение** ✅
**Файл:** `03_apply_labels.sql`

**Что делает:**
- Валидирует разметку
- Применяет разметку к основной таблице
- Обновляет `unified_properties_table_full_light` с новыми значениями `developer_name_en`

**Проверки:**
- Существует ли застройщик в таблице `developers`
- Соответствие project_id
- Проверка дубликатов

---

## 📁 Структура файлов

```
sql/data_labeling_system/
├── 01_identify_missing_developers.sql    # Этап 1: Идентификация
├── 02_labeling_template.sql              # Этап 2: Шаблон разметки
├── 03_apply_labels.sql                    # Этап 3: Применение разметки
├── 02_labeling_workflow.md               # Этот файл (документация)
├── labeling_knowledge_base.json           # База знаний (JSON)
└── README.md                             # Общая документация
```

---

## 🔄 Процесс работы

1. **Запустить Этап 1** → Получить список проектов без застройщика
2. **Разметить данные** → Заполнить базу знаний (JSON или SQL)
3. **Запустить Этап 3** → Применить разметку к основной таблице

---

## 📊 База знаний

База знаний хранится в формате JSON:
- `sql/data_labeling_system/labeling_knowledge_base.json`

Структура:
```json
{
  "project_id": {
    "project_name_en": "...",
    "developer_name_en": "...",
    "developer_id": "...",
    "confidence": "HIGH|MEDIUM|LOW",
    "method": "MANUAL|AUTOMATED|MATCHED",
    "labeled_by": "...",
    "labeled_at": "2026-01-20",
    "notes": "..."
  }
}
```

---

## 🎯 Методы разметки

### 1. MANUAL (Ручная)
- Разметка вручную экспертом
- Высокая точность
- Медленно

### 2. AUTOMATED (Автоматическая)
- Использование алгоритмов сопоставления
- Быстро
- Требует валидации

### 3. MATCHED (Сопоставление)
- Сопоставление с существующими данными
- Использование fuzzy matching
- Средняя точность

---

## ✅ Критерии качества

- **HIGH confidence**: Точное совпадение, проверено экспертом
- **MEDIUM confidence**: Вероятное совпадение, требует проверки
- **LOW confidence**: Предположение, обязательно требует проверки

---

## 📝 Примеры использования

### Найти проекты в Dubai Marina без застройщика:
```sql
SELECT DISTINCT building, project_name_en, project_id
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE city = 'Dubai'
  AND district = 'Dubai Marina'
  AND isActive = true
  AND developer_name_en IS NULL;
```

### Применить разметку:
```sql
-- После заполнения базы знаний
-- Запустить 03_apply_labels.sql
```


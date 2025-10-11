# Refty Verify Score Algorithm v6.0

## Описание

Алгоритм автоматического определения фейковых объявлений недвижимости на основе 8 критериев с интеграцией системы кармы агентств и брокеров.

## Структура

1. **agency_karma.sql** - Таблица кармы агентств с автоматическими коэффициентами
2. **broker_karma.sql** - Таблица кармы брокеров с автоматическими коэффициентами  
3. **refty_verify_score_v6.sql** - Финальный алгоритм расчета Refty Verify Score

## 8 Критериев оценки

### 1️⃣ SOLD (0 или 50 баллов) 🚨
Объект продан в DLD за последние 3 месяца, но активно рекламируется по той же цене ±10%

### 2️⃣ OVERPRICE (-30 до +30 баллов) 💰
Отклонение цены от рыночной (price_vs_market):
- <= -50%: +30 баллов (подозрительно дешево)
- -40% до -50%: +25 баллов
- -30% до -40%: +20 баллов
- -20% до -30%: +10 баллов
- -10% до -20%: +5 баллов
- -10% до +10%: 0 баллов (норма)
- +10% до +20%: -5 баллов
- +20% до +30%: -10 баллов
- +30% до +40%: -15 баллов
- +40% до +50%: -20 баллов
- > +50%: -30 баллов

### 3️⃣ STALE (0 до +30 баллов) ⏰
Объявление висит дольше медианы (94 дня для completed, 135 для under-construction):
- До +5% от медианы: 0 баллов
- +5% до +15%: +10 баллов
- +15% до +25%: +20 баллов
- +25% до +30%: +30 баллов
- > +30%: +30 баллов (максимум)

### 4️⃣ SIZE_MISMATCH (0 или 50 баллов) 📐
Несоответствие площади между объявлением и DLD:
- **Apartment/Office**: сравнение `area` с `tp_propertySize` (>1% отклонение)
- **Villa/Townhouse**: сравнение `area` с `built_up_area_dld` или `tp_propertySize` (>1% отклонение)

### 5️⃣ PRICE_MANIPULATION (0 или 50 баллов) 🎯
Манипуляция с ценами:
- **Случай 1**: `price < project_value` (>5% отклонение) + `all_time_exposure_days < 30` (занижение для поднятия в выдаче)
- **Случай 2**: `price > project_value` (>5% отклонение) (фейк или не переподписан контракт)

### 6️⃣ PERMIT_ABUSE (0 до +50 баллов) 🔥
Злоупотребление одним `permit_number` с разными площадями:
- **Усиленное** (одно агентство, одна площадка):
  - 10-20% вариация: +20 баллов
  - 20-50%: +30 баллов
  - 50-100%: +40 баллов
  - >100%: +50 баллов
- **Базовое** (разные агентства):
  - ≤10%: 0 баллов
  - 10-20%: +10 баллов
  - 20-50%: +20 баллов
  - 50-100%: +30 баллов
  - >100%: +50 баллов

### 7️⃣ UNIT_NUMBER_MISMATCH (0 до +50 баллов) 📋
Один `property_number` используется в разных `project_name_en`:
- 2-5 проектов: +20 баллов
- 6-10 проектов: +30 баллов
- 11-20 проектов: +40 баллов
- >20 проектов: +50 баллов

### 8️⃣ KARMA_PENALTY (0 до +20 баллов) 🆕⭐
Штраф на основе исторической кармы агентства и брокера

## Система кармы

### Коэффициенты кармы агентств/брокеров:

#### karma_coefficient (общий коэффициент):
- Trust Score 90-100%: 0.0 (отличные)
- Trust Score 70-90%: 0.5 (хорошие)
- Trust Score 50-70%: 1.0 (средние)
- Trust Score 30-50%: 2.0 (плохие)
- Trust Score 0-30%: 3.0 (очень плохие)

#### fake_penalty_coefficient (штраф за фейки):
- 0-5% фейков: 0.0
- 5-15% фейков: 1.0
- 15-30% фейков: 2.0
- 30%+ фейков: 3.0

#### violation_penalty_coefficient (штраф за нарушения):
- violation_score < 20%: 0.0
- violation_score 20-40%: 1.0
- violation_score 40%+: 2.0

#### trust_bonus_coefficient (бонус за надежность):
- Trust 95-100%: -2.0 (максимальный бонус)
- Trust 85-95%: -1.0 (средний бонус)
- Trust < 85%: 0.0 (без бонуса)

#### diversity_bonus_coefficient (только для брокеров):
- diversity_score > 30%: -1.0 (бонус)
- diversity_score 15-30%: -0.5 (небольшой бонус)
- diversity_score < 15%: 0.0 (без бонуса)

### Формула KARMA_PENALTY:
```
karma_penalty_score = MIN(20, MAX(0,
  (agency_fake_penalty * 3.33 + agency_violation_penalty * 1.67 +
   broker_fake_penalty * 3.33 + broker_violation_penalty * 1.67) / 2
))
```

## Классификация

- **FAKE**: refty_verify_score ≥ 50 баллов
- **LIKELY_FAKE**: refty_verify_score от 30 до 49 баллов
- **REAL_UNIT**: refty_verify_score от 0 до 29 баллов

## Результаты (по 364,357 активным completed объявлениям):

| Классификация | Количество | Процент | Средний балл |
|---------------|------------|---------|--------------|
| REAL_UNIT | 199,147 | 54.66% | 6.81 |
| LIKELY_FAKE | 138,731 | 38.08% | 31.63 |
| FAKE | 26,479 | 7.27% | 61.77 |

**Итого фейков и подозрительных: 165,210 (45.34%)**

## Статистика по критериям:

| Критерий | Сработал | Процент |
|----------|----------|---------|
| STALE | 218,845 | 60.06% |
| OVERPRICE | 50,524 | 13.87% |
| UNIT_NUMBER_MISMATCH | 13,985 | 3.84% |
| SIZE_MISMATCH | 11,283 | 3.10% |
| PERMIT_ABUSE | 10,137 | 2.78% |
| KARMA_PENALTY | TBD | TBD |
| SOLD | 1,967 | 0.54% |
| PRICE_MANIPULATION | 1,464 | 0.40% |

## Таблицы в BigQuery:

1. `refty-409711.refty_looker_dashboard.agency_karma` - Карма агентств (5,129 агентств)
2. `refty-409711.refty_looker_dashboard.broker_karma` - Карма брокеров (120,485 брокеров)
3. `refty-409711.refty_looker_dashboard.refty_verify_score_final_v6` - Финальная таблица с оценками

## Использование

```sql
-- Получить все фейковые объявления
SELECT * 
FROM `refty-409711.refty_looker_dashboard.refty_verify_score_final_v6`
WHERE refty_classification = 'FAKE'
ORDER BY refty_verify_score DESC;

-- Получить статистику по агентству
SELECT * 
FROM `refty-409711.refty_looker_dashboard.agency_karma`
WHERE agency_name = 'YOUR_AGENCY_NAME'
ORDER BY total_listings DESC;

-- Получить статистику по брокеру
SELECT * 
FROM `refty-409711.refty_looker_dashboard.broker_karma`
WHERE broker_name = 'YOUR_BROKER_NAME'
ORDER BY total_listings DESC;
```

## Версия

**v6.0** - Добавлена активная система кармы с автоматическими коэффициентами (2025-01-11)

## Авторы

Refty Team - https://github.com/refty-yapi


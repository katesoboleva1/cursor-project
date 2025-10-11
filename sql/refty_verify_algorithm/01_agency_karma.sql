-- ====================================================================
-- REFTY VERIFY: AGENCY KARMA TABLE
-- ====================================================================
-- Таблица кармы агентств с автоматическими коэффициентами штрафов
-- на основе исторических показателей качества объявлений
-- ====================================================================

CREATE OR REPLACE TABLE `refty-409711.refty_looker_dashboard.agency_karma` AS
WITH agency_stats AS (
  SELECT 
    tp_authorityNameEn,
    COUNT(*) as total_listings,
    COUNT(CASE WHEN isActive = true THEN 1 END) as active_listings,
    COUNT(CASE WHEN isActive = false THEN 1 END) as inactive_listings,
    COUNT(CASE WHEN refty_classification = 'FAKE' THEN 1 END) as fake_count,
    COUNT(CASE WHEN refty_classification = 'LIKELY_FAKE' THEN 1 END) as likely_fake_count,
    COUNT(CASE WHEN refty_classification = 'REAL_UNIT' THEN 1 END) as real_count,
    ROUND(AVG(refty_verify_score), 2) as avg_score,
    MAX(refty_verify_score) as max_score,
    MIN(refty_verify_score) as min_score,
    
    -- Статистика по критериям
    COUNT(CASE WHEN sold_score > 0 THEN 1 END) as sold_violations,
    COUNT(CASE WHEN overprice_score > 0 THEN 1 END) as overprice_violations,
    COUNT(CASE WHEN stale_score > 0 THEN 1 END) as stale_violations,
    COUNT(CASE WHEN size_mismatch_score > 0 THEN 1 END) as size_mismatch_violations,
    COUNT(CASE WHEN price_manipulation_score > 0 THEN 1 END) as price_manipulation_violations,
    COUNT(CASE WHEN permit_abuse_score > 0 THEN 1 END) as permit_abuse_violations,
    COUNT(CASE WHEN unit_number_mismatch_score > 0 THEN 1 END) as unit_number_mismatch_violations
  FROM `refty-409711.refty_looker_dashboard.refty_verify_score_final_v4`
  WHERE tp_authorityNameEn IS NOT NULL
    AND tp_authorityNameEn != ''
  GROUP BY tp_authorityNameEn
)
SELECT 
  tp_authorityNameEn as agency_name,
  total_listings,
  active_listings,
  inactive_listings,
  fake_count,
  likely_fake_count,
  real_count,
  ROUND(fake_count * 100.0 / total_listings, 2) as fake_percentage,
  ROUND(likely_fake_count * 100.0 / total_listings, 2) as likely_fake_percentage,
  ROUND(real_count * 100.0 / total_listings, 2) as real_percentage,
  avg_score,
  max_score,
  min_score,
  
  -- Статистика по критериям
  sold_violations,
  overprice_violations,
  stale_violations,
  size_mismatch_violations,
  price_manipulation_violations,
  permit_abuse_violations,
  unit_number_mismatch_violations,
  
  -- Метрики для расчета кармы
  ROUND((real_count * 100.0 / total_listings), 2) as trust_score,
  ROUND((fake_count + likely_fake_count) * 100.0 / total_listings, 2) as violation_score,
  
  -- ====================================================================
  -- АВТОМАТИЧЕСКИЕ КОЭФФИЦИЕНТЫ КАРМЫ
  -- ====================================================================
  
  -- karma_coefficient (от 0.0 до 3.0): Общий коэффициент на основе Trust Score
  -- Trust Score 90-100%: 0.0 (отличные агентства, штрафов нет)
  -- Trust Score 70-90%:  0.5 (хорошие, минимальный штраф)
  -- Trust Score 50-70%:  1.0 (средние, умеренный штраф)
  -- Trust Score 30-50%:  2.0 (плохие, высокий штраф)
  -- Trust Score 0-30%:   3.0 (очень плохие, максимальный штраф)
  CASE 
    WHEN ROUND((real_count * 100.0 / total_listings), 2) >= 90 THEN 0.0
    WHEN ROUND((real_count * 100.0 / total_listings), 2) >= 70 THEN 0.5
    WHEN ROUND((real_count * 100.0 / total_listings), 2) >= 50 THEN 1.0
    WHEN ROUND((real_count * 100.0 / total_listings), 2) >= 30 THEN 2.0
    ELSE 3.0
  END as karma_coefficient,
  
  -- fake_penalty_coefficient (от 0.0 до 3.0): Штраф за процент фейков
  -- 0-5% фейков:   0.0 (отлично)
  -- 5-15% фейков:  1.0 (приемлемо)
  -- 15-30% фейков: 2.0 (плохо)
  -- 30%+ фейков:   3.0 (очень плохо)
  CASE 
    WHEN ROUND(fake_count * 100.0 / total_listings, 2) < 5 THEN 0.0
    WHEN ROUND(fake_count * 100.0 / total_listings, 2) < 15 THEN 1.0
    WHEN ROUND(fake_count * 100.0 / total_listings, 2) < 30 THEN 2.0
    ELSE 3.0
  END as fake_penalty_coefficient,
  
  -- violation_penalty_coefficient (от 0.0 до 2.0): Штраф за общие нарушения
  -- violation_score < 20%:  0.0 (хорошо)
  -- violation_score 20-40%: 1.0 (средне)
  -- violation_score 40%+:   2.0 (плохо)
  CASE 
    WHEN ROUND((fake_count + likely_fake_count) * 100.0 / total_listings, 2) < 20 THEN 0.0
    WHEN ROUND((fake_count + likely_fake_count) * 100.0 / total_listings, 2) < 40 THEN 1.0
    ELSE 2.0
  END as violation_penalty_coefficient,
  
  -- trust_bonus_coefficient (от -2.0 до 0.0): БОНУС за высокий trust_score
  -- Trust 95-100%: -2.0 (максимальный бонус)
  -- Trust 85-95%:  -1.0 (средний бонус)
  -- Trust < 85%:   0.0 (без бонуса)
  CASE 
    WHEN ROUND((real_count * 100.0 / total_listings), 2) >= 95 THEN -2.0
    WHEN ROUND((real_count * 100.0 / total_listings), 2) >= 85 THEN -1.0
    ELSE 0.0
  END as trust_bonus_coefficient,
  
  -- Временные метки
  CURRENT_TIMESTAMP() as last_updated,
  CURRENT_DATE() as calculation_date

FROM agency_stats
WHERE total_listings >= 10  -- Только агентства с минимум 10 объявлениями
ORDER BY total_listings DESC;

-- ====================================================================
-- ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
-- ====================================================================

-- Получить ТОП-20 лучших агентств:
-- SELECT * FROM `refty-409711.refty_looker_dashboard.agency_karma`
-- WHERE total_listings >= 20
-- ORDER BY trust_score DESC, total_listings DESC
-- LIMIT 20;

-- Получить ТОП-20 худших агентств:
-- SELECT * FROM `refty-409711.refty_looker_dashboard.agency_karma`
-- WHERE total_listings >= 20
-- ORDER BY trust_score ASC, fake_percentage DESC
-- LIMIT 20;

-- Получить агентства с максимальным штрафом:
-- SELECT * FROM `refty-409711.refty_looker_dashboard.agency_karma`
-- WHERE karma_coefficient = 3.0 AND fake_penalty_coefficient = 3.0
-- ORDER BY total_listings DESC;


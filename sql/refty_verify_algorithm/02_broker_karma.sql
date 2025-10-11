-- ====================================================================
-- REFTY VERIFY: BROKER KARMA TABLE
-- ====================================================================
-- Таблица кармы брокеров с автоматическими коэффициентами штрафов
-- на основе исторических показателей качества объявлений
-- ====================================================================

CREATE OR REPLACE TABLE `refty-409711.refty_looker_dashboard.broker_karma` AS
WITH broker_stats AS (
  SELECT 
    contactName,
    tp_authorityNameEn,
    phone,
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
    COUNT(CASE WHEN unit_number_mismatch_score > 0 THEN 1 END) as unit_number_mismatch_violations,
    
    -- Дополнительные метрики
    COUNT(DISTINCT permit_number) as unique_permits,
    COUNT(DISTINCT project_name_en) as unique_projects,
    COUNT(DISTINCT source) as platforms_used
  FROM `refty-409711.refty_looker_dashboard.refty_verify_score_final_v4`
  WHERE contactName IS NOT NULL
    AND contactName != ''
  GROUP BY contactName, tp_authorityNameEn, phone
)
SELECT 
  contactName as broker_name,
  tp_authorityNameEn as agency_name,
  phone,
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
  
  -- Дополнительные метрики
  unique_permits,
  unique_projects,
  platforms_used,
  CASE 
    WHEN unique_permits > 0 THEN ROUND(total_listings * 1.0 / unique_permits, 2)
    ELSE 0
  END as avg_listings_per_permit,
  
  -- Метрики для расчета кармы
  ROUND((real_count * 100.0 / total_listings), 2) as trust_score,
  ROUND((fake_count + likely_fake_count) * 100.0 / total_listings, 2) as violation_score,
  ROUND((unique_projects * 100.0 / total_listings), 2) as diversity_score,
  
  -- ====================================================================
  -- АВТОМАТИЧЕСКИЕ КОЭФФИЦИЕНТЫ КАРМЫ ДЛЯ БРОКЕРОВ
  -- ====================================================================
  
  -- karma_coefficient (от 0.0 до 3.0)
  CASE 
    WHEN ROUND((real_count * 100.0 / total_listings), 2) >= 90 THEN 0.0
    WHEN ROUND((real_count * 100.0 / total_listings), 2) >= 70 THEN 0.5
    WHEN ROUND((real_count * 100.0 / total_listings), 2) >= 50 THEN 1.0
    WHEN ROUND((real_count * 100.0 / total_listings), 2) >= 30 THEN 2.0
    ELSE 3.0
  END as karma_coefficient,
  
  -- fake_penalty_coefficient (от 0.0 до 3.0)
  CASE 
    WHEN ROUND(fake_count * 100.0 / total_listings, 2) < 5 THEN 0.0
    WHEN ROUND(fake_count * 100.0 / total_listings, 2) < 15 THEN 1.0
    WHEN ROUND(fake_count * 100.0 / total_listings, 2) < 30 THEN 2.0
    ELSE 3.0
  END as fake_penalty_coefficient,
  
  -- violation_penalty_coefficient (от 0.0 до 2.0)
  CASE 
    WHEN ROUND((fake_count + likely_fake_count) * 100.0 / total_listings, 2) < 20 THEN 0.0
    WHEN ROUND((fake_count + likely_fake_count) * 100.0 / total_listings, 2) < 40 THEN 1.0
    ELSE 2.0
  END as violation_penalty_coefficient,
  
  -- trust_bonus_coefficient (от -2.0 до 0.0)
  CASE 
    WHEN ROUND((real_count * 100.0 / total_listings), 2) >= 95 THEN -2.0
    WHEN ROUND((real_count * 100.0 / total_listings), 2) >= 85 THEN -1.0
    ELSE 0.0
  END as trust_bonus_coefficient,
  
  -- diversity_bonus_coefficient (от -1.0 до 0.0): Бонус за разнообразие проектов
  CASE 
    WHEN ROUND((unique_projects * 100.0 / total_listings), 2) > 30 THEN -1.0
    WHEN ROUND((unique_projects * 100.0 / total_listings), 2) > 15 THEN -0.5
    ELSE 0.0
  END as diversity_bonus_coefficient,
  
  -- Временные метки
  CURRENT_TIMESTAMP() as last_updated,
  CURRENT_DATE() as calculation_date

FROM broker_stats
WHERE total_listings >= 5  -- Только брокеры с минимум 5 объявлениями
ORDER BY total_listings DESC;

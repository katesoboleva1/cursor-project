-- ====================================================================
-- REFTY VERIFY SCORE v6.0 - COMPLETE ALGORITHM
-- ====================================================================
-- Полный алгоритм определения фейковых объявлений недвижимости
-- с интеграцией системы кармы агентств и брокеров
--
-- PREREQUISITE: Должны быть созданы таблицы:
-- 1. refty-409711.refty_looker_dashboard.agency_karma
-- 2. refty-409711.refty_looker_dashboard.broker_karma
--
-- РЕЗУЛЬТАТ: Таблица с полной оценкой всех активных объявлений
-- ====================================================================

CREATE OR REPLACE TABLE `refty-409711.refty_looker_dashboard.refty_verify_score_final_v6` AS

-- ====================================================================
-- CTE 1: RECENT SALES (для критерия SOLD)
-- ====================================================================
WITH recent_sales AS (
  SELECT DISTINCT permit_number
  FROM `dev.all_transactions_combined`
  WHERE property_type_en = 'Unit'
    AND permit_number IS NOT NULL
    AND trans_group_en = 'Sales'
    AND instance_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 MONTH)
),

-- ====================================================================
-- CTE 2: MEDIAN EXPOSURE DAYS (для критерия STALE)
-- ====================================================================
median_exposure AS (
  SELECT
    completion_status,
    PERCENTILE_CONT(all_time_exposure_days, 0.5) OVER (PARTITION BY completion_status) as median_days
  FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
  WHERE all_time_exposure_days IS NOT NULL
  GROUP BY completion_status, all_time_exposure_days
),

-- ====================================================================
-- CTE 3: PERMIT ABUSE VARIATIONS (для критерия PERMIT_ABUSE)
-- ====================================================================
permit_variations AS (
  SELECT
    permit_number,
    tp_authorityNameEn,
    source,
    COUNT(DISTINCT adId) as total_ads_for_permit_agent_source,
    COUNT(DISTINCT area) as unique_areas_for_permit_agent_source,
    MIN(area) as min_area_for_permit_agent_source,
    MAX(area) as max_area_for_permit_agent_source,
    (MAX(area) - MIN(area)) / NULLIF(MIN(area), 0) as area_variation_pct_for_permit_agent_source,
    COUNT(DISTINCT CASE WHEN tp_authorityNameEn IS NOT NULL THEN tp_authorityNameEn ELSE 'UNKNOWN_AGENT' END) 
      OVER (PARTITION BY permit_number) as unique_agents_for_permit,
    COUNT(DISTINCT source) OVER (PARTITION BY permit_number, tp_authorityNameEn) as unique_sources_for_permit_agent
  FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
  WHERE permit_number IS NOT NULL
    AND isActive = TRUE
    AND purpose = 'for-sale'
    AND area IS NOT NULL 
    AND area > 0
  GROUP BY permit_number, tp_authorityNameEn, source
),

-- ====================================================================
-- CTE 4: MAIN SCORING LOGIC
-- ====================================================================
scoring AS (
  SELECT
    p.*,
    m.median_days,
    pv.total_ads_for_permit_agent_source,
    pv.unique_areas_for_permit_agent_source,
    pv.area_variation_pct_for_permit_agent_source,
    pv.unique_agents_for_permit,
    pv.unique_sources_for_permit_agent,
    
    -- ================================================================
    -- КАРМА АГЕНТСТВА
    -- ================================================================
    COALESCE(ak.karma_coefficient, 1.0) as agency_karma_coefficient,
    COALESCE(ak.fake_penalty_coefficient, 0.0) as agency_fake_penalty,
    COALESCE(ak.violation_penalty_coefficient, 0.0) as agency_violation_penalty,
    COALESCE(ak.trust_bonus_coefficient, 0.0) as agency_trust_bonus,
    COALESCE(ak.trust_score, 50.0) as agency_trust_score,
    COALESCE(ak.violation_score, 0.0) as agency_violation_score,
    
    -- ================================================================
    -- КАРМА БРОКЕРА
    -- ================================================================
    COALESCE(bk.karma_coefficient, 1.0) as broker_karma_coefficient,
    COALESCE(bk.fake_penalty_coefficient, 0.0) as broker_fake_penalty,
    COALESCE(bk.violation_penalty_coefficient, 0.0) as broker_violation_penalty,
    COALESCE(bk.trust_bonus_coefficient, 0.0) as broker_trust_bonus,
    COALESCE(bk.diversity_bonus_coefficient, 0.0) as broker_diversity_bonus,
    COALESCE(bk.trust_score, 50.0) as broker_trust_score,
    COALESCE(bk.violation_score, 0.0) as broker_violation_score,
    COALESCE(bk.diversity_score, 0.0) as broker_diversity_score,
    
    -- ================================================================
    -- 1️⃣ КРИТЕРИЙ "SOLD" (0 или 50 баллов) 🚨
    -- Объект продан в DLD за последние 3 месяца, но активно рекламируется
    -- ================================================================
    CASE
      WHEN p.isActive = true
        AND s.permit_number IS NOT NULL
        AND p.permit_number IS NOT NULL
        AND CAST(p.permit_number AS STRING) = CAST(s.permit_number AS STRING)
      THEN 50
      ELSE 0
    END as sold_score,
    
    -- ================================================================
    -- 2️⃣ КРИТЕРИЙ "OVERPRICE" (-30 до +30 баллов) 💰
    -- Отклонение цены от рыночной (price_vs_market)
    -- Отрицательные баллы = завышенная цена (хорошо для покупателя)
    -- Положительные баллы = заниженная цена (подозрительно)
    -- ================================================================
    CASE
      WHEN p.price_vs_market IS NOT NULL THEN
        CASE
          WHEN p.price_vs_market <= -0.50 THEN 30  -- Подозрительно дешево
          WHEN p.price_vs_market <= -0.40 THEN 25
          WHEN p.price_vs_market <= -0.30 THEN 20
          WHEN p.price_vs_market <= -0.20 THEN 10
          WHEN p.price_vs_market <= -0.10 THEN 5
          WHEN p.price_vs_market <= 0.10 THEN 0    -- Нормальная цена
          WHEN p.price_vs_market <= 0.20 THEN -5   -- Немного дорого
          WHEN p.price_vs_market <= 0.30 THEN -10
          WHEN p.price_vs_market <= 0.40 THEN -15
          WHEN p.price_vs_market <= 0.50 THEN -20
          ELSE -30                                  -- Очень дорого
        END
      ELSE 0
    END as overprice_score,
    
    -- ================================================================
    -- 3️⃣ КРИТЕРИЙ "STALE" (0 до +30 баллов) ⏰
    -- Объявление висит дольше медианы
    -- Медиана: 94 дня (completed), 135 дней (under-construction)
    -- ================================================================
    CASE
      WHEN p.all_time_exposure_days IS NOT NULL AND m.median_days IS NOT NULL THEN
        CASE
          WHEN p.all_time_exposure_days <= m.median_days THEN 0              -- До медианы
          WHEN p.all_time_exposure_days <= m.median_days * 1.05 THEN 0       -- До +5%
          WHEN p.all_time_exposure_days <= m.median_days * 1.15 THEN 10      -- +5% до +15%
          WHEN p.all_time_exposure_days <= m.median_days * 1.25 THEN 20      -- +15% до +25%
          WHEN p.all_time_exposure_days <= m.median_days * 1.30 THEN 30      -- +25% до +30%
          ELSE 30                                                              -- > +30%
        END
      ELSE 0
    END as stale_score,
    
    -- ================================================================
    -- 4️⃣ КРИТЕРИЙ "SIZE_MISMATCH" (0 или 50 баллов) 📐
    -- Несоответствие площади между объявлением и DLD
    -- Apartment/Office: сравнение area с tp_propertySize
    -- Villa/Townhouse: сравнение area с built_up_area_dld или tp_propertySize
    -- ================================================================
    CASE
      -- Для квартир и офисов: простое сравнение с tp_propertySize
      WHEN p.category_name IN ('Apartment', 'Office')
        AND p.tp_propertySize > 0
        AND p.area IS NOT NULL
        AND ABS(p.area - p.tp_propertySize) / p.tp_propertySize > 0.01
      THEN 50
      
      -- Для вилл и таунхаусов: сложная логика с BUA и Plot
      WHEN p.category_name IN ('Villa', 'Townhouse') THEN
        CASE
          -- Сравнение с built_up_area_dld (площадь дома)
          WHEN p.built_up_area_dld IS NOT NULL
            AND p.area IS NOT NULL
            AND p.built_up_area_dld > 0
            AND ABS(p.area - p.built_up_area_dld) / p.built_up_area_dld > 0.01
          THEN 50
          
          -- Сравнение с tp_propertySize (площадь участка)
          WHEN p.area IS NOT NULL
            AND p.tp_propertySize IS NOT NULL
            AND p.tp_propertySize > 0
            AND ABS(p.area - p.tp_propertySize) / p.tp_propertySize > 0.01
          THEN 50
          
          ELSE 0
        END
      ELSE 0
    END as size_mismatch_score,
    
    -- ================================================================
    -- 5️⃣ КРИТЕРИЙ "PRICE_MANIPULATION" (0 или 50 баллов) 🎯
    -- Манипуляция с ценами относительно project_value
    -- Случай 1: Цена ниже для поднятия в выдаче (свежее объявление)
    -- Случай 2: Цена выше (фейк или не переподписан контракт)
    -- ================================================================
    CASE
      WHEN p.project_value IS NOT NULL 
        AND p.project_value > 0 
        AND p.price IS NOT NULL 
      THEN
        CASE
          -- Случай 1: Занижение цены + свежее объявление
          WHEN p.price < p.project_value
            AND ABS(p.price - p.project_value) / p.project_value > 0.05
            AND p.all_time_exposure_days < 30
          THEN 50
          
          -- Случай 2: Завышение цены
          WHEN p.price > p.project_value
            AND ABS(p.price - p.project_value) / p.project_value > 0.05
          THEN 50
          
          ELSE 0
        END
      ELSE 0
    END as price_manipulation_score,
    
    -- ================================================================
    -- 6️⃣ КРИТЕРИЙ "PERMIT_ABUSE" (0 до +50 баллов) 🔥
    -- Злоупотребление одним permit_number с разными площадями
    -- Усиленное: одно агентство на одной площадке
    -- Базовое: разные агентства или площадки
    -- ================================================================
    CASE
      WHEN pv.permit_number IS NOT NULL 
        AND pv.unique_areas_for_permit_agent_source > 1 
        AND pv.area_variation_pct_for_permit_agent_source IS NOT NULL 
      THEN
        CASE
          -- УСИЛЕННОЕ: одно агентство, одна площадка
          WHEN pv.unique_agents_for_permit = 1 
            AND pv.unique_sources_for_permit_agent = 1 
          THEN
            CASE
              WHEN pv.area_variation_pct_for_permit_agent_source > 1.00 THEN 50  -- >100%
              WHEN pv.area_variation_pct_for_permit_agent_source > 0.50 THEN 40  -- 50-100%
              WHEN pv.area_variation_pct_for_permit_agent_source > 0.20 THEN 30  -- 20-50%
              WHEN pv.area_variation_pct_for_permit_agent_source > 0.10 THEN 20  -- 10-20%
              ELSE 0
            END
          
          -- БАЗОВОЕ: разные агентства или площадки
          ELSE
            CASE
              WHEN pv.area_variation_pct_for_permit_agent_source > 1.00 THEN 50  -- >100%
              WHEN pv.area_variation_pct_for_permit_agent_source > 0.50 THEN 30  -- 50-100%
              WHEN pv.area_variation_pct_for_permit_agent_source > 0.20 THEN 20  -- 20-50%
              WHEN pv.area_variation_pct_for_permit_agent_source > 0.10 THEN 10  -- 10-20%
              ELSE 0
            END
        END
      ELSE 0
    END as permit_abuse_score,
    
    -- ================================================================
    -- 7️⃣ КРИТЕРИЙ "KARMA_PENALTY" (0 до +20 баллов) 🆕⭐
    -- Штраф на основе исторической кармы агентства и брокера
    -- Формула: (agency_karma + broker_karma) / 2
    -- где karma = fake_penalty * 3.33 + violation_penalty * 1.67
    -- ================================================================
    LEAST(20, GREATEST(0,
      ROUND(
        (
          -- Карма агентства
          (COALESCE(ak.fake_penalty_coefficient, 0.0) * 3.33 + 
           COALESCE(ak.violation_penalty_coefficient, 0.0) * 1.67) +
          
          -- Карма брокера
          (COALESCE(bk.fake_penalty_coefficient, 0.0) * 3.33 +
           COALESCE(bk.violation_penalty_coefficient, 0.0) * 1.67)
        ) / 2
      , 1)
    )) as karma_penalty_score

  FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light` p
  
  -- JOIN с recent_sales для критерия SOLD
  LEFT JOIN recent_sales s 
    ON CAST(p.permit_number AS STRING) = CAST(s.permit_number AS STRING)
  
  -- JOIN с median_exposure для критерия STALE
  LEFT JOIN median_exposure m 
    ON p.completion_status = m.completion_status
  
  -- JOIN с permit_variations для критерия PERMIT_ABUSE
  LEFT JOIN permit_variations pv 
    ON p.permit_number = pv.permit_number 
    AND p.tp_authorityNameEn = pv.tp_authorityNameEn
    AND p.source = pv.source
  
  -- JOIN с agency_karma для KARMA_PENALTY
  LEFT JOIN `refty-409711.refty_looker_dashboard.agency_karma` ak 
    ON p.tp_authorityNameEn = ak.agency_name
  
  -- JOIN с broker_karma для KARMA_PENALTY
  LEFT JOIN `refty-409711.refty_looker_dashboard.broker_karma` bk 
    ON p.contactName = bk.broker_name
    AND p.tp_authorityNameEn = bk.agency_name
    AND p.phone = bk.phone
  
  WHERE p.isActive = TRUE 
    AND p.purpose = 'for-sale'
)

-- ====================================================================
-- FINAL SELECT: РАСЧЕТ ИТОГОВОГО БАЛЛА И КЛАССИФИКАЦИЯ
-- ====================================================================
SELECT
  *,
  
  -- ================================================================
  -- ИТОГОВЫЙ REFTY VERIFY SCORE (0-100)
  -- Сумма всех критериев с ограничением 0-100
  -- ================================================================
  LEAST(100, GREATEST(0,
    sold_score + 
    overprice_score + 
    stale_score + 
    size_mismatch_score + 
    price_manipulation_score + 
    permit_abuse_score + 
    karma_penalty_score
  )) as refty_verify_score,
  
  -- ================================================================
  -- КЛАССИФИКАЦИЯ
  -- FAKE: ≥50 баллов (высокая вероятность фейка)
  -- LIKELY_FAKE: 30-49 баллов (вероятно фейк)
  -- REAL_UNIT: 0-29 баллов (реальное объявление)
  -- ================================================================
  CASE
    WHEN LEAST(100, GREATEST(0,
      sold_score + overprice_score + stale_score + size_mismatch_score + 
      price_manipulation_score + permit_abuse_score + 
      karma_penalty_score
    )) >= 50 THEN 'FAKE'
    
    WHEN LEAST(100, GREATEST(0,
      sold_score + overprice_score + stale_score + size_mismatch_score + 
      price_manipulation_score + permit_abuse_score + 
      karma_penalty_score
    )) >= 30 THEN 'LIKELY_FAKE'
    
    ELSE 'REAL_UNIT'
  END as refty_classification,
  
  -- ================================================================
  -- ТЕГИ (для быстрой фильтрации)
  -- Перечисление всех сработавших критериев
  -- ================================================================
  CONCAT(
    CASE WHEN sold_score > 0 THEN 'SOLD ' ELSE '' END,
    CASE WHEN overprice_score > 0 THEN 'OVERPRICE ' ELSE '' END,
    CASE WHEN stale_score > 0 THEN 'STALE ' ELSE '' END,
    CASE WHEN size_mismatch_score > 0 THEN 'SIZE_MISMATCH ' ELSE '' END,
    CASE WHEN price_manipulation_score > 0 THEN 'PRICE_MANIPULATION ' ELSE '' END,
    CASE WHEN permit_abuse_score > 0 THEN 'PERMIT_ABUSE ' ELSE '' END,
    CASE WHEN karma_penalty_score > 0 THEN 'KARMA_PENALTY ' ELSE '' END
  ) as refty_tags,
  
  -- ================================================================
  -- TROUBLESHOOTING: ДЕТАЛЬНОЕ ОБЪЯСНЕНИЕ РЕШЕНИЯ
  -- Полное описание всех критериев и причин классификации
  -- ================================================================
  CONCAT(
    '🎯 REFTY VERIFY SCORE: ', CAST(LEAST(100, GREATEST(0,
      sold_score + overprice_score + stale_score + size_mismatch_score + 
      price_manipulation_score + permit_abuse_score + 
      karma_penalty_score
    )) AS STRING), '/100 | ',
    
    'CLASSIFICATION: ',
    CASE
      WHEN LEAST(100, GREATEST(0,
        sold_score + overprice_score + stale_score + size_mismatch_score + 
        price_manipulation_score + permit_abuse_score + 
        karma_penalty_score
      )) >= 50 THEN '🚨 FAKE'
      WHEN LEAST(100, GREATEST(0,
        sold_score + overprice_score + stale_score + size_mismatch_score + 
        price_manipulation_score + permit_abuse_score + 
        karma_penalty_score
      )) >= 30 THEN '⚠️ LIKELY_FAKE'
      ELSE '✅ REAL_UNIT'
    END,
    
    '\n\n📊 BREAKDOWN BY CRITERIA:\n',
    
    -- 1. SOLD
    CASE 
      WHEN sold_score > 0 THEN 
        CONCAT('🚨 [SOLD +', CAST(sold_score AS STRING), ' pts] Property was sold in DLD within last 3 months (permit: ', 
               CAST(permit_number AS STRING), ') but still actively advertised. MAJOR RED FLAG!\n')
      ELSE '✓ [SOLD 0 pts] Not recently sold or not found in DLD sales records.\n'
    END,
    
    -- 2. OVERPRICE
    CASE 
      WHEN overprice_score > 0 THEN 
        CONCAT('💰 [OVERPRICE +', CAST(overprice_score AS STRING), ' pts] Price is ', 
               CAST(ROUND(price_vs_market * 100, 1) AS STRING), 
               '% BELOW market (price_vs_market: ', CAST(price_vs_market AS STRING),
               '). Suspiciously cheap - possible bait pricing.\n')
      WHEN overprice_score < 0 THEN 
        CONCAT('💸 [OVERPRICE ', CAST(overprice_score AS STRING), ' pts] Price is ', 
               CAST(ROUND(ABS(price_vs_market) * 100, 1) AS STRING), 
               '% ABOVE market (price_vs_market: ', CAST(price_vs_market AS STRING),
               '). Premium pricing.\n')
      ELSE '✓ [OVERPRICE 0 pts] Price within normal market range (±10%).\n'
    END,
    
    -- 3. STALE
    CASE 
      WHEN stale_score > 0 THEN 
        CONCAT('⏰ [STALE +', CAST(stale_score AS STRING), ' pts] Listing exposure: ', 
               CAST(all_time_exposure_days AS STRING), ' days vs median ', 
               CAST(ROUND(median_days) AS STRING), ' days for ', completion_status,
               '. Exceeds median by ', CAST(ROUND((all_time_exposure_days - median_days) / median_days * 100, 1) AS STRING),
               '% - stale listing.\n')
      ELSE 
        CONCAT('✓ [STALE 0 pts] Fresh listing. Exposure: ', 
               COALESCE(CAST(all_time_exposure_days AS STRING), 'N/A'), ' days.\n')
    END,
    
    -- 4. SIZE_MISMATCH
    CASE 
      WHEN size_mismatch_score > 0 THEN 
        CONCAT('📐 [SIZE_MISMATCH +', CAST(size_mismatch_score AS STRING), ' pts] Area discrepancy detected! ',
               'Listing area: ', CAST(area AS STRING), ' m² vs DLD ',
               CASE 
                 WHEN category_name IN ('Villa', 'Townhouse') AND built_up_area_dld IS NOT NULL 
                   THEN CONCAT('BUA: ', CAST(built_up_area_dld AS STRING), ' m²')
                 ELSE CONCAT('area: ', CAST(tp_propertySize AS STRING), ' m²')
               END,
               ' (', category_name, '). Deviation: ',
               CASE 
                 WHEN category_name IN ('Villa', 'Townhouse') AND built_up_area_dld IS NOT NULL AND built_up_area_dld > 0
                   THEN CAST(ROUND(ABS(area - built_up_area_dld) / built_up_area_dld * 100, 1) AS STRING)
                 WHEN tp_propertySize > 0
                   THEN CAST(ROUND(ABS(area - tp_propertySize) / tp_propertySize * 100, 1) AS STRING)
                 ELSE 'N/A'
               END, '%.\n')
      ELSE 
        CONCAT('✓ [SIZE_MISMATCH 0 pts] Area matches DLD records. Listing: ', 
               CAST(area AS STRING), ' m².\n')
    END,
    
    -- 5. PRICE_MANIPULATION
    CASE 
      WHEN price_manipulation_score > 0 THEN 
        CONCAT('🎯 [PRICE_MANIPULATION +', CAST(price_manipulation_score AS STRING), ' pts] ',
               CASE 
                 WHEN price < project_value 
                   THEN CONCAT('Price (', CAST(ROUND(price, 0) AS STRING), ' AED) is LOWER than project_value (', 
                              CAST(ROUND(project_value, 0) AS STRING), ' AED) by ',
                              CAST(ROUND((project_value - price) / project_value * 100, 1) AS STRING),
                              '% AND listing is fresh (<30 days). Likely gaming search rankings!')
                 ELSE CONCAT('Price (', CAST(ROUND(price, 0) AS STRING), ' AED) is HIGHER than project_value (', 
                            CAST(ROUND(project_value, 0) AS STRING), ' AED) by ',
                            CAST(ROUND((price - project_value) / project_value * 100, 1) AS STRING),
                            '%. Contract not updated or fake listing.')
               END, '\n')
      ELSE '✓ [PRICE_MANIPULATION 0 pts] Price aligned with project value.\n'
    END,
    
    -- 6. PERMIT_ABUSE
    CASE 
      WHEN permit_abuse_score > 0 THEN 
        CONCAT('🔥 [PERMIT_ABUSE +', CAST(permit_abuse_score AS STRING), ' pts] ',
               'Permit #', CAST(permit_number AS STRING), ' has multiple listings ',
               CASE 
                 WHEN unique_agents_for_permit = 1 AND unique_sources_for_permit_agent = 1 
                   THEN 'by SAME agent on SAME platform with DIFFERENT areas - SEVERE abuse!'
                 ELSE 'with varying areas across agents/platforms.'
               END, 
               ' Area variation: ', CAST(ROUND(COALESCE(area_variation_pct_for_permit_agent_source, 0) * 100, 1) AS STRING), '%.\n')
      ELSE '✓ [PERMIT_ABUSE 0 pts] Permit usage is normal.\n'
    END,
    
    -- 7. KARMA_PENALTY
    CASE 
      WHEN karma_penalty_score > 0 THEN 
        CONCAT('⭐ [KARMA_PENALTY +', CAST(karma_penalty_score AS STRING), ' pts] ',
               'Historical reputation penalty applied.\n',
               '  • Agency: ', COALESCE(tp_authorityNameEn, 'N/A'), 
               ' (Trust: ', CAST(ROUND(agency_trust_score, 1) AS STRING), '%, ',
               'Karma: ', CAST(agency_karma_coefficient AS STRING), ', ',
               'Fake penalty: ', CAST(agency_fake_penalty AS STRING), ')\n',
               '  • Broker: ', COALESCE(contactName, 'N/A'),
               ' (Trust: ', CAST(ROUND(broker_trust_score, 1) AS STRING), '%, ',
               'Karma: ', CAST(broker_karma_coefficient AS STRING), ', ',
               'Fake penalty: ', CAST(broker_fake_penalty AS STRING), ')\n')
      ELSE 
        CONCAT('✓ [KARMA_PENALTY 0 pts] Good reputation. Agency: ', 
               COALESCE(tp_authorityNameEn, 'N/A'), 
               ' (Trust: ', CAST(ROUND(agency_trust_score, 1) AS STRING), '%). ',
               'Broker: ', COALESCE(contactName, 'N/A'),
               ' (Trust: ', CAST(ROUND(broker_trust_score, 1) AS STRING), '%).\n')
    END,
    
    '\n📌 SUMMARY:\n',
    'Total Active Criteria: ', 
    CAST((
      CASE WHEN sold_score > 0 THEN 1 ELSE 0 END +
      CASE WHEN overprice_score > 0 THEN 1 ELSE 0 END +
      CASE WHEN stale_score > 0 THEN 1 ELSE 0 END +
      CASE WHEN size_mismatch_score > 0 THEN 1 ELSE 0 END +
      CASE WHEN price_manipulation_score > 0 THEN 1 ELSE 0 END +
      CASE WHEN permit_abuse_score > 0 THEN 1 ELSE 0 END +
      CASE WHEN karma_penalty_score > 0 THEN 1 ELSE 0 END
    ) AS STRING), '/7\n',
    
    'Property Details: ', COALESCE(category_name, 'N/A'), ' | ',
    COALESCE(project_name_en, 'N/A'), ' | ',
    COALESCE(location_hierarchy, 'N/A'), '\n',
    
    'Price: ', CAST(ROUND(price, 0) AS STRING), ' AED | ',
    'Area: ', CAST(area AS STRING), ' m² | ',
    'Completion: ', COALESCE(completion_status, 'N/A'), '\n',
    
    '\n💡 RECOMMENDATION: ',
    CASE
      WHEN LEAST(100, GREATEST(0,
        sold_score + overprice_score + stale_score + size_mismatch_score + 
        price_manipulation_score + permit_abuse_score + 
        karma_penalty_score
      )) >= 50 THEN 'DO NOT TRUST - High probability of fake listing. Verify all details directly with developer/owner.'
      WHEN LEAST(100, GREATEST(0,
        sold_score + overprice_score + stale_score + size_mismatch_score + 
        price_manipulation_score + permit_abuse_score + 
        karma_penalty_score
      )) >= 30 THEN 'PROCEED WITH CAUTION - Verify information independently before making decisions.'
      ELSE 'Listing appears legitimate - Standard due diligence recommended.'
    END
    
  ) as refty_fake_status_troubleshooting

FROM scoring;

-- ====================================================================
-- ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
-- ====================================================================

-- 1️⃣ Получить все FAKE объявления с высоким баллом:
-- SELECT * FROM `refty-409711.refty_looker_dashboard.refty_verify_score_final_v6`
-- WHERE refty_classification = 'FAKE'
-- ORDER BY refty_verify_score DESC
-- LIMIT 100;

-- 2️⃣ Статистика по классификации:
-- SELECT 
--   refty_classification,
--   COUNT(*) as count,
--   ROUND(AVG(refty_verify_score), 2) as avg_score,
--   ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
-- FROM `refty-409711.refty_looker_dashboard.refty_verify_score_final_v6`
-- GROUP BY refty_classification
-- ORDER BY count DESC;

-- 3️⃣ ТОП агентств по количеству фейков:
-- SELECT 
--   tp_authorityNameEn,
--   COUNT(*) as total_listings,
--   COUNT(CASE WHEN refty_classification = 'FAKE' THEN 1 END) as fake_count,
--   ROUND(COUNT(CASE WHEN refty_classification = 'FAKE' THEN 1 END) * 100.0 / COUNT(*), 2) as fake_percentage,
--   ROUND(AVG(refty_verify_score), 2) as avg_score
-- FROM `refty-409711.refty_looker_dashboard.refty_verify_score_final_v6`
-- WHERE tp_authorityNameEn IS NOT NULL
-- GROUP BY tp_authorityNameEn
-- HAVING COUNT(*) >= 20
-- ORDER BY fake_percentage DESC
-- LIMIT 20;

-- 4️⃣ Поиск объявлений с множественными нарушениями:
-- SELECT *
-- FROM `refty-409711.refty_looker_dashboard.refty_verify_score_final_v6`
-- WHERE (sold_score + stale_score + size_mismatch_score + permit_abuse_score) >= 100
-- ORDER BY refty_verify_score DESC;

-- 5️⃣ Анализ влияния KARMA_PENALTY:
-- SELECT 
--   CASE 
--     WHEN karma_penalty_score = 0 THEN 'No Karma Penalty'
--     WHEN karma_penalty_score <= 5 THEN '1-5 points'
--     WHEN karma_penalty_score <= 10 THEN '6-10 points'
--     WHEN karma_penalty_score <= 15 THEN '11-15 points'
--     ELSE '16-20 points'
--   END as karma_penalty_range,
--   COUNT(*) as listings_count,
--   ROUND(AVG(refty_verify_score), 2) as avg_total_score,
--   COUNT(CASE WHEN refty_classification = 'FAKE' THEN 1 END) as fake_count
-- FROM `refty-409711.refty_looker_dashboard.refty_verify_score_final_v6`
-- GROUP BY karma_penalty_range
-- ORDER BY karma_penalty_score DESC;


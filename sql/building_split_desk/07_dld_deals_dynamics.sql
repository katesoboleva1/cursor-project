-- Monthly DLD deal counts (sale + rent), last 12 months. Params: {{building}}
-- Sale:
SELECT
  formatDateTime(toStartOfMonth(instance_date), '%Y-%m') AS m,
  count() AS n
FROM refty.all_transactions_combined
WHERE (
  refty_building = '{{building}}'
  OR building_name_en ILIKE '%{{building}}%'
  OR project_name_en ILIKE '%{{building}}%'
)
  AND instance_date >= today() - INTERVAL 12 MONTH
  AND price > 0
  AND lower(trim(coalesce(procedure_name_en, ''))) IN ('sale', 'sell')
GROUP BY m
ORDER BY m ASC
;

-- Rent:
SELECT
  formatDateTime(toStartOfMonth(contract_start_date), '%Y-%m') AS m,
  count() AS n
FROM refty.all_rent_combined
WHERE (
  building = '{{building}}'
  OR project_name_en ILIKE '%{{building}}%'
)
  AND contract_start_date >= today() - INTERVAL 12 MONTH
  AND annual_amount > 0
GROUP BY m
ORDER BY m ASC

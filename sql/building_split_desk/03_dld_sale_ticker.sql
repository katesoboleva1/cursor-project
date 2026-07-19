-- DLD sale ticker (~900 days). Params: {{building}}
-- NOTE: production match uses sqlDldSaleMatch() — replace WHERE with that for Tower A/B etc.
SELECT
  toString(instance_date) AS d,
  price,
  rooms,
  unit_number,
  tp_FloorNumber AS floor,
  round(coalesce(nullIf(price_aed_sqft, 0), meter_sale_price), 0) AS pps,
  procedure_name_en AS procedure
FROM refty.all_transactions_combined
WHERE (
  refty_building = '{{building}}'
  OR building_name_en ILIKE '%{{building}}%'
  OR project_name_en ILIKE '%{{building}}%'
)
  AND instance_date >= today() - 900
  AND price > 0
  AND lower(trim(coalesce(procedure_name_en, ''))) IN ('sale', 'sell')
ORDER BY instance_date DESC
LIMIT 200

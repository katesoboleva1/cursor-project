-- DLD / Ejari rent ticker (~900 days). Params: {{building}}
-- NOTE: production match uses sqlDldRentMatch().
SELECT
  toString(contract_start_date) AS d,
  annual_amount AS price,
  rooms,
  unit_number,
  tp_FloorNumber AS floor,
  round(price_aed_sqft, 0) AS pps
FROM refty.all_rent_combined
WHERE (
  building = '{{building}}'
  OR project_name_en ILIKE '%{{building}}%'
)
  AND contract_start_date >= today() - 900
  AND annual_amount > 0
ORDER BY contract_start_date DESC
LIMIT 200

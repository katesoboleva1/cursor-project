-- Monthly median AED/sqft (sale + rent) for one building, last 12 months.
-- Params: {{building}}
SELECT
  formatDateTime(toStartOfMonth(parsed_at), '%Y-%m') AS m,
  lower(trim(purpose)) AS purpose,
  round(median(coalesce(nullIf(price_per_sqft, 0), price / nullIf(area_sqft, 0))), 0) AS med_pps,
  count() AS n
FROM refty.unified_properties_table
WHERE building = '{{building}}'
  AND price > 0
  AND (area_sqft > 100 OR price_per_sqft > 0)
  AND lower(trim(purpose)) IN ('for-sale', 'for-rent')
  AND parsed_at >= now() - INTERVAL 12 MONTH
GROUP BY m, purpose
HAVING n >= 3
ORDER BY m ASC, purpose ASC

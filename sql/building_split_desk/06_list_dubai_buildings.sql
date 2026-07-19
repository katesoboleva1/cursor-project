-- Rank Dubai buildings by active listings (for batch Split Desk).
-- Params: {{min_listings}} (default 20)
SELECT
  building,
  count() AS n,
  countIf(lower(trim(purpose)) = 'for-sale') AS sale_n,
  countIf(lower(trim(purpose)) = 'for-rent') AS rent_n,
  any(district) AS district
FROM refty.unified_properties_table
WHERE building != ''
  AND isActive = 1
GROUP BY building
HAVING n >= {{min_listings}}
ORDER BY n DESC

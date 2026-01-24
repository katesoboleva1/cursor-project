
SELECT DISTINCT 
  building,
  developer_name_en,
  project_name_en,
  project_id,
  district,
  COUNT(*) as properties_count,
  MIN(price) as min_price,
  MAX(price) as max_price,
  AVG(price) as avg_price
FROM `refty-409711.refty_looker_dashboard.unified_properties_table_full_light`
WHERE 1=1
  AND city = 'Dubai'
  AND isActive = true
  AND district = 'Dubai Marina'
  AND developer_name_en IS NULL
  AND project_id IS NOT NULL
  AND project_name_en IS NOT NULL
GROUP BY 
  building,
  developer_name_en,
  project_name_en,
  project_id,
  district
ORDER BY properties_count DESC;

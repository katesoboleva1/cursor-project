-- Building meta from listings + DLD fund (flats/floors). Params: {{building}}
SELECT
  any(coalesce(nullIf(trim(developer_name_en), ''), nullIf(trim(tp_DeveloperNameEn), ''))) AS developer,
  any(toString(handover_date)) AS handover,
  any(handover_segment) AS handover_segment,
  any(building_floors) AS floors
FROM refty.unified_properties_table
WHERE building = '{{building}}'
;

SELECT
  any(flats) AS flats,
  any(floors) AS floors,
  any(toString(creation_date)) AS creation_date,
  any(project_name_en) AS project_name
FROM refty.all_buildings
WHERE project_name_en ILIKE '%{{building}}%'
   OR project_name_en ILIKE '%RESIDENCES AT {{building}}%'
LIMIT 1

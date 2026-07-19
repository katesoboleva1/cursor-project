-- Active listings for one building (sale or rent), latest row per permit.
-- Params: {{building}}, {{purpose}}  (for-sale | for-rent)
WITH latest AS (
  SELECT
    permit_number,
    url,
    rooms,
    price,
    count_contract_a AS ca,
    all_time_exposure_days AS exp,
    round(price_vs_market * 100, 1) AS pvm_pct,
    round(price_vs_similar * 100, 1) AS pvs_pct,
    round(coalesce(nullIf(price_per_sqft, 0), price / nullIf(area_sqft, 0)), 0) AS pps,
    round(area_sqft, 0) AS area_sqft,
    baths,
    furnishing_status,
    toString(tp_ParkingNumber) AS parking,
    round(balcony_area, 1) AS balcony_area,
    renovated,
    tenant_free,
    refty_verify_score AS score,
    refty_fake_status_troubleshooting AS fake_txt,
    coalesce(contactName, tp_CardHolderNameEn) AS broker,
    tp_authorityNameEn AS agency,
    coalesce(nullIf(trim(tp_PropertyNumber), ''), nullIf(trim(unit_number), ''), '') AS unit_number,
    coalesce(nullIf(trim(refty_district), ''), district) AS district,
    tp_FloorNumber AS floor,
    building_floors,
    photos,
    title,
    description,
    cleaned_description,
    permit_price_history,
    original_price,
    toString(original_transaction_date) AS original_date,
    view_category
  FROM refty.unified_properties_table
  WHERE isActive = 1
    AND lower(trim(purpose)) = '{{purpose}}'
    AND building = '{{building}}'
  QUALIFY row_number() OVER (PARTITION BY permit_number ORDER BY parsed_at DESC) = 1
)
SELECT * FROM latest
ORDER BY floor DESC NULLS LAST, price ASC

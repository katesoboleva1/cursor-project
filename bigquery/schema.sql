-- BigQuery Schema для Real Estate Dashboard

-- Таблица с недвижимостью
CREATE TABLE IF NOT EXISTS `dubai_real_estate.properties` (
  id STRING NOT NULL,
  title STRING,
  property_type STRING,
  developer STRING,
  location STRING,
  area STRING,
  bedrooms INT64,
  bathrooms INT64,
  size FLOAT64,
  price FLOAT64,
  currency STRING DEFAULT 'AED',
  payment_plan STRING,
  completion_date DATE,
  status STRING,
  is_new BOOL DEFAULT FALSE,
  amenities ARRAY<STRING>,
  description STRING,
  images ARRAY<STRING>,
  contact_info JSON,
  coordinates GEOGRAPHY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- Таблица с взаимодействиями пользователей
CREATE TABLE IF NOT EXISTS `dubai_real_estate.user_interactions` (
  interaction_id STRING NOT NULL,
  userId STRING NOT NULL,
  interactionType STRING NOT NULL,
  data JSON,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  processed BOOL DEFAULT FALSE
);

-- Таблица с предпочтениями пользователей
CREATE TABLE IF NOT EXISTS `dubai_real_estate.user_preferences` (
  userId STRING NOT NULL,
  priceRange FLOAT64,
  preferredBedrooms INT64,
  preferredLocations ARRAY<STRING>,
  preferredDevelopers ARRAY<STRING>,
  preferredPropertyTypes ARRAY<STRING>,
  searchCount INT64 DEFAULT 0,
  lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- Таблица с просмотрами объектов
CREATE TABLE IF NOT EXISTS `dubai_real_estate.property_views` (
  view_id STRING NOT NULL,
  userId STRING NOT NULL,
  propertyId STRING NOT NULL,
  viewedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  viewDuration INT64,
  source STRING
);

-- Таблица с рекомендациями
CREATE TABLE IF NOT EXISTS `dubai_real_estate.user_recommendations` (
  recommendation_id STRING NOT NULL,
  userId STRING NOT NULL,
  propertyId STRING NOT NULL,
  recommendation_score FLOAT64,
  reason STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  shown BOOL DEFAULT FALSE,
  clicked BOOL DEFAULT FALSE
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_properties_location ON `dubai_real_estate.properties`(location);
CREATE INDEX IF NOT EXISTS idx_properties_price ON `dubai_real_estate.properties`(price);
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON `dubai_real_estate.properties`(bedrooms);
CREATE INDEX IF NOT EXISTS idx_user_interactions_userId ON `dubai_real_estate.user_interactions`(userId);
CREATE INDEX IF NOT EXISTS idx_property_views_userId ON `dubai_real_estate.property_views`(userId);

-- Представление для статистики
CREATE OR REPLACE VIEW `dubai_real_estate.property_stats` AS
SELECT
  location,
  COUNT(*) as total_properties,
  AVG(price) as avg_price,
  MIN(price) as min_price,
  MAX(price) as max_price,
  AVG(size) as avg_size,
  COUNT(DISTINCT developer) as total_developers
FROM `dubai_real_estate.properties`
WHERE status = 'available'
GROUP BY location;

-- Представление для популярных объектов
CREATE OR REPLACE VIEW `dubai_real_estate.popular_properties` AS
SELECT
  p.*,
  COUNT(pv.view_id) as view_count,
  COUNT(DISTINCT pv.userId) as unique_viewers
FROM `dubai_real_estate.properties` p
LEFT JOIN `dubai_real_estate.property_views` pv ON p.id = pv.propertyId
WHERE p.status = 'available'
  AND pv.viewedAt >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY p.id, p.title, p.property_type, p.developer, p.location, p.area,
         p.bedrooms, p.bathrooms, p.size, p.price, p.currency, p.payment_plan,
         p.completion_date, p.status, p.is_new, p.amenities, p.description,
         p.images, p.contact_info, p.coordinates, p.created_at, p.updated_at
HAVING view_count > 5
ORDER BY view_count DESC;

-- Запрос для персонализированных рекомендаций
CREATE OR REPLACE VIEW `dubai_real_estate.personalized_recommendations` AS
WITH user_behavior AS (
  SELECT
    userId,
    AVG(CAST(JSON_EXTRACT_SCALAR(data, '$.filters.priceMax') AS FLOAT64)) as avg_price_search,
    APPROX_TOP_COUNT(JSON_EXTRACT_SCALAR(data, '$.filters.location'), 3) as top_locations,
    APPROX_TOP_COUNT(JSON_EXTRACT_SCALAR(data, '$.filters.bedrooms'), 3) as top_bedrooms
  FROM `dubai_real_estate.user_interactions`
  WHERE interactionType = 'search'
    AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  GROUP BY userId
)
SELECT
  ub.userId,
  p.*,
  -- Scoring based on user behavior
  (
    CASE 
      WHEN p.price <= ub.avg_price_search * 1.2 THEN 20 
      WHEN p.price <= ub.avg_price_search * 1.5 THEN 10
      ELSE 0 
    END +
    CASE 
      WHEN p.is_new THEN 10 
      ELSE 0 
    END +
    CASE 
      WHEN p.created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY) THEN 15
      ELSE 0
    END
  ) as recommendation_score
FROM user_behavior ub
CROSS JOIN `dubai_real_estate.properties` p
WHERE p.status = 'available'
ORDER BY ub.userId, recommendation_score DESC;


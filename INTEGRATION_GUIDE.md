# 🔌 Integration Guide - Подключение ваших данных

## Интеграция с вашими CSV файлами

Я вижу, что у вас есть несколько CSV файлов с данными:
- `dubai_real_estate_channels.csv` (2141 строка)
- `youtube_semantic_core_*.csv` (различные языки)

Вот как интегрировать их с dashboard:

## Вариант 1: Прямой импорт в BigQuery

### Шаг 1: Подготовка данных

```bash
# Проверьте структуру вашего CSV
head -5 ~/dubai_real_estate_channels.csv

# Если нужно преобразование, используйте наш скрипт
node scripts/sync-data.js ~/dubai_real_estate_channels.csv
```

### Шаг 2: Настройка маппинга

Отредактируйте `scripts/sync-data.js` и настройте `FIELD_MAPPING`:

```javascript
const FIELD_MAPPING = {
  // Ваше поле -> Наше поле
  'Channel Name': 'developer',
  'Channel Title': 'title',
  'Channel Description': 'description',
  
  // Добавьте свои поля
  'Price': 'price',
  'Location': 'location',
  'Bedrooms': 'bedrooms',
  // и т.д.
};
```

### Шаг 3: Запуск импорта

```bash
# Установите зависимость для CSV парсинга
npm install csv-parser

# Запустите синхронизацию
node scripts/sync-data.js ~/dubai_real_estate_channels.csv
```

## Вариант 2: Использование BigQuery Load Job

Если ваш CSV уже в правильном формате:

```bash
# Прямая загрузка
bq load \
  --source_format=CSV \
  --skip_leading_rows=1 \
  --autodetect \
  ${GOOGLE_CLOUD_PROJECT}:dubai_real_estate.properties \
  ~/dubai_real_estate_channels.csv
```

## Вариант 3: Создание ETL pipeline в n8n

### Создайте workflow для автоматической синхронизации:

1. **Trigger**: Schedule (каждый час)
2. **Read CSV**: HTTP Request или Google Drive
3. **Transform**: Function node для маппинга
4. **Load**: BigQuery node

Пример n8n workflow:

```json
{
  "nodes": [
    {
      "name": "Schedule",
      "type": "n8n-nodes-base.cron",
      "parameters": {
        "triggerTimes": {
          "item": [{"mode": "everyHour"}]
        }
      }
    },
    {
      "name": "Read CSV",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://your-storage/data.csv",
        "responseFormat": "text"
      }
    },
    {
      "name": "Parse CSV",
      "type": "n8n-nodes-base.spreadsheetFile",
      "parameters": {
        "operation": "read"
      }
    },
    {
      "name": "Transform",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "return items.map(item => ({\n  json: {\n    id: 'prop_' + item.json.id,\n    title: item.json['Channel Title'],\n    developer: item.json['Channel Name'],\n    // ... маппинг полей\n  }\n}));"
      }
    },
    {
      "name": "Load to BigQuery",
      "type": "n8n-nodes-base.googleBigQuery",
      "parameters": {
        "operation": "insert",
        "projectId": "={{ $env.GOOGLE_CLOUD_PROJECT }}",
        "datasetId": "dubai_real_estate",
        "tableId": "properties"
      }
    }
  ]
}
```

## Интеграция с существующими базами данных

### PostgreSQL

```javascript
// server/connectors/postgres.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

async function syncFromPostgres() {
  const query = `
    SELECT 
      id,
      title,
      price,
      location,
      bedrooms
    FROM properties
    WHERE updated_at > NOW() - INTERVAL '1 hour'
  `;

  const result = await pool.query(query);
  
  // Загрузить в BigQuery
  await loadToBigQuery(result.rows);
}
```

### MySQL

```javascript
// server/connectors/mysql.js
const mysql = require('mysql2/promise');

const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
});

const [rows] = await connection.execute(
  'SELECT * FROM properties WHERE updated_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)'
);
```

### MongoDB

```javascript
// server/connectors/mongodb.js
const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URL);
await client.connect();

const db = client.db('real_estate');
const properties = await db.collection('properties')
  .find({ 
    updated_at: { 
      $gte: new Date(Date.now() - 3600000) 
    } 
  })
  .toArray();
```

## Интеграция с API

### REST API

```javascript
// server/connectors/api.js
const axios = require('axios');

async function fetchFromAPI() {
  const response = await axios.get('https://api.example.com/properties', {
    headers: {
      'Authorization': `Bearer ${process.env.API_TOKEN}`
    },
    params: {
      limit: 1000,
      updated_since: new Date(Date.now() - 3600000).toISOString()
    }
  });

  return response.data.properties;
}
```

### GraphQL API

```javascript
// server/connectors/graphql.js
const { GraphQLClient } = require('graphql-request');

const client = new GraphQLClient('https://api.example.com/graphql', {
  headers: {
    authorization: `Bearer ${process.env.GRAPHQL_TOKEN}`,
  },
});

const query = `
  query GetProperties($updatedSince: DateTime!) {
    properties(where: { updatedAt_gte: $updatedSince }) {
      id
      title
      price
      location
    }
  }
`;

const data = await client.request(query, {
  updatedSince: new Date(Date.now() - 3600000)
});
```

## Структура данных для BigQuery

Минимальные обязательные поля:

```json
{
  "id": "unique_identifier",
  "title": "Property title",
  "price": 1500000,
  "location": "Downtown Dubai",
  "status": "available"
}
```

Рекомендуемые дополнительные поля:

```json
{
  "property_type": "apartment",
  "developer": "Emaar",
  "bedrooms": 2,
  "bathrooms": 2,
  "size": 1200,
  "completion_date": "2024-12-31",
  "is_new": true,
  "description": "Beautiful apartment...",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

## Автоматическая синхронизация

### Вариант 1: Cron job

```bash
# Добавьте в crontab
# Каждый час
0 * * * * cd /path/to/dashboard && node scripts/sync-data.js ~/data.csv >> logs/sync.log 2>&1
```

### Вариант 2: PM2

```bash
# Установите PM2
npm install -g pm2

# Создайте ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'refty-sync',
    script: 'scripts/sync-data.js',
    args: '~/dubai_real_estate_channels.csv',
    cron_restart: '0 * * * *',  // Каждый час
    autorestart: false
  }]
};
EOF

# Запустите
pm2 start ecosystem.config.js
```

### Вариант 3: n8n Schedule

Настройте в n8n workflow с триггером "Schedule" (см. выше).

## Валидация данных

Перед загрузкой проверьте данные:

```javascript
function validateProperty(property) {
  const errors = [];

  if (!property.id) errors.push('Missing id');
  if (!property.price || property.price <= 0) errors.push('Invalid price');
  if (!property.location) errors.push('Missing location');

  if (errors.length > 0) {
    console.warn(`Validation failed for property ${property.id}:`, errors);
    return false;
  }

  return true;
}
```

## Мониторинг синхронизации

Добавьте логирование:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/sync-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/sync.log' })
  ]
});

logger.info('Sync started', { timestamp: new Date(), file: csvFilePath });
logger.info('Sync completed', { records: processed, skipped: skipped });
```

## Troubleshooting

### Ошибка: "Schema mismatch"

```bash
# Обновите схему таблицы
bq update ${GOOGLE_CLOUD_PROJECT}:dubai_real_estate.properties \
  bigquery/schema.json
```

### Ошибка: "Rate limit exceeded"

Добавьте задержки между батчами:

```javascript
for (let i = 0; i < records.length; i += BATCH_SIZE) {
  await uploadBatch(records.slice(i, i + BATCH_SIZE));
  await new Promise(resolve => setTimeout(resolve, 1000)); // 1 сек задержка
}
```

### Ошибка: "Invalid data format"

Проверьте формат дат:

```javascript
// Преобразуйте даты в ISO format
if (record.date) {
  record.date = new Date(record.date).toISOString();
}
```

## Следующие шаги

1. Запустите первую синхронизацию
2. Проверьте данные в BigQuery Console
3. Настройте автоматическую синхронизацию
4. Добавьте мониторинг
5. Оптимизируйте производительность

## Помощь

Если возникли проблемы с интеграцией:
- Проверьте логи: `tail -f logs/sync.log`
- Запустите в debug режиме: `DEBUG=* node scripts/sync-data.js`
- Создайте issue на GitHub с примером данных


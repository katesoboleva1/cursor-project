# 🏢 Real Estate Dashboard - Refty

Real-time dashboard для поиска недвижимости в Дубае с интеграцией BigQuery, MCP Refty и n8n для персонализации.

## 🚀 Особенности

- **Real-time поиск** через WebSocket соединение
- **Natural Language запросы** с помощью MCP Refty (Model Context Protocol)
- **BigQuery интеграция** для быстрого доступа к данным
- **n8n Workflow** для автоматического обучения и персонализации
- **Персональные рекомендации** на основе истории поиска
- **Красивый UI** с glassmorphism эффектами

## 📋 Требования

- Node.js 18+
- Google Cloud Project с BigQuery
- n8n установленный локально или в облаке
- OpenAI API ключ (для MCP Refty)

## 🛠 Установка

### 1. Клонируйте репозиторий и установите зависимости

```bash
cd real-estate-dashboard
npm install
```

### 2. Настройте окружение

Скопируйте `.env.example` в `.env` и заполните:

```bash
cp .env.example .env
```

Заполните переменные окружения:

```env
# BigQuery
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
BIGQUERY_DATASET=dubai_real_estate

# MCP Refty
MCP_REFTY_API_KEY=your-api-key
MCP_REFTY_ENDPOINT=http://localhost:3002

# n8n
N8N_WEBHOOK_URL=http://localhost:5678/webhook/user-interaction

# OpenAI
OPENAI_API_KEY=your-openai-key
```

### 3. Настройте BigQuery

Создайте dataset и таблицы:

```bash
# Загрузите схему в BigQuery
bq mk -d dubai_real_estate
bq query --use_legacy_sql=false < bigquery/schema.sql
```

### 4. Импортируйте n8n Workflow

1. Откройте n8n: `http://localhost:5678`
2. Перейдите в Workflows → Import
3. Загрузите файл `n8n/workflows/personalization-workflow.json`
4. Активируйте workflow

## 🎯 Запуск

### Вариант 1: Разработка (все сервисы отдельно)

```bash
# Терминал 1: Backend Server
node server/index.js

# Терминал 2: MCP Refty Server
node server/mcp-refty-server.js

# Терминал 3: Next.js Frontend
npm run dev

# Терминал 4: n8n (если локально)
n8n start
```

### Вариант 2: Production

```bash
# Соберите frontend
npm run build

# Запустите все сервисы
npm start
```

## 📊 Архитектура

```
┌─────────────┐
│   Browser   │
│  (Next.js)  │
└──────┬──────┘
       │
       ├── HTTP API ────────┐
       │                    │
       └── WebSocket ───────┼─────────────┐
                            │             │
                     ┌──────▼──────┐  ┌───▼────────┐
                     │   Express   │  │  MCP Refty │
                     │   Server    │  │   Server   │
                     └──────┬──────┘  └─────┬──────┘
                            │               │
                            │    ┌──────────▼─────────┐
                            │    │     OpenAI GPT     │
                            │    │  (Query Analysis)  │
                            │    └────────────────────┘
                            │
                     ┌──────▼──────────┐
                     │    BigQuery     │
                     │   (Data Store)  │
                     └──────┬──────────┘
                            │
                     ┌──────▼──────────┐
                     │      n8n        │
                     │  (Automation)   │
                     └─────────────────┘
```

## 🔧 API Endpoints

### REST API

- `GET /api/properties` - Получить список объектов
- `POST /api/query` - Natural language поиск
- `GET /api/stats` - Статистика

### WebSocket Events

**Client → Server:**
- `init_session` - Инициализация сессии
- `ask_question` - Задать вопрос
- `update_filters` - Обновить фильтры
- `view_property` - Отметить просмотр
- `get_recommendations` - Получить рекомендации

**Server → Client:**
- `session_initialized` - Сессия создана
- `search_results` - Результаты поиска
- `recommendations` - Персональные рекомендации
- `property_tracked` - Просмотр зафиксирован
- `error` - Ошибка

## 💡 Примеры использования

### Natural Language запросы

```javascript
// Русский
"Квартира в Downtown до 2 миллионов"
"Студия в Marina с видом на море"
"Апартаменты от Emaar с 2 спальнями"

// English
"Apartment in Business Bay under 1.5 million"
"Villa in Palm Jumeirah with pool"
"Penthouse by Damac"
```

### Программный поиск

```javascript
const socket = io('http://localhost:3001');

socket.emit('ask_question', {
  query: "Квартира в Downtown до 2 млн",
  userId: 'user_123'
});

socket.on('search_results', (data) => {
  console.log(`Found ${data.results.length} properties`);
  console.log('Filters applied:', data.filters);
});
```

## 🎨 Компоненты

- **SearchBar** - Поисковая строка с примерами запросов
- **PropertyGrid** - Сетка с объектами недвижимости
- **Dashboard** - Панель фильтров
- **StatsPanel** - Статистика по рынку
- **ChatInterface** - История запросов

## 🔐 Безопасность

1. Используйте service account для BigQuery с минимальными правами
2. Ограничьте CORS для production
3. Добавьте rate limiting для API
4. Используйте HTTPS в production
5. Не коммитьте `.env` файл

## 📈 Мониторинг

Добавьте мониторинг:

```javascript
// server/monitoring.js
const prometheus = require('prom-client');

const searchCounter = new prometheus.Counter({
  name: 'searches_total',
  help: 'Total number of searches'
});

const queryDuration = new prometheus.Histogram({
  name: 'query_duration_seconds',
  help: 'Query duration in seconds'
});
```

## 🐛 Отладка

```bash
# Логи сервера
DEBUG=* node server/index.js

# Логи MCP Refty
DEBUG=mcp:* node server/mcp-refty-server.js

# Проверка соединения с BigQuery
node -e "const {BigQuery} = require('@google-cloud/bigquery'); const bq = new BigQuery(); bq.getDatasets().then(console.log);"
```

## 📝 Roadmap

- [ ] Добавить поддержку арабского языка
- [ ] Интеграция с WhatsApp для уведомлений
- [ ] Добавить сравнение объектов
- [ ] Калькулятор ипотеки
- [ ] 3D туры по объектам
- [ ] Интеграция с CRM системами
- [ ] Mobile приложение (React Native)

## 🤝 Contributing

Pull requests приветствуются! Для больших изменений сначала откройте issue.

## 📄 Лицензия

MIT

## 👥 Авторы

- Refty Team

## 📞 Поддержка

- Email: support@refty.ai
- Telegram: @refty_support


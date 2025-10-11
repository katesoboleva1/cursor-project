# 🚀 НАЧНИТЕ ЗДЕСЬ - Real Estate Dashboard Refty

## 📋 Что вы получили

Полнофункциональный **real-time dashboard** для поиска недвижимости в Дубае с:

✅ **BigQuery интеграция** - быстрый доступ к большим объемам данных  
✅ **MCP Refty** - AI-ассистент для понимания запросов на естественном языке  
✅ **n8n Workflow** - автоматическое обучение и персонализация  
✅ **Real-time обновления** - через WebSocket  
✅ **Персональные рекомендации** - на основе истории поиска  
✅ **Красивый UI** - современный дизайн с glassmorphism эффектами  

## 🎯 Быстрый старт (5 минут)

### 1. Установите зависимости

```bash
cd /Users/ceorefty/real-estate-dashboard
npm install
```

### 2. Настройте BigQuery

```bash
# Создайте проект в Google Cloud Console
# https://console.cloud.google.com/

# Создайте Service Account и скачайте ключ
# Сохраните как: service-account-key.json

# Настройте окружение
cp .env.example .env
nano .env  # Заполните ваши данные
```

### 3. Создайте таблицы в BigQuery

```bash
npm run setup-bigquery
```

### 4. Импортируйте ваши данные

```bash
# Вариант 1: Импорт вашего CSV
npm run sync-data ~/dubai_real_estate_channels.csv

# Вариант 2: Загрузить тестовые данные
npm run import-csv data/sample_properties.json
```

### 5. Запустите систему

```bash
npm run start-all
```

Откройте: **http://localhost:3000**

## 📊 Архитектура

```
Frontend (Next.js)          ←→  Backend (Express + Socket.io)
      ↓                              ↓
  User Queries                  MCP Refty (AI)
      ↓                              ↓
  WebSocket                     BigQuery Data
      ↓                              ↓
  Real-time Results            n8n Personalization
```

## 🎨 Возможности

### 1. Natural Language поиск

Просто задайте вопрос:
- "Квартира в Downtown до 2 миллионов"
- "Студия в Marina с видом на море"
- "Апартаменты от Emaar с 2 спальнями"

### 2. Продвинутые фильтры

- Цена (от/до)
- Количество спален
- Локация
- Застройщик
- Тип недвижимости

### 3. Персонализация

Система автоматически:
- Запоминает ваши предпочтения
- Показывает релевантные рекомендации
- Адаптируется под ваши запросы

### 4. Real-time обновления

- Мгновенные результаты поиска
- Обновление данных без перезагрузки
- История запросов в реальном времени

## 📁 Структура проекта

```
real-estate-dashboard/
├── pages/                    # Next.js страницы
│   ├── index.js             # Главная страница
│   └── _app.js              # App wrapper
├── components/              # React компоненты
│   ├── SearchBar.js         # Поисковая строка
│   ├── PropertyGrid.js      # Сетка объектов
│   ├── Dashboard.js         # Панель фильтров
│   ├── StatsPanel.js        # Статистика
│   └── ChatInterface.js     # История запросов
├── server/                  # Backend
│   ├── index.js            # Express + Socket.io
│   └── mcp-refty-server.js # MCP Refty AI
├── n8n/workflows/          # n8n автоматизация
│   └── personalization-workflow.json
├── bigquery/               # BigQuery схемы
│   └── schema.sql
├── scripts/                # Утилиты
│   ├── setup-bigquery.sh
│   ├── start-all.sh
│   ├── import-csv-to-bigquery.js
│   └── sync-data.js
├── data/                   # Тестовые данные
│   └── sample_properties.json
└── docs/                   # Документация
    ├── README.md
    ├── QUICKSTART.md
    ├── DEPLOYMENT.md
    └── INTEGRATION_GUIDE.md
```

## 🔧 Конфигурация

### Минимальная конфигурация (.env)

```env
# BigQuery (обязательно)
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
BIGQUERY_DATASET=dubai_real_estate

# Порты
PORT=3000
SOCKET_PORT=3001
MCP_REFTY_PORT=3002
```

### Полная конфигурация

```env
# Добавьте для AI-поиска
OPENAI_API_KEY=sk-...

# Добавьте для n8n интеграции
N8N_WEBHOOK_URL=http://localhost:5678/webhook/user-interaction
N8N_API_KEY=your-n8n-key
```

## 🌐 Интеграция с вашими данными

### Вариант 1: CSV импорт

```bash
node scripts/sync-data.js ~/dubai_real_estate_channels.csv
```

### Вариант 2: Настройте маппинг полей

Отредактируйте `scripts/sync-data.js`:

```javascript
const FIELD_MAPPING = {
  'Channel Name': 'developer',
  'Channel Title': 'title',
  // Добавьте ваши поля
};
```

### Вариант 3: Создайте n8n workflow

См. [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)

## 📝 Примеры использования

### JavaScript API

```javascript
const socket = io('http://localhost:3001');

// Инициализация
socket.emit('init_session', {
  userId: 'user_123',
  preferences: { maxPrice: 2000000 }
});

// Поиск
socket.emit('ask_question', {
  query: 'Квартира в Downtown до 2 млн',
  userId: 'user_123'
});

// Получение результатов
socket.on('search_results', (data) => {
  console.log('Found:', data.results.length);
  console.log('Filters:', data.filters);
});

// Рекомендации
socket.emit('get_recommendations', { userId: 'user_123' });

socket.on('recommendations', (data) => {
  console.log('Recommendations:', data.results);
});
```

### REST API

```bash
# Получить объекты
curl http://localhost:3001/api/properties

# Поиск с фильтрами
curl "http://localhost:3001/api/properties?location=Downtown&priceMax=2000000"

# Natural language query
curl -X POST http://localhost:3001/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Студия в Marina", "userId": "user_123"}'

# Статистика
curl http://localhost:3001/api/stats
```

## 🚀 Deployment

### Docker Compose (проще всего)

```bash
docker-compose up -d
```

### Google Cloud Platform

```bash
gcloud run deploy refty-dashboard --source .
```

### Vercel + Railway

Frontend на Vercel, Backend на Railway.

Подробнее: [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🔍 Troubleshooting

### Проблема: Не подключается к BigQuery

```bash
# Проверьте аутентификацию
gcloud auth application-default login

# Проверьте service account
cat service-account-key.json | jq .project_id
```

### Проблема: MCP Refty не отвечает

```bash
# Проверьте статус
curl http://localhost:3002/health

# Если нет OpenAI ключа - используется fallback парсер
```

### Проблема: Socket connection failed

```bash
# Проверьте backend
curl http://localhost:3001/api/stats

# Проверьте порты
lsof -i :3001
```

## 📚 Документация

- [README.md](./README.md) - Полное описание
- [QUICKSTART.md](./QUICKSTART.md) - Быстрый старт
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Развертывание
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Интеграция данных

## 🎓 Дальнейшее развитие

### Краткосрочные улучшения:
1. Добавить сохранение избранных объектов
2. Email уведомления о новых объектах
3. Сравнение объектов side-by-side
4. Калькулятор ипотеки
5. Карта с объектами

### Долгосрочные улучшения:
1. Mobile приложение (React Native)
2. WhatsApp интеграция
3. 3D туры по объектам
4. VR просмотр
5. Интеграция с CRM

## 🆘 Поддержка

### Возникли проблемы?

1. **Документация**: Проверьте файлы в `/docs`
2. **Логи**: 
   ```bash
   # Backend logs
   tail -f logs/server.log
   
   # Browser console
   Откройте DevTools (F12)
   ```
3. **GitHub Issues**: Создайте issue с описанием проблемы
4. **Telegram**: @refty_support
5. **Email**: support@refty.ai

## 📊 Мониторинг

### Проверка статуса сервисов

```bash
# Backend
curl http://localhost:3001/api/stats

# MCP Refty
curl http://localhost:3002/health

# Frontend
curl http://localhost:3000

# n8n
curl http://localhost:5678
```

### Логи

```bash
# Создайте директорию для логов
mkdir -p logs

# Запустите с логированием
npm run server 2>&1 | tee logs/server.log
```

## 🎉 Готово!

Теперь у вас есть полнофункциональный dashboard для недвижимости!

### Следующие шаги:

1. ✅ Запустите систему: `npm run start-all`
2. ✅ Импортируйте данные: `npm run sync-data ~/your-data.csv`
3. ✅ Откройте браузер: http://localhost:3000
4. ✅ Попробуйте поиск: "Квартира в Downtown"
5. ✅ Настройте n8n для автоматизации

---

**Успешного использования! 🚀**

*Если нужна помощь - пишите в Telegram: @refty_support*


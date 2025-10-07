# 🚀 Quick Start Guide

## За 5 минут до запуска

### Предварительные требования

Убедитесь, что у вас установлено:
- ✅ Node.js 18+ (`node --version`)
- ✅ npm или yarn
- ✅ Google Cloud SDK (`gcloud --version`)

### Шаг 1: Клонирование и установка

```bash
cd /Users/ceorefty/real-estate-dashboard
npm install
```

### Шаг 2: Настройка BigQuery

```bash
# Создайте проект в Google Cloud Console
# https://console.cloud.google.com/

# Создайте Service Account и скачайте JSON ключ
# Сохраните как service-account-key.json в корне проекта

# Запустите скрипт настройки
chmod +x scripts/setup-bigquery.sh
./scripts/setup-bigquery.sh
```

### Шаг 3: Настройка переменных окружения

```bash
# Скопируйте пример
cp .env.example .env

# Отредактируйте .env
nano .env  # или используйте любой редактор
```

Минимальная конфигурация:
```env
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
BIGQUERY_DATASET=dubai_real_estate

# Для MCP Refty (опционально, есть fallback)
OPENAI_API_KEY=sk-...

# Для n8n webhook
N8N_WEBHOOK_URL=http://localhost:5678/webhook/user-interaction
```

### Шаг 4: Загрузка тестовых данных

```bash
# Загрузите примеры объектов в BigQuery
bq load \
  --source_format=NEWLINE_DELIMITED_JSON \
  --autodetect \
  $GOOGLE_CLOUD_PROJECT:dubai_real_estate.properties \
  data/sample_properties.json
```

### Шаг 5: Запуск

#### Вариант А: Запуск всех сервисов одной командой

```bash
chmod +x scripts/start-all.sh
./scripts/start-all.sh
```

#### Вариант Б: Запуск по отдельности

```bash
# Терминал 1: Backend
node server/index.js

# Терминал 2: MCP Refty
node server/mcp-refty-server.js

# Терминал 3: Frontend
npm run dev
```

### Шаг 6: Откройте браузер

Перейдите на http://localhost:3000

🎉 **Готово!** Теперь вы можете:
- Задавать вопросы на естественном языке
- Использовать фильтры для поиска
- Просматривать персональные рекомендации

## 🔧 Настройка n8n (опционально)

n8n нужен для автоматического обучения и персонализации.

### Вариант 1: Локальная установка

```bash
npm install -g n8n
n8n start
```

Откройте http://localhost:5678

### Вариант 2: Docker

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### Импорт workflow

1. Откройте n8n: http://localhost:5678
2. Перейдите в **Workflows** → **Import from File**
3. Выберите `n8n/workflows/personalization-workflow.json`
4. Нажмите **Activate** чтобы запустить workflow

## 📝 Примеры использования

### Natural Language поиск

Попробуйте эти запросы:

```
Квартира в Downtown до 2 миллионов
Студия в Marina с видом на море
Апартаменты от Emaar с 2 спальнями
Вилла на Palm Jumeirah с бассейном
Пентхаус в Business Bay
```

### Использование фильтров

1. Откройте панель фильтров справа
2. Установите:
   - Цену: от 500,000 до 3,000,000 AED
   - Спальни: 2
   - Локация: Downtown Dubai
3. Нажмите "Применить фильтры"

### Персонализация

После нескольких поисков система начнет:
- Запоминать ваши предпочтения
- Показывать релевантные рекомендации
- Адаптироваться под ваши запросы

## 🐛 Устранение проблем

### Ошибка: "Cannot connect to BigQuery"

```bash
# Проверьте аутентификацию
gcloud auth application-default login

# Проверьте service account
cat service-account-key.json | jq .project_id
```

### Ошибка: "MCP Refty не отвечает"

MCP Refty использует OpenAI. Если ключ не настроен, система автоматически использует базовый парсер.

```bash
# Проверьте, что сервер запущен
curl http://localhost:3002/health
```

### Ошибка: "Socket connection failed"

```bash
# Убедитесь, что backend запущен
curl http://localhost:3001/api/stats

# Проверьте порты
lsof -i :3001
lsof -i :3000
```

### Ошибка при установке зависимостей

```bash
# Очистите кеш
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## 📚 Следующие шаги

1. **Настройте production окружение**: см. [DEPLOYMENT.md](./DEPLOYMENT.md)
2. **Добавьте свои данные**: импортируйте CSV в BigQuery
3. **Кастомизируйте UI**: измените компоненты в `/components`
4. **Настройте алгоритм рекомендаций**: отредактируйте n8n workflow

## 💡 Подсказки

- **Горячая клавиша**: `Cmd+K` для быстрого поиска (TODO)
- **Dark mode**: автоматически определяется из системы
- **Языки**: поддерживается RU/EN/AR в запросах
- **История**: сохраняется в localStorage браузера

## 🆘 Помощь

Если что-то не работает:
1. Проверьте логи в консоли браузера (F12)
2. Проверьте логи сервера в терминале
3. Создайте issue на GitHub
4. Напишите в Telegram: @refty_support

## 🎯 Полезные команды

```bash
# Проверка статуса всех сервисов
npm run health-check

# Перезагрузка данных в BigQuery
npm run reload-data

# Очистка кеша
npm run clean

# Запуск тестов
npm test

# Проверка логов
tail -f logs/app.log
```

---

**Приятного использования! 🚀**


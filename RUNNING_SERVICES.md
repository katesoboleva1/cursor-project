# 🟢 Запущенные сервисы

## ✅ Статус сервисов

Все сервисы успешно запущены и работают!

### 1. Backend Server (Express + Socket.io)
- **Порт**: 3001
- **URL**: http://localhost:3001
- **API**: http://localhost:3001/api/stats
- **Статус**: ✅ Работает
- **Логи**: `/Users/ceorefty/real-estate-dashboard/logs-backend.txt`

### 2. MCP Refty Server (AI Query Processing)
- **Порт**: 3002
- **URL**: http://localhost:3002
- **Health Check**: http://localhost:3002/health
- **Статус**: ✅ Работает
- **Логи**: `/Users/ceorefty/real-estate-dashboard/logs-mcp.txt`

### 3. Frontend (Next.js)
- **Порт**: 3003 (3000-3002 были заняты)
- **URL**: http://localhost:3003
- **Статус**: ✅ Работает
- **Логи**: `/Users/ceorefty/real-estate-dashboard/logs-frontend.txt`

## 🌐 Откройте в браузере

**Главная страница**: http://localhost:3003

## 📊 Проверка работоспособности

```bash
# Backend API
curl http://localhost:3001/api/stats

# MCP Refty Health
curl http://localhost:3002/health

# Frontend
open http://localhost:3003
```

## 🔧 Управление сервисами

### Просмотр логов

```bash
# Backend
tail -f logs-backend.txt

# MCP Refty
tail -f logs-mcp.txt

# Frontend
tail -f logs-frontend.txt
```

### Остановка сервисов

```bash
# Найти все процессы
ps aux | grep -E "(node server|npm)" | grep -v grep

# Остановить все Node процессы проекта
pkill -f "node server"
pkill -f "next dev"
```

### Перезапуск

```bash
cd /Users/ceorefty/real-estate-dashboard

# Остановите старые процессы
pkill -f "node server"
pkill -f "next dev"

# Запустите заново
./scripts/start-all.sh
```

## ⚠️ Важные замечания

### BigQuery не настроен

Backend показывает ошибку:
```
ENOENT: no such file or directory, open 'service-account-key.json'
```

**Решение**:
1. Создайте Google Cloud проект
2. Создайте Service Account
3. Скачайте JSON ключ как `service-account-key.json`
4. Перезапустите backend

**Пока BigQuery не настроен**:
- API endpoints работают, но возвращают ошибки при запросе данных
- Frontend загружается и работает
- MCP Refty работает в режиме fallback (без OpenAI)

### Для полной функциональности

Следуйте инструкциям в:
- `QUICKSTART.md` - Быстрая настройка
- `INTEGRATION_GUIDE.md` - Подключение данных

## 📝 Текущая конфигурация (.env)

```
SOCKET_PORT=3001
MCP_REFTY_PORT=3002
PORT=3000 (Frontend на 3003)
NODE_ENV=development
```

## 🎯 Следующие шаги

1. **Настройте BigQuery** (опционально, для работы с реальными данными)
   ```bash
   # См. QUICKSTART.md
   ```

2. **Добавьте OpenAI ключ** (опционально, для AI-поиска)
   ```bash
   echo 'OPENAI_API_KEY=sk-...' >> .env
   ```

3. **Импортируйте данные**
   ```bash
   node scripts/sync-data.js ~/dubai_real_estate_channels.csv
   ```

4. **Настройте n8n** (опционально, для автоматизации)
   ```bash
   npm install -g n8n
   n8n start
   ```

## 🆘 Troubleshooting

### Порты заняты?

```bash
# Проверьте, что занимает порты
lsof -i :3000 -i :3001 -i :3002 -i :3003

# Освободите порты
kill -9 PID
```

### Ошибки в логах?

```bash
# Посмотрите логи
cat logs-backend.txt
cat logs-mcp.txt
cat logs-frontend.txt
```

---

**Приятного использования! 🚀**

Откройте http://localhost:3003 в браузере для начала работы!


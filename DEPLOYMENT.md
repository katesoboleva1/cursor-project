# 🚀 Deployment Guide

## Варианты развертывания

### 1. Google Cloud Platform (Рекомендуется)

#### Компоненты:
- **Cloud Run** - для Backend и MCP Refty серверов
- **Cloud Functions** - для n8n webhooks
- **BigQuery** - база данных
- **Cloud Storage** - для статики
- **Cloud CDN** - для кеширования

#### Шаги:

```bash
# 1. Установите gcloud CLI
# https://cloud.google.com/sdk/docs/install

# 2. Аутентификация
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 3. Enable APIs
gcloud services enable run.googleapis.com
gcloud services enable bigquery.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# 4. Deploy Backend
gcloud run deploy refty-backend \
  --source ./server \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="$(cat .env)"

# 5. Deploy MCP Refty
gcloud run deploy refty-mcp \
  --source ./server \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="$(cat .env)"

# 6. Deploy Frontend (Next.js)
# Build
npm run build

# Deploy to Cloud Run
gcloud run deploy refty-frontend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

### 2. Vercel + Railway

#### Frontend на Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Backend на Railway:

1. Создайте аккаунт на railway.app
2. Connect GitHub repository
3. Добавьте environment variables
4. Deploy автоматически

### 3. Docker Compose (Self-hosted)

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - mcp-refty

  mcp-refty:
    build: ./server
    command: node mcp-refty-server.js
    ports:
      - "3002:3002"
    env_file:
      - .env

  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - SOCKET_URL=http://backend:3001
    depends_on:
      - backend

  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=changeme

volumes:
  n8n_data:
```

Запуск:
```bash
docker-compose up -d
```

### 4. Kubernetes (Production scale)

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: refty-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: refty-backend
  template:
    metadata:
      labels:
        app: refty-backend
    spec:
      containers:
      - name: backend
        image: gcr.io/YOUR_PROJECT/refty-backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: GOOGLE_CLOUD_PROJECT
          valueFrom:
            secretKeyRef:
              name: refty-secrets
              key: project-id
---
apiVersion: v1
kind: Service
metadata:
  name: refty-backend
spec:
  selector:
    app: refty-backend
  ports:
  - port: 80
    targetPort: 3001
  type: LoadBalancer
```

Deploy:
```bash
kubectl apply -f k8s/
```

## 🔐 Security Checklist

- [ ] Измените все дефолтные пароли
- [ ] Настройте HTTPS/SSL
- [ ] Ограничьте CORS origins
- [ ] Добавьте rate limiting
- [ ] Настройте firewall rules
- [ ] Используйте secrets manager для ключей
- [ ] Включите audit logging
- [ ] Настройте backup для BigQuery
- [ ] Добавьте мониторинг и алерты

## 📊 Мониторинг

### Google Cloud Monitoring

```javascript
// server/monitoring.js
const { Monitoring } = require('@google-cloud/monitoring');

const client = new Monitoring.MetricServiceClient();

async function writeMetric(metricType, value) {
  const dataPoint = {
    interval: {
      endTime: {
        seconds: Date.now() / 1000,
      },
    },
    value: {
      doubleValue: value,
    },
  };

  const timeSeries = {
    metric: {
      type: `custom.googleapis.com/${metricType}`,
    },
    resource: {
      type: 'global',
    },
    points: [dataPoint],
  };

  await client.createTimeSeries({
    name: client.projectPath(projectId),
    timeSeries: [timeSeries],
  });
}
```

### Grafana Dashboard

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  grafana_data:
```

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build
      run: npm run build
    
    - name: Deploy to Cloud Run
      uses: google-github-actions/deploy-cloudrun@main
      with:
        service: refty-dashboard
        region: us-central1
        credentials: ${{ secrets.GCP_CREDENTIALS }}
```

## 📈 Scaling Tips

1. **Backend**: Используйте горизонтальное масштабирование через Cloud Run или K8s
2. **WebSocket**: Используйте Redis adapter для Socket.IO
3. **BigQuery**: Включите кеширование запросов
4. **CDN**: Используйте Cloud CDN для статики
5. **Database**: Partition таблицы по датам

## 🚨 Troubleshooting

### WebSocket не работает
```bash
# Проверьте, что порты открыты
curl http://your-domain:3001/socket.io/

# Проверьте CORS
curl -H "Origin: http://your-frontend-domain" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: X-Requested-With" \
  -X OPTIONS http://your-backend:3001
```

### BigQuery timeout
```javascript
// Увеличьте timeout
const [rows] = await bigquery.query({
  query: sql,
  timeout: 30000, // 30 seconds
  useLegacySql: false
});
```

### High latency
```bash
# Проверьте метрики
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_latencies"' \
  --format=json
```

## 💰 Cost Optimization

1. **BigQuery**: 
   - Используйте clustering и partitioning
   - Избегайте `SELECT *`
   - Кешируйте результаты

2. **Cloud Run**:
   - Настройте min instances = 0 для dev
   - Используйте concurrency = 80

3. **Storage**:
   - Lifecycle policies для старых данных
   - Используйте Nearline/Coldline storage

## 📞 Support

Если возникли проблемы с развертыванием:
- Создайте issue на GitHub
- Напишите в Telegram: @refty_support
- Email: devops@refty.ai


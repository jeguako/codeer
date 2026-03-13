# CashFlow WB — Инструкция по установке

## Требования к серверу (timeweb VPS)
- Node.js 18+
- PostgreSQL 14+
- Nginx (для проксирования)

## 1. Клонирование и настройка

```bash
git clone <your-repo>
cd wb-saas

# Настройка переменных окружения
cp backend/.env.example backend/.env
nano backend/.env
```

### backend/.env — заполнить:
```
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cashflow_wb
DB_USER=postgres
DB_PASSWORD=ВАШ_ПАРОЛЬ

JWT_SECRET=длинный_случайный_секрет_минимум_32_символа
JWT_EXPIRES_IN=7d

# Ключ шифрования WB токенов (ровно 32 символа)
ENCRYPTION_KEY=12345678901234567890123456789012
```

## 2. База данных

```bash
# Создать БД
sudo -u postgres createdb cashflow_wb

# Запустить миграции
cd backend
npm install
npm run migrate
```

## 3. Сборка и запуск

```bash
# Собрать frontend
cd ../frontend
npm install
npm run build

# Скопировать в backend
mkdir -p ../backend/public
cp -r dist/* ../backend/public/

# Запустить сервер через PM2
cd ../backend
npm install -g pm2
pm2 start src/app.js --name cashflow-wb
pm2 save
pm2 startup
```

## 4. Nginx конфиг

```nginx
server {
    listen 80;
    server_name ваш-домен.ru;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }
}
```

```bash
# SSL (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ваш-домен.ru
```

## 5. Использование

1. Откройте сайт, зарегистрируйтесь
2. Перейдите в **Загрузка** → добавьте WB API-токен
3. Загрузите данные (нажмите каждый блок)
4. Смотрите аналитику на **Главной**

## API endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| POST | /api/auth/register | Регистрация |
| POST | /api/auth/login | Вход |
| GET | /api/auth/me | Профиль |
| GET | /api/tokens | Список токенов |
| POST | /api/tokens | Добавить токен |
| POST | /api/sync/paid-storage | Синхронизировать хранение |
| POST | /api/sync/detail-report | Синхронизировать реализации |
| POST | /api/sync/orders | Синхронизировать заказы |
| POST | /api/sync/sales | Синхронизировать продажи |
| POST | /api/sync/products | Синхронизировать карточки |
| POST | /api/sync/stocks | Синхронизировать остатки |
| GET | /api/analytics/dashboard | Сводка |
| GET | /api/analytics/by-day | По дням |
| GET | /api/analytics/by-category | По категориям |
| GET | /api/analytics/top-products | Топ товаров |
| GET | /api/analytics/storage | Хранение |
| GET | /api/analytics/ads | Реклама |
| GET | /api/analytics/warehouses | Склады |

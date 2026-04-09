#!/bin/bash
# CashFlow WB — деплой на timeweb VPS
# Запустить: bash deploy.sh

set -e

echo "=== CashFlow WB Deploy ==="

# 1. Backend deps
echo "→ Устанавливаем зависимости backend..."
cd backend
npm install --production
cd ..

# 2. Frontend build
echo "→ Собираем frontend..."
cd frontend
npm install
npm run build
cd ..

# 3. Copy frontend build to backend/public for static serving
echo "→ Копируем frontend build..."
mkdir -p backend/public
cp -r frontend/dist/* backend/public/

echo "✅ Сборка завершена!"
echo ""
echo "Дальнейшие шаги:"
echo "1. Скопируйте .env.example → .env и заполните переменные"
echo "2. Создайте БД: createdb cashflow_wb"
echo "3. Запустите миграции: cd backend && npm run migrate"
echo "4. Запустите сервер: npm start"
echo "   Или через PM2: pm2 start src/app.js --name cashflow-wb"

# Setup Guide

## Prerequisites
- Node.js v20 LTS
- Docker Desktop

## Getting started

### 1. Clone and install
```bash
git clone <repo-url>
cd progenesis
npm install
```

### 2. Configure environment
```bash
cp .env.example apps/frontend/.env.local
cp .env.example apps/backend/.env
# Edit both files and fill in your values
```

### 3. Start infrastructure
```bash
npm run infra:up
```

### 4. Run database migrations
```bash
npm run db:migrate
```

### 5. Start development servers
```bash
npm run dev
```

Frontend: http://localhost:3000
Backend:  http://localhost:4000
RabbitMQ: http://localhost:15672
Grafana:  http://localhost:3001

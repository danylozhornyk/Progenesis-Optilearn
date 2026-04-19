# Architecture

## Overview
Monorepo with two apps (Next.js frontend, Node.js backend) and shared TypeScript types.

## Apps
- `apps/frontend` — Next.js 14, React, D3.js, Chart.js, Cytoscape.js
- `apps/backend`  — Node.js, Express, PostgreSQL, Redis, RabbitMQ

## Infrastructure (Docker)
- PostgreSQL — persistent data storage
- Redis      — caching and session storage
- RabbitMQ   — async message queues
- Prometheus  — metrics scraping
- Grafana     — metrics dashboards

## Shared packages
- `packages/shared-types` — TypeScript interfaces shared between frontend and backend

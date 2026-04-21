# Progenesis Optilearn

An interactive learning platform for mathematical disciplines including graph theory, numerical methods, and optimization problems.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL 16 (via Prisma ORM) |
| Cache | Redis 7 |
| Queue | RabbitMQ 3 |
| Visualizations | D3.js, Chart.js, Cytoscape.js |
| Monitoring | Prometheus, Grafana |
| Monorepo | Turborepo, npm workspaces |

## Project structure

```
progenesis-optilearn/
├── apps/
│   ├── frontend/          # Next.js app (port 3000)
│   └── backend/           # Node.js API (port 4000)
├── packages/
│   └── shared-types/      # Shared TypeScript interfaces
├── infrastructure/
│   ├── docker-compose.yml # Local dev services
│   └── monitoring/        # Prometheus + Grafana config
├── database/
│   └── migrations/        # SQL migration history
├── docs/                  # Architecture and API docs
└── .env.example           # Environment variable template
```

## Prerequisites

- Node.js v20 LTS
- Docker Desktop

## Getting started

### 1. Clone the repository

```bash
git clone <repo-url>
cd progenesis-optilearn
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example apps/frontend/.env.local
cp .env.example apps/backend/.env
```

Edit both files and fill in your values. At minimum set `JWT_SECRET` to a random 64-character string:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Start infrastructure

```bash
npm run infra:up
```

This starts PostgreSQL, Redis, RabbitMQ, Prometheus and Grafana in Docker.

### 5. Run database migrations

```bash
cd apps/backend
npx prisma migrate dev
```

### 6. Start development servers

```bash
cd ../..
npm run dev
```

Both the frontend and backend start in parallel via Turborepo.

## Running services

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| Health check | http://localhost:4000/health |
| RabbitMQ UI | http://localhost:15672 |
| Grafana | http://localhost:3001 |
| Prometheus | http://localhost:9090 |
| Prisma Studio | http://localhost:5555 |

## API endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login and receive JWT |
| GET | `/auth/me` | Get current user (requires token) |

### Courses
| Method | Endpoint | Description |
|---|---|---|
| GET | `/courses` | List all published courses |
| GET | `/courses/:id` | Get course with lessons |
| POST | `/courses` | Create a course |
| PATCH | `/courses/:id` | Update a course |
| DELETE | `/courses/:id` | Delete a course |

### Lessons
| Method | Endpoint | Description |
|---|---|---|
| GET | `/lessons/course/:courseId` | Lessons for a course |
| GET | `/lessons/:id` | Get lesson with tests |
| POST | `/lessons` | Create a lesson |
| PATCH | `/lessons/:id` | Update a lesson |
| DELETE | `/lessons/:id` | Delete a lesson |

### Tests
| Method | Endpoint | Description |
|---|---|---|
| GET | `/tests/lesson/:lessonId` | Tests for a lesson |
| GET | `/tests/:id` | Get test with tasks |
| POST | `/tests` | Create a test |
| PATCH | `/tests/:id` | Update a test |
| DELETE | `/tests/:id` | Delete a test |

### Tasks
| Method | Endpoint | Description |
|---|---|---|
| GET | `/tasks/test/:testId` | Tasks for a test |
| GET | `/tasks/:id` | Get a single task |
| POST | `/tasks` | Create a task |
| PATCH | `/tasks/:id` | Update a task |
| DELETE | `/tasks/:id` | Delete a task |

### Attempts
| Method | Endpoint | Description |
|---|---|---|
| POST | `/attempts` | Submit an answer (auto-graded) |
| GET | `/attempts/user/:userId` | User attempt history |
| GET | `/attempts/task/:taskId` | Attempts for a task |

### Graphs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/graphs/templates` | System graph templates |
| GET | `/graphs/user/:userId` | User's graphs |
| POST | `/graphs` | Create a graph |
| PATCH | `/graphs/:id` | Update a graph |
| DELETE | `/graphs/:id` | Delete a graph |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/:id` | Get user profile |
| PATCH | `/users/:id/preferences` | Update UI preferences |
| GET | `/users/:id/progress` | Get learning progress |

### Achievements
| Method | Endpoint | Description |
|---|---|---|
| GET | `/achievements/user/:userId` | User achievements |
| POST | `/achievements` | Award an achievement |

## Authentication

Protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

Tokens are returned from `/auth/register` and `/auth/login`.

## Database

Prisma is used as the ORM. Common commands:

```bash
cd apps/backend

# Create a new migration after schema changes
npx prisma migrate dev --name describe_your_change

# Open visual database browser
npx prisma studio

# Regenerate TypeScript client after schema changes
npx prisma generate
```

## Infrastructure commands

```bash
# Start all Docker services
npm run infra:up

# Stop all Docker services
npm run infra:down

# View logs for a specific service
docker compose -f infrastructure/docker-compose.yml logs -f postgres
```

## Environment variables

See `.env.example` for all required variables. Never commit `.env` files.

## docs

- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [Setup Guide](docs/setup.md)
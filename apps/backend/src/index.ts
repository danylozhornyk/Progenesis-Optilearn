import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import {
  collectDefaultMetrics,
  Registry,
  Counter,
  Histogram,
} from 'prom-client';
import { connectRedis } from './cache/redis';
import { prisma } from './db/prisma';

import authRouter from './routes/auth.routes';
import coursesRouter from './routes/courses.routes';
import lessonsRouter from './routes/lessons.routes';
import testsRouter from './routes/tests.routes';
import tasksRouter from './routes/tasks.routes';
import submissionsRouter from './routes/submissions.routes';
import graphsRouter from './routes/graphs.routes';
import usersRouter from './routes/users.routes';
import achievementsRouter from './routes/achievements.routes';
import recommendationsRouter from './routes/recommendations.routes';
import uploadsRouter from './routes/uploads.routes';
import adminRouter from './routes/admin.routes';
import { initStorage } from './storage';
import { UPLOADS_DIR } from './storage/local.storage';

const app = express();
const PORT = process.env.PORT || 4000;

// ── Prometheus metrics setup ──────────────────────────────────
const register = new Registry();
collectDefaultMetrics({ register });

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpErrorTotal = new Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors (4xx and 5xx)',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// ── Middleware ────────────────────────────────────────────────
app.use(helmet({
  // Allow the frontend origin to load images served from this API
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// ── Static file serving — uploaded images ─────────────────────
app.use('/uploads', express.static(UPLOADS_DIR));

// ── Metrics middleware — records every request ────────────────
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path ?? req.path;
    const labels = {
      method: req.method,
      route,
      status: res.statusCode,
    };

    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);

    if (res.statusCode >= 400) {
      httpErrorTotal.inc(labels);
    }
  });

  next();
});

// ── Routes ────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/courses', coursesRouter);
app.use('/lessons', lessonsRouter);
app.use('/tests', testsRouter);
app.use('/tasks', tasksRouter);
app.use('/submissions', submissionsRouter);
app.use('/graphs', graphsRouter);
app.use('/users', usersRouter);
app.use('/achievements', achievementsRouter);
app.use('/recommendations', recommendationsRouter);
app.use('/uploads', uploadsRouter);
app.use('/admin', adminRouter);

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Prometheus metrics endpoint ───────────────────────────────
app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
  } catch {
    res.status(500).send('Failed to collect metrics');
  }
});

// ── 404 handler ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Start ─────────────────────────────────────────────────────
async function start() {
  await connectRedis();
  await prisma.$connect();
  await initStorage();
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
    console.log(`Metrics available at http://localhost:${PORT}/metrics`);
  });
}

start();
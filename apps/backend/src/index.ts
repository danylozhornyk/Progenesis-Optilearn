import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';

import authRouter from './routes/auth.routes';
import coursesRouter from './routes/courses.routes';
import lessonsRouter from './routes/lessons.routes';
import testsRouter from './routes/tests.routes';
import tasksRouter from './routes/tasks.routes';
import attemptsRouter from './routes/attempts.routes';
import graphsRouter from './routes/graphs.routes';
import usersRouter from './routes/users.routes';
import achievementsRouter from './routes/achievements.routes';

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/courses', coursesRouter);
app.use('/lessons', lessonsRouter);
app.use('/tests', testsRouter);
app.use('/tasks', tasksRouter);
app.use('/attempts', attemptsRouter);
app.use('/graphs', graphsRouter);
app.use('/users', usersRouter);
app.use('/achievements', achievementsRouter);

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

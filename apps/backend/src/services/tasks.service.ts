import { prisma } from '../db/prisma';
import { TaskType } from 'generated/prisma';
import {
  getCachedTasks,
  setCachedTasks,
  invalidateTasksCache,
} from '../cache/tasks.cache';

export interface HintEntry {
  strength: number; // 0–100: higher = more explicit
  text: string;
}

export async function getTasksByTest(testId: string) {
  const cached = await getCachedTasks(testId);
  if (cached) return cached;

  const tasks = await prisma.task.findMany({
    where: { testId },
    orderBy: { orderIndex: 'asc' },
    include: { graph: true },
  });

  await setCachedTasks(testId, tasks);
  return tasks;
}

export function getTaskById(id: string) {
  return prisma.task.findUnique({
    where: { id },
    include: {
      graph: true,
      test: { select: { id: true, title: true } },
    },
  });
}

export async function createTask(data: {
  testId: string;
  taskType: TaskType;
  orderIndex: number;
  statement: string;
  correctAnswer: string;
  options?: object[];
  answerTolerance?: number;
  maxScore?: number;
  explanation?: string;
  hints?: HintEntry[];
  graphId?: string;
}) {
  const task = await prisma.task.create({ data });
  await invalidateTasksCache(data.testId);
  return task;
}

export async function updateTask(id: string, data: {
  statement?: string;
  correctAnswer?: string;
  options?: object[];
  answerTolerance?: number;
  maxScore?: number;
  explanation?: string;
  hints?: HintEntry[];
  graphId?: string | null;
}) {
  const task = await prisma.task.update({ where: { id }, data });
  await invalidateTasksCache(task.testId);
  return task;
}

export async function deleteTask(id: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    select: { testId: true },
  });
  await prisma.task.delete({ where: { id } });
  if (task) await invalidateTasksCache(task.testId);
}

// ── Hint helpers ──────────────────────────────────────────────

export async function setHints(taskId: string, hints: HintEntry[]) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { hints },
    select: { id: true, hints: true, testId: true },
  });
  await invalidateTasksCache(task.testId);
  return { id: task.id, hints: task.hints };
}

export async function removeHints(taskId: string) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { hints: [] },
    select: { id: true, hints: true, testId: true },
  });
  await invalidateTasksCache(task.testId);
  return { id: task.id, hints: task.hints };
}

// ── Scaffolded hint for a user ────────────────────────────────

export async function getHintForUser(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { hints: true },
  });
  if (!task) return null;

  const hints = task.hints as HintEntry[];
  if (!hints || hints.length === 0) return { hint: null, progressPercent: 0 };

  // Compute user's global score percentage across all completed tests
  const submissions = await prisma.testSubmission.findMany({
    where: { userId },
    select: { totalScore: true, maxScore: true },
  });

  const totalObtained = submissions.reduce((sum, s) => sum + Number(s.totalScore), 0);
  const totalMax = submissions.reduce((sum, s) => sum + Number(s.maxScore), 0);
  const progressPercent = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

  // Lower progress → need stronger (more explicit) hint
  // Higher progress → need weaker (more subtle) hint
  const targetStrength = 100 - progressPercent;

  const best = hints.reduce((prev, curr) =>
    Math.abs(curr.strength - targetStrength) < Math.abs(prev.strength - targetStrength)
      ? curr
      : prev
  );

  return { hint: best, progressPercent };
}

import { prisma } from '../db/prisma';
import { TaskType } from 'generated/prisma';
import {
  getCachedTasks,
  setCachedTasks,
  invalidateTasksCache,
} from '../cache/tasks.cache';

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
  hint?: string;
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
  hint?: string | null;
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

export async function setHint(taskId: string, hint: string) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { hint },
    select: { id: true, hint: true, testId: true },
  });
  await invalidateTasksCache(task.testId);
  return { id: task.id, hint: task.hint };
}

export async function removeHint(taskId: string) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { hint: null },
    select: { id: true, hint: true, testId: true },
  });
  await invalidateTasksCache(task.testId);
  return { id: task.id, hint: task.hint };
}

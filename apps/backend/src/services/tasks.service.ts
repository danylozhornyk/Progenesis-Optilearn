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
      test: { select: { id: true, title: true, titleUk: true } },
    },
  });
}

// Common shape for create + update — keeps the editor-side payload aligned
// with the Prisma Task model (UK fields, image URLs, etc.).
export interface TaskInput {
  taskType?: TaskType;
  orderIndex?: number;
  statement?: string;
  statementUk?: string | null;
  correctAnswer?: string;
  options?: object[] | null;
  optionsUk?: object[] | null;
  answerTolerance?: number | null;
  maxScore?: number;
  imageUrl?: string | null;
  explanation?: string | null;
  explanationUk?: string | null;
  hints?: HintEntry[];
  hintsUk?: HintEntry[] | null;
  graphId?: string | null;
}

export async function createTask(data: TaskInput & {
  testId: string;
  taskType: TaskType;
  orderIndex: number;
  statement: string;
  correctAnswer: string;
}) {
  const task = await prisma.task.create({ data });
  await invalidateTasksCache(data.testId);
  return task;
}

export async function updateTask(id: string, data: TaskInput) {
  const task = await prisma.task.update({ where: { id }, data });
  await invalidateTasksCache(task.testId);
  return task;
}

/**
 * Atomically replace all tasks for a test. Used by the test-structure editor
 * to save the entire task list in one shot. Existing rows are deleted and
 * fresh rows are inserted — submissions are never touched.
 */
export async function replaceTasksForTest(
  testId: string,
  tasks: (TaskInput & {
    taskType: TaskType;
    orderIndex: number;
    statement: string;
    correctAnswer: string;
  })[],
) {
  await prisma.$transaction(async (tx) => {
    await tx.task.deleteMany({ where: { testId } });
    if (tasks.length > 0) {
      await tx.task.createMany({
        data: tasks.map((t) => ({ ...t, testId })),
      });
    }
  });
  await invalidateTasksCache(testId);
  return prisma.task.findMany({
    where: { testId },
    orderBy: { orderIndex: 'asc' },
  });
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

// ── Hint resolution for the test page ─────────────────────────
//
// The "base" hint strength is decided by the average percentScore across all
// submissions for the course this task belongs to:
//   avg <  60%  → strength 100 (most explicit)
//   60% ≤ avg ≤ 80% → strength 50
//   avg >  80%  → strength 0   (most subtle)
//
// Users can ask for stronger hints if the current one didn't help — the
// frontend passes an incrementing `level` and we walk up the sorted hint list
// until we run out of stronger options.

export async function getHintForUser(taskId: string, level = 0) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      hints: true,
      hintsUk: true,
      test: {
        select: {
          lesson: { select: { courseId: true } },
        },
      },
    },
  });
  if (!task) return null;

  const hints = (task.hints as HintEntry[]) ?? [];
  const hintsUk = (task.hintsUk as HintEntry[] | null) ?? null;

  if (hints.length === 0) {
    return {
      hint: null,
      hintUk: null,
      level: 0,
      canStrengthen: false,
      courseAverage: 0,
      baseStrength: 0,
    };
  }

  // Compute the average submission percentScore for the course
  const courseId = task.test.lesson.courseId;
  const agg = await prisma.testSubmission.aggregate({
    where: { test: { lesson: { courseId } } },
    _avg: { percentScore: true },
  });
  const courseAverage = Number(agg._avg.percentScore ?? 0);

  let baseStrength: number;
  if (courseAverage < 60) baseStrength = 100;
  else if (courseAverage <= 80) baseStrength = 50;
  else baseStrength = 0;

  // Sort hints ascending by strength while preserving their original index so
  // we can recover the matching UK translation.
  const sorted = hints
    .map((h, i) => ({ ...h, _origIdx: i }))
    .sort((a, b) => a.strength - b.strength);

  // Pick the index whose strength is closest to the bucketed base value.
  let startIdx = 0;
  let bestDist = Infinity;
  sorted.forEach((h, i) => {
    const d = Math.abs(h.strength - baseStrength);
    if (d < bestDist) {
      bestDist = d;
      startIdx = i;
    }
  });

  // Escalate by `level`; cap at the strongest available hint.
  const targetIdx = Math.min(sorted.length - 1, Math.max(0, startIdx + level));
  const picked = sorted[targetIdx];
  const pickedUk =
    hintsUk && hintsUk[picked._origIdx] ? hintsUk[picked._origIdx] : null;
  const canStrengthen = targetIdx < sorted.length - 1;

  return {
    hint: { strength: picked.strength, text: picked.text },
    hintUk: pickedUk,
    level: targetIdx - startIdx,
    canStrengthen,
    courseAverage,
    baseStrength,
  };
}

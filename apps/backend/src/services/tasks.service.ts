import { prisma } from '../db/prisma';
import { TaskType } from 'generated/prisma';

export function getTasksByTest(testId: string) {
  return prisma.task.findMany({
    where: { testId },
    orderBy: { orderIndex: 'asc' },
    include: {
      hints: { orderBy: { orderIndex: 'asc' } },
      graph: true,
    },
  });
}

export function getTaskById(id: string) {
  return prisma.task.findUnique({
    where: { id },
    include: {
      hints: { orderBy: { orderIndex: 'asc' } },
      graph: true,
      test: { select: { id: true, title: true } },
    },
  });
}

export function createTask(data: {
  testId: string;
  taskType: TaskType;
  orderIndex: number;
  statement: string;
  correctAnswer: string;
  options?: object[];
  answerTolerance?: number;
  maxScore?: number;
  explanation?: string;
  graphId?: string;
}) {
  return prisma.task.create({ data });
}

export function updateTask(id: string, data: {
  statement?: string;
  correctAnswer?: string;
  options?: object[];
  answerTolerance?: number;
  maxScore?: number;
  explanation?: string;
  graphId?: string;
}) {
  return prisma.task.update({ where: { id }, data });
}

export function deleteTask(id: string) {
  return prisma.task.delete({ where: { id } });
}

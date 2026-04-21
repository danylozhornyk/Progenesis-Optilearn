import { prisma } from '../db/prisma';

export function getAttemptsByUser(userId: string) {
  return prisma.attempt.findMany({
    where: { userId },
    include: {
      task: { select: { id: true, statement: true, taskType: true } },
    },
    orderBy: { submittedAt: 'desc' },
  });
}

export function getAttemptsByTask(taskId: string) {
  return prisma.attempt.findMany({
    where: { taskId },
    orderBy: { submittedAt: 'desc' },
  });
}

export function getAttemptById(id: string) {
  return prisma.attempt.findUnique({
    where: { id },
    include: {
      task: true,
      user: { select: { id: true, fullName: true } },
    },
  });
}

export async function createAttempt(data: {
  userId: string;
  taskId: string;
  userAnswer: object;
  timeSpentMs?: number;
}) {
  // Get last attempt number for this user+task
  const last = await prisma.attempt.findFirst({
    where: { userId: data.userId, taskId: data.taskId },
    orderBy: { attemptNumber: 'desc' },
    select: { attemptNumber: true },
  });

  const attemptNumber = (last?.attemptNumber ?? 0) + 1;

  // Fetch correct answer to evaluate
  const task = await prisma.task.findUnique({
    where: { id: data.taskId },
    select: { correctAnswer: true, maxScore: true, taskType: true },
  });

  if (!task) throw new Error('Task not found');

  const { isCorrect, score } = evaluateAnswer(
    task.taskType,
    data.userAnswer,
    task.correctAnswer,
    Number(task.maxScore)
  );

  return prisma.attempt.create({
    data: {
      ...data,
      attemptNumber,
      isCorrect,
      score,
    },
  });
}

function evaluateAnswer(
  taskType: string,
  userAnswer: object,
  correctAnswer: string,
  maxScore: number
): { isCorrect: boolean; score: number } {
  const answer = userAnswer as Record<string, unknown>;

  if (taskType === 'SINGLE_CHOICE') {
    const isCorrect = answer.selected === correctAnswer;
    return { isCorrect, score: isCorrect ? maxScore : 0 };
  }

  if (taskType === 'MULTIPLE_CHOICE') {
    const selected = (answer.selected as string[]).sort();
    const correct = JSON.parse(correctAnswer).sort();
    const isCorrect = JSON.stringify(selected) === JSON.stringify(correct);
    return { isCorrect, score: isCorrect ? maxScore : 0 };
  }

  if (taskType === 'OPEN_ANSWER') {
    const isCorrect =
      String(answer.text).trim().toLowerCase() ===
      correctAnswer.trim().toLowerCase();
    return { isCorrect, score: isCorrect ? maxScore : 0 };
  }

  return { isCorrect: false, score: 0 };
}

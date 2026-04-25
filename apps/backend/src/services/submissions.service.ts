import { prisma } from '../db/prisma';
import { checkAndAwardAchievements } from './achievements.service';

interface TaskAnswerInput {
  taskId: string;
  userAnswer: Record<string, unknown>;
}

export async function submitTest(data: {
  userId: string;
  testId: string;
  answers: TaskAnswerInput[];
  timeSpentMs?: number;
}) {
  // ── 1. Load the test with tasks and passing score ───────────
  const test = await prisma.test.findUnique({
    where: { id: data.testId },
    include: {
      tasks: {
        select: {
          id: true,
          taskType: true,
          correctAnswer: true,
          answerTolerance: true,
          maxScore: true,
        },
      },
    },
  });

  if (!test) throw new Error('Test not found');

  // ── 2. Check attempt limit ──────────────────────────────────
  if (test.maxAttempts !== null) {
    const attemptCount = await prisma.testSubmission.count({
      where: { userId: data.userId, testId: data.testId },
    });
    if (attemptCount >= test.maxAttempts) {
      throw new Error('Maximum attempts reached for this test');
    }
  }

  // ── 3. Get current attempt number ──────────────────────────
  const lastAttempt = await prisma.testSubmission.findFirst({
    where: { userId: data.userId, testId: data.testId },
    orderBy: { attemptNumber: 'desc' },
    select: { attemptNumber: true },
  });
  const attemptNumber = (lastAttempt?.attemptNumber ?? 0) + 1;

  // ── 4. Grade each answer ────────────────────────────────────
  const taskMap = new Map(test.tasks.map((t) => [t.id, t]));

  let totalScore = 0;
  let maxScore = 0;

  const gradedAnswers = data.answers.map((answer) => {
    const task = taskMap.get(answer.taskId);
    if (!task) throw new Error(`Task ${answer.taskId} does not belong to this test`);

    const taskMaxScore = Number(task.maxScore);
    maxScore += taskMaxScore;

    const { isCorrect, score } = gradeAnswer(
      task.taskType,
      answer.userAnswer,
      task.correctAnswer,
      taskMaxScore,
      task.answerTolerance ? Number(task.answerTolerance) : undefined
    );

    totalScore += score;

    return {
      taskId: answer.taskId,
      userAnswer: answer.userAnswer,
      isCorrect,
      score,
    };
  });

  const percentScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const passed = percentScore >= Number(test.passingScore);

  // ── 5. Save submission and all answers in one transaction ───
  const submission = await prisma.testSubmission.create({
  data: {
    userId: data.userId,
    testId: data.testId,
    attemptNumber,
    status: 'GRADED',
    totalScore,
    maxScore,
    percentScore,
    passed,
    timeSpentMs: data.timeSpentMs,
    answers: gradedAnswers, // store the whole array as JSONB
  },
  include: {
    test: { select: { title: true, passingScore: true } },
  },
});

  // ── 6. Update user progress ─────────────────────────────────
  await updateUserProgress(data.userId, test, totalScore);

  // ── 7. Check and award achievements ────────────────────────
  const newAchievements = await checkAndAwardAchievements(data.userId, {
    passed,
    percentScore,
    attemptNumber,
  });

  return {
    submission,
    newAchievements,
  };
}

export function getSubmissionsByUser(userId: string) {
  return prisma.testSubmission.findMany({
    where: { userId },
    include: {
      test: { select: { id: true, title: true } }
    },
    orderBy: { submittedAt: 'desc' },
  });
}

export function getSubmissionsByTest(testId: string) {
  return prisma.testSubmission.findMany({
    where: { testId },
    include: {
      user: { select: { id: true, fullName: true, email: true } }
    },
    orderBy: { submittedAt: 'desc' },
  });
}

export function getSubmissionById(id: string) {
  return prisma.testSubmission.findUnique({
    where: { id },
    include: {
      test: { select: { id: true, title: true, passingScore: true } },
    },
  });
}

// ── Grading logic ─────────────────────────────────────────────

function gradeAnswer(
  taskType: string,
  userAnswer: Record<string, unknown>,
  correctAnswer: string,
  maxScore: number,
  tolerance?: number
): { isCorrect: boolean; score: number } {
  if (taskType === 'SINGLE_CHOICE') {
    const isCorrect = userAnswer.selected === correctAnswer;
    return { isCorrect, score: isCorrect ? maxScore : 0 };
  }

  if (taskType === 'MULTIPLE_CHOICE') {
    const selected = [...(userAnswer.selected as string[])].sort();
    const correct = [...JSON.parse(correctAnswer)].sort();
    const isCorrect = JSON.stringify(selected) === JSON.stringify(correct);
    return { isCorrect, score: isCorrect ? maxScore : 0 };
  }

  if (taskType === 'OPEN_ANSWER') {
    const userText = String(userAnswer.text ?? '').trim();
    const correctText = correctAnswer.trim();

    // Try numeric comparison with tolerance first
    const userNum = parseFloat(userText);
    const correctNum = parseFloat(correctText);

    if (!isNaN(userNum) && !isNaN(correctNum)) {
      const tol = tolerance ?? 0;
      const isCorrect = Math.abs(userNum - correctNum) <= tol;
      return { isCorrect, score: isCorrect ? maxScore : 0 };
    }

    // Fall back to string comparison
    const isCorrect = userText.toLowerCase() === correctText.toLowerCase();
    return { isCorrect, score: isCorrect ? maxScore : 0 };
  }

  return { isCorrect: false, score: 0 };
}

// ── Update user progress after submission ─────────────────────

async function updateUserProgress(
  userId: string,
  test: { lessonId: string },
  submissionTotalScore: number
) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: test.lessonId },
    select: { courseId: true },
  });

  if (!lesson) return;

  const courseId = lesson.courseId;

  const [totalLessons, allSubmissions] = await Promise.all([
    prisma.lesson.count({ where: { courseId } }),
    prisma.testSubmission.findMany({
      where: { userId, passed: true },
      include: { test: { select: { lessonId: true } } },
    }),
  ]);

  const completedLessonIds = new Set(
    allSubmissions.map((s) => s.test.lessonId)
  );

  const progressPercent =
    totalLessons > 0
      ? (completedLessonIds.size / totalLessons) * 100
      : 0;

  // Sum all scores across all submissions for this course
  const courseSubmissions = await prisma.testSubmission.findMany({
    where: {
      userId,
      test: { lesson: { courseId } },
    },
    select: { totalScore: true },
  });

  const totalScore = courseSubmissions.reduce(
    (sum, s) => sum + Number(s.totalScore),
    0
  );

  await prisma.userProgress.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: { progressPercent, totalScore, updatedAt: new Date() },
    create: { userId, courseId, progressPercent, totalScore },
  });
}

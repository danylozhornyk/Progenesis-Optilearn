import { prisma } from '../db/prisma';
import { checkAndAwardAchievements } from './achievements.service';
import { getLessonAccess } from './lessons.service';
import { computeCourseProgress } from './users.service';

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

  // ── 1a. Block retake after a successful pass ─────────────────
  const alreadyPassed = await prisma.testSubmission.findFirst({
    where: { userId: data.userId, testId: data.testId, passed: true },
    select: { id: true },
  });
  if (alreadyPassed) throw new Error('TEST_ALREADY_PASSED');

  // ── 1b. Enforce test-progression gate ───────────────────────
  const access = await getLessonAccess(data.userId, test.lessonId);
  if (access && !access.testsUnlocked) {
    throw new Error('LESSON_LOCKED');
  }

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

  // ── 5. Apply attempt coefficient to earned score ────────────
  // Attempt 1 → ×1.0, attempt 2 → ×0.8, attempt 3+ → ×0.6
  const coefficient = attemptNumber === 1 ? 1.0 : attemptNumber === 2 ? 0.8 : 0.6;
  const adjustedTotalScore = Math.round(totalScore * coefficient);
  const percentScore = maxScore > 0 ? (adjustedTotalScore / maxScore) * 100 : 0;
  const passed = percentScore >= Number(test.passingScore);

  // ── 6. Save submission ──────────────────────────────────────
  const submission = await prisma.testSubmission.create({
  data: {
    userId: data.userId,
    testId: data.testId,
    attemptNumber,
    status: 'GRADED',
    totalScore: adjustedTotalScore,
    maxScore,
    percentScore,
    passed,
    timeSpentMs: data.timeSpentMs,
    answers: gradedAnswers, // store the whole array as JSONB
  },
  include: {
    test: { select: { title: true, titleUk: true, passingScore: true } },
  },
});

  // ── 6a. Promote best attempt if max attempts exhausted ──────
  // If this was the last allowed attempt and the user still hasn't passed,
  // find the highest-scoring submission and mark it passed so they can proceed.
  if (test.maxAttempts !== null && !passed && attemptNumber >= test.maxAttempts) {
    const bestSubmission = await prisma.testSubmission.findFirst({
      where: { userId: data.userId, testId: data.testId },
      orderBy: { percentScore: 'desc' },
      select: { id: true },
    });
    if (bestSubmission) {
      await prisma.testSubmission.update({
        where: { id: bestSubmission.id },
        data: { passed: true },
      });
    }
  }

  // ── 7. Update user progress ─────────────────────────────────
  await updateUserProgress(data.userId, test, adjustedTotalScore);

  // ── 8. Check and award achievements ────────────────────────
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

/**
 * Returns the user's best submission for a given test, or null.
 * "Best" = passed first, then highest percent, then most recent.
 * The result is the row most useful for showing the test as "completed".
 */
export function getBestSubmissionForTest(userId: string, testId: string) {
  return prisma.testSubmission.findFirst({
    where: { userId, testId },
    orderBy: [
      { passed: 'desc' },
      { percentScore: 'desc' },
      { submittedAt: 'desc' },
    ],
    include: {
      test: { select: { id: true, title: true, titleUk: true, passingScore: true } },
    },
  });
}

/**
 * Returns the user's best submission for every test in a given lesson,
 * keyed by testId. Tests with no submission are simply absent from the map.
 */
export async function getBestSubmissionsForLesson(userId: string, lessonId: string) {
  const tests = await prisma.test.findMany({
    where: { lessonId },
    select: { id: true },
  });
  if (tests.length === 0) return {} as Record<string, unknown>;

  // One query per test is fine here (test count per lesson is small).
  const entries = await Promise.all(
    tests.map(async (t) => {
      const sub = await prisma.testSubmission.findFirst({
        where: { userId, testId: t.id },
        orderBy: [
          { passed: 'desc' },
          { percentScore: 'desc' },
          { submittedAt: 'desc' },
        ],
      });
      return [t.id, sub] as const;
    })
  );

  return Object.fromEntries(entries.filter(([, v]) => v !== null));
}

export function getSubmissionsByUser(userId: string) {
  return prisma.testSubmission.findMany({
    where: { userId },
    include: {
      test: { select: { id: true, title: true, titleUk: true } }
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
      test: { select: { id: true, title: true, titleUk: true, passingScore: true } },
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
  // Kept for signature compatibility; the recomputed totalScore is authoritative.
  _submissionTotalScore: number
) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: test.lessonId },
    select: { courseId: true },
  });
  if (!lesson) return;

  const { progressPercent, totalScore } = await computeCourseProgress(
    userId,
    lesson.courseId,
  );

  // Submitting a test counts as an enrollment if the user wasn't enrolled yet.
  await prisma.userProgress.upsert({
    where: { userId_courseId: { userId, courseId: lesson.courseId } },
    update: { progressPercent, totalScore: Math.round(totalScore), updatedAt: new Date() },
    create: { userId, courseId: lesson.courseId, progressPercent, totalScore: Math.round(totalScore) },
  });
}

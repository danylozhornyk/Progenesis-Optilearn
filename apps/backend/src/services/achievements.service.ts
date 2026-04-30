import { prisma } from '../db/prisma';
import { AchievementCategory } from 'generated/prisma';

// ── Achievement definitions ───────────────────────────────────
// Add new achievements here — they are checked automatically
// after every test submission

interface AchievementDefinition {
  code: string;
  name: string;
  nameUk: string;
  description: string;
  descriptionUk: string;
  category: AchievementCategory;
  iconUrl?: string;
  pointsAwarded: number;
  check: (userId: string, context: AchievementContext) => Promise<boolean>;
}

interface AchievementContext {
  submission: {
    passed: boolean;
    percentScore: number;
    attemptNumber: number;
  };
  totalSubmissions: number;
  totalCorrectSubmissions: number;
  totalCorrectTaskAnswers: number;
}

const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    code: 'FIRST_SUBMISSION',
    name: 'First Step',
    nameUk: 'Перший крок',
    description: 'Submitted your first test.',
    descriptionUk: 'Надіслано перший тест.',
    category: 'PROGRESS',
    pointsAwarded: 10,
    check: async (_userId, ctx) => ctx.totalSubmissions === 1,
  },
  {
    code: 'FIRST_PASS',
    name: 'Passed!',
    nameUk: 'Пройдено!',
    description: 'Passed a test for the first time.',
    descriptionUk: 'Вперше пройдено тест.',
    category: 'PROGRESS',
    pointsAwarded: 20,
    check: async (_userId, ctx) =>
      ctx.submission.passed && ctx.totalCorrectSubmissions === 1,
  },
  {
    code: 'PERFECT_SCORE',
    name: 'Perfect Score',
    nameUk: 'Ідеальний результат',
    description: 'Achieved 100% on a test.',
    descriptionUk: 'Отримано 100% за тест.',
    category: 'SKILL',
    pointsAwarded: 50,
    check: async (_userId, ctx) => ctx.submission.percentScore === 100,
  },
  {
    code: 'PERSISTENT',
    name: 'Persistent',
    nameUk: 'Наполегливий',
    description: 'Submitted the same test 3 or more times.',
    descriptionUk: 'Надіслано один тест 3 або більше разів.',
    category: 'STREAK',
    pointsAwarded: 15,
    check: async (_userId, ctx) => ctx.submission.attemptNumber >= 3,
  },
  {
    code: 'ANSWER_STREAK_10',
    name: 'On a Roll',
    nameUk: 'У потоці',
    description: 'Answered 10 tasks correctly in total.',
    descriptionUk: 'Правильно відповіли на 10 завдань загалом.',
    category: 'STREAK',
    pointsAwarded: 30,
    check: async (_userId, ctx) => ctx.totalCorrectTaskAnswers >= 10,
  },
  {
    code: 'ANSWER_STREAK_50',
    name: 'Knowledge Machine',
    nameUk: 'Машина знань',
    description: 'Answered 50 tasks correctly in total.',
    descriptionUk: 'Правильно відповіли на 50 завдань загалом.',
    category: 'STREAK',
    pointsAwarded: 100,
    check: async (_userId, ctx) => ctx.totalCorrectTaskAnswers >= 50,
  },
  {
    code: 'SUBMISSIONS_5',
    name: 'Regular',
    nameUk: 'Постійний учасник',
    description: 'Submitted 5 tests.',
    descriptionUk: 'Надіслано 5 тестів.',
    category: 'PROGRESS',
    pointsAwarded: 25,
    check: async (_userId, ctx) => ctx.totalSubmissions >= 5,
  },
];

// ── Auto-award achievements after a submission ────────────────
export async function checkAndAwardAchievements(
  userId: string,
  submission: {
    passed: boolean;
    percentScore: number;
    attemptNumber: number;
  }
) {
  // ── Build context from aggregated user stats ────────────────
  const [totalSubmissions, totalCorrectSubmissions, submissionsWithAnswers] =
    await Promise.all([
      prisma.testSubmission.count({
        where: { userId },
      }),
      prisma.testSubmission.count({
        where: { userId, passed: true },
      }),
      prisma.testSubmission.findMany({
        where: { userId },
        select: { answers: true },
      }),
    ]);

  // Count correct task answers across all submissions from JSONB
  const totalCorrectTaskAnswers = submissionsWithAnswers.reduce(
    (count, sub) => {
      const answers = sub.answers as { isCorrect: boolean }[];
      return count + answers.filter((a) => a.isCorrect).length;
    },
    0
  );

  const context: AchievementContext = {
    submission,
    totalSubmissions,
    totalCorrectSubmissions,
    totalCorrectTaskAnswers,
  };

  // ── Get already awarded codes to avoid duplicates ───────────
  const existing = await prisma.achievement.findMany({
    where: { userId },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((a) => a.code));

  // ── Check each achievement definition ──────────────────────
  const awarded = [];

  for (const def of ACHIEVEMENTS) {
    if (existingCodes.has(def.code)) continue;

    const qualifies = await def.check(userId, context);
    if (qualifies) {
      const achievement = await prisma.achievement.create({
        data: {
          userId,
          code: def.code,
          name: def.name,
          nameUk: def.nameUk,
          description: def.description,
          descriptionUk: def.descriptionUk,
          category: def.category,
          iconUrl: def.iconUrl ?? null,
          pointsAwarded: def.pointsAwarded,
        },
      });
      awarded.push(achievement);
    }
  }

  return awarded;
}

// ── Public list of all achievement definitions ────────────────
// Used by the profile page to show locked vs. earned badges.
export function getAchievementDefinitions() {
  return ACHIEVEMENTS.map((a) => ({
    code: a.code,
    name: a.name,
    nameUk: a.nameUk,
    description: a.description,
    descriptionUk: a.descriptionUk,
    category: a.category,
    pointsAwarded: a.pointsAwarded,
    iconUrl: a.iconUrl ?? null,
  }));
}

// ── Manual queries ────────────────────────────────────────────
export function getAchievementsByUser(userId: string) {
  return prisma.achievement.findMany({
    where: { userId },
    orderBy: { awardedAt: 'desc' },
  });
}

export function awardAchievement(data: {
  userId: string;
  code: string;
  name: string;
  nameUk?: string;
  description: string;
  descriptionUk?: string;
  category: AchievementCategory;
  iconUrl?: string;
  pointsAwarded?: number;
}) {
  return prisma.achievement.upsert({
    where: { userId_code: { userId: data.userId, code: data.code } },
    update: {},
    create: {
      userId: data.userId,
      code: data.code,
      name: data.name,
      description: data.description,
      category: data.category,
      iconUrl: data.iconUrl ?? null,
      pointsAwarded: data.pointsAwarded ?? 0,
    },
  });
}
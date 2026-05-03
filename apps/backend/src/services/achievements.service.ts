import { prisma } from '../db/prisma';
import { AchievementCategory } from '../../generated/prisma';

// ── Achievement definitions ───────────────────────────────────
// Add new achievements here — they are checked automatically
// after every test submission.
//
// Platform constants (used to size thresholds realistically):
//   • 3 courses max: "Graph Theory", "Optimization", "Numerical Methods"
//   • ≤ 15 lessons per course  (≤ 45 lessons total)
//   • ≤ 50 tests total across all courses
//
// Points scale: 20 (entry) → 100 (elite).
//
// All long-running counts (perfect scores, first-try passes, distinct
// disciplines, etc.) are pre-computed once into AchievementContext, so each
// check() is just a fast comparison and never hits the DB on its own.

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
  totalCorrectSubmissions: number;   // total passing submissions (retakes counted)
  totalCorrectTaskAnswers: number;   // sum of correct task answers across all submissions
  totalPerfectScores: number;        // submissions where percentScore >= 100
  totalFirstTryPasses: number;       // passed AND attemptNumber === 1
  totalPhoenixPasses: number;        // passed AND attemptNumber > 1
  totalCoursesCompleted: number;     // userProgress rows with progressPercent >= 100
  distinctDisciplines: number;       // unique course disciplines ever submitted in
  distinctCoursesAttempted: number;  // unique courses ever submitted in
  completedDisciplines: Set<string>; // discipline values of completed courses
}

const ACHIEVEMENTS: AchievementDefinition[] = [

  // ──────────────────────────────────────────────────────────────
  // PROGRESS — submission & pass milestones + first course finish
  // ──────────────────────────────────────────────────────────────
  {
    code: 'FIRST_SUBMISSION',
    name: 'First Step',
    nameUk: 'Перший крок',
    description: 'Submitted your very first test.',
    descriptionUk: 'Надіслано перший тест.',
    category: 'PROGRESS',
    pointsAwarded: 20,
    check: async (_u, c) => c.totalSubmissions >= 1,
  },
  {
    code: 'SUBMISSIONS_5',
    name: 'Regular',
    nameUk: 'Постійний учасник',
    description: 'Submitted 5 tests.',
    descriptionUk: 'Надіслано 5 тестів.',
    category: 'PROGRESS',
    pointsAwarded: 25,
    check: async (_u, c) => c.totalSubmissions >= 5,
  },
  {
    code: 'SUBMISSIONS_10',
    name: 'Committed',
    nameUk: 'Відданий',
    description: 'Submitted 10 tests.',
    descriptionUk: 'Надіслано 10 тестів.',
    category: 'PROGRESS',
    pointsAwarded: 30,
    check: async (_u, c) => c.totalSubmissions >= 10,
  },
  {
    code: 'SUBMISSIONS_25',
    name: 'Dedicated',
    nameUk: 'Старанний',
    description: 'Submitted 25 tests.',
    descriptionUk: 'Надіслано 25 тестів.',
    category: 'PROGRESS',
    pointsAwarded: 45,
    check: async (_u, c) => c.totalSubmissions >= 25,
  },
  {
    code: 'SUBMISSIONS_50',
    name: 'Marathoner',
    nameUk: 'Марафонець',
    description: 'Submitted 50 tests — you\'ve touched every test on the platform.',
    descriptionUk: 'Надіслано 50 тестів — охоплено кожен тест платформи.',
    category: 'PROGRESS',
    pointsAwarded: 65,
    check: async (_u, c) => c.totalSubmissions >= 50,
  },
  {
    code: 'FIRST_PASS',
    name: 'Passed!',
    nameUk: 'Пройдено!',
    description: 'Passed a test for the first time.',
    descriptionUk: 'Вперше пройдено тест.',
    category: 'PROGRESS',
    pointsAwarded: 20,
    check: async (_u, c) => c.submission.passed && c.totalCorrectSubmissions === 1,
  },
  {
    code: 'PASSES_5',
    name: 'On the Way',
    nameUk: 'У дорозі',
    description: 'Accumulated 5 passing test submissions.',
    descriptionUk: 'Накопичено 5 успішних проходжень тестів.',
    category: 'PROGRESS',
    pointsAwarded: 25,
    check: async (_u, c) => c.totalCorrectSubmissions >= 5,
  },
  {
    code: 'PASSES_10',
    name: 'Achiever',
    nameUk: 'Досягач',
    description: 'Accumulated 10 passing test submissions.',
    descriptionUk: 'Накопичено 10 успішних проходжень тестів.',
    category: 'PROGRESS',
    pointsAwarded: 35,
    check: async (_u, c) => c.totalCorrectSubmissions >= 10,
  },
  {
    code: 'PASSES_25',
    name: 'Test Conqueror',
    nameUk: 'Підкорювач тестів',
    description: 'Accumulated 25 passing test submissions.',
    descriptionUk: 'Накопичено 25 успішних проходжень тестів.',
    category: 'PROGRESS',
    pointsAwarded: 55,
    check: async (_u, c) => c.totalCorrectSubmissions >= 25,
  },
  {
    code: 'PASSES_50',
    name: 'Master Examinee',
    nameUk: 'Майстер іспитів',
    description: 'Accumulated 50 passing test submissions — the ultimate progress milestone.',
    descriptionUk: 'Накопичено 50 успішних проходжень — найвища позначка прогресу.',
    category: 'PROGRESS',
    pointsAwarded: 100,
    check: async (_u, c) => c.totalCorrectSubmissions >= 50,
  },
  {
    code: 'FIRST_COURSE_COMPLETED',
    name: 'Course Conqueror',
    nameUk: 'Підкорювач курсу',
    description: 'Completed your first course.',
    descriptionUk: 'Завершено перший курс.',
    category: 'PROGRESS',
    pointsAwarded: 55,
    check: async (_u, c) => c.totalCoursesCompleted >= 1,
  },

  // ──────────────────────────────────────────────────────────────
  // SKILL — accuracy, perfect scores, first-try passes
  // ──────────────────────────────────────────────────────────────
  {
    code: 'HIGH_SCORE',
    name: 'High Achiever',
    nameUk: 'Відмінник',
    description: 'Scored 90% or higher on a test.',
    descriptionUk: 'Отримано 90% або більше за тест.',
    category: 'SKILL',
    pointsAwarded: 25,
    check: async (_u, c) => c.submission.percentScore >= 90,
  },
  {
    code: 'NEAR_PERFECT',
    name: 'Sharpshooter',
    nameUk: 'Влучний стрілець',
    description: 'Scored 95% or higher on a test.',
    descriptionUk: 'Отримано 95% або більше за тест.',
    category: 'SKILL',
    pointsAwarded: 35,
    check: async (_u, c) => c.submission.percentScore >= 95,
  },
  {
    code: 'PERFECT_SCORE',
    name: 'Perfect Score',
    nameUk: 'Ідеальний результат',
    description: 'Achieved 100% on a test.',
    descriptionUk: 'Отримано 100% за тест.',
    category: 'SKILL',
    pointsAwarded: 30,
    check: async (_u, c) => c.submission.percentScore === 100,
  },
  {
    code: 'PERFECT_3',
    name: 'Triple Perfect',
    nameUk: 'Потрійна досконалість',
    description: 'Earned 100% on 3 different tests.',
    descriptionUk: 'Отримано 100% за 3 тести.',
    category: 'SKILL',
    pointsAwarded: 40,
    check: async (_u, c) => c.totalPerfectScores >= 3,
  },
  {
    code: 'PERFECT_10',
    name: 'Tenfold Brilliance',
    nameUk: 'Десятикратна досконалість',
    description: 'Earned 100% on 10 different tests.',
    descriptionUk: 'Отримано 100% за 10 тестів.',
    category: 'SKILL',
    pointsAwarded: 60,
    check: async (_u, c) => c.totalPerfectScores >= 10,
  },
  {
    code: 'PERFECT_25',
    name: 'Flawless Mind',
    nameUk: 'Бездоганний розум',
    description: 'Earned 100% on 25 tests — half the platform with a perfect score.',
    descriptionUk: 'Отримано 100% за 25 тестів — половина платформи без помилок.',
    category: 'SKILL',
    pointsAwarded: 85,
    check: async (_u, c) => c.totalPerfectScores >= 25,
  },
  {
    code: 'PRECISION',
    name: 'Precision',
    nameUk: 'Точність',
    description: 'Scored 100% on your very first attempt at a test.',
    descriptionUk: 'Отримано 100% з першої спроби.',
    category: 'SKILL',
    pointsAwarded: 50,
    check: async (_u, c) =>
      c.submission.passed &&
      c.submission.percentScore === 100 &&
      c.submission.attemptNumber === 1,
  },
  {
    code: 'FIRST_TRY_PASS',
    name: 'One and Done',
    nameUk: 'Раз і готово',
    description: 'Passed a test on your first attempt.',
    descriptionUk: 'Пройдено тест з першої спроби.',
    category: 'SKILL',
    pointsAwarded: 25,
    check: async (_u, c) => c.totalFirstTryPasses >= 1,
  },
  {
    code: 'FIRST_TRY_PASSES_5',
    name: 'Quick Study',
    nameUk: 'Кмітливий учень',
    description: 'Passed 5 tests on the first attempt.',
    descriptionUk: 'Пройдено 5 тестів з першої спроби.',
    category: 'SKILL',
    pointsAwarded: 40,
    check: async (_u, c) => c.totalFirstTryPasses >= 5,
  },
  {
    code: 'FIRST_TRY_PASSES_10',
    name: 'Natural Talent',
    nameUk: 'Природний талант',
    description: 'Passed 10 tests on the first attempt.',
    descriptionUk: 'Пройдено 10 тестів з першої спроби.',
    category: 'SKILL',
    pointsAwarded: 60,
    check: async (_u, c) => c.totalFirstTryPasses >= 10,
  },

  // ──────────────────────────────────────────────────────────────
  // STREAK — correct answer totals, persistence, comebacks
  // ──────────────────────────────────────────────────────────────
  {
    code: 'ANSWER_STREAK_10',
    name: 'On a Roll',
    nameUk: 'У потоці',
    description: 'Answered 10 tasks correctly in total.',
    descriptionUk: 'Разом правильно відповіли на 10 завдань.',
    category: 'STREAK',
    pointsAwarded: 20,
    check: async (_u, c) => c.totalCorrectTaskAnswers >= 10,
  },
  {
    code: 'ANSWER_STREAK_50',
    name: 'Knowledge Machine',
    nameUk: 'Машина знань',
    description: 'Answered 50 tasks correctly in total.',
    descriptionUk: 'Разом правильно відповіли на 50 завдань.',
    category: 'STREAK',
    pointsAwarded: 30,
    check: async (_u, c) => c.totalCorrectTaskAnswers >= 50,
  },
  {
    code: 'ANSWER_STREAK_100',
    name: 'Brain Storm',
    nameUk: 'Мозковий штурм',
    description: 'Answered 100 tasks correctly in total.',
    descriptionUk: 'Разом правильно відповіли на 100 завдань.',
    category: 'STREAK',
    pointsAwarded: 45,
    check: async (_u, c) => c.totalCorrectTaskAnswers >= 100,
  },
  {
    code: 'ANSWER_STREAK_200',
    name: 'Encyclopedia',
    nameUk: 'Енциклопедія',
    description: 'Answered 200 tasks correctly in total.',
    descriptionUk: 'Разом правильно відповіли на 200 завдань.',
    category: 'STREAK',
    pointsAwarded: 65,
    check: async (_u, c) => c.totalCorrectTaskAnswers >= 200,
  },
  {
    code: 'PERSISTENT',
    name: 'Persistent',
    nameUk: 'Наполегливий',
    description: 'Submitted the same test 3 or more times.',
    descriptionUk: 'Надіслано один тест 3 або більше разів.',
    category: 'STREAK',
    pointsAwarded: 20,
    check: async (_u, c) => c.submission.attemptNumber >= 3,
  },
  {
    code: 'NEVER_GIVE_UP',
    name: 'Never Give Up',
    nameUk: 'Ніколи не здавайся',
    description: 'Submitted the same test 5 or more times.',
    descriptionUk: 'Надіслано один тест 5 або більше разів.',
    category: 'STREAK',
    pointsAwarded: 30,
    check: async (_u, c) => c.submission.attemptNumber >= 5,
  },
  {
    code: 'UNSTOPPABLE',
    name: 'Unstoppable',
    nameUk: 'Незупинний',
    description: 'Passed a test after 5 or more attempts.',
    descriptionUk: 'Пройдено тест після 5 або більше спроб.',
    category: 'STREAK',
    pointsAwarded: 45,
    check: async (_u, c) =>
      c.submission.passed && c.submission.attemptNumber >= 5,
  },
  {
    code: 'PHOENIX',
    name: 'Phoenix',
    nameUk: 'Фенікс',
    description: 'Passed a test that you had previously failed.',
    descriptionUk: 'Пройдено тест, який раніше не вдавалося пройти.',
    category: 'STREAK',
    pointsAwarded: 25,
    check: async (_u, c) => c.totalPhoenixPasses >= 1,
  },
  {
    code: 'RESILIENT',
    name: 'Resilient',
    nameUk: 'Стійкий',
    description: 'Came back to pass 5 tests you had previously failed.',
    descriptionUk: 'Повернулися та пройшли 5 раніше провалених тестів.',
    category: 'STREAK',
    pointsAwarded: 50,
    check: async (_u, c) => c.totalPhoenixPasses >= 5,
  },

  // ──────────────────────────────────────────────────────────────
  // SOCIAL — multi-course exploration & subject completions
  // ──────────────────────────────────────────────────────────────
  {
    code: 'CURIOUS',
    name: 'Curious',
    nameUk: 'Допитливий',
    description: 'Submitted tests in 2 different courses.',
    descriptionUk: 'Надіслано тести в 2 різних курсах.',
    category: 'SOCIAL',
    pointsAwarded: 30,
    check: async (_u, c) => c.distinctCoursesAttempted >= 2,
  },
  {
    code: 'ALL_COURSES_ATTEMPTED',
    name: 'All-Rounder',
    nameUk: 'Різносторонній',
    description: 'Submitted tests in all 3 courses on the platform.',
    descriptionUk: 'Надіслано тести у всіх 3 курсах платформи.',
    category: 'SOCIAL',
    pointsAwarded: 50,
    check: async (_u, c) => c.distinctCoursesAttempted >= 3,
  },
  {
    code: 'EXPLORER',
    name: 'Explorer',
    nameUk: 'Дослідник',
    description: 'Practiced in 2 different mathematical disciplines.',
    descriptionUk: 'Практика у 2 різних математичних дисциплінах.',
    category: 'SOCIAL',
    pointsAwarded: 40,
    check: async (_u, c) => c.distinctDisciplines >= 2,
  },
  {
    code: 'POLYMATH',
    name: 'Polymath',
    nameUk: 'Поліматія',
    description: 'Practiced across all 3 mathematical disciplines.',
    descriptionUk: 'Практика у всіх 3 математичних дисциплінах.',
    category: 'SOCIAL',
    pointsAwarded: 70,
    check: async (_u, c) => c.distinctDisciplines >= 3,
  },
  {
    code: 'GRAPH_THEORIST',
    name: 'Graph Theorist',
    nameUk: 'Теоретик графів',
    description: 'Completed the Graph Theory course.',
    descriptionUk: 'Завершено курс «Теорія графів».',
    category: 'SOCIAL',
    pointsAwarded: 55,
    check: async (_u, c) => c.completedDisciplines.has('Graph Theory'),
  },
  {
    code: 'OPTIMIZER',
    name: 'Optimizer',
    nameUk: 'Оптимізатор',
    description: 'Completed the Optimization course.',
    descriptionUk: 'Завершено курс «Оптимізація».',
    category: 'SOCIAL',
    pointsAwarded: 55,
    check: async (_u, c) => c.completedDisciplines.has('Optimization'),
  },
  {
    code: 'NUMERICS_MASTER',
    name: 'Numerical Analyst',
    nameUk: 'Числовий аналітик',
    description: 'Completed the Numerical Methods course.',
    descriptionUk: 'Завершено курс «Чисельні методи».',
    category: 'SOCIAL',
    pointsAwarded: 55,
    check: async (_u, c) => c.completedDisciplines.has('Numerical Methods'),
  },
  {
    code: 'COURSES_2',
    name: 'Double Champion',
    nameUk: 'Подвійний чемпіон',
    description: 'Completed 2 courses.',
    descriptionUk: 'Завершено 2 курси.',
    category: 'SOCIAL',
    pointsAwarded: 65,
    check: async (_u, c) => c.totalCoursesCompleted >= 2,
  },
  {
    code: 'COURSES_3',
    name: 'Triple Champion',
    nameUk: 'Потрійний чемпіон',
    description: 'Completed all 3 courses — you mastered the entire platform!',
    descriptionUk: 'Завершено всі 3 курси — ви опанували всю платформу!',
    category: 'SOCIAL',
    pointsAwarded: 100,
    check: async (_u, c) => c.totalCoursesCompleted >= 3,
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
  // ── Build context — all aggregations precomputed up-front so each
  // achievement's check() is just a comparison.
  const [
    totalSubmissions,
    totalCorrectSubmissions,
    submissionsFull,
    totalPerfectScores,
    totalFirstTryPasses,
    totalPhoenixPasses,
    totalCoursesCompleted,
    completedCourseDetails,
  ] = await Promise.all([
    prisma.testSubmission.count({ where: { userId } }),
    prisma.testSubmission.count({ where: { userId, passed: true } }),
    prisma.testSubmission.findMany({
      where: { userId },
      select: {
        answers: true,
        test: {
          select: {
            lesson: {
              select: {
                courseId: true,
                course: { select: { discipline: true } },
              },
            },
          },
        },
      },
    }),
    prisma.testSubmission.count({
      where: { userId, percentScore: { gte: 100 } },
    }),
    prisma.testSubmission.count({
      where: { userId, passed: true, attemptNumber: 1 },
    }),
    prisma.testSubmission.count({
      where: { userId, passed: true, attemptNumber: { gt: 1 } },
    }),
    prisma.userProgress.count({
      where: { userId, progressPercent: { gte: 100 } },
    }),
    // Disciplines of fully-completed courses (for subject-specific badges).
    prisma.userProgress.findMany({
      where: { userId, progressPercent: { gte: 100 } },
      select: { course: { select: { discipline: true } } },
    }),
  ]);

  // Sum correct task answers across submissions.answers JSONB.
  const totalCorrectTaskAnswers = submissionsFull.reduce((count, sub) => {
    const answers = sub.answers as { isCorrect: boolean }[];
    return count + answers.filter((a) => a.isCorrect).length;
  }, 0);

  // Distinct disciplines / courses the user has ever submitted in.
  const distinctDisciplines = new Set(
    submissionsFull.map((s) => s.test.lesson.course.discipline),
  ).size;
  const distinctCoursesAttempted = new Set(
    submissionsFull.map((s) => s.test.lesson.courseId),
  ).size;

  // Disciplines where the user has completed the full course.
  const completedDisciplines = new Set(
    completedCourseDetails.map((p) => p.course.discipline),
  );

  const context: AchievementContext = {
    submission,
    totalSubmissions,
    totalCorrectSubmissions,
    totalCorrectTaskAnswers,
    totalPerfectScores,
    totalFirstTryPasses,
    totalPhoenixPasses,
    totalCoursesCompleted,
    distinctDisciplines,
    distinctCoursesAttempted,
    completedDisciplines,
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

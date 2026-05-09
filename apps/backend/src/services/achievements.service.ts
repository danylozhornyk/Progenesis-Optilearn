import { prisma } from '../db/prisma';
import { AchievementCategory } from '../../generated/prisma';

// ── Achievement definitions ───────────────────────────────────
// Platform constants:
//   • 9 courses: 3 disciplines × 3 difficulties (BEGINNER, INTERMEDIATE, ADVANCED)
//     Disciplines: "Graph Theory" | "Numerical Methods" | "Optimization Methods"
//   • 6 lessons per course → 54 lessons total
//   • 1 test per lesson, 6 tasks per test → 54 tests, 324 tasks total
//
// Points scale: 20 (entry) → 150 (elite/full platform).
//
// "completedDisciplines" = disciplines where ALL 3 difficulty courses are done.
// Counts are pre-computed into AchievementContext so each check() is a fast
// comparison and never hits the DB on its own.

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
  completedDisciplines: Set<string>; // disciplines where ALL 3 courses are completed
  completedDifficulties: Set<string>;// difficulty levels with at least one completed course
}

const ACHIEVEMENTS: AchievementDefinition[] = [

  // ──────────────────────────────────────────────────────────────
  // PROGRESS — submission & pass milestones, course completions
  // ──────────────────────────────────────────────────────────────
  {
    code: 'FIRST_SUBMISSION',
    name: 'First Step',
    nameUk: 'Перший крок',
    description: 'Submitted your very first test.',
    descriptionUk: 'Надіслано перший тест.',
    category: 'PROGRESS',
    iconUrl: '/achievements/first-submission.svg',
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
    iconUrl: '/achievements/submissions-5.svg',
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
    iconUrl: '/achievements/submissions-10.svg',
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
    iconUrl: '/achievements/submissions-25.svg',
    pointsAwarded: 45,
    check: async (_u, c) => c.totalSubmissions >= 25,
  },
  {
    code: 'SUBMISSIONS_50',
    name: 'Marathoner',
    nameUk: 'Марафонець',
    description: 'Submitted 50 tests.',
    descriptionUk: 'Надіслано 50 тестів.',
    category: 'PROGRESS',
    iconUrl: '/achievements/submissions-50.svg',
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
    iconUrl: '/achievements/first-pass.svg',
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
    iconUrl: '/achievements/passes-5.svg',
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
    iconUrl: '/achievements/passes-10.svg',
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
    iconUrl: '/achievements/passes-25.svg',
    pointsAwarded: 55,
    check: async (_u, c) => c.totalCorrectSubmissions >= 25,
  },
  {
    code: 'PASSES_50',
    name: 'Master Examinee',
    nameUk: 'Майстер іспитів',
    description: 'Accumulated 50 passing test submissions.',
    descriptionUk: 'Накопичено 50 успішних проходжень.',
    category: 'PROGRESS',
    iconUrl: '/achievements/passes-50.svg',
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
    iconUrl: '/achievements/first-course.svg',
    pointsAwarded: 55,
    check: async (_u, c) => c.totalCoursesCompleted >= 1,
  },
  {
    code: 'BEGINNER_COMPLETE',
    name: 'Getting Started',
    nameUk: 'Перший рівень',
    description: 'Completed a Beginner difficulty course.',
    descriptionUk: 'Завершено курс рівня Початківець.',
    category: 'PROGRESS',
    iconUrl: '/achievements/beginner-complete.svg',
    pointsAwarded: 30,
    check: async (_u, c) => c.completedDifficulties.has('BEGINNER'),
  },
  {
    code: 'INTERMEDIATE_COMPLETE',
    name: 'Rising Scholar',
    nameUk: 'Зростаючий учень',
    description: 'Completed an Intermediate difficulty course.',
    descriptionUk: 'Завершено курс рівня Середній.',
    category: 'PROGRESS',
    iconUrl: '/achievements/intermediate-complete.svg',
    pointsAwarded: 50,
    check: async (_u, c) => c.completedDifficulties.has('INTERMEDIATE'),
  },
  {
    code: 'ADVANCED_COMPLETE',
    name: 'Advanced Master',
    nameUk: 'Майстер вищого рівня',
    description: 'Completed an Advanced difficulty course.',
    descriptionUk: 'Завершено курс рівня Просунутий.',
    category: 'PROGRESS',
    iconUrl: '/achievements/advanced-complete.svg',
    pointsAwarded: 75,
    check: async (_u, c) => c.completedDifficulties.has('ADVANCED'),
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
    iconUrl: '/achievements/high-score.svg',
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
    iconUrl: '/achievements/near-perfect.svg',
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
    iconUrl: '/achievements/perfect-score.svg',
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
    iconUrl: '/achievements/perfect-3.svg',
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
    iconUrl: '/achievements/perfect-10.svg',
    pointsAwarded: 60,
    check: async (_u, c) => c.totalPerfectScores >= 10,
  },
  {
    code: 'PERFECT_25',
    name: 'Flawless Mind',
    nameUk: 'Бездоганний розум',
    description: 'Earned 100% on 25 tests.',
    descriptionUk: 'Отримано 100% за 25 тестів.',
    category: 'SKILL',
    iconUrl: '/achievements/perfect-25.svg',
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
    iconUrl: '/achievements/precision.svg',
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
    iconUrl: '/achievements/first-try-pass.svg',
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
    iconUrl: '/achievements/first-try-5.svg',
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
    iconUrl: '/achievements/first-try-10.svg',
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
    iconUrl: '/achievements/streak-10.svg',
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
    iconUrl: '/achievements/streak-50.svg',
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
    iconUrl: '/achievements/streak-100.svg',
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
    iconUrl: '/achievements/streak-200.svg',
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
    iconUrl: '/achievements/persistent.svg',
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
    iconUrl: '/achievements/never-give-up.svg',
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
    iconUrl: '/achievements/unstoppable.svg',
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
    iconUrl: '/achievements/phoenix.svg',
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
    iconUrl: '/achievements/resilient.svg',
    pointsAwarded: 50,
    check: async (_u, c) => c.totalPhoenixPasses >= 5,
  },

  // ──────────────────────────────────────────────────────────────
  // SOCIAL — multi-course exploration, discipline & full mastery
  // ──────────────────────────────────────────────────────────────
  {
    code: 'CURIOUS',
    name: 'Curious',
    nameUk: 'Допитливий',
    description: 'Submitted tests in 2 different courses.',
    descriptionUk: 'Надіслано тести в 2 різних курсах.',
    category: 'SOCIAL',
    iconUrl: '/achievements/curious.svg',
    pointsAwarded: 30,
    check: async (_u, c) => c.distinctCoursesAttempted >= 2,
  },
  {
    code: 'COURSES_5_ATTEMPTED',
    name: 'Wide Learner',
    nameUk: 'Широкий учень',
    description: 'Submitted tests in 5 different courses.',
    descriptionUk: 'Надіслано тести у 5 різних курсах.',
    category: 'SOCIAL',
    iconUrl: '/achievements/courses-5-attempted.svg',
    pointsAwarded: 45,
    check: async (_u, c) => c.distinctCoursesAttempted >= 5,
  },
  {
    code: 'ALL_COURSES_ATTEMPTED',
    name: 'All-Rounder',
    nameUk: 'Різносторонній',
    description: 'Submitted tests in all 9 courses on the platform.',
    descriptionUk: 'Надіслано тести у всіх 9 курсах платформи.',
    category: 'SOCIAL',
    iconUrl: '/achievements/all-courses-attempted.svg',
    pointsAwarded: 75,
    check: async (_u, c) => c.distinctCoursesAttempted >= 9,
  },
  {
    code: 'EXPLORER',
    name: 'Explorer',
    nameUk: 'Дослідник',
    description: 'Practiced in 2 different mathematical disciplines.',
    descriptionUk: 'Практика у 2 різних математичних дисциплінах.',
    category: 'SOCIAL',
    iconUrl: '/achievements/explorer.svg',
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
    iconUrl: '/achievements/polymath.svg',
    pointsAwarded: 70,
    check: async (_u, c) => c.distinctDisciplines >= 3,
  },
  {
    code: 'GRAPH_THEORIST',
    name: 'Graph Theorist',
    nameUk: 'Теоретик графів',
    description: 'Completed all Graph Theory courses (all 3 difficulty levels).',
    descriptionUk: 'Завершено всі курси «Теорія графів» (усі 3 рівні складності).',
    category: 'SOCIAL',
    iconUrl: '/achievements/graph-theorist.svg',
    pointsAwarded: 90,
    check: async (_u, c) => c.completedDisciplines.has('Graph Theory'),
  },
  {
    code: 'OPTIMIZER',
    name: 'Optimizer',
    nameUk: 'Оптимізатор',
    description: 'Completed all Optimization Methods courses (all 3 difficulty levels).',
    descriptionUk: 'Завершено всі курси «Методи оптимізації» (усі 3 рівні складності).',
    category: 'SOCIAL',
    iconUrl: '/achievements/optimizer.svg',
    pointsAwarded: 90,
    check: async (_u, c) => c.completedDisciplines.has('Optimization Methods'),
  },
  {
    code: 'NUMERICS_MASTER',
    name: 'Numerical Analyst',
    nameUk: 'Числовий аналітик',
    description: 'Completed all Numerical Methods courses (all 3 difficulty levels).',
    descriptionUk: 'Завершено всі курси «Чисельні методи» (усі 3 рівні складності).',
    category: 'SOCIAL',
    iconUrl: '/achievements/numerics-master.svg',
    pointsAwarded: 90,
    check: async (_u, c) => c.completedDisciplines.has('Numerical Methods'),
  },
  {
    code: 'COURSES_2',
    name: 'Double Champion',
    nameUk: 'Подвійний чемпіон',
    description: 'Completed 2 courses.',
    descriptionUk: 'Завершено 2 курси.',
    category: 'SOCIAL',
    iconUrl: '/achievements/courses-2.svg',
    pointsAwarded: 65,
    check: async (_u, c) => c.totalCoursesCompleted >= 2,
  },
  {
    code: 'COURSES_3',
    name: 'Triple Champion',
    nameUk: 'Потрійний чемпіон',
    description: 'Completed 3 courses.',
    descriptionUk: 'Завершено 3 курси.',
    category: 'SOCIAL',
    iconUrl: '/achievements/courses-3.svg',
    pointsAwarded: 80,
    check: async (_u, c) => c.totalCoursesCompleted >= 3,
  },
  {
    code: 'COURSES_6',
    name: 'Halfway Hero',
    nameUk: 'Герой середини шляху',
    description: 'Completed 6 courses — halfway through the platform.',
    descriptionUk: 'Завершено 6 курсів — половина платформи.',
    category: 'SOCIAL',
    iconUrl: '/achievements/courses-6.svg',
    pointsAwarded: 100,
    check: async (_u, c) => c.totalCoursesCompleted >= 6,
  },
  {
    code: 'COURSES_9',
    name: 'Platform Master',
    nameUk: 'Майстер платформи',
    description: 'Completed all 9 courses — you mastered the entire platform!',
    descriptionUk: 'Завершено всі 9 курсів — ви опанували всю платформу!',
    category: 'SOCIAL',
    iconUrl: '/achievements/courses-9.svg',
    pointsAwarded: 150,
    check: async (_u, c) => c.totalCoursesCompleted >= 9,
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
    prisma.userProgress.findMany({
      where: { userId, progressPercent: { gte: 100 } },
      select: { course: { select: { discipline: true, difficulty: true } } },
    }),
  ]);

  const totalCorrectTaskAnswers = submissionsFull.reduce((count, sub) => {
    const answers = sub.answers as { isCorrect: boolean }[];
    return count + answers.filter((a) => a.isCorrect).length;
  }, 0);

  const distinctDisciplines = new Set(
    submissionsFull.map((s) => s.test.lesson.course.discipline),
  ).size;
  const distinctCoursesAttempted = new Set(
    submissionsFull.map((s) => s.test.lesson.courseId),
  ).size;

  // Count completed courses per discipline, and collect completed difficulty levels.
  const disciplineCounts = new Map<string, number>();
  const completedDifficulties = new Set<string>();
  for (const p of completedCourseDetails) {
    const d = p.course.discipline;
    disciplineCounts.set(d, (disciplineCounts.get(d) ?? 0) + 1);
    completedDifficulties.add(p.course.difficulty as string);
  }
  // A discipline is "completed" only when all 3 difficulty courses are done.
  const completedDisciplines = new Set(
    [...disciplineCounts.entries()]
      .filter(([, n]) => n >= 3)
      .map(([d]) => d),
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
    completedDifficulties,
  };

  const existing = await prisma.achievement.findMany({
    where: { userId },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((a) => a.code));

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

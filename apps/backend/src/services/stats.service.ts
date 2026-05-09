import { prisma } from '../db/prisma';

/**
 * Aggregate statistics for the admin dashboard.
 *
 * Returns:
 *   • user counts (total + breakdown by role)
 *   • course counts (total + breakdown by status)
 *   • submission counts (total / passed / failed / pass-rate)
 *   • daily passing-submission histograms for the last 7 and 30 days
 *   • recent activity (last 24 h submissions, last 7 d new users)
 *   • top users by total achievement points
 *   • course leaderboard (each course → enrolled / completed counts)
 *
 * All aggregations are in-memory after a small batch of Prisma queries —
 * acceptable for the platform's scale (few thousand rows total).
 */
export async function getAdminStats() {
  const now = new Date();
  const oneDayAgo    = new Date(now.getTime() -  1 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    usersByRole,
    coursesByStatus,
    submissionsAggregate,
    submissionsLast24h,
    newUsersLast7Days,
    submissionsLast30Days,
    topUsersRaw,
    courses,
    allSubmissions,
    totalTestCount,
    allTestsWithDiscipline,
  ] = await Promise.all([
    // Users grouped by role
    prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
    }),
    // Courses grouped by status
    prisma.course.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    // Total submissions + passed count
    prisma.testSubmission.groupBy({
      by: ['passed'],
      _count: { _all: true },
    }),
    // Submissions in the last 24 hours
    prisma.testSubmission.count({
      where: { submittedAt: { gte: oneDayAgo } },
    }),
    // New users in the last 7 days
    prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    }),
    // All submissions in the last 30 days (we'll bucket per-day in JS)
    prisma.testSubmission.findMany({
      where: { submittedAt: { gte: thirtyDaysAgo } },
      select: { submittedAt: true, passed: true },
    }),
    // Top users by achievement-point sum
    prisma.achievement.groupBy({
      by: ['userId'],
      _sum: { pointsAwarded: true },
      orderBy: { _sum: { pointsAwarded: 'desc' } },
      take: 5,
    }),
    // For course leaderboard
    prisma.course.findMany({
      select: {
        id: true,
        title: true,
        titleUk: true,
        _count: { select: { progress: true } },
        progress: {
          where: { progressPercent: { gte: 100 } },
          select: { userId: true },
        },
      },
    }),
    // All submissions with scores and discipline chain (for per-user success stats)
    prisma.testSubmission.findMany({
      select: {
        userId: true,
        testId: true,
        passed: true,
        totalScore: true,
        maxScore: true,
        test: {
          select: {
            lesson: {
              select: {
                course: { select: { discipline: true } },
              },
            },
          },
        },
      },
    }),
    // Total number of tests in the platform
    prisma.test.count(),
    // All tests with titles and full chain — for per-discipline counts + test performance table
    prisma.test.findMany({
      select: {
        id: true,
        title: true,
        titleUk: true,
        lesson: {
          select: {
            title: true,
            titleUk: true,
            course: { select: { title: true, titleUk: true, discipline: true } },
          },
        },
      },
    }),
  ]);

  // ── User totals ───────────────────────────────────────────────
  const userRoleMap = Object.fromEntries(
    usersByRole.map((u) => [u.role, u._count._all]),
  );
  const totalUsers = usersByRole.reduce((s, u) => s + u._count._all, 0);

  // ── Course totals ─────────────────────────────────────────────
  const courseStatusMap = Object.fromEntries(
    coursesByStatus.map((c) => [c.status, c._count._all]),
  );
  const totalCourses = coursesByStatus.reduce((s, c) => s + c._count._all, 0);

  // ── Submission totals ─────────────────────────────────────────
  const passedCount = submissionsAggregate.find((s) => s.passed)?._count._all ?? 0;
  const failedCount = submissionsAggregate.find((s) => !s.passed)?._count._all ?? 0;
  const totalSubmissions = passedCount + failedCount;
  const passRate = totalSubmissions > 0 ? passedCount / totalSubmissions : 0;

  // ── Daily buckets (last 30 d → also slice for last 7 d) ──────
  // Each bucket: yyyy-MM-dd → { passed, failed }
  const buckets = new Map<string, { passed: number; failed: number }>();
  // Pre-fill last 30 days so days with zero activity still appear
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    buckets.set(toDayKey(d), { passed: 0, failed: 0 });
  }
  for (const s of submissionsLast30Days) {
    const key = toDayKey(s.submittedAt);
    const b = buckets.get(key);
    if (b) {
      if (s.passed) b.passed++;
      else b.failed++;
    }
  }
  const last30Days = Array.from(buckets.entries()).map(([date, v]) => ({
    date,
    passed: v.passed,
    failed: v.failed,
  }));
  const last7Days = last30Days.slice(-7);

  // ── Per-user success stats + per-discipline per-user breakdown ─
  //
  // scorePercent uses only the *best* attempt per (userId, testId) so retries
  // don't inflate the score sum. The pass/fail attempt counts and touched-test
  // sets use *all* attempts so the display reflects real usage.
  type UserAcc = {
    totalScoreSum: number;   // best-attempt data — for scorePercent
    maxScoreSum: number;
    passedTestIds: Set<string>;
    allPassed: number;       // all-attempt data — for table counts
    allFailed: number;
  };
  type DiscUserAcc = {
    totalScoreSum: number;   // best-attempt data — for scorePercent
    maxScoreSum: number;
    allPassed: number;       // all-attempt data — for display
    allFailed: number;
    touchedTestIds: Set<string>;
  };

  const userAccMap = new Map<string, UserAcc>();
  const discUserMaps = {
    graphTheory:         new Map<string, DiscUserAcc>(),
    numericalMethods:    new Map<string, DiscUserAcc>(),
    optimizationMethods: new Map<string, DiscUserAcc>(),
  };
  const discMatchers: [keyof typeof discUserMaps, string[]][] = [
    ['graphTheory',         ['graph theory']],
    ['numericalMethods',    ['numerical method']],
    ['optimizationMethods', ['optimization method', 'optimisation method']],
  ];

  // Count tests per discipline using the same matchers
  const discTestCounts = { graphTheory: 0, numericalMethods: 0, optimizationMethods: 0 };
  for (const test of allTestsWithDiscipline) {
    const discLower = test.lesson.course.discipline.toLowerCase();
    for (const [key, keywords] of discMatchers) {
      if (keywords.some((k) => discLower.includes(k))) {
        discTestCounts[key]++;
        break;
      }
    }
  }

  const initUserAcc = (): UserAcc => ({
    totalScoreSum: 0, maxScoreSum: 0, passedTestIds: new Set(), allPassed: 0, allFailed: 0,
  });
  const initDiscAcc = (): DiscUserAcc => ({
    totalScoreSum: 0, maxScoreSum: 0, allPassed: 0, allFailed: 0, touchedTestIds: new Set(),
  });

  // Best attempt per (userId, testId) — drives score sums + passedTestIds
  type SubRow = (typeof allSubmissions)[number];
  const bestMap = new Map<string, SubRow>();
  for (const sub of allSubmissions) {
    const key = `${sub.userId}::${sub.testId}`;
    const prev = bestMap.get(key);
    if (!prev || Number(sub.totalScore) > Number(prev.totalScore)) bestMap.set(key, sub);
  }
  const dedupedSubmissions = Array.from(bestMap.values());

  // Loop 1 — best attempts: score sums + passedTestIds
  for (const sub of dedupedSubmissions) {
    if (!userAccMap.has(sub.userId)) userAccMap.set(sub.userId, initUserAcc());
    const acc = userAccMap.get(sub.userId)!;
    acc.totalScoreSum += Number(sub.totalScore);
    acc.maxScoreSum   += Number(sub.maxScore);
    if (sub.passed) acc.passedTestIds.add(sub.testId);

    const discLower = sub.test.lesson.course.discipline.toLowerCase();
    for (const [key, keywords] of discMatchers) {
      if (keywords.some((k) => discLower.includes(k))) {
        const map = discUserMaps[key];
        if (!map.has(sub.userId)) map.set(sub.userId, initDiscAcc());
        const d = map.get(sub.userId)!;
        d.totalScoreSum += Number(sub.totalScore);
        d.maxScoreSum   += Number(sub.maxScore);
        break;
      }
    }
  }

  // Loop 2 — all attempts: pass/fail counts + touched test sets
  for (const sub of allSubmissions) {
    if (!userAccMap.has(sub.userId)) userAccMap.set(sub.userId, initUserAcc());
    const acc = userAccMap.get(sub.userId)!;
    if (sub.passed) acc.allPassed++; else acc.allFailed++;

    const discLower = sub.test.lesson.course.discipline.toLowerCase();
    for (const [key, keywords] of discMatchers) {
      if (keywords.some((k) => discLower.includes(k))) {
        const map = discUserMaps[key];
        if (!map.has(sub.userId)) map.set(sub.userId, initDiscAcc());
        const d = map.get(sub.userId)!;
        d.touchedTestIds.add(sub.testId);
        if (sub.passed) d.allPassed++; else d.allFailed++;
        break;
      }
    }
  }

  // Single user lookup covering all IDs seen in submissions
  const allAccUserIds = Array.from(userAccMap.keys());
  const allAccUsers = allAccUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: allAccUserIds } },
        select: { id: true, fullName: true, email: true, avatarUrl: true },
      })
    : [];
  const accUserById = new Map(allAccUsers.map((u) => [u.id, u]));

  const userSuccessStats = allAccUsers
    .map((u) => {
      const a = userAccMap.get(u.id)!;
      return {
        id:                u.id,
        fullName:          u.fullName,
        email:             u.email,
        avatarUrl:         u.avatarUrl,
        scorePercent:      a.maxScoreSum > 0 ? Math.round((a.totalScoreSum / a.maxScoreSum) * 100) : 0,
        passed:            a.allPassed,
        failed:            a.allFailed,
        uniqueTestsPassed: a.passedTestIds.size,
        totalTests:        totalTestCount,
      };
    })
    .sort((a, b) => b.scorePercent - a.scorePercent || b.passed - a.passed);

  const buildDiscUsers = (map: Map<string, DiscUserAcc>, discTestCount: number) =>
    Array.from(map.entries())
      .map(([userId, d]) => {
        const u = accUserById.get(userId);
        const scorePercent = d.maxScoreSum > 0 ? Math.round((d.totalScoreSum / d.maxScoreSum) * 100) : 0;
        return {
          id:                  userId,
          fullName:            u?.fullName ?? 'Unknown',
          email:               u?.email ?? '',
          avatarUrl:           u?.avatarUrl ?? null,
          scorePercent,
          allPassed:           d.allPassed,
          allFailed:           d.allFailed,
          uniqueTestsTouched:  d.touchedTestIds.size,
          totalTests:          discTestCount,
        };
      })
      .sort((a, b) => b.scorePercent - a.scorePercent || b.allPassed - a.allPassed);

  const disciplineStats = {
    graphTheory:         buildDiscUsers(discUserMaps.graphTheory,         discTestCounts.graphTheory),
    numericalMethods:    buildDiscUsers(discUserMaps.numericalMethods,    discTestCounts.numericalMethods),
    optimizationMethods: buildDiscUsers(discUserMaps.optimizationMethods, discTestCounts.optimizationMethods),
  };

  // ── Per-test submission counts ────────────────────────────────
  const testSubMap = new Map<string, { passed: number; failed: number }>();
  for (const sub of allSubmissions) {
    if (!testSubMap.has(sub.testId)) testSubMap.set(sub.testId, { passed: 0, failed: 0 });
    const entry = testSubMap.get(sub.testId)!;
    if (sub.passed) entry.passed++; else entry.failed++;
  }

  const testStats = allTestsWithDiscipline
    .map((test) => {
      const counts = testSubMap.get(test.id) ?? { passed: 0, failed: 0 };
      const total = counts.passed + counts.failed;
      return {
        id: test.id,
        title: test.title,
        titleUk: test.titleUk,
        lessonTitle: test.lesson.title,
        lessonTitleUk: test.lesson.titleUk,
        courseTitle: test.lesson.course.title,
        courseTitleUk: test.lesson.course.titleUk,
        passed: counts.passed,
        failed: counts.failed,
        total,
        passRate: total > 0 ? counts.passed / total : null,
      };
    })
    .sort((a, b) => {
      // Tests with no submissions go last; otherwise sort by pass rate ascending (hardest first)
      if (a.passRate === null && b.passRate !== null) return 1;
      if (b.passRate === null && a.passRate !== null) return -1;
      if (a.passRate === null && b.passRate === null) return 0;
      return (a.passRate as number) - (b.passRate as number);
    });

  // ── Top users — fetch their names + achievement details ──────
  const topUserIds = topUsersRaw.map((u) => u.userId);
  const [topUserDetails, topUserAchievements] = topUserIds.length
    ? await Promise.all([
        prisma.user.findMany({
          where: { id: { in: topUserIds } },
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        }),
        prisma.achievement.findMany({
          where: { userId: { in: topUserIds } },
          select: { userId: true, category: true },
        }),
      ])
    : [[], []];

  const userById = new Map(topUserDetails.map((u) => [u.id, u]));

  // Count achievements and find favorite category per user
  const achByUser = new Map<string, { count: number; catCounts: Record<string, number> }>();
  for (const ach of topUserAchievements) {
    if (!achByUser.has(ach.userId)) achByUser.set(ach.userId, { count: 0, catCounts: {} });
    const entry = achByUser.get(ach.userId)!;
    entry.count++;
    entry.catCounts[ach.category] = (entry.catCounts[ach.category] ?? 0) + 1;
  }

  const topUsers = topUsersRaw.map((row) => {
    const user = userById.get(row.userId);
    const ach = achByUser.get(row.userId) ?? { count: 0, catCounts: {} };
    const favoriteCategory = Object.entries(ach.catCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return {
      id: row.userId,
      fullName: user?.fullName ?? 'Unknown',
      email: user?.email ?? '',
      avatarUrl: user?.avatarUrl ?? null,
      points: row._sum.pointsAwarded ?? 0,
      achievementCount: ach.count,
      favoriteCategory,
    };
  });

  // ── Course leaderboard ────────────────────────────────────────
  const courseStats = courses.map((c) => ({
    id: c.id,
    title: c.title,
    titleUk: c.titleUk,
    enrolled: c._count.progress,
    completed: c.progress.length,
  }));

  return {
    users: {
      total: totalUsers,
      newLast7Days: newUsersLast7Days,
    },
    courses: {
      total: totalCourses,
      byStatus: {
        DRAFT:     courseStatusMap['DRAFT']     ?? 0,
        PUBLISHED: courseStatusMap['PUBLISHED'] ?? 0,
      },
      leaderboard: courseStats,
    },
    submissions: {
      total: totalSubmissions,
      passed: passedCount,
      failed: failedCount,
      passRate,
      last24h: submissionsLast24h,
      last7Days,
      last30Days,
    },
    topUsers,
    userSuccessStats,
    disciplineStats,
    testStats,
    generatedAt: now.toISOString(),
  };
}

// ── Helpers ──────────────────────────────────────────────────
function toDayKey(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().slice(0, 10); // yyyy-MM-dd
}

// Note on titleUk: Course doesn't currently store a Ukrainian title in
// some schemas. If your schema lacks `titleUk`, drop it from the select
// and from the return shape. (See `prisma/schema.prisma`.)

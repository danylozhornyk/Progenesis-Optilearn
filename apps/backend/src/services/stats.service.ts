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

  // ── Top users — fetch their names ────────────────────────────
  const topUserIds = topUsersRaw.map((u) => u.userId);
  const topUserDetails = topUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: topUserIds } },
        select: { id: true, fullName: true, email: true, avatarUrl: true },
      })
    : [];
  const userById = new Map(topUserDetails.map((u) => [u.id, u]));
  const topUsers = topUsersRaw.map((row) => {
    const user = userById.get(row.userId);
    return {
      id: row.userId,
      fullName: user?.fullName ?? 'Unknown',
      email: user?.email ?? '',
      avatarUrl: user?.avatarUrl ?? null,
      points: row._sum.pointsAwarded ?? 0,
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

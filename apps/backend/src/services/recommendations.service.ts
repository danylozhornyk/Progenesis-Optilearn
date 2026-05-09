import { Prisma } from '../../generated/prisma';
import { prisma } from '../db/prisma';
import { generateRecommendations, type AiAnalysis } from '../ai/recommendations.ai';

export async function generateAndSaveRecommendation(userId: string) {
  // ── Cooldown guard — max one analysis per 30 minutes ─────────
  const recent = await prisma.aiRecommendation.findFirst({
    where: {
      userId,
      createdAt: {
        gte: new Date(Date.now() - 30 * 60 * 1000),
      },
    },
  });

  if (recent) {
    throw new Error(
      'A recommendation was generated recently. Please wait 30 minutes before requesting a new one.'
    );
  }

  // ── Fetch everything needed for the analysis ──────────────────
  const [user, submissions, progress] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    }),
    prisma.testSubmission.findMany({
      where: { userId },
      include: {
        test: {
          select: {
            title: true,
            lesson: {
              select: {
                course: { select: { discipline: true } },
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: 20,
    }),
    prisma.userProgress.findMany({
      where: { userId },
      include: {
        course: { select: { title: true } },
      },
    }),
  ]);

  if (!user) throw new Error('User not found');

  // ── Shape data for the AI prompt ──────────────────────────────
  const userData = {
    fullName: user.fullName,
    submissions: submissions.map((s) => ({
      testTitle: s.test.title,
      topic: s.test.lesson.course.discipline,
      passed: s.passed,
      percentScore: Number(s.percentScore),
      attemptNumber: s.attemptNumber,
      answers: s.answers as { isCorrect: boolean }[],
    })),
    progress: progress.map((p) => ({
      courseTitle: p.course.title,
      progressPercent: Number(p.progressPercent),
    })),
  };

  // ── Compute stats from raw submission data ────────────────────
  const total = submissions.length;
  const avgScore =
    total > 0
      ? Math.round(
          (submissions.reduce((sum, s) => sum + Number(s.percentScore), 0) / total) * 10,
        ) / 10
      : 0;
  const passRate =
    total > 0
      ? Math.round((submissions.filter((s) => s.passed).length / total) * 1000) / 10
      : 0;
  const stats: AiAnalysis['stats'] = { totalAttempts: total, avgScore, passRate };

  // ── Call the AI (returns BOTH English and Ukrainian) ──────────
  const bilingual = await generateRecommendations(userData);

  // ── Merge computed stats into both language versions ──────────
  const analysisEn: AiAnalysis = { ...bilingual.en, stats };
  const analysisUk: AiAnalysis = { ...bilingual.uk, stats };

  // ── Save both language versions to DB ─────────────────────────
  const recommendation = await prisma.aiRecommendation.create({
    data: {
      userId,
      analysis: analysisEn as unknown as Prisma.InputJsonValue,
      analysisUk: analysisUk as unknown as Prisma.InputJsonValue,
    },
  });

  return recommendation;
}

export function getRecommendationsByUser(userId: string) {
  return prisma.aiRecommendation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export function getLatestRecommendation(userId: string) {
  return prisma.aiRecommendation.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

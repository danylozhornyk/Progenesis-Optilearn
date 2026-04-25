import { prisma } from '../db/prisma';
import { generateRecommendations } from '../ai/recommendations.ai';

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
      select: { fullName: true, preferences: true },
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

  // ── Extract language from user preferences ────────────────────
  const preferences = user.preferences as { locale?: string } | null;
  const language = localeToLanguage(preferences?.locale);

  // ── Shape data for the AI prompt ──────────────────────────────
  const userData = {
    fullName: user.fullName,
    language,
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

  // ── Call the AI ───────────────────────────────────────────────
  const analysis = await generateRecommendations(userData);

  // ── Save to DB ────────────────────────────────────────────────
  const recommendation = await prisma.aiRecommendation.create({
    data: {
      userId,
      analysis,
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

// ── Locale to language name mapping ──────────────────────────
function localeToLanguage(locale?: string): string {
  const map: Record<string, string> = {
    uk: 'Ukrainian',
    en: 'English',
    de: 'German',
    fr: 'French',
    pl: 'Polish',
    es: 'Spanish',
  };

  if (!locale) return 'English';
  return map[locale] ?? 'English';
}
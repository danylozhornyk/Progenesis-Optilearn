// Shared types and constants used by the profile page tabs.

export type Tab = 'personal' | 'progress' | 'achievements' | 'recommendations';

// ── AI recommendations ─────────────────────────────────────────

export type RecommendationPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface AiAnalysis {
  overallPerformance: string;
  weakAreas: { topic: string; reason: string }[];
  strongAreas: { topic: string; reason: string }[];
  recommendations: {
    priority: RecommendationPriority;
    action: string;
    reason: string;
  }[];
  nextSteps: string[];
}

export interface AiRecommendation {
  id: string;
  userId: string;
  analysis: AiAnalysis;
  /** Ukrainian version of the same analysis. Null for legacy rows generated before we stored both languages. */
  analysisUk: AiAnalysis | null;
  createdAt: string;
}

export interface CourseProgress {
  courseId: string;
  title: string;
  titleUk: string | null;
  discipline: string;
  disciplineUk: string | null;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  coverImageUrl: string | null;
  totalLessons: number;
  completedLessons: number;
  totalTests: number;
  passedTests: number;
  earnedMarks: number;
  maxMarks: number;
  progressPercent: number;
  totalScore: number;
  enrolled: boolean;
  status: 'NOT_ENROLLED' | 'IN_PROGRESS' | 'COMPLETED';
}

export type AchievementCategory = 'PROGRESS' | 'SKILL' | 'STREAK' | 'SOCIAL';

export interface AchievementDef {
  code: string;
  name: string;
  nameUk: string;
  description: string;
  descriptionUk: string;
  category: AchievementCategory;
  pointsAwarded: number;
  iconUrl: string | null;
}

export interface EarnedAchievement {
  id: string;
  code: string;
  name: string;
  nameUk?: string | null;
  description: string;
  descriptionUk?: string | null;
  category: AchievementCategory;
  iconUrl?: string | null;
  pointsAwarded: number;
  awardedAt: string;
}

export const CATEGORY_GRADIENTS: Record<AchievementCategory, string> = {
  PROGRESS: 'from-amber-400 to-orange-500',
  SKILL: 'from-indigo-400 to-violet-600',
  STREAK: 'from-emerald-400 to-teal-600',
  SOCIAL: 'from-pink-400 to-rose-600',
};

export const CATEGORY_LETTER: Record<AchievementCategory, string> = {
  PROGRESS: 'P',
  SKILL: 'S',
  STREAK: 'R',
  SOCIAL: 'C',
};

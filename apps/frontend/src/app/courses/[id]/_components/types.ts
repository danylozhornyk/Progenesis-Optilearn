// Shared types and constants for the course detail page.

export interface LessonAccess {
  lessonId: string;
  orderIndex: number;
  testCount: number;
  passedTestCount: number;
  allTestsPassed: boolean;
  unlocked: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  titleUk?: string | null;
  orderIndex: number;
  estimatedMinutes: number | null;
  isMandatory: boolean;
}

export interface Course {
  id: string;
  title: string;
  titleUk?: string | null;
  description: string;
  descriptionUk?: string | null;
  discipline: string;
  disciplineUk?: string | null;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  status: 'DRAFT' | 'PUBLISHED';
  coverImageUrl?: string | null;
  author: { id: string; fullName: string };
  lessons: Lesson[];
  createdAt: string;
}

export interface Enrollment {
  enrolled: boolean;
  progressPercent?: number;
  totalScore?: number;
  updatedAt?: string;
}

export const DIFFICULTY_STYLES: Record<Course['difficulty'], string> = {
  BEGINNER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  INTERMEDIATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ADVANCED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

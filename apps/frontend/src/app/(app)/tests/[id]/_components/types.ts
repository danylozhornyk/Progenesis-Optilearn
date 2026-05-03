// Shared types for the test-taking page.

import type { GraphData } from '@/components/GraphRenderer';

export interface Option {
  id: string;
  text: string;
}

export interface HintEntry {
  strength: number;
  text: string;
}

export interface HintResponse {
  hint: HintEntry | null;
  hintUk: HintEntry | null;
  level: number;
  canStrengthen: boolean;
  courseAverage: number;
  baseStrength: number;
}

export interface Task {
  id: string;
  orderIndex: number;
  taskType: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'OPEN_ANSWER';
  statement: string;
  statementUk: string | null;
  options: Option[] | null;
  optionsUk: Option[] | null;
  imageUrl: string | null;
  explanation: string | null;
  explanationUk: string | null;
  maxScore: number;
  hints: HintEntry[] | null;
  hintsUk: HintEntry[] | null;
  graph:
    | (GraphData & {
        id: string;
        title: string | null;
        titleUk: string | null;
      })
    | null;
}

export interface TestData {
  id: string;
  title: string;
  titleUk: string | null;
  description: string | null;
  descriptionUk: string | null;
  timeLimitMin: number | null;
  maxAttempts: number | null;
  passingScore: number;
  lesson: { id: string; title: string; titleUk: string | null; course: { id: string } };
  tasks: Task[];
}

export interface GradedAnswer {
  taskId: string;
  userAnswer: Record<string, unknown>;
  isCorrect: boolean;
  score: number;
}

export interface NewAchievement {
  code: string;
  name: string;
  nameUk: string | null;
  description: string;
  descriptionUk: string | null;
  category: 'PROGRESS' | 'SKILL' | 'STREAK' | 'SOCIAL';
  pointsAwarded: number;
  iconUrl: string | null;
}

export interface SubmissionResult {
  submission: {
    totalScore: number;
    maxScore: number;
    percentScore: number;
    passed: boolean;
    answers: GradedAnswer[];
    test: { title: string; passingScore: number };
  };
  newAchievements: NewAchievement[];
}

export type UserAnswer =
  | { type: 'SINGLE_CHOICE'; selected: string }
  | { type: 'MULTIPLE_CHOICE'; selected: string[] }
  | { type: 'OPEN_ANSWER'; text: string };

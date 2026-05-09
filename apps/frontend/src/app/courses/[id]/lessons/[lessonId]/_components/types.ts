// Shared types for the lesson detail page.
// Must stay in sync with the editor types in:
//   app/(app)/admin/lessons/_components/LessonStructureEditor.tsx

export interface GraphVertex { id: string; label: string; x: number; y: number }
export interface GraphEdge   { source: string; target: string; label?: string; weight?: number }

export type ContentBlock =
  | { type: 'text';  value: string }
  | { type: 'latex'; value: string }
  | { type: 'image'; url: string; caption?: string }
  | { type: 'chart'; chartType: 'bar' | 'line'; title?: string; labels: string[]; data: number[]; color: string }
  // Graph blocks reference a Graph DB row by id; the renderer fetches the
  // row to pull vertices/edges/title at display time.
  | { type: 'graph'; graphId: string };

export interface Lesson {
  id: string;
  title: string;
  titleUk?: string | null;
  orderIndex: number;
  estimatedMinutes: number | null;
  isMandatory: boolean;
  content: ContentBlock[];
  contentUk?: ContentBlock[] | null;
  course: { id: string; title: string; titleUk?: string | null; status: 'DRAFT' | 'PUBLISHED' };
}

export interface Test {
  id: string;
  title: string;
  titleUk?: string | null;
  description?: string | null;
  descriptionUk?: string | null;
  timeLimitMin?: number | null;
  maxAttempts?: number | null;
  passingScore: number;
  _count: { tasks: number };
}

export interface MySubmission {
  id: string;
  testId: string;
  totalScore: number;
  maxScore: number;
  percentScore: number;
  passed: boolean;
  submittedAt: string;
}

export interface LessonAccess {
  lessonId: string;
  orderIndex: number;
  testCount: number;
  passedTestCount: number;
  allTestsPassed: boolean;
  unlocked: boolean;
  testsUnlocked: boolean;
  blockingLessonId: string | null;
}

export type Tab = 'theory' | 'tests';

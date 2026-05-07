/**
 * Shared types for the test structure editor.
 *
 * The wire format (`Api*`) mirrors what the backend sends; the editor
 * format (`Editor*`) merges EN + UK so option IDs line up across locales
 * and `correctAnswer` stays valid in both.
 */

export type TaskType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'OPEN_ANSWER';

// ── Wire format ────────────────────────────────────────────────────────────────
export interface ApiOption { id: string; text: string }
export interface ApiHint   { strength: number; text: string }
export interface ApiGraph {
  id: string;
  title: string | null;
  titleUk: string | null;
  graphType: 'DIRECTED' | 'UNDIRECTED' | 'WEIGHTED' | 'MIXED';
  vertices: unknown;
  edges: unknown;
}
export interface ApiTask {
  id: string;
  taskType: TaskType;
  orderIndex: number;
  statement: string;
  statementUk: string | null;
  options: ApiOption[] | null;
  optionsUk: ApiOption[] | null;
  correctAnswer: string;
  answerTolerance: number | string | null;
  maxScore: number | string;
  imageUrl: string | null;
  explanation: string | null;
  explanationUk: string | null;
  hints: ApiHint[] | null;
  hintsUk: ApiHint[] | null;
  graphId: string | null;
  graph: ApiGraph | null;
}

// ── Hint tiers ────────────────────────────────────────────────────────────────
//
// Three fixed strength tiers — must match the buckets used by the learner-side
// resolver in services/tasks.service.ts → getHintForUser.
export const HINT_TIERS = [
  { strength: 0,   key: 'weak'   },
  { strength: 50,  key: 'medium' },
  { strength: 100, key: 'strong' },
] as const;
export type HintKey     = typeof HINT_TIERS[number]['key'];
export type HintTriplet = Record<HintKey, string>;
export const EMPTY_HINTS: HintTriplet = { weak: '', medium: '', strong: '' };

// ── Editor format ─────────────────────────────────────────────────────────────
export interface EditorOption { id: string; text: string; textUk: string }

/** Vertex / edge shape inside the task editor — mirrors the lesson-blocks
 *  GraphVertex / GraphEdge to keep the two graph editors interchangeable. */
export interface EditorGraphVertex { id: string; label: string; x: number; y: number }
export interface EditorGraphEdge   { source: string; target: string; weight?: number }

/**
 * Editor working state for a task's attached Graph row. `null` when no graph
 * is attached. The `graphId` is the DB row reference; vertices/edges/title/
 * directed are pulled from /graphs/:id on load and PATCHed back on save.
 */
export interface EditorTaskGraph {
  graphId: string;
  title: string;
  titleUk: string;
  directed: boolean;
  vertices: EditorGraphVertex[];
  edges: EditorGraphEdge[];
}

export interface EditorTask {
  taskType: TaskType;
  statement: string;
  statementUk: string;
  imageUrl: string;
  explanation: string;
  explanationUk: string;
  maxScore: string;          // kept as string for the <input type="number">
  options: EditorOption[];   // populated for choice types only
  correctIds: string[];      // option IDs marked correct (any length for MULTI; 0–1 for SINGLE)
  openAnswer: string;        // OPEN_ANSWER correct answer
  answerTolerance: string;   // OPEN_ANSWER numeric tolerance (string for input)
  hints: HintTriplet;        // EN — keyed by tier (weak/medium/strong)
  hintsUk: HintTriplet;      // UK — same shape; empty values fall back to EN
  graph: EditorTaskGraph | null;  // attached graph (optional)
}

// Shared TypeScript types used by both frontend and backend

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface GraphProblem {
  id: string;
  title: string;
  description: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  topic: 'graph-theory' | 'numerical-methods' | 'optimization';
}

export interface GraphNode {
  id: string;
  label: string;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight?: number;
}

export interface TaskSubmission {
  userId: string;
  problemId: string;
  answer: unknown;
  submittedAt: string;
}

export interface TaskResult {
  correct: boolean;
  score: number;
  feedback: string;
  hints?: string[];
}

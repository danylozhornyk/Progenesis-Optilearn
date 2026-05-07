/**
 * Content-block types shared between the editor and the learner-side renderer.
 * Each block has a `type` discriminator + payload fields.
 */

export type TextBlock  = { type: 'text';  value: string };
export type LatexBlock = { type: 'latex'; value: string };
export type ImageBlock = { type: 'image'; url: string; caption?: string };
export type ChartBlock = {
  type: 'chart';
  chartType: 'bar' | 'line';
  title?: string;
  labels: string[];
  data: number[];
  color: string;
};
export type GraphVertex = { id: string; label: string; x: number; y: number };
export type GraphEdge   = { source: string; target: string; weight?: number };

/**
 * Graph blocks reference a row in the `Graph` table by id. The persisted
 * (lesson.content JSON) shape is just `{ type: 'graph', graphId }` — the
 * vertices/edges/title live in the DB row. For convenience the editor
 * hydrates each block with the full graph data on load (so the live
 * preview can render without an extra fetch); those extra fields are
 * stripped out of the lesson payload again on save.
 */
export type GraphBlock  = {
  type: 'graph';
  graphId: string;
  // ── editor-only working state (not persisted in lesson.content) ──
  title?: string | null;
  titleUk?: string | null;
  directed?: boolean;
  vertices?: GraphVertex[];
  edges?: GraphEdge[];
};

export type ContentBlock = TextBlock | LatexBlock | ImageBlock | ChartBlock | GraphBlock;
export type BlockType    = ContentBlock['type'];

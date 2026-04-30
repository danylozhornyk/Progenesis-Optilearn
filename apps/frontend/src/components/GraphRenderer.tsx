'use client';

/**
 * Visual SVG renderer for the `Graph` data model.
 *
 *   - Vertices: { id, label?, x, y, color? }
 *   - Edges:    { source, target, weight?, label? }
 *
 * Handles the four GraphType variants:
 *   - UNDIRECTED  — plain line edges
 *   - DIRECTED    — arrowhead at the target endpoint
 *   - WEIGHTED    — undirected, but draws each edge's weight/label at midpoint
 *   - MIXED       — accepts a per-edge `directed` boolean; falls back to
 *                   directed for edges where we cannot tell.
 *
 * The component auto-fits its viewBox to the vertex coordinates with padding,
 * so any seed graph (whose coords were authored against a 500×400-ish canvas)
 * scales cleanly into whatever container it's dropped into.
 */

export type GraphType = 'DIRECTED' | 'UNDIRECTED' | 'WEIGHTED' | 'MIXED';

export interface GraphVertex {
  id: string;
  label?: string;
  x: number;
  y: number;
  color?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight?: number | string;
  label?: string;
  directed?: boolean; // only used by MIXED graphs
}

export interface GraphData {
  graphType: GraphType;
  vertices: GraphVertex[];
  edges: GraphEdge[];
}

interface Props {
  graph: GraphData;
  /** Display height in px (default 300). Width fills the parent. */
  height?: number;
  /** Optional className for the outer wrapper. */
  className?: string;
  /** Vertex radius in graph-coord units. Default 18. */
  vertexRadius?: number;
}

const DEFAULT_VERTEX_FILL = 'hsl(221 83% 53%)';      // blue-600
const DEFAULT_VERTEX_STROKE = 'hsl(213 94% 78%)';    // blue-300
const EDGE_COLOR = 'hsl(215 20% 55%)';
const EDGE_LABEL_BG = 'hsl(0 0% 100%)';
const EDGE_LABEL_FG = 'hsl(222 47% 11%)';
const VERTEX_LABEL_FG = '#ffffff';

export default function GraphRenderer({
  graph,
  height = 300,
  className = '',
  vertexRadius = 18,
}: Props) {
  const { graphType, vertices, edges } = graph;

  if (!vertices || vertices.length === 0) {
    return (
      <div
        className={`w-full rounded-lg border border-border bg-muted/40 flex items-center justify-center text-xs text-muted-foreground ${className}`}
        style={{ height }}
      >
        Empty graph
      </div>
    );
  }

  // ── Compute viewBox from vertex coordinates ──────────────────
  const padding = vertexRadius * 2 + 8;
  const xs = vertices.map((v) => v.x);
  const ys = vertices.map((v) => v.y);
  const minX = Math.min(...xs) - padding;
  const minY = Math.min(...ys) - padding;
  const maxX = Math.max(...xs) + padding;
  const maxY = Math.max(...ys) + padding;
  const vbWidth = Math.max(1, maxX - minX);
  const vbHeight = Math.max(1, maxY - minY);

  // ── Vertex lookup ────────────────────────────────────────────
  const byId = new Map(vertices.map((v) => [v.id, v]));

  // ── Helpers ──────────────────────────────────────────────────
  const isDirectedGraph = graphType === 'DIRECTED';
  const isMixedGraph = graphType === 'MIXED';
  const isWeightedGraph = graphType === 'WEIGHTED';

  function isEdgeDirected(e: GraphEdge): boolean {
    if (isDirectedGraph) return true;
    if (isMixedGraph) return e.directed !== false; // default true for MIXED
    return false;
  }

  /** Shorten an edge so its tip lands on the circle border, not its center. */
  function endpointOnCircle(
    fromX: number, fromY: number,
    toX: number, toY: number,
    r: number,
  ) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.hypot(dx, dy) || 1;
    return {
      x: toX - (dx / len) * r,
      y: toY - (dy / len) * r,
    };
  }

  function edgeLabel(e: GraphEdge): string | null {
    if (e.label != null && e.label !== '') return String(e.label);
    if (e.weight != null && e.weight !== '') return String(e.weight);
    return null;
  }

  return (
    <div className={`w-full rounded-lg border border-border bg-background overflow-hidden ${className}`} style={{ height }}>
      <svg
        viewBox={`${minX} ${minY} ${vbWidth} ${vbHeight}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
        role="img"
        aria-label={`Graph with ${vertices.length} vertices and ${edges.length} edges`}
      >
        <defs>
          <marker
            id="graph-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_COLOR} />
          </marker>
        </defs>

        {/* ── Edges ─────────────────────────────────────────── */}
        <g>
          {edges.map((edge, i) => {
            const from = byId.get(edge.source);
            const to = byId.get(edge.target);
            if (!from || !to) return null;

            const directed = isEdgeDirected(edge);
            const showLabel = isWeightedGraph || edgeLabel(edge) != null;

            // Self-loop → small circular arc
            if (from.id === to.id) {
              const cx = from.x + vertexRadius * 0.9;
              const cy = from.y - vertexRadius * 1.4;
              const label = edgeLabel(edge);
              return (
                <g key={`e-${i}`}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={vertexRadius * 0.8}
                    fill="none"
                    stroke={EDGE_COLOR}
                    strokeWidth={1.5}
                    markerEnd={directed ? 'url(#graph-arrow)' : undefined}
                  />
                  {showLabel && label && (
                    <EdgeLabel x={cx + vertexRadius} y={cy - vertexRadius} text={label} />
                  )}
                </g>
              );
            }

            // For directed edges, shorten so the arrowhead lands on the circle.
            const end = directed
              ? endpointOnCircle(from.x, from.y, to.x, to.y, vertexRadius + 2)
              : { x: to.x, y: to.y };

            const midX = (from.x + end.x) / 2;
            const midY = (from.y + end.y) / 2;
            const label = edgeLabel(edge);

            return (
              <g key={`e-${i}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={EDGE_COLOR}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  markerEnd={directed ? 'url(#graph-arrow)' : undefined}
                />
                {showLabel && label && (
                  <EdgeLabel x={midX} y={midY} text={label} />
                )}
              </g>
            );
          })}
        </g>

        {/* ── Vertices ───────────────────────────────────────── */}
        <g>
          {vertices.map((v) => {
            const fill = v.color || DEFAULT_VERTEX_FILL;
            return (
              <g key={`v-${v.id}`}>
                <circle
                  cx={v.x}
                  cy={v.y}
                  r={vertexRadius}
                  fill={fill}
                  stroke={DEFAULT_VERTEX_STROKE}
                  strokeWidth={2}
                />
                <text
                  x={v.x}
                  y={v.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={vertexRadius * 0.85}
                  fontWeight={600}
                  fill={VERTEX_LABEL_FG}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {v.label ?? v.id}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

// ── Edge label (a small pill behind the text) ──────────────────

function EdgeLabel({ x, y, text }: { x: number; y: number; text: string }) {
  // Approximate text width — ch-based, good enough for short weights / labels.
  const w = Math.max(text.length * 7 + 8, 18);
  const h = 16;
  return (
    <g transform={`translate(${x - w / 2} ${y - h / 2})`}>
      <rect
        width={w}
        height={h}
        rx={4}
        ry={4}
        fill={EDGE_LABEL_BG}
        stroke={EDGE_COLOR}
        strokeWidth={0.8}
        opacity={0.95}
      />
      <text
        x={w / 2}
        y={h / 2 + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10.5}
        fontWeight={600}
        fill={EDGE_LABEL_FG}
        style={{ userSelect: 'none' }}
      >
        {text}
      </text>
    </g>
  );
}

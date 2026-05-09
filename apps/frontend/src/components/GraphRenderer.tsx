'use client';

import { useRef, useState, useEffect } from 'react';

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
 * mode="explore" (student view): adds pan (drag), zoom (scroll-wheel), and
 * hover tooltips on vertices and edges. mode="static" (default) is the
 * original read-only rendering used by admin previews.
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
  /**
   * "static"  — read-only SVG, no interaction (default, used in admin preview).
   * "explore" — pan, scroll-to-zoom, and hover tooltips for the student view.
   */
  mode?: 'static' | 'explore';
}

const DEFAULT_VERTEX_FILL = 'hsl(221 83% 53%)';
const DEFAULT_VERTEX_STROKE = 'hsl(213 94% 78%)';
const EDGE_COLOR = 'hsl(215 20% 55%)';
const EDGE_LABEL_BG = 'hsl(0 0% 100%)';
const EDGE_LABEL_FG = 'hsl(222 47% 11%)';
const VERTEX_LABEL_FG = '#ffffff';
const HIT_WIDTH = 14; // invisible stroke width for edge hover detection

export default function GraphRenderer({
  graph,
  height = 300,
  className = '',
  vertexRadius = 18,
  mode = 'static',
}: Props) {
  const explore = mode === 'explore';
  const { graphType, vertices, edges } = graph;

  // ── Explore-mode state (always declared — hooks must not be conditional) ──
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; lines: string[] } | null>(null);

  // Non-passive wheel listener so we can preventDefault and avoid page scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !explore) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setZoom(prev => Math.min(4, Math.max(0.2, prev * factor)));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [explore]);

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

  // ── Graph type helpers ───────────────────────────────────────
  const isDirectedGraph = graphType === 'DIRECTED';
  const isMixedGraph = graphType === 'MIXED';
  const isWeightedGraph = graphType === 'WEIGHTED';

  function isEdgeDirected(e: GraphEdge): boolean {
    if (isDirectedGraph) return true;
    if (isMixedGraph) return e.directed !== false;
    return false;
  }

  function endpointOnCircle(
    fromX: number, fromY: number,
    toX: number, toY: number,
    r: number,
  ) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.hypot(dx, dy) || 1;
    return { x: toX - (dx / len) * r, y: toY - (dy / len) * r };
  }

  function edgeLabel(e: GraphEdge): string | null {
    if (e.weight != null && e.weight !== '') return String(e.weight);
    return null;
  }

  // ── Vertex degree for tooltips ───────────────────────────────
  const vertexDegree = new Map<string, number>();
  if (explore) {
    for (const v of vertices) vertexDegree.set(v.id, 0);
    for (const e of edges) {
      vertexDegree.set(e.source, (vertexDegree.get(e.source) ?? 0) + 1);
      if (e.source !== e.target) {
        vertexDegree.set(e.target, (vertexDegree.get(e.target) ?? 0) + 1);
      }
    }
  }

  // ── Tooltip / position helpers ───────────────────────────────
  function getRelPos(e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function showVertexTooltip(e: React.MouseEvent, v: GraphVertex) {
    const pos = getRelPos(e);
    const name = v.label ?? v.id;
    const deg = vertexDegree.get(v.id) ?? 0;
    const degLabel = isDirectedGraph ? `Connections: ${deg}` : `Degree: ${deg}`;
    setTooltip({ x: pos.x + 14, y: pos.y - 10, lines: [name, degLabel] });
  }

  function showEdgeTooltip(e: React.MouseEvent, edge: GraphEdge) {
    const pos = getRelPos(e);
    const fromLabel = byId.get(edge.source)?.label ?? edge.source;
    const toLabel = byId.get(edge.target)?.label ?? edge.target;
    const arrow = isEdgeDirected(edge) ? '→' : '↔';
    const lines: string[] = [`${fromLabel} ${arrow} ${toLabel}`];
    const lbl = edgeLabel(edge);
    if (lbl) lines.push(`Weight: ${lbl}`);
    setTooltip({ x: pos.x + 14, y: pos.y - 10, lines });
  }

  function moveTooltip(e: React.MouseEvent) {
    const pos = getRelPos(e);
    setTooltip(prev => prev ? { ...prev, x: pos.x + 14, y: pos.y - 10 } : null);
  }

  // ── Drag / pan handlers ──────────────────────────────────────
  function handlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) setTooltip(null);
    setPan({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
  }

  function handlePointerUp() {
    dragStart.current = null;
    setIsDragging(false);
  }

  // ── Per-edge hover handler factory ───────────────────────────
  function edgeHandlers(edge: GraphEdge) {
    if (!explore) return {};
    return {
      onMouseEnter: (e: React.MouseEvent) => { e.stopPropagation(); showEdgeTooltip(e, edge); },
      onMouseMove:  (e: React.MouseEvent) => { e.stopPropagation(); moveTooltip(e); },
      onMouseLeave: () => setTooltip(null),
      style: { cursor: 'default' as const },
    };
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`w-full rounded-lg border border-border bg-background overflow-hidden${explore ? ' relative select-none' : ''} ${className}`}
      style={{ height, cursor: explore ? (isDragging ? 'grabbing' : 'grab') : undefined }}
      {...(explore ? {
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp:   handlePointerUp,
        onPointerLeave: handlePointerUp,
      } : {})}
    >
      <svg
        viewBox={`${minX} ${minY} ${vbWidth} ${vbHeight}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
        role="img"
        aria-label={`Graph with ${vertices.length} vertices and ${edges.length} edges`}
        style={explore ? {
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center',
        } : undefined}
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
            const eh = edgeHandlers(edge);

            // Self-loop → small circular arc
            if (from.id === to.id) {
              const cx = from.x + vertexRadius * 0.9;
              const cy = from.y - vertexRadius * 1.4;
              const label = edgeLabel(edge);
              return (
                <g key={`e-${i}`}>
                  <circle
                    cx={cx} cy={cy}
                    r={vertexRadius * 0.8}
                    fill="none"
                    stroke={EDGE_COLOR}
                    strokeWidth={1.5}
                    markerEnd={directed ? 'url(#graph-arrow)' : undefined}
                  />
                  {explore && (
                    <circle
                      cx={cx} cy={cy}
                      r={vertexRadius * 0.8}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={HIT_WIDTH}
                      {...eh}
                    />
                  )}
                  {showLabel && label && (
                    <EdgeLabel x={cx + vertexRadius} y={cy - vertexRadius} text={label} />
                  )}
                </g>
              );
            }

            // Bidirectional parallel edges (A→B and B→A both exist)
            const isParallel = directed && edges.some(
              (e2) => e2.source === edge.target && e2.target === edge.source,
            );

            if (isParallel) {
              const CURVE_OFFSET = vertexRadius * 1.5;
              const dx = to.x - from.x, dy = to.y - from.y;
              const edgeLen = Math.hypot(dx, dy) || 1;
              const ux = dx / edgeLen, uy = dy / edgeLen;
              const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
              const cpx = mx - uy * CURVE_OFFSET, cpy = my + ux * CURVE_OFFSET;
              const sd = { x: cpx - from.x, y: cpy - from.y };
              const sl = Math.hypot(sd.x, sd.y) || 1;
              const x1 = from.x + (sd.x / sl) * vertexRadius;
              const y1 = from.y + (sd.y / sl) * vertexRadius;
              const ed2 = { x: to.x - cpx, y: to.y - cpy };
              const el = Math.hypot(ed2.x, ed2.y) || 1;
              const x2 = to.x - (ed2.x / el) * (vertexRadius + 2);
              const y2 = to.y - (ed2.y / el) * (vertexRadius + 2);
              const d = `M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`;
              const lx = 0.25 * x1 + 0.5 * cpx + 0.25 * x2;
              const ly = 0.25 * y1 + 0.5 * cpy + 0.25 * y2;
              const label = edgeLabel(edge);
              return (
                <g key={`e-${i}`}>
                  <path
                    d={d} fill="none"
                    stroke={EDGE_COLOR} strokeWidth={1.6} strokeLinecap="round"
                    markerEnd="url(#graph-arrow)"
                  />
                  {explore && (
                    <path d={d} fill="none" stroke="transparent" strokeWidth={HIT_WIDTH} {...eh} />
                  )}
                  {showLabel && label && <EdgeLabel x={lx} y={ly} text={label} />}
                </g>
              );
            }

            // Straight edge (default)
            const end = directed
              ? endpointOnCircle(from.x, from.y, to.x, to.y, vertexRadius + 2)
              : { x: to.x, y: to.y };
            const midX = (from.x + end.x) / 2;
            const midY = (from.y + end.y) / 2;
            const label = edgeLabel(edge);

            return (
              <g key={`e-${i}`}>
                <line
                  x1={from.x} y1={from.y} x2={end.x} y2={end.y}
                  stroke={EDGE_COLOR} strokeWidth={1.6} strokeLinecap="round"
                  markerEnd={directed ? 'url(#graph-arrow)' : undefined}
                />
                {explore && (
                  <line
                    x1={from.x} y1={from.y} x2={end.x} y2={end.y}
                    stroke="transparent" strokeWidth={HIT_WIDTH}
                    {...eh}
                  />
                )}
                {showLabel && label && <EdgeLabel x={midX} y={midY} text={label} />}
              </g>
            );
          })}
        </g>

        {/* ── Vertices ───────────────────────────────────────── */}
        <g>
          {vertices.map((v) => {
            const fill = v.color || DEFAULT_VERTEX_FILL;
            return (
              <g
                key={`v-${v.id}`}
                {...(explore ? {
                  onMouseEnter: (e: React.MouseEvent) => { e.stopPropagation(); showVertexTooltip(e, v); },
                  onMouseMove:  (e: React.MouseEvent) => { e.stopPropagation(); moveTooltip(e); },
                  onMouseLeave: () => setTooltip(null),
                  onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
                  style: { cursor: 'default' },
                } : {})}
              >
                <circle
                  cx={v.x} cy={v.y} r={vertexRadius}
                  fill={fill}
                  stroke={DEFAULT_VERTEX_STROKE}
                  strokeWidth={2}
                />
                <text
                  x={v.x} y={v.y}
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

      {/* ── Hover tooltip ──────────────────────────────────────── */}
      {explore && tooltip && (
        <div
          className="pointer-events-none absolute z-50 rounded-md border border-border bg-popover shadow-md px-2.5 py-1.5 text-xs text-popover-foreground"
          style={{ left: tooltip.x, top: tooltip.y, maxWidth: 200 }}
        >
          {tooltip.lines.map((line, i) => (
            <div key={i} className={i === 0 ? 'font-semibold' : 'text-muted-foreground mt-0.5'}>
              {line}
            </div>
          ))}
        </div>
      )}

      {/* ── Zoom indicator ─────────────────────────────────────── */}
      {explore && zoom !== 1 && (
        <div className="pointer-events-none absolute top-2 right-2 rounded border border-border bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {Math.round(zoom * 100)}%
        </div>
      )}

      {/* ── Reset view ─────────────────────────────────────────── */}
      {explore && (pan.x !== 0 || pan.y !== 0 || zoom !== 1) && (
        <button
          className="absolute bottom-2 right-2 rounded border border-border bg-background/80 backdrop-blur-sm px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted transition-colors"
          onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          Reset view
        </button>
      )}

      {/* ── Usage hint (only at default view) ─────────────────── */}
      {explore && pan.x === 0 && pan.y === 0 && zoom === 1 && (
        <div className="pointer-events-none absolute bottom-2 left-2 text-[10px] text-muted-foreground/50">
          Scroll to zoom · Drag to pan
        </div>
      )}
    </div>
  );
}

// ── Edge label (a small pill behind the text) ──────────────────

function EdgeLabel({ x, y, text }: { x: number; y: number; text: string }) {
  const w = Math.max(text.length * 7 + 8, 18);
  const h = 16;
  return (
    <g transform={`translate(${x - w / 2} ${y - h / 2})`} style={{ pointerEvents: 'none' }}>
      <rect
        width={w} height={h} rx={4} ry={4}
        fill={EDGE_LABEL_BG} stroke={EDGE_COLOR} strokeWidth={0.8} opacity={0.95}
      />
      <text
        x={w / 2} y={h / 2 + 1}
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

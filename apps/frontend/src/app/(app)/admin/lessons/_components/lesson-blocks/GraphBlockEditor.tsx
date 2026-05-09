'use client';

/**
 * Interactive SVG graph canvas:
 *   • click empty canvas → adds a vertex
 *   • click a vertex     → selects; click another → connects them with an edge
 *   • drag a vertex      → repositions
 *   • right-click        → deletes the vertex (or edge)
 *
 * The graph data lives on the Graph DB row (block stores only graphId).
 * On lesson load the parent hydrates the block with vertices/edges/title;
 * on save the parent strips those fields back out and PATCHes /graphs/:id.
 */

import { useRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { ContentBlock, GraphBlock, GraphVertex, GraphEdge } from './types';

function runForceLayout(
  vertices: GraphVertex[],
  edges: GraphEdge[],
  CW: number,
  CH: number,
  R: number,
): GraphVertex[] {
  if (vertices.length < 2) return vertices;
  const ITERATIONS = 250;
  const k = Math.sqrt((CW * CH) / vertices.length);
  let temp = Math.min(CW, CH) / 3;
  const cx = CW / 2, cy = CH / 2;

  const pos = vertices.map(v => ({ id: v.id, x: v.x, y: v.y }));

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const disp = pos.map(() => ({ x: 0, y: 0 }));

    // Repulsion between every pair
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = (k * k) / dist;
        const fx = (dx / dist) * f, fy = (dy / dist) * f;
        disp[i].x += fx; disp[i].y += fy;
        disp[j].x -= fx; disp[j].y -= fy;
      }
    }

    // Attraction along edges (spring)
    for (const edge of edges) {
      const si = pos.findIndex(p => p.id === edge.source);
      const ti = pos.findIndex(p => p.id === edge.target);
      if (si < 0 || ti < 0) continue;
      const dx = pos[ti].x - pos[si].x;
      const dy = pos[ti].y - pos[si].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const f = (dist * dist) / k;
      const fx = (dx / dist) * f, fy = (dy / dist) * f;
      disp[si].x += fx; disp[si].y += fy;
      disp[ti].x -= fx; disp[ti].y -= fy;
    }

    // Weak gravity toward canvas center
    for (let i = 0; i < pos.length; i++) {
      disp[i].x += (cx - pos[i].x) * 0.04;
      disp[i].y += (cy - pos[i].y) * 0.04;
    }

    // Apply with temperature cooling and clamp to bounds
    for (let i = 0; i < pos.length; i++) {
      const mag = Math.sqrt(disp[i].x ** 2 + disp[i].y ** 2) || 1;
      pos[i].x += (disp[i].x / mag) * Math.min(mag, temp);
      pos[i].y += (disp[i].y / mag) * Math.min(mag, temp);
      pos[i].x = Math.max(R, Math.min(CW - R, pos[i].x));
      pos[i].y = Math.max(R, Math.min(CH - R, pos[i].y));
    }

    temp *= 0.95;
  }

  return vertices.map((v, i) => ({ ...v, x: Math.round(pos[i].x), y: Math.round(pos[i].y) }));
}

export function GraphBlockEditor({ block, onChange }: { block: GraphBlock; onChange: (b: ContentBlock) => void }) {
  const { t } = useT();
  const svgRef     = useRef<SVGSVGElement>(null);
  const [selected,    setSelected]    = useState<string | null>(null);
  const [dragging,    setDragging]    = useState<string | null>(null);
  const [dragOff,     setDragOff]     = useState({ x: 0, y: 0 });
  const [didDrag,     setDidDrag]     = useState(false);
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);

  const CW = 380, CH = 340, R = 14;

  // Defensive defaults — graph data is hydrated by the parent on load,
  // but the slim persisted shape may still arrive without them.
  const vertices: GraphVertex[] = block.vertices ?? [];
  const edges:    GraphEdge[]   = block.edges    ?? [];
  const directed = block.directed ?? false;
  const title    = block.title    ?? '';

  function emit(patch: Partial<GraphBlock>) {
    onChange({ ...block, vertices, edges, directed, title, ...patch });
  }

  function svgXY(e: React.MouseEvent): { x: number; y: number } {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left)  / rect.width)  * CW),
      y: Math.round(((e.clientY - rect.top)   / rect.height) * CH),
    };
  }

  function handleCanvasClick(e: React.MouseEvent) {
    if (didDrag) { setDidDrag(false); return; }
    const { x, y } = svgXY(e);
    const id = `v${Date.now()}`;
    emit({ vertices: [...vertices, { id, label: String(vertices.length + 1), x, y }] });
    setSelected(null);
  }

  function handleVertexClick(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (didDrag) { setDidDrag(false); return; }
    if (!selected) {
      setSelected(id);
    } else if (selected === id) {
      setSelected(null);
    } else {
      const exists = edges.some(
        ed => (ed.source === selected && ed.target === id) ||
              (!directed && ed.source === id && ed.target === selected),
      );
      if (!exists) emit({ edges: [...edges, { source: selected, target: id }] });
      setSelected(null);
    }
  }

  function handleVertexMouseDown(e: React.MouseEvent, id: string) {
    e.preventDefault(); e.stopPropagation();
    const { x, y } = svgXY(e);
    const v = vertices.find(v => v.id === id)!;
    setDragging(id);
    setDragOff({ x: x - v.x, y: y - v.y });
    setDidDrag(false);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    setDidDrag(true);
    const { x, y } = svgXY(e);
    const nx = Math.max(R, Math.min(CW - R, x - dragOff.x));
    const ny = Math.max(R, Math.min(CH - R, y - dragOff.y));
    emit({ vertices: vertices.map(v => v.id === dragging ? { ...v, x: nx, y: ny } : v) });
  }

  function handleMouseUp() { setDragging(null); }

  function handleVertexCtx(e: React.MouseEvent, id: string) {
    e.preventDefault();
    emit({
      vertices: vertices.filter(v => v.id !== id),
      edges:    edges.filter(ed => ed.source !== id && ed.target !== id),
    });
    if (selected === id) setSelected(null);
  }

  function handleEdgeCtx(e: React.MouseEvent, idx: number) {
    e.preventDefault();
    emit({ edges: edges.filter((_, i) => i !== idx) });
  }

  function renameVertex(id: string, label: string) {
    emit({ vertices: vertices.map(v => v.id === id ? { ...v, label } : v) });
  }

  function handleAutoLayout() {
    if (vertices.length < 2) return;
    emit({ vertices: runForceLayout(vertices, edges, CW, CH, R) });
  }

  const vMap = new Map(vertices.map(v => [v.id, v]));
  const selectedLabel = vertices.find(v => v.id === selected)?.label ?? '';

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={title ?? ''}
          onChange={(e) => emit({ title: e.target.value })}
          placeholder={t('admin.lessonEditor.graphTitlePlaceholder')}
        />
        <label className="flex items-center gap-2 h-9 text-sm cursor-pointer">
          <input
            type="checkbox" checked={directed}
            onChange={(e) => emit({ directed: e.target.checked })}
            className="h-4 w-4"
          />
          <span className="text-muted-foreground">{t('admin.lessonEditor.directedGraph')}</span>
        </label>
      </div>

      {/* Canvas */}
      <div className="rounded-md border-2 border-input overflow-hidden bg-muted/30">
        <div className="px-3 py-1.5 bg-muted/25 border-b border-border text-xs text-muted-foreground flex items-center gap-2">
          {selected
            ? <>
                <span className="text-amber-600 dark:text-amber-400">
                  {t('admin.lessonEditor.vertexSelected', { label: selectedLabel })}
                </span>
                <button onClick={() => setSelected(null)} className="ml-auto hover:text-foreground">
                  {t('admin.lessonEditor.cancelEdge')}
                </button>
              </>
            : <>
                <span>{t('admin.lessonEditor.graphCanvasHint')}</span>
                {vertices.length >= 2 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAutoLayout(); }}
                    className="ml-auto shrink-0 px-2 py-0.5 rounded border border-border hover:bg-muted hover:text-foreground transition-colors"
                    title={t('admin.lessonEditor.autoLayout')}
                  >
                    {t('admin.lessonEditor.autoLayout')}
                  </button>
                )}
              </>
          }
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${CW} ${CH}`}
          width={CW} height={CH}
          className="w-full cursor-crosshair select-none"
          style={{ touchAction: 'none' }}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            <marker id="ge-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" className="fill-muted-foreground" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((edge, i) => {
            const src = vMap.get(edge.source);
            const tgt = vMap.get(edge.target);
            if (!src || !tgt) return null;
            const dx = tgt.x - src.x, dy = tgt.y - src.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const ux = dx / len, uy = dy / len;
            const x1 = src.x + ux * R,  y1 = src.y + uy * R;
            const x2 = tgt.x - ux * (R + (directed ? 4 : 0));
            const y2 = tgt.y - uy * (R + (directed ? 4 : 0));
            const hovered = hoveredEdge === i;
            const strokeCls = hovered ? 'text-foreground' : 'text-muted-foreground';
            const hoverLabel = `${src.label} → ${tgt.label}${edge.weight !== undefined ? ` (${edge.weight})` : ''}`;
            // Curve bidirectional directed edges so both arcs are visually distinct
            const curved = directed && edges.some(
              ed => ed.source === edge.target && ed.target === edge.source,
            );
            if (curved) {
              const OFFSET = 28;
              const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
              const cpx = mx - uy * OFFSET, cpy = my + ux * OFFSET;
              const d = `M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`;
              const lx = 0.25 * x1 + 0.5 * cpx + 0.25 * x2;
              const ly = 0.25 * y1 + 0.5 * cpy + 0.25 * y2;
              return (
                <g key={i} onContextMenu={(e) => handleEdgeCtx(e, i)}
                  onMouseEnter={() => setHoveredEdge(i)} onMouseLeave={() => setHoveredEdge(null)}
                  style={{ cursor: 'context-menu' }}>
                  <path d={d} fill="none" stroke="currentColor" className={strokeCls}
                    strokeWidth={hovered ? 2.5 : 1.5} markerEnd="url(#ge-arrow)"
                  />
                  <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
                  {edge.weight !== undefined && (
                    <text x={lx} y={ly - 4} textAnchor="middle" fontSize={10} className="fill-muted-foreground" style={{ pointerEvents: 'none' }}>
                      {edge.weight}
                    </text>
                  )}
                  {hovered && (
                    <text x={lx} y={ly + (edge.weight !== undefined ? 10 : -4)} textAnchor="middle" fontSize={10}
                      className="fill-foreground" style={{ pointerEvents: 'none', paintOrder: 'stroke', stroke: 'var(--background)', strokeWidth: 3 }}>
                      {hoverLabel}
                    </text>
                  )}
                </g>
              );
            }
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
            return (
              <g key={i} onContextMenu={(e) => handleEdgeCtx(e, i)}
                onMouseEnter={() => setHoveredEdge(i)} onMouseLeave={() => setHoveredEdge(null)}
                style={{ cursor: 'context-menu' }}>
                <line x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="currentColor" className={strokeCls} strokeWidth={hovered ? 2.5 : 1.5}
                  markerEnd={directed ? 'url(#ge-arrow)' : undefined}
                />
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={12} />
                {edge.weight !== undefined && (
                  <text x={mx} y={my - 6} textAnchor="middle" fontSize={10} className="fill-muted-foreground" style={{ pointerEvents: 'none' }}>
                    {edge.weight}
                  </text>
                )}
                {hovered && (
                  <text x={mx} y={my + (edge.weight !== undefined ? 14 : -6)} textAnchor="middle" fontSize={10}
                    className="fill-foreground" style={{ pointerEvents: 'none', paintOrder: 'stroke', stroke: 'var(--background)', strokeWidth: 3 }}>
                    {hoverLabel}
                  </text>
                )}
              </g>
            );
          })}

          {/* Vertices */}
          {vertices.map((v) => {
            const isSel  = selected  === v.id;
            const isDrag = dragging  === v.id;
            return (
              <g
                key={v.id}
                onClick={(e) => handleVertexClick(e, v.id)}
                onMouseDown={(e) => handleVertexMouseDown(e, v.id)}
                onContextMenu={(e) => handleVertexCtx(e, v.id)}
                style={{ cursor: isDrag ? 'grabbing' : 'grab' }}
              >
                <circle
                  cx={v.x} cy={v.y} r={R}
                  className={isSel
                    ? 'fill-primary stroke-primary stroke-2'
                    : 'fill-background stroke-foreground'}
                  strokeWidth={isSel ? 2 : 1.5}
                />
                <text
                  x={v.x} y={v.y + 4}
                  textAnchor="middle" fontSize={11} fontWeight="600"
                  className={isSel ? 'fill-primary-foreground' : 'fill-foreground'}
                  style={{ pointerEvents: 'none' }}
                >
                  {v.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Vertex label editor (collapsible) — lets admin rename vertex labels */}
      {vertices.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground py-0.5">
            {t('admin.lessonEditor.vertexLabels', { count: vertices.length })}
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 pl-2">
            {vertices.map((v) => (
              <div key={v.id} className="flex items-center gap-2">
                <span className="text-muted-foreground tabular-nums shrink-0 w-6 select-none">#</span>
                <Input
                  value={v.label}
                  onChange={(e) => renameVertex(v.id, e.target.value)}
                  placeholder={t('admin.lessonEditor.vertexLabelPlaceholder')}
                  className="h-6 text-xs"
                />
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Edge weight editor (collapsible) */}
      {edges.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground py-0.5">
            {t('admin.lessonEditor.edgeWeights', { count: edges.length })}
          </summary>
          <div className="mt-2 space-y-1.5 pl-2">
            {edges.map((edge, i) => {
              const sLbl = vMap.get(edge.source)?.label ?? edge.source;
              const tLbl = vMap.get(edge.target)?.label ?? edge.target;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20 shrink-0 truncate">{sLbl} → {tLbl}</span>
                  <Input
                    type="number"
                    value={edge.weight ?? ''}
                    onChange={(e) => {
                      const next = [...edges];
                      next[i] = { ...edge, weight: e.target.value ? Number(e.target.value) : undefined };
                      emit({ edges: next });
                    }}
                    placeholder={t('admin.lessonEditor.edgeWeightPlaceholder')}
                    className="h-6 text-xs w-20"
                  />
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}

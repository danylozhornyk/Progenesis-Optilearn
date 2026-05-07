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

export function GraphBlockEditor({ block, onChange }: { block: GraphBlock; onChange: (b: ContentBlock) => void }) {
  const { t } = useT();
  const svgRef     = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOff,  setDragOff]  = useState({ x: 0, y: 0 });
  const [didDrag,  setDidDrag]  = useState(false);

  const CW = 380, CH = 220, R = 14;

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
      <div className="rounded-md border border-border overflow-hidden bg-muted/5">
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
            : <span>{t('admin.lessonEditor.graphCanvasHint')}</span>
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
                <g key={i} onContextMenu={(e) => handleEdgeCtx(e, i)} style={{ cursor: 'context-menu' }}>
                  <path d={d} fill="none" stroke="currentColor" className="text-muted-foreground" strokeWidth={1.5}
                    markerEnd="url(#ge-arrow)"
                  />
                  <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
                  {edge.weight !== undefined && (
                    <text x={lx} y={ly - 4} textAnchor="middle" fontSize={10} className="fill-muted-foreground" style={{ pointerEvents: 'none' }}>
                      {edge.weight}
                    </text>
                  )}
                </g>
              );
            }
            return (
              <g key={i} onContextMenu={(e) => handleEdgeCtx(e, i)} style={{ cursor: 'context-menu' }}>
                <line x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="currentColor" className="text-muted-foreground" strokeWidth={1.5}
                  markerEnd={directed ? 'url(#ge-arrow)' : undefined}
                />
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={12} />
                {edge.weight !== undefined && (
                  <text x={(x1+x2)/2} y={(y1+y2)/2 - 6} textAnchor="middle" fontSize={10} className="fill-muted-foreground" style={{ pointerEvents: 'none' }}>
                    {edge.weight}
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

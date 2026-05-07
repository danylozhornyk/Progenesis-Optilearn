'use client';

import { useT } from '@/lib/i18n';
import { GraphBlock } from './types';

/**
 * Read-only SVG graph renderer used by both the editor preview pane and the
 * learner-side ContentRenderer. Auto-scales vertices to fit the viewbox.
 */
export function GraphSvg({ block }: { block: GraphBlock }) {
  const { t } = useT();
  const W = 320, H = 200, R = 14;
  const vertices = block.vertices ?? [];
  const edges    = block.edges    ?? [];
  const directed = block.directed ?? false;
  if (!vertices.length) return <p className="text-xs italic text-muted-foreground">{t('admin.lessonEditor.noVertices')}</p>;

  const xs = vertices.map(v => v.x);
  const ys = vertices.map(v => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const PAD  = 28;
  const sx   = (maxX > minX) ? (W - PAD * 2) / (maxX - minX) : 1;
  const sy   = (maxY > minY) ? (H - PAD * 2) / (maxY - minY) : 1;
  const s    = Math.min(sx, sy, 2);
  const ox   = PAD + ((W - PAD * 2) - (maxX - minX) * s) / 2;
  const oy   = PAD + ((H - PAD * 2) - (maxY - minY) * s) / 2;

  const px = (x: number) => ox + (x - minX) * s;
  const py = (y: number) => oy + (y - minY) * s;

  const vMap = new Map(vertices.map(v => [v.id, v]));

  return (
    <div className="rounded border border-border p-2 bg-background">
      {block.title && <p className="text-xs font-medium text-center mb-1">{block.title}</p>}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <marker id="gp-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" className="fill-muted-foreground" />
          </marker>
        </defs>
        {edges.map((edge, i) => {
          const src = vMap.get(edge.source);
          const tgt = vMap.get(edge.target);
          if (!src || !tgt) return null;
          const x1o = px(src.x), y1o = py(src.y);
          const x2o = px(tgt.x), y2o = py(tgt.y);
          const dx  = x2o - x1o, dy = y2o - y1o;
          const len = Math.sqrt(dx*dx + dy*dy) || 1;
          const ux  = dx/len, uy = dy/len;
          const x1  = x1o + ux * R, y1 = y1o + uy * R;
          const x2  = x2o - ux * (R + (directed ? 4 : 0));
          const y2  = y2o - uy * (R + (directed ? 4 : 0));
          // Curve bidirectional directed edges so both arcs are visually distinct
          const curved = directed && edges.some(
            ed => ed.source === edge.target && ed.target === edge.source,
          );
          if (curved) {
            const OFFSET = 25;
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
            const cpx = mx - uy * OFFSET, cpy = my + ux * OFFSET;
            const d = `M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`;
            const lx = 0.25 * x1 + 0.5 * cpx + 0.25 * x2;
            const ly = 0.25 * y1 + 0.5 * cpy + 0.25 * y2;
            return (
              <g key={i}>
                <path d={d} fill="none" stroke="currentColor" className="text-muted-foreground" strokeWidth={1.5}
                  markerEnd="url(#gp-arrow)"
                />
                {edge.weight !== undefined && (
                  <text x={lx} y={ly - 4} textAnchor="middle" fontSize={10} className="fill-muted-foreground">
                    {edge.weight}
                  </text>
                )}
              </g>
            );
          }
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="currentColor" className="text-muted-foreground" strokeWidth={1.5}
                markerEnd={directed ? 'url(#gp-arrow)' : undefined}
              />
              {edge.weight !== undefined && (
                <text x={(x1+x2)/2} y={(y1+y2)/2 - 6} textAnchor="middle" fontSize={10} className="fill-muted-foreground">
                  {edge.weight}
                </text>
              )}
            </g>
          );
        })}
        {vertices.map(v => (
          <g key={v.id}>
            <circle cx={px(v.x)} cy={py(v.y)} r={R} className="fill-background stroke-foreground" strokeWidth={1.5} />
            <text x={px(v.x)} y={py(v.y)+4} textAnchor="middle" fontSize={11} fontWeight="600" className="fill-foreground select-none">
              {v.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

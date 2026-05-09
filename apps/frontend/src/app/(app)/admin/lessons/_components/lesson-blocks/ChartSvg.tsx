'use client';

import { useRef, useState } from 'react';
import { ChartBlock } from './types';

/**
 * Pure-SVG chart renderer (bar or line). Re-used by the learner-side
 * ContentRenderer so editor and learner views can't drift.
 *
 * interactive=true (student view): hover over bars / data points to see a
 * tooltip with the label and value. interactive=false (default, admin editor)
 * keeps the original static behaviour.
 */
export function ChartSvg({ block, interactive = false }: { block: ChartBlock; interactive?: boolean }) {
  const W = 320, H = 160, PL = 28, PR = 8, PT = 16, PB = 26;
  const iW = W - PL - PR, iH = H - PT - PB;
  const labels = block.labels ?? [];
  const data   = block.data   ?? [];
  const n      = Math.max(labels.length, data.length, 1);
  const maxV   = Math.max(1, ...data);
  const exp    = Math.pow(10, Math.floor(Math.log10(maxV)));
  const niceMax = Math.ceil(maxV / exp) * exp || 1;

  const ticks = [0, 0.5, 1];

  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<{ idx: number; x: number; y: number } | null>(null);

  function getPos(e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onEnter(e: React.MouseEvent, idx: number) {
    if (!interactive) return;
    const pos = getPos(e);
    setHovered({ idx, x: pos.x, y: pos.y });
  }

  function onMove(e: React.MouseEvent) {
    if (!interactive || !hovered) return;
    const pos = getPos(e);
    setHovered(prev => prev ? { ...prev, x: pos.x, y: pos.y } : null);
  }

  function onLeave() { setHovered(null); }

  const tooltipEl = hovered !== null ? (
    <div
      className="pointer-events-none absolute z-50 rounded-md border border-border bg-popover shadow-md px-2.5 py-1.5 text-xs text-popover-foreground whitespace-nowrap"
      style={{
        left: Math.min(hovered.x + 10, (containerRef.current?.offsetWidth ?? 400) - 130),
        top: Math.max(4, hovered.y - 38),
      }}
    >
      <span className="font-semibold">{labels[hovered.idx] ?? hovered.idx}</span>
      <span className="text-muted-foreground ml-1.5">{data[hovered.idx]}</span>
    </div>
  ) : null;

  if (block.chartType === 'line') {
    const pts = data.slice(0, n).map((v, i) => ({
      x: PL + (n > 1 ? i / (n - 1) : 0.5) * iW,
      y: PT + iH - (v / niceMax) * iH,
    }));
    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return (
      <div
        ref={containerRef}
        className={`rounded border border-border p-2 bg-background${interactive ? ' relative select-none' : ''}`}
      >
        {block.title && <p className="text-xs font-medium text-center mb-1">{block.title}</p>}
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseMove={onMove}>
          {ticks.map(f => {
            const y = PT + iH - f * iH;
            return (
              <g key={f}>
                <line x1={PL} x2={W-PR} y1={y} y2={y} stroke="currentColor" className="text-border" strokeWidth={1} />
                <text x={PL-3} y={y+3} textAnchor="end" fontSize={8} className="fill-muted-foreground">{Math.round(f * niceMax)}</text>
              </g>
            );
          })}
          {pts.length > 1 && (
            <path d={pathD} stroke={block.color} strokeWidth={2} fill="none" strokeLinejoin="round" />
          )}
          {pts.map((p, i) => (
            <g key={i}>
              {/* Invisible wider hit area for easier hover */}
              {interactive && (
                <circle
                  cx={p.x} cy={p.y} r={10}
                  fill="transparent"
                  style={{ cursor: 'crosshair' }}
                  onMouseEnter={(e) => onEnter(e, i)}
                  onMouseLeave={onLeave}
                />
              )}
              <circle
                cx={p.x} cy={p.y}
                r={hovered?.idx === i ? 4.5 : 3}
                fill={block.color}
                style={{ pointerEvents: 'none' }}
              />
              <text
                x={p.x} y={H-PB+14}
                textAnchor="middle" fontSize={8}
                className="fill-muted-foreground"
                style={{ pointerEvents: 'none' }}
              >
                {labels[i] ?? ''}
              </text>
            </g>
          ))}
        </svg>
        {tooltipEl}
      </div>
    );
  }

  // ── Bar chart ────────────────────────────────────────────────
  const bw = iW / n;
  return (
    <div
      ref={containerRef}
      className={`rounded border border-border p-2 bg-background${interactive ? ' relative select-none' : ''}`}
    >
      {block.title && <p className="text-xs font-medium text-center mb-1">{block.title}</p>}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseMove={onMove}>
        {ticks.map(f => {
          const y = PT + iH - f * iH;
          return (
            <g key={f}>
              <line x1={PL} x2={W-PR} y1={y} y2={y} stroke="currentColor" className="text-border" strokeWidth={1} />
              <text x={PL-3} y={y+3} textAnchor="end" fontSize={8} className="fill-muted-foreground">{Math.round(f * niceMax)}</text>
            </g>
          );
        })}
        {data.slice(0, n).map((v, i) => {
          const bh = Math.max(0, (v / niceMax) * iH);
          const x  = PL + i * bw + bw * 0.1;
          const isHov = hovered?.idx === i;
          return (
            <g
              key={i}
              {...(interactive ? {
                onMouseEnter: (e: React.MouseEvent) => onEnter(e, i),
                onMouseLeave: onLeave,
                style: { cursor: 'crosshair' },
              } : {})}
            >
              <rect
                x={x} y={PT + iH - bh}
                width={bw * 0.8} height={bh}
                fill={block.color}
                opacity={interactive ? (isHov ? 1 : 0.78) : 1}
                rx={1.5}
              />
              {/* Highlight ring on hover */}
              {interactive && isHov && (
                <rect
                  x={x} y={PT + iH - bh}
                  width={bw * 0.8} height={bh}
                  fill="none" stroke="white" strokeWidth={1.5} rx={1.5}
                  style={{ pointerEvents: 'none' }}
                />
              )}
              <text
                x={x + bw * 0.4} y={H-PB+14}
                textAnchor="middle" fontSize={8}
                className="fill-muted-foreground"
                style={{ pointerEvents: 'none' }}
              >
                {labels[i] ?? ''}
              </text>
            </g>
          );
        })}
      </svg>
      {tooltipEl}
    </div>
  );
}

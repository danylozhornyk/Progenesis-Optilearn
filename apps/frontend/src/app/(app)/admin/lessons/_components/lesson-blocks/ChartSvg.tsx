'use client';

import { ChartBlock } from './types';

/**
 * Pure-SVG chart renderer (bar or line). Re-used by the learner-side
 * ContentRenderer so editor and learner views can't drift.
 */
export function ChartSvg({ block }: { block: ChartBlock }) {
  const W = 320, H = 160, PL = 28, PR = 8, PT = 16, PB = 26;
  const iW = W - PL - PR, iH = H - PT - PB;
  const labels = block.labels ?? [];
  const data   = block.data   ?? [];
  const n      = Math.max(labels.length, data.length, 1);
  const maxV   = Math.max(1, ...data);
  const exp    = Math.pow(10, Math.floor(Math.log10(maxV)));
  const niceMax = Math.ceil(maxV / exp) * exp || 1;

  const ticks = [0, 0.5, 1];

  if (block.chartType === 'line') {
    const pts = data.slice(0, n).map((v, i) => ({
      x: PL + (n > 1 ? i / (n - 1) : 0.5) * iW,
      y: PT + iH - (v / niceMax) * iH,
    }));
    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return (
      <div className="rounded border border-border p-2 bg-background">
        {block.title && <p className="text-xs font-medium text-center mb-1">{block.title}</p>}
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {ticks.map(f => {
            const y = PT + iH - f * iH;
            return (
              <g key={f}>
                <line x1={PL} x2={W-PR} y1={y} y2={y} stroke="currentColor" className="text-border" strokeWidth={1} />
                <text x={PL-3} y={y+3} textAnchor="end" fontSize={8} className="fill-muted-foreground">{Math.round(f * niceMax)}</text>
              </g>
            );
          })}
          {pts.length > 1 && <path d={pathD} stroke={block.color} strokeWidth={2} fill="none" strokeLinejoin="round" />}
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={3} fill={block.color} />
              <text x={p.x} y={H-PB+14} textAnchor="middle" fontSize={8} className="fill-muted-foreground">{labels[i] ?? ''}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  }

  // Bar chart
  const bw = iW / n;
  return (
    <div className="rounded border border-border p-2 bg-background">
      {block.title && <p className="text-xs font-medium text-center mb-1">{block.title}</p>}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
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
          return (
            <g key={i}>
              <rect x={x} y={PT + iH - bh} width={bw * 0.8} height={bh} fill={block.color} rx={1.5} />
              <text x={x + bw * 0.4} y={H-PB+14} textAnchor="middle" fontSize={8} className="fill-muted-foreground">{labels[i] ?? ''}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

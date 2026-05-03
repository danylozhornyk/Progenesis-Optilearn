'use client';

/**
 * Lesson Structure Editor
 *
 * Full-screen overlay for authoring a lesson's content blocks.
 *
 * Supported block types:
 *   text   — paragraph text
 *   latex  — KaTeX formula (with inline preview)
 *   image  — URL + caption
 *   chart  — bar or line chart (pure SVG)
 *   graph  — graph-theory graph: interactive SVG canvas (click to add
 *            vertices, click two vertices to connect, drag to reposition,
 *            right-click to delete)
 *
 * Layout: left panel = editors, right panel = live preview.
 * Language toggle (EN / UK) switches which content array is being edited.
 */

import { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── Types ──────────────────────────────────────────────────────────────────────

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
export type GraphEdge   = { source: string; target: string; weight?: number; label?: string };
export type GraphBlock  = {
  type: 'graph';
  title?: string;
  directed: boolean;
  vertices: GraphVertex[];
  edges: GraphEdge[];
};
export type ContentBlock = TextBlock | LatexBlock | ImageBlock | ChartBlock | GraphBlock;
type BlockType = ContentBlock['type'];

// ── Helpers ────────────────────────────────────────────────────────────────────

const BLOCK_META: { type: BlockType; label: string }[] = [
  { type: 'text',  label: 'Text'  },
  { type: 'latex', label: 'LaTeX' },
  { type: 'image', label: 'Image' },
  { type: 'chart', label: 'Chart' },
  { type: 'graph', label: 'Graph' },
];

function defaultBlock(type: BlockType): ContentBlock {
  switch (type) {
    case 'text':  return { type: 'text', value: '' };
    case 'latex': return { type: 'latex', value: '' };
    case 'image': return { type: 'image', url: '', caption: '' };
    case 'chart': return {
      type: 'chart', chartType: 'bar', title: '', color: '#6366f1',
      labels: ['A', 'B', 'C', 'D'], data: [4, 7, 3, 6],
    };
    case 'graph': return {
      type: 'graph', title: '', directed: false,
      vertices: [
        { id: 'v1', label: '1', x: 80,  y: 70  },
        { id: 'v2', label: '2', x: 210, y: 45  },
        { id: 'v3', label: '3', x: 270, y: 155 },
        { id: 'v4', label: '4', x: 110, y: 175 },
      ],
      edges: [
        { source: 'v1', target: 'v2' },
        { source: 'v2', target: 'v3' },
        { source: 'v3', target: 'v4' },
        { source: 'v4', target: 'v1' },
      ],
    };
  }
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  lessonId: string;
  lessonTitle: string;
  onClose: () => void;
}

export function LessonStructureEditor({ lessonId, lessonTitle, onClose }: Props) {
  const [locale, setLocale] = useState<'en' | 'uk'>('en');
  const [enBlocks, setEnBlocks] = useState<ContentBlock[]>([]);
  const [ukBlocks, setUkBlocks] = useState<ContentBlock[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [showPrev, setShowPrev] = useState(true);

  const blocks    = locale === 'en' ? enBlocks : ukBlocks;
  const setBlocks = locale === 'en' ? setEnBlocks : setUkBlocks;

  // Load current content
  useEffect(() => {
    setLoading(true);
    api.get<{ content?: unknown; contentUk?: unknown }>(`/lessons/${lessonId}`)
      .then((lesson) => {
        setEnBlocks(Array.isArray(lesson.content)   ? (lesson.content   as ContentBlock[]) : []);
        setUkBlocks(Array.isArray(lesson.contentUk) ? (lesson.contentUk as ContentBlock[]) : []);
      })
      .catch(() => setError('Failed to load lesson content'))
      .finally(() => setLoading(false));
  }, [lessonId]);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/lessons/${lessonId}`, {
        content:   enBlocks,
        contentUk: ukBlocks.length > 0 ? ukBlocks : null,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
      setSaving(false);
    }
  }

  const addBlock       = (type: BlockType)               => setBlocks([...blocks, defaultBlock(type)]);
  const updateBlock    = (i: number, b: ContentBlock)    => setBlocks(blocks.map((x, idx) => idx === i ? b : x));
  const removeBlock    = (i: number)                     => setBlocks(blocks.filter((_, idx) => idx !== i));
  const duplicateBlock = (i: number)                     => {
    const dup  = JSON.parse(JSON.stringify(blocks[i])) as ContentBlock;
    const next = [...blocks];
    next.splice(i + 1, 0, dup);
    setBlocks(next);
  };
  const moveBlock = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-[60] flex flex-col bg-background">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 h-12 border-b border-border shrink-0 bg-background">
        <div className="flex-1 min-w-0">
          <span className="text-xs text-muted-foreground">Edit Structure · </span>
          <span className="text-sm font-semibold">{lessonTitle}</span>
        </div>

        {/* Language tabs */}
        <div className="flex rounded-md bg-muted p-0.5">
          {(['en', 'uk'] as const).map((l) => (
            <button key={l} onClick={() => setLocale(l)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                locale === l
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowPrev(!showPrev)}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
        >
          {showPrev ? 'Hide preview' : 'Show preview'}
        </button>

        {error && (
          <span className="text-xs text-red-500 max-w-[200px] truncate" title={error}>{error}</span>
        )}

        <Button size="sm" variant="ghost" onClick={onClose} disabled={saving} className="text-xs">
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving || loading} className="text-xs">
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : (
        <div className={`flex-1 min-h-0 flex overflow-hidden ${showPrev ? 'divide-x divide-border' : ''}`}>

          {/* Editor panel */}
          <div className={`flex flex-col min-h-0 ${showPrev ? 'w-[58%]' : 'w-full'}`}>

            {/* Add block strip */}
            <div className="flex items-center gap-1.5 px-4 py-2 bg-muted/20 border-b border-border shrink-0 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium mr-1">Add block</span>
              {BLOCK_META.map((bm) => (
                <button
                  key={bm.type}
                  onClick={() => addBlock(bm.type)}
                  className="px-2.5 py-0.5 rounded border border-border bg-background text-xs hover:bg-accent transition-colors"
                >
                  + {bm.label}
                </button>
              ))}
            </div>

            {/* Block list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground select-none">
                  <span className="text-4xl mb-3 opacity-20">⊞</span>
                  <p className="text-sm">No blocks yet.</p>
                  <p className="text-xs mt-1">Use the buttons above to add your first block.</p>
                </div>
              ) : (
                blocks.map((block, i) => (
                  <BlockWrapper
                    key={i}
                    block={block}
                    index={i}
                    total={blocks.length}
                    onChange={(b) => updateBlock(i, b)}
                    onRemove={() => removeBlock(i)}
                    onMoveUp={() => moveBlock(i, -1)}
                    onMoveDown={() => moveBlock(i, 1)}
                    onDuplicate={() => duplicateBlock(i)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Preview panel */}
          {showPrev && (
            <div className="w-[42%] min-h-0 flex flex-col">
              <div className="px-4 py-2 bg-muted/20 border-b border-border shrink-0 flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Preview
                </span>
                <span className="text-xs text-muted-foreground">({locale.toUpperCase()})</span>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {blocks.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nothing to preview yet.</p>
                ) : (
                  <div className="space-y-5 max-w-[520px]">
                    {blocks.map((block, i) => (
                      <BlockPreview key={i} block={block} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Block wrapper (type selector + move/duplicate/delete) ──────────────────────

interface WrapperProps {
  block: ContentBlock;
  index: number;
  total: number;
  onChange: (b: ContentBlock) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
}

function BlockWrapper({ block, index, total, onChange, onRemove, onMoveUp, onMoveDown, onDuplicate }: WrapperProps) {
  function changeType(newType: BlockType) {
    if (newType !== block.type) onChange(defaultBlock(newType));
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/25 border-b border-border">
        <span className="text-xs text-muted-foreground tabular-nums w-5 select-none">{index + 1}.</span>
        <select
          value={block.type}
          onChange={(e) => changeType(e.target.value as BlockType)}
          className="rounded border border-input bg-background px-2 py-0 text-xs h-6 font-medium"
        >
          {BLOCK_META.map(bm => (
            <option key={bm.type} value={bm.type}>{bm.label}</option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-0.5">
          <Icn onClick={onMoveUp}    disabled={index === 0}        title="Move up">↑</Icn>
          <Icn onClick={onMoveDown}  disabled={index === total - 1} title="Move down">↓</Icn>
          <Icn onClick={onDuplicate} title="Duplicate">⧉</Icn>
          <Icn onClick={onRemove} className="text-red-400 hover:!text-red-600" title="Remove">✕</Icn>
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        {block.type === 'text'  && <TextBlockEditor  block={block} onChange={onChange} />}
        {block.type === 'latex' && <LatexBlockEditor block={block} onChange={onChange} />}
        {block.type === 'image' && <ImageBlockEditor block={block} onChange={onChange} />}
        {block.type === 'chart' && <ChartBlockEditor block={block} onChange={onChange} />}
        {block.type === 'graph' && <GraphBlockEditor block={block} onChange={onChange} />}
      </div>
    </div>
  );
}

function Icn({ onClick, disabled, className = '', title, children }: {
  onClick: () => void; disabled?: boolean; className?: string; title?: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      className={`p-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

// ── Type-specific editors ──────────────────────────────────────────────────────

function TextBlockEditor({ block, onChange }: { block: TextBlock; onChange: (b: ContentBlock) => void }) {
  return (
    <textarea
      value={block.value}
      onChange={(e) => onChange({ ...block, value: e.target.value })}
      rows={4}
      placeholder="Enter paragraph text…"
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y min-h-[80px]"
    />
  );
}

function LatexBlockEditor({ block, onChange }: { block: LatexBlock; onChange: (b: ContentBlock) => void }) {
  let previewHtml = '';
  try { previewHtml = katex.renderToString(block.value || '', { throwOnError: false, displayMode: true }); }
  catch { previewHtml = `<code>${block.value}</code>`; }

  return (
    <div className="space-y-2">
      <textarea
        value={block.value}
        onChange={(e) => onChange({ ...block, value: e.target.value })}
        rows={3}
        placeholder={"e.g. \\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}"}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y"
      />
      {block.value && (
        <div
          className="overflow-x-auto rounded border border-border bg-muted/20 py-2 px-3"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )}
    </div>
  );
}

function ImageBlockEditor({ block, onChange }: { block: ImageBlock; onChange: (b: ContentBlock) => void }) {
  return (
    <div className="space-y-2">
      <Input
        value={block.url}
        onChange={(e) => onChange({ ...block, url: e.target.value })}
        placeholder="Image URL — https://…"
      />
      <Input
        value={block.caption ?? ''}
        onChange={(e) => onChange({ ...block, caption: e.target.value })}
        placeholder="Caption (optional)"
      />
      {block.url && (
        <div className="rounded border border-border overflow-hidden bg-muted/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.url} alt={block.caption || ''}
            className="max-h-48 object-contain w-full"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {block.caption && (
            <p className="text-xs text-muted-foreground text-center py-1.5 border-t border-border">{block.caption}</p>
          )}
        </div>
      )}
    </div>
  );
}

function ChartBlockEditor({ block, onChange }: { block: ChartBlock; onChange: (b: ContentBlock) => void }) {
  const labelsText = (block.labels ?? []).join('\n');
  const dataText   = (block.data   ?? []).join('\n');

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Type</span>
          <select
            value={block.chartType}
            onChange={(e) => onChange({ ...block, chartType: e.target.value as 'bar' | 'line' })}
            className="w-full rounded border border-input bg-background px-2 py-1 text-sm h-8"
          >
            <option value="bar">Bar</option>
            <option value="line">Line</option>
          </select>
        </label>
        <label className="block space-y-1 col-span-2">
          <span className="text-xs text-muted-foreground">Title</span>
          <Input value={block.title ?? ''} onChange={(e) => onChange({ ...block, title: e.target.value })} placeholder="Chart title (optional)" />
        </label>
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Labels (one per line)</span>
          <textarea
            value={labelsText}
            onChange={(e) => onChange({ ...block, labels: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
            rows={5}
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm font-mono resize-none"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Values (one per line)</span>
          <textarea
            value={dataText}
            onChange={(e) => onChange({
              ...block,
              data: e.target.value.split('\n').map(s => Number(s.trim())).filter((v, _, arr) => !isNaN(v) && arr.length > 0),
            })}
            rows={5}
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm font-mono resize-none"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Color</span>
          <input
            type="color" value={block.color}
            onChange={(e) => onChange({ ...block, color: e.target.value })}
            className="h-8 w-10 rounded cursor-pointer border border-input"
          />
        </label>
      </div>
    </div>
  );
}

// ── Interactive graph canvas editor ───────────────────────────────────────────

function GraphBlockEditor({ block, onChange }: { block: GraphBlock; onChange: (b: ContentBlock) => void }) {
  const svgRef     = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<string | null>(null); // vertex id for edge creation
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOff,  setDragOff]  = useState({ x: 0, y: 0 });
  const [didDrag,  setDidDrag]  = useState(false);

  const CW = 380, CH = 220, R = 14;

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
    onChange({ ...block, vertices: [...block.vertices, { id, label: String(block.vertices.length + 1), x, y }] });
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
      const exists = block.edges.some(
        ed => (ed.source === selected && ed.target === id) ||
              (!block.directed && ed.source === id && ed.target === selected),
      );
      if (!exists) onChange({ ...block, edges: [...block.edges, { source: selected, target: id }] });
      setSelected(null);
    }
  }

  function handleVertexMouseDown(e: React.MouseEvent, id: string) {
    e.preventDefault(); e.stopPropagation();
    const { x, y } = svgXY(e);
    const v = block.vertices.find(v => v.id === id)!;
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
    onChange({ ...block, vertices: block.vertices.map(v => v.id === dragging ? { ...v, x: nx, y: ny } : v) });
  }

  function handleMouseUp() { setDragging(null); }

  function handleVertexCtx(e: React.MouseEvent, id: string) {
    e.preventDefault();
    onChange({
      ...block,
      vertices: block.vertices.filter(v => v.id !== id),
      edges:    block.edges.filter(ed => ed.source !== id && ed.target !== id),
    });
    if (selected === id) setSelected(null);
  }

  function handleEdgeCtx(e: React.MouseEvent, idx: number) {
    e.preventDefault();
    onChange({ ...block, edges: block.edges.filter((_, i) => i !== idx) });
  }

  const vMap = new Map(block.vertices.map(v => [v.id, v]));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={block.title ?? ''}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder="Graph title (optional)"
        />
        <label className="flex items-center gap-2 h-9 text-sm cursor-pointer">
          <input
            type="checkbox" checked={block.directed}
            onChange={(e) => onChange({ ...block, directed: e.target.checked })}
            className="h-4 w-4"
          />
          <span className="text-muted-foreground">Directed graph</span>
        </label>
      </div>

      {/* Canvas */}
      <div className="rounded-md border border-border overflow-hidden bg-muted/5">
        <div className="px-3 py-1.5 bg-muted/25 border-b border-border text-xs text-muted-foreground flex items-center gap-2">
          {selected
            ? <>
                <span className="text-amber-600 dark:text-amber-400">
                  Vertex &ldquo;{block.vertices.find(v => v.id === selected)?.label}&rdquo; selected
                  &mdash; click another vertex to connect
                </span>
                <button onClick={() => setSelected(null)} className="ml-auto hover:text-foreground">Cancel</button>
              </>
            : <span>Click canvas to add vertex · Click vertex to select · Drag to move · Right-click to delete</span>
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
          {block.edges.map((edge, i) => {
            const src = vMap.get(edge.source);
            const tgt = vMap.get(edge.target);
            if (!src || !tgt) return null;
            const dx = tgt.x - src.x, dy = tgt.y - src.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const ux = dx / len, uy = dy / len;
            const x1 = src.x + ux * R,  y1 = src.y + uy * R;
            const x2 = tgt.x - ux * (R + (block.directed ? 4 : 0));
            const y2 = tgt.y - uy * (R + (block.directed ? 4 : 0));
            return (
              <g key={i} onContextMenu={(e) => handleEdgeCtx(e, i)} style={{ cursor: 'context-menu' }}>
                <line x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="currentColor" className="text-muted-foreground" strokeWidth={1.5}
                  markerEnd={block.directed ? 'url(#ge-arrow)' : undefined}
                />
                {/* Wide invisible hit target */}
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={12} />
                {(edge.weight !== undefined || edge.label) && (
                  <text x={(x1+x2)/2} y={(y1+y2)/2 - 6} textAnchor="middle" fontSize={10} className="fill-muted-foreground" style={{ pointerEvents: 'none' }}>
                    {edge.label ?? edge.weight}
                  </text>
                )}
              </g>
            );
          })}

          {/* Vertices */}
          {block.vertices.map((v) => {
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

      {/* Edge label/weight editor (collapsible) */}
      {block.edges.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground py-0.5">
            Edge labels / weights ({block.edges.length})
          </summary>
          <div className="mt-2 space-y-1.5 pl-2">
            {block.edges.map((edge, i) => {
              const sLbl = vMap.get(edge.source)?.label ?? edge.source;
              const tLbl = vMap.get(edge.target)?.label ?? edge.target;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20 shrink-0 truncate">{sLbl} → {tLbl}</span>
                  <Input
                    value={edge.label ?? ''}
                    onChange={(e) => {
                      const edges = [...block.edges];
                      edges[i] = { ...edge, label: e.target.value || undefined };
                      onChange({ ...block, edges });
                    }}
                    placeholder="label"
                    className="h-6 text-xs w-20"
                  />
                  <Input
                    type="number"
                    value={edge.weight ?? ''}
                    onChange={(e) => {
                      const edges = [...block.edges];
                      edges[i] = { ...edge, weight: e.target.value ? Number(e.target.value) : undefined };
                      onChange({ ...block, edges });
                    }}
                    placeholder="weight"
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

// ── Block preview (right panel) ────────────────────────────────────────────────

export function BlockPreview({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'text':
      return block.value
        ? <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{block.value}</p>
        : <p className="text-xs italic text-muted-foreground">Empty text block</p>;

    case 'latex': {
      if (!block.value) return <p className="text-xs italic text-muted-foreground">Empty LaTeX block</p>;
      let html = '';
      try { html = katex.renderToString(block.value, { throwOnError: false, displayMode: true }); }
      catch { html = `<code>${block.value}</code>`; }
      return <div className="overflow-x-auto text-center py-2" dangerouslySetInnerHTML={{ __html: html }} />;
    }

    case 'image':
      if (!block.url) return <p className="text-xs italic text-muted-foreground">No image URL set</p>;
      return (
        <figure className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.url} alt={block.caption || ''} className="max-w-full rounded-md border border-border mx-auto" />
          {block.caption && <figcaption className="mt-1 text-xs text-muted-foreground">{block.caption}</figcaption>}
        </figure>
      );

    case 'chart':
      return <ChartSvg block={block} />;

    case 'graph':
      return <GraphSvg block={block} />;
  }
}

// ── Chart SVG ─────────────────────────────────────────────────────────────────

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

// ── Graph SVG ─────────────────────────────────────────────────────────────────

export function GraphSvg({ block }: { block: GraphBlock }) {
  const W = 320, H = 200, R = 14;
  if (!block.vertices?.length) return <p className="text-xs italic text-muted-foreground">No vertices</p>;

  const xs = block.vertices.map(v => v.x);
  const ys = block.vertices.map(v => v.y);
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

  const vMap = new Map(block.vertices.map(v => [v.id, v]));

  return (
    <div className="rounded border border-border p-2 bg-background">
      {block.title && <p className="text-xs font-medium text-center mb-1">{block.title}</p>}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <marker id="gp-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" className="fill-muted-foreground" />
          </marker>
        </defs>
        {(block.edges ?? []).map((edge, i) => {
          const src = vMap.get(edge.source);
          const tgt = vMap.get(edge.target);
          if (!src || !tgt) return null;
          const x1o = px(src.x), y1o = py(src.y);
          const x2o = px(tgt.x), y2o = py(tgt.y);
          const dx  = x2o - x1o, dy = y2o - y1o;
          const len = Math.sqrt(dx*dx + dy*dy) || 1;
          const ux  = dx/len, uy = dy/len;
          const x1  = x1o + ux * R, y1 = y1o + uy * R;
          const x2  = x2o - ux * (R + (block.directed ? 4 : 0));
          const y2  = y2o - uy * (R + (block.directed ? 4 : 0));
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="currentColor" className="text-muted-foreground" strokeWidth={1.5}
                markerEnd={block.directed ? 'url(#gp-arrow)' : undefined}
              />
              {(edge.weight !== undefined || edge.label) && (
                <text x={(x1+x2)/2} y={(y1+y2)/2 - 6} textAnchor="middle" fontSize={10} className="fill-muted-foreground">
                  {edge.label ?? edge.weight}
                </text>
              )}
            </g>
          );
        })}
        {block.vertices.map(v => (
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

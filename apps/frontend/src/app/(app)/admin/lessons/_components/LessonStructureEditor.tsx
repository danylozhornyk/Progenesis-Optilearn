'use client';

/**
 * Lesson Structure Editor
 *
 * Full-screen overlay for authoring a lesson's content blocks. The block
 * editors and renderers live in `./lesson-blocks/`; this file is the shell
 * that wires them together (load → edit → save → close).
 *
 * Supported block types:
 *   text   — paragraph text
 *   latex  — KaTeX formula (with inline preview)
 *   image  — URL + caption (with local-file upload)
 *   chart  — bar or line chart (pure SVG)
 *   graph  — graph-theory graph: a reference to a `Graph` DB row by id.
 *            The block stores only `graphId`; the editor hydrates the
 *            vertices/edges/title from /graphs/:id on load and PATCHes
 *            them back on save. New graph blocks POST a fresh Graph row;
 *            removed graph blocks DELETE the row to avoid orphans.
 *
 * Layout: left panel = editors, right panel = live preview.
 * Language toggle (EN / UK) switches which content array is being edited.
 */

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { ContentBlock, BlockType, GraphBlock } from './lesson-blocks/types';
import { BLOCK_TYPES, defaultBlock, DEFAULT_GRAPH_PAYLOAD } from './lesson-blocks/defaults';
import { BlockWrapper } from './lesson-blocks/BlockWrapper';
import { BlockPreview } from './lesson-blocks/BlockPreview';

// Re-export types and the SVG renderers so consumers (ContentRenderer) can
// keep importing them from this module path without churn.
export type { ContentBlock, BlockType, TextBlock, LatexBlock, ImageBlock, ChartBlock, GraphBlock, GraphVertex, GraphEdge } from './lesson-blocks/types';
export { ChartSvg } from './lesson-blocks/ChartSvg';
export { GraphSvg } from './lesson-blocks/GraphSvg';
export { BlockPreview } from './lesson-blocks/BlockPreview';

// Wire shape returned by GET /graphs/:id (only the fields we read here).
interface GraphRow {
  id: string;
  title: string | null;
  titleUk: string | null;
  graphType: 'DIRECTED' | 'UNDIRECTED' | 'WEIGHTED' | 'MIXED';
  vertices: unknown;
  edges: unknown;
}

/**
 * Inflate a slim persisted graph block by fetching its Graph row, so the
 * preview pane and inline editor have full vertices/edges to work with.
 */
async function hydrateGraphBlock(block: GraphBlock): Promise<GraphBlock> {
  if (!block.graphId) return block;
  try {
    const g = await api.get<GraphRow>(`/graphs/${block.graphId}`);
    return {
      ...block,
      title:    g.title ?? '',
      titleUk:  g.titleUk ?? '',
      directed: g.graphType === 'DIRECTED',
      vertices: Array.isArray(g.vertices) ? g.vertices as GraphBlock['vertices'] : [],
      edges:    Array.isArray(g.edges)    ? g.edges    as GraphBlock['edges']    : [],
    };
  } catch {
    // Row deleted out from under us — fall back to the slim block; the
    // preview will simply render "no vertices".
    return block;
  }
}

async function hydrateBlocks(blocks: ContentBlock[]): Promise<ContentBlock[]> {
  return Promise.all(blocks.map(async (b) =>
    b.type === 'graph' ? hydrateGraphBlock(b) : b
  ));
}

/** Strip editor-only fields from each graph block before persisting. */
function slimBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.map((b) => b.type === 'graph' ? { type: 'graph', graphId: b.graphId } : b);
}

/** Hoverable divider between blocks that expands to show "insert block" buttons. */
function InsertZone({ onInsert }: { onInsert: (type: BlockType) => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative flex items-center group">
      {/* Collapsed: full-width clickable strip with a centered "+" label */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title={t('admin.lessonEditor.addBlock')}
          className="flex w-full items-center gap-2 py-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <div className="flex-1 h-px bg-border" />
          <span className="shrink-0 px-2.5 py-0.5 rounded-full border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground text-xs font-bold transition-colors">
            + {t('admin.lessonEditor.addBlock')}
          </span>
          <div className="flex-1 h-px bg-border" />
        </button>
      )}

      {/* Expanded: block type buttons */}
      {open && (
        <div className="flex w-full items-center gap-1.5 px-1 py-1 bg-muted/30 rounded border border-border flex-wrap">
          <span className="text-xs text-muted-foreground font-medium mr-1 shrink-0">
            {t('admin.lessonEditor.addBlock')}:
          </span>
          {BLOCK_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => { onInsert(type); setOpen(false); }}
              className="px-2 py-0.5 rounded border border-border bg-background text-xs hover:bg-accent transition-colors"
            >
              + {t(`admin.lessonEditor.blockTypes.${type}`)}
            </button>
          ))}
          <button
            onClick={() => setOpen(false)}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground px-1"
            title="Close"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

interface Props {
  lessonId: string;
  lessonTitle: string;
  onClose: () => void;
}

export function LessonStructureEditor({ lessonId, lessonTitle, onClose }: Props) {
  const { t } = useT();
  const [locale, setLocale] = useState<'en' | 'uk'>('en');
  const [enBlocks, setEnBlocks] = useState<ContentBlock[]>([]);
  const [ukBlocks, setUkBlocks] = useState<ContentBlock[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [showPrev, setShowPrev] = useState(true);

  const blocks    = locale === 'en' ? enBlocks : ukBlocks;
  const setBlocks = locale === 'en' ? setEnBlocks : setUkBlocks;

  // Load current content + hydrate graph blocks
  useEffect(() => {
    setLoading(true);
    api.get<{ content?: unknown; contentUk?: unknown }>(`/lessons/${lessonId}`)
      .then(async (lesson) => {
        const en = Array.isArray(lesson.content)   ? (lesson.content   as ContentBlock[]) : [];
        const uk = Array.isArray(lesson.contentUk) ? (lesson.contentUk as ContentBlock[]) : [];
        const [enHydrated, ukHydrated] = await Promise.all([hydrateBlocks(en), hydrateBlocks(uk)]);
        setEnBlocks(enHydrated);
        setUkBlocks(ukHydrated);
      })
      .catch(() => setError(t('admin.lessonEditor.errorLoad')))
      .finally(() => setLoading(false));
  }, [lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** PATCH /graphs/:id for every graph block in either locale. */
  async function persistGraphs(allBlocks: ContentBlock[]) {
    const graphBlocks = allBlocks.filter((b): b is GraphBlock => b.type === 'graph' && !!b.graphId);
    await Promise.all(graphBlocks.map((b) =>
      api.patch(`/graphs/${b.graphId}`, {
        title:     b.title?.trim() || null,
        titleUk:   b.titleUk?.trim() || null,
        graphType: b.directed ? 'DIRECTED' : 'UNDIRECTED',
        vertices:  b.vertices ?? [],
        edges:     b.edges ?? [],
      }),
    ));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      // 1. Push graph data to /graphs/:id so DB matches editor state
      await persistGraphs([...enBlocks, ...ukBlocks]);

      // 2. Strip editor-only fields and PATCH the lesson with the slim blocks
      await api.patch(`/lessons/${lessonId}`, {
        content:   slimBlocks(enBlocks),
        contentUk: ukBlocks.length > 0 ? slimBlocks(ukBlocks) : null,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.lessonEditor.errorSave'));
      setSaving(false);
    }
  }

  /**
   * Add a block. Graph blocks first POST a fresh Graph row to get an id,
   * then commit the hydrated block to state.
   */
  async function addBlock(type: BlockType) {
    if (type !== 'graph') {
      setBlocks([...blocks, defaultBlock(type)]);
      return;
    }
    try {
      const created = await api.post<{ id: string }>('/graphs', DEFAULT_GRAPH_PAYLOAD);
      const block: GraphBlock = {
        type: 'graph',
        graphId: created.id,
        title: DEFAULT_GRAPH_PAYLOAD.title,
        titleUk: DEFAULT_GRAPH_PAYLOAD.titleUk,
        directed: false,
        vertices: [...DEFAULT_GRAPH_PAYLOAD.vertices],
        edges:    [...DEFAULT_GRAPH_PAYLOAD.edges],
      };
      setBlocks([...blocks, block]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.lessonEditor.errorSave'));
    }
  }

  /** Insert a block immediately after position `afterIndex`. */
  async function addBlockAfter(afterIndex: number, type: BlockType) {
    if (type !== 'graph') {
      const next = [...blocks];
      next.splice(afterIndex + 1, 0, defaultBlock(type));
      setBlocks(next);
      return;
    }
    try {
      const created = await api.post<{ id: string }>('/graphs', DEFAULT_GRAPH_PAYLOAD);
      const block: GraphBlock = {
        type: 'graph',
        graphId: created.id,
        title: DEFAULT_GRAPH_PAYLOAD.title,
        titleUk: DEFAULT_GRAPH_PAYLOAD.titleUk,
        directed: false,
        vertices: [...DEFAULT_GRAPH_PAYLOAD.vertices],
        edges:    [...DEFAULT_GRAPH_PAYLOAD.edges],
      };
      const next = [...blocks];
      next.splice(afterIndex + 1, 0, block);
      setBlocks(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.lessonEditor.errorSave'));
    }
  }

  const updateBlock    = (i: number, b: ContentBlock)    => setBlocks(blocks.map((x, idx) => idx === i ? b : x));

  /** Delete the underlying Graph row when a graph block is removed. */
  async function removeBlock(i: number) {
    const b = blocks[i];
    setBlocks(blocks.filter((_, idx) => idx !== i));
    if (b.type === 'graph' && b.graphId) {
      // Fire-and-forget; if it fails the row is left orphaned which is harmless.
      api.delete(`/graphs/${b.graphId}`).catch(() => {});
    }
  }

  /**
   * Duplicating a graph block needs a fresh Graph row (otherwise both
   * blocks would point at the same DB row and edits would clobber each
   * other). For non-graph blocks it's a plain deep clone.
   */
  async function duplicateBlock(i: number) {
    const src = blocks[i];
    if (src.type !== 'graph') {
      const dup = JSON.parse(JSON.stringify(src)) as ContentBlock;
      const next = [...blocks];
      next.splice(i + 1, 0, dup);
      setBlocks(next);
      return;
    }
    try {
      const created = await api.post<{ id: string }>('/graphs', {
        graphType: src.directed ? 'DIRECTED' : 'UNDIRECTED',
        title:    src.title ?? '',
        titleUk:  src.titleUk ?? '',
        vertices: src.vertices ?? [],
        edges:    src.edges ?? [],
      });
      const dup: GraphBlock = { ...src, graphId: created.id };
      const next = [...blocks];
      next.splice(i + 1, 0, dup);
      setBlocks(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.lessonEditor.errorSave'));
    }
  }

  const moveBlock = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">

      {/* Spacer: site header (sticky, z-50) renders on top; this reserves its height */}
      <div className="h-14 shrink-0" aria-hidden="true" />

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 h-12 border-b border-border shrink-0 bg-background">
        <div className="flex-1 min-w-0">
          <span className="text-xs text-muted-foreground">{t('admin.lessonEditor.headerTitle')} · </span>
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
          {showPrev ? t('admin.lessonEditor.hidePreview') : t('admin.lessonEditor.showPreview')}
        </button>

        {error && (
          <span className="text-xs text-red-500 max-w-[200px] truncate" title={error}>{error}</span>
        )}

        <Button size="sm" variant="ghost" onClick={onClose} disabled={saving} className="text-xs">
          {t('admin.lessonEditor.cancel')}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving || loading} className="text-xs">
          {saving ? t('admin.lessonEditor.saving') : t('admin.lessonEditor.save')}
        </Button>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          {t('admin.lessonEditor.loading')}
        </div>
      ) : (
        <div className={`flex-1 min-h-0 flex overflow-hidden ${showPrev ? 'divide-x divide-border' : ''}`}>

          {/* Editor panel */}
          <div className={`flex flex-col min-h-0 ${showPrev ? 'w-[58%]' : 'w-full'}`}>

            {/* Add block strip */}
            <div className="flex items-center gap-1.5 px-4 py-2 bg-muted/20 border-b border-border shrink-0 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium mr-1">{t('admin.lessonEditor.addBlock')}</span>
              {BLOCK_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => addBlock(type)}
                  className="px-2.5 py-0.5 rounded border border-border bg-background text-xs hover:bg-accent transition-colors"
                >
                  + {t(`admin.lessonEditor.blockTypes.${type}`)}
                </button>
              ))}
            </div>

            {/* Block list */}
            <div className="flex-1 overflow-y-auto p-4">
              {blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground select-none">
                  <span className="text-4xl mb-3 opacity-20">⊞</span>
                  <p className="text-sm">{t('admin.lessonEditor.noBlocksTitle')}</p>
                  <p className="text-xs mt-1">{t('admin.lessonEditor.noBlocksHint')}</p>
                </div>
              ) : (
                blocks.map((block, i) => (
                  <div key={i}>
                    <BlockWrapper
                      block={block}
                      index={i}
                      total={blocks.length}
                      onChange={(b) => updateBlock(i, b)}
                      onRemove={() => removeBlock(i)}
                      onMoveUp={() => moveBlock(i, -1)}
                      onMoveDown={() => moveBlock(i, 1)}
                      onDuplicate={() => duplicateBlock(i)}
                    />
                    <InsertZone onInsert={(type) => addBlockAfter(i, type)} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Preview panel */}
          {showPrev && (
            <div className="w-[42%] min-h-0 flex flex-col">
              <div className="px-4 py-2 bg-muted/20 border-b border-border shrink-0 flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('admin.lessonEditor.preview')}
                </span>
                <span className="text-xs text-muted-foreground">({locale.toUpperCase()})</span>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {blocks.length} {t(blocks.length === 1 ? 'admin.lessonEditor.blockSingular' : 'admin.lessonEditor.blockPlural')}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {blocks.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">{t('admin.lessonEditor.nothingToPreview')}</p>
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

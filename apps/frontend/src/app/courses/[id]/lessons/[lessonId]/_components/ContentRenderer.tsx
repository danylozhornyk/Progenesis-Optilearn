'use client';

import { useEffect, useState, Fragment } from 'react';
import katex from 'katex';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import GraphRenderer, { GraphData } from '@/components/GraphRenderer';
import type { ContentBlock } from './types';
import { ChartSvg } from '@/app/(app)/admin/lessons/_components/LessonStructureEditor';
import { renderInline } from '@/lib/richText';

/**
 * Renders one display-mode KaTeX equation; falls back to a <code> block when
 * the source can't be parsed.
 */
function LatexBlock({ source }: { source: string }) {
  let html = '';
  try {
    html = katex.renderToString(source, { throwOnError: false, displayMode: true });
  } catch {
    html = `<code>${source}</code>`;
  }
  return (
    <div
      className="my-4 overflow-x-auto text-center py-3"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Lazy graph renderer — fetches /graphs/:id on mount and renders the result
 * via GraphRenderer (the same component the test page uses for Task graphs).
 */
function GraphBlockRenderer({ graphId }: { graphId: string }) {
  const { t, locale } = useT();
  const [graph, setGraph] = useState<(GraphData & { title: string | null; titleUk: string | null }) | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!graphId) { setMissing(true); return; }
    api.get<GraphData & { title: string | null; titleUk: string | null }>(`/graphs/${graphId}`)
      .then(setGraph)
      .catch(() => setMissing(true));
  }, [graphId]);

  if (missing) return null;
  if (!graph) {
    return (
      <div
        className="w-full rounded-lg border border-border bg-muted/40 flex items-center justify-center text-xs text-muted-foreground"
        style={{ height: 200 }}
      >
        {t('common.loading')}
      </div>
    );
  }

  const title = (locale === 'uk' && graph.titleUk) ? graph.titleUk : graph.title;
  return (
    <div className="space-y-1.5 my-2 flex flex-col items-center">
      <GraphRenderer graph={graph} height={280} mode="explore" />
      {title && (
        <p className="text-[11px] text-muted-foreground italic text-center">{title}</p>
      )}
    </div>
  );
}

/**
 * Parses a plain-text block value into paragraphs and lists.
 *
 * Rules (applied line by line):
 *   - Blank line           → ends the current segment
 *   - Line starting with   `- `, `* `, or `+ ` → unordered list item
 *   - Line starting with   `\d+. `              → ordered list item
 *   - Everything else      → paragraph (consecutive lines joined with <br>)
 */
function renderTextBlock(value: string) {
  type Seg =
    | { type: 'p';  lines: string[] }
    | { type: 'ul'; items: string[] }
    | { type: 'ol'; items: string[] };

  const segments: Seg[] = [];
  let cur: Seg | null = null;

  for (const raw of value.split('\n')) {
    if (raw.trim() === '') { cur = null; continue; }

    const ul = raw.match(/^[-*+]\s+(.*)/);
    const ol = raw.match(/^\d+\.\s+(.*)/);

    if (ul) {
      if (cur?.type !== 'ul') { cur = { type: 'ul', items: [] }; segments.push(cur); }
      cur.items.push(ul[1]);
    } else if (ol) {
      if (cur?.type !== 'ol') { cur = { type: 'ol', items: [] }; segments.push(cur); }
      cur.items.push(ol[1]);
    } else {
      if (cur?.type !== 'p') { cur = { type: 'p', lines: [] }; segments.push(cur); }
      cur.lines.push(raw);
    }
  }

  return segments.map((seg, i) => {
    if (seg.type === 'ul')
      return (
        <ul key={i} className="list-disc list-outside pl-5 space-y-1 text-sm text-muted-foreground leading-relaxed text-justify">
          {seg.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
        </ul>
      );
    if (seg.type === 'ol')
      return (
        <ol key={i} className="list-decimal list-outside pl-5 space-y-1 text-sm text-muted-foreground leading-relaxed text-justify">
          {seg.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
        </ol>
      );
    return (
      <p key={i} className="text-sm text-muted-foreground leading-relaxed text-justify">
        {seg.lines.map((line, j) => (
          <Fragment key={j}>{j > 0 && <br />}{renderInline(line)}</Fragment>
        ))}
      </p>
    );
  });
}

/**
 * Renders the lesson body — supports text, latex, image, chart and graph blocks.
 */
export function ContentRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'latex':
            return <LatexBlock key={i} source={block.value} />;

          case 'image':
            return (
              <figure key={i} className="my-2 space-y-1 flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={block.url}
                  alt={block.caption ?? ''}
                  className="max-w-full rounded border border-border"
                />
                {block.caption && (
                  <figcaption className="text-xs text-muted-foreground text-center">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );

          case 'chart':
            return (
              <div key={i} className="my-2">
                <ChartSvg block={block} interactive />
              </div>
            );

          case 'graph':
            return <GraphBlockRenderer key={i} graphId={block.graphId} />;

          default:
            // 'text' and any unknown future types
            return (
              <div key={i} className="space-y-3">
                {renderTextBlock((block as { value: string }).value)}
              </div>
            );
        }
      })}
    </div>
  );
}

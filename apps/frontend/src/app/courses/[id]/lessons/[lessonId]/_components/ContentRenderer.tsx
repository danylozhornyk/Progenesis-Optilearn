'use client';

import { useEffect, useState } from 'react';
import katex from 'katex';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import GraphRenderer, { GraphData } from '@/components/GraphRenderer';
import type { ContentBlock } from './types';
import { ChartSvg } from '@/app/(app)/admin/lessons/_components/LessonStructureEditor';

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
    <div className="space-y-1.5 my-2">
      <GraphRenderer graph={graph} height={280} />
      {title && (
        <p className="text-[11px] text-muted-foreground italic text-center">{title}</p>
      )}
    </div>
  );
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
              <figure key={i} className="my-2 space-y-1">
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
                <ChartSvg block={block} />
              </div>
            );

          case 'graph':
            return <GraphBlockRenderer key={i} graphId={block.graphId} />;

          default:
            // 'text' and any unknown future types
            return (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                {(block as { value: string }).value}
              </p>
            );
        }
      })}
    </div>
  );
}

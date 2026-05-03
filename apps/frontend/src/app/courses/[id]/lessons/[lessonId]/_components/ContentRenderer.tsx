'use client';

import katex from 'katex';
import type { ContentBlock } from './types';
import { ChartSvg, GraphSvg } from '@/app/(app)/admin/lessons/_components/LessonStructureEditor';

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
            return (
              <div key={i} className="my-2">
                <GraphSvg block={block} />
              </div>
            );

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

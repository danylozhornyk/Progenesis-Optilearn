'use client';

import { Fragment } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useT } from '@/lib/i18n';
import { renderInline } from '@/lib/richText';
import { ContentBlock } from './types';
import { ChartSvg } from './ChartSvg';
import { GraphSvg } from './GraphSvg';

/** Right-panel preview renderer for a single block. */
export function BlockPreview({ block }: { block: ContentBlock }) {
  const { t } = useT();

  switch (block.type) {
    case 'text': {
      if (!block.value) return <p className="text-xs italic text-muted-foreground">{t('admin.lessonEditor.emptyText')}</p>;

      type Seg = { type: 'p'; lines: string[] } | { type: 'ul'; items: string[] } | { type: 'ol'; items: string[] };
      const segs: Seg[] = [];
      let cur: Seg | null = null;
      for (const raw of block.value.split('\n')) {
        if (raw.trim() === '') { cur = null; continue; }
        const ul = raw.match(/^[-*+]\s+(.*)/);
        const ol = raw.match(/^\d+\.\s+(.*)/);
        if (ul) {
          if (cur?.type !== 'ul') { cur = { type: 'ul', items: [] }; segs.push(cur); }
          (cur as { type: 'ul'; items: string[] }).items.push(ul[1]);
        } else if (ol) {
          if (cur?.type !== 'ol') { cur = { type: 'ol', items: [] }; segs.push(cur); }
          (cur as { type: 'ol'; items: string[] }).items.push(ol[1]);
        } else {
          if (cur?.type !== 'p') { cur = { type: 'p', lines: [] }; segs.push(cur); }
          (cur as { type: 'p'; lines: string[] }).lines.push(raw);
        }
      }
      return (
        <div className="space-y-2">
          {segs.map((seg, i) => {
            if (seg.type === 'ul') return (
              <ul key={i} className="list-disc list-outside pl-5 space-y-0.5 text-sm leading-relaxed text-foreground text-justify">
                {seg.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
              </ul>
            );
            if (seg.type === 'ol') return (
              <ol key={i} className="list-decimal list-outside pl-5 space-y-0.5 text-sm leading-relaxed text-foreground text-justify">
                {seg.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
              </ol>
            );
            return (
              <p key={i} className="text-sm leading-relaxed text-foreground text-justify">
                {seg.lines.map((line, j) => (
                  <Fragment key={j}>{j > 0 && <br />}{renderInline(line)}</Fragment>
                ))}
              </p>
            );
          })}
        </div>
      );
    }

    case 'latex': {
      if (!block.value) return <p className="text-xs italic text-muted-foreground">{t('admin.lessonEditor.emptyLatex')}</p>;
      let html = '';
      try { html = katex.renderToString(block.value, { throwOnError: false, displayMode: true }); }
      catch { html = `<code>${block.value}</code>`; }
      return <div className="overflow-x-auto text-center py-2" dangerouslySetInnerHTML={{ __html: html }} />;
    }

    case 'image':
      if (!block.url) return <p className="text-xs italic text-muted-foreground">{t('admin.lessonEditor.noImageUrl')}</p>;
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

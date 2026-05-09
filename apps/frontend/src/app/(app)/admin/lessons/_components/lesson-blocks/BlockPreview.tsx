'use client';

import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useT } from '@/lib/i18n';
import { ContentBlock } from './types';
import { ChartSvg } from './ChartSvg';
import { GraphSvg } from './GraphSvg';

/** Right-panel preview renderer for a single block. */
export function BlockPreview({ block }: { block: ContentBlock }) {
  const { t } = useT();

  switch (block.type) {
    case 'text':
      return block.value
        ? <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{block.value}</p>
        : <p className="text-xs italic text-muted-foreground">{t('admin.lessonEditor.emptyText')}</p>;

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

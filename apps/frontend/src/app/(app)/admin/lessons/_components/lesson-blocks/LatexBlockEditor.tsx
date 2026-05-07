'use client';

import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useT } from '@/lib/i18n';
import { ContentBlock, LatexBlock } from './types';

export function LatexBlockEditor({ block, onChange }: { block: LatexBlock; onChange: (b: ContentBlock) => void }) {
  const { t } = useT();
  let previewHtml = '';
  try { previewHtml = katex.renderToString(block.value || '', { throwOnError: false, displayMode: true }); }
  catch { previewHtml = `<code>${block.value}</code>`; }

  return (
    <div className="space-y-2">
      <textarea
        value={block.value}
        onChange={(e) => onChange({ ...block, value: e.target.value })}
        rows={3}
        placeholder={t('admin.lessonEditor.latexPlaceholder')}
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

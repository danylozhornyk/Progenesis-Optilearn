'use client';

import { useT } from '@/lib/i18n';
import { ContentBlock, TextBlock } from './types';

export function TextBlockEditor({ block, onChange }: { block: TextBlock; onChange: (b: ContentBlock) => void }) {
  const { t } = useT();
  return (
    <textarea
      value={block.value}
      onChange={(e) => onChange({ ...block, value: e.target.value })}
      rows={4}
      placeholder={t('admin.lessonEditor.textPlaceholder')}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y min-h-[80px]"
    />
  );
}

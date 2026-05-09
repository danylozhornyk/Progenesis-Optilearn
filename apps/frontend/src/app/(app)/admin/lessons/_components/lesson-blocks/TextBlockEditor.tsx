'use client';

import { useT } from '@/lib/i18n';
import { RichTextarea } from '@/components/RichTextarea';
import { ContentBlock, TextBlock } from './types';

export function TextBlockEditor({ block, onChange }: { block: TextBlock; onChange: (b: ContentBlock) => void }) {
  const { t } = useT();
  return (
    <RichTextarea
      value={block.value}
      onChange={(v) => onChange({ ...block, value: v })}
      rows={4}
      placeholder={t('admin.lessonEditor.textPlaceholder')}
    />
  );
}

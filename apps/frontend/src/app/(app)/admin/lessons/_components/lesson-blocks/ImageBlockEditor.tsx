'use client';

import { useT } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { ImageUploadInput } from '@/components/ImageUploadInput';
import { ContentBlock, ImageBlock } from './types';

export function ImageBlockEditor({ block, onChange }: { block: ImageBlock; onChange: (b: ContentBlock) => void }) {
  const { t } = useT();
  return (
    <div className="space-y-2">
      <ImageUploadInput
        value={block.url}
        onChange={(url) => onChange({ ...block, url })}
        placeholder={t('admin.lessonEditor.imagePlaceholder')}
      />
      <Input
        value={block.caption ?? ''}
        onChange={(e) => onChange({ ...block, caption: e.target.value })}
        placeholder={t('admin.lessonEditor.captionPlaceholder')}
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

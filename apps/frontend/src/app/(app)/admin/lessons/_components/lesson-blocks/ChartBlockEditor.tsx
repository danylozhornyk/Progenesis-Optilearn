'use client';

import { useT } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { ContentBlock, ChartBlock } from './types';

export function ChartBlockEditor({ block, onChange }: { block: ChartBlock; onChange: (b: ContentBlock) => void }) {
  const { t } = useT();
  const labelsText = (block.labels ?? []).join('\n');
  const dataText   = (block.data   ?? []).join('\n');

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">{t('admin.lessonEditor.chartType')}</span>
          <select
            value={block.chartType}
            onChange={(e) => onChange({ ...block, chartType: e.target.value as 'bar' | 'line' })}
            className="w-full rounded border border-input bg-background px-2 py-1 text-sm h-8"
          >
            <option value="bar">{t('admin.lessonEditor.chartBar')}</option>
            <option value="line">{t('admin.lessonEditor.chartLine')}</option>
          </select>
        </label>
        <label className="block space-y-1 col-span-2">
          <span className="text-xs text-muted-foreground">{t('admin.lessonEditor.chartTitle')}</span>
          <Input value={block.title ?? ''} onChange={(e) => onChange({ ...block, title: e.target.value })} placeholder={t('admin.lessonEditor.chartTitlePlaceholder')} />
        </label>
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">{t('admin.lessonEditor.chartLabels')}</span>
          <textarea
            value={labelsText}
            onChange={(e) => onChange({ ...block, labels: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
            rows={5}
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm font-mono resize-none"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">{t('admin.lessonEditor.chartValues')}</span>
          <textarea
            value={dataText}
            onChange={(e) => onChange({
              ...block,
              data: e.target.value.split('\n').map(s => Number(s.trim())).filter((v, _, arr) => !isNaN(v) && arr.length > 0),
            })}
            rows={5}
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm font-mono resize-none"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">{t('admin.lessonEditor.chartColor')}</span>
          <input
            type="color" value={block.color}
            onChange={(e) => onChange({ ...block, color: e.target.value })}
            className="h-8 w-10 rounded cursor-pointer border border-input"
          />
        </label>
      </div>
    </div>
  );
}

'use client';

import { useT } from '@/lib/i18n';
import { ContentBlock, BlockType } from './types';
import { BLOCK_TYPES, defaultBlock } from './defaults';
import { Icn } from './Icn';
import { TextBlockEditor }  from './TextBlockEditor';
import { LatexBlockEditor } from './LatexBlockEditor';
import { ImageBlockEditor } from './ImageBlockEditor';
import { ChartBlockEditor } from './ChartBlockEditor';
import { GraphBlockEditor } from './GraphBlockEditor';

interface WrapperProps {
  block: ContentBlock;
  index: number;
  total: number;
  onChange: (b: ContentBlock) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
}

/** Card around any block — type selector + reorder/duplicate/delete toolbar. */
export function BlockWrapper({ block, index, total, onChange, onRemove, onMoveUp, onMoveDown, onDuplicate }: WrapperProps) {
  const { t } = useT();

  function changeType(newType: BlockType) {
    if (newType !== block.type) onChange(defaultBlock(newType));
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/25 border-b border-border">
        <span className="text-xs text-muted-foreground tabular-nums w-5 select-none">{index + 1}.</span>
        <select
          value={block.type}
          onChange={(e) => changeType(e.target.value as BlockType)}
          className="rounded border border-input bg-background px-2 py-0 text-xs h-6 font-medium"
        >
          {BLOCK_TYPES.map(type => (
            <option key={type} value={type}>{t(`admin.lessonEditor.blockTypes.${type}`)}</option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-0.5">
          <Icn onClick={onMoveUp}    disabled={index === 0}        title={t('admin.lessonEditor.moveUp')}>↑</Icn>
          <Icn onClick={onMoveDown}  disabled={index === total - 1} title={t('admin.lessonEditor.moveDown')}>↓</Icn>
          <Icn onClick={onDuplicate} title={t('admin.lessonEditor.duplicate')}>⧉</Icn>
          <Icn onClick={onRemove} className="text-red-400 hover:!text-red-600" title={t('admin.lessonEditor.remove')}>✕</Icn>
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        {block.type === 'text'  && <TextBlockEditor  block={block} onChange={onChange} />}
        {block.type === 'latex' && <LatexBlockEditor block={block} onChange={onChange} />}
        {block.type === 'image' && <ImageBlockEditor block={block} onChange={onChange} />}
        {block.type === 'chart' && <ChartBlockEditor block={block} onChange={onChange} />}
        {block.type === 'graph' && <GraphBlockEditor block={block} onChange={onChange} />}
      </div>
    </div>
  );
}

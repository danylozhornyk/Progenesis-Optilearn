'use client';

/**
 * Per-task editor card — renders one EditorTask. Type selector + question +
 * image + options/open-answer + hints + explanation. All fields are
 * locale-aware via the `locale` prop (driven by the parent's EN/UK toggle).
 */

import { useT } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ImageUploadInput } from '@/components/ImageUploadInput';

import { EditorOption, EditorTask, EditorTaskGraph, TaskType } from './types';
import { newId } from './converters';
import { Field } from './Field';
import { Icn }   from './Icn';
import { HintTiersEditor } from './HintTiersEditor';
import { TaskGraphEditor } from './TaskGraphEditor';

interface Props {
  task: EditorTask;
  index: number;
  total: number;
  locale: 'en' | 'uk';
  onChange: (patch: Partial<EditorTask>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  /** Called when the admin clicks "Attach graph" — creates a Graph row in DB. */
  onAttachGraph: () => void;
  /** Called when the admin clicks "Remove graph" — deletes the Graph row. */
  onDetachGraph: (graphId: string) => void;
}

export function TaskEditor({
  task, index, total, locale, onChange,
  onRemove, onDuplicate, onMoveUp, onMoveDown,
  onAttachGraph, onDetachGraph,
}: Props) {
  const { t } = useT();
  const isUk = locale === 'uk';

  // Task type labels — resolved at render time so they follow the active locale
  const typeLabels: Record<TaskType, string> = {
    SINGLE_CHOICE:   t('admin.testEditor.typeSingle'),
    MULTIPLE_CHOICE: t('admin.testEditor.typeMultiple'),
    OPEN_ANSWER:     t('admin.testEditor.typeOpen'),
  };

  function changeType(newType: TaskType) {
    if (newType === task.taskType) return;
    if (newType === 'OPEN_ANSWER') {
      onChange({ taskType: newType, correctIds: [] });
    } else if (task.taskType === 'OPEN_ANSWER') {
      // Coming from open answer → seed with starter options
      onChange({
        taskType: newType,
        options: task.options.length > 0 ? task.options : [
          { id: newId('o'), text: 'Option A', textUk: '' },
          { id: newId('o'), text: 'Option B', textUk: '' },
        ],
        correctIds: [],
        openAnswer: '',
      });
    } else {
      // Single ↔ Multiple — just trim correctIds to ≤1 if going to SINGLE
      const nextCorrect = newType === 'SINGLE_CHOICE'
        ? task.correctIds.slice(0, 1)
        : task.correctIds;
      onChange({ taskType: newType, correctIds: nextCorrect });
    }
  }

  function setOption(idx: number, patch: Partial<EditorOption>) {
    const next = task.options.map((o, i) => i === idx ? { ...o, ...patch } : o);
    onChange({ options: next });
  }
  function addOption() {
    onChange({
      options: [...task.options, {
        id: newId('o'),
        text: `Option ${String.fromCharCode(65 + task.options.length)}`,
        textUk: '',
      }],
    });
  }
  function removeOption(idx: number) {
    const removedId = task.options[idx]?.id;
    onChange({
      options:    task.options.filter((_, i) => i !== idx),
      correctIds: task.correctIds.filter((id) => id !== removedId),
    });
  }
  function toggleCorrect(optId: string) {
    if (task.taskType === 'SINGLE_CHOICE') {
      onChange({ correctIds: [optId] });
    } else {
      const has = task.correctIds.includes(optId);
      onChange({
        correctIds: has
          ? task.correctIds.filter((id) => id !== optId)
          : [...task.correctIds, optId],
      });
    }
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/25 border-b border-border">
        <span className="text-xs text-muted-foreground tabular-nums w-6 select-none">
          {index + 1}.
        </span>
        <select
          value={task.taskType}
          onChange={(e) => changeType(e.target.value as TaskType)}
          className="rounded border border-input bg-background px-2 py-0 text-xs h-7 font-medium"
        >
          {(Object.keys(typeLabels) as TaskType[]).map((tt) => (
            <option key={tt} value={tt}>{typeLabels[tt]}</option>
          ))}
        </select>

        <label className="ml-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          {t('admin.testEditor.maxScore')}
          <Input
            type="number"
            min={0}
            step={0.5}
            value={task.maxScore}
            onChange={(e) => onChange({ maxScore: e.target.value })}
            className="h-7 w-16 text-xs px-2"
          />
        </label>

        <div className="ml-auto flex items-center gap-0.5">
          <Icn onClick={onMoveUp}    disabled={index === 0}         title={t('admin.testEditor.moveUp')}>↑</Icn>
          <Icn onClick={onMoveDown}  disabled={index === total - 1} title={t('admin.testEditor.moveDown')}>↓</Icn>
          <Icn onClick={onDuplicate} title={t('admin.testEditor.duplicate')}>⧉</Icn>
          <Icn onClick={onRemove}    title={t('admin.testEditor.remove')} className="text-red-400 hover:!text-red-600">✕</Icn>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">

        {/* Statement */}
        <Field label={t('admin.testEditor.questionLabel', { locale: locale.toUpperCase() })}>
          <textarea
            value={isUk ? task.statementUk : task.statement}
            onChange={(e) => onChange(isUk
              ? { statementUk: e.target.value }
              : { statement:   e.target.value })}
            rows={2}
            placeholder={isUk
              ? t('admin.testEditor.questionPlaceholderUk')
              : t('admin.testEditor.questionPlaceholder')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
          />
          {isUk && !task.statementUk && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {t('admin.testEditor.questionUkFallback')}
            </p>
          )}
        </Field>

        {/* Image — same for both locales (URL is not text) */}
        <Field label={t('admin.testEditor.imageLabel')}>
          <ImageUploadInput
            value={task.imageUrl}
            onChange={(url) => onChange({ imageUrl: url })}
            placeholder={t('admin.testEditor.imagePlaceholder')}
          />
          {task.imageUrl && (
            <div className="mt-1.5 rounded border border-border overflow-hidden bg-muted/10 max-w-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={task.imageUrl}
                alt=""
                className="max-h-40 object-contain w-full"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </Field>

        {/* Graph (optional) — references a Graph DB row by id */}
        <Field label={t('admin.testEditor.graphLabel')}>
          {task.graph ? (
            <div className="space-y-2 rounded-md border border-border bg-muted/10 p-3">
              <TaskGraphEditor
                graph={task.graph}
                locale={locale}
                onChange={(next: EditorTaskGraph) => onChange({ graph: next })}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-xs text-red-500 hover:!text-red-700"
                  onClick={() => onDetachGraph(task.graph!.graphId)}
                >
                  {t('admin.testEditor.removeGraph')}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onAttachGraph}
              className="text-xs"
            >
              {t('admin.testEditor.attachGraph')}
            </Button>
          )}
        </Field>

        {/* Choice options */}
        {task.taskType !== 'OPEN_ANSWER' && (
          <Field label={t('admin.testEditor.optionsLabel', { locale: locale.toUpperCase() })}>
            <div className="space-y-1.5">
              {task.options.map((opt, oi) => {
                const isCorrect = task.correctIds.includes(opt.id);
                return (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type={task.taskType === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'}
                      name={`correct-${index}`}
                      checked={isCorrect}
                      onChange={() => toggleCorrect(opt.id)}
                      title={isCorrect ? t('admin.testEditor.correctAnswerTitle') : t('admin.testEditor.markCorrect')}
                      className="h-4 w-4 accent-foreground shrink-0"
                    />
                    <Input
                      value={isUk ? opt.textUk : opt.text}
                      onChange={(e) => setOption(oi, isUk
                        ? { textUk: e.target.value }
                        : { text:   e.target.value })}
                      placeholder={isUk
                        ? t('admin.testEditor.optionPlaceholderUk')
                        : `Option ${String.fromCharCode(65 + oi)}`}
                      className="h-8 text-sm"
                    />
                    <button
                      onClick={() => removeOption(oi)}
                      disabled={task.options.length <= 2}
                      title={t('admin.testEditor.remove')}
                      className="text-sm text-muted-foreground hover:text-red-500 disabled:opacity-25 disabled:cursor-not-allowed px-1"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              <button
                onClick={addOption}
                className="text-xs text-muted-foreground hover:text-foreground py-1"
              >
                {t('admin.testEditor.addOption')}
              </button>
              <p className="text-[11px] text-muted-foreground">
                {task.taskType === 'SINGLE_CHOICE'
                  ? t('admin.testEditor.singleChoiceHint')
                  : t('admin.testEditor.multipleChoiceHint')}
              </p>
            </div>
          </Field>
        )}

        {/* Open answer */}
        {task.taskType === 'OPEN_ANSWER' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('admin.testEditor.correctAnswerLabel')}>
              <Input
                value={task.openAnswer}
                onChange={(e) => onChange({ openAnswer: e.target.value })}
                placeholder={t('admin.testEditor.correctAnswerPlaceholder')}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {t('admin.testEditor.openAnswerHint')}
              </p>
            </Field>
            <Field label={t('admin.testEditor.toleranceLabel')}>
              <Input
                type="number"
                step="any"
                value={task.answerTolerance}
                onChange={(e) => onChange({ answerTolerance: e.target.value })}
                placeholder="0"
              />
            </Field>
          </div>
        )}

        {/* Hints — exactly three strength tiers (0/50/100) */}
        <HintTiersEditor
          hints={task.hints}
          hintsUk={task.hintsUk}
          locale={locale}
          onChange={(patch) => onChange(patch)}
        />

        {/* Explanation */}
        <Field label={t('admin.testEditor.explanationLabel', { locale: locale.toUpperCase() })}>
          <textarea
            value={isUk ? task.explanationUk : task.explanation}
            onChange={(e) => onChange(isUk
              ? { explanationUk: e.target.value }
              : { explanation:   e.target.value })}
            rows={2}
            placeholder={t('admin.testEditor.explanationPlaceholder')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
          />
        </Field>
      </div>
    </div>
  );
}

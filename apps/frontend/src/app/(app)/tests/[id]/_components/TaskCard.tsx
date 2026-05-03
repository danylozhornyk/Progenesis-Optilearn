'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import GraphRenderer from '@/components/GraphRenderer';
import { CheckIcon, XIcon } from './icons';
import type { Task, UserAnswer, GradedAnswer, HintEntry, HintResponse } from './types';

/**
 * One question card. Renders the prompt, optional graph, the appropriate
 * input (single/multiple choice or open answer) and — once `result` is set —
 * a green/red ring plus user-answer / explanation feedback.
 */
export function TaskCard({
  task,
  index,
  answer,
  onChange,
  result,
}: {
  task: Task;
  index: number;
  answer: UserAnswer | undefined;
  onChange: (a: UserAnswer) => void;
  result?: GradedAnswer;
}) {
  const { t, locale } = useT();
  const isCorrect = result?.isCorrect;

  // Hint state — escalates by `level` whenever the user asks for a stronger
  // hint. The shown hint comes from /tasks/:id/hint?level=N.
  const [hintLevel, setHintLevel] = useState(0);
  const [hint, setHint] = useState<HintEntry | null>(null);
  const [hintUk, setHintUk] = useState<HintEntry | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintError, setHintError] = useState('');
  const [canStrengthen, setCanStrengthen] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);

  const hasHints = (task.hints?.length ?? 0) > 0;

  async function requestHint(level: number) {
    setHintLoading(true);
    setHintError('');
    try {
      const res = await api.get<HintResponse>(`/tasks/${task.id}/hint?level=${level}`);
      setHint(res.hint);
      setHintUk(res.hintUk);
      setCanStrengthen(res.canStrengthen);
      setHintLevel(level);
      setHintRequested(true);
    } catch (e) {
      setHintError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setHintLoading(false);
    }
  }

  const localisedHint =
    locale === 'uk' && hintUk?.text ? hintUk.text : hint?.text ?? null;
  const statement = (locale === 'uk' && task.statementUk) ? task.statementUk : task.statement;
  const options = (locale === 'uk' && task.optionsUk) ? task.optionsUk : task.options;
  const explanation = (locale === 'uk' && task.explanationUk) ? task.explanationUk : task.explanation;
  const graphTitle = task.graph
    ? (locale === 'uk' && task.graph.titleUk) ? task.graph.titleUk : task.graph.title
    : null;

  return (
    <div className={`surface p-5 space-y-4 ${
      result !== undefined
        ? isCorrect
          ? 'ring-1 ring-green-400 dark:ring-green-600'
          : 'ring-1 ring-red-400 dark:ring-red-600'
        : ''
    }`}>
      {/* Question header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1">
          <p className="text-xs text-muted-foreground">{t('test.question', { n: index + 1 })}</p>
          <p className="text-sm font-medium text-foreground leading-relaxed">{statement}</p>
        </div>
        {result !== undefined && (
          <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
            isCorrect ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
          }`}>
            {isCorrect ? <CheckIcon /> : <XIcon />}
          </span>
        )}
      </div>

      {/* Question image */}
      {task.imageUrl && (
        <div className="rounded-lg overflow-hidden border border-border bg-muted/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={task.imageUrl}
            alt=""
            className="max-h-80 w-full object-contain"
          />
        </div>
      )}

      {/* Graph visualization */}
      {task.graph && (
        <div className="space-y-1.5">
          <GraphRenderer graph={task.graph} height={280} />
          {graphTitle && (
            <p className="text-[11px] text-muted-foreground italic text-center">
              {graphTitle}
            </p>
          )}
        </div>
      )}

      {/* Options — SINGLE_CHOICE */}
      {task.taskType === 'SINGLE_CHOICE' && options && (
        <div className="space-y-2">
          {options.map((opt) => {
            const selected = answer?.type === 'SINGLE_CHOICE' && answer.selected === opt.id;
            return (
              <label
                key={opt.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  result !== undefined
                    ? 'cursor-default'
                    : 'hover:bg-accent'
                } ${selected ? 'border-foreground bg-accent' : 'border-border'}`}
              >
                <input
                  type="radio"
                  name={`task-${task.id}`}
                  value={opt.id}
                  checked={selected}
                  disabled={result !== undefined}
                  onChange={() => onChange({ type: 'SINGLE_CHOICE', selected: opt.id })}
                  className="accent-foreground"
                />
                <span className="text-sm text-foreground">{opt.text}</span>
              </label>
            );
          })}
        </div>
      )}

      {/* Options — MULTIPLE_CHOICE */}
      {task.taskType === 'MULTIPLE_CHOICE' && options && (
        <div className="space-y-2">
          {options.map((opt) => {
            const selectedList = answer?.type === 'MULTIPLE_CHOICE' ? answer.selected : [];
            const checked = selectedList.includes(opt.id);
            return (
              <label
                key={opt.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  result !== undefined ? 'cursor-default' : 'hover:bg-accent'
                } ${checked ? 'border-foreground bg-accent' : 'border-border'}`}
              >
                <input
                  type="checkbox"
                  value={opt.id}
                  checked={checked}
                  disabled={result !== undefined}
                  onChange={(e) => {
                    const prev = answer?.type === 'MULTIPLE_CHOICE' ? answer.selected : [];
                    const next = e.target.checked
                      ? [...prev, opt.id]
                      : prev.filter((id) => id !== opt.id);
                    onChange({ type: 'MULTIPLE_CHOICE', selected: next });
                  }}
                  className="accent-foreground"
                />
                <span className="text-sm text-foreground">{opt.text}</span>
              </label>
            );
          })}
        </div>
      )}

      {/* Input — OPEN_ANSWER */}
      {task.taskType === 'OPEN_ANSWER' && (
        <input
          type="text"
          value={answer?.type === 'OPEN_ANSWER' ? answer.text : ''}
          disabled={result !== undefined}
          placeholder={t('test.openPlaceholder')}
          onChange={(e) => onChange({ type: 'OPEN_ANSWER', text: e.target.value })}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-60"
        />
      )}

      {/* Hint — only available before submission and only when the task has hints authored */}
      {result === undefined && hasHints && (
        <div className="space-y-2">
          {!hintRequested ? (
            <button
              type="button"
              onClick={() => requestHint(0)}
              disabled={hintLoading}
              className="text-xs font-medium text-foreground hover:underline disabled:opacity-50"
            >
              {hintLoading ? t('test.hintLoading') : t('test.getHint')}
            </button>
          ) : (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2">
              <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                {t('test.hintLabel')}
              </p>
              <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
                {localisedHint}
              </p>
              <div className="flex items-center justify-between gap-3">
                {canStrengthen ? (
                  <button
                    type="button"
                    onClick={() => requestHint(hintLevel + 1)}
                    disabled={hintLoading}
                    className="text-xs font-medium text-amber-900 dark:text-amber-200 hover:underline disabled:opacity-50"
                  >
                    {hintLoading ? t('test.hintLoading') : t('test.strongerHint')}
                  </button>
                ) : (
                  <span className="text-[11px] text-amber-700 dark:text-amber-300/80 italic">
                    {t('test.hintMaxed')}
                  </span>
                )}
              </div>
            </div>
          )}
          {hintError && (
            <p className="text-xs text-red-600 dark:text-red-400">{hintError}</p>
          )}
        </div>
      )}

      {/* Post-submission feedback */}
      {result !== undefined && (
        <div className="space-y-1 pt-2 border-t border-border">
          {!result.isCorrect && task.taskType !== 'OPEN_ANSWER' && options && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t('test.yourAnswer')}:</span>{' '}
              {(() => {
                const sel = result.userAnswer.selected;
                if (Array.isArray(sel)) {
                  return sel.map((id) => options.find((o) => o.id === id)?.text ?? id).join(', ') || '—';
                }
                return options.find((o) => o.id === String(sel))?.text ?? String(sel ?? '—');
              })()}
            </p>
          )}
          {!result.isCorrect && task.taskType === 'OPEN_ANSWER' && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t('test.yourAnswer')}:</span>{' '}
              {String(result.userAnswer.text ?? '—')}
            </p>
          )}
          {explanation && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t('test.explanation')}:</span>{' '}
              {explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

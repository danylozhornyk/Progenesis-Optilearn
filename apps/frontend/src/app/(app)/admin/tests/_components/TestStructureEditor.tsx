'use client';

/**
 * Test Structure Editor
 *
 * Full-screen overlay for authoring a test's tasks (questions).
 *
 * Per task the admin can edit:
 *   • taskType — single choice / multiple choice / open answer
 *   • statement (EN + UK) — the question text
 *   • imageUrl — optional illustration (locale-agnostic — URLs aren't text)
 *   • options (EN + UK) — for choice types; option IDs are shared between
 *                         the EN and UK arrays so correctAnswer stays valid
 *                         in both locales
 *   • correctAnswer — one option ID (single), JSON array of IDs (multiple),
 *                     or free text/number (open)
 *   • answerTolerance — numeric tolerance for OPEN_ANSWER comparisons
 *   • maxScore — points awarded when answered correctly
 *   • explanation (EN + UK) — shown after submission
 *   • hints (EN + UK) — exactly three strength tiers (0 weak / 50 medium /
 *                       100 strong); each tier is one unique hint per locale.
 *                       Empty tiers are dropped on save.
 *
 * Saving sends the whole task list at once via PUT /tasks/test/:testId,
 * which atomically replaces existing tasks for that test.
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── Types ──────────────────────────────────────────────────────────────────────

type TaskType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'OPEN_ANSWER';

/** Wire format coming from / going to the backend. */
interface ApiOption { id: string; text: string }
interface ApiHint   { strength: number; text: string }
interface ApiTask {
  id: string;
  taskType: TaskType;
  orderIndex: number;
  statement: string;
  statementUk: string | null;
  options: ApiOption[] | null;
  optionsUk: ApiOption[] | null;
  correctAnswer: string;
  answerTolerance: number | string | null;
  maxScore: number | string;
  imageUrl: string | null;
  explanation: string | null;
  explanationUk: string | null;
  hints: ApiHint[] | null;
  hintsUk: ApiHint[] | null;
}

// Three fixed hint strength tiers — must match the buckets used by the
// learner-side resolver in services/tasks.service.ts → getHintForUser.
const HINT_TIERS = [
  { strength: 0,   key: 'weak',   label: 'Weak hint',   blurb: 'Subtle nudge — given to learners who are mostly succeeding.' },
  { strength: 50,  key: 'medium', label: 'Medium hint', blurb: 'Moderate help — given to learners with average performance.' },
  { strength: 100, key: 'strong', label: 'Strong hint', blurb: 'Most explicit — given to learners who are struggling.' },
] as const;
type HintKey = typeof HINT_TIERS[number]['key'];
type HintTriplet = Record<HintKey, string>;
const EMPTY_HINTS: HintTriplet = { weak: '', medium: '', strong: '' };

/** Internal editor representation — merges EN + UK so option IDs stay aligned. */
interface EditorOption { id: string; text: string; textUk: string }
interface EditorTask {
  taskType: TaskType;
  statement: string;
  statementUk: string;
  imageUrl: string;
  explanation: string;
  explanationUk: string;
  maxScore: string;          // kept as string for the <input type="number">
  options: EditorOption[];   // populated for choice types only
  correctIds: string[];      // option IDs marked correct (any length for MULTI; 0–1 for SINGLE)
  openAnswer: string;        // OPEN_ANSWER correct answer
  answerTolerance: string;   // OPEN_ANSWER numeric tolerance (string for input)
  hints: HintTriplet;        // EN — keyed by tier (weak/medium/strong)
  hintsUk: HintTriplet;      // UK — same shape; empty values fall back to EN
}

const TASK_TYPE_LABEL: Record<TaskType, string> = {
  SINGLE_CHOICE:   'Single choice',
  MULTIPLE_CHOICE: 'Multiple choice',
  OPEN_ANSWER:     'Open answer',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

let _idCounter = 0;
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(_idCounter++).toString(36)}`;

function defaultTask(): EditorTask {
  return {
    taskType: 'SINGLE_CHOICE',
    statement: '',
    statementUk: '',
    imageUrl: '',
    explanation: '',
    explanationUk: '',
    maxScore: '1',
    options: [
      { id: newId('o'), text: 'Option A', textUk: '' },
      { id: newId('o'), text: 'Option B', textUk: '' },
    ],
    correctIds: [],
    openAnswer: '',
    answerTolerance: '',
    hints:   { ...EMPTY_HINTS },
    hintsUk: { ...EMPTY_HINTS },
  };
}

/**
 * Bucket an array of free-form { strength, text } hints into the three fixed
 * tiers used by the editor. We snap each hint's strength to whichever tier is
 * closest (0/50/100); if multiple hints land in the same bucket the last one
 * wins. This keeps legacy data with arbitrary strengths editable.
 */
function bucketHints(arr: ApiHint[] | null | undefined): HintTriplet {
  const out: HintTriplet = { ...EMPTY_HINTS };
  if (!arr) return out;
  for (const h of arr) {
    const s = Number(h.strength) || 0;
    let best: HintKey = 'weak';
    let bestDist = Infinity;
    for (const tier of HINT_TIERS) {
      const d = Math.abs(s - tier.strength);
      if (d < bestDist) { bestDist = d; best = tier.key; }
    }
    out[best] = h.text ?? '';
  }
  return out;
}

function fromApi(t: ApiTask): EditorTask {
  // Merge options (EN) + optionsUk into one shape with shared IDs. We trust
  // EN as the authoritative ID list and look up UK text by id, falling back
  // to positional matching for legacy rows where IDs may not align.
  const enOpts = t.options ?? [];
  const ukOpts = t.optionsUk ?? [];
  const ukById = new Map(ukOpts.map((o) => [o.id, o.text]));
  const options: EditorOption[] = enOpts.map((o, i) => ({
    id:     o.id,
    text:   o.text,
    textUk: ukById.get(o.id) ?? ukOpts[i]?.text ?? '',
  }));

  let correctIds: string[] = [];
  let openAnswer = '';
  if (t.taskType === 'SINGLE_CHOICE') {
    correctIds = t.correctAnswer ? [t.correctAnswer] : [];
  } else if (t.taskType === 'MULTIPLE_CHOICE') {
    try {
      const parsed = JSON.parse(t.correctAnswer || '[]');
      if (Array.isArray(parsed)) correctIds = parsed.map(String);
    } catch {
      correctIds = [];
    }
  } else {
    openAnswer = t.correctAnswer ?? '';
  }

  return {
    taskType:    t.taskType,
    statement:   t.statement ?? '',
    statementUk: t.statementUk ?? '',
    imageUrl:    t.imageUrl ?? '',
    explanation: t.explanation ?? '',
    explanationUk: t.explanationUk ?? '',
    maxScore:    String(t.maxScore ?? '1'),
    options,
    correctIds,
    openAnswer,
    answerTolerance: t.answerTolerance == null ? '' : String(t.answerTolerance),
    hints:   bucketHints(t.hints),
    hintsUk: bucketHints(t.hintsUk),
  };
}

function toApi(t: EditorTask, orderIndex: number) {
  const isChoice = t.taskType !== 'OPEN_ANSWER';
  const correctAnswer = (() => {
    if (t.taskType === 'SINGLE_CHOICE')   return t.correctIds[0] ?? '';
    if (t.taskType === 'MULTIPLE_CHOICE') return JSON.stringify(t.correctIds);
    return t.openAnswer;
  })();

  const optionsEn = isChoice ? t.options.map((o) => ({ id: o.id, text: o.text })) : null;
  const hasUk = isChoice && t.options.some((o) => o.textUk.trim().length > 0);
  const optionsUk = hasUk ? t.options.map((o) => ({ id: o.id, text: o.textUk })) : null;

  const tolNum = t.answerTolerance.trim() === '' ? null : Number(t.answerTolerance);

  // Emit only the tiers the admin actually filled in. We always emit them in
  // the canonical [weak, medium, strong] order so EN and UK arrays line up.
  const hintsEn = HINT_TIERS
    .map((tier) => ({ strength: tier.strength, text: t.hints[tier.key].trim() }))
    .filter((h) => h.text.length > 0);

  const hintsUkRaw = HINT_TIERS
    .map((tier) => {
      // For UK we want each tier present iff EITHER side has content, so the
      // arrays stay index-aligned with their EN counterparts. UK falls back to
      // EN at render time when its text is empty.
      const en = t.hints[tier.key].trim();
      const uk = t.hintsUk[tier.key].trim();
      const text = uk || en;
      return en.length > 0 ? { strength: tier.strength, text } : null;
    })
    .filter((h): h is { strength: number; text: string } => h !== null);
  const hasAnyUk = HINT_TIERS.some((tier) => t.hintsUk[tier.key].trim().length > 0);

  return {
    taskType:        t.taskType,
    orderIndex,
    statement:       t.statement,
    statementUk:     t.statementUk.trim() || null,
    options:         optionsEn,
    optionsUk,
    correctAnswer,
    answerTolerance: tolNum != null && Number.isFinite(tolNum) ? tolNum : null,
    maxScore:        Math.max(0, Number(t.maxScore) || 0),
    imageUrl:        t.imageUrl.trim() || null,
    explanation:     t.explanation.trim() || null,
    explanationUk:   t.explanationUk.trim() || null,
    hints:           hintsEn,
    hintsUk:         hasAnyUk ? hintsUkRaw : null,
  };
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  testId: string;
  testTitle: string;
  onClose: () => void;
}

export function TestStructureEditor({ testId, testTitle, onClose }: Props) {
  const [locale,  setLocale]  = useState<'en' | 'uk'>('en');
  const [tasks,   setTasks]   = useState<EditorTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    api.get<ApiTask[]>(`/tasks/test/${testId}`)
      .then((rows) => {
        const sorted = [...rows].sort((a, b) => a.orderIndex - b.orderIndex);
        setTasks(sorted.map(fromApi));
      })
      .catch(() => setError('Failed to load tasks'))
      .finally(() => setLoading(false));
  }, [testId]);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      // Validate before sending
      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        if (!t.statement.trim()) throw new Error(`Task ${i + 1}: question text is required`);
        if (t.taskType === 'OPEN_ANSWER' && !t.openAnswer.trim()) {
          throw new Error(`Task ${i + 1}: correct answer is required`);
        }
        if (t.taskType !== 'OPEN_ANSWER') {
          if (t.options.length < 2) throw new Error(`Task ${i + 1}: at least 2 options needed`);
          if (t.correctIds.length === 0) throw new Error(`Task ${i + 1}: mark at least one correct option`);
          if (t.taskType === 'SINGLE_CHOICE' && t.correctIds.length > 1) {
            throw new Error(`Task ${i + 1}: single choice can have only one correct option`);
          }
        }
      }

      const payload = tasks.map((t, i) => toApi(t, i + 1));
      await api.put(`/tasks/test/${testId}`, { tasks: payload });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
      setSaving(false);
    }
  }

  const updateTask    = (i: number, patch: Partial<EditorTask>) =>
    setTasks(tasks.map((t, idx) => idx === i ? { ...t, ...patch } : t));
  const removeTask    = (i: number) => setTasks(tasks.filter((_, idx) => idx !== i));
  const duplicateTask = (i: number) => {
    const dup = JSON.parse(JSON.stringify(tasks[i])) as EditorTask;
    // Re-issue option IDs so the duplicate doesn't collide with the source
    dup.options = dup.options.map((o) => ({ ...o, id: newId('o') }));
    dup.correctIds = []; // force the admin to reselect — IDs no longer match
    const next = [...tasks];
    next.splice(i + 1, 0, dup);
    setTasks(next);
  };
  const moveTask = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= tasks.length) return;
    const next = [...tasks];
    [next[i], next[j]] = [next[j], next[i]];
    setTasks(next);
  };
  const addTask = () => setTasks([...tasks, defaultTask()]);

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-[60] flex flex-col bg-background">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 h-12 border-b border-border shrink-0 bg-background">
        <div className="flex-1 min-w-0">
          <span className="text-xs text-muted-foreground">Edit Test Structure · </span>
          <span className="text-sm font-semibold">{testTitle}</span>
        </div>

        {/* Language tabs — control which side (EN/UK) of every task is shown */}
        <div className="flex rounded-md bg-muted p-0.5">
          {(['en', 'uk'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                locale === l
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {error && (
          <span className="text-xs text-red-500 max-w-[260px] truncate" title={error}>
            {error}
          </span>
        )}

        <Button size="sm" variant="ghost" onClick={onClose} disabled={saving} className="text-xs">
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving || loading} className="text-xs">
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-4">

            {/* Add task strip */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
              </span>
              <Button size="sm" onClick={addTask} className="ml-auto">
                + Add task
              </Button>
            </div>

            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground select-none border border-dashed border-border rounded-lg">
                <span className="text-4xl mb-3 opacity-20">⊞</span>
                <p className="text-sm">No tasks yet.</p>
                <p className="text-xs mt-1">Click &ldquo;Add task&rdquo; to create your first question.</p>
              </div>
            ) : (
              tasks.map((task, i) => (
                <TaskEditor
                  key={i}
                  task={task}
                  index={i}
                  total={tasks.length}
                  locale={locale}
                  onChange={(patch) => updateTask(i, patch)}
                  onRemove={() => removeTask(i)}
                  onDuplicate={() => duplicateTask(i)}
                  onMoveUp={() => moveTask(i, -1)}
                  onMoveDown={() => moveTask(i, 1)}
                />
              ))
            )}

            {tasks.length > 0 && (
              <div className="pt-2">
                <Button size="sm" variant="ghost" onClick={addTask}>
                  + Add another task
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Per-task editor card ───────────────────────────────────────────────────────

interface TaskEditorProps {
  task: EditorTask;
  index: number;
  total: number;
  locale: 'en' | 'uk';
  onChange: (patch: Partial<EditorTask>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function TaskEditor({
  task, index, total, locale, onChange,
  onRemove, onDuplicate, onMoveUp, onMoveDown,
}: TaskEditorProps) {
  const isUk = locale === 'uk';

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
          {(Object.keys(TASK_TYPE_LABEL) as TaskType[]).map((tt) => (
            <option key={tt} value={tt}>{TASK_TYPE_LABEL[tt]}</option>
          ))}
        </select>

        <label className="ml-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          Max score
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
          <Icn onClick={onMoveUp}    disabled={index === 0}         title="Move up">↑</Icn>
          <Icn onClick={onMoveDown}  disabled={index === total - 1} title="Move down">↓</Icn>
          <Icn onClick={onDuplicate} title="Duplicate">⧉</Icn>
          <Icn onClick={onRemove}    title="Remove" className="text-red-400 hover:!text-red-600">✕</Icn>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">

        {/* Statement */}
        <Field label={`Question (${locale.toUpperCase()})`}>
          <textarea
            value={isUk ? task.statementUk : task.statement}
            onChange={(e) => onChange(isUk
              ? { statementUk: e.target.value }
              : { statement:   e.target.value })}
            rows={2}
            placeholder={isUk
              ? 'Текст запитання (необовʼязково)'
              : 'Question text…'}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
          />
          {isUk && !task.statementUk && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Empty UK falls back to the EN question at runtime.
            </p>
          )}
        </Field>

        {/* Image URL — same for both locales (URL is not text) */}
        <Field label="Image URL (optional)">
          <Input
            value={task.imageUrl}
            onChange={(e) => onChange({ imageUrl: e.target.value })}
            placeholder="https://…"
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

        {/* Choice options */}
        {task.taskType !== 'OPEN_ANSWER' && (
          <Field label={`Options (${locale.toUpperCase()})`}>
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
                      title={isCorrect ? 'Correct answer' : 'Mark as correct'}
                      className="h-4 w-4 accent-foreground shrink-0"
                    />
                    <Input
                      value={isUk ? opt.textUk : opt.text}
                      onChange={(e) => setOption(oi, isUk
                        ? { textUk: e.target.value }
                        : { text:   e.target.value })}
                      placeholder={isUk
                        ? 'Варіант відповіді'
                        : `Option ${String.fromCharCode(65 + oi)}`}
                      className="h-8 text-sm"
                    />
                    <button
                      onClick={() => removeOption(oi)}
                      disabled={task.options.length <= 2}
                      title="Remove option"
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
                + Add option
              </button>
              <p className="text-[11px] text-muted-foreground">
                {task.taskType === 'SINGLE_CHOICE'
                  ? 'Tick exactly one option as the correct answer.'
                  : 'Tick every option that should be considered correct.'}
              </p>
            </div>
          </Field>
        )}

        {/* Open answer */}
        {task.taskType === 'OPEN_ANSWER' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Correct answer">
              <Input
                value={task.openAnswer}
                onChange={(e) => onChange({ openAnswer: e.target.value })}
                placeholder="e.g. 42 or  hello"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Numbers compared with tolerance; text compared case-insensitively.
              </p>
            </Field>
            <Field label="Numeric tolerance (optional)">
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
        <details className="rounded-md border border-border bg-muted/10 group" open={
          // Auto-expand when any tier has content in either locale
          HINT_TIERS.some((tier) =>
            task.hints[tier.key].trim().length > 0 ||
            task.hintsUk[tier.key].trim().length > 0
          )
        }>
          <summary className="px-3 py-2 cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground select-none flex items-center gap-2">
            <span>Hints ({locale.toUpperCase()})</span>
            <span className="text-[10px] text-muted-foreground/70">— click to expand</span>
            <span className="ml-auto text-[10px] tabular-nums">
              {HINT_TIERS.filter((tier) => task.hints[tier.key].trim().length > 0).length} / 3
            </span>
          </summary>
          <div className="px-3 pb-3 space-y-2">
            <p className="text-[11px] text-muted-foreground">
              Hints are revealed during the test based on the learner&apos;s course average.
              Leave a tier empty to skip it. Empty UK falls back to the EN hint.
            </p>
            {HINT_TIERS.map((tier) => {
              const enText = task.hints[tier.key];
              const ukText = task.hintsUk[tier.key];
              const value = isUk ? ukText : enText;
              const onText = (v: string) => onChange(isUk
                ? { hintsUk: { ...task.hintsUk, [tier.key]: v } }
                : { hints:   { ...task.hints,   [tier.key]: v } });
              return (
                <div key={tier.key} className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-medium tabular-nums uppercase tracking-wide text-foreground">
                      {tier.strength} — {tier.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground italic flex-1 truncate">
                      {tier.blurb}
                    </span>
                  </div>
                  <textarea
                    value={value}
                    onChange={(e) => onText(e.target.value)}
                    rows={2}
                    placeholder={isUk
                      ? `Підказка ${tier.strength} (${tier.label.toLowerCase()})`
                      : `${tier.label}…`}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                  />
                  {isUk && !ukText && enText && (
                    <p className="text-[10px] text-muted-foreground/80">
                      Will fall back to EN at runtime: <span className="italic">&ldquo;{enText.slice(0, 80)}{enText.length > 80 ? '…' : ''}&rdquo;</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </details>

        {/* Explanation */}
        <Field label={`Explanation (${locale.toUpperCase()}, optional)`}>
          <textarea
            value={isUk ? task.explanationUk : task.explanation}
            onChange={(e) => onChange(isUk
              ? { explanationUk: e.target.value }
              : { explanation:   e.target.value })}
            rows={2}
            placeholder="Shown to the learner after submission."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
          />
        </Field>
      </div>
    </div>
  );
}

// ── Tiny shared bits ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

function Icn({ onClick, disabled, className = '', title, children }: {
  onClick: () => void; disabled?: boolean; className?: string; title?: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      className={`p-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

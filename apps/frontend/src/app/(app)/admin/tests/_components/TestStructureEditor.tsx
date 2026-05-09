'use client';

/**
 * Test Structure Editor
 *
 * Full-screen overlay for authoring a test's tasks (questions). The per-task
 * card and helpers live in `./test-task/`; this file is the shell that wires
 * them together (load → edit → validate → save → close).
 *
 * Saving sends the whole task list at once via PUT /tasks/test/:testId,
 * which atomically replaces existing tasks for that test.
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

import { ApiTask, EditorTask, EditorTaskGraph } from './test-task/types';
import { defaultTask, DEFAULT_TASK_GRAPH_PAYLOAD, fromApi, newId, toApi } from './test-task/converters';
import { TaskEditor } from './test-task/TaskEditor';

interface Props {
  testId: string;
  testTitle: string;
  onClose: () => void;
}

export function TestStructureEditor({ testId, testTitle, onClose }: Props) {
  const { t } = useT();
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
      .catch(() => setError(t('admin.testEditor.errorLoad')))
      .finally(() => setLoading(false));
  }, [testId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      // Validate before sending
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const n = String(i + 1);
        if (!task.statement.trim()) throw new Error(t('admin.testEditor.validationQuestionRequired', { n }));
        if (task.taskType === 'OPEN_ANSWER' && !task.openAnswer.trim()) {
          throw new Error(t('admin.testEditor.validationAnswerRequired', { n }));
        }
        if (task.taskType !== 'OPEN_ANSWER') {
          if (task.options.length < 2) throw new Error(t('admin.testEditor.validationMinOptions', { n }));
          if (task.correctIds.length === 0) throw new Error(t('admin.testEditor.validationMarkCorrect', { n }));
          if (task.taskType === 'SINGLE_CHOICE' && task.correctIds.length > 1) {
            throw new Error(t('admin.testEditor.validationSingleCorrect', { n }));
          }
        }
      }

      // 1. Push each attached graph back to its DB row so vertices/edges/title
      //    persist alongside the task list.
      const taskGraphs = tasks
        .map((t) => t.graph)
        .filter((g): g is EditorTaskGraph => g !== null && !!g.graphId);
      await Promise.all(taskGraphs.map((g) =>
        api.patch(`/graphs/${g.graphId}`, {
          title:     g.title.trim() || null,
          titleUk:   g.titleUk.trim() || null,
          graphType: g.directed ? 'DIRECTED' : 'UNDIRECTED',
          vertices:  g.vertices,
          edges:     g.edges,
        }),
      ));

      // 2. Bulk-replace the test's task list. graphId travels through toApi.
      const payload = tasks.map((task, i) => toApi(task, i + 1));
      await api.put(`/tasks/test/${testId}`, { tasks: payload });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.testEditor.errorSave'));
      setSaving(false);
    }
  }

  const updateTask    = (i: number, patch: Partial<EditorTask>) =>
    setTasks(tasks.map((task, idx) => idx === i ? { ...task, ...patch } : task));

  /**
   * Removing a task also deletes its attached graph row (if any) so we don't
   * accumulate orphaned graphs.
   */
  const removeTask    = (i: number) => {
    const t = tasks[i];
    if (t.graph?.graphId) {
      api.delete(`/graphs/${t.graph.graphId}`).catch(() => {});
    }
    setTasks(tasks.filter((_, idx) => idx !== i));
  };

  /**
   * Duplicating a task with an attached graph also creates a fresh Graph row
   * so the two tasks don't share the same DB row (otherwise edits to one
   * would clobber the other).
   */
  const duplicateTask = async (i: number) => {
    const dup = JSON.parse(JSON.stringify(tasks[i])) as EditorTask;
    // Re-issue option IDs so the duplicate doesn't collide with the source
    dup.options = dup.options.map((o) => ({ ...o, id: newId('o') }));
    dup.correctIds = []; // force the admin to reselect — IDs no longer match

    if (dup.graph) {
      try {
        const created = await api.post<{ id: string }>('/graphs', {
          graphType: dup.graph.directed ? 'DIRECTED' : 'UNDIRECTED',
          title:     dup.graph.title,
          titleUk:   dup.graph.titleUk,
          vertices:  dup.graph.vertices,
          edges:     dup.graph.edges,
        });
        dup.graph = { ...dup.graph, graphId: created.id };
      } catch {
        // If creation fails, drop the graph from the duplicate rather than
        // letting the two tasks share the same DB row.
        dup.graph = null;
      }
    }

    const next = [...tasks];
    next.splice(i + 1, 0, dup);
    setTasks(next);
  };

  /** Create a fresh Graph DB row and attach it to the task at index `i`. */
  async function attachGraph(i: number) {
    try {
      const created = await api.post<{ id: string }>('/graphs', DEFAULT_TASK_GRAPH_PAYLOAD);
      const graph: EditorTaskGraph = {
        graphId:  created.id,
        title:    DEFAULT_TASK_GRAPH_PAYLOAD.title,
        titleUk:  DEFAULT_TASK_GRAPH_PAYLOAD.titleUk,
        directed: false,
        vertices: [...DEFAULT_TASK_GRAPH_PAYLOAD.vertices],
        edges:    [...DEFAULT_TASK_GRAPH_PAYLOAD.edges],
      };
      updateTask(i, { graph });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.testEditor.errorSave'));
    }
  }

  /** Detach + delete the Graph DB row from the task at index `i`. */
  function detachGraph(i: number, graphId: string) {
    api.delete(`/graphs/${graphId}`).catch(() => {});
    updateTask(i, { graph: null });
  }
  const moveTask = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= tasks.length) return;
    const next = [...tasks];
    [next[i], next[j]] = [next[j], next[i]];
    setTasks(next);
  };
  const addTask = () => setTasks([...tasks, defaultTask()]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">

      {/* Spacer: site header (sticky, z-50) renders on top; this reserves its height */}
      <div className="h-14 shrink-0" aria-hidden="true" />

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 h-12 border-b border-border shrink-0 bg-background">
        <div className="flex-1 min-w-0">
          <span className="text-xs text-muted-foreground">{t('admin.testEditor.headerTitle')} · </span>
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
          {t('admin.testEditor.cancel')}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving || loading} className="text-xs">
          {saving ? t('admin.testEditor.saving') : t('admin.testEditor.save')}
        </Button>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          {t('admin.testEditor.loading')}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-4">

            {/* Add task strip */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {t(tasks.length === 1 ? 'admin.testEditor.taskSingular' : 'admin.testEditor.taskPlural', { count: String(tasks.length) })}
              </span>
              <Button size="sm" onClick={addTask} className="ml-auto">
                {t('admin.testEditor.addTask')}
              </Button>
            </div>

            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground select-none border border-dashed border-border rounded-lg">
                <span className="text-4xl mb-3 opacity-20">⊞</span>
                <p className="text-sm">{t('admin.testEditor.noTasksTitle')}</p>
                <p className="text-xs mt-1">{t('admin.testEditor.noTasksHint')}</p>
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
                  onAttachGraph={() => attachGraph(i)}
                  onDetachGraph={(graphId) => detachGraph(i, graphId)}
                />
              ))
            )}

            {tasks.length > 0 && (
              <div className="pt-2">
                <Button size="sm" variant="ghost" onClick={addTask}>
                  {t('admin.testEditor.addAnotherTask')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

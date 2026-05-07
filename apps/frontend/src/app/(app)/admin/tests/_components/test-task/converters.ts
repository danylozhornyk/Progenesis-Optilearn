/**
 * Pure helpers — no React, no i18n. Convert between the wire format
 * (ApiTask) and the editor representation (EditorTask), and bucket loose
 * legacy hint data into the three fixed strength tiers.
 */

import {
  ApiHint, ApiTask,
  EditorGraphEdge, EditorGraphVertex, EditorOption, EditorTask, EditorTaskGraph,
  EMPTY_HINTS, HINT_TIERS, HintKey, HintTriplet,
} from './types';

// Module-local id counter. Stays unique within a single client session.
let _idCounter = 0;
export const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${(_idCounter++).toString(36)}`;

export function defaultTask(): EditorTask {
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
    graph:   null,
  };
}

/** Default starter payload for a new Graph attached to a task. */
export const DEFAULT_TASK_GRAPH_PAYLOAD = {
  graphType: 'UNDIRECTED' as const,
  title: '',
  titleUk: '',
  vertices: [
    { id: 'v1', label: '1', x: 80,  y: 70  },
    { id: 'v2', label: '2', x: 210, y: 45  },
    { id: 'v3', label: '3', x: 270, y: 155 },
    { id: 'v4', label: '4', x: 110, y: 175 },
  ] as EditorGraphVertex[],
  edges: [
    { source: 'v1', target: 'v2' },
    { source: 'v2', target: 'v3' },
    { source: 'v3', target: 'v4' },
    { source: 'v4', target: 'v1' },
  ] as EditorGraphEdge[],
};

/** Hydrate an EditorTaskGraph from an ApiTask.graph (the backend includes the
 *  related Graph row when fetching tasks). */
export function graphFromApi(t: ApiTask): EditorTaskGraph | null {
  if (!t.graphId) return null;
  const g = t.graph;
  if (!g) {
    // graphId is set but the include didn't populate it — render an empty shell.
    return {
      graphId: t.graphId,
      title:   '',
      titleUk: '',
      directed: false,
      vertices: [],
      edges:    [],
    };
  }
  return {
    graphId:  g.id,
    title:    g.title ?? '',
    titleUk:  g.titleUk ?? '',
    directed: g.graphType === 'DIRECTED',
    vertices: Array.isArray(g.vertices) ? g.vertices as EditorGraphVertex[] : [],
    edges:    Array.isArray(g.edges)    ? g.edges    as EditorGraphEdge[]    : [],
  };
}

/**
 * Bucket an array of free-form { strength, text } hints into the three fixed
 * tiers used by the editor. We snap each hint's strength to whichever tier is
 * closest (0/50/100); if multiple hints land in the same bucket the last one
 * wins. This keeps legacy data with arbitrary strengths editable.
 */
export function bucketHints(arr: ApiHint[] | null | undefined): HintTriplet {
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

export function fromApi(t: ApiTask): EditorTask {
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
    graph:   graphFromApi(t),
  };
}

export function toApi(t: EditorTask, orderIndex: number) {
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
    .filter((h): h is NonNullable<typeof h> => h !== null);
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
    graphId:         t.graph?.graphId ?? null,
  };
}

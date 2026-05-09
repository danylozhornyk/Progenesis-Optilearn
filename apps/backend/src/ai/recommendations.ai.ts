import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.AI_API_KEY,
});

/** Text-only fields the model returns (stats are computed separately). */
interface AiAnalysisCore {
  summary: string;
  weakPoints: { topic: string; detail: string }[];
  strongPoints: { topic: string; detail: string }[];
  roadmap: {
    step: number;
    title: string;
    description: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
}

/** Full stored analysis — core text + computed stats injected by the service. */
export interface AiAnalysis {
  summary: string;
  stats: {
    totalAttempts: number;
    avgScore: number;
    passRate: number;
  };
  weakPoints: { topic: string; detail: string }[];
  strongPoints: { topic: string; detail: string }[];
  roadmap: {
    step: number;
    title: string;
    description: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
}

/** Bilingual envelope returned by the AI call. */
export interface AiAnalysisBilingual {
  en: AiAnalysisCore;
  uk: AiAnalysisCore;
}

interface UserData {
  fullName: string;
  submissions: {
    testTitle: string;
    topic: string;
    passed: boolean;
    percentScore: number;
    attemptNumber: number;
    answers: { isCorrect: boolean }[];
  }[];
  progress: {
    courseTitle: string;
    progressPercent: number;
  }[];
}

export async function generateRecommendations(
  userData: UserData,
): Promise<AiAnalysisBilingual> {
  const prompt = buildPrompt(userData);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean) as AiAnalysisBilingual;

  if (!parsed.en || !parsed.uk) {
    throw new Error('AI response missing en/uk fields');
  }

  return parsed;
}

function buildPrompt(userData: UserData): string {
  return `
You are an educational AI assistant analyzing a student's performance on a math learning platform.

Student: ${userData.fullName}

Test submission history (most recent first):
${userData.submissions
  .map(
    (s) =>
      `- "${s.testTitle}" (${s.topic}): ${s.percentScore.toFixed(1)}% score, ${s.passed ? 'PASSED' : 'FAILED'}, attempt #${s.attemptNumber}, ${s.answers.filter((a) => a.isCorrect).length}/${s.answers.length} correct`,
  )
  .join('\n')}

Course progress:
${userData.progress
  .map((p) => `- "${p.courseTitle}": ${p.progressPercent.toFixed(1)}% complete`)
  .join('\n')}

Analyze the student's performance. Return ONLY raw JSON — no markdown, no explanation.

Produce two versions: English under "en", exact Ukrainian translation under "uk". Both share the same structure. Keep "priority" enum values ("HIGH" / "MEDIUM" / "LOW") in English in both versions — the frontend translates them. Translate every other text value.

Rules for the content:
- "summary": 2–3 concise sentences capturing overall progress, trend, and one key takeaway.
- "weakPoints": up to 3 topics the student consistently struggled with; "detail" explains the pattern briefly.
- "strongPoints": up to 3 topics the student performed well on; "detail" explains what evidence supports this.
- "roadmap": 3–5 ordered action steps from most to least urgent. Each step has a short "title" (action phrase) and a one-sentence "description". Assign "priority" HIGH/MEDIUM/LOW based on impact and urgency. Steps must be concrete and platform-actionable (retake tests, review lessons, etc.).

Exact JSON structure:
{
  "en": {
    "summary": "...",
    "weakPoints": [{ "topic": "...", "detail": "..." }],
    "strongPoints": [{ "topic": "...", "detail": "..." }],
    "roadmap": [
      { "step": 1, "title": "...", "description": "...", "priority": "HIGH" }
    ]
  },
  "uk": {
    "summary": "...",
    "weakPoints": [{ "topic": "...", "detail": "..." }],
    "strongPoints": [{ "topic": "...", "detail": "..." }],
    "roadmap": [
      { "step": 1, "title": "...", "description": "...", "priority": "HIGH" }
    ]
  }
}
`.trim();
}

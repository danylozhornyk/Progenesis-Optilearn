import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.AI_API_KEY,
});

export interface AiAnalysis {
  overallPerformance: string;
  weakAreas: {
    topic: string;
    reason: string;
  }[];
  strongAreas: {
    topic: string;
    reason: string;
  }[];
  recommendations: {
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
    reason: string;
  }[];
  nextSteps: string[];
}

/** Bilingual envelope: each generation produces both EN and UK versions. */
export interface AiAnalysisBilingual {
  en: AiAnalysis;
  uk: AiAnalysis;
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

/**
 * Asks the model for one analysis in English AND one in Ukrainian, returned
 * together in a single JSON envelope so we save both versions to the database
 * and the frontend can pick by locale without re-querying. Topic / action
 * keys must remain identical between languages — they're translations of the
 * same analysis, not two independent runs.
 */
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

  // Strip markdown code fences if present
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

Test submission history:
${userData.submissions
  .map(
    (s) => `- "${s.testTitle}" (${s.topic}): ${s.percentScore.toFixed(1)}% score, ${s.passed ? 'PASSED' : 'FAILED'}, attempt #${s.attemptNumber}, ${s.answers.filter((a) => a.isCorrect).length}/${s.answers.length} correct answers`
  )
  .join('\n')}

Course progress:
${userData.progress
  .map((p) => `- "${p.courseTitle}": ${p.progressPercent.toFixed(1)}% complete`)
  .join('\n')}

Analyze this student's performance and return ONLY a JSON object with no markdown, no explanation, just raw JSON.

Produce TWO versions of the same analysis: one in English under the "en" key, and an exact translation in Ukrainian under the "uk" key. Both must use the same structure shown below. Translate every text value (including topic names and priority reasoning) — keep "priority" enum values ("HIGH" / "MEDIUM" / "LOW") in English in BOTH versions, since the frontend localizes them itself.

Exact structure:
{
  "en": {
    "overallPerformance": "brief overall assessment string",
    "weakAreas": [
      { "topic": "topic name", "reason": "why this is a weak area" }
    ],
    "strongAreas": [
      { "topic": "topic name", "reason": "why this is a strong area" }
    ],
    "recommendations": [
      { "priority": "HIGH|MEDIUM|LOW", "action": "specific action to take", "reason": "why this is recommended" }
    ],
    "nextSteps": ["step 1", "step 2", "step 3"]
  },
  "uk": {
    "overallPerformance": "...",
    "weakAreas": [ { "topic": "...", "reason": "..." } ],
    "strongAreas": [ { "topic": "...", "reason": "..." } ],
    "recommendations": [
      { "priority": "HIGH|MEDIUM|LOW", "action": "...", "reason": "..." }
    ],
    "nextSteps": ["...", "...", "..."]
  }
}
`.trim();
}

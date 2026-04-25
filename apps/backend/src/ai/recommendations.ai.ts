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

export async function generateRecommendations(
  userData: {
    fullName: string;
    language?: string;
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
): Promise<AiAnalysis> {
  const prompt = buildPrompt(userData);

  const response = await client.messages.create({
  model: 'claude-sonnet-4-5',
  max_tokens: 1024,
  messages: [{ role: 'user', content: prompt }],
});

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  // Strip markdown code fences if present
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as AiAnalysis;
}

function buildPrompt(userData: {
  fullName: string;
  language?: string;
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
}): string {
  const language = userData.language ?? 'English';

  return `
You are an educational AI assistant analyzing a student's performance on a math learning platform.
Respond entirely in ${language}. All text values in the JSON must be written in ${language}.

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

Analyze this student's performance and return ONLY a JSON object with no markdown, no explanation, just raw JSON in this exact structure:
{
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
}
`.trim();
}
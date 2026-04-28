import { Router } from 'express';
import {
  submitTest,
  getSubmissionsByUser,
  getSubmissionsByTest,
  getSubmissionById,
} from '../services/submissions.service';
import {
  authenticate,
  requireRole,
  submissionRateLimit,
  AuthRequest,
} from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, submissionRateLimit, async (req: AuthRequest, res) => {
  try {
    const { testId, answers, timeSpentMs } = req.body;

    if (!testId || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        error: 'testId and answers array are required',
      });
    }

    const result = await submitTest({
      userId: req.user!.userId,
      testId,
      answers,
      timeSpentMs,
    });

    res.status(201).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Submission failed';
    res.status(400).json({ error: message });
  }
});

router.get('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const submissions = await getSubmissionsByUser(req.user!.userId);
    res.json(submissions);
  } catch {
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const submission = await getSubmissionById(req.params.id);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (
      req.user!.role === 'STUDENT' &&
      submission.userId !== req.user!.userId
    ) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    res.json(submission);
  } catch {
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

router.get(
  '/test/:testId',
  authenticate,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const submissions = await getSubmissionsByTest(req.params.testId);
      res.json(submissions);
    } catch {
      res.status(500).json({ error: 'Failed to fetch submissions' });
    }
  }
);

export default router;

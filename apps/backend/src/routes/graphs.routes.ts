import { Router } from 'express';
import {
  getGraphsByUser,
  getTemplateGraphs,
  getGraphById,
  createGraph,
  updateGraph,
  deleteGraph,
} from '../services/graphs.service';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// ── Public ────────────────────────────────────────────────────
router.get('/templates', async (_req, res) => {
  try {
    const graphs = await getTemplateGraphs();
    res.json(graphs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch template graphs' });
  }
});

// ── Authenticated ─────────────────────────────────────────────
router.get('/user/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    // Students can only see their own graphs
    if (
      req.user!.role === 'STUDENT' &&
      req.user!.userId !== req.params.userId
    ) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const graphs = await getGraphsByUser(req.params.userId);
    res.json(graphs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch graphs' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const graph = await getGraphById(req.params.id);
    if (!graph) return res.status(404).json({ error: 'Graph not found' });
    res.json(graph);
  } catch {
    res.status(500).json({ error: 'Failed to fetch graph' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const graph = await createGraph({
      ...req.body,
      userId: req.user!.userId,
    });
    res.status(201).json(graph);
  } catch {
    res.status(500).json({ error: 'Failed to create graph' });
  }
});

router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const existing = await getGraphById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Graph not found' });

    // Only owner or admin can update
    if (
      req.user!.role === 'STUDENT' &&
      existing.userId !== req.user!.userId
    ) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const graph = await updateGraph(req.params.id, req.body);
    res.json(graph);
  } catch {
    res.status(500).json({ error: 'Failed to update graph' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const existing = await getGraphById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Graph not found' });

    // Only owner or admin can delete
    if (
      req.user!.role === 'STUDENT' &&
      existing.userId !== req.user!.userId
    ) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await deleteGraph(req.params.id);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete graph' });
  }
});

export default router;

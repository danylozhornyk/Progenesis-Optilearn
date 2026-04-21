import { Router } from 'express';
import {
  getGraphsByUser,
  getTemplateGraphs,
  getGraphById,
  createGraph,
  updateGraph,
  deleteGraph,
} from '../services/graphs.service';

const router = Router();

router.get('/templates', async (_req, res) => {
  try {
    const graphs = await getTemplateGraphs();
    res.json(graphs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch template graphs' });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const graphs = await getGraphsByUser(req.params.userId);
    res.json(graphs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch graphs' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const graph = await getGraphById(req.params.id);
    if (!graph) return res.status(404).json({ error: 'Graph not found' });
    res.json(graph);
  } catch {
    res.status(500).json({ error: 'Failed to fetch graph' });
  }
});

router.post('/', async (req, res) => {
  try {
    const graph = await createGraph(req.body);
    res.status(201).json(graph);
  } catch {
    res.status(500).json({ error: 'Failed to create graph' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const graph = await updateGraph(req.params.id, req.body);
    res.json(graph);
  } catch {
    res.status(500).json({ error: 'Failed to update graph' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await deleteGraph(req.params.id);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete graph' });
  }
});

export default router;

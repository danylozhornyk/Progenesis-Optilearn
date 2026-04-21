import { Router } from 'express';
import {
  getTasksByTest,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from '../services/tasks.service';

const router = Router();

router.get('/test/:testId', async (req, res) => {
  try {
    const tasks = await getTasksByTest(req.params.testId);
    res.json(tasks);
  } catch {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const task = await getTaskById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

router.post('/', async (req, res) => {
  try {
    const task = await createTask(req.body);
    res.status(201).json(task);
  } catch {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const task = await updateTask(req.params.id, req.body);
    res.json(task);
  } catch {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await deleteTask(req.params.id);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;

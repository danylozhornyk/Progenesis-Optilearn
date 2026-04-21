import { Router } from 'express';
import {
  getLessonsByCourse,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
} from '../services/lessons.service';

const router = Router();

router.get('/course/:courseId', async (req, res) => {
  try {
    const lessons = await getLessonsByCourse(req.params.courseId);
    res.json(lessons);
  } catch {
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const lesson = await getLessonById(req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    res.json(lesson);
  } catch {
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
});

router.post('/', async (req, res) => {
  try {
    const lesson = await createLesson(req.body);
    res.status(201).json(lesson);
  } catch {
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const lesson = await updateLesson(req.params.id, req.body);
    res.json(lesson);
  } catch {
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await deleteLesson(req.params.id);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

export default router;

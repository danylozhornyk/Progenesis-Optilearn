import { Router } from 'express';
import { getAllCourses, getCourseById } from '../services/courses.service';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const courses = await getAllCourses();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const course = await getCourseById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

export default router;
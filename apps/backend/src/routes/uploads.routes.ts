import { Router, Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { uploadSingle } from '../middleware/upload.middleware';
import { storage } from '../storage';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png':  '.png',
  'image/gif':  '.gif',
  'image/webp': '.webp',
};

const router = Router();

// ── Upload an image — Admin only ──────────────────────────────
router.post('/image', authenticate, requireRole('ADMIN'), (req: Request, res: Response) => {
  uploadSingle(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided. Send the image in the "image" field.' });
    }

    const ext      = MIME_TO_EXT[req.file.mimetype] ?? path.extname(req.file.originalname).toLowerCase();
    const filename = `${crypto.randomUUID()}${ext}`;
    const url      = await storage.save(filename, req.file.buffer, req.file.mimetype);

    res.status(201).json({
      url,
      filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  });
});

// ── Delete an image — Admin only ─────────────────────────────
router.delete('/image/:filename', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  const { filename } = req.params;

  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  await storage.delete(filename);
  res.status(204).send();
});

export default router;

import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
  }
}

export const uploadSingle = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single('image');

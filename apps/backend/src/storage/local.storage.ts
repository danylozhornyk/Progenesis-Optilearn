import fs from 'fs';
import path from 'path';
import { StorageProvider } from './storage.provider';

export const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

export class LocalStorageProvider implements StorageProvider {
  constructor() {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  async save(filename: string, buffer: Buffer, _mimetype: string): Promise<string> {
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
    return this.getUrl(filename);
  }

  async delete(filename: string): Promise<void> {
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  getUrl(filename: string): string {
    const base = process.env.BACKEND_URL || 'http://localhost:4000';
    return `${base}/uploads/${filename}`;
  }
}

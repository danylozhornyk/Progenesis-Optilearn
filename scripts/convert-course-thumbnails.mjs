/**
 * Converts all SVGs in apps/frontend/public/courses/ to 800×500 PNGs.
 * Output lands in the same folder alongside the SVG originals.
 *
 * Usage (from repo root):
 *   node scripts/convert-course-thumbnails.mjs
 */

import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, '../apps/frontend/public/courses');

const files = (await readdir(dir)).filter(f => extname(f) === '.svg');

if (files.length === 0) {
  console.log('No SVG files found in', dir);
  process.exit(0);
}

console.log(`Converting ${files.length} SVG(s) to PNG…\n`);

await Promise.all(files.map(async (file) => {
  const src  = join(dir, file);
  const dest = join(dir, basename(file, '.svg') + '.png');
  await sharp(src).resize(800, 500).png().toFile(dest);
  console.log(`  ✓ ${file} → ${basename(dest)}`);
}));

console.log('\nDone.');

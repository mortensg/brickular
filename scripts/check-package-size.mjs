import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const targetPath = process.argv[2] ?? 'dist/brickular';
const maxKb = Number(process.argv[3] ?? '1500');

const directorySizeBytes = (path) => {
  const stats = statSync(path);
  if (stats.isFile()) {
    return stats.size;
  }

  return readdirSync(path).reduce((sum, entry) => sum + directorySizeBytes(join(path, entry)), 0);
};

const sizeBytes = directorySizeBytes(targetPath);
const sizeKb = Math.ceil(sizeBytes / 1024);

if (sizeKb > maxKb) {
  console.error(`Package size check failed: ${targetPath} is ${sizeKb}KB (max ${maxKb}KB).`);
  process.exit(1);
}

console.log(`Package size check passed: ${targetPath} is ${sizeKb}KB (max ${maxKb}KB).`);

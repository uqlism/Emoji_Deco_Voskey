import { Zip, ZipDeflate } from 'fflate';
import { readdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

/**
 * Walk a directory recursively and yield [relativePath, absolutePath] pairs.
 */
async function* walkDir(dir: string, base: string): AsyncGenerator<[string, string]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(abs, base);
    } else {
      yield [path.relative(base, abs).replace(/\\/g, '/'), abs];
    }
  }
}

/**
 * Create a ZIP archive of sourceDir at destFile using deflate level 9.
 * Uses fflate's streaming Zip so the entire uncompressed tree is never held in memory at once.
 * Returns the size of the written zip in bytes.
 */
export async function createZip(sourceDir: string, destFile: string): Promise<number> {
  const chunks: Uint8Array[] = [];
  let totalSize = 0;

  await new Promise<void>((resolve, reject) => {
    const zip = new Zip((err, data, final) => {
      if (err) { reject(err); return; }
      chunks.push(data);
      totalSize += data.byteLength;
      if (final) resolve();
    });

    (async () => {
      for await (const [relPath, absPath] of walkDir(sourceDir, sourceDir)) {
        const data = new Uint8Array(await readFile(absPath));
        const entry = new ZipDeflate(relPath, { level: 9 });
        zip.add(entry);
        entry.push(data, true);
      }
      zip.end();
    })().catch(reject);
  });

  const merged = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  await writeFile(destFile, merged);
  return totalSize;
}

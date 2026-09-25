import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputName = 'eternity-defense-source.zip';
const skipDirs = new Set(['node_modules', 'dist', '.git', '.vite', 'coverage']);
const skipFiles = new Set([outputName, '.DS_Store']);
const zip = new JSZip();
const folder = zip.folder('eternity-defense');
if (!folder) throw new Error('Could not create archive root.');

async function addDirectory(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name) || skipFiles.has(entry.name)) continue;
    if (entry.name.startsWith('.env')) continue;
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) {
      await addDirectory(absolute);
    } else if (entry.isFile()) {
      const archivePath = relative(rootDir, absolute).split(sep).join('/');
      folder.file(archivePath, await readFile(absolute));
    }
  }
}

await addDirectory(rootDir);
const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 5 } });
await writeFile(join(rootDir, outputName), buffer);
console.log(`Created ${outputName} (${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);
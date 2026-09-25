/// <reference types="vite/client" />

import packageSource from '../../package.json?raw';
import viteSource from '../../vite.config.ts?raw';
import tsconfigSource from '../../tsconfig.json?raw';
import indexSource from '../../index.html?raw';
import readmeSource from '../../README.md?raw';
import nodeArchiveScript from '../../scripts/create-zip.mjs?raw';

// Vite embeds raw source files, not the compiled game, so the archive can be edited and rebuilt.
const sourceFiles = import.meta.glob('/src/**/*.{ts,tsx,css}', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const assetNames = [
  'menu-bg.jpg',
  'act2.jpg',
  'act3.jpg',
  'act4.jpg',
  'mirror.jpg',
  'core.png',
  'king.png',
  'nebu.png',
  'nebu-soft.png',
  'sage.png',
];

export async function downloadProjectZip(onProgress: (percent: number) => void = () => {}) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const root = zip.folder('eternity-defense');
  if (!root) throw new Error('ساخت پوشهٔ ZIP ممکن نشد.');

  root.file('package.json', packageSource);
  root.file('vite.config.ts', viteSource);
  root.file('tsconfig.json', tsconfigSource);
  root.file('index.html', indexSource);
  root.file('README.md', readmeSource);
  root.file('scripts/create-zip.mjs', nodeArchiveScript);

  for (const [path, source] of Object.entries(sourceFiles)) {
    root.file(path.replace(/^\//, ''), source);
  }
  if (Object.keys(sourceFiles).length < 20 || !root.file('src/App.tsx') || !root.file('src/game/engine.ts')) {
    throw new Error('سورس پروژه کامل بارگذاری نشد؛ ساخت ZIP متوقف شد.');
  }

  const base = import.meta.env.BASE_URL;
  let fetchedCount = 0;
  const images = await Promise.all(
    assetNames.map(async (name) => {
      const response = await fetch(`${base}assets/${name}`);
      if (!response.ok || response.headers.get('content-type')?.includes('text/html')) {
        throw new Error(`تصویر ${name} برای بسته‌بندی در دسترس نیست.`);
      }
      const data = await response.arrayBuffer();
      onProgress(Math.round((++fetchedCount / assetNames.length) * 30));
      return { name, data };
    }),
  );
  for (const { name, data } of images) root.file(`public/assets/${name}`, data);

  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 5 } },
    (metadata) => onProgress(30 + Math.round(metadata.percent * 0.7)),
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'eternity-defense-source.zip';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
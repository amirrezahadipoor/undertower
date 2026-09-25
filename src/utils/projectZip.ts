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

// Images are bundled as module URLs (inlined as data: URLs in the single-file
// build), so the archive can be assembled without any network request.
import act1Url from '../../src/assets/menu-bg.jpg';
import act2Url from '../../src/assets/act2.jpg';
import act3Url from '../../src/assets/act3.jpg';
import act4Url from '../../src/assets/act4.jpg';
import act5Url from '../../src/assets/mirror.jpg';
import coreUrl from '../../src/assets/core.png';
import kingUrl from '../../src/assets/king.png';
import nebuUrl from '../../src/assets/nebu.png';
import nebuSoftUrl from '../../src/assets/nebu-soft.png';
import sageUrl from '../../src/assets/sage.png';

const IMAGE_URLS: Record<string, string> = {
  'menu-bg.jpg': act1Url,
  'act2.jpg': act2Url,
  'act3.jpg': act3Url,
  'act4.jpg': act4Url,
  'mirror.jpg': act5Url,
  'core.png': coreUrl,
  'king.png': kingUrl,
  'nebu.png': nebuUrl,
  'nebu-soft.png': nebuSoftUrl,
  'sage.png': sageUrl,
};

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

  let fetchedCount = 0;
  const images = await Promise.all(
    Object.entries(IMAGE_URLS).map(async ([name, url]) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`تصویر ${name} برای بسته‌بندی در دسترس نیست.`);
      }
      const data = await response.arrayBuffer();
      onProgress(Math.round((++fetchedCount / Object.keys(IMAGE_URLS).length) * 30));
      return { name, data };
    }),
  );
  for (const { name, data } of images) root.file(`src/assets/${name}`, data);

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
import path from "path";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Offline-first PWA assets, generated at build time with zero dependencies:
 * manifest.webmanifest, app icons (crystal heart drawn in pure JS), and a
 * tiny cache-first service worker. The game itself is already one file —
 * these let the browser install it and run it with no network at all.
 */
function pwaOffline() {
  /** PNG encoder (RGBA, no filter) using only node:zlib. */
  function png(width: number, height: number, rgba: Uint8Array): Buffer {
    const raw = Buffer.alloc((width * 4 + 1) * height);
    for (let y = 0; y < height; y++) {
      raw[y * (width * 4 + 1)] = 0;
      rgba.subarray(y * width * 4, (y + 1) * width * 4).forEach((v, i) => {
        raw[y * (width * 4 + 1) + 1 + i] = v;
      });
    }
    const chunk = (type: string, data: Buffer): Buffer => {
      const len = Buffer.alloc(4);
      len.writeUInt32BE(data.length);
      const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
      const crcTable: number[] = [];
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        crcTable[n] = c >>> 0;
      }
      let crc = 0xffffffff;
      for (const b of body) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8);
      crc = (crc ^ 0xffffffff) >>> 0;
      const crcBuf = Buffer.alloc(4);
      crcBuf.writeUInt32BE(crc);
      return Buffer.concat([len, body, crcBuf]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // RGBA
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]);
  }

  /** Crystal-heart icon: implicit heart curve, cyan gradient on dark. */
  function crystalIcon(size: number): Buffer {
    const rgba = new Uint8Array(size * size * 4);
    const set = (x: number, y: number, r: number, g: number, b: number, a = 255) => {
      const i = (y * size + x) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = a;
    };
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const x = (px / size) * 2.6 - 1.3;
        const y = (py / size) * 2.6 - 1.25;
        const v = Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y;
        if (v <= 0) {
          const t = Math.min(1, Math.max(0, (y + 1.2) / 2.2));
          set(px, py, Math.round(103 + t * 90), Math.round(232 - t * 130), Math.round(249 - t * 90));
        } else {
          set(px, py, 4, 5, 12);
        }
      }
    }
    return png(size, size, rgba);
  }

  return {
    name: "et-pwa-offline",
    apply: "build" as const,
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "icon-192.png", source: crystalIcon(192) });
      this.emitFile({ type: "asset", fileName: "icon-512.png", source: crystalIcon(512) });
      const manifest = {
        name: "دژِ ابدیت — Eternity Defense",
        short_name: "دژِ ابدیت",
        description: "دفاع از قلبِ کریستالی در مرزِ خاموشی — تاور دیفنس فارسی، کاملاً آفلاین",
        start_url: "./",
        scope: "./",
        display: "fullscreen",
        orientation: "landscape",
        background_color: "#04050c",
        theme_color: "#04050c",
        icons: [
          { src: "./icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "./icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        ],
      };
      this.emitFile({ type: "asset", fileName: "manifest.webmanifest", source: JSON.stringify(manifest, null, 2) });
      const sw = [
        "/* Eternity Defense — offline-first service worker (no network needed after first visit) */",
        "const VERSION = 'et-v1';",
        "const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];",
        "self.addEventListener('install', (e) => {",
        "  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));",
        "});",
        "self.addEventListener('activate', (e) => {",
        "  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));",
        "});",
        "self.addEventListener('fetch', (e) => {",
        "  const req = e.request;",
        "  if (req.method !== 'GET') return;",
        "  const url = new URL(req.url);",
        "  if (url.origin !== location.origin) return;",
        "  e.respondWith(",
        "    caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then((hit) =>",
        "      hit ||",
        "        fetch(req)",
        "          .then((res) => {",
        "            const copy = res.clone();",
        "            caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});",
        "            return res;",
        "          })",
        "          .catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : undefined)),",
        "    ),",
        "  );",
        "});",
      ].join("\n");
      this.emitFile({ type: "asset", fileName: "sw.js", source: sw });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), pwaOffline()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Inline every imported image as a data: URL so `dist/index.html` is one
    // truly self-contained file (open it anywhere, no assets folder needed).
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 20_000,
  },
});

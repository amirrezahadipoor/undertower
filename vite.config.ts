import { readFileSync } from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Offline-first PWA assets, assembled at build time with zero dependencies:
 * manifest.webmanifest, app icons (the key art in `assets/`), and a
 * tiny cache-first service worker. The game itself is already one file —
 * these let the browser install it and run it with no network at all.
 */
function pwaOffline() {
  const plugin: Plugin = {
    name: "et-pwa-offline",
    apply: "build",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "icon-192.png", source: readFileSync("assets/icon-192.png") });
      this.emitFile({ type: "asset", fileName: "icon-512.png", source: readFileSync("assets/icon-512.png") });
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
  return plugin;
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

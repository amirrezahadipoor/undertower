/** Headless environment stubs — the engine is DOM-free, only persistence touches localStorage. */

const store = new Map<string, string>();

globalThis.localStorage = {
  get length() {
    return store.size;
  },
  clear: () => store.clear(),
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  key: (i: number) => [...store.keys()][i] ?? null,
  removeItem: (k: string) => void store.delete(k),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
} as Storage;

// The audio engine probes for WebAudio and no-ops when absent; give it a window to probe.
(globalThis as unknown as { window: unknown }).window = globalThis;
(globalThis as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame = () => 0;

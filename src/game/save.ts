/**
 * Run persistence.
 *
 * A 60-wave campaign is far too long to lose because the phone rang, the tab was
 * discarded, or the device rotated. The engine state is already plain data, so we
 * snapshot everything except the derived / cosmetic fields (map geometry, weather,
 * particles, floating text, lightning bolts) which are rebuilt on load.
 */

import { buildMap, ECON } from './config';
import { makeWeather, type Game } from './engine';
import { rngState, setRngState } from './rng';
import { ACTS } from './config';

const KEY = 'et_run_v1';
const VERSION = 1;

/** Derived or cosmetic — never persisted. */
const OMITTED = new Set(['map', 'weather', 'particles', 'texts', 'bolts', 'events', 'selected', 'hover']);

interface SaveEnvelope {
  v: number;
  savedAt: number;
  rng: number;
  state: Record<string, unknown>;
}

function replacer(key: string, value: unknown): unknown {
  if (OMITTED.has(key)) return undefined;
  return value;
}

export interface RunSnapshot {
  wave: number;
  lives: number;
  gold: number;
  savedAt: number;
}

/** Snapshot the run. Cheap enough to call every few seconds. */
export function saveRun(g: Game): boolean {
  try {
    const envelope: SaveEnvelope = {
      v: VERSION,
      savedAt: Date.now(),
      rng: rngState(),
      state: JSON.parse(JSON.stringify(g, replacer)) as Record<string, unknown>,
    };
    localStorage.setItem(KEY, JSON.stringify(envelope));
    return true;
  } catch (err) {
    console.warn('[save] failed', err);
    return false;
  }
}

export const hasSavedRun = (): boolean => {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
};

/** Read just enough for the "resume?" prompt. */
export function peekSavedRun(): RunSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const env = JSON.parse(raw) as SaveEnvelope;
    if (env.v !== VERSION || !env.state) return null;
    const s = env.state as { wave?: number; lives?: number; gold?: number; phase?: string };
    // A finished (game over) run is not resumable.
    if (s.phase === 'over') return null;
    return {
      wave: Number(s.wave ?? 0),
      lives: Number(s.lives ?? 0),
      gold: Number(s.gold ?? 0),
      savedAt: env.savedAt ?? 0,
    };
  } catch {
    return null;
  }
}

export function clearSavedRun(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Rebuild a `Game` from the snapshot. Returns null when the save is missing,
 * corrupt or from an incompatible version — callers then start a fresh run.
 */
export function loadRun(base: Game): Game | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const env = JSON.parse(raw) as SaveEnvelope;
    if (env.v !== VERSION || !env.state || typeof env.state !== 'object') return null;

    const src = env.state as Record<string, unknown>;
    if (src.phase === 'over') return null;

    // Start from a valid object so any field missing in an older save keeps a sane default.
    const g = base;
    for (const key of Object.keys(src)) {
      if (OMITTED.has(key)) continue;
      (g as unknown as Record<string, unknown>)[key] = src[key];
    }

    // Rebuild the derived half.
    g.map = buildMap();
    const act = Math.min(ACTS.length, Math.max(1, Number(g.act) || 1));
    g.act = act;
    g.weather = makeWeather(ACTS[act - 1].weather);
    g.particles = Array.isArray(g.particles) ? [] : [];
    g.texts = [];
    g.bolts = [];
    g.events = [];
    g.selected = null;
    g.hover = null;
    g.paused = true;

    // Numeric sanity: a partially-written save must not produce NaN everywhere.
    g.gold = Number.isFinite(g.gold) ? g.gold : ECON.startGold;
    g.lives = Number.isFinite(g.lives) ? g.lives : ECON.startLives;
    g.wave = Number.isFinite(g.wave) ? g.wave : 0;
    g.towers = Array.isArray(g.towers) ? g.towers : [];
    g.enemies = Array.isArray(g.enemies) ? g.enemies : [];
    g.projectiles = Array.isArray(g.projectiles) ? g.projectiles : [];
    g.crystals = Array.isArray(g.crystals) ? g.crystals : [];
    g.strikes = Array.isArray(g.strikes) ? g.strikes : [];
    g.blastQueue = Array.isArray((g as unknown as Record<string, unknown>).blastQueue) ? g.blastQueue : [];
    g.groups = Array.isArray(g.groups) ? g.groups : [];

    if (typeof env.rng === 'number') setRngState(env.rng);
    return g;
  } catch (err) {
    console.warn('[save] load failed', err);
    return null;
  }
}

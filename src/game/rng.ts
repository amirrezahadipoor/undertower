/**
 * Deterministic RNG (mulberry32).
 *
 * The simulation previously called `Math.random` directly, which made runs
 * irreproducible: balance could not be regression-tested, seeds could not be
 * shared, and a run could not be saved/restored faithfully. Every gameplay
 * random call now goes through this module.
 *
 * Rendering/audio may still use `Math.random` — they are cosmetic and must not
 * consume the simulation stream (otherwise the visuals would change the sim).
 */

let state = 0x9e3779b9;

/** Seed the gameplay stream. Anything non-finite falls back to a fixed seed. */
export function seedRng(seed: number): void {
  const s = Math.floor(seed);
  state = Number.isFinite(s) && s !== 0 ? s >>> 0 : 0x9e3779b9;
}

/** Uniform in [0, 1). */
export function rand(): number {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Uniform in [a, b). */
export const randRange = (a: number, b: number): number => a + rand() * (b - a);

/** Integer in [0, n). */
export const randInt = (n: number): number => Math.floor(rand() * n);

/** Pick a random element. */
export function randPick<T>(list: readonly T[]): T {
  return list[randInt(list.length)];
}

/** True with probability p. */
export const chance = (p: number): boolean => rand() < p;

/** Current stream state — persisted alongside a saved run so reload resumes identically. */
export const rngState = (): number => state >>> 0;

/** Restore a previously captured state. */
export const setRngState = (s: number): void => {
  state = Number.isFinite(s) ? s >>> 0 : 0x9e3779b9;
};

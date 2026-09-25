import { FINAL_WAVE } from './config';
import type { BossVariant, EnemyKind, SpawnGroup } from './types';

export const isBossWave = (w: number) => w % 10 === 0;
export const bossTier = (w: number) => Math.max(1, Math.floor(w / 10));
/** Cycle index: waves 1-60 → 1, 61-120 → 2, ... */
export const cycleOf = (w: number) => Math.floor((Math.max(1, w) - 1) / FINAL_WAVE) + 1;
export const isFinalWave = (w: number) => w % FINAL_WAVE === 0;

/** Boss rotation across the 60-wave campaign; the King closes every cycle. */
export const bossVariantOf = (tier: number): BossVariant => {
  const inCycle = ((tier - 1) % 6) + 1; // 1..6
  if (inCycle === 6) return 'king';
  return (['legion', 'mist', 'eye', 'legion', 'mist'] as const)[inCycle - 1];
};

/**
 * Endless wave composer — fair early, relentless later, and a full new roster after each cycle.
 */
export function buildWave(wave: number): SpawnGroup[] {
  const groups: SpawnGroup[] = [];
  const push = (kind: EnemyKind, count: number, interval: number, delay = 0) => {
    if (count > 0) groups.push({ kind, count, interval, delay });
  };
  const cycle = cycleOf(wave);
  const w = ((wave - 1) % FINAL_WAVE) + 1; // 1..60 within the cycle
  const cyc = 1 + (cycle - 1) * 0.35; // extra bodies per cycle

  if (w % 10 === 0) {
    const tier = w / 10;
    const king = tier === 6;
    push('crawler', Math.round((5 + tier * 2) * cyc), Math.max(0.46, 1.0 - tier * 0.05), 0);
    push('runner', Math.round((3 + tier * 2) * cyc), 0.52, 2.0);
    push('boss', 1, 1, king ? 4.5 : 3.2);
    push('shade', Math.round((2 + tier) * cyc), 0.75, 1.5);
    push('bulwark', Math.round(Math.max(1, tier) * cyc), 1.35, 1.8);
    push('splitter', Math.round(Math.max(1, Math.floor(tier * 0.7)) * cyc), 1.4, 1.1);
    push('healer', tier >= 2 ? Math.round(Math.floor(tier / 2) * cyc) : 0, 1.5, 1.0);
    push('warp', tier >= 2 ? Math.round(tier * cyc) : 0, 0.8, 1.3);
    push('reaver', tier >= 2 ? Math.round(tier * cyc) : 0, 1.05, 1.5);
    push('frostgiant', tier >= 3 ? Math.round((tier - 2) * cyc) : 0, 1.5, 0.7);
    if (king) {
      // the King's honour guard arrives in two waves
      push('reaver', Math.round(4 * cyc), 0.9, 6);
      push('warp', Math.round(4 * cyc), 0.7, 1);
      push('frostgiant', Math.round(2 * cyc), 1.4, 2);
    }
    return groups;
  }

  const ramp = cycle > 1 ? 1 : Math.min(1, 0.5 + w * 0.065);
  const crawlers = Math.floor((5 + w * 1.15) * ramp * cyc);
  const runners = w >= 3 ? Math.floor((2 + w * 0.8) * ramp * cyc) : 0;
  const bulwarks = w >= 4 ? Math.round((1 + Math.floor((w - 4) / 4)) * cyc) : 0;
  const splitters = w >= 6 ? Math.round((1 + Math.floor((w - 6) / 4)) * cyc) : 0;
  const shades = w >= 8 ? Math.round((1 + Math.floor((w - 8) / 3)) * cyc) : 0;
  const warps = w >= 11 ? Math.round((1 + Math.floor((w - 11) / 4)) * cyc) : 0;
  const healers = w >= 13 ? Math.round((1 + Math.floor((w - 13) / 5)) * cyc) : 0;
  const reavers = w >= 15 ? Math.round((1 + Math.floor((w - 15) / 4)) * cyc) : 0;
  const giants = w >= 17 ? Math.round((1 + Math.floor((w - 17) / 5)) * cyc) : 0;
  const baseInterval = Math.max(0.26, 0.9 - w * 0.016);

  push('crawler', Math.ceil(crawlers * 0.6), baseInterval, 0);
  push('runner', runners, 0.46, 1.2);
  push('bulwark', bulwarks, 1.35, 0.8);
  push('crawler', Math.floor(crawlers * 0.4), baseInterval * 0.9, 0.5);
  push('warp', warps, 0.9, 0.6);
  push('splitter', splitters, 1.25, 0.6);
  push('shade', shades, 0.52, 0.4);
  push('reaver', reavers, 1.05, 0.7);
  push('healer', healers, 1.45, 0.7);
  push('frostgiant', giants, 1.6, 0.55);
  // late-campaign pressure: a second lane of the act's signature enemy
  if (w >= 41) push('reaver', Math.round(2 * cyc), 0.8, 1.2);
  if (w >= 51) push('warp', Math.round(3 * cyc), 0.6, 0.8);
  return groups;
}

export function waveTotal(groups: SpawnGroup[]): number {
  return groups.reduce((s, g) => s + g.count, 0);
}

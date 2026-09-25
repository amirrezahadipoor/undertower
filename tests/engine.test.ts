import { describe, expect, it } from 'vitest';
import { pillarLocked, relicMods } from '../src/game/meta';
import {
  canBuildAt,
  castSpell,
  createGame,
  effTowerStats,
  selectTile,
  startWave,
  tryPlace,
  update,
  upgradeSelected,
  ascendCostOf,
  createGameWithPet,
  type Game,
} from '../src/game/engine';
import { COLS, ROWS, TILE, TOWERS, tileKey, ECON, ASCEND } from '../src/game/config';
import { seedRng, rngState } from '../src/game/rng';
import { guardDraw, safeR } from '../src/game/renderSafe';
import { loadRun, peekSavedRun, saveRun, clearSavedRun } from '../src/game/save';
import type { Phase, TowerKind } from '../src/game/types';

/* ── shared bot helpers ─────────────────────────────────────── */

const scoredTiles = (g: Game) => {
  const out: { tx: number; ty: number; score: number }[] = [];
  for (let ty = 0; ty < ROWS; ty++)
    for (let tx = 0; tx < COLS; tx++) {
      if (g.map.pathTiles.has(tileKey(tx, ty))) continue;
      const cx = tx * TILE + TILE / 2;
      const cy = ty * TILE + TILE / 2;
      let score = 0;
      for (const p of g.map.pathTiles) {
        const [px, py] = p.split(',').map(Number);
        const d = Math.hypot(px * TILE + TILE / 2 - cx, py * TILE + TILE / 2 - cy);
        if (d < 150) score += 1;
        else if (d < 260) score += 0.35;
      }
      out.push({ tx, ty, score });
    }
  return out.sort((a, b) => b.score - a.score);
};

const ORDER: TowerKind[] = ['dart', 'cannon', 'frost', 'sniper', 'burn', 'tesla'];

function placeNext(g: Game, tiles: ReturnType<typeof scoredTiles>, idx: number): boolean {
  const kind = ORDER[idx % ORDER.length];
  for (const ts of tiles) {
    if (!canBuildAt(g, ts.tx, ts.ty)) continue;
    selectTile(g, ts.tx, ts.ty);
    if (tryPlace(g, kind)) return true;
  }
  return false;
}

function upgradeBest(g: Game): boolean {
  const cands = g.towers
    .map((t) => {
      const e = effTowerStats(g, t);
      return { t, dps: e.dmg * e.rate };
    })
    .sort((a, b) => b.dps - a.dps);
  for (const c of cands) {
    selectTile(g, c.t.tx, c.t.ty);
    if (upgradeSelected(g)) return true;
  }
  return false;
}

interface BotOpts {
  maxTowers: number;
  reserve: number;
  upgrade: boolean;
  maxWave: number;
}

interface RunResult {
  wave: number;
  phase: string;
  lives: number;
  gold: number;
  firstLeakWave: number;
}

/** Deterministic bot run — the heart of the balance guard-rails. */
function botRun(opts: BotOpts, seed = 0xC0FFEE): RunResult {
  seedRng(seed);
  const g = createGame();
  const tiles = scoredTiles(g);
  const dt = 1 / 60;
  let built = 0;
  let guard = 0;
  let firstLeakWave = -1;

  while (g.wave < opts.maxWave && g.phase !== 'over' && guard < 60 * 60 * 900) {
    if (g.phase === 'build') {
      let act = 0;
      while (act++ < 400) {
        const cheapest = Math.min(...ORDER.map((k) => Math.round(TOWERS[k].levels[0].cost * g.mods.costMult)));
        const floor = g.towers.length < 4 ? 0 : opts.reserve;
        if (g.towers.length < opts.maxTowers && g.gold >= cheapest + floor) {
          if (placeNext(g, tiles, built)) {
            built++;
            continue;
          }
        }
        if (opts.upgrade && upgradeBest(g)) continue;
        break;
      }
      startWave(g);
    }
    let frames = 0;
    const leaksBefore = g.leaks;
    while (g.phase === 'combat' && frames < 60 * 900) {
      update(g, dt);
      frames++;
      guard++;
      if (frames % 30 === 0) {
        const alive = g.enemies.length;
        if (alive >= 14 && g.spellCd.pulse <= 0) castSpell(g, 'pulse');
        if (alive >= 18 && g.spellCd.tear <= 0) castSpell(g, 'tear');
        if (alive >= 22 && g.spellCd.frost <= 0) castSpell(g, 'frost');
      }
      if (g.events.length > 500) g.events.length = 0;
    }
    if (g.leaks > leaksBefore && firstLeakWave < 0) firstLeakWave = g.wave;
    if ((g.phase as Phase) === 'over') break;
  }
  return { wave: g.wave, phase: g.phase as Phase, lives: g.lives, gold: Math.round(g.gold), firstLeakWave };
}

/* ── 1) engine sanity ───────────────────────────────────────── */

describe('engine sanity', () => {
  it('completes wave 1 and returns to build phase', () => {
    seedRng(7);
    const g = createGame();
    const tiles = scoredTiles(g);
    expect(placeNext(g, tiles, 0)).toBe(true);
    startWave(g);
    expect(g.phase).toBe('combat');
    let guard = 0;
    while (g.phase === 'combat' && guard++ < 60 * 300) update(g, 1 / 60);
    expect(g.phase).toBe('build');
    expect(g.wave).toBe(1);
    expect(g.gold).toBeGreaterThan(0);
  });

  it('kills grant gold (economy loop works)', () => {
    seedRng(11);
    const g = createGame();
    const tiles = scoredTiles(g);
    for (let i = 0; i < 3; i++) {
      placeNext(g, tiles, i);
    }
    startWave(g);
    let guard = 0;
    while (g.phase === 'combat' && guard++ < 60 * 300) update(g, 1 / 60);
    // start gold 185 + wave bonus + kills − spending; strictly more than start − max tower cost is enough
    expect(g.gold).toBeGreaterThan(ECON.startGold - 300);
  });

  it('game over fires when the heart runs out of lives', () => {
    seedRng(13);
    const g = createGame();
    g.lives = 1;
    startWave(g);
    let guard = 0;
    while (g.phase !== 'over' && guard++ < 60 * 900) update(g, 1 / 60);
    expect(g.phase).toBe('over');
  });
});

/* ── 2) determinism (seeded RNG) ────────────────────────────── */

describe('determinism', () => {
  it('identical seeds produce identical battles', () => {
    const script = () => {
      seedRng(2024);
      const g = createGame();
      const tiles = scoredTiles(g);
      for (let w = 0; w < 3; w++) {
        for (let i = 0; i < 3; i++) placeNext(g, tiles, i);
        upgradeBest(g);
        startWave(g);
        let frames = 0;
        while (g.phase === 'combat' && frames < 60 * 120) {
          update(g, 1 / 60);
          frames++;
        }
      }
      return {
        gold: g.gold,
        lives: g.lives,
        wave: g.wave,
        leaks: g.leaks,
        kills: g.towers.reduce((s, t) => s + t.kills, 0),
        invested: g.towers.reduce((s, t) => s + t.invested, 0),
        rng: rngState(),
      };
    };
    const a = script();
    const b = script();
    expect(b).toEqual(a);
  });
});

/* ── 3) render safety ───────────────────────────────────────── */

describe('render safety clamps', () => {
  it('never returns an invalid radius', () => {
    expect(safeR(-5)).toBeGreaterThan(0);
    expect(safeR(0)).toBeGreaterThan(0);
    expect(safeR(Number.NaN)).toBeGreaterThan(0);
    expect(safeR(Number.POSITIVE_INFINITY)).toBeGreaterThan(0);
    expect(safeR(3)).toBe(3);
  });

  it('guardDraw swallows drawing errors and reports them', () => {
    let reported: string | null = null;
    expect(() =>
      guardDraw(
        'test',
        () => {
          throw new Error('boom');
        },
        (where) => {
          reported = where;
        },
      ),
    ).not.toThrow();
    expect(reported).toBe('test');
  });
});

/* ── 4) save / load round-trip ──────────────────────────────── */

describe('save / load', () => {
  it('restores towers, gold and the RNG stream', () => {
    seedRng(99);
    const g = createGame();
    const tiles = scoredTiles(g);
    for (let i = 0; i < 2; i++) placeNext(g, tiles, i);
    g.gold = 1234;
    expect(saveRun(g)).toBe(true);

    const peek = peekSavedRun();
    expect(peek).not.toBeNull();
    expect(peek!.gold).toBe(1234);

    // A fresh scaffold recovers everything that matters.
    const fresh = createGame();
    const restored = loadRun(fresh);
    expect(restored).not.toBeNull();
    expect(restored!.towers.length).toBe(2);
    expect(restored!.gold).toBe(1234);
    expect(Number.isFinite(restored!.time)).toBe(true);
  });

  it('ignores corrupt saves instead of crashing', () => {
    localStorage.setItem('et_run_v1', '{not json');
    expect(peekSavedRun()).toBeNull();
    const fresh = createGame();
    expect(loadRun(fresh)).toBeNull();
    clearSavedRun();
  });
});

/* ── 5) endless ascension (gold sink) ───────────────────────── */

describe('endless ascension', () => {
  it('is always available and exponentially priced past 5 stars', () => {
    const g = createGame();
    const c5 = ascendCostOf(g, 4); // buying star 5
    const c6 = ascendCostOf(g, 5); // first legendary star
    const c7 = ascendCostOf(g, 6);
    expect(c5).toBe(Math.round((ASCEND.baseCost + 4 * ASCEND.costStep) * g.mods.costMult));
    expect(c6).toBe(Math.round(ASCEND.endlessBase * g.mods.costMult));
    expect(c7).toBeGreaterThan(c6);
    expect(c7 / c6).toBeCloseTo(ASCEND.endlessStep, 2);
  });

  it('a tower can pass 5 stars when gold allows', () => {
    seedRng(5);
    const g = createGame();
    const tiles = scoredTiles(g);
    placeNext(g, tiles, 0);
    const t = g.towers[0];
    const def = TOWERS[t.kind];
    g.gold = 10_000_000;
    for (let lv = 0; lv < def.levels.length - 1; lv++) {
      selectTile(g, t.tx, t.ty);
      expect(upgradeSelected(g)).toBe(true);
    }
    for (let s = 0; s < 7; s++) {
      selectTile(g, t.tx, t.ty);
      expect(upgradeSelected(g)).toBe(true);
      expect(t.ascend).toBe(s + 1);
    }
    const e = effTowerStats(g, t);
    expect(e.dmg).toBeGreaterThan(0);
  });
});

/* ── 5.5) hell mode & architect pillars ─────────────────────── */

describe('hell mode', () => {
  it('scales enemy hp and gold by ×1.45 with identical seeds', () => {
    const firstEnemy = (hell: boolean) => {
      seedRng(4242);
      const g = createGame();
      g.hell = hell;
      g.wave = 30; // larger numbers → rounding noise negligible
      startWave(g);
      let frames = 0;
      while (g.enemies.length === 0 && frames++ < 600) update(g, 1 / 60);
      const e = g.enemies[0];
      return { maxHp: e.maxHp, gold: e.gold };
    };
    const normal = firstEnemy(false);
    const hell = firstEnemy(true);
    expect(hell.maxHp / normal.maxHp).toBeCloseTo(1.45, 2);
    // gold is integer-rounded, so assert the range instead of an exact ratio
    expect(hell.gold / normal.gold).toBeGreaterThan(1.35);
    expect(hell.gold / normal.gold).toBeLessThan(1.6);
  });

  it('starts with half hearts (min 5)', () => {
    const g = createGameWithPet(
      { startGold: 0, startLives: 0, costMult: 1, dmgMult: 1, chainBonus: 0, slowMult: 1, critCh: 0, heal5: 1, autoCrystal: false, spellCdMult: 1, interestCapBonus: 0 },
      true,
    );
    expect(g.hell).toBe(true);
    expect(g.lives).toBe(Math.round(ECON.startLives * 0.5));
  });
});

describe('architect pillars', () => {
  it('tier-2 requires tier-1 of the same branch', () => {
    // tier-2 alone is locked
    expect(pillarLocked('p-interest')).toBe(true);
    expect(pillarLocked('p-seed')).toBe(false);
  });

  it('merge into relicMods', () => {
    const mods = relicMods();
    expect(mods.interestCapBonus).toBeGreaterThanOrEqual(0);
  });
});

/* ── 6) BALANCE GUARD-RAILS ─────────────────────────────────── */
/**
 * These encode the intended difficulty contract (see ROADMAP phase 2):
 *  - the campaign must actually threaten an average player (first leak inside waves 35–59),
 *  - a strong player must still clear the campaign,
 *  - a passive player must lose early (a real floor),
 *  - the endless mode must have a ceiling.
 * If one of these fails, the curve was changed — deliberately or not. Say so in the commit.
 */
describe('balance guard-rails', () => {
  it(
    'weak bot loses early (floor exists)',
    () => {
      const r = botRun({ maxTowers: 8, reserve: 400, upgrade: false, maxWave: 65 });
      expect(r.phase).toBe('over');
      expect(r.wave).toBeLessThanOrEqual(25);
    },
  );

  it(
    'average bot feels real pressure inside the campaign, and the campaign stays completable',
    () => {
      const r = botRun({ maxTowers: 14, reserve: 150, upgrade: true, maxWave: 65 });
      expect(r.firstLeakWave).toBeGreaterThanOrEqual(40); // not trivial
      expect(r.firstLeakWave).toBeLessThanOrEqual(60); // pressure arrives inside the campaign
      expect(r.wave).toBeGreaterThanOrEqual(55); // reaches the campaign climax
    },
  );

  it(
    'strong bot clears the campaign cleanly (skill is rewarded)',
    () => {
      const r = botRun({ maxTowers: 26, reserve: 0, upgrade: true, maxWave: 61 });
      expect(r.wave).toBeGreaterThanOrEqual(61);
      expect(r.lives).toBeGreaterThan(0);
      expect(r.firstLeakWave === -1 || r.firstLeakWave >= 60).toBe(true); // nothing leaks during waves 1–59
    },
  );

  it(
    'endless has a ceiling: the strong bot eventually dies',
    () => {
      const r = botRun({ maxTowers: 26, reserve: 0, upgrade: true, maxWave: 240 });
      expect(r.phase).toBe('over');
      expect(r.wave).toBeLessThanOrEqual(240);
    },
  );
});

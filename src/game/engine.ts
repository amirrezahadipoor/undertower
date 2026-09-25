import {
  ACTS,
  ASCEND,
  BOSS_NAMES,
  BOSS_RADIUS,
  ECON,
  ENEMIES,
  SPELLS,
  SYNERGIES,
  SYNERGY_DIST,
  TOWERS,
  actOf,
  buildMap,
  posAt,
  tileCenter,
  tileKey,
} from './config';
import { bossTier, bossVariantOf, buildWave, cycleOf, isFinalWave, waveTotal } from './waves';
import { audio } from './audio';
import { MODS, rollModifier } from './modifiers';
import type { ModId } from './modifiers';
import type { RelicMods } from './meta';
import { addPetXp, getPetSave, petLevel, petXp, petXpNeeded } from './pets';
import type { Pet, PetKind } from './types';
import type {
  Bolt,
  CrystalDrop,
  Enemy,
  FloatText,
  HudInfo,
  MapData,
  Particle,
  Phase,
  Projectile,
  Sel,
  SpawnGroup,
  SpellId,
  TargetMode,
  Tower,
  TowerKind,
} from './types';

export interface GameEvent {
  type:
    | 'waveStart'
    | 'waveClear'
    | 'leak'
    | 'gameover'
    | 'bossSpawn'
    | 'bossDown'
    | 'lowLives'
    | 'firstLeak'
    | 'actChange'
    | 'achCheck'
    | 'kingPhase'
    | 'kingDown'
    | 'petLevel';
  wave?: number;
  act?: number;
  tier?: number;
  bonus?: number;
  interest?: number;
  achId?: string;
  phase?: number;
  level?: number;
}

const DEFAULT_MODS: RelicMods = {
  startGold: 0,
  startLives: 0,
  costMult: 1,
  dmgMult: 1,
  chainBonus: 0,
  slowMult: 1,
  critCh: 0,
  heal5: 1,
  autoCrystal: false,
  spellCdMult: 1,
};

export interface ScheduledStrike {
  delay: number;
  targetId: number;
  dmg: number;
}

interface Blast {
  x: number;
  y: number;
  radius: number;
  damage: number;
  ownerId: number | null;
}

export interface Game {
  map: MapData;
  mods: RelicMods;
  gold: number;
  lives: number;
  wave: number;
  phase: Phase;
  speed: 1 | 2 | 3;
  paused: boolean;
  time: number;
  act: number;
  freezeT: number;
  spellCd: Record<SpellId, number>;
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: Particle[];
  texts: FloatText[];
  bolts: Bolt[];
  crystals: CrystalDrop[];
  strikes: ScheduledStrike[];
  blastQueue: Blast[];
  groups: SpawnGroup[];
  gIdx: number;
  gCount: number;
  spawnT: number;
  groupWait: number;
  totalWave: number;
  spawned: number;
  selected: { type: 'tile'; tx: number; ty: number } | { type: 'tower'; id: number } | null;
  hover: { tx: number; ty: number } | null;
  combo: number;
  comboT: number;
  shake: number;
  kills: number;
  leaks: number;
  earned: number;
  nextId: number;
  bossId: number | null;
  lowLivesFired: boolean;
  firstLeakFired: boolean;
  weather: Particle[];
  events: GameEvent[];
  mod: ModId | null;
  nextMod: ModId | null;
  dmgBuffWaves: number;
  dmgBuffAmt: number;
  rangeBuffWaves: number;
  rangeBuffAmt: number;
  thermalActive: boolean;
  pet: Pet | null;
  petXpBank: number;
  kingPhase: number;
  endingPending: boolean;
}

export function makePet(kind: PetKind, map: MapData): Pet {
  return {
    kind,
    level: petLevel(kind),
    x: map.coreX - 70,
    y: map.coreY - 50,
    vx: 0,
    vy: 0,
    angle: 0,
    cooldown: 1,
    flap: Math.random() * 6,
    shieldLeft: 0,
    reviveLeft: 0,
    flash: 0,
  };
}

export function setPet(g: Game, kind: PetKind | null) {
  g.pet = kind ? makePet(kind, g.map) : null;
  if (g.pet) resetPetWaveState(g.pet);
}

function resetPetWaveState(p: Pet) {
  p.shieldLeft = p.kind === 'tortoise' ? (p.level >= 12 ? 2 : 1) : 0;
  p.reviveLeft = p.kind === 'phoenix' ? 1 : 0;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function makeWeather(weather: (typeof ACTS)[number]['weather']): Particle[] {
  const list: Particle[] = [];
  const n = weather === 'rain' ? 80 : weather === 'ash' ? 65 : 45;
  for (let i = 0; i < n; i++) {
    list.push({
      x: Math.random() * 1280,
      y: Math.random() * 720,
      vx: weather === 'rain' ? rand(-20, -8) : weather === 'ash' ? rand(-14, 4) : rand(-7, 7),
      vy: weather === 'rain' ? rand(420, 640) : weather === 'ash' ? rand(16, 42) : rand(-18, -8),
      life: rand(0, 10),
      max: 10,
      size: weather === 'rain' ? rand(8, 16) : rand(1, 3),
      color: '',
      type: weather === 'rain' ? 'rain' : weather === 'ash' ? 'ash' : 'mote',
    });
  }
  return list;
}

export function createGame(mods: RelicMods = DEFAULT_MODS): Game {
  return {
    map: buildMap(),
    mods,
    gold: ECON.startGold + mods.startGold,
    lives: ECON.startLives + mods.startLives,
    wave: 0,
    phase: 'build',
    speed: 1,
    paused: false,
    time: 0,
    act: 1,
    freezeT: 0,
    spellCd: { pulse: 0, frost: 0, tear: 0 },
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    texts: [],
    bolts: [],
    crystals: [],
    strikes: [],
    blastQueue: [],
    groups: [],
    gIdx: 0,
    gCount: 0,
    spawnT: 0,
    groupWait: 0,
    totalWave: 0,
    spawned: 0,
    selected: null,
    hover: null,
    combo: 0,
    comboT: 0,
    shake: 0,
    kills: 0,
    leaks: 0,
    earned: 0,
    nextId: 1,
    bossId: null,
    lowLivesFired: false,
    firstLeakFired: false,
    weather: makeWeather('motes'),
    events: [],
    mod: null,
    nextMod: rollModifier(1),
    dmgBuffWaves: 0,
    dmgBuffAmt: 0,
    rangeBuffWaves: 0,
    rangeBuffAmt: 0,
    thermalActive: false,
    pet: null,
    petXpBank: 0,
    kingPhase: 0,
    endingPending: false,
  };
}

export function createGameWithPet(mods: RelicMods = DEFAULT_MODS): Game {
  const g = createGame(mods);
  const save = getPetSave();
  if (save.active && save.unlocked.includes(save.active)) setPet(g, save.active);
  return g;
}

/* ── synergies & effective stats ───────────────────────────── */

export function recomputeSynergies(g: Game) {
  const uniqueActive = new Set<string>();
  for (const t of g.towers) t.synergies = [];
  for (let i = 0; i < g.towers.length; i++) {
    for (let j = i + 1; j < g.towers.length; j++) {
      const a = g.towers[i];
      const b = g.towers[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) > SYNERGY_DIST) continue;
      for (const syn of SYNERGIES) {
        if ((a.kind === syn.a && b.kind === syn.b) || (a.kind === syn.b && b.kind === syn.a)) {
          if (!a.synergies.includes(syn.id)) a.synergies.push(syn.id);
          if (!b.synergies.includes(syn.id)) b.synergies.push(syn.id);
          uniqueActive.add(syn.id);
        }
      }
    }
  }
  g.thermalActive = uniqueActive.has('thermal');
  if (uniqueActive.size >= 3) {
    g.events.push({ type: 'achCheck', achId: 'synergy3' });
  }
}

export function effTowerStats(g: Game, t: Tower): { dmg: number; rate: number; range: number } {
  const st = TOWERS[t.kind].levels[t.level];
  let dmg = st.dmg * g.mods.dmgMult * (1 + t.ascend * ASCEND.dmgPerStar);
  let rate = st.rate * (1 + t.ascend * ASCEND.ratePerStar);
  let range = st.range * (1 + t.ascend * ASCEND.rangePerStar);

  if (g.dmgBuffWaves > 0) dmg *= 1 + g.dmgBuffAmt;
  if (g.rangeBuffWaves > 0) range *= 1 + g.rangeBuffAmt;
  if (g.mod === 'eclipse') range *= 0.78;

  if (t.synergies.includes('spotter')) {
    if (t.kind === 'cannon') {
      range *= 1.18;
      rate *= 1.14;
    } else if (t.kind === 'sniper') {
      rate *= 1.12;
    }
  }
  if (t.synergies.includes('railgun') && t.kind === 'sniper') {
    dmg *= 1.25;
  }
  if (t.synergies.includes('ironcurtain') && (t.kind === 'dart' || t.kind === 'cannon')) {
    rate *= 1.12;
    dmg *= 1.08;
  }
  return { dmg, rate, range };
}

/* ── selection / building ──────────────────────────────────── */

export const costOf = (g: Game, kind: TowerKind, level: number) =>
  Math.round(TOWERS[kind].levels[level].cost * g.mods.costMult);

export const ascendCostOf = (g: Game, ascend: number) =>
  Math.round((ASCEND.baseCost + ascend * ASCEND.costStep) * g.mods.costMult);

export function canBuildAt(g: Game, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= 20 || ty >= 11) return false;
  if (g.map.pathTiles.has(tileKey(tx, ty))) return false;
  return !g.towers.some((t) => t.tx === tx && t.ty === ty);
}

export function selectTile(g: Game, tx: number, ty: number) {
  const tower = g.towers.find((t) => t.tx === tx && t.ty === ty);
  if (tower) g.selected = { type: 'tower', id: tower.id };
  else if (canBuildAt(g, tx, ty)) g.selected = { type: 'tile', tx, ty };
  else g.selected = null;
}

export function deselect(g: Game) {
  g.selected = null;
}

export function tryPlace(g: Game, kind: TowerKind): boolean {
  if (!g.selected || g.selected.type !== 'tile') return false;
  const { tx, ty } = g.selected;
  const cost = costOf(g, kind, 0);
  if (!canBuildAt(g, tx, ty) || g.gold < cost) {
    audio.error();
    return false;
  }
  g.gold -= cost;
  const t: Tower = {
    id: g.nextId++,
    kind,
    level: 0,
    ascend: 0,
    tx,
    ty,
    x: tileCenter(tx),
    y: tileCenter(ty),
    invested: cost,
    cooldown: 0.2,
    angle: -Math.PI / 2,
    recoil: 0,
    flash: 0,
    kills: 0,
    targetMode: 'first',
    synergies: [],
  };
  g.towers.push(t);
  recomputeSynergies(g);
  g.selected = { type: 'tower', id: t.id };
  audio.build();
  burst(g, t.x, t.y, 10, TOWERS[kind].color, 'smoke');
  if (t.synergies.length > 0) {
    addText(g, t.x, t.y - 26, 'هم‌نوایی!', '#a5f3fc', 12);
  }
  return true;
}

export function upgradeSelected(g: Game): boolean {
  if (!g.selected || g.selected.type !== 'tower') return false;
  const t = g.towers.find((x) => x.id === (g.selected as { id: number }).id);
  if (!t) return false;
  const def = TOWERS[t.kind];
  const atApex = t.level >= def.levels.length - 1;
  if (atApex) {
    if (t.ascend >= ASCEND.max) return false;
    const cost = ascendCostOf(g, t.ascend);
    if (g.gold < cost) {
      audio.error();
      return false;
    }
    g.gold -= cost;
    t.ascend++;
    t.invested += cost;
    t.flash = 1;
    audio.apex();
    addText(g, t.x, t.y - 32, `فرااوج ★${t.ascend}`, '#fde047', 15);
    burst(g, t.x, t.y, 26, '#fde047', 'spark');
    g.particles.push({ x: t.x, y: t.y, vx: 0, vy: 0, life: 0.6, max: 0.6, size: 8, color: '#fde047', type: 'ring' });
    if (t.ascend >= 3) g.events.push({ type: 'achCheck', achId: 'ascend3' });
    return true;
  }
  const cost = costOf(g, t.kind, t.level + 1);
  if (g.gold < cost) {
    audio.error();
    return false;
  }
  g.gold -= cost;
  t.level++;
  t.invested += cost;
  t.flash = 1;
  if (t.level === def.levels.length - 1) {
    audio.apex();
    addText(g, t.x, t.y - 30, 'اوج!', '#fbbf24', 15);
    burst(g, t.x, t.y, 24, '#fde68a', 'spark');
  } else {
    audio.upgrade();
  }
  burst(g, t.x, t.y, 14, def.color, 'spark');
  g.particles.push({ x: t.x, y: t.y, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 6, color: def.color, type: 'ring' });
  return true;
}

export function sellSelected(g: Game): boolean {
  if (!g.selected || g.selected.type !== 'tower') return false;
  const id = g.selected.id;
  const idx = g.towers.findIndex((x) => x.id === id);
  if (idx < 0) return false;
  const t = g.towers[idx];
  const refund = Math.round(t.invested * ECON.sellRate);
  g.gold += refund;
  g.towers.splice(idx, 1);
  recomputeSynergies(g);
  g.selected = null;
  audio.coin();
  burst(g, t.x, t.y, 10, '#facc15', 'spark');
  return true;
}

/** Applies a random-event choice effect. Returns a short toast string. */
export function applyEventEffect(g: Game, effect: string, value: number): string {
  switch (effect) {
    case 'gold':
      g.gold += value;
      g.earned += value;
      audio.coin();
      return `+${value} طلا`;
    case 'lives':
      g.lives += value;
      audio.upgrade();
      return `+${value} جانِ قلب`;
    case 'buffDmg':
      if (g.gold < 60) return 'برای کوره ۶۰ طلا لازم است';
      g.gold -= 60;
      g.dmgBuffAmt = value;
      g.dmgBuffWaves = 3;
      audio.apex();
      return `آسیبِ همه +${Math.round(value * 100)}٪ برای ۳ موج`;
    case 'buffRange':
      g.rangeBuffAmt = value;
      g.rangeBuffWaves = 3;
      audio.upgrade();
      return `برد +${Math.round(value * 100)}٪ برای ۳ موج`;
    case 'discount':
      if (g.lives <= 3) return 'قلب برای این معامله جان کافی ندارد';
      g.lives -= 3;
      g.mods.costMult *= 1 - value;
      audio.shard();
      return `ساخت ${Math.round(value * 100)}٪ ارزان‌تر`;
    case 'freeUpgrade': {
      const cands = g.towers.filter((t) => t.level < TOWERS[t.kind].levels.length - 1);
      if (cands.length) {
        const t = cands[Math.floor(Math.random() * cands.length)];
        t.level++;
        t.flash = 1;
        burst(g, t.x, t.y, 16, TOWERS[t.kind].color, 'spark');
        audio.apex();
        return `${TOWERS[t.kind].name} رایگان ارتقا یافت`;
      }
      g.gold += 80;
      return 'برجی برای ارتقا نبود — +۸۰ طلا';
    }
    case 'overcharge': {
      const half = Math.floor(g.gold / 2);
      if (half < 20) return 'برای این معامله دست کم ۴۰ طلا لازم است';
      g.gold -= half;
      const gain = Math.floor(half / 20);
      g.lives += gain;
      audio.shard();
      return `−${half} طلا، +${gain} جان`;
    }
    case 'curseHp': {
      if (Math.random() < 0.6) {
        g.gold += 200;
        g.earned += 200;
        audio.coin();
        return 'بردی! +۲۰۰ طلا';
      }
      g.lives = Math.max(1, g.lives - 3);
      audio.leak();
      return 'باختی... −۳ جان';
    }
    default:
      return 'هیچ اتفاقی نیفتاد';
  }
}

export function cycleTargetMode(g: Game) {
  if (!g.selected || g.selected.type !== 'tower') return;
  const t = g.towers.find((x) => x.id === (g.selected as { id: number }).id);
  if (!t) return;
  const order: TargetMode[] = ['first', 'strong', 'last'];
  t.targetMode = order[(order.indexOf(t.targetMode) + 1) % order.length];
  audio.ui();
}

export function selectionSummary(g: Game): Sel {
  if (!g.selected) return { type: 'none' };
  if (g.selected.type === 'tile') return { type: 'tile', tx: g.selected.tx, ty: g.selected.ty };
  const t = g.towers.find((x) => x.id === (g.selected as { type: 'tower'; id: number }).id);
  if (!t) return { type: 'none' };
  const def = TOWERS[t.kind];
  const atApex = t.level >= def.levels.length - 1;
  const eff = effTowerStats(g, t);
  let upgradeCost: number | null = null;
  let isAscend = false;
  if (!atApex) {
    upgradeCost = costOf(g, t.kind, t.level + 1);
  } else if (t.ascend < ASCEND.max) {
    upgradeCost = ascendCostOf(g, t.ascend);
    isAscend = true;
  }
  return {
    type: 'tower',
    id: t.id,
    kind: t.kind,
    level: t.level,
    ascend: t.ascend,
    invested: t.invested,
    kills: t.kills,
    targetMode: t.targetMode,
    upgradeCost,
    isAscend,
    sellValue: Math.round(t.invested * ECON.sellRate),
    dmg: eff.dmg,
    rate: eff.rate,
    range: eff.range,
    synergies: [...t.synergies],
  };
}

/* ── interactive soul crystals ─────────────────────────────── */

export function tryCollectCrystalAt(g: Game, x: number, y: number, radius = 34): boolean {
  for (let i = g.crystals.length - 1; i >= 0; i--) {
    const c = g.crystals[i];
    if (Math.hypot(c.x - x, c.y - y) <= radius) {
      collectCrystal(g, i);
      return true;
    }
  }
  return false;
}

function collectCrystal(g: Game, idx: number) {
  const c = g.crystals[idx];
  if (!c) return;
  g.crystals.splice(idx, 1);
  g.gold += c.gold;
  g.earned += c.gold;
  g.combo += 3;
  g.comboT = ECON.comboWindow;
  (Object.keys(g.spellCd) as SpellId[]).forEach((k) => {
    if (g.spellCd[k] > 0) g.spellCd[k] = Math.max(0, g.spellCd[k] - 2.5);
  });
  audio.shard();
  burst(g, c.x, c.y, 16, '#67e8f9', 'spark');
  g.particles.push({ x: c.x, y: c.y, vx: 0, vy: 0, life: 0.45, max: 0.45, size: 10, color: '#67e8f9', type: 'ring' });
  addText(g, c.x, c.y - 14, `+${c.gold} ✦`, '#67e8f9', 13);
}

/* ── waves ─────────────────────────────────────────────────── */

export function startWave(g: Game): boolean {
  if (g.phase !== 'build') return false;
  const w = g.wave + 1;
  const newAct = actOf(w);
  if (newAct !== g.act) {
    g.act = newAct;
    g.weather = makeWeather(ACTS[newAct - 1].weather);
    g.events.push({ type: 'actChange', act: newAct });
    if (newAct === 4) g.events.push({ type: 'achCheck', achId: 'act4' });
  }
  g.wave = w;
  g.mod = w % 10 === 0 ? null : g.nextMod;
  g.groups = buildWave(w);
  if (g.mod && MODS[g.mod].count) {
    const c = MODS[g.mod].count!;
    for (const grp of g.groups) grp.count = Math.max(1, Math.round(grp.count * c));
  }
  g.totalWave = waveTotal(g.groups);
  g.spawned = 0;
  g.gIdx = 0;
  g.gCount = 0;
  g.spawnT = 0;
  g.groupWait = 0;
  g.phase = 'combat';
  if (g.pet) resetPetWaveState(g.pet);
  g.events.push({ type: 'waveStart', wave: w });
  audio.wave();
  return true;
}

function spawnEnemy(g: Game, kind: Enemy['kind'], dist = 0, lat?: number) {
  const def = ENEMIES[kind];
  const w = Math.max(1, g.wave);
  const mod = g.mod ? MODS[g.mod] : null;
  const cycle = cycleOf(w);
  const cycMult = Math.pow(ECON.cycleHp, cycle - 1);
  let hp = def.hp * ECON.hpMult(Math.min(w, 60) + (cycle - 1) * 12) * cycMult;
  let speed = def.speed * ECON.speedMult(w);
  let variant: Enemy['variant'] = null;
  let radius = def.radius;
  if (kind === 'boss') {
    const tier = bossTier(w);
    variant = bossVariantOf(tier);
    radius = BOSS_RADIUS[variant] ?? 42;
    if (variant === 'mist') {
      hp *= 0.78 + tier * 0.06;
      speed *= 1.35;
    } else if (variant === 'eye') {
      hp *= 1.45 + tier * 0.1;
      speed *= 0.8;
    } else if (variant === 'king') {
      hp *= 3.2 + tier * 0.15;
      speed *= 0.62;
    } else {
      hp *= 1 + (tier - 1) * 0.42;
    }
  }
  const elite = kind !== 'boss' && w >= ECON.eliteFrom && Math.random() < Math.min(0.32, 0.1 + w * 0.006);
  if (elite) {
    hp *= 1.35;
    speed *= 1.08;
  }
  let armor = def.armor + (kind === 'boss' ? bossTier(w) * 2 + (variant === 'king' ? 6 : 0) : elite ? 2 : 0) + (cycle - 1) * 2;
  let slowResist = variant === 'king' ? 0.85 : def.slowResist;
  let gold = def.gold * ECON.goldMult(Math.min(w, 60)) * (elite ? 1.6 : 1) * Math.pow(ECON.cycleGold, cycle - 1) * (variant === 'king' ? 3 : 1);
  if (mod && kind !== 'boss') {
    if (mod.hp) hp *= mod.hp;
    if (mod.speed) speed *= mod.speed;
    if (mod.gold) gold *= mod.gold;
    if (mod.armorAdd) armor += mod.armorAdd;
    if (mod.slowResistAdd) slowResist = Math.min(0.95, slowResist + mod.slowResistAdd);
  }
  const volatile = g.mod === 'unstable' && kind !== 'boss';
  const maxShield = kind === 'reaver' ? hp * 0.6 : 0;
  const id = g.nextId++;
  const e: Enemy = {
    id,
    kind,
    hp,
    maxHp: hp,
    elite,
    armor,
    speed,
    dist,
    x: -40,
    y: 0,
    slowT: 0,
    slowPct: 0,
    gold: Math.round(gold),
    dmg: variant === 'king' ? 12 : def.dmg,
    radius,
    slowResist,
    wob: Math.random() * Math.PI * 2,
    lat: kind === 'boss' ? 0 : lat ?? rand(-9, 9),
    flash: 0,
    dead: false,
    boss: kind === 'boss',
    variant,
    burnT: 0,
    burnDps: 0,
    burnSpread: 0,
    burnOwner: -1,
    markT: 0,
    markAmp: 0,
    healT: rand(0.5, 1.6),
    ghost: false,
    ghostT: variant === 'mist' ? 6 : 0,
    eyeStage: 0,
    warpT: kind === 'warp' ? rand(1.5, 3) : 0,
    shield: maxShield,
    maxShield,
    volatile,
  };
  g.enemies.push(e);
  g.spawned++;
  if (e.boss) {
    g.bossId = id;
    g.kingPhase = variant === 'king' ? 1 : 0;
    g.events.push({ type: 'bossSpawn', wave: g.wave });
    audio.bossSting();
    g.shake = Math.max(g.shake, variant === 'king' ? 18 : 10);
  }
}

/* ── particles & text ──────────────────────────────────────── */

function burst(g: Game, x: number, y: number, n: number, color: string, type: Particle['type']) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = rand(30, type === 'soul' ? 60 : 130);
    g.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - (type === 'soul' ? 60 : 0),
      life: rand(0.3, 0.9),
      max: 0.9,
      size: rand(1.5, 3.5),
      color,
      type,
    });
  }
  if (g.particles.length > 800) g.particles.splice(0, g.particles.length - 800);
}

function addText(g: Game, x: number, y: number, text: string, color: string, size = 11) {
  if (g.texts.length > 110) g.texts.shift();
  g.texts.push({ x: x + rand(-4, 4), y, life: 0.8, max: 0.8, text, color, size });
}

/* ── damage & death ────────────────────────────────────────── */

function killEnemy(g: Game, e: Enemy, src: Tower | null) {
  if (e.dead) return;
  e.dead = true;
  g.combo++;
  g.comboT = ECON.comboWindow;
  if (g.combo === 40) g.events.push({ type: 'achCheck', achId: 'combo40' });
  const comboBonus = g.mod === 'frenzy' ? 2 : 1;
  const mult = 1 + Math.min(ECON.comboMax * comboBonus, g.combo * ECON.comboPerStack * comboBonus);
  const gain = Math.round(e.gold * mult);
  g.gold += gain;
  g.earned += gain;
  if (g.gold >= 1000) g.events.push({ type: 'achCheck', achId: 'rich1000' });
  g.kills++;
  if (src) src.kills++;
  audio.kill();
  // companion xp
  if (g.pet) {
    const xp = e.boss ? 40 : e.elite ? 4 : 1 + Math.min(3, g.wave * 0.04);
    g.petXpBank += xp;
  }
  if (e.gold >= 12 || e.boss) addText(g, e.x, e.y - e.radius - 18, `+${gain}`, '#facc15', e.boss ? 16 : 11);
  burst(g, e.x, e.y, e.boss ? 26 : 5, '#a78bfa', 'soul');
  burst(g, e.x, e.y, e.boss ? 30 : 4, ENEMIES[e.kind].color, 'spark');

  // chance to drop a clickable Soul Crystal
  const dropChance = e.boss ? 1 : e.elite ? 0.45 : e.armor >= 2 ? 0.12 : 0.035;
  if (g.crystals.length < 6 && Math.random() < dropChance) {
    const rawGold = Math.round((12 + g.wave * 1.8) * (g.mods.autoCrystal ? 1.3 : 1));
    g.crystals.push({
      id: g.nextId++,
      x: Math.max(48, Math.min(1232, e.x + rand(-16, 16))),
      y: Math.max(48, Math.min(656, e.y + rand(-16, 16))),
      life: 7.5,
      max: 7.5,
      gold: rawGold,
    });
  }

  // burning corpses pass the flame on
  if (e.burnT > 0 && e.burnSpread > 0) {
    let spread = 0;
    for (const o of g.enemies) {
      if (o.dead || o.id === e.id || o.ghost) continue;
      if (Math.hypot(o.x - e.x, o.y - e.y) <= 75 && spread < e.burnSpread) {
        if (o.burnDps < e.burnDps * 0.6) {
          o.burnDps = e.burnDps * 0.6;
          o.burnT = Math.max(o.burnT, 2);
          o.burnSpread = Math.max(0, e.burnSpread - 1);
          o.burnOwner = e.burnOwner;
        }
        spread++;
      }
    }
    if (spread > 0) burst(g, e.x, e.y, 8, '#fb923c', 'spark');
  }

  // volatile modifier: dead bodies detonate into their neighbours
  if (e.volatile) {
    const r = 62;
    burst(g, e.x, e.y, 12, '#fb7185', 'spark');
    g.particles.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.35, max: 0.35, size: r, color: '#fb7185', type: 'ring' });
    audio.boom(false);
    // Process chain explosions iteratively after combat instead of recursing through
    // hundreds of enemies on late-cycle swarm waves.
    g.blastQueue.push({ x: e.x, y: e.y, radius: r, damage: e.maxHp * 0.22, ownerId: src?.id ?? null });
  }

  if (e.kind === 'splitter') {
    for (let i = 0; i < 2; i++) {
      const before = g.spawned;
      spawnEnemy(g, 'crawler', Math.max(0, e.dist - 6), e.lat + (i === 0 ? -12 : 12));
      g.spawned = before;
    }
  }

  if (e.boss) {
    if (g.bossId === e.id) g.bossId = null;
    g.shake = Math.max(g.shake, 16);
    audio.boom(true);
    g.particles.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.7, max: 0.7, size: 14, color: '#c084fc', type: 'ring' });
    g.particles.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 8, color: '#f0abfc', type: 'ring' });
    addText(g, e.x, e.y - 30, `${BOSS_NAMES[e.variant ?? 'legion']} فروپاشید!`, '#f0abfc', 16);
    const tier = bossTier(g.wave);
    if (e.variant === 'king') {
      g.kingPhase = 0;
      g.shake = 30;
      g.freezeT = Math.max(g.freezeT, 2.5);
      for (let i = 0; i < 4; i++) {
        g.particles.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 1.2 + i * 0.2, max: 1.2 + i * 0.2, size: 10 + i * 14, color: i % 2 ? '#fde68a' : '#f0abfc', type: 'ring' });
      }
      burst(g, e.x, e.y, 90, '#fef3c7', 'soul');
      if (isFinalWave(g.wave)) g.endingPending = true;
      g.events.push({ type: 'kingDown', wave: g.wave, tier });
    } else {
      g.events.push({ type: 'bossDown', wave: g.wave, tier });
    }
    if (g.wave === 10) g.events.push({ type: 'achCheck', achId: 'wave10' });
    if (g.wave === 20) g.events.push({ type: 'achCheck', achId: 'wave20' });
    if (g.wave === 30) g.events.push({ type: 'achCheck', achId: 'wave30' });
    if (g.wave === 50) g.events.push({ type: 'achCheck', achId: 'wave50' });
  }
}

function applyDamage(g: Game, e: Enemy, dmgIn: number, src: Tower | null, trueDmg = false, quiet = false) {
  if (e.dead || (e.boss && e.ghost)) return;
  let dmg = dmgIn;
  if (!trueDmg && e.armor > 0) dmg = Math.max(dmg * ECON.armorFloor, dmg - e.armor);
  if (e.markT > 0) dmg *= 1 + e.markAmp;
  // thermal shock synergy: chilled + burning enemies take +35% damage
  if (g.thermalActive && e.slowT > 0 && e.burnT > 0) dmg *= 1.35;
  let crit = false;
  if (src && !quiet && g.mods.critCh > 0 && Math.random() < g.mods.critCh) {
    dmg *= 2;
    crit = true;
    audio.critDing();
  }
  // reaver shield soaks damage first
  if (e.shield > 0) {
    const absorbed = Math.min(e.shield, dmg);
    e.shield -= absorbed;
    dmg -= absorbed;
    if (!quiet) e.flash = 0.14;
    if (!quiet && absorbed >= 2) addText(g, e.x, e.y - e.radius - 6, `⛨${Math.round(absorbed)}`, '#93c5fd', 10);
    if (e.shield <= 0 && absorbed > 0) {
      burst(g, e.x, e.y, 8, '#bfdbfe', 'spark');
      g.particles.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.3, max: 0.3, size: e.radius, color: '#93c5fd', type: 'ring' });
    }
    if (dmg <= 0) return;
  }
  e.hp -= dmg;
  // The King cannot skip a phase from a high-damage hit or a burning effect.
  if (e.variant === 'king') {
    if (g.kingPhase === 1) e.hp = Math.max(e.hp, e.maxHp * 0.65);
    else if (g.kingPhase === 2) e.hp = Math.max(e.hp, e.maxHp * 0.3);
  }
  if (!quiet) e.flash = 0.14;
  if (!quiet && !crit && dmg < 60) audio.tick();
  if (!quiet && (crit || dmg >= 2)) {
    addText(g, e.x, e.y - e.radius - 6, crit ? `${Math.round(dmg)}!` : String(Math.round(dmg)), crit ? '#fb923c' : '#fde68a', crit ? 14 : e.boss ? 15 : 10);
  }
  if (e.hp <= 0) {
    killEnemy(g, e, src);
    return;
  }
  // The King: three phases — each threshold summons his court and hardens him
  if (e.boss && e.variant === 'king') {
    const frac = e.hp / e.maxHp;
    const wantPhase = frac <= 0.3 ? 3 : frac <= 0.65 ? 2 : 1;
    if (wantPhase > g.kingPhase) {
      g.kingPhase = wantPhase;
      e.armor += 3;
      e.speed *= 1.18;
      e.shield = e.maxHp * 0.08;
      e.maxShield = e.shield;
      const court: Enemy['kind'][] = wantPhase === 2 ? ['reaver', 'reaver', 'warp', 'shade'] : ['frostgiant', 'reaver', 'warp', 'warp', 'healer'];
      court.forEach((k, i) => {
        const before = g.spawned;
        spawnEnemy(g, k, Math.max(0, e.dist - 30 - i * 14), rand(-16, 16));
        g.spawned = before;
      });
      addText(g, e.x, e.y - e.radius - 30, wantPhase === 2 ? 'پادشاه: «برخیزید!»' : 'پادشاه: «تاجِ من...»', '#fde68a', 16);
      burst(g, e.x, e.y, 40, '#c084fc', 'spark');
      g.particles.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.8, max: 0.8, size: 20, color: '#fde68a', type: 'ring' });
      g.shake = Math.max(g.shake, 14);
      audio.bossSting();
      g.events.push({ type: 'kingPhase', phase: wantPhase });
    }
  }
  // Hundred-Eye splits as it bleeds
  if (e.boss && e.variant === 'eye') {
    const thresholds = [0.75, 0.5, 0.25];
    const frac = e.hp / e.maxHp;
    while (e.eyeStage < thresholds.length && frac <= thresholds[e.eyeStage]) {
      e.eyeStage++;
      for (let i = 0; i < 2; i++) {
        const before = g.spawned;
        spawnEnemy(g, 'splitter', Math.max(0, e.dist - 10), e.lat + rand(-14, 14));
        g.spawned = before;
      }
      addText(g, e.x, e.y - e.radius - 26, 'صدچشم شکافت!', '#f0abfc', 13);
      burst(g, e.x, e.y, 16, '#c084fc', 'spark');
      audio.boom(false);
    }
  }
}

function applySlow(g: Game, e: Enemy, pct: number, dur: number) {
  if (e.dead || (e.boss && e.ghost)) return;
  const eff = Math.min(0.82, pct * g.mods.slowMult) * (1 - e.slowResist);
  if (eff <= 0.01) return;
  if (eff >= e.slowPct || e.slowT < 0.25) {
    e.slowPct = Math.max(e.slowPct * 0.6, eff);
    e.slowT = Math.max(e.slowT, dur);
  }
  if (Math.random() < 0.3) {
    g.particles.push({
      x: e.x + rand(-6, 6),
      y: e.y + rand(-6, 6),
      vx: rand(-8, 8),
      vy: rand(-22, -10),
      life: 0.5,
      max: 0.5,
      size: rand(1, 2.2),
      color: '#a5f3fc',
      type: 'snow',
    });
  }
}

/* ── tower combat ──────────────────────────────────────────── */

function pickTarget(g: Game, t: Tower, range: number): Enemy | null {
  let best: Enemy | null = null;
  let bestVal = -Infinity;
  const r2 = range * range;
  for (const e of g.enemies) {
    if (e.dead || (e.boss && e.ghost)) continue;
    const dx = e.x - t.x;
    const dy = e.y - t.y;
    if (dx * dx + dy * dy > r2) continue;
    let val: number;
    if (t.targetMode === 'strong') val = e.hp + e.shield;
    else if (t.targetMode === 'last') val = -e.dist;
    else val = e.dist;
    if (val > bestVal) {
      bestVal = val;
      best = e;
    }
  }
  return best;
}

function jitterLine(a: { x: number; y: number }, b: { x: number; y: number }, mag: number): { x: number; y: number }[] {
  const pts = [a];
  const segs = 4;
  for (let s = 1; s < segs; s++) {
    const t = s / segs;
    pts.push({ x: a.x + (b.x - a.x) * t + rand(-mag, mag), y: a.y + (b.y - a.y) * t + rand(-mag, mag) });
  }
  pts.push(b);
  return pts;
}

function fireTesla(g: Game, t: Tower, st: (typeof TOWERS)[TowerKind]['levels'][number], effDmg: number, target: Enemy) {
  const synChains = t.synergies.includes('superconductor') ? 2 : 0;
  const chains = (st.chains ?? 3) + g.mods.chainBonus + synChains;
  const falloff = st.falloff ?? 0.75;
  const visited = new Set<number>();
  let cur: Enemy | null = target;
  let dmg = effDmg;
  const pts: { x: number; y: number }[] = [{ x: t.x, y: t.y - 10 }];
  for (let n = 0; n < chains && cur; n++) {
    visited.add(cur.id);
    applyDamage(g, cur, dmg, t);
    pts.push({ x: cur.x, y: cur.y });
    dmg *= falloff;
    let next: Enemy | null = null;
    let nd = 135 * 135;
    for (const e of g.enemies) {
      if (e.dead || visited.has(e.id) || (e.boss && e.ghost)) continue;
      const dx = e.x - cur.x;
      const dy = e.y - cur.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < nd) {
        nd = d2;
        next = e;
      }
    }
    cur = next;
  }
  const jit: { x: number; y: number }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const seg = jitterLine(pts[i], pts[i + 1], 9);
    seg.forEach((p, k) => {
      if (i === 0 || k > 0) jit.push(p);
    });
  }
  g.bolts.push({ pts: jit, life: 0.2, max: 0.2, color: '#c084fc' });
}

function fireSniper(g: Game, t: Tower, st: (typeof TOWERS)[TowerKind]['levels'][number], effDmg: number, target: Enemy) {
  applyDamage(g, target, effDmg, t);
  if (st.markPct && st.markDur && !target.dead) {
    target.markT = st.markDur;
    target.markAmp = st.markPct;
  }
  // railgun synergy: arc lightning to 2 nearby foes
  if (t.synergies.includes('railgun')) {
    let arcs = 0;
    for (const o of g.enemies) {
      if (o.dead || o.id === target.id || (o.boss && o.ghost)) continue;
      if (Math.hypot(o.x - target.x, o.y - target.y) <= 125 && arcs < 2) {
        applyDamage(g, o, effDmg * 0.45, t);
        g.bolts.push({ pts: jitterLine({ x: target.x, y: target.y }, { x: o.x, y: o.y }, 7), life: 0.16, max: 0.16, color: '#e879f9' });
        arcs++;
      }
    }
  }
  g.bolts.push({ pts: jitterLine({ x: t.x, y: t.y }, { x: target.x, y: target.y }, 2), life: 0.12, max: 0.12, color: '#fde047' });
  burst(g, target.x, target.y, 3, '#fde047', 'spark');
}

function fireTower(g: Game, t: Tower, target: Enemy) {
  const def = TOWERS[t.kind];
  const st = def.levels[t.level];
  const eff = effTowerStats(g, t);
  t.angle = Math.atan2(target.y - t.y, target.x - t.x);
  t.cooldown = 1 / eff.rate;
  t.recoil = 1;
  t.flash = 1;
  audio.shoot(t.kind);
  if (t.kind === 'tesla') {
    fireTesla(g, t, st, eff.dmg, target);
    return;
  }
  if (t.kind === 'sniper') {
    fireSniper(g, t, st, eff.dmg, target);
    return;
  }
  const mx = t.x + Math.cos(t.angle) * 20;
  const my = t.y + Math.sin(t.angle) * 20;
  const incendiary = t.kind === 'dart' && t.synergies.includes('incendiary');
  const burnScale = eff.dmg / Math.max(1, st.dmg);
  g.projectiles.push({
    id: g.nextId++,
    owner: t.id,
    kind: t.kind,
    x: mx,
    y: my,
    targetId: target.id,
    tx: target.x,
    ty: target.y,
    speed: st.projSpeed,
    dmg: eff.dmg,
    splash: st.splash ?? 0,
    slowPct: st.slowPct ?? 0,
    slowDur: st.slowDur ?? 0,
    chillRadius: st.chillRadius ?? 0,
    pierce: st.pierce ?? 0,
    burnDps: incendiary ? eff.dmg * 0.32 : (st.burnDps ?? 0) * burnScale,
    burnDur: incendiary ? 2.0 : st.burnDur ?? 0,
    burnSpread: st.burnSpread ?? 0,
    hit1: -1,
    hit2: -1,
    trail: [],
    dead: false,
  });
}

function explodeAt(g: Game, p: Projectile, x: number, y: number, src: Tower | null) {
  const r = p.splash;
  audio.boom(false);
  g.shake = Math.max(g.shake, 2.4);
  burst(g, x, y, 12, '#fb923c', 'spark');
  burst(g, x, y, 8, '#78716c', 'smoke');
  g.particles.push({ x, y, vx: 0, vy: 0, life: 0.35, max: 0.35, size: r * 0.5, color: '#fdba74', type: 'ring' });
  for (const e of g.enemies) {
    if (e.dead || (e.boss && e.ghost)) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d > r + e.radius) continue;
    const inner = d < r * 0.55;
    applyDamage(g, e, inner ? p.dmg : p.dmg * 0.65, src);
    if (p.slowPct > 0) applySlow(g, e, p.slowPct, p.slowDur);
  }
}

function burnHit(g: Game, p: Projectile, e: Enemy | null, x: number, y: number, src: Tower | null) {
  burst(g, x, y, 7, '#fb923c', 'spark');
  if (e && !e.dead) {
    applyDamage(g, e, p.dmg, src);
    if (p.burnDps > 0 && !e.dead) {
      if (p.burnDps >= e.burnDps) {
        e.burnDps = p.burnDps;
        e.burnT = Math.max(e.burnT, p.burnDur);
        e.burnSpread = p.burnSpread;
        e.burnOwner = p.owner;
      }
    }
  }
}

function frostHit(g: Game, p: Projectile, e: Enemy | null, x: number, y: number, src: Tower | null) {
  burst(g, x, y, 8, '#a5f3fc', 'snow');
  if (e && !e.dead) {
    applyDamage(g, e, p.dmg, src);
    applySlow(g, e, p.slowPct, p.slowDur);
  }
  const chillR = p.chillRadius > 0 ? p.chillRadius : e ? 0 : 42;
  if (chillR > 0) {
    for (const o of g.enemies) {
      if (o.dead || (e && o.id === e.id)) continue;
      if (Math.hypot(o.x - x, o.y - y) <= chillR + o.radius) applySlow(g, o, p.slowPct * 0.6, p.slowDur);
    }
  }
}

/* ── companion AI ──────────────────────────────────────────── */

function steerTo(p: Pet, tx: number, ty: number, dt: number, accel: number, maxSp: number) {
  const dx = tx - p.x;
  const dy = ty - p.y;
  const d = Math.hypot(dx, dy) || 1;
  p.vx += (dx / d) * accel * dt;
  p.vy += (dy / d) * accel * dt;
  const sp = Math.hypot(p.vx, p.vy);
  if (sp > maxSp) {
    p.vx = (p.vx / sp) * maxSp;
    p.vy = (p.vy / sp) * maxSp;
  }
  p.vx *= 1 - dt * 1.6;
  p.vy *= 1 - dt * 1.6;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  if (Math.abs(p.vx) + Math.abs(p.vy) > 12) p.angle = Math.atan2(p.vy, p.vx);
}

function frontEnemy(g: Game): Enemy | null {
  let best: Enemy | null = null;
  for (const e of g.enemies) {
    if (e.dead || (e.boss && e.ghost)) continue;
    if (!best || e.dist > best.dist) best = e;
  }
  return best;
}

function nearestEnemyTo(g: Game, x: number, y: number, range: number): Enemy | null {
  let best: Enemy | null = null;
  let bd = range * range;
  for (const e of g.enemies) {
    if (e.dead || (e.boss && e.ghost)) continue;
    const d2 = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d2 < bd) {
      bd = d2;
      best = e;
    }
  }
  return best;
}

function updatePet(g: Game, p: Pet, dt: number) {
  p.flap += dt * 9;
  if (p.flash > 0) p.flash -= dt * 2;
  p.cooldown -= dt;
  const L = p.level;
  const w = Math.max(1, g.wave);
  const scale = ECON.hpMult(Math.min(w, 60)) * 0.55 + 0.45; // pets keep pace with the campaign
  const idleX = g.map.coreX - 70 + Math.sin(g.time * 0.8) * 26;
  const idleY = g.map.coreY - 46 + Math.cos(g.time * 1.1) * 14;

  if (p.kind === 'wisp') {
    const c = g.crystals[0];
    if (c) {
      steerTo(p, c.x, c.y - 6, dt, 900, 260);
      if (Math.hypot(c.x - p.x, c.y - p.y) < 18) tryCollectCrystalAt(g, c.x, c.y, 20);
    } else {
      const f = frontEnemy(g);
      if (f && g.phase === 'combat') steerTo(p, f.x - 40, f.y - 44, dt, 500, 170);
      else steerTo(p, idleX, idleY, dt, 400, 140);
    }
    if (p.cooldown <= 0 && g.phase === 'combat') {
      const t = nearestEnemyTo(g, p.x, p.y, 150);
      if (t) {
        p.cooldown = Math.max(1.2, 3.2 - L * 0.08);
        applyDamage(g, t, (6 + L * 2.2) * scale, null, true);
        g.bolts.push({ pts: jitterLine({ x: p.x, y: p.y }, { x: t.x, y: t.y }, 4), life: 0.14, max: 0.14, color: '#67e8f9' });
        burst(g, t.x, t.y, 4, '#a5f3fc', 'spark');
      }
    }
  } else if (p.kind === 'owl') {
    const f = frontEnemy(g);
    if (f && g.phase === 'combat') steerTo(p, f.x - 34, f.y - 56, dt, 620, 210);
    else steerTo(p, idleX, idleY, dt, 400, 140);
    if (p.cooldown <= 0 && g.phase === 'combat') {
      const t = nearestEnemyTo(g, p.x, p.y, 170);
      if (t) {
        p.cooldown = Math.max(0.55, 1.5 - L * 0.035);
        g.projectiles.push({
          id: g.nextId++,
          owner: -2,
          kind: 'burn',
          x: p.x,
          y: p.y,
          targetId: t.id,
          tx: t.x,
          ty: t.y,
          speed: 420,
          dmg: (9 + L * 3) * scale,
          splash: 0,
          slowPct: 0,
          slowDur: 0,
          chillRadius: 0,
          pierce: 0,
          burnDps: (4 + L * 1.1) * scale,
          burnDur: 2.2,
          burnSpread: L >= 10 ? 1 : 0,
          hit1: -1,
          hit2: -1,
          trail: [],
          dead: false,
        });
        audio.shoot('burn');
      }
    }
  } else if (p.kind === 'tortoise') {
    // patrols the last stretch before the heart
    const anchor = posAt(g.map, g.map.total - 150 - Math.sin(g.time * 0.5) * 60, -30);
    steerTo(p, anchor.x, anchor.y, dt, 240, 70);
    const auraR = 105 + L * 2.5;
    for (const e of g.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) <= auraR) applySlow(g, e, 0.22 + L * 0.008, 0.6);
    }
    if (p.cooldown <= 0 && g.phase === 'combat') {
      p.cooldown = Math.max(1.4, 3 - L * 0.06);
      let hit = 0;
      for (const e of g.enemies) {
        if (e.dead || hit >= 6) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) <= auraR * 0.8) {
          applyDamage(g, e, (7 + L * 2) * scale, null, true);
          hit++;
        }
      }
      if (hit > 0) {
        g.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 12, color: '#93c5fd', type: 'ring' });
        burst(g, p.x, p.y, 10, '#bfdbfe', 'snow');
      }
    }
  } else if (p.kind === 'phoenix') {
    const f = frontEnemy(g);
    if (f && g.phase === 'combat') steerTo(p, f.x - 20, f.y - 70, dt, 700, 240);
    else steerTo(p, idleX, idleY, dt, 400, 150);
    if (p.cooldown <= 0 && g.phase === 'combat') {
      const t = nearestEnemyTo(g, p.x, p.y, 190);
      if (t) {
        p.cooldown = Math.max(1.1, 2.4 - L * 0.045);
        const r = 44 + L;
        const dmg = (16 + L * 4.2) * scale;
        g.bolts.push({ pts: jitterLine({ x: p.x, y: p.y }, { x: t.x, y: t.y }, 3), life: 0.16, max: 0.16, color: '#f9a8d4' });
        burst(g, t.x, t.y, 14, '#fb7185', 'spark');
        g.particles.push({ x: t.x, y: t.y, vx: 0, vy: 0, life: 0.35, max: 0.35, size: r * 0.5, color: '#f472b6', type: 'ring' });
        for (const e of g.enemies) {
          if (e.dead) continue;
          if (Math.hypot(e.x - t.x, e.y - t.y) <= r + e.radius) {
            applyDamage(g, e, dmg, null, true);
            if (e.burnDps < dmg * 0.25) {
              e.burnDps = dmg * 0.25;
              e.burnT = Math.max(e.burnT, 2);
            }
          }
        }
        audio.boom(false);
      }
    }
  } else {
    // drake — breath beam through a line of foes
    const f = frontEnemy(g);
    if (f && g.phase === 'combat') steerTo(p, f.x - 90, f.y - 60, dt, 560, 190);
    else steerTo(p, idleX, idleY, dt, 400, 140);
    if (p.cooldown <= 0 && g.phase === 'combat') {
      const t = nearestEnemyTo(g, p.x, p.y, 240);
      if (t) {
        p.cooldown = Math.max(1.3, 2.9 - L * 0.05);
        const ang = Math.atan2(t.y - p.y, t.x - p.x);
        const ex = p.x + Math.cos(ang) * 260;
        const ey = p.y + Math.sin(ang) * 260;
        p.angle = ang;
        const dmg = (18 + L * 5) * scale;
        let hit = 0;
        for (const e of g.enemies) {
          if (e.dead || (e.boss && e.ghost) || hit >= 12) continue;
          // distance from point to the beam segment
          const vx = ex - p.x;
          const vy = ey - p.y;
          const len2 = vx * vx + vy * vy;
          const u = Math.max(0, Math.min(1, ((e.x - p.x) * vx + (e.y - p.y) * vy) / len2));
          const px = p.x + vx * u;
          const py = p.y + vy * u;
          if (Math.hypot(e.x - px, e.y - py) <= 22 + e.radius) {
            applyDamage(g, e, dmg, null, true);
            applySlow(g, e, 0.3, 1.2);
            hit++;
          }
        }
        g.bolts.push({ pts: jitterLine({ x: p.x, y: p.y }, { x: ex, y: ey }, 5), life: 0.28, max: 0.28, color: '#c084fc' });
        g.bolts.push({ pts: jitterLine({ x: p.x, y: p.y }, { x: ex, y: ey }, 9), life: 0.22, max: 0.22, color: '#e9d5ff' });
        burst(g, p.x + Math.cos(ang) * 20, p.y + Math.sin(ang) * 20, 10, '#d8b4fe', 'snow');
        audio.spellFreeze();
      }
    }
  }
}

/* ── spells ────────────────────────────────────────────────── */

export function castSpell(g: Game, id: SpellId): boolean {
  if (g.paused || g.phase !== 'combat' || g.spellCd[id] > 0) {
    audio.error();
    return false;
  }
  const def = SPELLS.find((s) => s.id === id)!;
  g.spellCd[id] = def.cd * g.mods.spellCdMult;
  const w = Math.max(1, g.wave);

  if (id === 'pulse') {
    audio.spellPulse();
    g.shake = Math.max(g.shake, 9);
    g.particles.push({ x: g.map.coreX, y: g.map.coreY, vx: 0, vy: 0, life: 0.9, max: 0.9, size: 20, color: '#5eead4', type: 'ring' });
    g.particles.push({ x: g.map.coreX, y: g.map.coreY, vx: 0, vy: 0, life: 0.6, max: 0.6, size: 10, color: '#99f6e4', type: 'ring' });
    for (const e of g.enemies) {
      if (e.dead) continue;
      e.dist = Math.max(0, e.dist - 135);
      applyDamage(g, e, 14 * ECON.hpMult(w) * g.mods.dmgMult, null, true);
    }
    addText(g, g.map.coreX, g.map.coreY - 44, 'ضربان!', '#5eead4', 15);
  } else if (id === 'frost') {
    audio.spellFreeze();
    g.freezeT = 3.2;
    for (let i = 0; i < 40; i++) {
      const p = posAt(g.map, Math.random() * g.map.total, rand(-20, 20));
      g.particles.push({ x: p.x, y: p.y, vx: rand(-10, 10), vy: rand(-30, -10), life: rand(0.6, 1.4), max: 1.4, size: rand(1.4, 3), color: '#a5f3fc', type: 'snow' });
    }
  } else {
    audio.spellTear();
    g.shake = Math.max(g.shake, 6);
    const alive = g.enemies.filter((e) => !e.dead && !(e.boss && e.ghost)).sort((a, b) => b.dist - a.dist);
    const picks = alive.slice(0, 9);
    const strikeDmg = 36 * ECON.hpMult(w) * g.mods.dmgMult;
    picks.forEach((e, i) => {
      g.strikes.push({ delay: i * 0.07, targetId: e.id, dmg: strikeDmg });
    });
  }
  return true;
}

/* ── update ────────────────────────────────────────────────── */

export function update(g: Game, rawDt: number) {
  const dt = Math.min(rawDt, 0.05) * g.speed;
  g.time += dt;

  // weather always moves
  const theme = ACTS[g.act - 1];
  for (const m of g.weather) {
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    if (theme.weather === 'rain') {
      if (m.y > 712) {
        m.y = rand(-24, -8);
        m.x = Math.random() * 1320;
      }
    } else if (theme.weather === 'ash') {
      m.x += Math.sin(g.time * 2 + m.y * 0.05) * 12 * dt;
      if (m.y > 712) {
        m.y = rand(-14, -4);
        m.x = Math.random() * 1280;
      }
    } else {
      if (m.y < -8 || m.life <= 0) {
        m.x = Math.random() * 1280;
        m.y = 712;
        m.life = rand(6, 14);
      }
      m.life -= dt * 0.1;
    }
  }

  if (g.phase === 'over') {
    // Keep the final heart-burst visible while combat has stopped.
    for (const p of g.particles) {
      p.life -= dt;
      if (p.type === 'ring') p.size += dt * 300;
      else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }
    g.particles = g.particles.filter((p) => p.life > 0);
    for (const t of g.texts) { t.life -= dt; t.y -= dt * 34; }
    g.texts = g.texts.filter((t) => t.life > 0);
    g.shake *= Math.pow(0.001, dt);
    return;
  }

  // Cooldowns are earned during combat; waiting in the build phase cannot reset every spell.
  if (g.phase === 'combat') {
    (Object.keys(g.spellCd) as SpellId[]).forEach((k) => {
      if (g.spellCd[k] > 0) g.spellCd[k] = Math.max(0, g.spellCd[k] - dt);
    });
  }
  if (g.freezeT > 0) g.freezeT -= dt;

  if (g.comboT > 0) {
    g.comboT -= dt;
    if (g.comboT <= 0) g.combo = 0;
  }

  // soul crystals
  for (let i = g.crystals.length - 1; i >= 0; i--) {
    const c = g.crystals[i];
    c.life -= dt;
    if (g.mods.autoCrystal && c.life < c.max - 0.35) {
      collectCrystal(g, i);
      continue;
    }
    if (c.life <= 0) g.crystals.splice(i, 1);
  }

  // scheduled sky-tear strikes (deterministic, respects pause)
  for (let i = g.strikes.length - 1; i >= 0; i--) {
    const s = g.strikes[i];
    s.delay -= dt;
    if (s.delay <= 0) {
      g.strikes.splice(i, 1);
      const e = g.enemies.find((x) => x.id === s.targetId && !x.dead && !(x.boss && x.ghost));
      if (e) {
        g.bolts.push({ pts: jitterLine({ x: e.x + rand(-30, 30), y: -16 }, { x: e.x, y: e.y }, 14), life: 0.2, max: 0.2, color: '#fef08a' });
        applyDamage(g, e, s.dmg, null, true);
        burst(g, e.x, e.y, 6, '#fef08a', 'spark');
      }
    }
  }

  // spawning
  if (g.phase === 'combat') {
    while (g.gIdx < g.groups.length) {
      const grp = g.groups[g.gIdx];
      if (g.groupWait > 0) {
        g.groupWait -= dt;
        break;
      }
      g.spawnT -= dt;
      while (g.spawnT <= 0 && g.gCount < grp.count) {
        spawnEnemy(g, grp.kind);
        g.gCount++;
        g.spawnT += grp.interval;
      }
      if (g.gCount >= grp.count) {
        g.gIdx++;
        g.gCount = 0;
        g.spawnT = 0;
        g.groupWait = g.gIdx < g.groups.length ? g.groups[g.gIdx].delay : 0;
      }
      if (g.spawnT > 0) break;
    }
  }

  // enemies
  for (const e of g.enemies) {
    if (e.dead) continue;

    if (e.slowT > 0) {
      e.slowT -= dt;
      if (e.slowT <= 0) e.slowPct = 0;
    }
    if (e.markT > 0) e.markT -= dt;

    // mist queen phasing
    if (e.boss && e.variant === 'mist') {
      e.ghostT -= dt;
      if (e.ghostT <= 0) {
        e.ghost = !e.ghost;
        e.ghostT = e.ghost ? 2.4 : 6.5;
        if (e.ghost) addText(g, e.x, e.y - e.radius - 14, 'محو شد...', '#e9d5ff', 12);
      }
    }

    // burn DoT
    if (e.burnT > 0) {
      e.burnT -= dt;
      const burnSrc = g.towers.find((x) => x.id === e.burnOwner) ?? null;
      applyDamage(g, e, e.burnDps * dt, burnSrc, true, true);
      if (e.dead) continue;
      if (Math.random() < 0.25) {
        g.particles.push({ x: e.x + rand(-6, 6), y: e.y - rand(0, 8), vx: rand(-10, 10), vy: rand(-50, -24), life: 0.4, max: 0.4, size: rand(1.4, 2.6), color: '#fb923c', type: 'spark' });
      }
    }

    // healer pulses
    if (e.kind === 'healer') {
      e.healT -= dt;
      if (e.healT <= 0) {
        e.healT = 1.6;
        let healed = 0;
        for (const o of g.enemies) {
          if (o.dead || o.id === e.id || o.boss) continue;
          if (Math.hypot(o.x - e.x, o.y - e.y) <= 95 && o.hp < o.maxHp) {
            o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.04);
            healed++;
            g.particles.push({ x: o.x, y: o.y - o.radius, vx: 0, vy: -18, life: 0.5, max: 0.5, size: 2, color: '#6ee7b7', type: 'heal' });
          }
        }
        if (healed > 0) g.particles.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.45, max: 0.45, size: 8, color: '#34d399', type: 'ring' });
      }
    }

    // warper blinks forward, escaping tower ranges
    if (e.kind === 'warp' && g.freezeT <= 0) {
      e.warpT -= dt;
      if (e.warpT <= 0) {
        e.warpT = rand(2.4, 3.6);
        const jump = 78;
        burst(g, e.x, e.y, 10, '#e879f9', 'spark');
        g.particles.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.4, max: 0.4, size: e.radius * 1.6, color: '#e879f9', type: 'ring' });
        e.dist = Math.min(g.map.total, e.dist + jump);
        const np = posAt(g.map, e.dist, e.lat);
        g.particles.push({ x: np.x, y: np.y, vx: 0, vy: 0, life: 0.4, max: 0.4, size: e.radius * 1.4, color: '#f0abfc', type: 'ring' });
        audio.shard();
      }
    }

    const frozen = g.freezeT > 0;
    if (!frozen) {
      const eff = e.slowT > 0 ? 1 - e.slowPct : 1;
      e.dist += e.speed * eff * dt;
    }
    const p = posAt(g.map, e.dist, e.lat);
    e.x = p.x;
    e.y = p.y + Math.sin(g.time * 6 + e.wob) * 1.5;
    if (e.flash > 0) e.flash -= dt;
    if (e.dist >= g.map.total) {
      e.dead = true;
      if (g.bossId === e.id) g.bossId = null;
      // tortoise companion: its shell swallows the first leaks of each wave
      if (g.pet && g.pet.kind === 'tortoise' && g.pet.shieldLeft > 0 && !e.boss) {
        g.pet.shieldLeft--;
        g.pet.flash = 1;
        burst(g, g.map.coreX, g.map.coreY, 14, '#93c5fd', 'snow');
        g.particles.push({ x: g.map.coreX, y: g.map.coreY, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 16, color: '#93c5fd', type: 'ring' });
        addText(g, g.map.coreX, g.map.coreY - 40, 'لاکِ بلورپشت!', '#bfdbfe', 14);
        audio.shard();
        continue;
      }
      g.lives -= e.dmg;
      g.leaks++;
      g.shake = Math.max(g.shake, 7);
      audio.leak();
      burst(g, g.map.coreX, g.map.coreY, 16, '#f87171', 'spark');
      addText(g, g.map.coreX, g.map.coreY - 40, `-${e.dmg}`, '#f87171', 16);
      // phoenix companion: once per wave it breathes life back into the heart
      if (g.pet && g.pet.kind === 'phoenix' && g.pet.reviveLeft > 0 && g.lives > 0 && g.lives <= 5) {
        g.pet.reviveLeft--;
        const heal = 3 + Math.floor(g.pet.level / 5);
        g.lives += heal;
        g.pet.flash = 1;
        burst(g, g.map.coreX, g.map.coreY, 30, '#f9a8d4', 'spark');
        g.particles.push({ x: g.map.coreX, y: g.map.coreY, vx: 0, vy: 0, life: 0.7, max: 0.7, size: 14, color: '#f472b6', type: 'ring' });
        addText(g, g.map.coreX, g.map.coreY - 60, `شراره: +${heal} جان`, '#f9a8d4', 15);
        audio.apex();
      }
      if (!g.firstLeakFired) {
        g.firstLeakFired = true;
        g.events.push({ type: 'firstLeak' });
      } else {
        g.events.push({ type: 'leak' });
      }
      if (g.lives <= 0) {
        g.lives = 0;
        g.phase = 'over';
        g.shake = 20;
        audio.gameover();
        burst(g, g.map.coreX, g.map.coreY, 60, '#67e8f9', 'soul');
        g.particles.push({ x: g.map.coreX, y: g.map.coreY, vx: 0, vy: 0, life: 1, max: 1, size: 30, color: '#67e8f9', type: 'ring' });
        g.events.push({ type: 'gameover', wave: g.wave });
      } else if (g.lives <= 6 && !g.lowLivesFired) {
        g.lowLivesFired = true;
        g.events.push({ type: 'lowLives' });
      }
    }
  }
  if (g.enemies.some((e) => e.dead)) g.enemies = g.enemies.filter((e) => !e.dead);

  if (g.phase === 'over') return;

  // companion
  if (g.pet) updatePet(g, g.pet, dt);
  if (g.pet && g.petXpBank >= 1) {
    const grant = Math.floor(g.petXpBank);
    g.petXpBank -= grant;
    const leveled = addPetXp(g.pet.kind, grant);
    if (leveled > 0) {
      g.pet.level = leveled;
      g.pet.flash = 1;
      burst(g, g.pet.x, g.pet.y, 22, '#fef08a', 'spark');
      g.particles.push({ x: g.pet.x, y: g.pet.y, vx: 0, vy: 0, life: 0.6, max: 0.6, size: 10, color: '#fef08a', type: 'ring' });
      addText(g, g.pet.x, g.pet.y - 22, `سطح ${leveled}!`, '#fef08a', 14);
      audio.apex();
      g.events.push({ type: 'petLevel', level: leveled });
    }
  }

  // towers
  for (const t of g.towers) {
    if (t.flash > 0) t.flash -= dt * 5;
    if (t.recoil > 0) t.recoil -= dt * 4;
    t.cooldown -= dt;
    const eff = effTowerStats(g, t);
    const target = pickTarget(g, t, eff.range);
    if (target) {
      const want = Math.atan2(target.y - t.y, target.x - t.x);
      let diff = want - t.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      t.angle += diff * Math.min(1, dt * 14);
      if (t.cooldown <= 0) fireTower(g, t, target);
    }
  }

  // projectiles
  for (const p of g.projectiles) {
    if (p.dead) continue;
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 7) p.trail.shift();
    const target = g.enemies.find((e) => e.id === p.targetId && !e.dead && !(e.boss && e.ghost)) ?? null;
    if (target) {
      p.tx = target.x;
      p.ty = target.y;
    }
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= step + (target ? target.radius * 0.6 : 0)) {
      p.x = p.tx;
      p.y = p.ty;
      const src = g.towers.find((x) => x.id === p.owner) ?? null;
      if (p.kind === 'cannon') {
        explodeAt(g, p, p.x, p.y, src);
        p.dead = true;
      } else if (p.kind === 'frost') {
        frostHit(g, p, target, p.x, p.y, src);
        p.dead = true;
      } else if (p.kind === 'burn') {
        burnHit(g, p, target, p.x, p.y, src);
        p.dead = true;
      } else {
        // dart (needle)
        if (target) {
          applyDamage(g, target, p.dmg, src);
          if (p.burnDps > 0 && !target.dead && p.burnDps >= target.burnDps) {
            target.burnDps = p.burnDps;
            target.burnT = Math.max(target.burnT, p.burnDur);
            target.burnOwner = p.owner;
          }
          if (p.pierce > 0) {
            p.pierce--;
            p.hit2 = p.hit1;
            p.hit1 = target.id;
            let next: Enemy | null = null;
            let nd = 120 * 120;
            for (const e of g.enemies) {
              if (e.dead || e.id === p.hit1 || e.id === p.hit2 || (e.boss && e.ghost)) continue;
              const ddx = e.x - p.x;
              const ddy = e.y - p.y;
              const d2 = ddx * ddx + ddy * ddy;
              if (d2 < nd) {
                nd = d2;
                next = e;
              }
            }
            if (next) {
              p.targetId = next.id;
              p.tx = next.x;
              p.ty = next.y;
              burst(g, p.x, p.y, 3, '#7dd3fc', 'spark');
            } else {
              p.dead = true;
            }
          } else {
            p.dead = true;
          }
        } else {
          p.dead = true;
          burst(g, p.x, p.y, 2, '#7dd3fc', 'spark');
        }
      }
    } else if (d > 0.001) {
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
    }
  }
  if (g.projectiles.some((p) => p.dead)) g.projectiles = g.projectiles.filter((p) => !p.dead);
  let blastsProcessed = 0;
  while (g.blastQueue.length > 0 && blastsProcessed++ < 24) {
    const blast = g.blastQueue.shift()!;
    const source = g.towers.find((t) => t.id === blast.ownerId) ?? null;
    for (const e of g.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - blast.x, e.y - blast.y) <= blast.radius + e.radius) {
        applyDamage(g, e, blast.damage, source, true, true);
      }
    }
  }
  if (g.enemies.some((e) => e.dead)) g.enemies = g.enemies.filter((e) => !e.dead);

  for (const b of g.bolts) b.life -= dt;
  if (g.bolts.some((b) => b.life <= 0)) g.bolts = g.bolts.filter((b) => b.life > 0);

  for (const p of g.particles) {
    p.life -= dt;
    if (p.type === 'ring') {
      p.size += dt * 300;
    } else if (p.type === 'soul') {
      const dx = g.map.coreX - p.x;
      const dy = g.map.coreY - p.y;
      const d = Math.hypot(dx, dy) || 1;
      p.vx += (dx / d) * 240 * dt;
      p.vy += (dy / d) * 240 * dt;
      const sp = Math.hypot(p.vx, p.vy);
      const cap = 190;
      if (sp > cap) {
        p.vx = (p.vx / sp) * cap;
        p.vy = (p.vy / sp) * cap;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (d < 26) p.life = Math.min(p.life, 0.12);
    } else {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - dt * 2.2;
      p.vy *= 1 - dt * 2.2;
      if (p.type === 'snow') p.vx += Math.sin(g.time * 5 + p.y) * dt * 20;
      if (p.type === 'heal') p.vy -= dt * 20;
    }
  }
  if (g.particles.some((p) => p.life <= 0)) g.particles = g.particles.filter((p) => p.life > 0);

  for (const t of g.texts) {
    t.life -= dt;
    t.y -= dt * 34;
  }
  if (g.texts.some((t) => t.life <= 0)) g.texts = g.texts.filter((t) => t.life > 0);

  if (g.shake > 0) {
    g.shake *= Math.pow(0.001, dt);
    if (g.shake < 0.15) g.shake = 0;
  }

  // wave clear
  if (g.phase === 'combat' && g.spawned >= g.totalWave && g.enemies.length === 0 && g.blastQueue.length === 0) {
    g.phase = 'build';
    g.strikes = [];
    const bonus = ECON.bonus(g.wave);
    let interest = Math.min(ECON.interestCap, Math.floor(g.gold * ECON.interestRate));
    if (g.pet && g.pet.kind === 'wisp') interest += 6 + g.pet.level * 2;
    g.gold += bonus + interest;
    g.earned += bonus + interest;
    if (g.gold >= 1000) g.events.push({ type: 'achCheck', achId: 'rich1000' });
    if (g.wave % 5 === 0) g.lives += g.mods.heal5;
    if (g.dmgBuffWaves > 0) {
      g.dmgBuffWaves--;
      if (g.dmgBuffWaves === 0) g.dmgBuffAmt = 0;
    }
    if (g.rangeBuffWaves > 0) {
      g.rangeBuffWaves--;
      if (g.rangeBuffWaves === 0) g.rangeBuffAmt = 0;
    }
    g.events.push({ type: 'waveClear', wave: g.wave, bonus, interest });
    g.mod = null;
    g.nextMod = rollModifier(g.wave + 1);
    audio.coin();
  }
}

export function collectHud(g: Game): HudInfo {
  const boss = g.bossId !== null ? g.enemies.find((e) => e.id === g.bossId) : null;
  const alive = g.enemies.filter((e) => !e.dead).length;
  return {
    gold: g.gold,
    lives: g.lives,
    wave: g.wave,
    phase: g.phase,
    speed: g.speed,
    paused: g.paused,
    combo: g.combo,
    kills: g.kills,
    earned: g.earned,
    enemiesLeft: g.phase === 'combat' ? g.totalWave - g.spawned + alive : 0,
    bossHp: boss ? { hp: Math.max(0, boss.hp), max: boss.maxHp, name: BOSS_NAMES[boss.variant ?? 'legion'] } : null,
    earlyBonus: ECON.earlyBonus(g.wave + 1),
    act: g.act,
    costMult: g.mods.costMult,
    frozen: g.freezeT > 0,
    spells: { ...g.spellCd },
    mod: g.mod,
    nextMod: g.nextMod,
    buffs: {
      dmg: g.dmgBuffWaves > 0 ? g.dmgBuffAmt : 0,
      dmgWaves: g.dmgBuffWaves,
      range: g.rangeBuffWaves > 0 ? g.rangeBuffAmt : 0,
      rangeWaves: g.rangeBuffWaves,
    },
    crystals: g.crystals.length,
    cycle: cycleOf(Math.max(1, g.wave + (g.phase === 'build' ? 1 : 0))),
    pet: g.pet
      ? {
          kind: g.pet.kind,
          level: g.pet.level,
          xp: petXp(g.pet.kind),
          next: petXpNeeded(g.pet.level),
          shieldLeft: g.pet.shieldLeft,
        }
      : null,
    bossPhase: g.kingPhase,
  };
}

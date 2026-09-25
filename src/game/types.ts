export type TowerKind = 'dart' | 'cannon' | 'frost' | 'tesla' | 'sniper' | 'burn';
export type EnemyKind =
  | 'crawler'
  | 'runner'
  | 'bulwark'
  | 'splitter'
  | 'shade'
  | 'healer'
  | 'frostgiant'
  | 'warp'
  | 'reaver'
  | 'boss';
export type BossVariant = 'legion' | 'mist' | 'eye' | 'king';
export type TargetMode = 'first' | 'strong' | 'last';
export type Phase = 'build' | 'combat' | 'over';
export type SpellId = 'pulse' | 'frost' | 'tear';
export type PetKind = 'wisp' | 'owl' | 'tortoise' | 'phoenix' | 'drake';

export interface PetDef {
  kind: PetKind;
  name: string;
  title: string;
  desc: string;
  lore: string;
  color: string;
  unlockWave: number;
}

export interface Pet {
  kind: PetKind;
  level: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  cooldown: number;
  flap: number;
  shieldLeft: number;
  reviveLeft: number;
  flash: number;
}

export interface TowerLevel {
  cost: number;
  dmg: number;
  rate: number;
  range: number;
  projSpeed: number;
  splash?: number;
  slowPct?: number;
  slowDur?: number;
  chillRadius?: number;
  chains?: number;
  falloff?: number;
  pierce?: number;
  markPct?: number;
  markDur?: number;
  burnDps?: number;
  burnDur?: number;
  burnSpread?: number;
}

export interface TowerDef {
  kind: TowerKind;
  name: string;
  blurb: string;
  tip: string;
  color: string;
  levels: TowerLevel[];
}

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  hp: number;
  speed: number;
  radius: number;
  gold: number;
  dmg: number;
  slowResist: number;
  armor: number;
  counter: string;
  lore: string;
  color: string;
}

export interface SynergyDef {
  id: string;
  a: TowerKind;
  b: TowerKind;
  name: string;
  desc: string;
  color: string;
}

export interface Tower {
  id: number;
  kind: TowerKind;
  level: number;
  ascend: number; // 0..5 repeatable post-Apex stars
  tx: number;
  ty: number;
  x: number;
  y: number;
  invested: number;
  cooldown: number;
  angle: number;
  recoil: number;
  flash: number;
  kills: number;
  targetMode: TargetMode;
  synergies: string[];
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  speed: number;
  dist: number;
  x: number;
  y: number;
  slowT: number;
  slowPct: number;
  gold: number;
  dmg: number;
  radius: number;
  slowResist: number;
  wob: number;
  lat: number;
  flash: number;
  dead: boolean;
  boss: boolean;
  variant: BossVariant | null;
  elite: boolean;
  armor: number;
  burnT: number;
  burnDps: number;
  burnSpread: number;
  burnOwner: number;
  markT: number;
  markAmp: number;
  healT: number;
  ghost: boolean;
  ghostT: number;
  eyeStage: number;
  warpT: number;
  shield: number;
  maxShield: number;
  volatile: boolean;
}

export interface Projectile {
  id: number;
  owner: number;
  kind: TowerKind;
  x: number;
  y: number;
  targetId: number;
  tx: number;
  ty: number;
  speed: number;
  dmg: number;
  splash: number;
  slowPct: number;
  slowDur: number;
  chillRadius: number;
  pierce: number;
  burnDps: number;
  burnDur: number;
  burnSpread: number;
  hit1: number;
  hit2: number;
  trail: { x: number; y: number }[];
  dead: boolean;
}

export interface CrystalDrop {
  id: number;
  x: number;
  y: number;
  life: number;
  max: number;
  gold: number;
}

export type ParticleType = 'spark' | 'smoke' | 'snow' | 'ring' | 'soul' | 'mote' | 'rain' | 'ash' | 'heal';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  type: ParticleType;
}

export interface FloatText {
  x: number;
  y: number;
  life: number;
  max: number;
  text: string;
  color: string;
  size: number;
}

export interface Bolt {
  pts: { x: number; y: number }[];
  life: number;
  max: number;
  color: string;
}

export interface SpawnGroup {
  kind: EnemyKind;
  count: number;
  interval: number;
  delay: number;
}

export interface MapData {
  pathTiles: Set<string>;
  wps: { x: number; y: number }[];
  cum: number[];
  total: number;
  coreX: number;
  coreY: number;
}

export interface ActTheme {
  act: number;
  title: string;
  sub: string;
  img: string;
  short: string;
  groundA: string;
  groundB: string;
  path: string;
  glow: string;
  crystal: string;
  spore: string;
  vein: string;
  weather: 'motes' | 'rain' | 'ash' | 'void';
}

export type Sel =
  | { type: 'none' }
  | { type: 'tile'; tx: number; ty: number }
  | {
      type: 'tower';
      id: number;
      kind: TowerKind;
      level: number;
      ascend: number;
      invested: number;
      kills: number;
      targetMode: TargetMode;
      upgradeCost: number | null;
      isAscend: boolean;
      sellValue: number;
      dmg: number;
      rate: number;
      range: number;
      synergies: string[];
    };

export interface HudInfo {
  gold: number;
  lives: number;
  wave: number;
  phase: Phase;
  speed: number;
  paused: boolean;
  combo: number;
  kills: number;
  earned: number;
  enemiesLeft: number;
  bossHp: { hp: number; max: number; name: string } | null;
  earlyBonus: number;
  act: number;
  costMult: number;
  frozen: boolean;
  spells: Record<SpellId, number>;
  mod: string | null;
  nextMod: string | null;
  buffs: { dmg: number; dmgWaves: number; range: number; rangeWaves: number };
  crystals: number;
  cycle: number;
  pet: { kind: PetKind; level: number; xp: number; next: number; shieldLeft: number } | null;
  bossPhase: number;
}

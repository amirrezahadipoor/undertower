import type { ActTheme, EnemyDef, EnemyKind, MapData, SpellId, SynergyDef, TowerDef, TowerKind } from './types';

export const TILE = 64;
export const COLS = 20;
export const ROWS = 11;
export const W = COLS * TILE; // 1280
export const H = ROWS * TILE; // 704

const WP_TILES: [number, number][] = [
  [-1, 1],
  [16, 1],
  [16, 4],
  [3, 4],
  [3, 7],
  [13, 7],
  [13, 9],
  [18, 9],
];

export const tileKey = (tx: number, ty: number) => `${tx},${ty}`;
export const tileCenter = (t: number) => t * TILE + TILE / 2;

export function buildMap(): MapData {
  const pathTiles = new Set<string>();
  for (let i = 0; i < WP_TILES.length - 1; i++) {
    const [ax, ay] = WP_TILES[i];
    const [bx, by] = WP_TILES[i + 1];
    const dx = Math.sign(bx - ax);
    const dy = Math.sign(by - ay);
    let x = ax;
    let y = ay;
    while (x !== bx || y !== by) {
      if (x >= 0 && x < COLS && y >= 0 && y < ROWS) pathTiles.add(tileKey(x, y));
      x += dx;
      y += dy;
    }
    if (x >= 0 && x < COLS && y >= 0 && y < ROWS) pathTiles.add(tileKey(x, y));
  }
  const wps = WP_TILES.map(([tx, ty]) => ({ x: tileCenter(tx), y: tileCenter(ty) }));
  const cum = [0];
  for (let i = 1; i < wps.length; i++) {
    const dx = wps[i].x - wps[i - 1].x;
    const dy = wps[i].y - wps[i - 1].y;
    cum.push(cum[i - 1] + Math.hypot(dx, dy));
  }
  const last = wps[wps.length - 1];
  return { pathTiles, wps, cum, total: cum[cum.length - 1], coreX: last.x, coreY: last.y };
}

export function posAt(m: MapData, dist: number, lat: number): { x: number; y: number; ang: number } {
  const d = Math.max(0, Math.min(dist, m.total));
  let i = 0;
  while (i < m.cum.length - 2 && m.cum[i + 1] < d) i++;
  const a = m.wps[i];
  const b = m.wps[i + 1];
  const seg = m.cum[i + 1] - m.cum[i] || 1;
  const t = (d - m.cum[i]) / seg;
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const nx = -Math.sin(ang);
  const ny = Math.cos(ang);
  return { x: a.x + (b.x - a.x) * t + nx * lat, y: a.y + (b.y - a.y) * t + ny * lat, ang };
}

/* ─────────────────────────────────────────────────────────── */
/*  Acts                                                       */
/* ─────────────────────────────────────────────────────────── */

export const FINAL_WAVE = 60;
export const actOf = (w: number) => Math.min(6, Math.max(1, Math.ceil((((Math.max(1, w) - 1) % FINAL_WAVE) + 1) / 10)));

export const ACTS: ActTheme[] = [
  {
    act: 1, title: 'فصل اول', sub: 'مرز هنوز می‌خوابد', img: '/assets/menu-bg.jpg', short: 'فصل ۱',
    groundA: '#0d1226', groundB: '#070a18', path: '#141a30', glow: '129,140,248',
    crystal: '#1b2747', spore: '#67e8f9', vein: '#a5b4fc', weather: 'motes',
  },
  {
    act: 2, title: 'فصل دوم', sub: 'مه، خونی شد', img: '/assets/act2.jpg', short: 'فصل ۲',
    groundA: '#1d0e22', groundB: '#0f0713', path: '#241026', glow: '251,113,133',
    crystal: '#3b1230', spore: '#fb7185', vein: '#fda4af', weather: 'rain',
  },
  {
    act: 3, title: 'فصل سوم', sub: 'بارانِ خاکستر', img: '/assets/act3.jpg', short: 'فصل ۳',
    groundA: '#181410', groundB: '#0b0906', path: '#221a11', glow: '251,191,36',
    crystal: '#3a2b12', spore: '#fbbf24', vein: '#fcd34d', weather: 'ash',
  },
  {
    act: 4, title: 'فصل چهارم', sub: 'تختِ تهی', img: '/assets/act4.jpg', short: 'فصل ۴',
    groundA: '#100a24', groundB: '#060312', path: '#160e2e', glow: '192,132,252',
    crystal: '#241145', spore: '#c084fc', vein: '#d8b4fe', weather: 'void',
  },
  {
    act: 5, title: 'فصل پنجم', sub: 'تالارِ آیینه‌ها', img: '/assets/mirror.jpg', short: 'فصل ۵',
    groundA: '#071a1c', groundB: '#030b0d', path: '#0b2326', glow: '94,234,212',
    crystal: '#0f3a3d', spore: '#5eead4', vein: '#99f6e4', weather: 'motes',
  },
  {
    act: 6, title: 'فصل ششم', sub: 'سپیده‌دمِ خونین', img: '/assets/menu-bg.jpg', short: 'فصل ۶',
    groundA: '#1c0f0b', groundB: '#0a0504', path: '#2a140e', glow: '251,146,60',
    crystal: '#3d1a10', spore: '#fbbf24', vein: '#fdba74', weather: 'ash',
  },
];

/* ─────────────────────────────────────────────────────────── */
/*  Towers — 6 kinds × 4 levels (4th = اوج)                     */
/*  Balance is deliberately punishing: the cheap towers taper  */
/*  off hard against armour, apex levels are real investments. */
/* ─────────────────────────────────────────────────────────── */

export const KINDS: TowerKind[] = ['dart', 'cannon', 'frost', 'tesla', 'sniper', 'burn'];

export const TOWERS: Record<TowerKind, TowerDef> = {
  dart: {
    kind: 'dart',
    name: 'سوزن‌باران',
    blurb: 'سریع، ارزان، بی‌ادب',
    tip: 'ارزان‌ترین راهِ شروع. علیه زره بی‌فایده‌ست — تا اوج برسانش یا فراموشش کن.',
    color: '#7dd3fc',
    levels: [
      { cost: 55, dmg: 10, rate: 1.6, range: 118, projSpeed: 580 },
      { cost: 65, dmg: 16, rate: 1.8, range: 124, projSpeed: 600 },
      { cost: 120, dmg: 28, rate: 2.05, range: 134, projSpeed: 660, pierce: 1 },
      { cost: 200, dmg: 44, rate: 2.35, range: 144, projSpeed: 720, pierce: 2 },
    ],
  },
  cannon: {
    kind: 'cannon',
    name: 'کوبهٔ رگبار',
    blurb: 'آتشِ خانواده‌محور',
    tip: 'آسیبِ تک‌ضربهٔ بالا، زره را رد می‌کند. دسته‌های شلوغ را با یک گلوله پاک می‌کند.',
    color: '#fb923c',
    levels: [
      { cost: 100, dmg: 28, rate: 0.76, range: 124, projSpeed: 330, splash: 60 },
      { cost: 110, dmg: 48, rate: 0.82, range: 128, projSpeed: 340, splash: 70 },
      { cost: 180, dmg: 82, rate: 0.9, range: 134, projSpeed: 350, splash: 84, slowPct: 0.18, slowDur: 1.1 },
      { cost: 290, dmg: 140, rate: 1.0, range: 142, projSpeed: 360, splash: 98, slowPct: 0.3, slowDur: 1.5 },
    ],
  },
  frost: {
    kind: 'frost',
    name: 'بلورِ خزان',
    blurb: 'سرمایِ استراتژیک',
    tip: 'آسیبش ناچیز است؛ ارزشش وقتیه که می‌خرد. یخ‌غول اصلاً یخ نمی‌زند.',
    color: '#67e8f9',
    levels: [
      { cost: 80, dmg: 8, rate: 1.05, range: 118, projSpeed: 440, slowPct: 0.38, slowDur: 1.8 },
      { cost: 90, dmg: 14, rate: 1.15, range: 124, projSpeed: 460, slowPct: 0.46, slowDur: 2.2, chillRadius: 50 },
      { cost: 155, dmg: 24, rate: 1.28, range: 132, projSpeed: 480, slowPct: 0.54, slowDur: 2.8, chillRadius: 66 },
      { cost: 240, dmg: 36, rate: 1.42, range: 142, projSpeed: 500, slowPct: 0.62, slowDur: 3.2, chillRadius: 82 },
    ],
  },
  tesla: {
    kind: 'tesla',
    name: 'قیطونِ غیض',
    blurb: 'خوش‌وبشِ الکتریکی',
    tip: 'آسیب پخش‌شده روی چند هدف. زره هر دشمن را جدا می‌کاهد، پس علیه گروه‌های سبک شاهکار است.',
    color: '#c084fc',
    levels: [
      { cost: 135, dmg: 16, rate: 0.95, range: 122, projSpeed: 0, chains: 3, falloff: 0.78 },
      { cost: 130, dmg: 26, rate: 1.05, range: 128, projSpeed: 0, chains: 4, falloff: 0.8 },
      { cost: 210, dmg: 42, rate: 1.2, range: 138, projSpeed: 0, chains: 6, falloff: 0.82 },
      { cost: 330, dmg: 62, rate: 1.35, range: 148, projSpeed: 0, chains: 8, falloff: 0.85 },
    ],
  },
  sniper: {
    kind: 'sniper',
    name: 'افق‌نگر',
    blurb: 'یک تیر، یک سرنوشت',
    tip: 'بردِ نجومی و زره‌شکن. هدفِ علامت‌خورده از همهٔ برج‌ها آسیب بیشتری می‌خورد.',
    color: '#fde047',
    levels: [
      { cost: 115, dmg: 36, rate: 0.58, range: 218, projSpeed: 0 },
      { cost: 135, dmg: 62, rate: 0.64, range: 234, projSpeed: 0, markPct: 0.22, markDur: 3.2 },
      { cost: 220, dmg: 105, rate: 0.7, range: 250, projSpeed: 0, markPct: 0.28, markDur: 3.8 },
      { cost: 360, dmg: 175, rate: 0.78, range: 272, projSpeed: 0, markPct: 0.35, markDur: 4.5 },
    ],
  },
  burn: {
    kind: 'burn',
    name: 'شعله‌دان',
    blurb: 'آتشِ صبور',
    tip: 'سوختن از زره رد می‌شود و از جسدِ سوخته به بغل‌دستی می‌پرد. زره‌دارها را می‌جوشاند.',
    color: '#f97316',
    levels: [
      { cost: 120, dmg: 5, rate: 1.2, range: 108, projSpeed: 380, burnDps: 6, burnDur: 2.5, burnSpread: 1 },
      { cost: 120, dmg: 8, rate: 1.3, range: 112, projSpeed: 390, burnDps: 10, burnDur: 3, burnSpread: 1 },
      { cost: 195, dmg: 12, rate: 1.4, range: 118, projSpeed: 400, burnDps: 16, burnDur: 3.5, burnSpread: 2 },
      { cost: 320, dmg: 18, rate: 1.55, range: 124, projSpeed: 410, burnDps: 26, burnDur: 4.2, burnSpread: 3 },
    ],
  },
};

/* ─────────────────────────────────────────────────────────── */
/*  Enemies — armour is flat damage reduction per hit          */
/* ─────────────────────────────────────────────────────────── */

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  crawler: {
    kind: 'crawler', name: 'خاموش‌گر', hp: 26, speed: 52, radius: 12, gold: 7, dmg: 1, slowResist: 0, armor: 0,
    color: '#8b7cf6', counter: 'هر برجي می‌سازد؛ ساده‌ترین هدفِ تمرین.',
    lore: 'روحي که هنوز نفهمیده مرده است، پس راه می‌رود.',
  },
  runner: {
    kind: 'runner', name: 'بادپا', hp: 15, speed: 92, radius: 10, gold: 8, dmg: 1, slowResist: 0.12, armor: 0,
    color: '#f472b6', counter: 'بلورِ خزان یا تورِ برق؛ سرعتش را بکش.',
    lore: 'وقتی زنده بود عجله داشت، حالا عجله‌اش مانده است.',
  },
  bulwark: {
    kind: 'bulwark', name: 'سپرغول', hp: 115, speed: 30, radius: 16, gold: 15, dmg: 2, slowResist: 0.22, armor: 3,
    color: '#fbbf24', counter: 'کوبهٔ رگبار یا افق‌نگر؛ سوزن‌باران فقط قرچ‌قورچ می‌کند.',
    lore: 'زره‌اش را برای جنگی آراسته بود که هرگز نیامد.',
  },
  splitter: {
    kind: 'splitter', name: 'شکافنده', hp: 58, speed: 54, radius: 13, gold: 12, dmg: 1, slowResist: 0.08, armor: 1,
    color: '#4ade80', counter: 'آسیبِ محدوده: هر دو نیمه را با هم بسوزان.',
    lore: 'نیمه‌اش هم خودش است؛ تقسیم، نه کاهش.',
  },
  shade: {
    kind: 'shade', name: 'سایه', hp: 44, speed: 70, radius: 11, gold: 16, dmg: 1, slowResist: 0.5, armor: 0,
    color: '#a5b4fc', counter: 'قیطونِ غیض؛ سایه‌ها برق را صدا می‌زنند.',
    lore: 'سرد را دوست دارد، داغ را نه. یخ روش اثر ندارد.',
  },
  healer: {
    kind: 'healer', name: 'شفاخوان', hp: 74, speed: 44, radius: 13, gold: 26, dmg: 1, slowResist: 0.25, armor: 2,
    color: '#34d399', counter: 'اول بکشش؛ هر نبض ۴٪ از جانِ همهٔ بغل‌دستی‌ها را برمی‌گرداند.',
    lore: 'هنوز فکر می‌کند مسئولِ دیگران است.',
  },
  frostgiant: {
    kind: 'frostgiant', name: 'یخ‌غول', hp: 240, speed: 27, radius: 18, gold: 34, dmg: 3, slowResist: 0.9, armor: 7,
    color: '#93c5fd', counter: 'شعله‌دان (سوختن از زره رد می‌شود) و کوبهٔ رگبار.',
    lore: 'زمستانی که جایش را اشتباه آمده و حالا خانه‌اش را دوست دارد.',
  },
  warp: {
    kind: 'warp', name: 'جهنده', hp: 70, speed: 62, radius: 12, gold: 20, dmg: 2, slowResist: 0.4, armor: 2,
    color: '#e879f9', counter: 'هر چند ثانیه به جلو می‌پرد و از برد برج‌ها می‌گریزد؛ افق‌نگر شکارش می‌کند.',
    lore: 'مرگ را قبول کرده، ولی فاصله را نه. می‌پرد تا زودتر برسد.',
  },
  reaver: {
    kind: 'reaver', name: 'دروگر', hp: 130, speed: 58, radius: 14, gold: 28, dmg: 2, slowResist: 0.35, armor: 3,
    color: '#f87171', counter: 'سپرِ انرژی دارد؛ اول سپر را بشکن، بعد جانش را. برقِ زنجیره‌ای عالی است.',
    lore: 'زره‌اش از جنسِ سکوت است؛ اول باید سکوتش را شکست.',
  },
  boss: {
    kind: 'boss', name: 'باس‌ها', hp: 440, speed: 23, radius: 42, gold: 230, dmg: 6, slowResist: 0.65, armor: 5,
    color: '#c084fc', counter: 'لژیون: همه‌چیز هم‌زمان. ملکهٔ مه: صبر تا پیدا شود. صدچشم: آتش و برق دورش. پادشاه: سه مرحله، سه بار دربارش را بشکن.',
    lore: 'هر ده موج یکی برمی‌خیزد؛ در موجِ شصتم، خودِ پادشاهِ خاموشی می‌آید — با تاجی که به تو هم تعارف می‌کند.',
  },
};

export const BOSS_NAMES: Record<string, string> = {
  legion: 'لژیونِ خاموش',
  mist: 'ملکهٔ مه',
  eye: 'صدچشم',
  king: 'پادشاهِ خاموشی',
};

export const BOSS_RADIUS: Record<string, number> = {
  legion: 42,
  mist: 38,
  eye: 46,
  king: 58,
};

/* ─────────────────────────────────────────────────────────── */
/*  Spells — توان‌های قلب                                      */
/* ─────────────────────────────────────────────────────────── */

export interface SpellDef {
  id: SpellId;
  name: string;
  desc: string;
  cd: number;
  hotkey: string;
}

export const SPELLS: SpellDef[] = [
  { id: 'pulse', name: 'ضربان', desc: 'موجِ قلب: همه را به عقب می‌راند و زخمی می‌کند', cd: 36, hotkey: 'Q' },
  { id: 'frost', name: 'خوابِ زمستانی', desc: 'زمان برای روح‌ها ۳ ثانیه می‌ایستد', cd: 48, hotkey: 'W' },
  { id: 'tear', name: 'اشکِ آسمان', desc: '۹ صاعقه به جلودارترین روح‌ها', cd: 42, hotkey: 'E' },
];

/* ─────────────────────────────────────────────────────────── */
/*  Tower Synergies — هم‌نواییِ برج‌های همسایه                 */
/* ─────────────────────────────────────────────────────────── */

export const SYNERGY_DIST = 112; // ~1.75 tiles

export const SYNERGIES: SynergyDef[] = [
  {
    id: 'thermal',
    a: 'frost',
    b: 'burn',
    name: 'شوکِ حرارتی',
    desc: 'بلورِ خزان + شعله‌دان: دشمنی که هم‌زمان یخ‌زده و سوخته باشد ۳۵٪ آسیبِ بیشتر از همهٔ برج‌ها می‌خورد.',
    color: '#38bdf8',
  },
  {
    id: 'superconductor',
    a: 'frost',
    b: 'tesla',
    name: 'ابررسانا',
    desc: 'بلورِ خزان + قیطونِ غیض: سرمای همسایه، برقِ قیطون را به +۲ هدفِ دیگر هدایت می‌کند.',
    color: '#a855f7',
  },
  {
    id: 'spotter',
    a: 'sniper',
    b: 'cannon',
    name: 'دیده‌بانِ توپخانه',
    desc: 'افق‌نگر + کوبهٔ رگبار: کوبه +۱۸٪ برد و +۱۴٪ سرعتِ آتش می‌گیرد؛ افق‌نگر +۱۲٪ سریع‌تر شلیک می‌کند.',
    color: '#facc15',
  },
  {
    id: 'incendiary',
    a: 'dart',
    b: 'burn',
    name: 'سوزن‌های گداخته',
    desc: 'سوزن‌باران + شعله‌دان: سوزن‌ها از آتش عبور می‌کنند و هدف را به مدت ۲ ثانیه می‌سوزانند.',
    color: '#fb923c',
  },
  {
    id: 'railgun',
    a: 'tesla',
    b: 'sniper',
    name: 'شتاب‌دهندهٔ مغناطیسی',
    desc: 'قیطونِ غیض + افق‌نگر: گلولهٔ افق‌نگر ۲۵٪ قوی‌تر می‌شود و روی هدف صاعقهٔ ۲شاخه آزاد می‌کند.',
    color: '#e879f9',
  },
  {
    id: 'ironcurtain',
    a: 'dart',
    b: 'cannon',
    name: 'دیوارِ آهنین',
    desc: 'سوزن‌باران + کوبهٔ رگبار: هر دو برج +۱۲٪ سرعتِ آتش و +۸٪ آسیب می‌گیرند.',
    color: '#7dd3fc',
  },
];

export const ASCEND = {
  max: 5,
  baseCost: 240,
  costStep: 140,
  dmgPerStar: 0.16,
  ratePerStar: 0.06,
  rangePerStar: 0.04,
};

/* ─────────────────────────────────────────────────────────── */
/*  Economy — generous start, pressure later                   */
/* ─────────────────────────────────────────────────────────── */

export const ECON = {
  startGold: 185,
  startLives: 20,
  sellRate: 0.7,
  interestRate: 0.075,
  interestCap: 100,
  bonus: (w: number) => Math.round(26 + 3.85 * w),
  earlyBonus: (w: number) => 16 + 2 * w,
  hpMult: (w: number) => 1 + 0.196 * (w - 1) + 0.035 * Math.pow(w - 1, 1.42),
  speedMult: (w: number) => 1 + Math.min(0.4, 0.007 * (w - 1)),
  goldMult: (w: number) => 1 + 0.038 * (w - 1),
  comboMax: 0.5,
  comboPerStack: 0.022,
  comboWindow: 1.5,
  eliteFrom: 14,
  armorFloor: 0.28,
  /** each completed 60-wave cycle multiplies enemy hp/gold */
  cycleHp: 1.55,
  cycleGold: 1.25,
};

import type { PetDef, PetKind } from './types';

/** Companion spirits — one joins you after each act's boss falls. Levels persist across runs. */
export const PETS: Record<PetKind, PetDef> = {
  wisp: {
    kind: 'wisp',
    name: 'نورَک',
    title: 'گربهٔ نور',
    desc: 'بلورهای روح را برایت جمع می‌کند، پایانِ هر موج طلا می‌آورد و با جرقه‌های ریز به روح‌ها نیش می‌زند.',
    lore: 'اولین چیزی که بعد از سقوطِ لژیون از خاکسترش بلند شد. میو نمی‌کند؛ می‌درخشد.',
    color: '#67e8f9',
    unlockWave: 10,
  },
  owl: {
    kind: 'owl',
    name: 'خاکسترپَر',
    title: 'جغدِ آتش',
    desc: 'بالای خطِ مقدم پرواز می‌کند و تیرهای گداخته می‌بارد که هدف را می‌سوزانند.',
    lore: 'ملکهٔ مه او را در پرِ خودش قایم کرده بود. حالا پرهایش می‌سوزند و پشیمان نیست.',
    color: '#fb923c',
    unlockWave: 20,
  },
  tortoise: {
    kind: 'tortoise',
    name: 'بلورپشت',
    title: 'سنگ‌پشتِ یخ',
    desc: 'نزدیکِ قلب می‌ماند، هوای اطراف را یخ می‌بندد و هر موج اولین نشتی به قلب را با لاکش می‌گیرد.',
    lore: 'صد چشمِ صدچشم را دیده و پلک نزده. آهسته است، چون هیچ‌وقت نترسیده.',
    color: '#93c5fd',
    unlockWave: 30,
  },
  phoenix: {
    kind: 'phoenix',
    name: 'شراره',
    title: 'ققنوسِ خُرد',
    desc: 'شیرجه‌های انفجاری می‌زند و وقتی قلب به نفس‌نفس بیفتد، یک بار در هر موج جانش را برمی‌گرداند.',
    lore: 'از تختِ تهی بیرون پرید؛ تنها چیزی که پادشاه هیچ‌وقت نتوانست خاموش کند.',
    color: '#f472b6',
    unlockWave: 40,
  },
  drake: {
    kind: 'drake',
    name: 'بلورین',
    title: 'اژدهای کریستالی',
    desc: 'نفسِ بلورینش خطی از روح‌ها را سوراخ می‌کند و همه را در سرما و نور می‌شکند.',
    lore: 'خودِ قلب، وقتی یاد گرفت که به‌جای بلعیدن، بدمد.',
    color: '#c084fc',
    unlockWave: 50,
  },
};

export const PET_ORDER: PetKind[] = ['wisp', 'owl', 'tortoise', 'phoenix', 'drake'];
export const PET_MAX_LEVEL = 25;

export const petXpNeeded = (level: number) => Math.round(30 * Math.pow(level, 1.35));

/* ── persistence ───────────────────────────────────────────── */

interface PetSave {
  unlocked: PetKind[];
  active: PetKind | null;
  levels: Record<string, number>;
  xp: Record<string, number>;
}

const read = (): PetSave => {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem('et_pets');
    if (raw) return JSON.parse(raw) as PetSave;
  } catch {
    /* ignore */
  }
  return { unlocked: [], active: null, levels: {}, xp: {} };
};

const write = (s: PetSave) => localStorage.setItem('et_pets', JSON.stringify(s));

export const getPetSave = read;

export function unlockPet(kind: PetKind): boolean {
  const s = read();
  if (s.unlocked.includes(kind)) return false;
  s.unlocked.push(kind);
  if (!s.active) s.active = kind;
  if (!s.levels[kind]) s.levels[kind] = 1;
  if (!s.xp[kind]) s.xp[kind] = 0;
  write(s);
  return true;
}

export function setActivePet(kind: PetKind | null) {
  const s = read();
  if (kind && !s.unlocked.includes(kind)) return;
  s.active = kind;
  write(s);
}

export const petLevel = (kind: PetKind) => read().levels[kind] ?? 1;
export const petXp = (kind: PetKind) => read().xp[kind] ?? 0;

/** Adds xp; returns the new level if a level-up happened, else 0. */
export function addPetXp(kind: PetKind, amount: number): number {
  const s = read();
  if (!s.unlocked.includes(kind)) return 0;
  let lvl = s.levels[kind] ?? 1;
  let xp = (s.xp[kind] ?? 0) + amount;
  let leveled = 0;
  while (lvl < PET_MAX_LEVEL && xp >= petXpNeeded(lvl)) {
    xp -= petXpNeeded(lvl);
    lvl++;
    leveled = lvl;
  }
  if (lvl >= PET_MAX_LEVEL) xp = Math.min(xp, petXpNeeded(lvl));
  s.levels[kind] = lvl;
  s.xp[kind] = xp;
  write(s);
  return leveled;
}

/** Pet which unlocks for finishing the given wave (boss waves only). */
export const petForWave = (wave: number): PetKind | null =>
  PET_ORDER.find((k) => PETS[k].unlockWave === wave) ?? null;

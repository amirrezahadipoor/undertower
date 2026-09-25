/** Meta-progression: memory shards + permanent relics + achievements + mercy track (localStorage). */

export interface Relic {
  id: string;
  name: string;
  desc: string;
  flavor: string;
  cost: number;
}

export const RELICS: Relic[] = [
  { id: 'war-chest', name: 'سفرهٔ شکوهمند', desc: 'با ۶۰ طلای بیشتر بیدار شو.', flavor: 'معمارِ قبلی همیشه گرسنه شروع می‌کرد.', cost: 3 },
  { id: 'heart-knot', name: 'بندِ آبدیده', desc: 'قلب با ۵ جانِ بیشتر شروع می‌کند.', flavor: 'گره‌ای به موهای یک روح.', cost: 4 },
  { id: 'nebu-apron', name: 'دست‌پختِ نیبو', desc: 'ساخت و ارتقای برج‌ها ۸٪ ارزان‌تر.', flavor: 'نیبو قسم می‌خورد که آشپزِ خوبی بوده.', cost: 5 },
  { id: 'wrath', name: 'خشمِ معمار', desc: 'برج‌ها ۸٪ آسیب بیشتر.', flavor: 'اِستی که جایی دلش شکسته.', cost: 6 },
  { id: 'sneeze', name: 'عطسهٔ قیطون', desc: 'قیطون +۱ زنجیر می‌گیرد.', flavor: 'عَچی!', cost: 6 },
  { id: 'winter', name: 'نالهٔ زمستان', desc: 'کندسازی‌ها ۱۵٪ قوی‌تر.', flavor: 'زمستان هم ماتم دارد.', cost: 5 },
  { id: 'sixth', name: 'چشمِ ششم', desc: '۱۰٪ شانسِ ضربهٔ دوبرابر.', flavor: 'بعضی چیزها را فقط نباید دید.', cost: 7 },
  { id: 'pact', name: 'پیمانِ صلح', desc: 'هر ۵ موج، قلب +۲ جان می‌گیرد.', flavor: 'قولی که هنوز شکسته نشده.', cost: 4 },
  { id: 'soul-magnet', name: 'جاذبهٔ روح', desc: 'بلورهای روحِ میدان به‌طور خودکار جذب می‌شوند و ۳۰٪ طلای بیشتر دارند.', flavor: 'حتی خاطره‌های سرگردان هم راهِ خانه را می‌شناسند.', cost: 6 },
  { id: 'chrono-heart', name: 'نبضِ جاودان', desc: 'کول‌داونِ توان‌های قلب ۱۵٪ کوتاه‌تر می‌شود.', flavor: 'قلبی که عجله دارد.', cost: 7 },
];

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  reward: number; // memory shards
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'wave10', name: 'معمارِ اول', desc: 'از موج ۱۰ و لژیونِ خاموش عبور کن.', reward: 3 },
  { id: 'wave20', name: 'شکارچیِ مه', desc: 'از موج ۲۰ و ملکهٔ مه عبور کن.', reward: 5 },
  { id: 'wave30', name: 'کوریِ صدچشم', desc: 'از موج ۳۰ و صدچشم عبور کن.', reward: 7 },
  { id: 'act4', name: 'تختِ تهی', desc: 'به فصل چهارم (موج ۳۱+) برس.', reward: 6 },
  { id: 'wave50', name: 'افسانهٔ ابدیت', desc: 'تا موج ۵۰ دوام بیاور.', reward: 12 },
  { id: 'synergy3', name: 'هم‌نوایِ بزرگ', desc: '۳ هم‌نواییِ مختلف بین برج‌ها را هم‌زمان فعال کن.', reward: 4 },
  { id: 'ascend3', name: 'فرااوج', desc: 'یک برجِ اوج را تا ستارهٔ ★۳ فرااوج برسان.', reward: 5 },
  { id: 'rich1000', name: 'خزانهٔ پر', desc: 'هم‌زمان ۱٬۰۰۰ طلا در صندوق داشته باش.', reward: 4 },
  { id: 'combo40', name: 'طوفانِ کومبو', desc: 'به کومبوی ×۴۰ برس.', reward: 4 },
  { id: 'mercy3', name: 'بخشندهٔ مرز', desc: 'در مجموع ۳ پیکره‌نورِ باس را آزاد کن.', reward: 6 },
  { id: 'dawn', name: 'سپیده‌دم', desc: 'پادشاهِ خاموشی را شکست بده و قلب را بشکن.', reward: 20 },
  { id: 'throne', name: 'پادشاهِ نور', desc: 'پادشاهِ خاموشی را شکست بده و تاج را بردار.', reward: 20 },
];

export interface RelicMods {
  startGold: number;
  startLives: number;
  costMult: number;
  dmgMult: number;
  chainBonus: number;
  slowMult: number;
  critCh: number;
  heal5: number;
  autoCrystal: boolean;
  spellCdMult: number;
}

const read = (k: string, d: string) => (typeof localStorage === 'undefined' ? d : localStorage.getItem(k) ?? d);

export const getShards = () => Number(read('et_shards', '0'));
export const addShards = (n: number) => {
  const v = Math.max(0, getShards() + n);
  localStorage.setItem('et_shards', String(v));
  return v;
};

export const getRelics = (): string[] => {
  try {
    return JSON.parse(read('et_relics', '[]')) as string[];
  } catch {
    return [];
  }
};

export function buyRelic(id: string): boolean {
  const r = RELICS.find((x) => x.id === id);
  if (!r || getRelics().includes(id) || getShards() < r.cost) return false;
  addShards(-r.cost);
  localStorage.setItem('et_relics', JSON.stringify([...getRelics(), id]));
  return true;
}

export const hasRelic = (id: string) => getRelics().includes(id);

export const getAchievements = (): string[] => {
  try {
    return JSON.parse(read('et_ach', '[]')) as string[];
  } catch {
    return [];
  }
};

/** Unlocks an achievement if not yet unlocked; grants shards and returns the Achievement or null. */
export function unlockAchievement(id: string): Achievement | null {
  const ach = ACHIEVEMENTS.find((a) => a.id === id);
  if (!ach) return null;
  const cur = getAchievements();
  if (cur.includes(id)) return null;
  localStorage.setItem('et_ach', JSON.stringify([...cur, id]));
  addShards(ach.reward);
  return ach;
}

export const getMercy = () => Number(read('et_mercy', '0'));
export const bumpMercy = () => {
  const v = getMercy() + 1;
  localStorage.setItem('et_mercy', String(v));
  return v;
};

export function relicMods(): RelicMods {
  const has = hasRelic;
  return {
    startGold: has('war-chest') ? 60 : 0,
    startLives: has('heart-knot') ? 5 : 0,
    costMult: has('nebu-apron') ? 0.92 : 1,
    dmgMult: has('wrath') ? 1.08 : 1,
    chainBonus: has('sneeze') ? 1 : 0,
    slowMult: has('winter') ? 1.15 : 1,
    critCh: has('sixth') ? 0.1 : 0,
    heal5: has('pact') ? 2 : 1,
    autoCrystal: has('soul-magnet'),
    spellCdMult: has('chrono-heart') ? 0.85 : 1,
  };
}

/** Shards granted at the end of a run. */
export const shardsEarned = (wave: number) => Math.floor(Math.max(1, wave) * 0.6) + Math.floor(wave / 10) * 5;

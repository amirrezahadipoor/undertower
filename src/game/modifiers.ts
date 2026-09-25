/**
 * Wave modifiers ("مهرِ موج") and build-phase random events ("پیشامد").
 * These are the anti-repetition layer: every wave can carry a mutator, and
 * between waves the game offers a branching choice with real trade-offs.
 */

import { rand } from './rng';
export type ModId =
  | 'bloodmoon'
  | 'swarm'
  | 'armored'
  | 'swift'
  | 'gale'
  | 'eclipse'
  | 'bounty'
  | 'frenzy'
  | 'fog'
  | 'unstable';

export interface WaveMod {
  id: ModId;
  name: string;
  desc: string;
  color: string;
  icon: string; // lucide icon name
  bad: boolean;
  /** stat multipliers applied to spawned enemies this wave */
  hp?: number;
  speed?: number;
  count?: number;
  gold?: number;
  armorAdd?: number;
  /** field flags read by the engine */
  slowResistAdd?: number;
  glyph?: 'red' | 'purple' | 'green' | 'cyan';
}

export const MODS: Record<ModId, WaveMod> = {
  bloodmoon: {
    id: 'bloodmoon', name: 'ماهِ خونین', desc: 'روح‌ها ۳۵٪ جانِ بیشتر دارند، ولی ۵۰٪ طلای بیشتر می‌دهند.',
    color: '#f43f5e', icon: 'Moon', bad: true, hp: 1.35, gold: 1.5, glyph: 'red',
  },
  swarm: {
    id: 'swarm', name: 'طغیان', desc: 'تعداد دو برابر، ولی هر روح شکننده‌تر است.',
    color: '#fb923c', icon: 'Bug', bad: true, count: 1.9, hp: 0.62, gold: 0.7, glyph: 'red',
  },
  armored: {
    id: 'armored', name: 'زره‌پوش', desc: 'همه زرهِ سنگین می‌پوشند. آسیبِ کوچک بی‌فایده است.',
    color: '#94a3b8', icon: 'Shield', bad: true, armorAdd: 6, gold: 1.3, glyph: 'purple',
  },
  swift: {
    id: 'swift', name: 'شتاب', desc: 'روح‌ها ۳۵٪ تندتر می‌دوند.',
    color: '#38bdf8', icon: 'Wind', bad: true, speed: 1.35, gold: 1.25, glyph: 'cyan',
  },
  gale: {
    id: 'gale', name: 'تندباد', desc: 'مقاومتِ سرمای همه بالا می‌رود؛ کندسازی سخت‌تر می‌شود.',
    color: '#22d3ee', icon: 'Snowflake', bad: true, slowResistAdd: 0.4, gold: 1.2, glyph: 'cyan',
  },
  eclipse: {
    id: 'eclipse', name: 'خسوف', desc: 'نور کم می‌شود؛ برد برج‌ها کوتاه‌تر است — ولی طلا سرشار.',
    color: '#a78bfa', icon: 'CircleOff', bad: true, gold: 1.6, glyph: 'purple',
  },
  bounty: {
    id: 'bounty', name: 'خزانه', desc: 'موجِ سبک است و طلای دوبرابر می‌ریزد. نفس بکش.',
    color: '#fbbf24', icon: 'Coins', bad: false, hp: 0.8, count: 0.85, gold: 2.0, glyph: 'green',
  },
  frenzy: {
    id: 'frenzy', name: 'جنون', desc: 'روح‌ها تندتر و سرسخت‌ترند، ولی کومبوی تو دو برابر می‌ارزد.',
    color: '#f472b6', icon: 'Flame', bad: true, hp: 1.2, speed: 1.2, gold: 1.4, glyph: 'red',
  },
  fog: {
    id: 'fog', name: 'مهِ کور', desc: 'مه غلیظ میدان را می‌پوشاند؛ دید کم، طلا زیاد.',
    color: '#cbd5e1', icon: 'CloudFog', bad: true, gold: 1.35, glyph: 'purple',
  },
  unstable: {
    id: 'unstable', name: 'ناپایدار', desc: 'هر روحِ کشته‌شده منفجر می‌شود و به بغل‌دستی‌ها آسیب می‌زند.',
    color: '#fb7185', icon: 'Zap', bad: false, hp: 1.1, gold: 1.3, glyph: 'red',
  },
};

/** Pick a modifier for a given wave, or null. Boss waves stay clean. */
export function rollModifier(wave: number): ModId | null {
  if (wave % 10 === 0) return null; // bosses get their own drama
  if (wave < 4) return null; // let players learn first
  const chance = Math.min(0.7, 0.28 + wave * 0.012);
  if (rand() > chance) return null;
  const pool: ModId[] = ['bloodmoon', 'swarm', 'armored', 'swift', 'gale', 'frenzy', 'fog', 'unstable'];
  if (wave >= 8) pool.push('eclipse');
  // bounty is a rare relief roll
  if (rand() < 0.16) return 'bounty';
  return pool[Math.floor(rand() * pool.length)];
}

/* ─────────────────────────────────────────────────────────── */
/*  Build-phase random events — a branching offer                */
/* ─────────────────────────────────────────────────────────── */

export type EventEffectKind =
  | 'gold'
  | 'lives'
  | 'buffDmg'
  | 'buffRange'
  | 'discount'
  | 'freeUpgrade'
  | 'overcharge'
  | 'curseHp'
  | 'nothing';

export interface EventChoice {
  label: string;
  flavor: string;
  effect: EventEffectKind;
  value: number;
  tone: 'good' | 'risky' | 'neutral';
}

export interface RandomEvent {
  id: string;
  speaker: 'nebu' | 'soft' | 'sage' | 'core' | 'king';
  title: string;
  text: string;
  choices: EventChoice[];
}

export const EVENTS: RandomEvent[] = [
  {
    id: 'merchant', speaker: 'sage', title: 'دوره‌گردِ مه',
    text: 'یک دوره‌گرد از دلِ مه بیرون می‌آید. کوله‌اش بوی سکه و خطر می‌دهد. «معامله می‌کنی، معمار؟»',
    choices: [
      { label: 'سکه بگیر (+۱۲۰ طلا)', flavor: 'نقدِ حاضر، بی‌دردسر.', effect: 'gold', value: 120, tone: 'good' },
      { label: 'سرمایه‌گذاری کن (نیمی از طلا → همان‌قدر جان؟)', flavor: 'قمارِ محترمانه.', effect: 'overcharge', value: 0, tone: 'risky' },
    ],
  },
  {
    id: 'forge', speaker: 'nebu', title: 'کورهٔ کهن',
    text: 'یه کورهٔ قدیمی زیر خاک پیدا کردیم. اگه روشنش کنیم، برج‌ها یه مدت داغ‌تر می‌زنن. ولی سوختش... طلاست.',
    choices: [
      { label: 'روشنش کن (−۶۰ طلا، آسیبِ همه +۲۵٪ برای ۳ موج)', flavor: 'گرما بهایی دارد.', effect: 'buffDmg', value: 0.25, tone: 'risky' },
      { label: 'دست نزن', flavor: 'کورهٔ خاموش، جیبِ پُر.', effect: 'nothing', value: 0, tone: 'neutral' },
    ],
  },
  {
    id: 'shrine', speaker: 'core', title: 'محرابِ نور',
    text: 'محرابی روشن می‌شود. قلب زمزمه می‌کند: «جانی به تو می‌دهم... یا چشمی تیزتر برای برج‌هایت. یکی را برگزین.»',
    choices: [
      { label: 'جان (+۴ جانِ قلب)', flavor: 'دوامِ بیشتر.', effect: 'lives', value: 4, tone: 'good' },
      { label: 'دید (برد همه +۱۸٪ برای ۳ موج)', flavor: 'چشمِ تیزتر.', effect: 'buffRange', value: 0.18, tone: 'good' },
    ],
  },
  {
    id: 'gambler', speaker: 'nebu', title: 'شرطِ نیبو',
    text: 'یه بازیِ کوچیک! شیر یا خط. اگه بردی، کلی طلا. اگه باختی... خب، یه ذره جان کمتر. قول می‌دم عادلانه‌ست. تقریباً.',
    choices: [
      { label: 'شرط ببند (۶۰٪ شانس +۲۰۰ طلا، وگرنه −۳ جان)', flavor: 'دل به دریا.', effect: 'curseHp', value: 0, tone: 'risky' },
      { label: 'بی‌خیال', flavor: 'عاقلانه، ولی کسل‌کننده.', effect: 'nothing', value: 0, tone: 'neutral' },
    ],
  },
  {
    id: 'refugees', speaker: 'soft', title: 'روح‌های سرگردان',
    text: 'چند روحِ بی‌آزار به دژ پناه آورده‌اند. جا بدهیم؟ جا که بدهیم، یکی از برج‌هایت رایگان ارتقا می‌گیرد — دستِ سپاسشان.',
    choices: [
      { label: 'پناهشان بده (یک ارتقای رایگان)', flavor: 'مهربانی جواب می‌دهد.', effect: 'freeUpgrade', value: 0, tone: 'good' },
      { label: 'دروازه را ببند (+۸۰ طلا)', flavor: 'دلِ سنگ، جیبِ گرم.', effect: 'gold', value: 80, tone: 'neutral' },
    ],
  },
  {
    id: 'bargain', speaker: 'king', title: 'پیشنهادِ پادشاه',
    text: 'پادشاهِ خاموشی از تهِ جاده صدا می‌زند: «تخفیف می‌خواهی؟ همهٔ برج‌هایت ارزان می‌شوند... به قیمتِ کمی از جانِ قلب.»',
    choices: [
      { label: 'بپذیر (ساخت ۱۵٪ ارزان‌تر تا همیشه، −۳ جان)', flavor: 'وسوسه‌ی شیرین.', effect: 'discount', value: 0.15, tone: 'risky' },
      { label: 'ردش کن', flavor: '«نه» گفتن هم هنر است.', effect: 'nothing', value: 0, tone: 'neutral' },
    ],
  },
];

export function rollEvent(wave: number, seenIds: Set<string>): RandomEvent | null {
  if (wave < 3 || wave % 10 === 0) return null;
  if (rand() > 0.3) return null;
  const fresh = EVENTS.filter((e) => !seenIds.has(e.id));
  const pool = fresh.length ? fresh : EVENTS;
  return pool[Math.floor(rand() * pool.length)];
}

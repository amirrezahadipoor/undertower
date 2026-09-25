import mirrorImg from '../assets/mirror.jpg';
import { useMemo, useState } from 'react';
import { Award, BookOpen, Check, Coins, Gem, Link2, Lock, PawPrint, Skull, Sparkles, Star, Swords, Target, X, Zap } from 'lucide-react';
import { ENEMIES, ECON, KINDS, SYNERGIES, TOWERS } from '../game/config';
import { ACHIEVEMENTS, getAchievements } from '../game/meta';
import { PETS, PET_ORDER, getPetSave, petLevel } from '../game/pets';
import { EnemyPortrait, PetPortrait, TowerPortrait } from './Portrait';
import type { EnemyKind, TowerKind, TowerLevel } from '../game/types';
import { audio } from '../game/audio';

const fa = (n: number) => Math.round(n).toLocaleString('fa-IR');

function notesFor(l: TowerLevel): string[] {
  const n: string[] = [];
  if (l.pierce) n.push(`نفوذ: به ${fa(l.pierce + 1)} روح هم‌زمان سوراخ می‌کند`);
  if (l.splash) n.push(`انفجار ${fa(l.splash)} پیکسلی — ۶۵٪ آسیب در لبهٔ موج`);
  if (l.slowPct) n.push(`کندسازی ${fa(l.slowPct * 100)}٪ به مدت ${l.slowDur}s`);
  if (l.chillRadius) n.push(`سرما به همسایه‌های ${fa(l.chillRadius)} پیکسلی هم سرایت می‌کند (${fa(Math.round(l.slowPct! * 60))}٪)`);
  if (l.chains) n.push(`زنجیر: ${fa(l.chains)} پرش با افت ${fa((1 - (l.falloff ?? 0.8)) * 100)}٪ در هر پرش`);
  if (l.markPct) n.push(`علامت: +${fa(l.markPct * 100)}٪ آسیبِ همهٔ برج‌ها روی این هدف، ${l.markDur}s`);
  if (l.burnDps) n.push(`سوختن ${fa(l.burnDps)} در ثانیه برای ${l.burnDur}s — از زره رد می‌شود`);
  if (l.burnSpread) n.push(`مردنِ سوخته آتش را به ${fa(l.burnSpread)} بغل‌دستی می‌دهد`);
  if (!n.length) n.push('ضربهٔ ساده و مطمئن؛ بدون اثر جانبی');
  return n;
}

function Bar({ label, val, max, color }: { label: string; val: number; max: number; color: string }) {
  const pct = Math.max(4, Math.min(100, (val / (max || 1)) * 100));
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between text-[10px] text-slate-400">
        <span>{label}</span>
        <span className="ltr font-bold text-slate-200">{val}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Codex({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'towers' | 'bestiary' | 'synergies' | 'pets' | 'achievements'>('towers');
  const petSave = useMemo(() => getPetSave(), []);
  const [tower, setTower] = useState<TowerKind>('dart');
  const [level, setLevel] = useState(3);
  const [foe, setFoe] = useState<EnemyKind>('bulwark');
  const unlockedAch = useMemo(() => getAchievements(), []);

  const maxDps = useMemo(
    () => Math.max(...KINDS.flatMap((k) => TOWERS[k].levels.map((l) => l.dmg * l.rate))),
    [],
  );
  const maxRange = useMemo(() => Math.max(...KINDS.flatMap((k) => TOWERS[k].levels.map((l) => l.range))), []);

  const def = TOWERS[tower];
  const cur = def.levels[level];
  const prev = level > 0 ? def.levels[level - 1] : null;
  const cost = cur.cost;
  const armorOf = ENEMIES[foe].armor;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#04050c]/92 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="pointer-events-none absolute inset-0 opacity-25">
        <img src={mirrorImg} alt="" className="h-full w-full object-cover" draggable={false} />
      </div>
      <div
        className="anim-rise relative flex max-h-[calc(100dvh-16px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-violet-400/30 bg-[#080b18]/96 shadow-[0_0_80px_rgba(139,92,246,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/70 bg-[#0a0d1c]/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-violet-300" />
            <h2 className="text-lg font-black text-slate-100">کتابِ معماری</h2>
            <span className="hidden text-[11px] text-slate-500 lg:inline">— سالگرد: «بخوان، تا اشتباهِ من را نکنی.»</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ['towers', 'برج‌ها', Swords],
                ['bestiary', 'هیولاها', Skull],
                ['synergies', 'هم‌نوایی‌ها', Link2],
                ['pets', `همراهان (${fa(petSave.unlocked.length)}/۵)`, PawPrint],
                ['achievements', `مدال‌ها (${fa(unlockedAch.length)}/${fa(ACHIEVEMENTS.length)})`, Award],
              ] as const
            ).map(([k, label, Icon]) => (
              <button
                key={k}
                onClick={() => {
                  setTab(k);
                  audio.ui();
                }}
                className={`mobile-touch flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-black transition ${
                  tab === k ? 'bg-violet-400/25 text-violet-100 ring-1 ring-violet-300/50' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
            <button onClick={onClose} aria-label="بستن کتاب معماری" className="mobile-touch flex w-10 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </header>

        {tab === 'synergies' && (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <p className="mb-3 text-xs leading-6 text-slate-400">
              وقتی دو برجِ مکمل را در فاصلهٔ کمتر از ۲ خانه بسازی، بینشان یک <span className="font-bold text-cyan-200">مدارِ هم‌نوایی</span> روشن می‌شود
              و هر دو توانِ تازه‌ای می‌گیرند. پس از رسیدن به «اوج» (سطح ۴)، هر برج می‌تواند تا ۵ ستاره <span className="font-bold text-amber-200">«فرااوج ★»</span> ارتقا بگیرد — و بعد از آن، «قدرتِ افسانه‌ای» بی‌پایان است: هر ستارهٔ بیشتر، فقط آسیب را اضافه می‌کند و هزینه‌اش نمایی بالا می‌رود.
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {SYNERGIES.map((syn) => {
                const ta = TOWERS[syn.a];
                const tb = TOWERS[syn.b];
                return (
                  <div
                    key={syn.id}
                    className="glass flex items-center gap-3 rounded-xl border p-3"
                    style={{ borderColor: `${syn.color}44` }}
                  >
                    <div className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-900/80 p-1.5">
                      <TowerPortrait kind={syn.a} level={3} size={46} animate={false} />
                      <Link2 size={14} style={{ color: syn.color }} />
                      <TowerPortrait kind={syn.b} level={3} size={46} animate={false} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black" style={{ color: syn.color }}>
                          {syn.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          ({ta.name} + {tb.name})
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-6 text-slate-300">{syn.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'pets' && (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <p className="mb-3 text-xs leading-6 text-slate-400">
              پس از هر باسِ فصل، یک همراه از خاکسترش برمی‌خیزد. همراهان با هر کشتار تجربه می‌گیرند و سطحشان برای همیشه می‌ماند — حتی پس از شکست.
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {PET_ORDER.map((k) => {
                const def = PETS[k];
                const unlocked = petSave.unlocked.includes(k);
                const lvl = petLevel(k);
                return (
                  <div key={k} className={`glass flex items-center gap-3 rounded-xl border p-3 ${unlocked ? '' : 'opacity-70'}`} style={{ borderColor: unlocked ? `${def.color}44` : undefined }}>
                    <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ background: `radial-gradient(circle at 50% 60%, ${def.color}30, #080b18)` }}>
                      {unlocked ? <PetPortrait kind={k} level={lvl} size={80} /> : <Lock size={22} className="text-slate-600" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black" style={{ color: def.color }}>{def.name}</span>
                        <span className="text-[10px] font-bold text-slate-400">{def.title}</span>
                        {unlocked && (
                          <span className="ms-auto flex items-center gap-1 text-[10px] font-bold text-amber-200">
                            <Star size={10} />
                            سطح {fa(lvl)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-6 text-slate-300">{def.desc}</p>
                      <p className="text-[10px] italic text-slate-500">{unlocked ? def.lore : `پس از موج ${fa(def.unlockWave)} می‌پیوندد.`}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'achievements' && (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <p className="mb-3 text-xs leading-6 text-slate-400">
              هر مدالِ افتخار که برای نخستین بار باز شود، بلافاصله <span className="font-bold text-cyan-200">خرده‌خاطره</span> به آیینهٔ خاطراتت می‌ریزد.
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {ACHIEVEMENTS.map((a) => {
                const done = unlockedAch.includes(a.id);
                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      done ? 'border-emerald-400/50 bg-emerald-400/10' : 'border-slate-800 bg-slate-900/40 opacity-75'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        done ? 'bg-emerald-400/20 text-emerald-200' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {done ? <Check size={18} /> : <Award size={18} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-extrabold text-slate-100">{a.name}</span>
                        <span className="flex items-center gap-1 text-xs font-bold text-cyan-300">
                          <Gem size={11} />+{fa(a.reward)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{a.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(tab === 'towers' || tab === 'bestiary') && (
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[240px_minmax(0,1fr)]">
            {/* list */}
            <div className="flex gap-1.5 overflow-x-auto border-slate-800/70 p-2 md:flex-col md:overflow-visible md:border-l">
              {(tab === 'towers' ? KINDS : (Object.keys(ENEMIES) as EnemyKind[])).map((k) => {
                const active = tab === 'towers' ? k === tower : k === foe;
                const label = tab === 'towers' ? TOWERS[k as TowerKind].name : ENEMIES[k as EnemyKind].name;
                const sub = tab === 'towers' ? TOWERS[k as TowerKind].blurb : `زره ${fa(ENEMIES[k as EnemyKind].armor)}`;
                const color = tab === 'towers' ? TOWERS[k as TowerKind].color : ENEMIES[k as EnemyKind].color;
                return (
                  <button
                    key={k}
                    onClick={() => {
                      if (tab === 'towers') setTower(k as TowerKind);
                      else setFoe(k as EnemyKind);
                      audio.ui();
                    }}
                    className={`flex min-w-[150px] items-center gap-2 rounded-lg border p-2 text-right transition md:min-w-0 ${
                      active ? 'border-slate-500/70 bg-slate-800/70' : 'border-slate-800/70 bg-slate-900/40 hover:bg-slate-800/50'
                    }`}
                    style={active ? { borderColor: `${color}88` } : undefined}
                  >
                    <span className="shrink-0 rounded-md" style={{ background: `${color}1a` }}>
                      {tab === 'towers' ? (
                        <TowerPortrait kind={k as TowerKind} level={active ? level : 3} size={48} animate={active} />
                      ) : (
                        <EnemyPortrait kind={k as EnemyKind} size={38} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-black text-slate-100">{label}</span>
                      <span className="block truncate text-[10px]" style={{ color }}>
                        {sub}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* detail */}
            <div className="min-w-0 p-3 sm:p-4">
              {tab === 'towers' ? (
                <>
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h3 className="text-2xl font-black text-slate-50">{def.name}</h3>
                      <p className="text-xs text-slate-400">{def.blurb}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-200">
                      <Coins size={13} />
                      {fa(cost)} طلا {level > 0 ? 'برای ارتقا به این سطح' : 'هزینهٔ ساخت'}
                    </div>
                  </div>

                  {/* four levels — visual growth */}
                  <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {def.levels.map((l, i) => {
                      const apex = i === def.levels.length - 1;
                      const on = i === level;
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setLevel(i);
                            audio.ui();
                          }}
                          className={`group relative flex flex-col items-center gap-1 overflow-hidden rounded-lg border p-2 transition ${
                            on ? 'border-amber-300/70 bg-gradient-to-b from-slate-800/80 to-slate-900/60' : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-600'
                          }`}
                          style={on ? { boxShadow: `0 0 26px ${def.color}33` } : undefined}
                        >
                          <span className="absolute right-1.5 top-1.5 text-[9px] font-black text-slate-500">
                            {apex ? 'اوج' : `سطح ${fa(i + 1)}`}
                          </span>
                          <TowerPortrait kind={tower} level={i} size={72 + i * 8} animate={on} />
                          <span className="mt-auto flex w-full items-center justify-between text-[9px] text-slate-400">
                            <span className="ltr">DPS {Math.round(l.dmg * l.rate)}</span>
                            <span className="ltr">R {l.range}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="glass space-y-2.5 rounded-lg p-3">
                      <Bar label="آسیب هر ضربه" val={cur.dmg} max={175} color={def.color} />
                      <Bar label="سرعت آتش (در ثانیه)" val={Number(cur.rate.toFixed(2))} max={2.5} color={def.color} />
                      <Bar label="برد" val={cur.range} max={maxRange} color={def.color} />
                      <Bar label="خروجی آسیب (DPS)" val={Math.round(cur.dmg * cur.rate)} max={Math.round(maxDps)} color={def.color} />
                      {prev && (
                        <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-bold">
                          {[
                            ['DMG', cur.dmg - prev.dmg],
                            ['SPD', Number((cur.rate - prev.rate).toFixed(2))],
                            ['RNG', cur.range - prev.range],
                          ].map(([l, v], i) => (
                            <span key={i} className="ltr rounded-md bg-emerald-400/15 px-2 py-1 text-emerald-300">
                              {l} +{v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="glass rounded-lg p-3">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-black text-violet-200">
                        <Sparkles size={13} />
                        ویژگی‌های این سطح
                      </div>
                      <ul className="space-y-1.5 text-[11px] leading-6 text-slate-300">
                        {notesFor(cur).map((n, i) => (
                          <li key={i} className="flex gap-1.5">
                            <Target size={11} className="mt-1 shrink-0" style={{ color: def.color }} />
                            {n}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 border-t border-slate-800 pt-2 text-[11px] italic leading-6 text-slate-400">
                        «{def.tip}»
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h3 className="text-2xl font-black text-slate-50">{ENEMIES[foe].name}</h3>
                      <p className="text-xs italic text-slate-400">{ENEMIES[foe].lore}</p>
                    </div>
                    {foe === 'boss' && (
                      <span className="flex items-center gap-1 rounded-lg border border-violet-400/40 bg-violet-500/15 px-3 py-1.5 text-xs font-bold text-violet-200">
                        <Gem size={13} />
                        باس — هر ۱۰ موج
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                    <div className="flex items-center justify-center rounded-lg border border-slate-800 bg-[radial-gradient(ellipse_at_center,#141a30,#080b18)] p-3">
                      <EnemyPortrait kind={foe} size={104} />
                    </div>
                    <div className="glass grid grid-cols-2 gap-2 rounded-lg p-3 sm:grid-cols-3">
                      {[
                        { l: 'جان پایه', v: fa(ENEMIES[foe].hp), c: '#a3e635' },
                        { l: 'سرعت', v: `${ENEMIES[foe].speed} پیکسل/ث`, c: '#38bdf8' },
                        { l: 'زره (کاهش هر ضربه)', v: `−${fa(armorOf)}`, c: '#94a3b8' },
                        { l: 'مقاومتِ سرما', v: `${fa(ENEMIES[foe].slowResist * 100)}٪`, c: '#67e8f9' },
                        { l: 'طلا', v: fa(ENEMIES[foe].gold), c: '#fbbf24' },
                        { l: 'آسیب به قلب', v: fa(ENEMIES[foe].dmg), c: '#fb7185' },
                      ].map((s, i) => (
                        <div key={i} className="rounded-md bg-slate-900/60 p-2">
                          <div className="text-[10px] text-slate-400">{s.l}</div>
                          <div className="ltr text-sm font-black" style={{ color: s.c }}>
                            {s.v}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="glass rounded-lg p-3">
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-black text-cyan-200">
                        <Zap size={13} />
                        پاسِ دفاعی
                      </div>
                      <p className="text-[11px] leading-6 text-slate-300">{ENEMIES[foe].counter}</p>
                    </div>
                    <div className="glass rounded-lg p-3">
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-black text-amber-200">
                        <Skull size={13} />
                        سختیِ این فصل
                      </div>
                      <p className="text-[11px] leading-6 text-slate-300">
                        این روح در موج {fa(10)} مقدار{' '}
                        <span className="ltr font-black text-rose-300">{fa(ENEMIES[foe].hp * ECON.hpMult(10))}</span> جان دارد و در موج{' '}
                        {fa(30)} مقدار <span className="ltr font-black text-rose-300">{fa(ENEMIES[foe].hp * ECON.hpMult(30))}</span>.
                        از موج {fa(ECON.eliteFrom)} بعضی‌ها «الیت» می‌شوند: هالهٔ طلایی، ۳۵٪ جانِ بیشتر، ۶۰٪ طلای بیشتر.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

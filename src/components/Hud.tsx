import { useMemo } from 'react';
import {
  Activity,
  BookOpen,
  ChevronUp,
  CloudLightning,
  Coins,
  FastForward,
  Flag,
  Flame,
  Heart,
  Home,
  Pause,
  PawPrint,
  Play,
  Skull,
  Snowflake,
  Sparkles,
  Swords,
  Timer,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ACTS, ENEMIES, KINDS, SPELLS, SYNERGIES, TOWERS } from '../game/config';
import { MODS } from '../game/modifiers';
import type { ModId } from '../game/modifiers';
import { PETS } from '../game/pets';
import { EnemyPortrait, PetPortrait, TowerPortrait } from './Portrait';
import { buildWave, isBossWave, isFinalWave } from '../game/waves';
import type { EnemyKind, HudInfo, Sel, SpellId, TowerKind } from '../game/types';

export const fa = (n: number) => Math.round(n).toLocaleString('fa-IR');

export function nextWaveHint(w: number): string {
  if (isFinalWave(w)) return 'پادشاهِ خاموشی می‌آید';
  if (isBossWave(w)) return 'یک باس برمی‌خیزد';
  const inCycle = ((w - 1) % 60) + 1;
  if (inCycle === 3) return 'بادپاهای تند';
  if (inCycle === 4) return 'سپرغول‌های زره‌پوش';
  if (inCycle === 6) return 'شکافنده‌ها';
  if (inCycle === 8) return 'سایه‌ها';
  if (inCycle === 11) return 'جهنده‌های تلپورتی';
  if (inCycle === 13) return 'شفاخوان‌ها';
  if (inCycle === 15) return 'دروگرهای سپردار';
  if (inCycle === 17) return 'یخ‌غول‌ها';
  return 'موجی سنگین‌تر';
}

/* ── TopBar ────────────────────────────────────────────────── */

interface TopProps {
  hud: HudInfo;
  muted: boolean;
  livesKey: number;
  locked: boolean;
  onSpeed: (s: 1 | 2 | 3) => void;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onExit: () => void;
  onPet: () => void;
}

const IconBtn = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
  <button onClick={onClick} title={title} aria-label={title} className="flex h-10 w-10 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/5 hover:text-white">
    {children}
  </button>
);

export function TopBar({ hud, muted, livesKey, locked, onSpeed, onTogglePause, onToggleMute, onExit, onPet }: TopProps) {
  const act = ACTS[hud.act - 1];
  const modDef = hud.mod ? MODS[hud.mod as ModId] : null;
  return (
    <header
      className={`relative z-30 flex h-[52px] shrink-0 items-center justify-between gap-1 border-b border-white/5 bg-[#070a16]/80 px-1.5 backdrop-blur-md transition-opacity sm:gap-3 sm:px-3 ${
        locked ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      {/* left: wave + act */}
      <div className="flex min-w-0 items-center gap-1 sm:gap-3">
        <img src="/assets/core.png" alt="" className="pix anim-heart hidden h-7 w-7 object-contain sm:block" draggable={false} />
        <div className="leading-tight">
          <div className="whitespace-nowrap text-[12px] font-black text-slate-100 sm:text-sm">
            موج {fa(hud.wave)}
            {hud.cycle > 1 && <span className="ms-1 hidden text-[10px] font-bold text-violet-300 md:inline">چرخهٔ {fa(hud.cycle)}</span>}
          </div>
          <div className="hidden text-[10px] text-slate-500 md:block">{act.title} — {act.sub}</div>
        </div>
        {modDef && hud.phase === 'combat' && (
          <span
            className="hidden items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold sm:flex"
            style={{ background: `${modDef.color}1f`, color: modDef.color }}
            title={modDef.desc}
          >
            <Sparkles size={10} />
            {modDef.name}
          </span>
        )}
      </div>

      {/* center: resources */}
      <div className="flex items-center gap-2 text-[12px] font-black sm:gap-4 sm:text-sm">
        <span className="flex items-center gap-1 text-amber-200 sm:gap-1.5">
          <Coins size={14} className="text-amber-300" />
          {fa(hud.gold)}
        </span>
        <span key={livesKey} className={`anim-shock flex items-center gap-1 sm:gap-1.5 ${hud.lives <= 6 ? 'text-rose-400' : 'text-rose-200'}`}>
          <Heart size={14} fill={hud.lives <= 6 ? 'currentColor' : 'none'} />
          {fa(hud.lives)}
        </span>
        {hud.combo >= 8 && (
          <span className="hidden items-center gap-1 text-violet-300 sm:flex">
            <Flame size={13} />×{fa(hud.combo)}
          </span>
        )}
        {(hud.buffs.dmgWaves > 0 || hud.buffs.rangeWaves > 0) && (
          <span className="hidden items-center gap-1 text-[10px] font-bold text-cyan-300 md:flex" title="بافِ فعال">
            <Sparkles size={11} />
            {hud.buffs.dmgWaves > 0 && `+${fa(hud.buffs.dmg * 100)}٪ آسیب`}
            {hud.buffs.dmgWaves > 0 && hud.buffs.rangeWaves > 0 && ' · '}
            {hud.buffs.rangeWaves > 0 && `+${fa(hud.buffs.range * 100)}٪ برد`}
          </span>
        )}
      </div>

      {/* right: controls */}
      <div className={`flex shrink-0 items-center gap-0 ${hud.phase === 'over' ? 'pointer-events-none opacity-40' : ''}`}>
        <button
          onClick={onPet}
          aria-label={hud.pet ? `همراه ${PETS[hud.pet.kind].name} سطح ${fa(hud.pet.level)}` : 'فهرست همراهان'}
          title={hud.pet ? `${PETS[hud.pet.kind].name} — سطح ${fa(hud.pet.level)}` : 'همراه (پس از اولین باس)'}
          className="me-0.5 flex h-10 min-w-9 items-center justify-center gap-1 rounded-full border border-white/10 bg-white/5 px-0.5 transition hover:border-cyan-300/40 sm:me-1 sm:pe-2.5 sm:ps-0.5"
        >
          {hud.pet ? (
            <>
              <span className="relative h-7 w-7 overflow-hidden rounded-full bg-[#0a0d1c]">
                <PetPortrait kind={hud.pet.kind} level={hud.pet.level} size={28} />
              </span>
              <span className="hidden text-[10px] font-bold text-slate-200 sm:block">
                س{fa(hud.pet.level)}
                <span className="ms-1 inline-block h-1 w-8 overflow-hidden rounded-full bg-slate-800 align-middle">
                  <span className="block h-full bg-cyan-400" style={{ width: `${Math.min(100, (hud.pet.xp / hud.pet.next) * 100)}%` }} />
                </span>
              </span>
            </>
          ) : (
            <span className="flex items-center gap-1 px-1 text-[10px] font-bold text-slate-500">
              <PawPrint size={16} />
              <span className="hidden sm:inline">همراه</span>
            </span>
          )}
        </button>
        <button
          onClick={() => onSpeed(hud.speed === 1 ? 2 : hud.speed === 2 ? 3 : 1)}
          aria-label={`سرعت بازی ${fa(hud.speed)} برابر؛ برای تغییر بزنید`}
          className="flex h-10 items-center gap-0.5 rounded-md px-1 text-xs font-black text-cyan-200 transition hover:bg-white/5 sm:gap-1 sm:px-2"
          title="سرعت بازی"
        >
          <FastForward size={13} />
          {fa(hud.speed)}×
        </button>
        <IconBtn onClick={onTogglePause} title="مکث">
          {hud.paused ? <Play size={15} /> : <Pause size={15} />}
        </IconBtn>
        <div className="hidden lg:flex">
          <IconBtn onClick={onToggleMute} title="صدا">
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </IconBtn>
          <IconBtn onClick={onExit} title="خروج">
            <Home size={15} />
          </IconBtn>
        </div>
      </div>

      {/* boss bar */}
      {hud.bossHp && (
        <div className="absolute inset-x-0 -bottom-8 z-20 flex justify-center">
          <div className="flex w-[min(560px,84vw)] items-center gap-2 rounded-full border border-violet-400/30 bg-[#070a16]/85 px-3 py-1 backdrop-blur">
            <Skull size={13} className="shrink-0 text-violet-300" />
            <span className="shrink-0 text-[11px] font-black text-violet-100">
              {hud.bossHp.name}
              {hud.bossPhase > 0 && <span className="ms-1 text-[9px] text-amber-300">مرحلهٔ {fa(hud.bossPhase)}</span>}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-[width] duration-200 ${
                  hud.bossPhase >= 3 ? 'bg-gradient-to-l from-amber-300 to-rose-500' : 'bg-gradient-to-l from-fuchsia-400 to-violet-600'
                }`}
                style={{ width: `${(hud.bossHp.hp / hud.bossHp.max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* ── spells ────────────────────────────────────────────────── */

const SPELL_ICON: Record<SpellId, LucideIcon> = { pulse: Activity, frost: Snowflake, tear: CloudLightning };
const SPELL_COLOR: Record<SpellId, string> = { pulse: '#5eead4', frost: '#a5f3fc', tear: '#fef08a' };

function SpellStrip({ hud, onCast }: { hud: HudInfo; onCast: (id: SpellId) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {SPELLS.map((s) => {
        const Icon = SPELL_ICON[s.id];
        const cd = hud.spells[s.id];
        const ready = cd <= 0 && hud.phase === 'combat';
        const frac = 1 - Math.min(1, cd / s.cd);
        return (
          <button
            key={s.id}
            onClick={() => onCast(s.id)}
            disabled={!ready}
            title={`${s.name} (${s.hotkey}) — ${s.desc}`}
            className={`relative flex h-11 w-11 items-center justify-center rounded-xl border transition active:scale-95 ${
              ready ? 'border-white/20 bg-white/5 hover:bg-white/10' : 'cursor-not-allowed border-white/5 bg-black/30'
            }`}
            style={
              ready
                ? { boxShadow: `0 0 16px ${SPELL_COLOR[s.id]}55`, borderColor: `${SPELL_COLOR[s.id]}88` }
                : { background: `conic-gradient(${SPELL_COLOR[s.id]}33 ${frac * 360}deg, rgba(0,0,0,0.35) 0deg)` }
            }
          >
            <Icon size={17} style={{ color: ready ? SPELL_COLOR[s.id] : '#64748b' }} />
            {cd > 0 && <span className="absolute -bottom-1.5 rounded bg-black/80 px-1 text-[9px] font-black text-slate-300">{fa(cd)}</span>}
            <span className="font-pixel ltr absolute left-1 top-0.5 text-[6px] text-slate-500">{s.hotkey}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── bottom panel ──────────────────────────────────────────── */

interface PanelProps {
  hud: HudInfo;
  sel: Sel;
  locked: boolean;
  onBuild: (k: TowerKind) => void;
  onUpgrade: () => void;
  onSell: () => void;
  onCycleTarget: () => void;
  onDeselect: () => void;
  onStartWave: () => void;
  onCast: (id: SpellId) => void;
  onCodex: () => void;
}

const TARGET_LABEL = { first: 'اولین', strong: 'قوی‌ترین', last: 'آخرین' } as const;
const TARGET_ICON: Record<string, LucideIcon> = { first: Flag, strong: Activity, last: Timer };

export function BottomPanel({ hud, sel, locked, onBuild, onUpgrade, onSell, onCycleTarget, onDeselect, onStartWave, onCast, onCodex }: PanelProps) {
  const building = hud.phase === 'build';
  const next = hud.wave + 1;
  const preview = useMemo(() => {
    if (hud.phase !== 'build') return [] as { kind: EnemyKind; n: number }[];
    const m = new Map<EnemyKind, number>();
    for (const grp of buildWave(next)) m.set(grp.kind, (m.get(grp.kind) ?? 0) + grp.count);
    return [...m.entries()].map(([kind, n]) => ({ kind, n })).sort((a, b) => b.n - a.n).slice(0, 4);
  }, [next, hud.phase]);
  const nextMod = hud.nextMod && !isBossWave(next) ? MODS[hud.nextMod as ModId] : null;

  return (
    <footer className={`relative z-30 border-t border-white/5 bg-[#070a16]/85 backdrop-blur-md transition-opacity ${locked ? 'pointer-events-none opacity-50' : ''}`}>
      <div className="mx-auto flex h-[108px] max-w-[1400px] items-center gap-3 px-3">
        {/* selection area */}
        <div className="relative min-w-0 flex-1">
          {sel.type === 'tile' && (
            <div className="flex items-center gap-2">
              {KINDS.map((k, i) => {
                const def = TOWERS[k];
                const cost = Math.round(def.levels[0].cost * hud.costMult);
                const afford = hud.gold >= cost;
                return (
                  <button
                    key={k}
                    onClick={() => onBuild(k)}
                    title={`${def.name} — ${def.tip}`}
                    className={`group relative flex flex-col items-center gap-0.5 rounded-xl border px-2 pb-1.5 pt-1 transition active:scale-95 ${
                      afford ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'cursor-not-allowed border-white/5 opacity-40'
                    }`}
                    style={afford ? { borderColor: `${def.color}44` } : undefined}
                  >
                    <span className="font-pixel ltr absolute left-1 top-1 text-[6px] text-slate-600">{i + 1}</span>
                    <TowerPortrait kind={k} level={0} size={44} animate={false} />
                    <span className="text-[10px] font-bold text-slate-200">{def.name}</span>
                    <span className={`text-[10px] font-black ${afford ? 'text-amber-300' : 'text-rose-400'}`}>{fa(cost)}</span>
                  </button>
                );
              })}
              <button onClick={onDeselect} className="ms-auto rounded-md p-1.5 text-slate-500 hover:text-slate-200">
                <X size={14} />
              </button>
            </div>
          )}

          {sel.type === 'tower' &&
            (() => {
              const def = TOWERS[sel.kind];
              const apex = sel.level === def.levels.length - 1;
              const TIcon = TARGET_ICON[sel.targetMode];
              return (
                <div className="flex items-center gap-3">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ background: `radial-gradient(circle at 50% 62%, ${def.color}2e, #080b18)` }}>
                    <TowerPortrait kind={sel.kind} level={sel.level} size={64} />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <div className="flex items-center gap-1.5 text-sm font-black text-slate-100">
                      {def.name}
                      <span className="text-[10px] font-bold text-slate-500">{apex ? `اوج${sel.ascend ? ` ★${fa(sel.ascend)}` : ''}` : `سطح ${fa(sel.level + 1)}`}</span>
                    </div>
                    <div className="ltr mt-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                      <span>DMG {Math.round(sel.dmg)}</span>·<span>SPD {sel.rate.toFixed(2)}</span>·<span>RNG {Math.round(sel.range)}</span>·
                      <span className="text-cyan-300">DPS {Math.round(sel.dmg * sel.rate)}</span>
                    </div>
                    {sel.synergies.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {sel.synergies.map((sid) => {
                          const syn = SYNERGIES.find((s) => s.id === sid);
                          return syn ? (
                            <span key={sid} title={syn.desc} className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: `${syn.color}1f`, color: syn.color }}>
                              {syn.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                  <div className="ms-auto flex items-center gap-1.5">
                    <button onClick={onCycleTarget} title="هدف‌گیری (T)" className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1.5 text-[10px] font-bold text-slate-300 hover:bg-white/5">
                      <TIcon size={11} />
                      {TARGET_LABEL[sel.targetMode]}
                    </button>
                    <button onClick={onSell} title="فروش (S)" className="flex items-center gap-1 rounded-lg border border-rose-500/30 px-2 py-1.5 text-[10px] font-bold text-rose-300 hover:bg-rose-500/10">
                      <Trash2 size={11} />
                      {fa(sel.sellValue)}
                    </button>
                    <button
                      onClick={onUpgrade}
                      disabled={sel.upgradeCost === null}
                      title="ارتقا (U)"
                      className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[11px] font-black transition active:scale-95 ${
                        sel.upgradeCost === null
                          ? 'border-white/5 text-slate-600'
                          : hud.gold >= sel.upgradeCost
                            ? sel.isAscend
                              ? 'border-yellow-300/70 bg-yellow-400/15 text-yellow-100'
                              : 'border-amber-300/60 bg-amber-400/15 text-amber-200'
                            : 'border-white/10 text-slate-500'
                      }`}
                    >
                      <ChevronUp size={13} />
                      {sel.upgradeCost === null ? '★۵' : sel.isAscend ? `فرااوج ★${fa(sel.ascend + 1)} · ${fa(sel.upgradeCost)}` : `ارتقا · ${fa(sel.upgradeCost)}`}
                    </button>
                  </div>
                </div>
              );
            })()}

          {sel.type === 'none' && (
            <div className="flex items-center gap-3">
              <p className="text-xs leading-6 text-slate-400">
                روی <span className="font-bold text-cyan-300">زمینِ خالی</span> کلیک کن تا برج بسازی. برج‌های مکمل را کنار هم بگذار تا <span className="font-bold text-violet-300">هم‌نوایی</span> شوند.
                <br />
                <span className="text-slate-500">کلیدها: ۱–۶ ساخت · U ارتقا · S فروش · T هدف · Q/W/E توانِ قلب</span>
              </p>
              <button onClick={onCodex} className="ms-auto flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-white/5">
                <BookOpen size={12} />
                کتابِ معماری
              </button>
            </div>
          )}
        </div>

        <SpellStrip hud={hud} onCast={onCast} />

        {/* wave control */}
        <button
          onClick={onStartWave}
          disabled={!building || hud.phase === 'over'}
          className={`relative flex h-[84px] w-[200px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border text-sm font-black transition active:scale-95 ${
            building && hud.phase !== 'over'
              ? 'anim-pulse-glow border-cyan-300/60 bg-gradient-to-l from-cyan-500/25 to-violet-500/25 text-cyan-50 hover:from-cyan-500/40 hover:to-violet-500/40'
              : 'cursor-default border-white/5 bg-black/30 text-slate-500'
          }`}
        >
          {hud.phase === 'combat' ? (
            <>
              <span className="flex items-center gap-1.5">
                <Swords size={16} className="text-rose-400" />
                در حال نبرد
              </span>
              <span className="text-[11px] font-bold text-slate-400">{fa(hud.enemiesLeft)} روح باقی‌مانده</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <Play size={15} />
                آغاز موج {fa(next)}
              </span>
              <span className="text-[10px] font-bold text-slate-300/80">{nextWaveHint(next)} · +{fa(hud.earlyBonus)} ریسک</span>
              <span className="ltr flex items-center gap-1.5">
                {preview.map((p) => (
                  <span key={p.kind} className="flex items-center" title={ENEMIES[p.kind].name}>
                    <EnemyPortrait kind={p.kind} size={18} />
                    <span className="text-[9px] font-black" style={{ color: ENEMIES[p.kind].color }}>
                      {fa(p.n)}
                    </span>
                  </span>
                ))}
                {nextMod && (
                  <span className="rounded-full px-1.5 text-[9px] font-black" style={{ background: `${nextMod.color}26`, color: nextMod.color }} title={nextMod.desc}>
                    {nextMod.name}
                  </span>
                )}
              </span>
            </>
          )}
        </button>
      </div>
    </footer>
  );
}

/* ── Banner & toasts ───────────────────────────────────────── */

export function WaveBanner({ text, sub, tone }: { text: string; sub?: string; tone: 'normal' | 'boss' }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[26%] z-20 flex flex-col items-center gap-2">
      <div
        className={`anim-banner text-5xl font-black tracking-widest sm:text-7xl ${tone === 'boss' ? 'text-rose-500' : 'text-slate-50'}`}
        style={{ textShadow: tone === 'boss' ? '0 0 40px rgba(244,63,94,0.8), 0 6px 0 rgba(0,0,0,0.6)' : '0 0 40px rgba(103,232,249,0.5), 0 6px 0 rgba(0,0,0,0.6)' }}
      >
        {text}
      </div>
      {sub && <div className={`anim-banner text-sm font-bold sm:text-base ${tone === 'boss' ? 'text-rose-300' : 'text-cyan-200'}`}>{sub}</div>}
    </div>
  );
}

export function Toasts({ items }: { items: { id: number; text: string }[] }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-14 z-30 flex flex-col items-center gap-1">
      {items.map((t) => (
        <div key={t.id} className="anim-toast flex items-center gap-2 rounded-full border border-white/10 bg-[#070a16]/85 px-3.5 py-1 text-[11px] font-bold text-amber-100 backdrop-blur">
          <Coins size={11} className="text-amber-300" />
          {t.text}
        </div>
      ))}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BookOpen,
  ChevronUp,
  CloudLightning,
  Coins,
  Flag,
  Play,
  ShieldAlert,
  Snowflake,
  Trash2,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ENEMIES, KINDS, SPELLS, SYNERGIES, TOWERS } from '../game/config';
import { MODS } from '../game/modifiers';
import type { ModId } from '../game/modifiers';
import { buildWave, isBossWave } from '../game/waves';
import type { HudInfo, Sel, SpellId, TowerKind } from '../game/types';
import { TowerPortrait } from './Portrait';

const fa = (n: number) => Math.round(n).toLocaleString('fa-IR');
const SPELL_ICONS: Record<SpellId, LucideIcon> = { pulse: Activity, frost: Snowflake, tear: CloudLightning };
const SPELL_COLORS: Record<SpellId, string> = { pulse: '#5eead4', frost: '#a5f3fc', tear: '#fef08a' };
const TARGET_NAMES = { first: 'اول مسیر', strong: 'قوی ترین', last: 'آخر مسیر' } as const;

interface Props {
  hud: HudInfo;
  sel: Sel;
  locked: boolean;
  onBuild: (kind: TowerKind) => void;
  onUpgrade: () => void;
  onSell: () => void;
  onCycleTarget: () => void;
  onDeselect: () => void;
  onStartWave: () => void;
  onCast: (spell: SpellId) => void;
  onCodex: () => void;
}

export default function MobileDock({
  hud,
  sel,
  locked,
  onBuild,
  onUpgrade,
  onSell,
  onCycleTarget,
  onDeselect,
  onStartWave,
  onCast,
  onCodex,
}: Props) {
  const [confirmSell, setConfirmSell] = useState(false);
  const sellTimer = useRef<number | null>(null);
  const selectedId = sel.type === 'tower' ? sel.id : null;
  useEffect(() => {
    setConfirmSell(false);
    return () => {
      if (sellTimer.current !== null) window.clearTimeout(sellTimer.current);
    };
  }, [selectedId]);

  const nextWave = hud.wave + 1;
  const nextMod = hud.nextMod && !isBossWave(nextWave) ? MODS[hud.nextMod as ModId] : null;
  const wavePreview = useMemo(() => {
    if (hud.phase !== 'build') return '';
    const groups = buildWave(nextWave);
    const kinds = [...new Set(groups.map((g) => g.kind))];
    return kinds.slice(0, 3).map((k) => ENEMIES[k].name).join(' / ');
  }, [nextWave, hud.phase]);

  return (
    <section
      aria-label="کنترل های لمسی بازی"
      className={`mobile-dock relative z-30 border-t border-cyan-300/15 bg-[#080d1c]/95 shadow-[0_-12px_50px_rgba(0,0,0,0.42)] backdrop-blur-xl lg:hidden ${locked ? 'pointer-events-none opacity-50' : ''}`}
    >
      <div className="mobile-dock-head flex items-center justify-between gap-2 px-3 pt-2 text-[11px] font-bold">
        <div className="min-w-0 truncate text-slate-300">
          {sel.type === 'tile' ? (
            <span className="text-cyan-200">محل ساخت انتخاب شد. برجت را انتخاب کن</span>
          ) : sel.type === 'tower' ? (
            <span style={{ color: TOWERS[sel.kind].color }}>
              {TOWERS[sel.kind].name} <span className="text-slate-400">{sel.ascend ? `★${fa(sel.ascend)}` : `سطح ${fa(sel.level + 1)}`}</span>
            </span>
          ) : (
            <span>برای ساخت برج، روی یک خانه خالی از نقشه بزن</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onCodex}
            aria-label="کتاب برج ها و راهنمای بازی"
            className="mobile-touch flex items-center gap-1 rounded-lg px-2 text-violet-200 active:bg-violet-400/15"
          >
            <BookOpen size={16} />
            <span>راهنما</span>
          </button>
          {sel.type !== 'none' && (
            <button
              onClick={onDeselect}
              aria-label="بستن انتخاب"
              className="mobile-touch flex w-9 items-center justify-center rounded-lg text-slate-300 active:bg-white/10"
            >
              <X size={17} />
            </button>
          )}
        </div>
      </div>

      <div className="mobile-dock-content px-3 pb-2">
        {sel.type === 'tile' && (
          <div className="mobile-tower-grid grid grid-cols-3 gap-1.5 pt-1 sm:grid-cols-6">
            {KINDS.map((kind) => {
              const def = TOWERS[kind];
              const cost = Math.round(def.levels[0].cost * hud.costMult);
              const affordable = hud.gold >= cost;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => onBuild(kind)}
                  disabled={!affordable}
                  aria-label={`ساخت ${def.name}، ${fa(cost)} طلا`}
                  className={`flex min-h-14 items-center gap-1.5 rounded-xl border px-1.5 text-right transition active:scale-95 ${
                    affordable ? 'bg-white/[0.045] active:bg-white/15' : 'cursor-not-allowed border-white/5 opacity-40'
                  }`}
                  style={affordable ? { borderColor: `${def.color}66` } : undefined}
                >
                  <TowerPortrait kind={kind} level={0} size={32} animate={false} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10px] font-extrabold text-slate-100">{def.name}</span>
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-300">
                      <Coins size={10} />{fa(cost)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {sel.type === 'tower' && (
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <TowerPortrait kind={sel.kind} level={sel.level} size={38} animate={false} />
                </div>
                <div className="min-w-0">
                  <span className="block truncate text-[10px] font-black text-slate-100">
                    آسیب {fa(sel.dmg)} · سرعت {sel.rate.toFixed(1)} · برد {fa(sel.range)}
                  </span>
                  <span className="block truncate text-[10px] text-cyan-300">
                    {sel.synergies.length
                      ? sel.synergies.map((id) => SYNERGIES.find((s) => s.id === id)?.name).filter(Boolean).join(' + ')
                      : `کشتار ${fa(sel.kills)} · برج مکمل را کنارش بساز`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onCycleTarget}
                aria-label={`تغییر هدف گیری. اکنون: ${TARGET_NAMES[sel.targetMode]}`}
                className="mobile-touch flex shrink-0 items-center gap-1 rounded-lg border border-white/15 px-2 text-[10px] font-bold text-slate-200 active:bg-white/10"
              >
                <Flag size={12} />{TARGET_NAMES[sel.targetMode]}
              </button>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                onClick={onUpgrade}
                disabled={sel.upgradeCost === null || hud.gold < sel.upgradeCost}
                className={`mobile-touch flex items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-black transition active:scale-95 ${
                  sel.upgradeCost !== null && hud.gold >= sel.upgradeCost
                    ? 'border-amber-300/60 bg-amber-400/15 text-amber-100'
                    : 'cursor-not-allowed border-white/5 bg-white/5 text-slate-500'
                }`}
              >
                <ChevronUp size={17} />
                {sel.upgradeCost === null
                  ? 'به نهایت رسیده'
                  : `${sel.isAscend ? (sel.ascend + 1 > 5 ? `قدرتِ افسانه‌ای ★${fa(sel.ascend + 1)}` : `فرااوج ★${fa(sel.ascend + 1)}`) : 'ارتقای برج'} · ${fa(sel.upgradeCost)} طلا`}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmSell) {
                    onSell();
                    setConfirmSell(false);
                  } else {
                    setConfirmSell(true);
                    if (sellTimer.current !== null) window.clearTimeout(sellTimer.current);
                    sellTimer.current = window.setTimeout(() => setConfirmSell(false), 3500);
                  }
                }}
                aria-label={confirmSell ? 'تایید فروش برج' : `فروش برج، بازگشت ${fa(sel.sellValue)} طلا`}
                className={`mobile-touch flex items-center justify-center gap-1 rounded-xl border px-3 text-[11px] font-bold ${
                  confirmSell ? 'border-rose-400 bg-rose-500/25 text-rose-100' : 'border-rose-400/30 text-rose-300'
                }`}
              >
                <Trash2 size={14} />{confirmSell ? 'تایید فروش' : fa(sel.sellValue)}
              </button>
            </div>
          </div>
        )}

        {sel.type === 'none' && (
          <p className="pt-1 text-[11px] leading-5 text-slate-400">
            نقشه را با انگشت بکش. برای ساخت روی زمین خالی بزن؛ برای ارتقا روی برج بزن.
          </p>
        )}
      </div>

      <div className="mobile-dock-controls flex items-center gap-1.5 border-t border-white/5 px-3 pt-2">
        <div className="flex shrink-0 items-center gap-1.5">
          {SPELLS.map((spell) => {
            const Icon = SPELL_ICONS[spell.id];
            const cd = hud.spells[spell.id];
            const ready = cd <= 0 && hud.phase === 'combat' && !hud.paused;
            return (
              <button
                type="button"
                key={spell.id}
                onClick={() => onCast(spell.id)}
                disabled={!ready}
                aria-label={`${spell.name}: ${spell.desc}${cd > 0 ? `، ${fa(cd)} ثانیه تا آماده شدن` : ''}`}
                className={`mobile-touch relative flex w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border ${
                  ready ? 'border-white/25 bg-white/10 active:scale-95' : 'border-white/5 bg-black/25 text-slate-600'
                }`}
                style={ready ? { borderColor: `${SPELL_COLORS[spell.id]}77` } : undefined}
              >
                <Icon size={17} style={{ color: ready ? SPELL_COLORS[spell.id] : '#475569' }} />
                <span className="text-[9px] font-bold leading-none text-slate-200">
                  {spell.id === 'pulse' ? 'ضربان' : spell.id === 'frost' ? 'یخ' : 'صاعقه'}
                </span>
                {cd > 0 && (
                  <span className="absolute bottom-0 left-0 right-0 rounded-b-xl bg-black/75 text-center text-[10px] font-black text-white">
                    {fa(cd)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onStartWave}
          disabled={hud.phase !== 'build' || hud.paused}
          className={`mobile-touch flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-black transition active:scale-[0.98] ${
            hud.phase === 'build' && !hud.paused
              ? 'border-cyan-300/65 bg-gradient-to-l from-cyan-400/30 to-violet-400/20 text-cyan-50'
              : 'border-white/5 bg-white/5 text-slate-400'
          }`}
        >
          {hud.phase === 'build' ? <Play size={16} /> : <ShieldAlert size={16} />}
          <span className="min-w-0 truncate">
            {hud.phase === 'build' ? `موج ${fa(nextWave)} · +${fa(hud.earlyBonus)}` : `${fa(hud.enemiesLeft)} دشمن`}
          </span>
        </button>
      </div>
      {hud.phase === 'build' && (
        <p className="mobile-dock-hint truncate px-3 pt-1 text-center text-[9px] text-slate-500">
          {nextMod ? `مهر بعد: ${nextMod.name} · ` : ''}{wavePreview}
        </p>
      )}
    </section>
  );
}
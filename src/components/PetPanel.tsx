import { Check, Lock, PawPrint, Star, X } from 'lucide-react';
import { PETS, PET_MAX_LEVEL, PET_ORDER, getPetSave, petLevel, petXp, petXpNeeded, setActivePet } from '../game/pets';
import { PetPortrait } from './Portrait';
import type { PetKind } from '../game/types';
import { audio } from '../game/audio';

const fa = (n: number) => Math.round(n).toLocaleString('fa-IR');

interface Props {
  canSwitch: boolean;
  onPick: (k: PetKind) => void;
  onClose: () => void;
}

export default function PetPanel({ canSwitch, onPick, onClose }: Props) {
  const save = getPetSave();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#04050c]/88 p-2 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div className="anim-rise relative max-h-[calc(100dvh-24px)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0d1c]/95 p-3 shadow-[0_0_70px_rgba(103,232,249,0.15)] sm:p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PawPrint size={18} className="text-cyan-300" />
            <h2 className="text-lg font-black text-slate-100">همراهان</h2>
          </div>
          <button onClick={onClose} aria-label="بستن همراهان" className="mobile-touch flex w-10 items-center justify-center rounded-md text-slate-400 hover:bg-white/5 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-xs leading-6 text-slate-400">
          پس از هر باس، یک همراه از خاکسترش برمی‌خیزد. همراهان با هر کشتار تجربه می‌گیرند، سطحشان تا {fa(PET_MAX_LEVEL)} بالا می‌رود و
          <span className="font-bold text-cyan-200"> برای همیشه </span>با تو می‌مانند. {canSwitch ? 'یکی را برای این نبرد انتخاب کن.' : 'تعویض همراه فقط بین موج‌ها ممکن است.'}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PET_ORDER.map((k) => {
            const def = PETS[k];
            const unlocked = save.unlocked.includes(k);
            const active = save.active === k;
            const lvl = petLevel(k);
            const xp = petXp(k);
            const need = petXpNeeded(lvl);
            return (
              <button
                key={k}
                disabled={!unlocked || !canSwitch}
                onClick={() => {
                  setActivePet(k);
                  audio.shard();
                  onPick(k);
                }}
                className={`relative flex min-h-24 flex-col gap-2 rounded-xl border p-3 text-right transition ${
                  active
                    ? 'border-cyan-300/60 bg-cyan-400/10'
                    : unlocked
                      ? 'border-white/10 bg-white/5 hover:bg-white/10'
                      : 'border-white/5 bg-black/30 opacity-60'
                } ${!canSwitch && unlocked ? 'cursor-default' : ''}`}
                style={active ? { boxShadow: `0 0 26px ${def.color}33` } : undefined}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ background: `radial-gradient(circle at 50% 60%, ${def.color}30, #080b18)` }}>
                    {unlocked ? <PetPortrait kind={k} level={lvl} size={64} /> : <Lock size={20} className="text-slate-600" />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-black" style={{ color: unlocked ? def.color : '#64748b' }}>
                      {def.name}
                      {active && <Check size={13} className="text-cyan-300" />}
                    </div>
                    <div className="text-[10px] text-slate-400">{def.title}</div>
                    {unlocked ? (
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-300">
                        <Star size={10} className="text-amber-300" />
                        سطح {fa(lvl)}
                        <span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                          <span className="block h-full bg-cyan-400" style={{ width: `${Math.min(100, (xp / need) * 100)}%` }} />
                        </span>
                      </div>
                    ) : (
                      <div className="mt-1 text-[10px] font-bold text-slate-500">پس از موج {fa(def.unlockWave)}</div>
                    )}
                  </div>
                </div>
                <p className="text-[11px] leading-5 text-slate-300">{unlocked ? def.desc : def.lore}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

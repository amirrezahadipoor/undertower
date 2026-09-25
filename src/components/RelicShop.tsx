import mirrorImg from '../assets/mirror.jpg';
import { useState } from 'react';
import { Check, ChefHat, Clock, Coins, Eye, Gem, Handshake, Heart, Magnet, Snowflake, Swords, Wand2, X, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { RELICS, buyRelic, getRelics, getShards } from '../game/meta';
import { audio } from '../game/audio';

const RICON: Record<string, LucideIcon> = {
  'war-chest': Coins,
  'heart-knot': Heart,
  'nebu-apron': ChefHat,
  wrath: Swords,
  sneeze: Zap,
  winter: Snowflake,
  sixth: Eye,
  pact: Handshake,
  'soul-magnet': Magnet,
  'chrono-heart': Clock,
};

export default function RelicShop({ onClose }: { onClose: () => void }) {
  const [, force] = useState(0);
  const shards = getShards();
  const owned = getRelics();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#04050c]/90 p-2 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <img src={mirrorImg} alt="" className="h-full w-full object-cover" draggable={false} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#04050c]/60 via-transparent to-[#04050c]" />
      </div>
      <div
        className="anim-rise relative max-h-[calc(100dvh-16px)] w-full max-w-2xl overflow-y-auto rounded-xl border border-violet-400/30 bg-[#0a0d1c]/95 p-3 shadow-[0_0_60px_rgba(139,92,246,0.25)] sm:max-h-[88dvh] sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 size={20} className="text-violet-300" />
            <h2 className="text-xl font-black text-slate-100">آیینهٔ خاطرات</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-cyan-200">
              <Gem size={14} />
              {shards.toLocaleString('fa-IR')} خرده‌خاطره
            </span>
            <button onClick={onClose} aria-label="بستن آیینه خاطرات" className="mobile-touch flex w-10 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>
        <p className="mb-4 text-xs leading-6 text-slate-400">
          سالگرد از پشتِ آیینه پوزخند می‌زند: «هر دفاعی که بیفتد، چیزی از خودش باقی می‌گذارد. این‌ها مالِ بازمانده‌هاست؛ برای همیشه.»
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {RELICS.map((r) => {
            const Icon = RICON[r.id] ?? Gem;
            const has = owned.includes(r.id);
            const afford = shards >= r.cost;
            return (
              <button
                key={r.id}
                disabled={has || !afford}
                onClick={() => {
                  if (buyRelic(r.id)) {
                    audio.shard();
                    force((v) => v + 1);
                  } else {
                    audio.error();
                  }
                }}
                className={`mobile-touch flex items-start gap-3 rounded-lg border p-3 text-right transition active:scale-[0.98] ${
                  has
                    ? 'border-emerald-400/40 bg-emerald-400/10'
                    : afford
                      ? 'border-violet-400/40 bg-violet-500/10 hover:bg-violet-500/20'
                      : 'border-slate-800 bg-slate-900/40 opacity-50'
                }`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${has ? 'bg-emerald-400/20 text-emerald-200' : 'bg-violet-400/15 text-violet-200'}`}>
                  {has ? <Check size={18} /> : <Icon size={18} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold text-slate-100">{r.name}</span>
                    {!has && (
                      <span className={`flex shrink-0 items-center gap-1 text-xs font-bold ${afford ? 'text-cyan-300' : 'text-slate-500'}`}>
                        <Gem size={11} />
                        {r.cost.toLocaleString('fa-IR')}
                      </span>
                    )}
                  </span>
                  <span className="block text-xs font-bold text-slate-300">{r.desc}</span>
                  <span className="block text-[10px] italic text-slate-500">{r.flavor}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-center text-[11px] text-slate-500">
          خرده‌خاطره‌ها از آزاد کردن روح‌ها و فروپاشیدن باس‌ها جمع می‌شوند — حتی در شکست.
        </p>
      </div>
    </div>
  );
}

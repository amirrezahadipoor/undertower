import { useEffect } from 'react';
import { Coins, Heart, Sparkles, Swords, Wand2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SPEAKERS } from '../game/story';
import type { RandomEvent } from '../game/modifiers';
import { audio } from '../game/audio';

const TONE_STYLE: Record<string, { border: string; bg: string; text: string; icon: LucideIcon }> = {
  good: { border: 'border-emerald-400/60', bg: 'bg-emerald-400/10 hover:bg-emerald-400/20', text: 'text-emerald-100', icon: Heart },
  risky: { border: 'border-amber-400/60', bg: 'bg-amber-400/10 hover:bg-amber-400/20', text: 'text-amber-100', icon: Swords },
  neutral: { border: 'border-slate-500/60', bg: 'bg-slate-700/20 hover:bg-slate-700/35', text: 'text-slate-200', icon: Wand2 },
};

export default function EventCard({ event, onChoose, gold, lives }: { event: RandomEvent; onChoose: (i: number) => void; gold: number; lives: number }) {
  const spk = SPEAKERS[event.speaker];
  // A short voice sample of the speaker, like a dialogue box opening.
  useEffect(() => {
    let i = 0;
    const id = window.setInterval(() => {
      audio.blip(event.speaker);
      if (++i >= 4) window.clearInterval(id);
    }, 55);
    return () => window.clearInterval(id);
  }, [event.speaker]);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4">
      <div className="pointer-events-none fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div className="dialogue-frame anim-rise relative max-h-[calc(100dvh-24px)] w-full max-w-lg overflow-y-auto p-1.5">
        <div className="p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-3">
            {spk.img && (
              <div className="h-14 w-14 shrink-0 overflow-hidden border-2 bg-[#050508]" style={{ borderColor: spk.color }}>
                <img src={spk.img} alt="" className="pix anim-bob h-full w-full object-cover" draggable={false} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-slate-400">
                <Sparkles size={11} className="text-amber-300" />
                پیشامد
              </div>
              <h3 className={`text-lg font-black ${spk.font.split(' ')[0]}`} style={{ color: spk.color }}>
                {event.title}
              </h3>
            </div>
          </div>

          <p className={`${spk.font} mb-4 text-sm text-slate-200`} style={{ textShadow: '0 1px 0 #000' }}>
            {event.text}
          </p>

          <div className="flex flex-col gap-2">
            {event.choices.map((c, i) => {
              const st = TONE_STYLE[c.tone];
              const Icon = st.icon;
              const unavailable =
                (c.effect === 'buffDmg' && gold < 60) ||
                (c.effect === 'overcharge' && gold < 40) ||
                (c.effect === 'discount' && lives <= 3);
              return (
                <button
                  key={i}
                  disabled={unavailable}
                  aria-label={`${c.label}${unavailable ? '، منابع کافی نیست' : ''}`}
                  onClick={() => {
                    audio.ui();
                    onChoose(i);
                  }}
                  className={`mobile-touch group flex items-start gap-3 rounded-lg border-2 px-3 py-2.5 text-right transition active:scale-[0.98] ${st.border} ${st.bg} ${unavailable ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  <Icon size={16} className={`mt-0.5 shrink-0 ${st.text}`} />
                  <span className="min-w-0">
                    <span className={`block text-sm font-extrabold ${st.text}`}>{c.label}</span>
                    <span className="block text-[11px] italic text-slate-400">{unavailable ? 'منابع کافی نیست' : c.flavor}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 flex items-center justify-center gap-1 text-[10px] text-slate-500">
            <Coins size={10} />
            هر انتخاب پیامدی دارد — عاقلانه دل به دریا بزن
          </p>
        </div>
      </div>
    </div>
  );
}

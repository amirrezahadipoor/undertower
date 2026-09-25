import { useEffect } from 'react';
import { Coins, Gem, Heart, Home, RotateCcw, Skull, Swords, Trophy, Wand2 } from 'lucide-react';
import { GAMEOVER } from '../game/story';
import { audio } from '../game/audio';

interface Props {
  wave: number;
  kills: number;
  earned: number;
  timeSec: number;
  best: number;
  isRecord: boolean;
  shards: number;
  onRetry: () => void;
  onMenu: () => void;
  onShop: () => void;
}

const fa = (n: number) => n.toLocaleString('fa-IR');

export default function GameOver({ wave, kills, earned, timeSec, best, isRecord, shards, onRetry, onMenu, onShop }: Props) {
  useEffect(() => {
    audio.music(null);
  }, []);

  const mm = Math.floor(timeSec / 60);
  const ss = Math.floor(timeSec % 60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#04050c]/92 p-3 backdrop-blur-sm sm:p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(76,5,25,0.28),transparent_65%)]" />
      <div className="relative my-auto flex w-full max-w-xl flex-col items-center gap-3 text-center sm:gap-5">
        <img src="/assets/core.png" alt="" className="pix h-14 w-14 object-contain opacity-70 grayscale sm:h-24 sm:w-24" draggable={false} />

        <div>
          <div className="font-pixel ltr anim-flicker text-xl text-rose-500 sm:text-2xl" style={{ textShadow: '0 0 18px rgba(244,63,94,0.7)' }}>
            THE HEART FELL
          </div>
          <div className="mt-2 text-2xl font-black text-slate-100">قلبِ سرزمین خاموش شد</div>
        </div>

        {isRecord && (
          <div className="flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-400/10 px-4 py-1.5 text-sm font-bold text-amber-200">
            <Trophy size={15} />
            رکوردِ نو! موج {fa(wave)}
          </div>
        )}

        <div className="dialogue-frame w-full p-4 text-right">
          <div className="flex items-start gap-3">
            <img src="/assets/nebu-soft.png" alt="نیبو" className="pix h-14 w-14 shrink-0 border-2 border-cyan-300/70 object-cover" />
            <div className="space-y-2 text-sm leading-7 text-slate-200">
              {GAMEOVER.map((l, i) => (
                <p key={i} className="anim-rise" style={{ animationDelay: `${0.4 + i * 0.55}s` }}>
                  {l.text}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="grid w-full grid-cols-4 gap-2 text-center">
          {[
            { icon: <Heart size={15} className="text-rose-400" />, label: 'موج', val: fa(wave) },
            { icon: <Swords size={15} className="text-cyan-300" />, label: 'روح آزادشده', val: fa(kills) },
            { icon: <Coins size={15} className="text-amber-300" />, label: 'طلا', val: fa(earned) },
            { icon: <Skull size={15} className="text-violet-300" />, label: 'زمان', val: `${fa(mm)}:${fa(ss).padStart(2, '۰')}` },
          ].map((s, i) => (
            <div key={i} className="glass flex flex-col items-center gap-1 rounded-lg px-2 py-3">
              {s.icon}
              <div className="text-lg font-extrabold text-slate-100">{s.val}</div>
              <div className="text-[10px] text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-100">
          <Gem size={15} className="text-cyan-300" />
          قلب {fa(shards)} خرده‌خاطره به آیینه برگرداند
          <button onClick={onShop} className="mobile-touch flex items-center gap-1 rounded-md bg-cyan-400/20 px-2 py-1 text-xs transition hover:bg-cyan-400/35">
            <Wand2 size={12} />
            آیینهٔ خاطرات
          </button>
        </div>

        <div className="mt-1 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              audio.ui();
              onRetry();
            }}
            className="mobile-touch flex items-center gap-2 rounded-lg border border-cyan-300/60 bg-cyan-400/15 px-7 py-3 font-extrabold text-cyan-100 transition hover:scale-105 hover:bg-cyan-400/25 active:scale-95"
          >
            <RotateCcw size={17} />
            دوباره — مصمم‌تر
          </button>
          <button
            onClick={() => {
              audio.ui();
              onMenu();
            }}
            className="mobile-touch flex items-center gap-2 rounded-lg border border-slate-600/70 bg-slate-800/40 px-6 py-3 font-bold text-slate-200 transition hover:scale-105 hover:border-slate-400 active:scale-95"
          >
            <Home size={16} />
            منو — موج {fa(best)}
          </button>
        </div>
      </div>
    </div>
  );
}

import menuBgImg from '../assets/menu-bg.jpg';
import act4Img from '../assets/act4.jpg';
import { useEffect, useState } from 'react';
import { Crown, Home, Infinity as InfinityIcon, Sunrise } from 'lucide-react';
import { ENDING_DAWN, ENDING_THRONE } from '../game/story';
import { audio } from '../game/audio';

interface Props {
  kind: 'dawn' | 'throne';
  wave: number;
  kills: number;
  timeSec: number;
  onContinue: () => void;
  onMenu: () => void;
}

const fa = (n: number) => Math.round(n).toLocaleString('fa-IR');

const CREDITS = [
  ['معمار', 'تو'],
  ['نیبو', 'روحِ راهنما، آشپزِ مشکوک'],
  ['پادشاهِ خاموشی', 'معمارِ پیش از تو'],
  ['قلب', 'خودش'],
  ['سالگرد', 'نویسندهٔ کارنامه‌ها'],
  ['نورَک · خاکسترپَر · بلورپشت · شراره · بلورین', 'همراهان'],
  ['موسیقی و صدا', 'زنده ساخته‌شده، در همین لحظه'],
  ['هنر و کد', 'دژِ ابدیت'],
];

export default function Ending({ kind, wave, kills, timeSec, onContinue, onMenu }: Props) {
  const lines = kind === 'dawn' ? ENDING_DAWN : ENDING_THRONE;
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'story' | 'credits'>('story');

  useEffect(() => {
    audio.music('menu');
    audio.chapter();
  }, []);

  useEffect(() => {
    if (phase !== 'story') return;
    if (idx >= lines.length) {
      const t = window.setTimeout(() => setPhase('credits'), 900);
      return () => window.clearTimeout(t);
    }
    // narrator voice sample for each line of the epilogue
    for (let i = 0; i < 3; i++) window.setTimeout(() => audio.blip('narr'), i * 90);
    const t = window.setTimeout(() => setIdx((i) => i + 1), 3400);
    return () => {
      window.clearTimeout(t);
    };
  }, [idx, phase, lines.length]);

  const dawn = kind === 'dawn';
  const mm = Math.floor(timeSec / 60);

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-black text-center" onClick={() => phase === 'story' && setIdx((i) => Math.min(lines.length, i + 1))}>
      <img
        src={dawn ? menuBgImg : act4Img}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ animation: 'actFade 40s ease both', filter: dawn ? 'saturate(1.3) brightness(1.15)' : 'saturate(0.8)' }}
        draggable={false}
      />
      <div className={`absolute inset-0 ${dawn ? 'bg-gradient-to-t from-amber-200/30 via-transparent to-black/70' : 'bg-gradient-to-t from-violet-950/70 via-transparent to-black/80'}`} />
      <div className="scanlines absolute inset-0" />

      {phase === 'story' && (
        <div className="absolute inset-x-0 bottom-[max(20px,env(safe-area-inset-bottom))] flex justify-center px-3 sm:bottom-[14vh] sm:px-6">
          <div className="dialogue-frame max-h-[72dvh] max-w-2xl overflow-y-auto p-3 sm:p-5">
            {lines.slice(0, Math.min(idx + 1, lines.length)).slice(-1).map((l, i) => (
              <p key={`${idx}-${i}`} className="anim-rise font-naskh text-base text-slate-100 sm:text-lg" style={{ textShadow: '0 2px 0 #000' }}>
                {l.text}
              </p>
            ))}
            <p className="mt-2 text-[10px] text-slate-500">روی صفحه بزن تا ادامه پیدا کند</p>
          </div>
        </div>
      )}

      {phase === 'credits' && (
        <div className="absolute inset-0 flex flex-col items-center justify-start gap-4 overflow-y-auto px-4 py-6 sm:justify-center sm:gap-6 sm:px-6">
          <div className="anim-rise">
            {dawn ? <Sunrise size={44} className="mx-auto text-amber-200" /> : <Crown size={44} className="mx-auto text-violet-300" />}
            <h1 className="mt-3 text-4xl font-black text-slate-50 sm:text-6xl" style={{ textShadow: '0 0 40px rgba(255,255,255,0.35), 0 6px 0 #000' }}>
              {dawn ? 'سپیده‌دم' : 'پادشاهِ نور'}
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              {dawn ? 'همهٔ روح‌ها آزاد شدند. مرزِ خاموشی دیگر خاموش نیست.' : 'تاج بر سرِ کسی نشست که به یاد می‌آورد.'}
            </p>
          </div>

          <div className="anim-rise grid max-w-lg grid-cols-1 gap-1.5 text-[12px]" style={{ animationDelay: '0.4s' }}>
            {CREDITS.map(([a, b]) => (
              <div key={a} className="flex items-baseline justify-between gap-6 border-b border-white/5 pb-1">
                <span className="font-black text-slate-100">{a}</span>
                <span className="text-slate-400">{b}</span>
              </div>
            ))}
          </div>

          <div className="anim-rise flex gap-4 text-xs text-slate-300" style={{ animationDelay: '0.7s' }}>
            <span>موج {fa(wave)}</span>·<span>{fa(kills)} روحِ آزادشده</span>·<span>{fa(mm)} دقیقه</span>
          </div>

          <div className="anim-rise flex flex-wrap justify-center gap-3" style={{ animationDelay: '1s' }}>
            <button
              onClick={() => {
                audio.ui();
                onContinue();
              }}
              className="flex items-center gap-2 rounded-lg border border-violet-300/60 bg-violet-500/20 px-6 py-3 font-extrabold text-violet-100 transition hover:scale-105 active:scale-95"
            >
              <InfinityIcon size={17} />
              چرخهٔ ابدی — ادامه بده
            </button>
            <button
              onClick={() => {
                audio.ui();
                onMenu();
              }}
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 font-bold text-slate-200 transition hover:scale-105 active:scale-95"
            >
              <Home size={16} />
              بازگشت به منو
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, FastForward, Heart, Sparkles } from 'lucide-react';
import { SPEAKERS, isCinematic } from '../game/story';
import type { ScriptLine } from '../game/story';
import { audio } from '../game/audio';

interface Props {
  lines: ScriptLine[];
  choices?: [string, string];
  onDone: (choice: number) => void;
}

export default function Dialogue({ lines, choices, onDone }: Props) {
  const [idx, setIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const timer = useRef<number | null>(null);
  const cinematic = isCinematic(lines);
  const line = lines[Math.min(idx, lines.length - 1)];
  const full = line.text;
  const typing = chars < full.length;
  const spk = SPEAKERS[line.who];
  const isLast = idx === lines.length - 1;
  const showChoices = Boolean(choices && isLast && !typing);

  useEffect(() => {
    setChars(0);
  }, [idx, lines]);

  useEffect(() => {
    if (!typing) return;
    const ch = full[chars];
    const pause = '،.!؟…;:'.includes(ch ?? '') ? 200 : ch === ' ' ? 14 : 26;
    timer.current = window.setTimeout(() => {
      setChars((c) => c + 1);
      if (ch && ch.trim()) audio.blip(line.who);
    }, pause);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [chars, typing, full, line.who]);

  const advance = useCallback(() => {
    if (showChoices) return;
    if (typing) {
      setChars(full.length);
      return;
    }
    if (idx < lines.length - 1) setIdx(idx + 1);
    else onDone(0);
  }, [typing, idx, lines.length, full.length, onDone, showChoices]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [advance]);

  return (
    <div className="fixed inset-0 z-40" onClick={advance}>
      {cinematic && (
        <>
          <div className="pointer-events-none fixed inset-x-0 top-0 h-[9vh] origin-top bg-black" style={{ animation: 'kfLetterbox 0.7s cubic-bezier(0.22,1,0.36,1) both' }} />
          <div className="pointer-events-none fixed inset-x-0 bottom-0 h-[9vh] origin-bottom bg-black" style={{ animation: 'kfLetterbox 0.7s cubic-bezier(0.22,1,0.36,1) both' }} />
        </>
      )}
      <div className="pointer-events-none fixed inset-0 bg-black/35" />

      {!choices && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDone(0);
          }}
          className="mobile-touch absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-md border border-slate-600/60 bg-black/70 px-3 text-xs text-slate-300 transition hover:border-cyan-300/60 hover:text-cyan-200"
        >
          <FastForward size={13} />
          رد کردن
        </button>
      )}

      <div className="absolute inset-x-0 bottom-[max(14px,env(safe-area-inset-bottom))] flex justify-center px-3 sm:bottom-[12vh]">
        <div className="dialogue-frame anim-rise max-h-[78dvh] w-full max-w-3xl overflow-y-auto p-1.5 sm:max-h-[64dvh]" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-2 p-2.5 sm:gap-4 sm:p-4">
            {spk.img && (
              <div className="flex shrink-0 flex-col items-center gap-2">
                <div className="h-14 w-14 overflow-hidden border-2 bg-[#050508] sm:h-24 sm:w-24" style={{ borderColor: spk.color }}>
                  <img src={spk.img} alt={spk.name} className="pix anim-bob h-full w-full object-cover" draggable={false} />
                </div>
                <span className={`text-xs font-bold sm:text-sm ${spk.font.split(' ')[0]}`} style={{ color: spk.color }}>
                  {spk.name}
                </span>
              </div>
            )}
            <div className="relative min-h-[5.5rem] flex-1 cursor-pointer sm:min-h-[6.5rem]" onClick={advance}>
              <p aria-live="off" className={`${spk.font} text-sm text-slate-100 sm:text-lg`} style={{ textShadow: '0 2px 0 #000' }}>
                {full.slice(0, chars)}
                {!showChoices && <span className="anim-blink text-cyan-300">▍</span>}
              </p>
              {!showChoices && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); advance(); }}
                  className="mobile-touch mt-2 flex items-center gap-1.5 rounded-md border border-white/30 px-3 text-xs font-bold text-cyan-100 active:bg-cyan-400/20 sm:hidden"
                >
                  {typing ? 'نمایش همهٔ متن' : 'ادامه'}
                  {!typing && <ChevronDown size={14} className="anim-arrow" />}
                </button>
              )}
              {showChoices && choices && (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => onDone(0)}
                    className="mobile-touch anim-rise flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-teal-300/70 bg-teal-400/10 px-4 py-2.5 text-sm font-extrabold text-teal-100 transition hover:scale-[1.03] hover:bg-teal-400/25 active:scale-95"
                  >
                    <Heart size={15} />
                    {choices[0]}
                  </button>
                  <button
                    onClick={() => onDone(1)}
                    className="mobile-touch anim-rise flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-amber-300/70 bg-amber-400/10 px-4 py-2.5 text-sm font-extrabold text-amber-100 transition hover:scale-[1.03] hover:bg-amber-400/25 active:scale-95"
                    style={{ animationDelay: '0.12s' }}
                  >
                    <Sparkles size={15} />
                    {choices[1]}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

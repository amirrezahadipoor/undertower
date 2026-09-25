import menuBgImg from '../assets/menu-bg.jpg';
import { useMemo, useState } from 'react';
import { BookOpen, Check, Download, Gem, Ghost, Play, Skull, Trophy, Volume2, Wand2 } from 'lucide-react';
import RelicShop from './RelicShop';
import Codex from './Codex';
import { audio } from '../game/audio';
import { getShards } from '../game/meta';
import { downloadProjectZip } from '../utils/projectZip';

interface Props {
  best: { wave: number; souls: number };
  onStart: () => void;
}

export default function TitleScreen({ best, onStart }: Props) {
  const [shop, setShop] = useState(false);
  const [codex, setCodex] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState('');

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    setExportError('');
    setExportDone(false);
    setExportProgress(0);
    try {
      await downloadProjectZip(setExportProgress);
      setExportDone(true);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'ساخت فایل ZIP انجام نشد. دوباره تلاش کن.');
    } finally {
      setExporting(false);
    }
  };
  const embers = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 3.5,
        dur: 7 + Math.random() * 9,
        delay: -Math.random() * 12,
        ex: (Math.random() - 0.5) * 120,
        eo: 0.35 + Math.random() * 0.5,
        color: Math.random() < 0.55 ? '#67e8f9' : '#c084fc',
      })),
    [],
  );

  return (
    <div className="relative flex min-h-dvh w-full select-none flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-[#04050c] px-3 py-10">
      <img src={menuBgImg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" draggable={false} />
      <div className="absolute inset-0 bg-gradient-to-b from-[#04050c]/70 via-transparent to-[#04050c]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,#04050c_88%)]" />
      <div className="scanlines absolute inset-0" />

      {embers.map((e) => (
        <span
          key={e.id}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: `${e.left}%`,
            bottom: '-4vh',
            width: e.size,
            height: e.size,
            background: e.color,
            boxShadow: `0 0 ${e.size * 3}px ${e.color}`,
            ['--ex' as string]: `${e.ex}px`,
            ['--eo' as string]: e.eo,
            animation: `kfEmber ${e.dur}s linear ${e.delay}s infinite`,
          }}
        />
      ))}

      <div className="anim-rise relative z-10 flex flex-col items-center gap-4 px-3 text-center sm:gap-5 sm:px-6">
        <div className="flex items-center gap-3 text-cyan-300/90">
          <Ghost size={18} className="anim-bob" />
          <span className="font-pixel ltr text-[10px] tracking-[0.5em] sm:text-xs">ETERNITY·DEFENSE</span>
          <Ghost size={18} className="anim-bob" style={{ animationDelay: '0.4s' }} />
        </div>

        <h1
          className="font-display text-5xl leading-tight text-transparent sm:text-8xl"
          style={{
            backgroundImage: 'linear-gradient(180deg,#ecfeff 0%,#67e8f9 45%,#6366f1 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            filter: 'drop-shadow(0 0 28px rgba(103,232,249,0.35)) drop-shadow(0 4px 0 rgba(0,0,0,0.6))',
          }}
        >
          دژِ ابدیت
        </h1>

        <p className="max-w-xl text-sm leading-7 text-slate-300/90 sm:text-base">
          شصت موج تا سرنوشتِ تختِ تهی، شش فصلِ داستانی و چرخه‌ای بی‌پایان.
          برج بساز، همراه پیدا کن و از قلب دفاع کن.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => {
              audio.ensure();
              audio.ui();
              onStart();
            }}
            className="mobile-touch anim-pulse-glow group flex items-center gap-3 rounded-lg border border-cyan-300/50 bg-gradient-to-l from-cyan-500/20 to-violet-500/20 px-10 py-4 text-lg font-extrabold text-cyan-100 transition-all hover:scale-[1.04] hover:border-cyan-200 hover:text-white active:scale-95"
          >
            <Play size={20} className="transition group-hover:scale-125" />
            آغازِ دفاع
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <button
            onClick={() => {
              audio.ensure();
              audio.ui();
              setShop(true);
            }}
            className="mobile-touch flex items-center gap-1.5 rounded-lg border border-violet-400/45 bg-violet-500/12 px-4 py-2 font-bold text-violet-100 transition hover:scale-105 hover:bg-violet-500/25 active:scale-95"
          >
            <Wand2 size={14} />
            آیینهٔ خاطرات — رِلیک‌ها
          </button>
          <button
            onClick={() => {
              audio.ensure();
              audio.ui();
              setCodex(true);
            }}
            className="mobile-touch flex items-center gap-1.5 rounded-lg border border-amber-300/40 bg-amber-400/10 px-4 py-2 font-bold text-amber-100 transition hover:scale-105 hover:bg-amber-400/20 active:scale-95"
          >
            <BookOpen size={14} />
            کتابِ معماری — برج‌ها و هیولاها
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
          <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5">
            <Trophy size={13} className="text-amber-300" />
            بهترین رکورد: موج {best.wave > 0 ? best.wave.toLocaleString('fa-IR') : '—'}
          </span>
          <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5">
            <Skull size={13} className="text-violet-300" />
            روح‌های آزادشده: {best.souls.toLocaleString('fa-IR')}
          </span>
          <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5">
            <Gem size={13} className="text-cyan-300" />
            خرده‌خاطره: {getShards().toLocaleString('fa-IR')}
          </span>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="mobile-touch mt-1 flex items-center gap-2 rounded-lg border border-slate-500/40 bg-black/45 px-4 text-xs font-bold text-slate-200 transition hover:border-cyan-300/60 hover:text-cyan-100 disabled:cursor-wait disabled:opacity-60"
          aria-label="دانلود فایل ZIP کامل پروژه، شامل سورس و تصاویر"
        >
          {exportDone ? <Check size={15} className="text-emerald-300" /> : <Download size={15} />}
          {exporting ? `در حال ساخت ZIP: ${exportProgress.toLocaleString('fa-IR')}٪` : exportDone ? 'فایل ZIP دانلود شد' : 'دانلود ZIP کامل پروژه'}
        </button>
        {exportError && <p role="alert" className="max-w-xs text-xs leading-6 text-rose-300">{exportError}</p>}
      </div>

      <div className="relative z-10 mt-8 flex items-center gap-2 text-center text-[11px] text-slate-500">
        <Volume2 size={12} />
        تجربه‌ی کامل با صدا — موسیقی و افکت‌ها زنده ساخته می‌شوند
      </div>

      {shop && <RelicShop onClose={() => setShop(false)} />}
      {codex && <Codex onClose={() => setCodex(false)} />}
    </div>
  );
}

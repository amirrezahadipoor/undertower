import { useEffect, useRef, useState } from 'react';
import { BookOpen, Heart, Home, MapPin, Pause, Play, ScanSearch, Volume2, VolumeX } from 'lucide-react';
import GameCanvas from '../game/GameCanvas';
import Dialogue from '../components/Dialogue';
import GameOver from '../components/GameOver';
import RelicShop from '../components/RelicShop';
import Codex from '../components/Codex';
import EventCard from '../components/EventCard';
import PetPanel from '../components/PetPanel';
import Ending from '../components/Ending';
import MobileDock from '../components/MobileDock';
import { BottomPanel, Toasts, TopBar, WaveBanner, fa } from '../components/Hud';
import { audio } from '../game/audio';
import { ACTS, BOSS_NAMES, ECON } from '../game/config';
import {
  applyEventEffect,
  castSpell,
  collectHud,
  createGameWithPet,
  cycleTargetMode,
  deselect,
  sellSelected,
  setPet,
  startWave,
  tryPlace,
  upgradeSelected,
} from '../game/engine';
import type { Game, GameEvent } from '../game/engine';
import { addShards, bumpMercy, getMercy, relicMods, shardsEarned, unlockAchievement } from '../game/meta';
import { rollEvent } from '../game/modifiers';
import type { RandomEvent } from '../game/modifiers';
import { PETS, petForWave, unlockPet } from '../game/pets';
import {
  CYCLE_START,
  ENDING_LABELS,
  FIRST_LEAK,
  INTRO,
  KING_FALLS,
  LOW_LIVES,
  PET_JOIN,
  POST,
  PRE,
  PRE40_MERCY,
  QUIPS,
  bossChoiceFor,
} from '../game/story';
import type { ScriptLine } from '../game/story';
import { bossVariantOf, bossTier, isBossWave, isFinalWave } from '../game/waves';
import type { HudInfo, PetKind, Sel, TowerKind } from '../game/types';

interface Props {
  onRetry: () => void;
  onExit: () => void;
}

interface OverStats {
  wave: number;
  kills: number;
  earned: number;
  timeSec: number;
  best: number;
  isRecord: boolean;
  shards: number;
}

interface DialogState {
  lines: ScriptLine[];
  choices?: [string, string];
  onChoice?: (i: number) => void;
}

export default function GameShell({ onRetry, onExit }: Props) {
  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) gameRef.current = createGameWithPet(relicMods());
  const game = gameRef.current;

  const [hud, setHud] = useState<HudInfo>(() => collectHud(game));
  const [sel, setSel] = useState<Sel>({ type: 'none' });
  const [dialog, setDialog] = useState<DialogState | null>({ lines: INTRO });
  const [banner, setBanner] = useState<{ text: string; sub?: string; tone: 'normal' | 'boss' } | null>(null);
  const [chapter, setChapter] = useState<(typeof ACTS)[number] | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [overStats, setOverStats] = useState<OverStats | null>(null);
  const [showShop, setShowShop] = useState(false);
  const [showCodex, setShowCodex] = useState(false);
  const [showPets, setShowPets] = useState(false);
  const [event, setEvent] = useState<RandomEvent | null>(null);
  const [pendingEvent, setPendingEvent] = useState<RandomEvent | null>(null);
  const [ending, setEnding] = useState<'dawn' | 'throne' | null>(null);
  const [muted, setMuted] = useState(audio.muted);
  const [manualPaused, setManualPaused] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  const [livesKey, setLivesKey] = useState(0);
  const [zoomed, setZoomed] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 650px) and (orientation: portrait)').matches,
  );
  const boardViewport = useRef<HTMLDivElement>(null);

  const seenRef = useRef(new Set<string>());
  const eventSeen = useRef(new Set<string>());
  const dialogQueue = useRef<DialogState[]>([]);
  const activeDialog = useRef<DialogState | null>(dialog);
  const endingArmed = useRef(false);
  const pendingBossChoice = useRef(false);
  const resolvingChoice = useRef(false);
  const pendingStart = useRef(false);
  const toastId = useRef(0);
  const startTime = useRef(performance.now());
  const soulsSaved = useRef(false);

  const toast = (text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  };

  const enqueueDialog = (d: DialogState) => {
    if (activeDialog.current) {
      dialogQueue.current.push(d);
    } else {
      activeDialog.current = d;
      setDialog(d);
    }
  };

  const checkAch = (id?: string) => {
    if (!id) return;
    const ach = unlockAchievement(id);
    if (ach) {
      audio.apex();
      toast(`مدالِ افتخار: ${ach.name} (+${fa(ach.reward)} خرده‌خاطره)`);
    }
  };

  const saveBest = (w: number) => {
    const cur = Number(localStorage.getItem('et_best') ?? 0);
    if (w > cur) localStorage.setItem('et_best', String(w));
  };

  const saveSouls = () => {
    if (soulsSaved.current) return;
    soulsSaved.current = true;
    const cur = Number(localStorage.getItem('et_souls') ?? 0);
    localStorage.setItem('et_souls', String(cur + game.kills));
  };

  useEffect(() => {
    game.paused =
      dialog !== null || overStats !== null || manualPaused || chapter !== null || showCodex || showPets || event !== null || ending !== null;
  }, [dialog, overStats, manualPaused, chapter, showCodex, showPets, event, ending, game]);

  useEffect(() => {
    audio.music('combat');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (dialog || chapter || event || ending || overStats || !pendingEvent) return;
    const timer = window.setTimeout(() => {
      if (activeDialog.current) return;
      setEvent(pendingEvent);
      setPendingEvent(null);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [dialog, chapter, event, ending, overStats, pendingEvent]);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 2500);
    return () => window.clearTimeout(t);
  }, [banner]);

  useEffect(() => {
    if (!chapter) return;
    const t = window.setTimeout(() => setChapter(null), 4200);
    return () => window.clearTimeout(t);
  }, [chapter]);

  const closeDialog = (choice: number) => {
    audio.ui();
    const current = activeDialog.current;
    if (current?.choices && current.onChoice) {
      const cb = current.onChoice;
      resolvingChoice.current = true;
      activeDialog.current = null;
      setDialog(null);
      window.setTimeout(() => {
        try { cb(choice); } finally { resolvingChoice.current = false; }
      }, 30);
      return;
    }
    const nextInQueue = dialogQueue.current.shift() ?? null;
    activeDialog.current = nextInQueue;
    setDialog(nextInQueue);
    if (!nextInQueue && pendingStart.current) {
      pendingStart.current = false;
      launchWave();
    }
  };

  const openScene = (key: string, lines: ScriptLine[]) => {
    if (seenRef.current.has(key)) return;
    seenRef.current.add(key);
    enqueueDialog({ lines });
  };

  const grantPet = (wave: number) => {
    const k = petForWave(wave);
    if (!k) return;
    const fresh = unlockPet(k);
    if (fresh) {
      const scene = PET_JOIN[k];
      if (scene) enqueueDialog({ lines: scene });
      toast(`همراهِ تازه: ${PETS[k].name} — ${PETS[k].title}`);
      if (!game.pet) setPet(game, k);
    }
  };

  const handleEvent = (e: GameEvent) => {
    switch (e.type) {
      case 'waveStart':
        if (!isBossWave(e.wave ?? 0)) setBanner({ text: `موج ${fa(e.wave ?? 0)}`, tone: 'normal' });
        break;
      case 'bossSpawn': {
        const v = bossVariantOf(bossTier(e.wave ?? 10));
        setBanner({ text: v === 'king' ? 'پادشاهِ خاموشی' : BOSS_NAMES[v], sub: v === 'king' ? 'تاج را بردار' : 'پادشاهِ خاموشی خندید', tone: 'boss' });
        audio.music('boss');
        break;
      }
      case 'kingPhase':
        setBanner({ text: `مرحلهٔ ${fa(e.phase ?? 2)}`, sub: e.phase === 3 ? 'تاجِ من...' : 'برخیزید!', tone: 'boss' });
        break;
      case 'actChange': {
        const theme = ACTS[(e.act ?? 1) - 1];
        setChapter(theme);
        audio.chapter();
        break;
      }
      case 'achCheck':
        checkAch(e.achId);
        break;
      case 'petLevel':
        if (game.pet) toast(`${PETS[game.pet.kind].name} به سطح ${fa(e.level ?? 1)} رسید`);
        break;
      case 'kingDown': {
        addShards(12);
        audio.shard();
        toast('+۱۲ خرده‌خاطره — پادشاه فرو افتاد');
        if (isFinalWave(e.wave ?? 60) && (e.wave ?? 60) === 60) {
          endingArmed.current = true;
          setBanner({ text: 'تاج شکست', sub: 'دربارش را تمام کن', tone: 'boss' });
        } else {
          window.setTimeout(() => toast('پادشاه بازمی‌گردد. چرخه ادامه دارد.'), 1000);
        }
        break;
      }
      case 'bossDown': {
        const tier = e.tier ?? 1;
        pendingBossChoice.current = true;
        addShards(3);
        audio.shard();
        toast(`+۳ خرده‌خاطره — ${fa(tier)}اُمین باس`);
        const scene = bossChoiceFor(tier);
        window.setTimeout(() => {
          enqueueDialog({
            lines: scene.intro,
            choices: scene.labels,
            onChoice: (i) => {
              if (i === 0) {
                const g = 140 * tier;
                game.gold += g;
                game.earned += g;
                toast(`+${fa(g)} طلا — قلب بی‌قرار شد`);
                enqueueDialog({ lines: scene.a });
              } else {
                const s = 4 + tier;
                addShards(s);
                const m = bumpMercy();
                if (m >= 3) checkAch('mercy3');
                audio.shard();
                toast(`+${fa(s)} خرده‌خاطره — روح آزاد شد`);
                enqueueDialog({ lines: scene.b });
              }
            },
          });
          pendingBossChoice.current = false;
        }, 1400);
        break;
      }
      case 'waveClear': {
        audio.music('combat');
        const w = e.wave ?? 0;
        saveBest(w);
        if (w === 10) checkAch('wave10');
        if (w === 20) checkAch('wave20');
        if (w === 30) checkAch('wave30');
        if (w === 50) checkAch('wave50');
        if (isBossWave(w)) grantPet(((w - 1) % 60) + 1);
        const total = (e.bonus ?? 0) + (e.interest ?? 0);
        toast(`+${fa(total)} طلا — پاداش و سود`);
        if (w % 5 === 0) toast('قلب جانِ تازه‌ای گرفت');
        if (w === 60 && endingArmed.current) {
          endingArmed.current = false;
          audio.music('menu');
          window.setTimeout(() => {
            enqueueDialog({
              lines: KING_FALLS,
              choices: ENDING_LABELS,
              onChoice: (i) => {
                checkAch(i === 0 ? 'dawn' : 'throne');
                setEnding(i === 0 ? 'dawn' : 'throne');
              },
            });
          }, 900);
          break;
        }
        if (w % 60 === 0 && !game.endingPending) openScene(`cycle${w}`, CYCLE_START);
        const post = POST[w];
        if (post) openScene(`post${w}`, post);
        else if (!isBossWave(w)) {
          const ev = rollEvent(w, eventSeen.current);
          if (ev) {
            eventSeen.current.add(ev.id);
            setPendingEvent(ev);
          }
        }
        break;
      }
      case 'leak':
        setLivesKey((k) => k + 1);
        break;
      case 'firstLeak':
        setLivesKey((k) => k + 1);
        openScene('firstLeak', FIRST_LEAK);
        break;
      case 'lowLives':
        openScene('lowLives', LOW_LIVES);
        break;
      case 'gameover': {
        saveBest(e.wave ?? 0);
        saveSouls();
        const shards = shardsEarned(e.wave ?? 1);
        addShards(shards);
        audio.music(null);
        const kills = game.kills;
        const earned = game.earned;
        const wave = e.wave ?? 0;
        const prevBest = Number(localStorage.getItem('et_best') ?? 0);
        window.setTimeout(() => {
          setOverStats({
            wave,
            kills,
            earned,
            timeSec: (performance.now() - startTime.current) / 1000,
            best: Math.max(prevBest, wave),
            isRecord: wave > 0 && wave >= prevBest,
            shards,
          });
        }, 1900);
        break;
      }
    }
  };

  const requestStart = () => {
    if (game.phase !== 'build' || overStats || dialog || dialogQueue.current.length || resolvingChoice.current || pendingBossChoice.current || ending || event || pendingEvent || manualPaused || chapter) return;
    const next = game.wave + 1;
    let pre = next <= 60 ? PRE[next] : undefined;
    if (next === 40 && getMercy() > 0) pre = PRE40_MERCY;
    if (pre && !seenRef.current.has(`pre${next}`)) {
      seenRef.current.add(`pre${next}`);
      pendingStart.current = true;
      enqueueDialog({ lines: pre });
      return;
    }
    launchWave();
  };

  const launchWave = () => {
    const next = game.wave + 1;
    if (!startWave(game)) return;
    const risk = ECON.earlyBonus(((next - 1) % 60) + 1);
    game.gold += risk;
    game.earned += risk;
    setHud(collectHud(game));
    if (next >= 3 && Math.random() < 0.28) toast(`نیبو: ${QUIPS[Math.floor(Math.random() * QUIPS.length)]}`);
  };

  const locked = dialog !== null || overStats !== null || chapter !== null || showCodex || showPets || event !== null || ending !== null;

  const chooseEvent = (i: number) => {
    if (!event) return;
    const c = event.choices[i];
    const msg = applyEventEffect(game, c.effect, c.value);
    setEvent(null);
    setHud(collectHud(game));
    toast(`${event.title}: ${msg}`);
  };

  const pickPet = (k: PetKind) => {
    setPet(game, k);
    setShowPets(false);
    setHud(collectHud(game));
  };

  const exitToMenu = () => {
    saveBest(game.wave);
    saveSouls();
    audio.music(null);
    onExit();
  };

  return (
    <div className="game-shell flex h-dvh w-full select-none flex-col overflow-hidden bg-[#04050c]">
      <TopBar
        hud={hud}
        muted={muted}
        livesKey={livesKey}
        locked={locked || exitConfirm}
        onSpeed={(s) => {
          game.speed = s;
          audio.ui();
        }}
        onTogglePause={() => {
          setManualPaused((p) => !p);
          audio.ui();
        }}
        onToggleMute={() => setMuted(audio.toggleMute())}
        onExit={() => {
          setManualPaused(true);
          setExitConfirm(true);
        }}
        onPet={() => {
          audio.ui();
          setShowPets(true);
        }}
      />

      <main className="relative z-10 min-h-0 flex-1 overflow-hidden">
        <div ref={boardViewport} className="battle-viewport" dir="ltr" aria-label="میدان نبرد؛ روی زمین بزن و با کشیدن انگشت در نقشه حرکت کن">
          <div className={`battle-board relative ${zoomed ? 'battle-board-zoomed' : ''}`}>
            <GameCanvas game={game} inputLocked={locked || exitConfirm} onHud={setHud} onEvent={handleEvent} onSel={setSel} />
            <div className="scanlines absolute inset-0 rounded-lg" />
            <div className="vignette absolute inset-0 rounded-lg" />
            {banner && <WaveBanner text={banner.text} sub={banner.sub} tone={banner.tone} />}
          </div>
        </div>

        <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1 rounded-xl border border-white/15 bg-[#08101d]/90 p-1 shadow-xl backdrop-blur-lg lg:hidden">
          <button
            type="button"
            onClick={() => {
              setZoomed((v) => !v);
              boardViewport.current?.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
            }}
            aria-label={zoomed ? 'نمای کل نقشه' : 'بزرگ نمایی نقشه'}
            className="mobile-touch flex items-center gap-1 rounded-lg px-2 text-[10px] font-bold text-cyan-100 active:bg-white/10"
          >
            <ScanSearch size={17} />{zoomed ? 'نمای کل' : 'بزرگ نمایی'}
          </button>
          <span className="h-5 w-px bg-white/15" />
          <button
            type="button"
            onClick={() => boardViewport.current?.scrollTo({ left: 0, top: 0, behavior: 'smooth' })}
            aria-label="رفتن به ورودی دشمنان"
            className="mobile-touch flex items-center gap-1 rounded-lg px-2 text-[10px] font-bold text-violet-200 active:bg-white/10"
          >
            <MapPin size={15} />ورودی
          </button>
          <button
            type="button"
            onClick={() => boardViewport.current?.scrollTo({ left: boardViewport.current.scrollWidth, top: boardViewport.current.scrollHeight, behavior: 'smooth' })}
            aria-label="رفتن به قلب دژ"
            className="mobile-touch flex items-center gap-1 rounded-lg px-2 text-[10px] font-bold text-rose-200 active:bg-white/10"
          >
            <Heart size={15} />قلب
          </button>
        </div>

        <Toasts items={toasts} />

        {manualPaused && !locked && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-[#04050c]/90 p-4 backdrop-blur-sm">
            <Pause size={34} className="shrink-0 text-cyan-300" />
            <div className="text-xl font-black text-slate-100">{exitConfirm ? 'از این دور خارج می شوی؟' : 'بازی متوقف شد'}</div>
            <p className="text-center text-xs text-slate-400">
              {exitConfirm ? 'رکورد و پیشرفت همراهان ذخیره می شود؛ چیدمان این دور از دست می رود.' : 'هر زمان آماده بودی، دفاع را ادامه بده.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button onClick={() => { setExitConfirm(false); setManualPaused(false); }} className="mobile-touch flex items-center gap-2 rounded-lg border border-cyan-300/60 bg-cyan-400/15 px-5 font-bold text-cyan-100 transition hover:bg-cyan-400/25">
                <Play size={16} />
                ادامهٔ دفاع
              </button>
              {!exitConfirm ? (
                <>
                  <button onClick={() => setShowCodex(true)} className="mobile-touch flex items-center gap-2 rounded-lg border border-violet-400/60 bg-violet-500/15 px-4 text-sm font-bold text-violet-100 transition hover:bg-violet-500/30">
                    <BookOpen size={16} />راهنما
                  </button>
                  <button onClick={() => setMuted(audio.toggleMute())} className="mobile-touch flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 text-sm font-bold text-slate-200 lg:hidden">
                    {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}{muted ? 'روشن کردن صدا' : 'قطع صدا'}
                  </button>
                  <button onClick={() => setExitConfirm(true)} className="mobile-touch flex items-center gap-2 rounded-lg border border-rose-400/35 px-4 text-sm font-bold text-rose-200 lg:hidden">
                    <Home size={17} />منو
                  </button>
                </>
              ) : (
                <button onClick={exitToMenu} className="mobile-touch flex items-center gap-2 rounded-lg border border-rose-400/70 bg-rose-500/20 px-5 text-sm font-black text-rose-100">
                  <Home size={17} />تایید خروج
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      <div className="hidden lg:block">
        <BottomPanel
          hud={hud}
          sel={sel}
          locked={locked || exitConfirm}
          onBuild={(k: TowerKind) => tryPlace(game, k)}
          onUpgrade={() => upgradeSelected(game)}
          onSell={() => sellSelected(game)}
          onCycleTarget={() => cycleTargetMode(game)}
          onDeselect={() => deselect(game)}
          onStartWave={requestStart}
          onCast={(id) => castSpell(game, id)}
          onCodex={() => setShowCodex(true)}
        />
      </div>
      <MobileDock
        hud={hud}
        sel={sel}
        locked={locked || exitConfirm}
        onBuild={(k) => tryPlace(game, k)}
        onUpgrade={() => upgradeSelected(game)}
        onSell={() => sellSelected(game)}
        onCycleTarget={() => cycleTargetMode(game)}
        onDeselect={() => deselect(game)}
        onStartWave={requestStart}
        onCast={(id) => castSpell(game, id)}
        onCodex={() => setShowCodex(true)}
      />

      {dialog && !chapter && <Dialogue lines={dialog.lines} choices={dialog.choices} onDone={closeDialog} />}

      {chapter && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden bg-black">
          <img src={chapter.img} alt="" className="absolute inset-0 h-full w-full object-cover opacity-0" style={{ animation: 'actFade 4.2s ease both' }} draggable={false} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#000_85%)]" />
          <button
            type="button"
            onClick={() => setChapter(null)}
            aria-label="رد کردن میان پرده فصل"
            className="mobile-touch absolute left-4 top-4 z-10 rounded-lg border border-white/30 bg-black/65 px-4 text-xs font-bold text-slate-100"
          >
            رد کردن
          </button>
          <div className="relative flex flex-col items-center gap-3 text-center">
            <span className="font-pixel ltr text-[10px] tracking-[0.6em] text-slate-400" style={{ animation: 'kfBanner 4.2s ease both' }}>
              CHAPTER {['I', 'II', 'III', 'IV', 'V', 'VI'][chapter.act - 1]}
            </span>
            <h2 className="text-4xl font-black text-slate-50 sm:text-6xl" style={{ textShadow: '0 0 50px rgba(103,232,249,0.4), 0 6px 0 #000', animation: 'kfBanner 4.2s ease both' }}>
              {chapter.title}
            </h2>
            <p className="text-base font-bold text-slate-300 sm:text-lg" style={{ animation: 'kfBanner 4.2s ease both' }}>{chapter.sub}</p>
          </div>
        </div>
      )}

      {overStats && (
        <GameOver
          wave={overStats.wave}
          kills={overStats.kills}
          earned={overStats.earned}
          timeSec={overStats.timeSec}
          best={overStats.best}
          isRecord={overStats.isRecord}
          shards={overStats.shards}
          onRetry={onRetry}
          onMenu={() => {
            audio.music(null);
            onExit();
          }}
          onShop={() => setShowShop(true)}
        />
      )}

      {ending && (
        <Ending
          kind={ending}
          wave={game.wave}
          kills={game.kills}
          timeSec={(performance.now() - startTime.current) / 1000}
          onContinue={() => {
            game.endingPending = false;
            localStorage.setItem('et_ending', ending);
            setEnding(null);
            audio.music('combat');
            openScene('cycleIntro', CYCLE_START);
          }}
          onMenu={() => {
            localStorage.setItem('et_ending', ending);
            saveBest(game.wave);
            saveSouls();
            addShards(shardsEarned(game.wave));
            audio.music(null);
            onExit();
          }}
        />
      )}

      {showShop && <RelicShop onClose={() => setShowShop(false)} />}
      {showCodex && <Codex onClose={() => setShowCodex(false)} />}
      {showPets && <PetPanel canSwitch={game.phase === 'build'} onPick={pickPet} onClose={() => setShowPets(false)} />}
      {event && <EventCard event={event} gold={hud.gold} lives={hud.lives} onChoose={chooseEvent} />}
    </div>
  );
}

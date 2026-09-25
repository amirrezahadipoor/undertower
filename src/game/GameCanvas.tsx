import { useEffect, useRef } from 'react';
import { COLS, KINDS, ROWS, TILE, W, H } from './config';
import { bakeBackground, drawScene } from './render';
import {
  castSpell,
  collectHud,
  cycleTargetMode,
  deselect,
  selectTile,
  selectionSummary,
  sellSelected,
  tryCollectCrystalAt,
  tryPlace,
  update,
  upgradeSelected,
} from './engine';
import type { Game, GameEvent } from './engine';
import type { HudInfo, Sel, SpellId } from './types';

interface Props {
  game: Game;
  inputLocked: boolean;
  onHud: (h: HudInfo) => void;
  onEvent: (e: GameEvent) => void;
  onSel: (s: Sel) => void;
}

const SPELL_KEYS: Record<string, SpellId> = { q: 'pulse', w: 'frost', e: 'tear' };

export default function GameCanvas({ game, inputLocked, onHud, onEvent, onSel }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const lockedRef = useRef(inputLocked);
  lockedRef.current = inputLocked;
  const cbRef = useRef({ onHud, onEvent, onSel });
  cbRef.current = { onHud, onEvent, onSel };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.matchMedia('(max-width: 1023px)').matches ? 1.5 : 2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let bg = bakeBackground(game.map, game.act);
    let bakedAct = game.act;

    let raf = 0;
    let last = performance.now();
    let hudTimer = 0;
    let lastSelKey = '';

    const selKey = (s: Sel) =>
      s.type === 'none'
        ? 'none'
        : s.type === 'tile'
          ? `tile:${s.tx},${s.ty}`
          : `tower:${s.id}:${s.level}:${s.ascend}:${s.invested}:${s.kills}:${s.targetMode}:${Math.round(s.dmg)}:${Math.round(s.range)}:${s.synergies.join(',')}`;

    const pushSel = () => {
      const s = selectionSummary(game);
      const k = selKey(s);
      if (k !== lastSelKey) {
        lastSelKey = k;
        cbRef.current.onSel(s);
      }
    };

    // A drawing or simulation error must never be fatal: if the exception escaped
    // this callback, `requestAnimationFrame(frame)` below would never run again and
    // the game would freeze permanently. Report it and keep the loop alive.
    let consecutiveErrors = 0;
    const onFrameError = (where: string, err: unknown) => {
      consecutiveErrors++;
      if (import.meta.env.DEV || consecutiveErrors <= 3) {
        console.error(`[frame:${where}]`, err);
      }
    };

    const frame = (now: number) => {
      try {
        const dt = (now - last) / 1000;
        last = now;
        if (!game.paused) update(game, dt);
        if (game.act !== bakedAct) {
          bakedAct = game.act;
          bg = bakeBackground(game.map, game.act);
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = true;
        drawScene(ctx, game, bg);

        if (game.events.length) {
          const evs = game.events.splice(0, game.events.length);
          for (const e of evs) cbRef.current.onEvent(e);
          cbRef.current.onHud(collectHud(game));
          hudTimer = 0;
        }
        hudTimer += dt;
        if (hudTimer > 0.12) {
          hudTimer = 0;
          cbRef.current.onHud(collectHud(game));
        }
        pushSel();
        consecutiveErrors = 0;
      } catch (err) {
        onFrameError('frame', err);
        // Drop transient render state so a poisoned projectile/particle cannot
        // throw on every subsequent frame forever.
        try {
          game.particles.length = 0;
          game.projectiles.length = 0;
          game.bolts.length = 0;
          game.texts.length = 0;
        } catch {
          /* ignore */
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const toWorld = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const sx = rect.width / W;
      const x = (clientX - rect.left) / sx;
      const y = (clientY - rect.top) / sx;
      return { x, y, tx: Math.floor(x / TILE), ty: Math.floor(y / TILE) };
    };

    let press: { id: number; x: number; y: number; moved: boolean } | null = null;
    const onDown = (e: PointerEvent) => {
      if (lockedRef.current || !e.isPrimary) return;
      if (e.button === 2) {
        deselect(game);
        return;
      }
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    };
    const onUp = (e: PointerEvent) => {
      if (lockedRef.current || !press || press.id !== e.pointerId) return;
      const wasDrag = press.moved || Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10;
      press = null;
      if (wasDrag) return;
      const { x, y, tx, ty } = toWorld(e.clientX, e.clientY);
      if (tryCollectCrystalAt(game, x, y, e.pointerType === 'touch' ? 40 : 28)) return;
      if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return;
      selectTile(game, tx, ty);
    };
    const onMove = (e: PointerEvent) => {
      if (lockedRef.current) return;
      if (press && press.id === e.pointerId && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) {
        press.moved = true;
      }
      if (e.pointerType === 'touch') return;
      const { x, y, tx, ty } = toWorld(e.clientX, e.clientY);
      tryCollectCrystalAt(game, x, y, 24);
      if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) game.hover = null;
      else game.hover = { tx, ty };
    };
    const onCancel = () => { press = null; };
    const onLeave = () => {
      game.hover = null;
    };
    const onCtx = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      if (lockedRef.current || game.phase === 'over') return;
      const key = e.key.toLowerCase();
      if (key in SPELL_KEYS) {
        castSpell(game, SPELL_KEYS[key]);
      } else if (e.key >= '1' && e.key <= '6') {
        tryPlace(game, KINDS[Number(e.key) - 1]);
      } else if (key === 'u') {
        upgradeSelected(game);
      } else if (key === 's') {
        sellSelected(game);
      } else if (key === 't') {
        cycleTargetMode(game);
      } else if (e.key === 'Escape') {
        deselect(game);
      }
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('contextmenu', onCtx);
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('contextmenu', onCtx);
      window.removeEventListener('keydown', onKey);
    };
  }, [game]);

  return <canvas ref={ref} className="h-auto w-full cursor-crosshair rounded-lg" style={{ aspectRatio: `${W}/${H}` }} />;
}

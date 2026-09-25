import { useEffect, useRef } from 'react';
import { paintEnemyPortrait, paintPetPortrait, paintTowerPortrait } from '../game/render';
import type { EnemyKind, PetKind, TowerKind } from '../game/types';

export function PetPortrait({ kind, level, size = 56, className }: { kind: PetKind; level: number; size?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      paintPetPortrait(ctx, kind, level, size, size, (now - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [kind, level, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} className={className} />;
}

interface TProps {
  kind: TowerKind;
  level: number;
  size?: number;
  animate?: boolean;
  className?: string;
}

export function TowerPortrait({ kind, level, size = 56, animate = true, className }: TProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!animate) {
      paintTowerPortrait(ctx, kind, level, size, size, 1.1);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      paintTowerPortrait(ctx, kind, level, size, size, (now - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [kind, level, size, animate]);
  return <canvas ref={ref} style={{ width: size, height: size }} className={className} />;
}

export function EnemyPortrait({ kind, size = 64, className }: { kind: EnemyKind; size?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      paintEnemyPortrait(ctx, kind, size, size, (now - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [kind, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} className={className} />;
}

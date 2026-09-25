import { safeR } from './renderSafe';
import { ACTS, COLS, ENEMIES, H, ROWS, SYNERGIES, SYNERGY_DIST, TILE, TOWERS, W, posAt, tileCenter, tileKey } from './config';
import type { ActTheme, Enemy, EnemyKind, MapData, PetKind, Tower, TowerKind } from './types';
import { effTowerStats, makePet, type Game as G } from './engine';
import { drawEnemyNew, drawPet } from './renderEnemies';

/* ── helpers ───────────────────────────────────────────────── */

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexA(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** deterministic flicker without state */
const flick = (t: number, s: number) => 0.5 + 0.5 * Math.sin(t * 9.3 + s) * Math.sin(t * 4.1 + s * 2.3);

function lightPool(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, hexA(color, a));
  gr.addColorStop(0.55, hexA(color, a * 0.35));
  gr.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = gr;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/** layered flame: base at (0,0), grows upward */
function flame(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, seed: number, hot = '#fff7ed') {
  const f = 1 + Math.sin(t * 11 + seed) * 0.16 + Math.sin(t * 23 + seed) * 0.08;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(0, -h * 0.35, 0, 0, -h * 0.35, h * 1.5);
  glow.addColorStop(0, `rgba(255,214,150,${0.42 * f})`);
  glow.addColorStop(0.45, 'rgba(249,115,22,0.28)');
  glow.addColorStop(1, 'rgba(249,115,22,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-h * 1.5, -h * 1.9, h * 3, h * 3);
  ctx.globalCompositeOperation = 'source-over';
  for (const [ww, hh, col] of [
    [w, h * f, '#ea580c'],
    [w * 0.66, h * 0.78 * f, '#fb923c'],
    [w * 0.34, h * 0.5 * f, hot],
  ] as [number, number, string][]) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-ww, 0);
    ctx.quadraticCurveTo(-ww * 0.55 + Math.sin(t * 7 + seed) * 1.5, -hh * 0.55, Math.sin(t * 5 + seed) * 2, -hh);
    ctx.quadraticCurveTo(ww * 0.6, -hh * 0.5, ww, 0);
    ctx.quadraticCurveTo(0, hh * 0.16, -ww, 0);
    ctx.fill();
  }
  ctx.restore();
}

/* ── baked terrain ─────────────────────────────────────────── */

export function bakeBackground(map: MapData, act: number): HTMLCanvasElement {
  const T: ActTheme = ACTS[Math.min(4, Math.max(1, act)) - 1];
  const S = 2;
  const c = document.createElement('canvas');
  c.width = W * S;
  c.height = H * S;
  const ctx = c.getContext('2d')!;
  ctx.scale(S, S);
  const rng = mulberry32(1379 + act * 77);

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, T.groundA);
  grad.addColorStop(1, T.groundB);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const v = rng();
      ctx.fillStyle = v > 0.5 ? `rgba(148,163,184,${(v - 0.5) * 0.05})` : `rgba(0,0,0,${(0.5 - v) * 0.12})`;
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  }

  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      if (map.pathTiles.has(tileKey(tx, ty))) continue;
      const r = rng();
      const cx = tx * TILE + TILE / 2;
      const cy = ty * TILE + TILE / 2;
      if (r < 0.1) {
        ctx.strokeStyle = act === 2 ? 'rgba(120,60,80,0.5)' : 'rgba(52,116,88,0.45)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          const ox = (rng() - 0.5) * 40;
          const oy = (rng() - 0.5) * 40;
          ctx.beginPath();
          ctx.moveTo(cx + ox, cy + oy);
          ctx.quadraticCurveTo(cx + ox + 3, cy + oy - 7, cx + ox + (rng() - 0.5) * 8, cy + oy - 11);
          ctx.stroke();
        }
      } else if (r < 0.16) {
        ctx.fillStyle = 'rgba(100,116,139,0.3)';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(cx + (rng() - 0.5) * 44, cy + (rng() - 0.5) * 44, rng() * 3 + 1.5, rng() * 2 + 1, rng() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (r < 0.185 && tx > 0 && ty > 0 && tx < COLS - 1 && ty < ROWS - 1) {
        ctx.strokeStyle = hexA(T.spore, 0.18);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, 7, rng() * 3, rng() * 3 + 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy + 3);
        ctx.lineTo(cx + 4, cy - 4);
        ctx.stroke();
      } else if (r < 0.205) {
        const gx = cx + (rng() - 0.5) * 40;
        const gy = cy + (rng() - 0.5) * 40;
        const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, 12);
        glow.addColorStop(0, hexA(T.spore, 0.5));
        glow.addColorStop(1, hexA(T.spore, 0));
        ctx.fillStyle = glow;
        ctx.fillRect(gx - 12, gy - 12, 24, 24);
        ctx.fillStyle = T.spore;
        ctx.beginPath();
        ctx.arc(gx, gy, 1.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (r < 0.215 && act === 3) {
        ctx.fillStyle = 'rgba(180,160,140,0.25)';
        for (let i = 0; i < 5; i++) ctx.fillRect(cx + (rng() - 0.5) * 50, cy + (rng() - 0.5) * 50, 2, 2);
      } else if (r < 0.215 && act === 4) {
        ctx.strokeStyle = 'rgba(216,180,254,0.14)';
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy + 6);
        ctx.lineTo(cx, cy - 8);
        ctx.lineTo(cx + 8, cy + 6);
        ctx.stroke();
      }
    }
  }

  for (let i = 0; i < 30; i++) {
    const edge = i % 4;
    const cx = edge === 0 ? rng() * W : edge === 1 ? rng() * W : edge === 2 ? rng() * 26 + 4 : W - rng() * 26 - 4;
    const cy = edge === 0 ? rng() * 26 + 4 : edge === 1 ? H - rng() * 26 - 4 : rng() * H;
    if (map.pathTiles.has(tileKey(Math.floor(cx / TILE), Math.floor(cy / TILE)))) continue;
    const n = 2 + Math.floor(rng() * 2);
    for (let k = 0; k < n; k++) {
      const h = 8 + rng() * 14;
      const x = cx + (rng() - 0.5) * 16;
      const y = cy + (rng() - 0.5) * 10;
      ctx.fillStyle = T.crystal;
      ctx.beginPath();
      ctx.moveTo(x - 4, y);
      ctx.lineTo(x, y - h);
      ctx.lineTo(x + 4, y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = hexA(T.spore, 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y - h);
      ctx.lineTo(x + 2, y - 2);
      ctx.stroke();
    }
  }

  map.pathTiles.forEach((key) => {
    const [tx, ty] = key.split(',').map(Number);
    const x = tx * TILE;
    const y = ty * TILE;
    ctx.fillStyle = T.path;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.strokeStyle = 'rgba(2,6,17,0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
    for (let i = 0; i < 4; i++) {
      const px = x + 10 + rng() * (TILE - 20);
      const py = y + 10 + rng() * (TILE - 20);
      ctx.fillStyle = `rgba(66,76,120,${0.1 + rng() * 0.14})`;
      ctx.beginPath();
      ctx.ellipse(px, py, 5 + rng() * 6, 4 + rng() * 4, rng() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(${T.glow},0.1)`;
  ctx.lineWidth = 30;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  map.wps.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();

  const ent = map.wps[0];
  const portal = ctx.createRadialGradient(6, ent.y, 0, 6, ent.y, 60);
  portal.addColorStop(0, 'rgba(139,92,246,0.6)');
  portal.addColorStop(1, 'rgba(139,92,246,0)');
  ctx.fillStyle = portal;
  ctx.fillRect(-54, ent.y - 60, 120, 120);
  ctx.strokeStyle = '#2e1d5e';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(6, ent.y, 26, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(192,132,252,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(6, ent.y, 26, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(148,163,184,0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(map.coreX, map.coreY, 44, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = hexA(T.spore, 0.25);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(map.coreX, map.coreY, 36, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rng() * 0.03})`;
    ctx.fillRect(rng() * W, rng() * H, 1, 1);
  }

  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.95);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  return c;
}

/* ── heart ─────────────────────────────────────────────────── */
function heartPath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.75);
  ctx.bezierCurveTo(x - s * 1.05, y + s * 0.05, x - s * 0.62, y - s * 0.82, x, y - s * 0.28);
  ctx.bezierCurveTo(x + s * 0.62, y - s * 0.82, x + s * 1.05, y + s * 0.05, x, y + s * 0.75);
  ctx.closePath();
}

function drawCore(ctx: CanvasRenderingContext2D, g: G) {
  const { coreX: x, coreY: y } = g.map;
  const t = g.time;
  const beat = Math.pow(Math.abs(Math.sin(t * 1.9)), 6) * 0.14;
  const s = 15 * (1 + beat);
  const danger = g.lives <= 6 ? (6 - g.lives) / 6 : 0;
  const awake = g.act >= 3;

  lightPool(ctx, x, y, 60 + Math.sin(t * 2.2) * 8 + (awake ? 14 : 0), danger > 0 ? '#f87171' : '#67e8f9', 0.34 + danger * 0.2);

  for (let i = 0; i < 3 + (awake ? 2 : 0); i++) {
    const a = t * 0.9 + (i * Math.PI * 2) / (3 + (awake ? 2 : 0));
    ctx.save();
    ctx.translate(x + Math.cos(a) * 30, y + Math.sin(a) * 22);
    ctx.rotate(a * 2);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(-3, -5, 6, 10);
    ctx.restore();
  }

  const hg = ctx.createLinearGradient(x, y - s, x, y + s);
  hg.addColorStop(0, '#ecfeff');
  hg.addColorStop(0.5, danger > 0 ? '#fca5a5' : '#22d3ee');
  hg.addColorStop(1, danger > 0 ? '#be123c' : '#0e7490');
  heartPath(ctx, x, y, s);
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  if (awake) {
    const blink = Math.abs(Math.sin(t * 0.7)) > 0.94 ? 0.15 : 1;
    ctx.fillStyle = '#042f2e';
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.05, s * 0.42, s * 0.42 * blink, 0, 0, Math.PI * 2);
    ctx.fill();
    if (blink > 0.5) {
      ctx.fillStyle = '#f0fdfa';
      ctx.beginPath();
      ctx.arc(x + Math.sin(t * 0.9) * s * 0.12, y - s * 0.05, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    heartPath(ctx, x - s * 0.25, y - s * 0.25, s * 0.3);
    ctx.fill();
  }
}

/* ── 3D tower kit ──────────────────────────────────────────── */
function gemOrb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, t: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const aura = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
  aura.addColorStop(0, hexA(color, 0.55 + 0.2 * flick(t, x)));
  aura.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.28, color);
  g.addColorStop(1, '#0b1020');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.28, y - r * 0.32, r * 0.28, r * 0.16, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = hexA(color, 0.7);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function metalTube(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, half: number, tint: string) {
  const g = ctx.createLinearGradient(x, y - half, x, y + half);
  g.addColorStop(0, '#070a14');
  g.addColorStop(0.18, tint);
  g.addColorStop(0.42, '#f8fafc');
  g.addColorStop(0.58, tint);
  g.addColorStop(1, '#05070f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x, y - half, len, half * 2, Math.min(half * 0.55, 3.2));
  ctx.fill();
  ctx.strokeStyle = 'rgba(8,12,24,0.7)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

function disc3d(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, h: number, topA: string, topB: string, side: string, rim?: string) {
  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.ellipse(x, y + h, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - rx, y);
  ctx.lineTo(x - rx, y + h);
  ctx.ellipse(x, y + h, rx, ry, 0, Math.PI, 0, true);
  ctx.lineTo(x + rx, y);
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.4, 1, x, y, rx);
  g.addColorStop(0, topA);
  g.addColorStop(1, topB);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  if (rim) {
    ctx.strokeStyle = rim;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
}

function drawPlinth(ctx: CanvasRenderingContext2D, lvl: number, color: string, apex: boolean, t: number) {
  const R = 16 + lvl * 2.6;
  lightPool(ctx, 0, 6, R * (2.1 + lvl * 0.45), color, 0.12 + lvl * 0.07);

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 14 + lvl * 1.4, R * 1.25, R * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();

  if (apex) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ctx.save();
      ctx.rotate(a);
      const bg = ctx.createLinearGradient(0, 0, R * 1.4, 8);
      bg.addColorStop(0, '#2a3558');
      bg.addColorStop(1, '#12182c');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(R * 0.4, -6);
      ctx.lineTo(R * 1.42, 8);
      ctx.lineTo(R * 1.18, 12);
      ctx.lineTo(R * 0.4, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = hexA(color, 0.7);
      ctx.fillRect(R * 1.18, 4, 3.2, 6);
      ctx.restore();
    }
  }

  const layers = 2 + lvl;
  let y = 6;
  for (let i = 0; i < layers; i++) {
    const k = 1 - i * 0.11;
    const rx = R * k;
    const ry = rx * 0.52;
    disc3d(ctx, 0, y, rx, ry, 5.2, i === layers - 1 ? '#44507a' : '#334066', i === layers - 1 ? '#1a2340' : '#12192e', '#0d1324', i === layers - 1 ? hexA(color, apex ? 0.95 : 0.55) : hexA(color, 0.22));
    y -= 5.4;
  }

  ctx.strokeStyle = hexA(color, 0.55);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.ellipse(0, y + 5.4, R * (1 - (layers - 1) * 0.11) * 0.62, R * 0.32, 0, 0, Math.PI * 2);
  ctx.stroke();

  if (lvl >= 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA(color, 0.28 + 0.12 * flick(t, 3));
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, y + 5.4, R * 0.42, R * 0.22, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (lvl >= 2) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4 + t * 0.05;
      const px = Math.cos(a) * R * 0.92;
      const py = Math.sin(a) * R * 0.5 + 1;
      disc3d(ctx, px, py - 8, 3.2, 1.8, 8, '#3b486e', '#1b2340', '#0e1426', hexA(color, 0.8));
      gemOrb(ctx, px, py - 11, 2.1, color, t);
    }
  }

  if (apex) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.rotate(t * 0.55);
    for (let i = 0; i < 10; i++) {
      ctx.rotate(Math.PI / 5);
      ctx.fillStyle = hexA(color, 0.45 + 0.4 * flick(t, i));
      ctx.beginPath();
      ctx.moveTo(R * 1.18, -1.4);
      ctx.lineTo(R * 1.42, 0);
      ctx.lineTo(R * 1.18, 1.4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA(color, 0.22 + 0.1 * flick(t, 9));
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 1.38, R * 0.78, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (let i = 0; i <= lvl; i++) {
    ctx.fillStyle = apex && i === lvl ? '#fde047' : color;
    ctx.beginPath();
    ctx.arc(-(lvl * 8) / 2 + i * 8, 17 + lvl * 1.2, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(-(lvl * 8) / 2 + i * 8 - 0.6, 16.4 + lvl * 1.2, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function flashDot(ctx: CanvasRenderingContext2D, flash: number, x: number, y: number, r: number, color: string) {
  if (flash <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = hexA(color, Math.min(1, flash));
  ctx.beginPath();
  ctx.arc(x, y, r * Math.max(0.2, flash), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ── per-kind turret art ───────────────────────────────────── */

function turretDart(ctx: CanvasRenderingContext2D, lvl: number, ang: number, recoil: number, flash: number, t: number) {
  ctx.save();
  ctx.rotate(ang);
  ctx.translate(-recoil * 1.1, 0);
  const barrels = lvl === 0 ? 1 : lvl === 1 ? 2 : lvl === 2 ? 3 : 5;
  const len = 24 + lvl * 5.5;
  disc3d(ctx, 2, 0, 8 + lvl * 0.8, 5.4 + lvl * 0.4, 6, '#3a4a72', '#1a2340', '#0c1224', '#7dd3fc');
  for (let i = 0; i < barrels; i++) {
    const off = barrels === 1 ? 0 : (i - (barrels - 1) / 2) * (5.2 + lvl * 0.55);
    const g = ctx.createLinearGradient(4, off - 2.8, len, off);
    g.addColorStop(0, '#1a2744');
    g.addColorStop(0.5, '#7dd3fc');
    g.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(6, off - 2.5 - lvl * 0.2);
    ctx.lineTo(len, off);
    ctx.lineTo(6, off + 2.5 + lvl * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(186,230,253,0.7)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    if (lvl >= 2) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(len - 1, off, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (lvl >= 3) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.rotate(t * 2.1);
    for (let i = 0; i < 7; i++) {
      ctx.rotate((Math.PI * 2) / 7);
      const ng = ctx.createLinearGradient(10, 0, 20, 0);
      ng.addColorStop(0, 'rgba(125,211,252,0)');
      ng.addColorStop(1, '#e0f2fe');
      ctx.fillStyle = ng;
      ctx.beginPath();
      ctx.moveTo(11, -1.3);
      ctx.lineTo(21, 0);
      ctx.lineTo(11, 1.3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  gemOrb(ctx, 3, -1, 5 + lvl * 0.7, '#7dd3fc', t);
  flashDot(ctx, flash, len, 0, 9 + lvl, '#bae6fd');
  ctx.restore();
}

function turretCannon(ctx: CanvasRenderingContext2D, lvl: number, ang: number, recoil: number, flash: number, t: number) {
  ctx.save();
  ctx.rotate(ang);
  ctx.translate(-recoil * 1.8, 0);
  const barrels = lvl <= 1 ? 1 : lvl === 2 ? 2 : 3;
  const len = 22 + lvl * 6;
  disc3d(ctx, 0, 0, 10 + lvl, 6.5 + lvl * 0.4, 7, '#3a301c', '#1a140c', '#0c0a08', '#fb923c');
  if (lvl >= 3) {
    ctx.fillStyle = '#1a140c';
    ctx.fillRect(-7, -16, 14, 8);
    ctx.fillStyle = '#fb923c';
    ctx.globalAlpha = 0.7 + 0.3 * flick(t, 2);
    ctx.fillRect(-5, -20, 3.5, 5);
    ctx.fillRect(1.5, -20, 3.5, 5);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(-3, -20);
    flame(ctx, 1.8, 7, t, 1);
    ctx.restore();
    ctx.save();
    ctx.translate(3.2, -20);
    flame(ctx, 1.8, 7, t, 2.2);
    ctx.restore();
  }
  for (let i = 0; i < barrels; i++) {
    const off = barrels === 1 ? 0 : (i - (barrels - 1) / 2) * (10 + lvl * 0.4);
    const half = 4.2 + lvl * 0.55;
    metalTube(ctx, 2, off, len, half, '#c2410c');
    for (let b = 0; b <= lvl; b++) {
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(len * (0.32 + b * 0.18), off - half - 1.2, 2.8, half * 2 + 2.4);
    }
    ctx.fillStyle = '#07060a';
    ctx.beginPath();
    ctx.roundRect(len + 1, off - half * 0.7, 4.5, half * 1.4, 1.4);
    ctx.fill();
    ctx.strokeStyle = '#fdba74';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  if (lvl >= 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const hg = ctx.createLinearGradient(len * 0.4, 0, len + 8, 0);
    hg.addColorStop(0, 'rgba(249,115,22,0)');
    hg.addColorStop(1, `rgba(253,186,116,${0.35 + lvl * 0.12 + 0.15 * flick(t, 4)})`);
    ctx.fillStyle = hg;
    ctx.fillRect(len * 0.4, -12, len * 0.8, 24);
    ctx.restore();
  }
  flashDot(ctx, flash, len + 4, 0, 12 + lvl * 2, '#fed7aa');
  ctx.restore();
}

function turretFrost(ctx: CanvasRenderingContext2D, lvl: number, t: number, flash: number, yOff: number) {
  ctx.save();
  ctx.translate(0, yOff);
  const n = 6 + lvl * 2;
  ctx.save();
  ctx.rotate(t * (0.45 + lvl * 0.28));
  for (let i = 0; i < n; i++) {
    ctx.rotate((Math.PI * 2) / n);
    const long = i % 2 === 0 ? 1 : 0.58;
    const h = (14 + lvl * 4) * long;
    const cg = ctx.createLinearGradient(0, 0, 0, -h);
    cg.addColorStop(0, '#0e4a5c');
    cg.addColorStop(0.45, '#22d3ee');
    cg.addColorStop(1, '#f0fdff');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(-3.6 - lvl * 0.35, -2);
    ctx.lineTo(-1.1, -h * 0.55);
    ctx.lineTo(0, -h);
    ctx.lineTo(1.1, -h * 0.55);
    ctx.lineTo(3.6 + lvl * 0.35, -2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(224,247,255,0.55)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
  ctx.restore();
  if (lvl >= 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.rotate(-t * 0.8);
    ctx.strokeStyle = hexA('#a5f3fc', 0.5);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -2, 16 + lvl * 2, 6.5 + lvl, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (lvl >= 3) {
      ctx.rotate(0.9);
      ctx.beginPath();
      ctx.ellipse(0, -2, 22, 8.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  gemOrb(ctx, 0, -3, 6.5 + lvl * 0.9, '#67e8f9', t);
  if (lvl >= 2) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5 + lvl; i++) {
      const a = t * 1.1 + (i * Math.PI * 2) / (5 + lvl);
      ctx.fillStyle = 'rgba(207,250,254,0.75)';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * (18 + lvl * 2), Math.sin(a) * (8 + lvl) - 2, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  flashDot(ctx, flash, 0, -3, 16 + lvl, '#a5f3fc');
  ctx.restore();
}

function turretTesla(ctx: CanvasRenderingContext2D, lvl: number, t: number, flash: number, yOff: number) {
  ctx.save();
  ctx.translate(0, yOff);
  const coils = 3 + lvl;
  const stack = 5.4 + lvl * 0.9;
  for (let i = 0; i < coils; i++) {
    const w = 13.5 - i * (2.0 - lvl * 0.12);
    disc3d(
      ctx,
      0,
      -i * stack,
      Math.max(4.2, w),
      Math.max(2.4, w * 0.48),
      3.4,
      i % 2 === 0 ? '#5b3d8a' : '#3b2466',
      i % 2 === 0 ? '#2a1850' : '#1a0f38',
      '#12082a',
      hexA('#c084fc', 0.45 + 0.2 * flick(t, i)),
    );
  }
  const top = -coils * stack;
  disc3d(ctx, 0, top - 2, 9 + lvl, 4 + lvl * 0.35, 4, '#6d28d9', '#3b0764', '#1e0a3c', '#e9d5ff');
  if (lvl >= 3) {
    ctx.strokeStyle = '#e9d5ff';
    ctx.lineWidth = 2;
    for (const sx of [-11, 11]) {
      ctx.beginPath();
      ctx.moveTo(sx * 0.4, top - 4);
      ctx.lineTo(sx, top - 16);
      ctx.stroke();
      gemOrb(ctx, sx, top - 17, 2.4, '#e9d5ff', t);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(233,213,255,${0.7 + 0.3 * flick(t * 4, 1)})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-11, top - 17);
    for (let i = 1; i <= 6; i++) ctx.lineTo(-11 + (22 * i) / 6, top - 17 + (flick(t * 5, i) - 0.5) * 11);
    ctx.stroke();
    ctx.restore();
  }
  gemOrb(ctx, 0, top - 7, 5.4 + lvl * 0.7, '#c084fc', t);
  const nOrbs = 2 + lvl;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < nOrbs; i++) {
    const a = t * 2.4 + (i * Math.PI * 2) / nOrbs;
    ctx.fillStyle = '#f0abfc';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * (16 + lvl * 1.5), top + 6 + Math.sin(a) * 7, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  flashDot(ctx, flash, 0, top - 7, 15 + lvl, '#d8b4fe');
  ctx.restore();
}

function turretSniper(ctx: CanvasRenderingContext2D, lvl: number, ang: number, recoil: number, flash: number, t: number, yOff: number) {
  ctx.save();
  ctx.translate(0, yOff);
  ctx.rotate(ang);
  ctx.translate(-recoil * 0.9, 0);
  const len = 30 + lvl * 8;
  ctx.strokeStyle = '#1e2b4a';
  ctx.lineWidth = 2.4 + lvl * 0.35;
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.lineTo(-13, 8);
  ctx.moveTo(-4, 0);
  ctx.lineTo(-13, -8);
  if (lvl >= 1) {
    ctx.moveTo(10, 0);
    ctx.lineTo(4, 10);
    ctx.moveTo(10, 0);
    ctx.lineTo(16, 10);
  }
  ctx.stroke();
  disc3d(ctx, -2, 0, 7, 4.4, 5, '#3b486e', '#1b2340', '#0c1224', '#fde047');
  metalTube(ctx, 4, 0, len, 2.6 + lvl * 0.35, '#ca8a04');
  if (lvl >= 2) {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i === 1 ? '#fde047' : '#1f2937';
      ctx.fillRect(12 + i * 9, -5.2, 6, 10.4);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 0.7;
      ctx.strokeRect(12 + i * 9, -5.2, 6, 10.4);
    }
  }
  ctx.fillStyle = '#fde047';
  ctx.fillRect(len + 3, -4 - lvl * 0.2, 3.4, 8 + lvl * 0.4);
  ctx.fillStyle = '#0b0f1f';
  ctx.fillRect(len + 6.4, -2.2, 3.5, 4.4);
  const sc = 4.4 + lvl * 0.75;
  const sy = -6.4 - lvl * 0.45;
  ctx.fillStyle = '#0d1327';
  ctx.beginPath();
  ctx.arc(10, sy, sc + 1.8, 0, Math.PI * 2);
  ctx.fill();
  gemOrb(ctx, 10, sy, sc, '#fde047', t);
  ctx.strokeStyle = 'rgba(15,23,42,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10 - sc * 0.7, sy);
  ctx.lineTo(10 + sc * 0.7, sy);
  ctx.moveTo(10, sy - sc * 0.7);
  ctx.lineTo(10, sy + sc * 0.7);
  ctx.stroke();
  if (lvl >= 3) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bg = ctx.createLinearGradient(len + 8, 0, len + 90, 0);
    bg.addColorStop(0, `rgba(253,224,71,${0.5 * flick(t * 4, 1) + 0.25})`);
    bg.addColorStop(1, 'rgba(253,224,71,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(len + 8, -1.2, 90, 2.4);
    ctx.restore();
  }
  flashDot(ctx, flash, len + 8, 0, 10 + lvl, '#fef9c3');
  ctx.restore();
}

function turretBurn(ctx: CanvasRenderingContext2D, lvl: number, t: number, flash: number, yOff: number) {
  ctx.save();
  ctx.translate(0, yOff);
  const bowl = 9 + lvl * 2.1;
  ctx.strokeStyle = '#3f2d1c';
  ctx.lineWidth = 2.4;
  for (const sx of [-bowl * 0.85, 0, bowl * 0.85]) {
    ctx.beginPath();
    ctx.moveTo(sx * 0.4, 2);
    ctx.quadraticCurveTo(sx * 1.25, 10, sx * 0.75, 14);
    ctx.stroke();
  }
  disc3d(ctx, 0, 2, bowl, bowl * 0.42, 8, lvl >= 3 ? '#78350f' : '#3f2d1c', '#1c100a', '#0c0806', '#f97316');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(251,146,60,${0.55 + flick(t * 2, 2) * 0.4})`;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, -1, bowl * 0.82, 2.4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  const n = 1 + lvl;
  for (let i = 0; i < n; i++) {
    const ox = n === 1 ? 0 : (i - (n - 1) / 2) * (bowl * 0.55);
    const h = (16 + lvl * 4) * (i === Math.floor(n / 2) ? 1.28 : 0.78);
    ctx.save();
    ctx.translate(ox, -3);
    flame(ctx, 3.6 + lvl * 0.55, h, t, i * 2.7 + ox);
    ctx.restore();
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < lvl + 3; i++) {
    const ph = (t * 0.55 + i * 0.31) % 1;
    ctx.fillStyle = `rgba(253,186,116,${(1 - ph) * 0.85})`;
    ctx.beginPath();
    ctx.arc(Math.sin((i + t) * 2.1) * 8, -12 - ph * 30, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (lvl >= 3) {
    lightPool(ctx, 0, 12, 30, '#f97316', 0.38);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(249,115,22,${0.35 + flick(t * 3, 5) * 0.25})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 13, 19, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  flashDot(ctx, flash, 0, -16, 14 + lvl * 2, '#fdba74');
  ctx.restore();
}

/* ── tower entry point ─────────────────────────────────────── */
export function drawTowerArt(ctx: CanvasRenderingContext2D, tw: Tower, time: number) {
  const def = TOWERS[tw.kind];
  const apex = tw.level === def.levels.length - 1;
  ctx.save();
  ctx.translate(tw.x, tw.y);
  ctx.scale(1.02 + tw.level * 0.12, 1.02 + tw.level * 0.12);
  const yOff = -5 - tw.level * 1.6;
  drawPlinth(ctx, tw.level, def.color, apex, time);
  const recoil = Math.max(0, tw.recoil);
  switch (tw.kind) {
    case 'dart':
      turretDart(ctx, tw.level, tw.angle, recoil * 4, tw.flash, time);
      break;
    case 'cannon':
      turretCannon(ctx, tw.level, tw.angle, recoil * 4, tw.flash, time);
      break;
    case 'frost':
      turretFrost(ctx, tw.level, time, tw.flash, yOff - 6);
      break;
    case 'tesla':
      turretTesla(ctx, tw.level, time, tw.flash, yOff - 2);
      break;
    case 'sniper':
      turretSniper(ctx, tw.level, tw.angle, recoil * 4, tw.flash, time, yOff - 4);
      break;
    case 'burn':
      turretBurn(ctx, tw.level, time, tw.flash, yOff - 6);
      break;
  }
  if (tw.level >= 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const n = 2 + tw.level;
    for (let i = 0; i < n; i++) {
      const a = time * (0.9 + tw.level * 0.15) + (i * Math.PI * 2) / n;
      const rr = 20 + tw.level * 3;
      ctx.fillStyle = hexA(def.color, 0.35 + 0.35 * flick(time, i));
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.45 - 2, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  // Ascension stars (فرااوج ★1..★5)
  if (tw.ascend > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(253,224,71,${0.32 + 0.15 * flick(time * 2, 7)})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, -18, 16 + tw.ascend * 1.2, 6 + tw.ascend * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let s = 0; s < tw.ascend; s++) {
      const a = -time * 1.5 + (s * Math.PI * 2) / tw.ascend;
      const sx = Math.cos(a) * (16 + tw.ascend * 1.2);
      const sy = Math.sin(a) * (6 + tw.ascend * 0.4) - 18;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(sx, sy, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

/* ── enemies ───────────────────────────────────────────────── */
function enemyBody(ctx: CanvasRenderingContext2D, e: Enemy, time: number) {
  drawEnemyNew(ctx, e, time);
}

/** @deprecated kept for reference; superseded by renderEnemies.ts */
export function enemyBodyLegacy(ctx: CanvasRenderingContext2D, e: Enemy, time: number) {
  const def = ENEMIES[e.kind];
  const r = e.radius;
  const col = def.color;

  if (e.kind === 'crawler') {
    const bg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
    bg.addColorStop(0, '#3b3482');
    bg.addColorStop(1, '#17123a');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#05040d';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.15, r * 0.24, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.15, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.15, r * 0.09, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.15, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    // trailing wisps
    ctx.strokeStyle = hexA(col, 0.4);
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, i * 3 - 3);
      ctx.quadraticCurveTo(-r * 1.5, i * 3 - 3 + Math.sin(time * 7 + i) * 3, -r * 2, i * 3 - 3);
      ctx.stroke();
    }
  } else if (e.kind === 'runner') {
    ctx.rotate(Math.sin(time * 10 + e.wob) * 0.14);
    ctx.fillStyle = '#3d1230';
    ctx.beginPath();
    ctx.moveTo(r * 1.3, 0);
    ctx.lineTo(-r * 0.8, -r * 0.75);
    ctx.lineTo(-r * 0.35, 0);
    ctx.lineTo(-r * 0.8, r * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(r * 0.25, 0, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'bulwark') {
    ctx.fillStyle = '#3a2b12';
    ctx.beginPath();
    ctx.roundRect(-r * 0.95, -r * 0.8, r * 1.9, r * 1.6, 4);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(251,191,36,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.8);
    ctx.lineTo(-r * 0.2, r * 0.8);
    ctx.moveTo(r * 0.4, -r * 0.8);
    ctx.lineTo(r * 0.1, r * 0.8);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(253,224,71,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.25, -0.7, 0.7);
    ctx.stroke();
  } else if (e.kind === 'splitter') {
    const pulse = 1 + Math.sin(time * 5 + e.wob) * 0.1;
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#0f3524';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(5,46,22,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(-r * 0.4, 0, r * 0.28, 0, Math.PI * 2);
    ctx.arc(r * 0.4, 0, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'shade') {
    ctx.globalCompositeOperation = 'lighter';
    const ghost = ctx.createRadialGradient(0, -r * 0.2, 1, 0, 0, r * 1.1);
    ghost.addColorStop(0, 'rgba(199,210,254,0.85)');
    ghost.addColorStop(1, 'rgba(99,102,241,0.05)');
    ctx.fillStyle = ghost;
    ctx.beginPath();
    ctx.arc(0, -r * 0.15, r * 0.95, Math.PI, 0);
    ctx.quadraticCurveTo(r * 0.95, r * 0.9, 0, r * 0.55 + Math.sin(time * 9 + e.wob) * 3);
    ctx.quadraticCurveTo(-r * 0.95, r * 0.9, -r * 0.95, -r * 0.15);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.25, r * 0.16, 0, Math.PI * 2);
    ctx.arc(r * 0.3, -r * 0.25, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'healer') {
    ctx.fillStyle = '#06372a';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#065f46';
    ctx.beginPath();
    ctx.arc(0, -r * 0.3, r * 0.75, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#a7f3d0';
    ctx.fillRect(-1.6, -r * 0.5, 3.2, r * 0.8);
    ctx.fillRect(-r * 0.32, -r * 0.3 + 1, r * 0.64, 3.2);
    const frac = 1 - ((e.healT % 1.6) / 1.6);
    ctx.strokeStyle = `rgba(110,231,183,${0.5 * (1 - frac)})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, r * (1 + frac * 0.5), 0, Math.PI * 2);
    ctx.stroke();
  } else if (e.kind === 'frostgiant') {
    const bg = ctx.createLinearGradient(-r, -r, r, r);
    bg.addColorStop(0, '#4b6da8');
    bg.addColorStop(1, '#16233d');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8, 5);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(191,219,254,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.9);
    ctx.lineTo(-r * 0.2, 0);
    ctx.lineTo(-r * 0.45, r * 0.9);
    ctx.moveTo(r * 0.4, -r * 0.9);
    ctx.lineTo(r * 0.15, r * 0.2);
    ctx.stroke();
    // shoulders of ice
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#93c5fd';
      ctx.beginPath();
      ctx.moveTo(sx * r * 0.9, -r * 0.5);
      ctx.lineTo(sx * r * 1.35, -r * 0.95);
      ctx.lineTo(sx * r * 0.95, -r * 0.95);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#dbeafe';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'warp') {
    // phasing diamond that flickers with warp charge
    const charge = 1 - Math.min(1, e.warpT / 3);
    lightPool(ctx, 0, 0, r * (1.6 + charge), '#e879f9', 0.22 + charge * 0.25);
    ctx.save();
    ctx.rotate(time * 1.6);
    const g2 = ctx.createLinearGradient(-r, -r, r, r);
    g2.addColorStop(0, '#f5d0fe');
    g2.addColorStop(1, '#a21caf');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.72, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.72, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fae8ff';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // inner echo
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.5);
    ctx.lineTo(r * 0.36, 0);
    ctx.lineTo(0, r * 0.5);
    ctx.lineTo(-r * 0.36, 0);
    ctx.closePath();
    ctx.fillStyle = '#020008';
    ctx.fill();
    ctx.restore();
    // afterimage streaks when charging
    if (charge > 0.6) {
      ctx.globalAlpha = (charge - 0.6) * 1.6;
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(-i * 4, 0, r * 0.7, -0.6, 0.6);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  } else if (e.kind === 'reaver') {
    // armoured body
    const bg = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 1, 0, 0, r);
    bg.addColorStop(0, '#7f1d1d');
    bg.addColorStop(1, '#2a0a0a');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    for (let i = 1; i < 6; i++) {
      const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke();
    // scythe eye
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.34, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // energy shield bubble
    if (e.shield > 0) {
      const sf = e.shield / (e.maxShield || 1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(147,197,253,${0.35 + 0.35 * sf})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(147,197,253,${0.06 + 0.08 * sf})`;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
      ctx.fill();
      // hex facets
      ctx.strokeStyle = `rgba(191,219,254,${0.25 * sf})`;
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 6; i++) {
        const a = time * 0.6 + (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35);
        ctx.stroke();
      }
      ctx.restore();
    }
  } else {
    const variant = e.variant ?? 'legion';
    lightPool(ctx, 0, 0, r * 2.2, variant === 'mist' ? '#cbd5e1' : '#8b5cf6', 0.26);
    const bg = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 2, 0, 0, r * 1.15);
    if (variant === 'mist') {
      bg.addColorStop(0, '#8d99b8');
      bg.addColorStop(1, '#1a1d33');
    } else {
      bg.addColorStop(0, '#3b2a6e');
      bg.addColorStop(1, '#0d0824');
    }
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = variant === 'mist' ? '#cbd5e1' : col;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    if (variant === 'legion') {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.5 + Math.sin(time * 2) * 0.04;
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
        ctx.lineTo(Math.cos(a) * (r + 8), Math.sin(a) * (r + 8));
        ctx.stroke();
      }
      ctx.fillStyle = '#020008';
      ctx.beginPath();
      ctx.arc(0, r * 0.1, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e9d5ff';
      ctx.beginPath();
      ctx.arc(-r * 0.22, r * 0.02, r * 0.09, 0, Math.PI * 2);
      ctx.arc(r * 0.22, r * 0.02, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
      // trapped faces orbiting
      for (let i = 0; i < 4; i++) {
        const a = time * 0.7 + (i * Math.PI) / 2;
        ctx.fillStyle = 'rgba(167,139,250,0.5)';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 1.6, Math.sin(a) * r * 1.6, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (variant === 'mist') {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.55;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
        ctx.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3);
        ctx.stroke();
      }
      ctx.fillStyle = '#0b1020';
      ctx.beginPath();
      ctx.ellipse(-r * 0.25, -r * 0.05, r * 0.13, r * 0.22, 0, 0, Math.PI * 2);
      ctx.ellipse(r * 0.25, -r * 0.05, r * 0.13, r * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, r * 0.35, safeR(r * 0.12), safeR(r * 0.18 + Math.sin(time * 3) * 2), 0, 0, Math.PI * 2);
      ctx.fill();
      // veils
      ctx.strokeStyle = 'rgba(226,232,240,0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, r * (1.3 + i * 0.3), Math.sin(time + i) - 0.6, Math.sin(time + i) + 0.6);
        ctx.stroke();
      }
    } else {
      const blink = Math.abs(Math.sin(time * 1.1)) > 0.93 ? 0.12 : 1;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.55, r * 0.55 * blink, 0, 0, Math.PI * 2);
      ctx.fill();
      if (blink > 0.5) {
        ctx.fillStyle = '#7c3aed';
        ctx.beginPath();
        ctx.arc(Math.sin(time * 0.8) * r * 0.15, 0, r * 0.26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#020008';
        ctx.beginPath();
        ctx.arc(Math.sin(time * 0.8) * r * 0.15, 0, r * 0.11, 0, Math.PI * 2);
        ctx.fill();
      }
      const nEyes = 4 + e.eyeStage * 2;
      for (let i = 0; i < nEyes; i++) {
        const a = (i / nEyes) * Math.PI * 2 + time * 0.7;
        const ex = Math.cos(a) * r * 1.35;
        const ey = Math.sin(a) * r * 1.35;
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(ex, ey, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#020008';
        ctx.beginPath();
        ctx.arc(ex + Math.cos(a) * 1.4, ey + Math.sin(a) * 1.4, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

export function drawEnemyBodyWithState(ctx: CanvasRenderingContext2D, e: Enemy, time: number) {
  const r = e.radius;
  const ghostAlpha = e.boss && e.ghost ? 0.28 : 1;
  const wob = Math.sin(time * 8 + e.wob) * 0.09;

  if (e.elite) lightPool(ctx, 0, 0, r * 2.4, '#fbbf24', 0.3);
  ctx.save();
  ctx.globalAlpha = ghostAlpha;
  ctx.scale(1 + wob, 1 - wob);
  enemyBody(ctx, e, time);
  ctx.restore();

  if (e.elite) {
    ctx.save();
    ctx.strokeStyle = '#fcd34d';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * 0.55;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95 - 2);
      ctx.lineTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6) - 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (e.slowT > 0) {
    ctx.globalAlpha = 0.35 * ghostAlpha;
    ctx.fillStyle = '#a5f3fc';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = ghostAlpha;
  }
  if (e.burnT > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (0.3 + Math.sin(time * 14 + e.wob) * 0.14) * ghostAlpha;
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(0, -r * 0.2, r * 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (e.markT > 0) {
    ctx.save();
    ctx.translate(0, -r - 12);
    ctx.rotate(time * 2.5);
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(-4, -4, 8, 8);
    ctx.restore();
  }
  if (e.flash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, e.flash * 4) * 0.8 * ghostAlpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, time: number) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, e.radius * 0.85, e.radius * 0.9, e.radius * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  drawEnemyBodyWithState(ctx, e, time);
  ctx.restore();

  if (e.hp < e.maxHp && !e.boss) {
    const w = Math.max(22, e.radius * 2);
    const frac = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = 'rgba(2,6,17,0.8)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 11, w, 4);
    ctx.fillStyle = frac > 0.5 ? '#a3e635' : frac > 0.25 ? '#facc15' : '#f87171';
    ctx.fillRect(e.x - w / 2 + 0.5, e.y - e.radius - 10.5, (w - 1) * frac, 3);
  }
}

/* ── portraits for UI / codex ──────────────────────────────── */

export function makeFakeTower(kind: TowerKind, level: number): Tower {
  return {
    id: -1,
    kind,
    level,
    ascend: 0,
    tx: 0,
    ty: 0,
    x: 0,
    y: 0,
    invested: 0,
    cooldown: 0,
    angle: -Math.PI / 2,
    recoil: 0,
    flash: 0,
    kills: 0,
    targetMode: 'first',
    synergies: [],
  };
}

export function makeFakeEnemy(kind: EnemyKind): Enemy {
  const def = ENEMIES[kind];
  return {
    id: -1,
    kind,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    dist: 0,
    x: 0,
    y: 0,
    slowT: 0,
    slowPct: 0,
    gold: def.gold,
    dmg: def.dmg,
    radius: def.radius,
    slowResist: def.slowResist,
    wob: 0.7,
    lat: 0,
    flash: 0,
    dead: false,
    boss: kind === 'boss',
    elite: false,
    armor: def.armor,
    burnT: 0,
    burnDps: 0,
    burnSpread: 0,
    burnOwner: -1,
    markT: 0,
    markAmp: 0,
    healT: 0.8,
    ghost: false,
    ghostT: 0,
    eyeStage: 0,
    variant: kind === 'boss' ? 'legion' : null,
    warpT: 0,
    shield: kind === 'reaver' ? def.hp * 0.6 : 0,
    maxShield: kind === 'reaver' ? def.hp * 0.6 : 0,
    volatile: false,
  };
}

/** Draws a tower portrait centred in the given box. */
export function paintTowerPortrait(ctx: CanvasRenderingContext2D, kind: TowerKind, level: number, w: number, h: number, time: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  const s = Math.min(w, h) / 78;
  ctx.translate(w / 2, h / 2 + 6 * s);
  ctx.scale(s, s);
  const tw = makeFakeTower(kind, level);
  tw.recoil = 0.35 + 0.35 * Math.sin(time * 2.4);
  tw.flash = Math.max(0, Math.sin(time * 2.4)) ** 6;
  drawTowerArt(ctx, tw, time);
  ctx.restore();
}

export function paintEnemyPortrait(ctx: CanvasRenderingContext2D, kind: EnemyKind, w: number, h: number, time: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  const s = Math.min(w, h) / (ENEMIES[kind].radius * (kind === 'boss' ? 3.4 : 4.4));
  ctx.translate(w / 2, h / 2 + (kind === 'boss' ? 4 : 0));
  ctx.scale(s, s);
  const e = makeFakeEnemy(kind);
  drawEnemyBodyWithState(ctx, e, time);
  ctx.restore();
}

export function paintPetPortrait(ctx: CanvasRenderingContext2D, kind: PetKind, level: number, w: number, h: number, time: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  const s = Math.min(w, h) / 70;
  ctx.translate(w / 2, h / 2);
  ctx.scale(s, s);
  const p = makePet(kind, { pathTiles: new Set(), wps: [], cum: [], total: 0, coreX: 70, coreY: 50 });
  p.x = 0;
  p.y = Math.sin(time * 2) * 3;
  p.level = level;
  p.flap = time * 9;
  p.angle = 0;
  drawPet(ctx, p, time);
  ctx.restore();
}

/* ── scene ─────────────────────────────────────────────────── */
export function drawScene(ctx: CanvasRenderingContext2D, g: G, bg: HTMLCanvasElement) {
  const t = g.time;
  const theme = ACTS[g.act - 1];
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (g.shake > 0) {
    ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
  }
  ctx.drawImage(bg, 0, 0, W, H);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(${theme.glow},0.3)`;
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 26]);
  ctx.lineDashOffset = -t * 60;
  ctx.beginPath();
  g.map.wps.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.setLineDash([]);
  for (let k = 0; k < 4; k++) {
    const d = (t * 85 + (k * g.map.total) / 4) % g.map.total;
    const p = posAt(g.map, d, 0);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(t * 3 + k);
    ctx.fillStyle = hexA(theme.vein, 0.75);
    ctx.fillRect(-2.4, -2.4, 4.8, 4.8);
    ctx.restore();
  }
  ctx.restore();

  ctx.save();
  if (theme.weather === 'rain') {
    ctx.strokeStyle = `rgba(${theme.glow},0.28)`;
    ctx.lineWidth = 1.2;
    for (const m of g.weather) {
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x + m.vx * 0.03, m.y + m.size);
      ctx.stroke();
    }
  } else if (theme.weather === 'ash') {
    ctx.fillStyle = 'rgba(203,186,160,0.4)';
    for (const m of g.weather) ctx.fillRect(m.x, m.y, m.size, m.size);
  } else {
    ctx.globalCompositeOperation = 'lighter';
    for (const m of g.weather) {
      ctx.fillStyle = m.x % 2 < 1 ? 'rgba(251,146,60,0.5)' : hexA(theme.spore, 0.5);
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  const drawTileOutline = (tx: number, ty: number, ok: boolean) => {
    ctx.fillStyle = ok ? 'rgba(103,232,249,0.1)' : 'rgba(248,113,113,0.14)';
    ctx.fillRect(tx * TILE + 1, ty * TILE + 1, TILE - 2, TILE - 2);
    ctx.strokeStyle = ok ? 'rgba(103,232,249,0.55)' : 'rgba(248,113,113,0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(tx * TILE + 2, ty * TILE + 2, TILE - 4, TILE - 4);
  };
  if (g.hover && g.phase !== 'over') {
    const { tx, ty } = g.hover;
    if (tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS) {
      const occupied = g.towers.some((tw) => tw.tx === tx && tw.ty === ty);
      if (!occupied) drawTileOutline(tx, ty, !g.map.pathTiles.has(tileKey(tx, ty)));
    }
  }
  // synergy conduit links on the ground
  if (g.towers.length > 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < g.towers.length; i++) {
      for (let j = i + 1; j < g.towers.length; j++) {
        const a = g.towers[i];
        const b = g.towers[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) > SYNERGY_DIST) continue;
        const syn = SYNERGIES.find(
          (s) => (a.kind === s.a && b.kind === s.b) || (a.kind === s.b && b.kind === s.a),
        );
        if (!syn) continue;
        ctx.strokeStyle = hexA(syn.color, 0.26 + 0.14 * Math.sin(t * 3.5 + i));
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y + 4);
        ctx.lineTo(b.x, b.y + 4);
        ctx.stroke();
        // travelling energy mote along the conduit
        const u = (t * 0.9 + i * 0.37) % 1;
        const mx = a.x + (b.x - a.x) * u;
        const my = a.y + 4 + (b.y - a.y) * u;
        ctx.fillStyle = syn.color;
        ctx.beginPath();
        ctx.arc(mx, my, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  if (g.selected) {
    if (g.selected.type === 'tile') {
      drawTileOutline(g.selected.tx, g.selected.ty, true);
      // highlight neighbouring towers within synergy range
      const cx = tileCenter(g.selected.tx);
      const cy = tileCenter(g.selected.ty);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.setLineDash([4, 6]);
      for (const n of g.towers) {
        if (Math.hypot(n.x - cx, n.y - cy) <= SYNERGY_DIST) {
          ctx.strokeStyle = 'rgba(165,243,252,0.35)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(n.x, n.y);
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
      ctx.restore();
    } else {
      const tw = g.towers.find((x) => x.id === (g.selected as { id: number }).id);
      if (tw) {
        const eff = effTowerStats(g, tw);
        ctx.fillStyle = 'rgba(103,232,249,0.05)';
        ctx.beginPath();
        ctx.arc(tw.x, tw.y, eff.range, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(103,232,249,0.35)';
        ctx.setLineDash([6, 8]);
        ctx.lineDashOffset = -t * 30;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2;
        ctx.strokeRect(tw.tx * TILE + 2, tw.ty * TILE + 2, TILE - 4, TILE - 4);
      }
    }
  }

  drawCore(ctx, g);

  // interactive battlefield soul crystals
  for (const c of g.crystals) {
    const bob = Math.sin(t * 4 + c.id) * 3;
    const blink = c.life < 2 ? 0.4 + 0.6 * Math.abs(Math.sin(t * 10)) : 1;
    ctx.save();
    ctx.globalAlpha = blink;
    lightPool(ctx, c.x, c.y + bob, 24, '#67e8f9', 0.4);
    ctx.translate(c.x, c.y + bob);
    ctx.rotate(Math.sin(t * 2 + c.id) * 0.25);
    const cg = ctx.createLinearGradient(0, -10, 0, 10);
    cg.addColorStop(0, '#ecfeff');
    cg.addColorStop(0.5, '#22d3ee');
    cg.addColorStop(1, '#a855f7');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(7, 0);
    ctx.lineTo(0, 10);
    ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  const actors: { y: number; k: 't' | 'e'; o: Tower | Enemy }[] = [];
  for (const tw of g.towers) actors.push({ y: tw.y, k: 't', o: tw });
  for (const e of g.enemies) actors.push({ y: e.y, k: 'e', o: e });
  actors.sort((a, b) => a.y - b.y);
  for (const a of actors) {
    if (a.k === 't') {
      ctx.save();
      drawTowerArt(ctx, a.o as Tower, t);
      ctx.restore();
    } else {
      drawEnemy(ctx, a.o as Enemy, t);
    }
  }

  // companion hovers above everything on the ground
  if (g.pet) drawPet(ctx, g.pet, t);

  for (const p of g.projectiles) {
    if (p.trail.length > 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i < p.trail.length; i++) {
        const a = i / p.trail.length;
        const col =
          p.kind === 'cannon' || p.kind === 'burn'
            ? `rgba(251,146,60,${a * 0.5})`
            : p.kind === 'frost'
              ? `rgba(165,243,252,${a * 0.5})`
              : p.kind === 'sniper'
                ? `rgba(253,224,71,${a * 0.5})`
                : `rgba(125,211,252,${a * 0.55})`;
        ctx.strokeStyle = col;
        ctx.lineWidth = (p.kind === 'cannon' ? 3.5 : 2.2) * a;
        ctx.beginPath();
        ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
        ctx.lineTo(p.trail[i].x, p.trail[i].y);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    const ang = Math.atan2(p.ty - p.y, p.tx - p.x);
    if (p.kind === 'cannon') {
      const bg2 = ctx.createRadialGradient(-2, -2, 0, 0, 0, 6);
      bg2.addColorStop(0, '#57534e');
      bg2.addColorStop(1, '#0c0a09');
      ctx.fillStyle = bg2;
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else if (p.kind === 'frost') {
      ctx.rotate(ang + t * 2);
      ctx.fillStyle = '#cffafe';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4, 0);
      ctx.lineTo(0, 6);
      ctx.lineTo(-4, 0);
      ctx.closePath();
      ctx.fill();
    } else if (p.kind === 'burn') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const fl = ctx.createRadialGradient(0, 0, 0, 0, 0, 9);
      fl.addColorStop(0, 'rgba(255,237,213,0.95)');
      fl.addColorStop(0.5, 'rgba(249,115,22,0.6)');
      fl.addColorStop(1, 'rgba(249,115,22,0)');
      ctx.fillStyle = fl;
      ctx.fillRect(-9, -9, 18, 18);
      ctx.restore();
    } else {
      ctx.rotate(ang);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(-5, -1.4, 11, 2.8);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(4, -2.2, 4, 4.4);
    }
    ctx.restore();
  }

  for (const b of g.bolts) {
    const a = b.life / b.max;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = hexA(b.color, 0.3 * a);
    ctx.lineWidth = 6;
    ctx.beginPath();
    b.pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.strokeStyle = hexA(b.color, 0.95 * a);
    ctx.lineWidth = 1.7;
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  for (const p of g.particles) {
    const a = Math.max(0, p.life / p.max);
    if (p.type === 'smoke') {
      ctx.fillStyle = `rgba(120,113,108,${0.35 * a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size + (1 - a) * 8, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.globalCompositeOperation = 'lighter';
    if (p.type === 'ring') {
      ctx.strokeStyle = p.color.startsWith('#') ? p.color : '#67e8f9';
      ctx.globalAlpha = a * 0.75;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (p.type === 'snow') {
      ctx.fillStyle = `rgba(207,250,254,${a})`;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(t * 3);
      ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
      ctx.restore();
    } else if (p.type === 'heal') {
      ctx.strokeStyle = `rgba(110,231,183,${a})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(p.x - 2.4, p.y);
      ctx.lineTo(p.x + 2.4, p.y);
      ctx.moveTo(p.x, p.y - 2.4);
      ctx.lineTo(p.x, p.y + 2.4);
      ctx.stroke();
    } else {
      const col = p.color.startsWith('#') ? p.color : '#a78bfa';
      ctx.globalAlpha = a;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.type === 'soul' ? 1 + (1 - a) * 0.4 : 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();

  // wave-modifier atmosphere
  if (g.mod === 'fog') {
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const fx = (t * (10 + i * 6) + i * 300) % (W + 400) - 200;
      const grd = ctx.createRadialGradient(fx, H * (0.3 + i * 0.14), 0, fx, H * (0.3 + i * 0.14), 260);
      grd.addColorStop(0, 'rgba(203,213,225,0.16)');
      grd.addColorStop(1, 'rgba(203,213,225,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(fx - 260, 0, 520, H);
    }
    ctx.fillStyle = 'rgba(148,163,184,0.08)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (g.mod === 'eclipse') {
    ctx.save();
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, H * 0.85);
    vg.addColorStop(0, 'rgba(10,4,26,0.1)');
    vg.addColorStop(1, 'rgba(6,2,16,0.62)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (g.mod === 'bloodmoon') {
    ctx.save();
    ctx.fillStyle = `rgba(244,63,94,${0.06 + Math.sin(t * 1.5) * 0.02})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  if (g.freezeT > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(165,243,252,${0.08 + Math.min(0.1, g.freezeT * 0.05)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(207,250,254,0.35)';
    ctx.lineWidth = 6;
    ctx.strokeRect(2, 2, W - 4, H - 4);
    ctx.restore();
  }

  ctx.save();
  ctx.textAlign = 'center';
  for (const tx of g.texts) {
    const a = Math.min(1, tx.life / tx.max + 0.2);
    ctx.globalAlpha = a;
    ctx.font = `700 ${tx.size}px ui-monospace, monospace`;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(tx.text, tx.x + 1, tx.y + 1);
    ctx.fillStyle = tx.color;
    ctx.fillText(tx.text, tx.x, tx.y);
  }
  ctx.restore();

  ctx.restore();
}

export const logicalSize = { w: W, h: H };
export const tilePos = (tx: number, ty: number) => ({ x: tileCenter(tx), y: tileCenter(ty) });

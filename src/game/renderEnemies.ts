import { ENEMIES } from './config';
import type { Enemy, Pet } from './types';

/* ── helpers (kept local so this module is self-contained) ─── */
function hexA(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}
const flick = (t: number, s: number) => 0.5 + 0.5 * Math.sin(t * 9.3 + s) * Math.sin(t * 4.1 + s * 2.3);

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, hexA(color, a));
  gr.addColorStop(0.5, hexA(color, a * 0.35));
  gr.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = gr;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

function eyes(ctx: CanvasRenderingContext2D, dx: number, y: number, r: number, color: string, slant = 0) {
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * dx, y);
    ctx.rotate(slant * s);
    glow(ctx, 0, 0, r * 3, color, 0.5);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.15, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** tattered cloak hem: a wavy polygon under a body */
function cloak(ctx: CanvasRenderingContext2D, w: number, top: number, bottom: number, t: number, colA: string, colB: string, seed: number) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, colA);
  g.addColorStop(1, colB);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-w, top);
  ctx.lineTo(w, top);
  const n = 6;
  for (let i = n; i >= 0; i--) {
    const u = i / n;
    const x = -w + u * 2 * w;
    const y = bottom - Math.abs(Math.sin(u * Math.PI * 3 + t * 6 + seed)) * (bottom - top) * 0.28 - (i % 2 ? 0 : 3);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/* ─────────────────────────────────────────────────────────── */
/*  Enemy bodies                                                */
/* ─────────────────────────────────────────────────────────── */

export function drawEnemyNew(ctx: CanvasRenderingContext2D, e: Enemy, t: number) {
  const def = ENEMIES[e.kind];
  const r = e.radius;
  const col = def.color;
  const bob = Math.sin(t * 6 + e.wob) * 1.2;

  switch (e.kind) {
    case 'crawler': {
      // hooded wraith dragging a chain of lantern-light
      glow(ctx, 0, 0, r * 1.6, col, 0.16);
      ctx.strokeStyle = hexA(col, 0.35);
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, i * 4 - 4);
        ctx.quadraticCurveTo(-r * 1.6, i * 4 - 4 + Math.sin(t * 7 + i + e.wob) * 4, -r * 2.4, i * 4 - 2);
        ctx.stroke();
      }
      cloak(ctx, r * 0.95, -r * 0.3 + bob, r * 1.05 + bob, t, '#3b3482', '#120c2e', e.wob);
      // hood
      const hg = ctx.createRadialGradient(-r * 0.2, -r * 0.6 + bob, 1, 0, -r * 0.35 + bob, r * 0.85);
      hg.addColorStop(0, '#4c3f9a');
      hg.addColorStop(1, '#17123a');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, -r * 0.1 + bob);
      ctx.quadraticCurveTo(-r * 0.9, -r * 1.15 + bob, 0, -r * 1.25 + bob);
      ctx.quadraticCurveTo(r * 0.9, -r * 1.15 + bob, r * 0.85, -r * 0.1 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = hexA(col, 0.7);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // hollow face
      ctx.fillStyle = '#05040d';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.42 + bob, r * 0.5, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      eyes(ctx, r * 0.22, -r * 0.45 + bob, r * 0.14, '#c4b5fd');
      break;
    }
    case 'runner': {
      // spectral fox — a streak with afterimages
      ctx.save();
      ctx.rotate(Math.sin(t * 10 + e.wob) * 0.1);
      for (let i = 3; i >= 1; i--) {
        ctx.globalAlpha = 0.16 * (4 - i);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(-i * 7, 0, r * 1.05, r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const bg = ctx.createLinearGradient(-r, 0, r * 1.3, 0);
      bg.addColorStop(0, '#3d1230');
      bg.addColorStop(1, '#831843');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(r * 1.35, 0);
      ctx.quadraticCurveTo(r * 0.4, -r * 0.95, -r * 0.9, -r * 0.55);
      ctx.quadraticCurveTo(-r * 1.3, 0, -r * 0.9, r * 0.55);
      ctx.quadraticCurveTo(r * 0.4, r * 0.95, r * 1.35, 0);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // ears
      ctx.fillStyle = '#9d174d';
      ctx.beginPath();
      ctx.moveTo(r * 0.3, -r * 0.6);
      ctx.lineTo(r * 0.55, -r * 1.25);
      ctx.lineTo(r * 0.75, -r * 0.5);
      ctx.closePath();
      ctx.fill();
      // tail flame
      glow(ctx, -r * 1.1, 0, r, col, 0.4);
      eyes(ctx, 0, 0, r * 0.12, '#fbcfe8', 0.4);
      ctx.translate(r * 0.7, -r * 0.08);
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'bulwark': {
      // armoured knight with a tower shield
      const armor = ctx.createLinearGradient(-r, -r, r, r);
      armor.addColorStop(0, '#5b4a1c');
      armor.addColorStop(0.5, '#2f2410');
      armor.addColorStop(1, '#1a1308');
      ctx.fillStyle = armor;
      ctx.beginPath();
      ctx.roundRect(-r * 0.75, -r * 0.9 + bob, r * 1.5, r * 1.75, 5);
      ctx.fill();
      ctx.strokeStyle = '#a16207';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // pauldrons
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#7c5a12';
        ctx.beginPath();
        ctx.ellipse(s * r * 0.75, -r * 0.75 + bob, r * 0.42, r * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // helm
      ctx.fillStyle = '#3f2f10';
      ctx.beginPath();
      ctx.roundRect(-r * 0.42, -r * 1.25 + bob, r * 0.84, r * 0.62, 3);
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(-r * 0.32, -r * 1.0 + bob, r * 0.64, 2.2);
      // plume
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.25 + bob);
      ctx.quadraticCurveTo(-r * 0.3, -r * 1.7 + bob, -r * 0.6 + Math.sin(t * 5) * 2, -r * 1.5 + bob);
      ctx.stroke();
      // tower shield in front
      const sh = ctx.createLinearGradient(r * 0.3, -r, r * 1.3, r);
      sh.addColorStop(0, '#facc15');
      sh.addColorStop(0.5, '#a16207');
      sh.addColorStop(1, '#713f12');
      ctx.fillStyle = sh;
      ctx.beginPath();
      ctx.moveTo(r * 0.55, -r * 0.95 + bob);
      ctx.lineTo(r * 1.35, -r * 0.7 + bob);
      ctx.lineTo(r * 1.35, r * 0.4 + bob);
      ctx.lineTo(r * 0.95, r * 1.05 + bob);
      ctx.lineTo(r * 0.55, r * 0.7 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      // shield emblem — a closed eye
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(r * 0.95, -r * 0.1 + bob, r * 0.22, 0.2, Math.PI - 0.2);
      ctx.stroke();
      break;
    }
    case 'splitter': {
      // twin-cored amoeba in a membrane
      const pulse = 1 + Math.sin(t * 5 + e.wob) * 0.08;
      ctx.save();
      ctx.scale(pulse, 1 / pulse);
      const mem = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.05);
      mem.addColorStop(0, 'rgba(74,222,128,0.35)');
      mem.addColorStop(0.75, 'rgba(22,101,52,0.7)');
      mem.addColorStop(1, 'rgba(5,46,22,0.95)');
      ctx.fillStyle = mem;
      ctx.beginPath();
      for (let i = 0; i <= 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const rr = r * (1 + Math.sin(a * 4 + t * 3) * 0.08);
        i === 0 ? ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // membrane seam
      ctx.strokeStyle = 'rgba(187,247,208,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(Math.sin(t * 4) * 4, 0, 0, r);
      ctx.stroke();
      // nuclei
      for (const s of [-1, 1]) {
        glow(ctx, s * r * 0.42, 0, r * 0.6, col, 0.5);
        const nuc = ctx.createRadialGradient(s * r * 0.42 - 2, -2, 0, s * r * 0.42, 0, r * 0.3);
        nuc.addColorStop(0, '#dcfce7');
        nuc.addColorStop(1, '#16a34a');
        ctx.fillStyle = nuc;
        ctx.beginPath();
        ctx.arc(s * r * 0.42, Math.sin(t * 3 + s) * 2, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#052e16';
        ctx.beginPath();
        ctx.arc(s * r * 0.42, Math.sin(t * 3 + s) * 2, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'shade': {
      // translucent specter with a long skull and a floating candle
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const ghost = ctx.createRadialGradient(0, -r * 0.3, 1, 0, 0, r * 1.3);
      ghost.addColorStop(0, 'rgba(199,210,254,0.75)');
      ghost.addColorStop(0.6, 'rgba(129,140,248,0.25)');
      ghost.addColorStop(1, 'rgba(99,102,241,0)');
      ctx.fillStyle = ghost;
      ctx.beginPath();
      ctx.arc(0, -r * 0.2, r, Math.PI, 0);
      for (let i = 0; i <= 4; i++) {
        const u = i / 4;
        ctx.lineTo(r - u * 2 * r, r * 0.55 + Math.sin(t * 8 + i * 1.7 + e.wob) * 5 + (i % 2 ? 8 : 0));
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // skull
      ctx.fillStyle = '#e0e7ff';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.4, r * 0.48, r * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.ellipse(-r * 0.2, -r * 0.5, r * 0.14, r * 0.2, 0, 0, Math.PI * 2);
      ctx.ellipse(r * 0.2, -r * 0.5, r * 0.14, r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.08, r * 0.1, r * 0.18 + Math.sin(t * 4) * 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // candle
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(r * 0.9, -r * 0.3, 3, r * 0.6);
      glow(ctx, r * 0.9 + 1.5, -r * 0.42, 9, '#a5b4fc', 0.8 + flick(t, e.wob) * 0.3);
      ctx.fillStyle = '#c7d2fe';
      ctx.beginPath();
      ctx.ellipse(r * 0.9 + 1.5, -r * 0.44, 2, 3.4 + flick(t, e.wob), 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'healer': {
      // mendicant priest with a staff and orbiting rune-halo
      cloak(ctx, r * 0.85, -r * 0.2 + bob, r * 1.05 + bob, t, '#065f46', '#022c22', e.wob);
      const hd = ctx.createRadialGradient(-2, -r * 0.6 + bob, 1, 0, -r * 0.55 + bob, r * 0.5);
      hd.addColorStop(0, '#6ee7b7');
      hd.addColorStop(1, '#047857');
      ctx.fillStyle = hd;
      ctx.beginPath();
      ctx.arc(0, -r * 0.55 + bob, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#022c22';
      ctx.beginPath();
      ctx.arc(-r * 0.15, -r * 0.6 + bob, r * 0.08, 0, Math.PI * 2);
      ctx.arc(r * 0.15, -r * 0.6 + bob, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
      // staff
      ctx.strokeStyle = '#a7f3d0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(r * 0.8, r * 0.9 + bob);
      ctx.lineTo(r * 0.8, -r * 1.2 + bob);
      ctx.stroke();
      glow(ctx, r * 0.8, -r * 1.3 + bob, 10, col, 0.7);
      ctx.fillStyle = '#d1fae5';
      ctx.beginPath();
      ctx.arc(r * 0.8, -r * 1.3 + bob, 3.2, 0, Math.PI * 2);
      ctx.fill();
      // halo runes
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const a = t * 1.4 + (i * Math.PI) / 2;
        ctx.fillStyle = hexA('#6ee7b7', 0.7);
        ctx.fillRect(Math.cos(a) * r * 1.2 - 1.5, Math.sin(a) * r * 0.5 - r * 0.55 + bob - 1.5, 3, 3);
      }
      ctx.restore();
      const frac = 1 - (e.healT % 1.6) / 1.6;
      ctx.strokeStyle = `rgba(110,231,183,${0.5 * (1 - frac)})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, r * (1 + frac * 0.6), 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'frostgiant': {
      // hulking ice golem with a burning-cold core
      glow(ctx, 0, 0, r * 1.5, '#93c5fd', 0.18);
      const body = ctx.createLinearGradient(-r, -r, r, r);
      body.addColorStop(0, '#93c5fd');
      body.addColorStop(0.4, '#3b5b8c');
      body.addColorStop(1, '#0f1a33');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, r * 0.95);
      ctx.lineTo(-r * 1.0, -r * 0.2);
      ctx.lineTo(-r * 0.55, -r * 1.05);
      ctx.lineTo(r * 0.55, -r * 1.05);
      ctx.lineTo(r * 1.0, -r * 0.2);
      ctx.lineTo(r * 0.7, r * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#bfdbfe';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // shoulder crystals
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#dbeafe';
        ctx.beginPath();
        ctx.moveTo(s * r * 0.75, -r * 0.6);
        ctx.lineTo(s * r * 1.45, -r * 1.35);
        ctx.lineTo(s * r * 1.05, -r * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#93c5fd';
        ctx.beginPath();
        ctx.moveTo(s * r * 0.95, -r * 0.55);
        ctx.lineTo(s * r * 1.15, -r * 1.55);
        ctx.lineTo(s * r * 1.25, -r * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      // cracks
      ctx.strokeStyle = 'rgba(224,242,254,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, -r * 0.9);
      ctx.lineTo(-r * 0.2, -r * 0.1);
      ctx.lineTo(-r * 0.4, r * 0.7);
      ctx.moveTo(r * 0.35, -r);
      ctx.lineTo(r * 0.15, 0);
      ctx.stroke();
      // core
      glow(ctx, 0, 0, r * 0.7, '#e0f2fe', 0.8);
      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.28);
      core.addColorStop(0, '#ffffff');
      core.addColorStop(1, '#60a5fa');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      eyes(ctx, r * 0.24, -r * 0.62, r * 0.09, '#e0f2fe');
      // frost breath
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.7 + i * 0.25) % 1;
        ctx.fillStyle = `rgba(219,234,254,${(1 - ph) * 0.5})`;
        ctx.beginPath();
        ctx.arc(r * 0.6 + ph * 22, -r * 0.55 + Math.sin(i + t * 3) * 3, 1.6 + ph * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'warp': {
      // void diamond tearing space
      const charge = 1 - Math.min(1, e.warpT / 3);
      glow(ctx, 0, 0, r * (1.6 + charge), '#e879f9', 0.22 + charge * 0.3);
      ctx.save();
      ctx.rotate(t * 1.6);
      // orbiting rings
      ctx.strokeStyle = hexA('#f0abfc', 0.5);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.35, r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.rotate(1.2);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.35, r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.rotate(-1.2 + t * 0.4);
      const g2 = ctx.createLinearGradient(-r, -r, r, r);
      g2.addColorStop(0, '#fae8ff');
      g2.addColorStop(0.5, '#d946ef');
      g2.addColorStop(1, '#701a75');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.7, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fae8ff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // void core
      ctx.fillStyle = '#020008';
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.5);
      ctx.lineTo(r * 0.34, 0);
      ctx.lineTo(0, r * 0.5);
      ctx.lineTo(-r * 0.34, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (charge > 0.6) {
        ctx.save();
        ctx.globalAlpha = (charge - 0.6) * 2;
        ctx.strokeStyle = '#f0abfc';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.arc(-i * 5, 0, r * 0.75, -0.7, 0.7);
          ctx.stroke();
        }
        ctx.restore();
      }
      break;
    }
    case 'reaver': {
      // shielded skull-knight with a scythe
      const bg = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 1, 0, 0, r);
      bg.addColorStop(0, '#991b1b');
      bg.addColorStop(1, '#2a0a0a');
      ctx.fillStyle = bg;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      // skull
      ctx.fillStyle = '#fecaca';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.1, r * 0.4, r * 0.46, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#450a0a';
      ctx.beginPath();
      ctx.ellipse(-r * 0.15, -r * 0.18, r * 0.11, r * 0.14, 0, 0, Math.PI * 2);
      ctx.ellipse(r * 0.15, -r * 0.18, r * 0.11, r * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = -1; i <= 1; i++) ctx.fillRect(i * 4 - 1, r * 0.12, 2, 5);
      // scythe
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, r * 1.1);
      ctx.lineTo(r * 0.4, -r * 1.3);
      ctx.stroke();
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(r * 0.05, -r * 1.05, r * 0.55, -1.1, 0.9);
      ctx.stroke();
      // shield bubble
      if (e.shield > 0) {
        const sf = e.shield / (e.maxShield || 1);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(147,197,253,${0.35 + 0.4 * sf})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(147,197,253,${0.05 + 0.08 * sf})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(191,219,254,${0.3 * sf})`;
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 6; i++) {
          const a = t * 0.6 + (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
          ctx.lineTo(Math.cos(a) * r * 1.4, Math.sin(a) * r * 1.4);
          ctx.stroke();
        }
        ctx.restore();
      }
      break;
    }
    default:
      drawBoss(ctx, e, t);
  }
}

/* ─────────────────────────────────────────────────────────── */
/*  Bosses — big, layered, theatrical                           */
/* ─────────────────────────────────────────────────────────── */

function drawBoss(ctx: CanvasRenderingContext2D, e: Enemy, t: number) {
  const r = e.radius;
  const variant = e.variant ?? 'legion';

  if (variant === 'legion') {
    glow(ctx, 0, 0, r * 2.2, '#8b5cf6', 0.32);
    // ring of trapped souls
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 10; i++) {
      const a = t * 0.6 + (i * Math.PI * 2) / 10;
      const rr = r * 1.45 + Math.sin(t * 3 + i) * 4;
      ctx.fillStyle = hexA('#c4b5fd', 0.55);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.7, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // throne mass
    cloak(ctx, r * 1.05, -r * 0.2, r * 1.15, t, '#3b2a6e', '#0d0824', 1);
    const body = ctx.createRadialGradient(-r * 0.3, -r * 0.5, 4, 0, 0, r * 1.1);
    body.addColorStop(0, '#5b3fa8');
    body.addColorStop(1, '#0d0824');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.1, r * 0.95, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.6;
    ctx.stroke();
    // faces pressing out of the body
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.9 + i * 0.45 + Math.sin(t * 1.3 + i) * 0.05;
      const fx = Math.cos(a) * r * 0.62;
      const fy = Math.sin(a) * r * 0.55 - r * 0.05;
      ctx.fillStyle = 'rgba(15,8,40,0.9)';
      ctx.beginPath();
      ctx.ellipse(fx, fy, r * 0.13, r * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e9d5ff';
      ctx.beginPath();
      ctx.arc(fx - 2, fy - 2, 1.6, 0, Math.PI * 2);
      ctx.arc(fx + 2, fy - 2, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // crown of shards
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.32 + Math.sin(t * 2) * 0.03;
      ctx.strokeStyle = i % 2 ? '#a855f7' : '#e9d5ff';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85 - r * 0.1);
      ctx.lineTo(Math.cos(a) * (r * 1.3 + (i % 2 ? 0 : 8)), Math.sin(a) * (r * 1.3 + (i % 2 ? 0 : 8)) - r * 0.1);
      ctx.stroke();
    }
    // central void face
    ctx.fillStyle = '#020008';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.05, r * 0.5, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    eyes(ctx, r * 0.2, 0, r * 0.09, '#e9d5ff');
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, r * 0.15, r * 0.25, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else if (variant === 'mist') {
    glow(ctx, 0, 0, r * 2.4, '#cbd5e1', 0.28);
    // veils
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(226,232,240,${0.22 - i * 0.03})`;
      ctx.lineWidth = 6 - i;
      ctx.beginPath();
      ctx.arc(0, 0, r * (1.15 + i * 0.22), Math.sin(t * 0.8 + i) - 0.9, Math.sin(t * 0.8 + i) + 0.9);
      ctx.stroke();
    }
    ctx.restore();
    // gown
    cloak(ctx, r * 0.9, -r * 0.1, r * 1.3, t, '#94a3b8', '#1e293b', 2);
    const body = ctx.createRadialGradient(-r * 0.3, -r * 0.5, 2, 0, -r * 0.1, r);
    body.addColorStop(0, '#e2e8f0');
    body.addColorStop(0.5, '#64748b');
    body.addColorStop(1, '#0f172a');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.25, r * 0.7, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 2;
    ctx.stroke();
    // tall silver crown
    for (let i = -2; i <= 2; i++) {
      ctx.fillStyle = i === 0 ? '#f8fafc' : '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(i * r * 0.28 - r * 0.12, -r * 0.85);
      ctx.lineTo(i * r * 0.28, -r * (1.45 + (i === 0 ? 0.25 : 0)));
      ctx.lineTo(i * r * 0.28 + r * 0.12, -r * 0.85);
      ctx.closePath();
      ctx.fill();
    }
    glow(ctx, 0, -r * 1.55, 12, '#e0f2fe', 0.9);
    // hollow eyes + wailing mouth
    ctx.fillStyle = '#0b1020';
    ctx.beginPath();
    ctx.ellipse(-r * 0.24, -r * 0.35, r * 0.12, r * 0.22, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.24, -r * 0.35, r * 0.12, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, r * 0.05, r * 0.13, r * 0.22 + Math.sin(t * 3) * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // drifting hands
    for (const s of [-1, 1]) {
      ctx.fillStyle = 'rgba(226,232,240,0.7)';
      ctx.beginPath();
      ctx.ellipse(s * (r * 1.1 + Math.sin(t * 1.5 + s) * 6), r * 0.1 + Math.cos(t * 1.2 + s) * 6, r * 0.16, r * 0.24, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (variant === 'eye') {
    glow(ctx, 0, 0, r * 2.3, '#a855f7', 0.3);
    // fleshy mass of nerves
    const body = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
    body.addColorStop(0, '#6d28d9');
    body.addColorStop(1, '#1e0a3c');
    ctx.fillStyle = body;
    ctx.beginPath();
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const rr = r * (0.95 + Math.sin(a * 6 + t * 2) * 0.06);
      i === 0 ? ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    // nerve tendrils
    ctx.strokeStyle = 'rgba(192,132,252,0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 0.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
      ctx.quadraticCurveTo(
        Math.cos(a + 0.3) * r * 1.3,
        Math.sin(a + 0.3) * r * 1.3,
        Math.cos(a + Math.sin(t * 2 + i) * 0.3) * r * 1.6,
        Math.sin(a + Math.sin(t * 2 + i) * 0.3) * r * 1.6,
      );
      ctx.stroke();
    }
    // the great eye
    const blink = Math.abs(Math.sin(t * 1.1)) > 0.93 ? 0.1 : 1;
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.55, r * 0.5 * blink, 0, 0, Math.PI * 2);
    ctx.fill();
    if (blink > 0.5) {
      const iris = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.3);
      iris.addColorStop(0, '#f0abfc');
      iris.addColorStop(0.6, '#7c3aed');
      iris.addColorStop(1, '#3b0764');
      ctx.fillStyle = iris;
      ctx.beginPath();
      ctx.arc(Math.sin(t * 0.8) * r * 0.14, 0, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#020008';
      ctx.beginPath();
      ctx.ellipse(Math.sin(t * 0.8) * r * 0.14, 0, r * 0.08, r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // satellite eyes
    const nEyes = 6 + e.eyeStage * 3;
    for (let i = 0; i < nEyes; i++) {
      const a = (i / nEyes) * Math.PI * 2 + t * 0.7;
      const ex = Math.cos(a) * r * 1.25;
      const ey = Math.sin(a) * r * 1.25;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(ex, ey, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.arc(ex + Math.cos(a) * 1.6, ey + Math.sin(a) * 1.6, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#020008';
      ctx.beginPath();
      ctx.arc(ex + Math.cos(a) * 1.8, ey + Math.sin(a) * 1.8, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // ── THE KING OF SILENCE ─────────────────────────────────
    glow(ctx, 0, 0, r * 2.6, '#7c3aed', 0.36);
    glow(ctx, 0, -r * 0.6, r * 1.4, '#fde68a', 0.16 + flick(t, 1) * 0.1);
    // storm of souls
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) {
      const a = t * 0.9 + (i * Math.PI * 2) / 18;
      const rr = r * (1.5 + Math.sin(t * 2 + i * 1.3) * 0.15);
      ctx.fillStyle = hexA(i % 3 ? '#c4b5fd' : '#fde68a', 0.6);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.6 + r * 0.1, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // cape
    cloak(ctx, r * 1.25, -r * 0.4, r * 1.35, t, '#2e1065', '#050212', 3);
    // mantle collar
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(-r * 1.15, -r * 0.35);
    ctx.lineTo(-r * 0.5, -r * 0.95);
    ctx.lineTo(r * 0.5, -r * 0.95);
    ctx.lineTo(r * 1.15, -r * 0.35);
    ctx.lineTo(r * 0.8, r * 0.1);
    ctx.lineTo(-r * 0.8, r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.stroke();
    // void body
    const body = ctx.createRadialGradient(0, -r * 0.3, 2, 0, -r * 0.1, r * 0.9);
    body.addColorStop(0, '#1a1033');
    body.addColorStop(1, '#020008');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.2, r * 0.62, r * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
    // jagged crown
    for (let i = -3; i <= 3; i++) {
      const h = i === 0 ? 1.95 : Math.abs(i) === 1 ? 1.7 : Math.abs(i) === 2 ? 1.5 : 1.3;
      ctx.fillStyle = i % 2 ? '#0a0618' : '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(i * r * 0.2 - r * 0.1, -r * 0.9);
      ctx.lineTo(i * r * 0.2, -r * h);
      ctx.lineTo(i * r * 0.2 + r * 0.1, -r * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      glow(ctx, i * r * 0.2, -r * h, 6, '#fde68a', 0.9);
    }
    // face: two pale eyes + the wide grin
    eyes(ctx, r * 0.22, -r * 0.4, r * 0.11, '#e9d5ff');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(233,213,255,${0.85 + 0.15 * flick(t, 5)})`;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      const x = -r * 0.42 + u * r * 0.84;
      const y = -r * 0.05 + Math.sin(u * Math.PI) * r * 0.16 + (i % 2 ? 3 : 0);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    // sceptre
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r * 0.95, r * 1.0);
    ctx.lineTo(r * 0.95, -r * 1.25);
    ctx.stroke();
    glow(ctx, r * 0.95, -r * 1.35, 16, '#c084fc', 0.9);
    const orb = ctx.createRadialGradient(r * 0.9, -r * 1.4, 0, r * 0.95, -r * 1.35, 7);
    orb.addColorStop(0, '#fff');
    orb.addColorStop(1, '#a855f7');
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(r * 0.95, -r * 1.35, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ─────────────────────────────────────────────────────────── */
/*  Companions                                                  */
/* ─────────────────────────────────────────────────────────── */

export function drawPet(ctx: CanvasRenderingContext2D, p: Pet, t: number) {
  const L = p.level;
  const s = 1 + Math.min(0.6, L * 0.024); // grows a little with level
  ctx.save();
  ctx.translate(p.x, p.y);
  // shadow far below (they hover)
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 26, 12 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(s, s);
  const flap = Math.sin(p.flap);
  if (p.flash > 0) glow(ctx, 0, 0, 30, '#fef08a', p.flash * 0.8);

  switch (p.kind) {
    case 'wisp': {
      glow(ctx, 0, 0, 22, '#67e8f9', 0.5);
      // tail wisps
      ctx.strokeStyle = 'rgba(103,232,249,0.6)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-6, 4 + i * 2);
        ctx.quadraticCurveTo(-16, 8 + Math.sin(t * 8 + i) * 4, -24, 2 + i * 4);
        ctx.stroke();
      }
      const body = ctx.createRadialGradient(-2, -3, 1, 0, 0, 10);
      body.addColorStop(0, '#ecfeff');
      body.addColorStop(1, '#22d3ee');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 8.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // ears
      ctx.fillStyle = '#a5f3fc';
      ctx.beginPath();
      ctx.moveTo(-7, -5);
      ctx.lineTo(-5, -13);
      ctx.lineTo(-1, -6);
      ctx.moveTo(7, -5);
      ctx.lineTo(5, -13);
      ctx.lineTo(1, -6);
      ctx.fill();
      // face
      ctx.fillStyle = '#083344';
      ctx.beginPath();
      ctx.arc(-3.2, -1, 1.6, 0, Math.PI * 2);
      ctx.arc(3.2, -1, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#083344';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 1.5, 2.2, 0.2, Math.PI - 0.2);
      ctx.stroke();
      break;
    }
    case 'owl': {
      glow(ctx, 0, 0, 24, '#fb923c', 0.3);
      // wings
      for (const sd of [-1, 1]) {
        ctx.save();
        ctx.scale(sd, 1);
        ctx.rotate(-0.3 + flap * 0.5);
        const wg = ctx.createLinearGradient(0, 0, 22, 0);
        wg.addColorStop(0, '#7c2d12');
        wg.addColorStop(1, '#fb923c');
        ctx.fillStyle = wg;
        ctx.beginPath();
        ctx.moveTo(4, -2);
        ctx.quadraticCurveTo(16, -12, 24, -4);
        ctx.lineTo(20, 6);
        ctx.quadraticCurveTo(12, 8, 4, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      // body
      const bg = ctx.createRadialGradient(-2, -3, 1, 0, 0, 11);
      bg.addColorStop(0, '#fed7aa');
      bg.addColorStop(1, '#9a3412');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.ellipse(0, 1, 9, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      // ember eyes
      glow(ctx, -3.4, -3, 5, '#fde68a', 0.9);
      glow(ctx, 3.4, -3, 5, '#fde68a', 0.9);
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(-3.4, -3, 2.4, 0, Math.PI * 2);
      ctx.arc(3.4, -3, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#431407';
      ctx.beginPath();
      ctx.arc(-3.4, -3, 1, 0, Math.PI * 2);
      ctx.arc(3.4, -3, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(-1.5, 0);
      ctx.lineTo(1.5, 0);
      ctx.lineTo(0, 3);
      ctx.closePath();
      ctx.fill();
      // ear tufts
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(-7, -14);
      ctx.lineTo(-2, -9);
      ctx.moveTo(6, -8);
      ctx.lineTo(7, -14);
      ctx.lineTo(2, -9);
      ctx.fill();
      break;
    }
    case 'tortoise': {
      glow(ctx, 0, 0, 26, '#93c5fd', 0.28);
      // legs
      ctx.fillStyle = '#1e3a5f';
      for (const [x, y] of [[-9, 6], [9, 6], [-8, -2], [8, -2]] as [number, number][]) {
        ctx.beginPath();
        ctx.ellipse(x, y + Math.sin(t * 4 + x) * 1, 3.5, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // shell
      const sh = ctx.createRadialGradient(-3, -4, 1, 0, 0, 13);
      sh.addColorStop(0, '#bfdbfe');
      sh.addColorStop(0.5, '#3b82f6');
      sh.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = sh;
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // crystal spines
      for (let i = -2; i <= 2; i++) {
        ctx.fillStyle = i % 2 ? '#dbeafe' : '#93c5fd';
        ctx.beginPath();
        ctx.moveTo(i * 5 - 2.5, -3);
        ctx.lineTo(i * 5, -12 - (i === 0 ? 3 : 0));
        ctx.lineTo(i * 5 + 2.5, -3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(191,219,254,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      // head
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.ellipse(13, 1, 4.5, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0c1a3a';
      ctx.beginPath();
      ctx.arc(14.5, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      // shield charges
      for (let i = 0; i < p.shieldLeft; i++) {
        glow(ctx, -6 + i * 12, -18, 6, '#bfdbfe', 0.9);
        ctx.fillStyle = '#eff6ff';
        ctx.beginPath();
        ctx.arc(-6 + i * 12, -18, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'phoenix': {
      glow(ctx, 0, 0, 30, '#f472b6', 0.4);
      // flame tail
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = ['#fb7185', '#f9a8d4', '#fde68a'][i];
        ctx.lineWidth = 3 - i * 0.7;
        ctx.beginPath();
        ctx.moveTo(-4, 4);
        ctx.quadraticCurveTo(-16 - i * 3, 10 + Math.sin(t * 9 + i) * 5, -30 - i * 4, 4 + i * 6 + Math.sin(t * 7 + i) * 4);
        ctx.stroke();
      }
      ctx.restore();
      // wings
      for (const sd of [-1, 1]) {
        ctx.save();
        ctx.scale(sd, 1);
        ctx.rotate(-0.5 + flap * 0.6);
        const wg = ctx.createLinearGradient(0, 0, 26, 0);
        wg.addColorStop(0, '#be185d');
        wg.addColorStop(0.6, '#f472b6');
        wg.addColorStop(1, '#fde68a');
        ctx.fillStyle = wg;
        ctx.beginPath();
        ctx.moveTo(3, 0);
        ctx.quadraticCurveTo(14, -16, 28, -10);
        ctx.quadraticCurveTo(22, -2, 26, 4);
        ctx.quadraticCurveTo(14, 4, 3, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      const bg = ctx.createRadialGradient(-2, -2, 1, 0, 0, 9);
      bg.addColorStop(0, '#fff1f2');
      bg.addColorStop(1, '#db2777');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      // crest
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(2, -6);
      ctx.quadraticCurveTo(4, -14, 10, -13);
      ctx.moveTo(0, -7);
      ctx.quadraticCurveTo(0, -15, 5, -17);
      ctx.stroke();
      ctx.fillStyle = '#831843';
      ctx.beginPath();
      ctx.arc(3, -1.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(7, -1);
      ctx.lineTo(12, 0.5);
      ctx.lineTo(7, 2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'drake': {
      glow(ctx, 0, 0, 32, '#c084fc', 0.38);
      ctx.save();
      ctx.rotate(p.angle * 0.35);
      // wings (crystal membranes)
      for (const sd of [-1, 1]) {
        ctx.save();
        ctx.scale(1, sd);
        ctx.rotate(0.25 - flap * 0.35);
        const wg = ctx.createLinearGradient(0, 0, 0, 26);
        wg.addColorStop(0, '#6d28d9');
        wg.addColorStop(1, 'rgba(216,180,254,0.35)');
        ctx.fillStyle = wg;
        ctx.beginPath();
        ctx.moveTo(-4, 4);
        ctx.lineTo(-14, 26);
        ctx.lineTo(0, 20);
        ctx.lineTo(10, 26);
        ctx.lineTo(8, 6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#e9d5ff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
      // body + tail
      const bg = ctx.createLinearGradient(-20, 0, 16, 0);
      bg.addColorStop(0, '#3b0764');
      bg.addColorStop(1, '#c084fc');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.quadraticCurveTo(8, -7, -4, -5);
      ctx.quadraticCurveTo(-16, -2 + Math.sin(t * 5) * 3, -26, 2 + Math.sin(t * 6) * 4);
      ctx.quadraticCurveTo(-14, 4, -4, 5);
      ctx.quadraticCurveTo(8, 7, 16, 0);
      ctx.fill();
      ctx.strokeStyle = '#e9d5ff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // horns + eye
      ctx.fillStyle = '#f5d0fe';
      ctx.beginPath();
      ctx.moveTo(6, -5);
      ctx.lineTo(2, -13);
      ctx.lineTo(9, -6);
      ctx.closePath();
      ctx.fill();
      glow(ctx, 10, -1.5, 6, '#f0abfc', 0.9);
      ctx.fillStyle = '#fdf4ff';
      ctx.beginPath();
      ctx.arc(10, -1.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
      // crystal spines
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? '#e9d5ff' : '#a855f7';
        ctx.beginPath();
        ctx.moveTo(-i * 6 + 2, -4);
        ctx.lineTo(-i * 6 + 4, -10 + i);
        ctx.lineTo(-i * 6 + 6, -4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      break;
    }
  }
  ctx.restore();
}

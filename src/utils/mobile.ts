/**
 * Mobile device helpers: haptics, immersive fullscreen + orientation lock.
 * Everything here is best-effort and must never throw — not every browser
 * supports every API (iOS Safari has no vibration API and only partial
 * fullscreen; desktop has no orientation lock).
 */

export const isTouchDevice = (): boolean => {
  try {
    return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  } catch {
    return false;
  }
};

type HapticPattern = number | number[];

/** Fire a short vibration. Silent no-op where unsupported. */
export function haptic(pattern: HapticPattern = 12): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Enter immersive landscape mode: fullscreen (with minimal navigation UI)
 * and a landscape orientation lock where the platform allows it.
 * Returns what actually happened so the UI can hint the user.
 */
export async function enterImmersive(): Promise<{ fullscreen: boolean; locked: boolean }> {
  let fullscreen = false;
  let locked = false;
  try {
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    const fsDoc = document as Document & { webkitFullscreenElement?: Element | null };
    const active = document.fullscreenElement ?? fsDoc.webkitFullscreenElement;
    if (!active) {
      if (el.requestFullscreen) {
        await el.requestFullscreen({ navigationUI: 'hide' });
        fullscreen = true;
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
        fullscreen = true;
      }
    } else {
      fullscreen = true;
    }
  } catch {
    /* user gesture / permission issues — not fatal */
  }
  try {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (o: string) => Promise<void>;
    };
    if (orientation?.lock) {
      await orientation.lock('landscape');
      locked = true;
    }
  } catch {
    /* Chrome requires fullscreen first; iOS doesn't support lock at all */
  }
  return { fullscreen, locked };
}

export async function exitImmersive(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    /* ignore */
  }
}

/** Block iOS pinch/double-tap page zoom gestures that fight the game UI. */
export function installGestureGuards(root: HTMLElement | Window = window): void {
  const target = root as Window & { __etGestureGuards?: boolean };
  if (target.__etGestureGuards) return;
  target.__etGestureGuards = true;
  try {
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('gesturechange', (e) => e.preventDefault());
    document.addEventListener(
      'touchmove',
      (e) => {
        // Only block multi-touch page scrolls; single-finger scrolls inside the
        // pannable board viewport stay untouched (they use pan-x/pan-y CSS).
        if ((e as TouchEvent).touches.length > 1) e.preventDefault();
      },
      { passive: false },
    );
    document.addEventListener('dblclick', (e) => e.preventDefault());
  } catch {
    /* ignore */
  }
}

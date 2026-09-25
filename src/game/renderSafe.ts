/**
 * Render safety helpers.
 *
 * A single negative radius passed to `ctx.ellipse` / `ctx.arc` throws a DOMException.
 * Because the draw call happens inside the requestAnimationFrame callback, that
 * exception used to prevent the next `requestAnimationFrame` from ever being
 * scheduled — which froze the whole game permanently and lost the run.
 * Every radius that is derived from animation (sin/cos) must go through here.
 */

/** Smallest radius canvas accepts without throwing. */
export const MIN_R = 0.01;

/** Clamp a radius to something canvas will accept. Never NaN, never negative. */
export function safeR(v: number): number {
  if (!Number.isFinite(v) || v < MIN_R) return MIN_R;
  return v;
}

/** Clamp both radii of an ellipse. */
export const safeRx = safeR;
export const safeRy = safeR;

/** Clamp start/end angles so they always form a valid, finite arc. */
export function safeAngle(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

/**
 * Run a render step and swallow any drawing error so one bad frame can never
 * kill the animation loop. Errors are reported through `onError` (dev logging,
 * telemetry hooks) instead of propagating into requestAnimationFrame.
 */
export function guardDraw(name: string, fn: () => void, onError?: (where: string, err: unknown) => void): void {
  try {
    fn();
  } catch (err) {
    onError?.(name, err);
  }
}

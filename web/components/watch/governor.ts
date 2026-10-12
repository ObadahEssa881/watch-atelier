/**
 * Keeps the frame rate by giving up quality, one step at a time.
 *
 * It reads the real interval between frames — what the visitor sees, the GPU
 * included — not how long our JavaScript took: a page that is slow because
 * the graphics card is overloaded spends almost no time in JavaScript.
 *
 * - The median of 40 frames, so one stall (a garbage collection, a tab
 *   switch) is not mistaken for load.
 * - Slower than SLOW_MS → one step down the ladder.
 * - A step that does not help (a display capped at 30 Hz, a busy CPU) is
 *   taken back, and the governor stops: lower quality would buy nothing.
 * - It never steps up, so it never oscillates.
 */
export const SLOW_MS = 20.5; // below ~49 frames a second
const WINDOW = 40;
const SETTLE = 20; // frames ignored after a change, while the new size takes effect

export function createGovernor(steps: number, onLevel: (level: number) => void, startSkip = 45) {
  let level = 0;
  let frozen = false;
  let skip = startSkip;
  let judging: { from: number; median: number } | null = null;
  const win: number[] = [];

  const set = (to: number) => {
    level = to;
    win.length = 0;
    skip = SETTLE;
    onLevel(level);
  };

  return {
    /** One frame interval, in milliseconds, between two rendered frames. */
    sample(ms: number) {
      if (frozen) return;
      if (skip > 0) {
        skip--;
        return;
      }
      win.push(ms);
      if (win.length < WINDOW) return;
      const median = win.sort((a, b) => a - b)[WINDOW >> 1];
      win.length = 0;
      if (judging) {
        const before = judging;
        judging = null;
        if (median > before.median * 0.92) {
          frozen = true;
          set(before.from);
          return;
        }
      }
      if (median > SLOW_MS && level < steps - 1) {
        judging = { from: level, median };
        set(level + 1);
      }
    },
    /** For tests and the dev console: jump to a level and stop adjusting. */
    pin(to: number) {
      frozen = true;
      set(Math.max(0, Math.min(steps - 1, to)));
    },
    get level() {
      return level;
    },
    get frozen() {
      return frozen;
    },
  };
}

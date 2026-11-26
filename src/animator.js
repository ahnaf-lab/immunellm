// Plays a sequence of verdict events to a terminal-like writable as ASCII
// animation frames (see immune-animation.js), advancing one frame at a time
// and overwriting the previous frame in place (via a leading carriage
// return) so the effect reads as continuous motion rather than scrolling log
// lines. The actual pause between frames is delegated to an injectable
// `wait()`, so a test can resolve it instantly and assert on the exact
// sequence of writes without waiting on real time.

import { renderVerdictFrames } from "./immune-animation.js";

const DEFAULT_FRAME_DELAY_MS = 120;

/**
 * @param {{
 *   write: (chunk: string) => void,
 *   frameDelayMs?: number,
 *   wait?: (ms: number) => Promise<void>,
 *   width?: number,
 * }} opts
 * @returns {{play: (event: import("./immune-animation.js").VerdictEvent) => Promise<void>}}
 */
export function createAnimator(opts) {
  const {
    write,
    frameDelayMs = DEFAULT_FRAME_DELAY_MS,
    wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    width,
  } = opts;

  /**
   * Plays one verdict event's frames in sequence, finishing with a trailing
   * newline so the settled/neutralized frame is left on screen.
   * @param {import("./immune-animation.js").VerdictEvent} event
   */
  async function play(event) {
    const frames = renderVerdictFrames(event, { width });
    for (let i = 0; i < frames.length; i += 1) {
      write(`\r${frames[i]}`);
      if (i < frames.length - 1) {
        await wait(frameDelayMs);
      }
    }
    write("\n");
  }

  return { play };
}

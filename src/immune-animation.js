// Renders a verdict event (see daemon.js) as a sequence of ASCII animation
// frames: clean text drifts past untouched, a threat gets swarmed by
// antibody glyphs that close in from both margins and leaves a neutralized,
// scrubbed line behind. Frame generation is a pure function of the event and
// fixed step counts -- no randomness, no wall-clock reads -- so the same
// verdict event always produces the exact same frames, which is what makes
// the animation snapshot-testable frame by frame against the labeled
// regression corpus rather than just "eyeballed" in a live terminal.

const DEFAULT_WIDTH = 64;
const DRIFT_FRAME_COUNT = 3;
const SWARM_APPROACH_FRAMES = 4;
const ANTIBODY_UNIT = "<Y>";
const NEUTRALIZED_FILL = "#";

/**
 * @typedef {{seq: number, timestamp: string, text: string, label: string, score: number, evidence: object[]}} VerdictEvent
 */

/**
 * @param {VerdictEvent} event
 * @param {{width?: number}} [opts]
 * @returns {string[]} one fixed-width terminal line per animation frame
 */
export function renderVerdictFrames(event, opts = {}) {
  const width = Math.max(opts.width ?? DEFAULT_WIDTH, event.text.length + 12);
  if (event.label === "clean") {
    return driftFrames(event.text, width);
  }
  return swarmFrames(event.text, event.label, width);
}

/**
 * Clean text drifts past untouched: it slides in from the right over a few
 * frames and settles at the left margin, with no antibody involvement.
 * @param {string} text
 * @param {number} width
 * @returns {string[]}
 */
function driftFrames(text, width) {
  const frames = [];
  for (let step = 0; step < DRIFT_FRAME_COUNT; step += 1) {
    const indent = DRIFT_FRAME_COUNT - 1 - step;
    frames.push(padLine(`${" ".repeat(indent)}${text}`, width));
  }
  return frames;
}

/**
 * A threat line is swarmed: antibody glyphs close in symmetrically from
 * both margins over `SWARM_APPROACH_FRAMES` steps, then a final frame shows
 * the original text scrubbed to a block of `#` of the same length, labeled
 * with the threat type that was neutralized.
 * @param {string} text
 * @param {string} label
 * @param {number} width
 * @returns {string[]}
 */
function swarmFrames(text, label, width) {
  const frames = [];
  for (let step = 0; step < SWARM_APPROACH_FRAMES; step += 1) {
    const distance = SWARM_APPROACH_FRAMES - step;
    const flank = ANTIBODY_UNIT.repeat(distance);
    frames.push(padLine(`${flank} ${text} ${flank}`, width));
  }
  const scrubbed = NEUTRALIZED_FILL.repeat(text.length);
  frames.push(padLine(`[NEUTRALIZED:${label}] ${scrubbed}`, width));
  return frames;
}

/**
 * @param {string} line
 * @param {number} width
 * @returns {string}
 */
function padLine(line, width) {
  if (line.length >= width) {
    return line.slice(0, width);
  }
  return line + " ".repeat(width - line.length);
}

// Wires a tailed line stream to the classifier and emits one structured
// verdict event per non-blank line. This is the daemon loop itself: a
// stream tailer (see tailer.js) hands lines to `ingest`, `ingest` scores
// each one with the classifier built in milestone 2, and every result
// comes back as a plain, serializable event object rather than a bare
// label -- the same evidence-bearing shape the single-shot CLI already
// printed, now with a sequence number and timestamp so a consumer can
// order and correlate events across a long-running stream.

const DEFAULT_NOW = () => new Date().toISOString();

/**
 * @typedef {{seq: number, timestamp: string, text: string, label: string, score: number, evidence: object[]}} VerdictEvent
 */

/**
 * @param {{
 *   classify: (text: string) => {label: string, score: number, evidence: object[]},
 *   onVerdict: (event: VerdictEvent) => void,
 *   now?: () => string,
 * }} opts
 * @returns {{ingest: (text: string) => VerdictEvent | null}}
 */
export function createDaemon(opts) {
  const { classify, onVerdict, now = DEFAULT_NOW } = opts;
  let seq = 0;

  /**
   * Scores one chunk of text and emits a verdict event via `onVerdict`.
   * Blank lines (common in a tailed stream) are skipped and produce no
   * event. Returns the event, or `null` if the line was skipped.
   * @param {string} text
   * @returns {VerdictEvent | null}
   */
  function ingest(text) {
    if (text.trim().length === 0) {
      return null;
    }

    const result = classify(text);
    seq += 1;
    const event = {
      seq,
      timestamp: now(),
      text,
      label: result.label,
      score: Number(result.score.toFixed(4)),
      evidence: result.evidence.map((e) => ({
        ...e,
        score: Number(e.score.toFixed(4)),
      })),
    };
    onVerdict(event);
    return event;
  }

  return { ingest };
}

import { assertProvider } from "./provider.js";
import { buildIndex, knnSearch } from "./knn.js";
import { matchHeuristics } from "./heuristics.js";
import { combineScores } from "./threat-score.js";

const DEFAULT_K = 5;
const DEFAULT_THRESHOLD = 0.15;

/**
 * Builds a classifier that labels text by combining two explainable signals:
 * nearest-neighbor similarity against a labeled corpus, and regex heuristic
 * matches for known attack phrasing and PII formats. See
 * `combineScores` in threat-score.js for how the two are merged.
 *
 * @param {{embedder: {dims: number, embed: (text: string) => number[]}, corpus: {id: string, text: string, label: string}[], k?: number, threshold?: number}} opts
 */
export function createClassifier(opts) {
  const embedder = assertProvider(opts.embedder);
  const k = opts.k ?? DEFAULT_K;
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const index = buildIndex(embedder, opts.corpus);

  /**
   * @param {string} text
   */
  function classify(text) {
    const queryVector = embedder.embed(text);
    const neighbors = knnSearch(queryVector, index, k).map(
      ({ entry, score }) => ({
        id: entry.id,
        label: entry.label,
        text: entry.text,
        score,
      }),
    );
    const heuristicMatches = matchHeuristics(text);
    const { label, score, evidence } = combineScores({ neighbors, heuristicMatches, threshold });

    return { label, score, evidence, neighbors };
  }

  return { classify, index };
}

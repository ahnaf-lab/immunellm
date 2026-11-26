import { assertProvider } from "./provider.js";
import { buildIndex, knnSearch } from "./knn.js";

const DEFAULT_K = 5;
const DEFAULT_THRESHOLD = 0.15;
const CLEAN_LABEL = "clean";

/**
 * Builds a classifier that labels text by nearest-neighbor vote against a
 * labeled corpus. If the best match's similarity is below `threshold`, the
 * text is treated as clean rather than forced into the nearest label --
 * a corpus of known attacks has no "this is definitely safe" examples to
 * match against, so low similarity to everything is itself the clean signal.
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

    const top = neighbors[0];
    if (!top || top.score < threshold) {
      return { label: CLEAN_LABEL, score: top ? top.score : 0, neighbors };
    }

    const votes = new Map();
    for (const neighbor of neighbors) {
      votes.set(neighbor.label, (votes.get(neighbor.label) ?? 0) + neighbor.score);
    }
    let bestLabel = top.label;
    let bestVote = -Infinity;
    for (const [label, vote] of votes) {
      if (vote > bestVote) {
        bestVote = vote;
        bestLabel = label;
      }
    }

    return { label: bestLabel, score: top.score, neighbors };
  }

  return { classify, index };
}

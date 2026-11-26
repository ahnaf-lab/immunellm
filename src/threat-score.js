// Combines two independent signals into one explainable threat score:
//
//   - kNN similarity votes (how close is this text to known corpus entries?)
//   - regex heuristic matches (does this text contain a known attack phrase
//     or PII format outright, regardless of corpus similarity?)
//
// Both channels can fire alone: a novel PII format with no close corpus
// neighbor still trips the regex heuristics, and a paraphrased injection
// attempt with no exact phrase match still trips kNN similarity. Keeping
// them as separate, labeled evidence (rather than folding them into a single
// opaque number first) is what makes the final score explainable -- every
// point of score traces back to a specific neighbor or matched pattern.

const CLEAN_LABEL = "clean";
const DEFAULT_KNN_WEIGHT = 0.6;
const DEFAULT_HEURISTIC_WEIGHT = 0.4;
const DEFAULT_THRESHOLD = 0.15;

/**
 * @typedef {{id: string, label: string, score: number}} KnnNeighbor
 * @typedef {{id: string, label: string, weight: number, match: string}} HeuristicMatch
 * @typedef {{source: "knn", id: string, label: string, score: number} | {source: "heuristic", id: string, label: string, score: number, match: string}} Evidence
 */

/**
 * @param {{
 *   neighbors: KnnNeighbor[],
 *   heuristicMatches: HeuristicMatch[],
 *   threshold?: number,
 *   knnWeight?: number,
 *   heuristicWeight?: number,
 * }} opts
 * @returns {{label: string, score: number, evidence: Evidence[]}}
 */
export function combineScores(opts) {
  const {
    neighbors,
    heuristicMatches,
    threshold = DEFAULT_THRESHOLD,
    knnWeight = DEFAULT_KNN_WEIGHT,
    heuristicWeight = DEFAULT_HEURISTIC_WEIGHT,
  } = opts;

  const knnVotes = new Map();
  for (const neighbor of neighbors) {
    knnVotes.set(neighbor.label, Math.max(knnVotes.get(neighbor.label) ?? 0, neighbor.score));
  }

  const heuristicVotes = new Map();
  for (const match of heuristicMatches) {
    heuristicVotes.set(match.label, Math.max(heuristicVotes.get(match.label) ?? 0, match.weight));
  }

  const labels = new Set([...knnVotes.keys(), ...heuristicVotes.keys()]);
  let bestLabel = CLEAN_LABEL;
  let bestScore = 0;
  for (const label of labels) {
    const combined = knnWeight * (knnVotes.get(label) ?? 0) + heuristicWeight * (heuristicVotes.get(label) ?? 0);
    if (combined > bestScore) {
      bestScore = combined;
      bestLabel = label;
    }
  }

  // A regex heuristic match is treated as trustworthy on its own -- a
  // credit-card-shaped number is PII evidence even if the corpus has nothing
  // similar. Pure kNN similarity below `threshold` is too weak to trust.
  const passesThreshold = bestScore >= threshold || (heuristicVotes.get(bestLabel) ?? 0) > 0;
  const label = passesThreshold ? bestLabel : CLEAN_LABEL;

  const evidence = [
    ...neighbors
      .filter((neighbor) => neighbor.score >= threshold)
      .map((neighbor) => ({ source: "knn", id: neighbor.id, label: neighbor.label, score: neighbor.score })),
    ...heuristicMatches.map((match) => ({
      source: "heuristic",
      id: match.id,
      label: match.label,
      score: match.weight,
      match: match.match,
    })),
  ];

  return { label, score: bestScore, evidence };
}

import { cosineSimilarity } from "./vector-math.js";

/**
 * @typedef {{id: string, text: string, label: string, vector: number[]}} IndexedEntry
 */

/**
 * Builds an index by embedding every corpus entry once.
 * @param {{embed: (text: string) => number[]}} embedder
 * @param {{id: string, text: string, label: string}[]} corpus
 * @returns {IndexedEntry[]}
 */
export function buildIndex(embedder, corpus) {
  return corpus.map((entry) => ({
    ...entry,
    vector: embedder.embed(entry.text),
  }));
}

/**
 * Cosine-similarity nearest-neighbor search over a pre-built index.
 * @param {number[]} queryVector
 * @param {IndexedEntry[]} index
 * @param {number} k
 * @returns {{entry: IndexedEntry, score: number}[]} top `k` matches, descending by score
 */
export function knnSearch(queryVector, index, k = 5) {
  const scored = index.map((entry) => ({
    entry,
    score: cosineSimilarity(queryVector, entry.vector),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(0, k));
}

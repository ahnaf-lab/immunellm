import { normalize } from "./vector-math.js";

// Hashed character n-gram embedding stub. This is the provider implementation
// referenced in provider.js: it satisfies { dims, embed(text) } and is
// fully deterministic, so it is also the "fake" used by every test.
//
// Each character n-gram of the (lowercased) input is hashed with FNV-1a into
// a fixed-width bucket vector (the classic "hashing trick" used to avoid
// maintaining a vocabulary). Bucket collisions are the accepted tradeoff for
// not needing a trained vocabulary -- acceptable for a corpus this size, and
// cheap to swap for a real embedding model later via the provider interface.

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/**
 * 32-bit FNV-1a hash of a string.
 * @param {string} str
 */
export function fnv1a(str) {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  // Force unsigned 32-bit.
  return hash >>> 0;
}

/**
 * Character n-grams of `text`. Text shorter than `n` yields the whole text
 * as a single gram so short inputs still produce a non-zero embedding.
 * @param {string} text
 * @param {number} n
 * @returns {string[]}
 */
export function charNgrams(text, n) {
  if (text.length === 0) return [];
  if (text.length < n) return [text];
  const grams = [];
  for (let i = 0; i <= text.length - n; i++) {
    grams.push(text.slice(i, i + n));
  }
  return grams;
}

/**
 * Creates a deterministic hashed n-gram embedding provider.
 * @param {{dims?: number, n?: number}} [opts]
 * @returns {{dims: number, embed: (text: string) => number[]}}
 */
export function createNgramEmbedder(opts = {}) {
  const dims = opts.dims ?? 256;
  const n = opts.n ?? 3;

  /** @param {string} text */
  function embed(text) {
    const vector = new Array(dims).fill(0);
    const normalized = text.toLowerCase().trim();
    for (const gram of charNgrams(normalized, n)) {
      const bucket = fnv1a(gram) % dims;
      // A second hash bit decides the sign, which spreads collisions so they
      // partially cancel out instead of always stacking constructively.
      const sign = fnv1a(`${gram}#sign`) % 2 === 0 ? 1 : -1;
      vector[bucket] += sign;
    }
    return normalize(vector);
  }

  return { dims, embed };
}

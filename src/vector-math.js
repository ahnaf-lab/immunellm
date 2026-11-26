// Small, dependency-free vector math used by the embedder and the kNN search.

/**
 * @param {number[]} a
 * @param {number[]} b
 */
export function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/** @param {number[]} a */
export function magnitude(a) {
  return Math.sqrt(dot(a, a));
}

/**
 * Returns a unit-length copy of `v`. A zero vector is returned unchanged
 * (there is no meaningful direction to normalize to).
 * @param {number[]} v
 */
export function normalize(v) {
  const mag = magnitude(v);
  if (mag === 0) return v.slice();
  return v.map((x) => x / mag);
}

/**
 * Cosine similarity in [-1, 1]. Two zero vectors are defined as
 * similarity 0 rather than NaN, since "no signal" should not match itself.
 * @param {number[]} a
 * @param {number[]} b
 */
export function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new RangeError(
      `vector length mismatch: ${a.length} !== ${b.length}`,
    );
  }
  const denom = magnitude(a) * magnitude(b);
  if (denom === 0) return 0;
  return dot(a, b) / denom;
}

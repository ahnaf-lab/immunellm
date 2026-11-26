import { test } from "node:test";
import assert from "node:assert/strict";
import { dot, magnitude, normalize, cosineSimilarity } from "../src/vector-math.js";

test("dot computes the dot product", () => {
  assert.equal(dot([1, 2, 3], [4, 5, 6]), 32);
});

test("magnitude computes the L2 norm", () => {
  assert.equal(magnitude([3, 4]), 5);
});

test("normalize returns a unit vector", () => {
  const unit = normalize([3, 4]);
  assert.ok(Math.abs(magnitude(unit) - 1) < 1e-9);
  assert.ok(Math.abs(unit[0] - 0.6) < 1e-9);
  assert.ok(Math.abs(unit[1] - 0.8) < 1e-9);
});

test("normalize leaves a zero vector unchanged", () => {
  assert.deepEqual(normalize([0, 0, 0]), [0, 0, 0]);
});

test("cosineSimilarity is 1 for identical vectors", () => {
  assert.ok(Math.abs(cosineSimilarity([1, 2, 3], [1, 2, 3]) - 1) < 1e-9);
});

test("cosineSimilarity is 0 for orthogonal vectors", () => {
  assert.ok(Math.abs(cosineSimilarity([1, 0], [0, 1])) < 1e-9);
});

test("cosineSimilarity is -1 for opposite vectors", () => {
  assert.ok(Math.abs(cosineSimilarity([1, 2], [-1, -2]) + 1) < 1e-9);
});

test("cosineSimilarity treats zero vectors as similarity 0, not NaN", () => {
  assert.equal(cosineSimilarity([0, 0], [1, 1]), 0);
});

test("cosineSimilarity rejects mismatched lengths", () => {
  assert.throws(() => cosineSimilarity([1, 2], [1, 2, 3]), RangeError);
});

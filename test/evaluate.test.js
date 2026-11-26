import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateCorpus } from "../src/evaluate.js";
import { createNgramEmbedder } from "../src/ngram-embedder.js";
import { loadCorpus, loadRegressionCorpus } from "../src/corpus.js";
import { createClassifier } from "../src/classifier.js";

// A fake classifier with known, fixed mistakes exercises the precision/
// recall math directly, independent of the real embedder or corpus.
function fakeClassify(text) {
  const label = { a: "injection", b: "injection", c: "pii", d: "clean" }[text];
  return { label };
}

test("evaluateCorpus computes precision, recall, and f1 from a known confusion pattern", () => {
  // "a" -> correctly injection, "b" -> actually pii but predicted injection
  // (a false positive for injection, a false negative for pii), "c" ->
  // correctly pii, "d" -> correctly clean.
  const cases = [
    { id: "1", text: "a", label: "injection" },
    { id: "2", text: "b", label: "pii" },
    { id: "3", text: "c", label: "pii" },
    { id: "4", text: "d", label: "clean" },
  ];

  const report = evaluateCorpus({ classify: fakeClassify, cases });

  assert.equal(report.total, 4);
  assert.equal(report.accuracy, 3 / 4);

  // injection: 1 true positive ("a"), 1 false positive ("b" predicted
  // injection but was pii) -> precision 1/2, recall 1/1.
  assert.equal(report.perLabel.injection.precision, 0.5);
  assert.equal(report.perLabel.injection.recall, 1);

  // pii: 1 true positive ("c"), 1 false negative ("b") -> precision 1/1,
  // recall 1/2.
  assert.equal(report.perLabel.pii.precision, 1);
  assert.equal(report.perLabel.pii.recall, 0.5);

  assert.equal(report.misclassified.length, 1);
  assert.deepEqual(report.misclassified[0], {
    id: "2",
    text: "b",
    expected: "pii",
    predicted: "injection",
  });
});

test("evaluateCorpus reports perfect scores when every prediction is correct", () => {
  const cases = [
    { id: "1", text: "a", label: "injection" },
    { id: "2", text: "c", label: "pii" },
    { id: "3", text: "d", label: "clean" },
  ];

  const report = evaluateCorpus({ classify: fakeClassify, cases });

  assert.equal(report.accuracy, 1);
  assert.equal(report.misclassified.length, 0);
  for (const label of ["injection", "pii", "clean"]) {
    assert.equal(report.perLabel[label].precision, 1);
    assert.equal(report.perLabel[label].recall, 1);
    assert.equal(report.perLabel[label].f1, 1);
  }
});

test("loadRegressionCorpus returns labeled cases disjoint from the kNN index corpus", () => {
  const indexCorpus = loadCorpus();
  const regressionCorpus = loadRegressionCorpus();

  assert.ok(regressionCorpus.length >= 10);
  const indexIds = new Set(indexCorpus.map((entry) => entry.id));
  for (const testCase of regressionCorpus) {
    assert.ok(!indexIds.has(testCase.id));
  }
});

test("classifier generalizes to the held-out regression corpus within accuracy and recall bounds", () => {
  const embedder = createNgramEmbedder();
  const corpus = loadCorpus();
  const { classify } = createClassifier({ embedder, corpus });

  const report = evaluateCorpus({ classify, cases: loadRegressionCorpus() });

  // These are regression floors, not targets: this test exists to catch a
  // future change to the embedder, kNN weighting, or heuristics that quietly
  // degrades real-world accuracy, not to demand perfection from a hashed
  // n-gram stub.
  assert.ok(
    report.accuracy >= 0.8,
    `overall accuracy ${report.accuracy} dropped below the 0.8 floor`,
  );
  for (const label of ["injection", "pii", "clean"]) {
    assert.ok(
      report.perLabel[label].recall >= 0.7,
      `${label} recall ${report.perLabel[label].recall} dropped below the 0.7 floor`,
    );
  }
});

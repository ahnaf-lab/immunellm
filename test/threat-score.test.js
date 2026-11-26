import { test } from "node:test";
import assert from "node:assert/strict";
import { combineScores } from "../src/threat-score.js";

test("combineScores picks the label with the highest blended score", () => {
  const result = combineScores({
    neighbors: [
      { id: "inj-001", label: "injection", score: 0.8 },
      { id: "clean-001", label: "clean", score: 0.1 },
    ],
    heuristicMatches: [],
  });
  assert.equal(result.label, "injection");
  assert.ok(result.score > 0);
});

test("combineScores trusts a heuristic match even with no strong neighbor", () => {
  const result = combineScores({
    neighbors: [{ id: "clean-001", label: "clean", score: 0.05 }],
    heuristicMatches: [{ id: "h-pii-ssn", label: "pii", weight: 0.95, match: "078-05-1120" }],
  });
  assert.equal(result.label, "pii");
});

test("combineScores falls back to clean when nothing clears the threshold", () => {
  const result = combineScores({
    neighbors: [{ id: "inj-001", label: "injection", score: 0.05 }],
    heuristicMatches: [],
    threshold: 0.15,
  });
  assert.equal(result.label, "clean");
});

test("combineScores records evidence from both the knn and heuristic channels", () => {
  const result = combineScores({
    neighbors: [{ id: "inj-001", label: "injection", score: 0.5 }],
    heuristicMatches: [{ id: "h-inj-ignore-instructions", label: "injection", weight: 0.9, match: "ignore previous instructions" }],
    threshold: 0.15,
  });
  assert.ok(result.evidence.some((e) => e.source === "knn" && e.id === "inj-001"));
  assert.ok(result.evidence.some((e) => e.source === "heuristic" && e.id === "h-inj-ignore-instructions"));
});

test("combineScores excludes knn neighbors below the similarity threshold from evidence", () => {
  const result = combineScores({
    neighbors: [{ id: "clean-001", label: "clean", score: 0.02 }],
    heuristicMatches: [],
    threshold: 0.15,
  });
  assert.equal(result.evidence.length, 0);
});

// Golden-frame regression test: every case in the held-out regression
// corpus (data/regression-corpus.json) is classified and rendered to ASCII
// animation frames, then compared byte-for-byte against the frozen fixture
// in test/fixtures/golden-frames.json. Unlike animation-regression.test.js
// (which inlines a handful of frames for a single fixed stream), this test
// walks the *entire* labeled regression corpus, so any change to the
// embedder, kNN weighting, heuristics, or frame renderer that shifts a
// single character of output on any case shows up as a diff here.
//
// To intentionally update the fixture after a deliberate behavior change,
// regenerate it with the same classify -> renderVerdictFrames pipeline used
// below and review the diff before committing it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createNgramEmbedder } from "../src/ngram-embedder.js";
import { loadCorpus, loadRegressionCorpus } from "../src/corpus.js";
import { createClassifier } from "../src/classifier.js";
import { renderVerdictFrames } from "../src/immune-animation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, "fixtures", "golden-frames.json");

test("every held-out regression case renders to its frozen golden frames", () => {
  const golden = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
  const cases = loadRegressionCorpus();

  assert.equal(golden.length, cases.length, "fixture is out of sync with the regression corpus size");

  const embedder = createNgramEmbedder();
  const corpus = loadCorpus();
  const { classify } = createClassifier({ embedder, corpus });

  for (let i = 0; i < cases.length; i++) {
    const testCase = cases[i];
    const expected = golden[i];
    assert.equal(testCase.id, expected.id, `fixture order drifted at index ${i}`);

    const result = classify(testCase.text);
    const event = {
      seq: i + 1,
      timestamp: "2026-01-01T00:00:00.000Z",
      text: testCase.text,
      label: result.label,
      score: result.score,
      evidence: result.evidence,
    };
    const frames = renderVerdictFrames(event, { width: 90 });

    assert.equal(result.label, expected.label, `${testCase.id}: predicted label drifted from the frozen fixture`);
    assert.deepEqual(frames, expected.frames, `${testCase.id}: animation frames drifted from the frozen fixture`);
  }
});

test("golden frame fixture marks every threat case as neutralized and every clean case as untouched", () => {
  const golden = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
  assert.ok(golden.length >= 10);

  for (const entry of golden) {
    const lastFrame = entry.frames.at(-1);
    if (entry.label === "clean") {
      assert.ok(!lastFrame.includes("NEUTRALIZED"), `${entry.id}: clean case should never be neutralized`);
    } else {
      assert.ok(
        lastFrame.startsWith(`[NEUTRALIZED:${entry.label}]`),
        `${entry.id}: threat case should end neutralized with its label`,
      );
    }
  }
});

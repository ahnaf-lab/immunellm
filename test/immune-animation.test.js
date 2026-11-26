import { test } from "node:test";
import assert from "node:assert/strict";
import { renderVerdictFrames } from "../src/immune-animation.js";

test("renderVerdictFrames drifts clean text in from the right and settles at the margin", () => {
  const event = { seq: 1, timestamp: "t", text: "hello there", label: "clean", score: 0, evidence: [] };

  const frames = renderVerdictFrames(event, { width: 30 });

  assert.equal(frames.length, 3);
  assert.equal(frames[0].indexOf("hello there"), 2);
  assert.equal(frames[1].indexOf("hello there"), 1);
  assert.equal(frames[2].indexOf("hello there"), 0);
  for (const frame of frames) {
    assert.equal(frame.length, 30);
  }
});

test("renderVerdictFrames swarms a threat with antibodies that close in, then neutralizes it", () => {
  const event = { seq: 2, timestamp: "t", text: "attack", label: "injection", score: 0.9, evidence: [] };

  const frames = renderVerdictFrames(event, { width: 40 });

  assert.equal(frames.length, 5);
  assert.ok(frames[0].startsWith("<Y><Y><Y><Y> attack <Y><Y><Y><Y>"));
  assert.ok(frames[1].startsWith("<Y><Y><Y> attack <Y><Y><Y>"));
  assert.ok(frames[2].startsWith("<Y><Y> attack <Y><Y>"));
  assert.ok(frames[3].startsWith("<Y> attack <Y>"));
  assert.ok(frames[4].startsWith("[NEUTRALIZED:injection] ######"));
  for (const frame of frames) {
    assert.equal(frame.length, 40);
  }
});

test("renderVerdictFrames is a pure function of the event: same input, same frames every time", () => {
  const event = { seq: 3, timestamp: "t", text: "my ssn is 123-45-6789", label: "pii", score: 0.8, evidence: [] };

  const first = renderVerdictFrames(event);
  const second = renderVerdictFrames(event);

  assert.deepEqual(first, second);
});

test("renderVerdictFrames widens the default width to fit long text instead of truncating it", () => {
  const longText = "a".repeat(80);
  const event = { seq: 4, timestamp: "t", text: longText, label: "clean", score: 0, evidence: [] };

  const frames = renderVerdictFrames(event);

  for (const frame of frames) {
    assert.ok(frame.includes(longText));
  }
});

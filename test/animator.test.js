import { test } from "node:test";
import assert from "node:assert/strict";
import { createAnimator } from "../src/animator.js";
import { renderVerdictFrames } from "../src/immune-animation.js";

test("animator.play writes every frame in order, each preceded by a carriage return", async () => {
  const chunks = [];
  const waits = [];
  const animator = createAnimator({
    write: (chunk) => chunks.push(chunk),
    wait: (ms) => {
      waits.push(ms);
      return Promise.resolve();
    },
  });
  const event = { seq: 1, timestamp: "t", text: "hi", label: "clean", score: 0, evidence: [] };

  await animator.play(event);

  const expectedFrames = renderVerdictFrames(event, { width: undefined });
  assert.equal(chunks.length, expectedFrames.length + 1);
  for (let i = 0; i < expectedFrames.length; i += 1) {
    assert.equal(chunks[i], `\r${expectedFrames[i]}`);
  }
  assert.equal(chunks.at(-1), "\n");
});

test("animator.play waits between frames but not after the last one", async () => {
  const waits = [];
  const animator = createAnimator({
    write: () => {},
    frameDelayMs: 50,
    wait: (ms) => {
      waits.push(ms);
      return Promise.resolve();
    },
  });
  const event = { seq: 1, timestamp: "t", text: "attack now", label: "injection", score: 0.9, evidence: [] };

  await animator.play(event);

  const frameCount = renderVerdictFrames(event, { width: undefined }).length;
  assert.deepEqual(waits, Array(frameCount - 1).fill(50));
});

test("animator.play resolves only after the final frame is written", async () => {
  const order = [];
  const animator = createAnimator({
    write: (chunk) => order.push(chunk),
    wait: () => Promise.resolve(),
  });
  const event = { seq: 1, timestamp: "t", text: "clean text", label: "clean", score: 0, evidence: [] };

  await animator.play(event);

  assert.equal(order.at(-1), "\n");
  assert.ok(order.length > 1);
});

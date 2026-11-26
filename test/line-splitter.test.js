import { test } from "node:test";
import assert from "node:assert/strict";
import { createLineSplitter } from "../src/line-splitter.js";

test("createLineSplitter emits a line split across two chunks", () => {
  const lines = [];
  const splitter = createLineSplitter((line) => lines.push(line));
  splitter.push("hello wo");
  assert.deepEqual(lines, []);
  splitter.push("rld\n");
  assert.deepEqual(lines, ["hello world"]);
});

test("createLineSplitter emits multiple lines from one chunk in order", () => {
  const lines = [];
  const splitter = createLineSplitter((line) => lines.push(line));
  splitter.push("first\nsecond\nthird\n");
  assert.deepEqual(lines, ["first", "second", "third"]);
});

test("createLineSplitter strips a trailing carriage return", () => {
  const lines = [];
  const splitter = createLineSplitter((line) => lines.push(line));
  splitter.push("windows style\r\n");
  assert.deepEqual(lines, ["windows style"]);
});

test("createLineSplitter withholds a trailing partial line until flush", () => {
  const lines = [];
  const splitter = createLineSplitter((line) => lines.push(line));
  splitter.push("no newline yet");
  assert.deepEqual(lines, []);
  splitter.flush();
  assert.deepEqual(lines, ["no newline yet"]);
});

test("createLineSplitter flush is a no-op when the buffer is empty", () => {
  const lines = [];
  const splitter = createLineSplitter((line) => lines.push(line));
  splitter.push("complete\n");
  splitter.flush();
  assert.deepEqual(lines, ["complete"]);
});

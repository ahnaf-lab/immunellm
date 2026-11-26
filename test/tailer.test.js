import { test } from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { mkdtempSync, writeFileSync, appendFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { tailReadable, createFileTailer } from "../src/tailer.js";

test("tailReadable emits complete lines as they arrive on the stream", () => {
  const lines = [];
  const stream = new PassThrough();
  tailReadable(stream, (line) => lines.push(line));

  stream.write("alpha\nbeta\n");
  assert.deepEqual(lines, ["alpha", "beta"]);
});

test("tailReadable flushes a trailing partial line when the stream ends", async () => {
  const lines = [];
  const stream = new PassThrough();
  tailReadable(stream, (line) => lines.push(line));

  const ended = new Promise((resolve) => stream.on("end", resolve));
  stream.end("no trailing newline");
  await ended;
  assert.deepEqual(lines, ["no trailing newline"]);
});

test("tailReadable stop() detaches listeners and flushes any partial line", () => {
  const lines = [];
  const stream = new PassThrough();
  const stop = tailReadable(stream, (line) => lines.push(line));

  stream.write("buffered");
  stop();
  assert.deepEqual(lines, ["buffered"]);

  stream.write("after stop\n");
  assert.deepEqual(lines, ["buffered"]);
});

test("createFileTailer reads only bytes appended since the last poll", () => {
  const dir = mkdtempSync(join(tmpdir(), "immunellm-tailer-"));
  const path = join(dir, "stream.log");
  writeFileSync(path, "line one\n");

  try {
    const lines = [];
    const tailer = createFileTailer(path, {
      onLine: (line) => lines.push(line),
      fromStart: true,
    });

    tailer.poll();
    assert.deepEqual(lines, ["line one"]);

    appendFileSync(path, "line two\nline three\n");
    tailer.poll();
    assert.deepEqual(lines, ["line one", "line two", "line three"]);

    tailer.poll();
    assert.deepEqual(lines, ["line one", "line two", "line three"]);

    tailer.stop();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("createFileTailer with fromStart: false skips content already in the file", () => {
  const dir = mkdtempSync(join(tmpdir(), "immunellm-tailer-"));
  const path = join(dir, "stream.log");
  writeFileSync(path, "already here\n");

  try {
    const lines = [];
    const tailer = createFileTailer(path, { onLine: (line) => lines.push(line) });

    tailer.poll();
    assert.deepEqual(lines, []);

    appendFileSync(path, "new line\n");
    tailer.poll();
    assert.deepEqual(lines, ["new line"]);

    tailer.stop();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

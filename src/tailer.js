// Tails a text stream -- either a live Node readable (stdin, or any
// stream-shaped object, which is what lets tests use a plain in-memory
// PassThrough instead of a real pipe) or a file on disk the way `tail -f`
// does. Both hand complete lines to the caller via `createLineSplitter`.

import { openSync, closeSync, fstatSync, readSync } from "node:fs";
import { createLineSplitter } from "./line-splitter.js";

/**
 * Attaches a line splitter to a Node readable stream and calls `onLine`
 * for every complete line that arrives. Returns a `stop()` that detaches
 * the listeners; any buffered partial line is flushed when the stream ends
 * or when `stop()` is called directly.
 *
 * @param {NodeJS.ReadableStream} readable
 * @param {(line: string) => void} onLine
 * @returns {() => void} stop
 */
export function tailReadable(readable, onLine) {
  const splitter = createLineSplitter(onLine);
  readable.setEncoding?.("utf8");

  function handleData(chunk) {
    splitter.push(chunk);
  }
  function handleEnd() {
    splitter.flush();
  }

  readable.on("data", handleData);
  readable.on("end", handleEnd);

  return function stop() {
    readable.off("data", handleData);
    readable.off("end", handleEnd);
    splitter.flush();
  };
}

/**
 * Tails a file on disk: starts at the current end of the file (or the
 * beginning, with `fromStart: true`) and, on each `poll()` call, reads and
 * emits any bytes appended since the last poll as complete lines via
 * `onLine`. Driving `poll()` on a timer is the caller's responsibility, so
 * the read itself stays synchronous and deterministic -- a test can call
 * `poll()` directly after writing to the file instead of waiting on a real
 * filesystem watch event.
 *
 * @param {string} path
 * @param {{onLine: (line: string) => void, fromStart?: boolean}} opts
 * @returns {{poll: () => void, stop: () => void}}
 */
export function createFileTailer(path, opts) {
  const { onLine, fromStart = false } = opts;
  const splitter = createLineSplitter(onLine);
  const fd = openSync(path, "r");
  let position = fromStart ? 0 : fstatSync(fd).size;

  function poll() {
    const size = fstatSync(fd).size;
    if (size < position) {
      // File was truncated or rotated out from under us; start over.
      position = 0;
    }
    if (size === position) {
      return;
    }
    const length = size - position;
    const buffer = Buffer.alloc(length);
    readSync(fd, buffer, 0, length, position);
    position = size;
    splitter.push(buffer.toString("utf8"));
  }

  function stop() {
    splitter.flush();
    closeSync(fd);
  }

  return { poll, stop };
}

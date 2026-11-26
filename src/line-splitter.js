// Splits an incoming stream of text chunks into complete lines.
//
// Reads from a stream (stdin, a file, a socket) arrive as arbitrary chunks
// that can split a line anywhere. This buffers any incomplete trailing line
// across calls to `push` and only calls `onLine` once a full line has
// arrived, so a stream tailer always hands downstream code one complete
// chunk of text at a time instead of a ragged partial line.

/**
 * @param {(line: string) => void} onLine
 * @returns {{push: (chunk: string) => void, flush: () => void}}
 */
export function createLineSplitter(onLine) {
  let buffer = "";

  function push(chunk) {
    buffer += chunk;
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex).replace(/\r$/, "");
      buffer = buffer.slice(newlineIndex + 1);
      onLine(line);
    }
  }

  /** Emits any buffered partial line (e.g. at end-of-stream) and clears it. */
  function flush() {
    if (buffer.length > 0) {
      const line = buffer.replace(/\r$/, "");
      buffer = "";
      onLine(line);
    }
  }

  return { push, flush };
}

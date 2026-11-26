#!/usr/bin/env node
import { createNgramEmbedder } from "../src/ngram-embedder.js";
import { loadCorpus } from "../src/corpus.js";
import { createClassifier } from "../src/classifier.js";
import { createDaemon } from "../src/daemon.js";
import { tailReadable, createFileTailer } from "../src/tailer.js";
import { createAnimator } from "../src/animator.js";

const WATCH_POLL_INTERVAL_MS = 200;

/**
 * Reads all of stdin as a UTF-8 string. Resolves to "" if stdin is a TTY
 * with nothing piped in.
 */
function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve("");
      return;
    }
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
  });
}

function buildClassifier() {
  const embedder = createNgramEmbedder();
  const corpus = loadCorpus();
  return createClassifier({ embedder, corpus });
}

function roundForDisplay(result) {
  return {
    label: result.label,
    score: Number(result.score.toFixed(4)),
    evidence: result.evidence.map((e) => ({
      ...e,
      score: Number(e.score.toFixed(4)),
    })),
  };
}

function printVerdict(event) {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}

/**
 * Builds an `onVerdict` handler that plays each event's ASCII swarm/drift
 * animation to stdout instead of printing raw JSON. Plays are chained
 * through a promise queue so events that arrive faster than the animation
 * can finish still play out fully, in order, rather than interleaving.
 */
function createAnimatedOnVerdict() {
  const animator = createAnimator({ write: (chunk) => process.stdout.write(chunk) });
  let queue = Promise.resolve();
  return function onVerdict(event) {
    queue = queue.then(() => animator.play(event));
  };
}

async function runOnce(text) {
  const { classify } = buildClassifier();
  const result = roundForDisplay(classify(text));
  process.stdout.write(`${JSON.stringify({ text, ...result }, null, 2)}\n`);
}

/**
 * Daemon loop: tails stdin (no `path`) or a file (`tail -f` style) and
 * prints one JSON verdict event per non-blank line to stdout as it arrives,
 * or, with `animate: true`, plays the ASCII swarm/drift animation for each
 * event instead.
 * @param {string | undefined} path
 * @param {{animate?: boolean}} [opts]
 */
async function runWatch(path, opts = {}) {
  const { classify } = buildClassifier();
  const onVerdict = opts.animate ? createAnimatedOnVerdict() : printVerdict;
  const daemon = createDaemon({ classify, onVerdict });

  if (!path) {
    tailReadable(process.stdin, daemon.ingest);
    process.stdin.resume();
    return;
  }

  let tailer;
  try {
    tailer = createFileTailer(path, { onLine: daemon.ingest });
  } catch (err) {
    process.stderr.write(`immunellm: cannot watch ${path}: ${err.message}\n`);
    process.exitCode = 1;
    return;
  }

  const interval = setInterval(() => tailer.poll(), WATCH_POLL_INTERVAL_MS);
  const shutdown = () => {
    clearInterval(interval);
    tailer.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "watch") {
    const rest = args.slice(1);
    const animate = rest.includes("--animate");
    const path = rest.find((arg) => arg !== "--animate");
    await runWatch(path, { animate });
    return;
  }

  const argText = args.join(" ");
  const text = argText.length > 0 ? argText : (await readStdin()).trim();

  if (!text) {
    process.stderr.write(
      "usage: immunellm <text to check>              classify one piece of text (or pipe via stdin)\n" +
        "       immunellm watch [file]                 daemon loop: tail stdin or a file, one verdict event per line\n" +
        "       immunellm watch [file] --animate       daemon loop, rendered as an ASCII swarm/drift animation\n",
    );
    process.exitCode = 1;
    return;
  }

  await runOnce(text);
}

main();

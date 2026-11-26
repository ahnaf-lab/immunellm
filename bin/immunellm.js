#!/usr/bin/env node
import { createNgramEmbedder } from "../src/ngram-embedder.js";
import { loadCorpus } from "../src/corpus.js";
import { createClassifier } from "../src/classifier.js";
import { createDaemon } from "../src/daemon.js";
import { tailReadable, createFileTailer } from "../src/tailer.js";

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

async function runOnce(text) {
  const { classify } = buildClassifier();
  const result = roundForDisplay(classify(text));
  process.stdout.write(`${JSON.stringify({ text, ...result }, null, 2)}\n`);
}

/**
 * Daemon loop: tails stdin (no `path`) or a file (`tail -f` style) and
 * prints one JSON verdict event per non-blank line to stdout as it arrives.
 * @param {string | undefined} path
 */
async function runWatch(path) {
  const { classify } = buildClassifier();
  const daemon = createDaemon({ classify, onVerdict: printVerdict });

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
    await runWatch(args[1]);
    return;
  }

  const argText = args.join(" ");
  const text = argText.length > 0 ? argText : (await readStdin()).trim();

  if (!text) {
    process.stderr.write(
      "usage: immunellm <text to check>   classify one piece of text (or pipe via stdin)\n" +
        "       immunellm watch [file]      daemon loop: tail stdin or a file, one verdict event per line\n",
    );
    process.exitCode = 1;
    return;
  }

  await runOnce(text);
}

main();

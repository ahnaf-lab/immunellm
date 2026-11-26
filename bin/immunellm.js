#!/usr/bin/env node
import { createNgramEmbedder } from "../src/ngram-embedder.js";
import { loadCorpus } from "../src/corpus.js";
import { createClassifier } from "../src/classifier.js";

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

async function main() {
  const argText = process.argv.slice(2).join(" ");
  const text = argText.length > 0 ? argText : (await readStdin()).trim();

  if (!text) {
    process.stderr.write(
      "usage: immunellm <text to check>  (or pipe text via stdin)\n",
    );
    process.exitCode = 1;
    return;
  }

  const embedder = createNgramEmbedder();
  const corpus = loadCorpus();
  const { classify } = createClassifier({ embedder, corpus });

  const result = classify(text);
  process.stdout.write(
    `${JSON.stringify(
      {
        text,
        label: result.label,
        score: Number(result.score.toFixed(4)),
        nearest: result.neighbors.slice(0, 3).map((n) => ({
          id: n.id,
          label: n.label,
          score: Number(n.score.toFixed(4)),
        })),
      },
      null,
      2,
    )}\n`,
  );
}

main();

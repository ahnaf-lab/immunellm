import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CORPUS_PATH = join(__dirname, "..", "data", "corpus.json");

/**
 * Loads the labeled attack/PII/clean corpus fixture.
 * @param {string} [path] defaults to data/corpus.json in this repo
 * @returns {{id: string, text: string, label: string}[]}
 */
export function loadCorpus(path = DEFAULT_CORPUS_PATH) {
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new TypeError(`corpus file ${path} must contain a JSON array`);
  }
  return parsed;
}

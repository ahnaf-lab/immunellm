import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CORPUS_PATH = join(__dirname, "..", "data", "corpus.json");
const DEFAULT_REGRESSION_CORPUS_PATH = join(__dirname, "..", "data", "regression-corpus.json");

/**
 * Loads a labeled JSON corpus fixture (an array of {id, text, label}).
 * @param {string} path
 * @returns {{id: string, text: string, label: string}[]}
 */
function loadLabeledFixture(path) {
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new TypeError(`corpus file ${path} must contain a JSON array`);
  }
  return parsed;
}

/**
 * Loads the labeled attack/PII/clean corpus fixture that backs the kNN
 * index -- what the classifier is indexed against.
 * @param {string} [path] defaults to data/corpus.json in this repo
 * @returns {{id: string, text: string, label: string}[]}
 */
export function loadCorpus(path = DEFAULT_CORPUS_PATH) {
  return loadLabeledFixture(path);
}

/**
 * Loads the held-out regression corpus: labeled examples that are
 * deliberately *not* in the kNN index (see loadCorpus above), used to
 * evaluate how well the classifier generalizes rather than how well it
 * recalls its own index. See `src/evaluate.js`.
 * @param {string} [path] defaults to data/regression-corpus.json in this repo
 * @returns {{id: string, text: string, label: string}[]}
 */
export function loadRegressionCorpus(path = DEFAULT_REGRESSION_CORPUS_PATH) {
  return loadLabeledFixture(path);
}

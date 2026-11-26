// Turns a labeled corpus and a classifier into a precision/recall report.
// This is what makes the labeled regression corpus (data/regression-corpus.json)
// more than a fixture: running every case through `classify` and comparing
// the predicted label against the known label gives a per-label confusion
// count, from which precision, recall, and F1 follow directly.

const LABELS = ["injection", "pii", "clean"];

/**
 * @typedef {{id: string, text: string, label: string}} LabeledCase
 * @typedef {{precision: number, recall: number, f1: number, support: number}} LabelMetrics
 * @typedef {{
 *   total: number,
 *   accuracy: number,
 *   perLabel: Record<string, LabelMetrics>,
 *   misclassified: {id: string, text: string, expected: string, predicted: string}[],
 * }} EvaluationReport
 */

/**
 * Runs every case in `cases` through `classify` and scores the predicted
 * label against the case's known label.
 * @param {{classify: (text: string) => {label: string}, cases: LabeledCase[]}} opts
 * @returns {EvaluationReport}
 */
export function evaluateCorpus(opts) {
  const { classify, cases } = opts;

  const counts = {};
  for (const label of LABELS) {
    counts[label] = { tp: 0, fp: 0, fn: 0 };
  }

  const misclassified = [];
  let correct = 0;

  for (const testCase of cases) {
    const { label: predicted } = classify(testCase.text);
    if (predicted === testCase.label) {
      correct += 1;
      counts[testCase.label].tp += 1;
    } else {
      counts[testCase.label].fn += 1;
      counts[predicted].fp += 1;
      misclassified.push({
        id: testCase.id,
        text: testCase.text,
        expected: testCase.label,
        predicted,
      });
    }
  }

  const perLabel = {};
  for (const label of LABELS) {
    const { tp, fp, fn } = counts[label];
    const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
    perLabel[label] = { precision, recall, f1, support: tp + fn };
  }

  return {
    total: cases.length,
    accuracy: cases.length === 0 ? 1 : correct / cases.length,
    perLabel,
    misclassified,
  };
}

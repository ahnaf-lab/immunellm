// Regex-based threat heuristics. These catch known prompt-injection phrasing
// and PII formats directly from the text, independent of corpus similarity --
// a four-digit-grouped credit card number or an "ignore previous
// instructions" phrase is identifiable on its own, without needing a close
// neighbor in the corpus. This is the second signal `combineScores` in
// threat-score.js blends with kNN similarity.
//
// Each rule's `weight` is a confidence in [0, 1]: how strongly a single
// match should, by itself, push the combined score toward that label.

/**
 * @typedef {{id: string, label: string, weight: number, pattern: RegExp}} HeuristicRule
 */

/** @type {HeuristicRule[]} */
const RULES = [
  {
    id: "h-inj-ignore-instructions",
    label: "injection",
    weight: 0.9,
    pattern:
      /\b(ignore|disregard|forget)\b[^.!?]{0,30}\b(previous|above|prior|all)\b[^.!?]{0,30}\b(instructions?|rules?|guidelines?|conversation)\b/i,
  },
  {
    id: "h-inj-override-safety",
    label: "injection",
    weight: 0.85,
    pattern:
      /\b(override|bypass)\b[^.!?]{0,30}\b(safety|polic(?:y|ies)|guidelines?|restrictions?|filters?|moderation)\b/i,
  },
  {
    id: "h-inj-reveal-system-prompt",
    label: "injection",
    weight: 0.8,
    pattern:
      /\b(reveal|print|show|repeat|leak)\b[^.!?]{0,30}\b(system prompt|hidden instructions?|raw training data)\b/i,
  },
  {
    id: "h-inj-no-restrictions",
    label: "injection",
    weight: 0.75,
    pattern: /\b(no restrictions?|no filters?|unfiltered|without (?:any )?(?:filters?|restrictions?))\b/i,
  },
  {
    id: "h-inj-roleplay-jailbreak",
    label: "injection",
    weight: 0.6,
    pattern: /\byou are now\b[^.!?]{0,30}\b(DAN|an? AI with no)\b/i,
  },
  {
    id: "h-inj-authority-override",
    label: "injection",
    weight: 0.6,
    pattern: /\b(system override|new instructions from the developer|obey only me)\b/i,
  },
  {
    id: "h-pii-ssn",
    label: "pii",
    weight: 0.95,
    pattern: /\b\d{3}-\d{2}-\d{4}\b/,
  },
  {
    id: "h-pii-credit-card",
    label: "pii",
    weight: 0.95,
    pattern: /\b\d{4}[ -]\d{4}[ -]\d{4}[ -]\d{4}\b/,
  },
  {
    id: "h-pii-email",
    label: "pii",
    weight: 0.7,
    pattern: /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i,
  },
  {
    id: "h-pii-phone",
    label: "pii",
    weight: 0.6,
    pattern: /\b(\(\d{3}\)\s?|\d{3}[-.])\d{3}[-.]\d{4}\b/,
  },
  {
    id: "h-pii-passport",
    label: "pii",
    weight: 0.7,
    pattern: /\bpassport number\b/i,
  },
  {
    id: "h-pii-bank-account",
    label: "pii",
    weight: 0.7,
    pattern: /\b(bank account|routing) number\b/i,
  },
  {
    id: "h-pii-drivers-license",
    label: "pii",
    weight: 0.7,
    pattern: /\bdriver'?s? licen[sc]e number\b/i,
  },
  {
    id: "h-pii-medical-record",
    label: "pii",
    weight: 0.65,
    pattern: /\bmedical record number\b|\bMRN-?\d+\b/i,
  },
];

/**
 * Runs every heuristic rule against `text` and returns the ones that match.
 * @param {string} text
 * @returns {{id: string, label: string, weight: number, match: string}[]}
 */
export function matchHeuristics(text) {
  const evidence = [];
  for (const rule of RULES) {
    const match = rule.pattern.exec(text);
    if (match) {
      evidence.push({ id: rule.id, label: rule.label, weight: rule.weight, match: match[0] });
    }
  }
  return evidence;
}

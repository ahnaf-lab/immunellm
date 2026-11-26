// Embedding provider interface.
//
// An embedding provider is any object shaped like:
//   { dims: number, embed(text: string): number[] }
//
// Keeping the model behind this interface means the rest of the codebase
// (kNN search, classification, CLI) never depends on how a vector was
// produced. This milestone ships exactly one provider -- the hashed n-gram
// stub in ngram-embedder.js -- which is already fully deterministic, so it
// doubles as the "fake" provider tests run against. A future milestone can
// add a provider backed by a live embedding API without touching any other
// module, as long as it satisfies this same shape.

/**
 * Throws if `provider` does not satisfy the embedding provider interface.
 * @param {unknown} provider
 * @returns {{dims: number, embed: (text: string) => number[]}}
 */
export function assertProvider(provider) {
  if (
    !provider ||
    typeof provider !== "object" ||
    typeof provider.embed !== "function" ||
    typeof provider.dims !== "number"
  ) {
    throw new TypeError(
      "embedding provider must be an object with a numeric `dims` and an `embed(text)` function",
    );
  }
  return provider;
}

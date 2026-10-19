/**
 * Free Dictionary API (https://dictionaryapi.dev) -- open-source, no key,
 * no rate-limit auth required. The one external data source this app
 * leans on for English content: real definitions, not fabricated ones,
 * for the Vocabulary chapter that otherwise has zero content (nothing in
 * the question bank has ever covered English -- see /admin/content/generate-vocabulary).
 */

const API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const TIMEOUT_MS = 8000;

/**
 * @param {string} word
 * @returns {Promise<{word: string, definition: string, partOfSpeech: string, example: string|null}|null>}
 *   The single clearest definition for the word, or null if the word
 *   isn't in the dictionary / the API is unreachable -- callers must treat
 *   that as "skip this word," not an error.
 */
async function fetchOnce(word) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}/${encodeURIComponent(word.trim().toLowerCase())}`, { signal: controller.signal });
    if (!res.ok) return null;

    const data = await res.json();
    const entry = data?.[0];
    const meaning = entry?.meanings?.[0];
    const definition = meaning?.definitions?.[0];
    if (!entry || !meaning || !definition?.definition) return null;

    return {
      word: entry.word,
      definition: definition.definition,
      partOfSpeech: meaning.partOfSpeech ?? 'word',
      example: definition.example ?? null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function lookupWord(word) {
  // One retry -- this free public API is noticeably flakier under
  // concurrent load than a 404-for-real-unknown-word would suggest;
  // a single word looked up twice in a row is almost always found the
  // second time if it genuinely exists.
  return (await fetchOnce(word)) ?? (await fetchOnce(word));
}

const THROTTLE_MS = 200;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Looks up several words sequentially with a small gap between requests --
 * hammering this free API back-to-back (or concurrently) measurably
 * increases transient failures for a batch of more than a few words.
 * Slower, but far more reliable.
 */
export async function lookupWords(words) {
  const results = [];
  for (const word of words) {
    const entry = await lookupWord(word);
    if (entry) results.push(entry);
    await sleep(THROTTLE_MS);
  }
  return results;
}

/**
 * Thin wrapper over Google's Gemini API. Plain fetch, no SDK — this is one
 * call with a short prompt, not worth a dependency for.
 *
 * Provider abstraction stops here deliberately (see the master doc's own
 * warning against hard-coding around one model): if a second provider is
 * ever needed, this is the one file that changes.
 */

// The "lite" variant, not the flagship -- it answers in 1-3 seconds
// instead of occasionally taking 20-70s under load, which matters far
// more here than the marginal quality gain for a short tutoring tip.
export const MODEL = 'gemini-3.1-flash-lite';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_TOKENS = 300;
const TIMEOUT_MS = 12000;

// A classification pass over a whole document's worth of text is a much
// bigger job than a one-line hint: longer timeout, much larger output
// budget, and JSON-mode so the response can be parsed without free-text
// wrangling. 8000 was too tight -- a real multi-section study-material PDF
// has far more than 8000 tokens' worth of questions, and the model would
// quietly return only a partial sample instead of erroring, which is worse
// than slow. 32000 is this model's accepted ceiling.
const JSON_MAX_TOKENS = 32000;
const JSON_TIMEOUT_MS = 90000;

/**
 * @param {{system: string, user: string}} prompt
 * @returns {Promise<{text: string, model: string}|null>} null when the
 *   provider is unreachable or unconfigured — callers must treat that as a
 *   normal outcome, not an error. Learning never blocks on this.
 */
export async function generateHint(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: prompt.system }] },
        contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
        // thinkingBudget: 0 disables the model's internal "thinking" tokens
        // -- without it, reasoning tokens eat the whole maxOutputTokens
        // budget on this model and no visible text ever comes back.
        generationConfig: { maxOutputTokens: MAX_TOKENS, thinkingConfig: { thinkingBudget: 0 } },
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    return { text: text.trim(), model: MODEL };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Same model, but asks for strict JSON back and parses it for the caller.
 * Used for structured extraction (e.g. classifying bulk-uploaded content)
 * rather than short free-text tutoring replies.
 *
 * @param {{system: string, user: string}} prompt
 * @returns {Promise<unknown|null>} the parsed JSON value, or null when the
 *   provider is unconfigured, unreachable, or returns something that isn't
 *   valid JSON — callers must treat that as "classification unavailable",
 *   not crash.
 */
export async function generateJson(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), JSON_TIMEOUT_MS);

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: prompt.system }] },
        contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
        generationConfig: {
          maxOutputTokens: JSON_MAX_TOKENS,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

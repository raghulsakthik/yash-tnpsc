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

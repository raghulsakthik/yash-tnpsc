/**
 * Thin wrapper over Anthropic's Messages API. Plain fetch, no SDK — this is
 * one call with a short prompt, not worth a dependency for.
 *
 * Provider abstraction stops here deliberately (see the master doc's own
 * warning against hard-coding around one model): if a second provider is
 * ever needed, this is the one file that changes.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
export const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 200;
const TIMEOUT_MS = 8000;

/**
 * @param {{system: string, user: string}} prompt
 * @returns {Promise<{text: string, model: string}|null>} null when the
 *   provider is unreachable or unconfigured — callers must treat that as a
 *   normal outcome, not an error. Learning never blocks on this.
 */
export async function generateHint(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = await res.json();
    const text = data?.content?.[0]?.text;
    if (!text) return null;

    return { text: text.trim(), model: MODEL };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Wikipedia's free "On this day" REST API -- open-source (Wikimedia),
 * no key, no rate-limit auth. The real-world-facts counterpart to the
 * Dictionary API integration: a small, honest, always-true general-
 * knowledge feed for today's date, rather than a fabricated "current
 * affairs" list.
 */

const API_URL = 'https://en.wikipedia.org/api/rest_v1/feed/onthisday/events';
const TIMEOUT_MS = 8000;

/**
 * @param {Date} date defaults to now
 * @returns {Promise<Array<{year: number, text: string}>|null>} up to 5 real
 *   historical events for this month/day, or null if the API is unreachable.
 */
export async function onThisDay(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}/${month}/${day}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Yash-TNPSC-prep/1.0 (study app; no contact needed)' },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const events = Array.isArray(data.events) ? data.events : [];
    return events
      .slice()
      .sort((a, b) => a.year - b.year) // chronological, not Wikipedia's default order
      .slice(-5) // the 5 most recent -- more relevant to a current learner than ancient history
      .reverse()
      .map((e) => ({ year: e.year, text: e.text }));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

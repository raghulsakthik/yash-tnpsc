// Thin client for the TNPSC retrieval engine (engines/retrieval/ -- a
// separate FastAPI service, not something this Next.js app runs in-process).
// RETRIEVAL_ENGINE_URL points at wherever it's deployed/running; until set,
// every call here is a safe, explicit error, same configured-or-error
// pattern as gcs.mjs/fcm.mjs -- status "unknown" would be misleading for
// something an admin is about to act on.
const baseUrl = process.env.RETRIEVAL_ENGINE_URL;
export const retrievalEngineConfigured = Boolean(baseUrl);

async function engineFetch(path, init, timeoutMs = 8000) {
  if (!retrievalEngineConfigured) {
    throw new Error('RETRIEVAL_ENGINE_URL is not set on the server');
  }
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`Retrieval engine returned ${res.status} for ${path}`);
  }
  return res.json();
}

/**
 * Health + status + observability summary in one call, for the admin
 * dashboard card -- three cheap GETs the engine already exposes rather
 * than inventing a combined endpoint on either side.
 */
export async function getRetrievalEngineStatus() {
  const [health, status, summary] = await Promise.all([
    engineFetch('/health'),
    engineFetch('/api/status'),
    engineFetch('/api/observability/summary'),
  ]);
  return { health, status, summary };
}

export async function listRetrievalResources() {
  return engineFetch('/api/resources');
}

/**
 * Triggers the engine's TNPSC catalog discovery pass -- a real,
 * side-effecting call against the retrieval engine (it may in turn talk to
 * the actual portal), so this is deliberately the only write-style action
 * exposed here. No scan/download trigger beyond what the engine itself
 * already gates behind its own auth/session checks.
 */
export async function triggerCatalogDiscovery() {
  // A real browser launch + portal navigation (see engines/retrieval's own
  // 10-15s internal timeouts for opening the portal and each page) takes
  // noticeably longer than a status read -- 8s was cutting it off before
  // the engine's own "not authenticated" short-circuit could even return.
  return engineFetch('/api/discovery/tnpsc-catalog', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }, 45000);
}

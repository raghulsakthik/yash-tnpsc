/**
 * The one place that knows how to talk HTTP to this app's own API routes.
 * Every src/api/*.js file is just named functions calling get()/post() —
 * no component ever calls fetch() directly.
 */

export class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function request(path, options = {}) {
  const res = await fetch(path, {
    cache: 'no-store',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.message ?? `Request to ${path} failed`, data.code, res.status);
  }
  return data;
}

export const get = (path) => request(path);
export const post = (path, body) =>
  request(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined });
export const put = (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) });
export const del = (path) => request(path, { method: 'DELETE' });

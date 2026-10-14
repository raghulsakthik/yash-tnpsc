// Phase 2 — shared service-layer error type. Thrown by every domain service
// when input validation fails, caught by callers (routes, scripts, tests)
// the same way `RecordAttemptError` already is in src/lib/attempts.mjs.
export class ValidationError extends Error {
  constructor(errors) {
    super(errors.join('; '));
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

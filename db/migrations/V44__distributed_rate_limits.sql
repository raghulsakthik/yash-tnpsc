CREATE TABLE IF NOT EXISTS api_rate_limit_bucket (
  bucket_key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_rate_limit_bucket_expiry_idx
  ON api_rate_limit_bucket(expires_at);

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 30000;

CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sources (id INTEGER PRIMARY KEY, name TEXT NOT NULL, base_url TEXT NOT NULL UNIQUE, source_type TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS resources (id INTEGER PRIMARY KEY, source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL, canonical_url TEXT NOT NULL UNIQUE, title TEXT NOT NULL, exam TEXT, group_name TEXT, subject TEXT, resource_type TEXT, status TEXT NOT NULL DEFAULT 'discovered', local_path TEXT, mime_type TEXT, expected_size INTEGER, actual_size INTEGER, sha256 TEXT, discovered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, metadata_json TEXT NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY, job_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', started_at TEXT, finished_at TEXT, error TEXT, metadata_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS job_resources (job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE, PRIMARY KEY(job_id, resource_id));
CREATE TABLE IF NOT EXISTS downloads (id INTEGER PRIMARY KEY, resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE, temp_path TEXT, final_path TEXT, bytes_downloaded INTEGER NOT NULL DEFAULT 0, total_bytes INTEGER, etag TEXT, last_modified TEXT, attempts INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending', started_at TEXT, completed_at TEXT, error TEXT);
CREATE TABLE IF NOT EXISTS content_hashes (sha256 TEXT PRIMARY KEY, resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE, size INTEGER, first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS failures (id INTEGER PRIMARY KEY, resource_id INTEGER REFERENCES resources(id) ON DELETE SET NULL, job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL, stage TEXT NOT NULL, error_type TEXT, message TEXT NOT NULL, retryable INTEGER NOT NULL DEFAULT 1, attempt INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, level TEXT NOT NULL, event_type TEXT NOT NULL, resource_id INTEGER REFERENCES resources(id) ON DELETE SET NULL, job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL, message TEXT NOT NULL, metadata_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_exam_group ON resources(exam, group_name);
CREATE INDEX IF NOT EXISTS idx_resources_hash ON resources(sha256);
CREATE INDEX IF NOT EXISTS idx_downloads_resource ON downloads(resource_id);
CREATE INDEX IF NOT EXISTS idx_failures_resource ON failures(resource_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY,
  resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  answer TEXT,
  explanation TEXT,
  fingerprint TEXT NOT NULL,
  source_page INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fingerprint)
);
CREATE INDEX IF NOT EXISTS idx_questions_resource ON questions(resource_id);
CREATE INDEX IF NOT EXISTS idx_questions_fingerprint ON questions(fingerprint);

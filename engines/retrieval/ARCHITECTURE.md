# TNPSC Material Engine — Full Backend & Engine Architecture

## 1. Mission
Local-first acquisition and indexing engine for TNPSC Group II and Group IIA study resources. Primary source is the authorized authenticated Tamil Nadu Career Services VLE session. Secondary sources are publicly accessible resources. The engine never bypasses CAPTCHA, DRM, authentication controls, rate limits, or access restrictions.

## 2. Runtime architecture
Browser/CLI -> FastAPI control plane -> Job Manager -> Engine Orchestrator -> Source Connectors -> Discovery -> Classification -> Download Manager -> Integrity/Quarantine -> Extract/Normalize -> SQLite Catalog -> Filesystem.

## 3. Components
- API: health, jobs, sources, scans, downloads, resources, failures, statistics.
- CLI: start, login, scan, download, resume, status, verify, cleanup.
- Browser Manager: Playwright persistent context, browser detection, download events, navigation timeout, session health.
- Auth Manager: first-run manual login, session reuse, expiry detection, never logs credentials.
- Source Connectors: VLE connector and public-web connector behind a common interface.
- Discovery Engine: sitemap/page/link discovery, pagination, lazy-loaded content, downloadable assets, test pages.
- Classification Engine: Group II/IIA relevance, subject, resource type, language, year, stage.
- Download Manager: resumable streaming downloads, concurrency limits, retries, backoff, checksum, atomic rename.
- Integrity: content-type sniffing, size checks, hash, PDF/ZIP sanity, HTML-instead-of-PDF detection, quarantine.
- Extractor: PDF metadata/text, HTML MCQ/test extraction where legitimately accessible, source provenance.
- Catalog: SQLite state machine and deduplication index.
- Recovery: persistent jobs, checkpoints, retry budget, crash recovery, stale-job recovery.
- Observability: structured logs, metrics, per-job audit trail.

## 4. Resource lifecycle
DISCOVERED -> CLASSIFIED -> QUEUED -> DOWNLOADING -> VERIFYING -> STORED -> INDEXED.
Failure paths: RETRYABLE_FAILURE, AUTH_REQUIRED, RATE_LIMITED, INVALID_CONTENT, QUARANTINED, PERMANENT_FAILURE, SKIPPED_DUPLICATE.
No partial file is promoted to the final directory.

## 5. Filesystem contract
`data/tnpsc-material/official/`
`data/tnpsc-material/question-papers/`
`data/tnpsc-material/mock-tests/`
`data/tnpsc-material/mcq/`
`data/tnpsc-material/study-material/`
`data/tnpsc-material/syllabus/`
`data/tnpsc-material/current-affairs/`
`data/tnpsc-material/quarantine/`
`data/tnpsc-material/metadata/`
Temporary downloads use a hidden `.partial`/staging area and are atomically moved after verification.

## 6. Core database entities
sources, sessions, jobs, resources, resource_versions, downloads, files, classifications, extraction_results, failures, checkpoints, events.
Important fields: canonical_url, source_url, title, exam, group, stage, subject, resource_type, language, year, etag, last_modified, content_length, sha256, local_path, status, retry_count, discovered_at, downloaded_at.

## 7. Edge-case protection
- Login page returned instead of authenticated page -> AUTH_REQUIRED.
- Session expired during scan -> checkpoint and pause; never continue blindly.
- CAPTCHA/verification wall -> stop and require manual action.
- 401/403 -> no retry storm; mark AUTH_REQUIRED/ACCESS_DENIED.
- 429 -> honor Retry-After and exponential backoff.
- 5xx/network timeout/DNS reset -> bounded retries with jitter.
- Redirect loop/cross-domain redirect -> validate allowed source domains and stop suspicious chains.
- URL changes/session-specific links -> retain canonical/source URL and re-discover asset.
- HTML returned with PDF extension -> MIME/magic-byte validation and quarantine.
- zero-byte/truncated download -> retry.
- Content-Length mismatch -> retry/quarantine.
- disk full -> pause job and report required free space.
- filename collision -> deterministic slug + short hash, never overwrite silently.
- duplicate content at different URLs -> SHA-256 deduplication with multiple provenance records.
- duplicate URL with changed content -> create resource_version.
- corrupted PDF/ZIP -> quarantine, never index as valid.
- huge file -> no arbitrary tiny cap, but configurable maximum and disk-safety threshold.
- infinite pagination -> visited-URL set, canonicalization, page-depth and item budgets.
- crawler trap -> same-domain allowlist, content-type filtering, max depth, max URLs/job.
- JavaScript-only content -> Playwright discovery fallback.
- lazy-loaded download -> wait for network/download event with bounded timeout.
- browser crash -> relaunch and resume checkpoint.
- machine restart -> recover RUNNING jobs as INTERRUPTED and resume safely.
- duplicate simultaneous jobs -> database lock/idempotency key prevents duplicate work.
- Unicode/Tamil filenames -> normalized Unicode plus safe filesystem slug.
- malicious path traversal filename -> sanitize basename; never trust server filename.
- archive bomb or suspicious archive -> quarantine before extraction and enforce extraction limits.
- malformed metadata -> retain raw provenance and use fallback classification.
- source unavailable -> keep catalog and retry later; never delete existing good material.

## 8. Security
Credentials only through environment/OS secret store; never commit `.env`. Persistent browser profile must be local and excluded from git. Sanitize URLs and filenames. Restrict source domains. Do not execute downloaded documents. Extract archives only in quarantine with resource limits.

## 9. Reliability model
Every long operation is a resumable job. Each item has an idempotency key. Writes are staged then atomically committed. Database transactions surround state transitions. Retry policies are per failure class. Fatal item errors do not terminate the whole scan.

## 10. Development phases
1. Foundation/scaffold/configuration.
2. SQLite schema + migrations + state machine.
3. FastAPI control plane + CLI.
4. Browser manager + persistent session.
5. Authentication/session health.
6. VLE discovery connector.
7. Group II/IIA classification engine.
8. Download manager + resumable transfers.
9. Integrity, quarantine, deduplication.
10. Interactive MCQ/mock-test extraction.
11. Public-web source connector + provenance.
12. Recovery/checkpoint/concurrency/rate-limit controls.
13. Observability, audit logs, diagnostics.
14. Automated unit/integration/failure-injection tests.
15. End-to-end real portal validation with manual-login boundary.
16. Production hardening, packaging, systemd/service startup, documentation.

## 11. Definition of done
A scan can be interrupted at any point and resumed without corrupting or duplicating files; authentication failures pause safely; bad content is quarantined; every stored resource has provenance and SHA-256; one bad URL cannot kill the job; database and filesystem remain consistent; and a restart recovers automatically.

# TNPSC Material Engine

Local backend for collecting TNPSC Group II and Group IIA study materials from the Tamil Nadu Career Services VLE portal and other openly available educational sources.

## Goals

- Reuse a persistent browser session for the authorized VLE account.
- Detect whether the browser/session is already authenticated.
- Discover Group II and Group IIA courses, chapters, e-content, question papers, MCQ/practice tests and mock tests.
- Download permitted resources without an artificial file-size limit.
- Store all downloaded resources under `data/tnpsc-material/`.
- Preserve source URLs and metadata for every resource.
- Deduplicate downloads using SHA-256.
- Support resumable downloads and safe disk-space checks.
- Never bypass CAPTCHA, DRM, paywalls, access controls, or other technical restrictions.

## Proposed stack

- Python 3.12+
- FastAPI for the local API
- Playwright for browser automation
- SQLite for resource metadata and download state
- httpx/aiohttp for permitted direct downloads
- Pydantic settings for local configuration

## Directory layout

```text
tnpsc-material-engine/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   ├── browser.py
│   ├── portal.py
│   ├── downloader.py
│   ├── classifier.py
│   └── scanner.py
├── data/
│   └── tnpsc-material/
├── browser-profile/
├── logs/
├── .env.example
├── requirements.txt
└── README.md
```

## Source

Primary portal:
https://tamilnaducareerservices.tn.gov.in/Vle_candidate/vle_home

The engine should prioritize official Tamil Nadu government/official TNPSC sources before public educational sources.

## Security

Do not commit credentials, cookies, browser profiles, tokens, or session databases to Git. Prefer manual first-time login and a persistent local Playwright profile. If credentials are configured, load them only from a local `.env` file that is excluded from version control.

## Storage

The requested material root is represented by:

`/home/yash/tnpsc-material-engine/data/tnpsc-material`

If `/tnpsc-material` is required as a literal filesystem path later, configure `TNPSC_MATERIAL_DIR=/tnpsc-material` and ensure the process has permission to write there.

## Local service startup

Phase 16 provides a user-level systemd service. Install/start it with:

```bash
./deploy/install-user-service.sh
```

The API listens only on `127.0.0.1:8787` by default. Health check:

```bash
./deploy/healthcheck.sh
```

Service management:

```bash
systemctl --user status tnpsc-material-engine.service
systemctl --user restart tnpsc-material-engine.service
journalctl --user -u tnpsc-material-engine.service -f
```

The service does not store passwords. The Playwright profile remains local and is reused for an authorized manual login.

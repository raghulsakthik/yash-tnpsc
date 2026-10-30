# TNPSC Consolidated Project Structure

## Canonical Root

The entire TNPSC ecosystem is now organized under:

`/home/yash/tnpsc`

This is the single canonical local project root.

## Engine Boundaries

- `engines/retrieval` — source discovery, download, validation, extraction, recovery and material ingestion.
- `engines/content-intelligence` — planned canonical location for content extraction/classification/evidence/curriculum mapping/generation/quality workflows as they are consolidated.
- `engines/learning` — learner learning-domain logic where separated from the platform application.
- `engines/analytics` — analytics and operational intelligence.
- `engines/adaptive` — adaptive learning and recommendations.
- `engines/optimization` — content and learning optimization signals/actions.
- `engines/ai-governance` — model/prompt/evaluation/governance controls.

## Existing Platform

- `src/` remains the canonical Next.js platform application and API.
- `android/` remains the canonical Android application.
- `db/` remains the canonical platform database migration/schema area.
- `content/` remains learner/content data owned by the platform.
- `tests/` remains the platform-wide JavaScript test suite.
- `scripts/` remains platform operational tooling.
- `docs/` is the canonical documentation root.

## Retrieval Engine Consolidation

The former standalone `tnpsc-material-engine` source tree has been consolidated into:

`tnpsc/engines/retrieval/`

Its application, data, deployment scripts, tests, logs, documentation and requirements now live under the TNPSC root.

The Python virtual environment and live secret `.env` remain outside the canonical source tree temporarily because they are machine-local runtime state/secrets and should not be committed or treated as application source.

## Governance Rules

1. No GitHub operations are performed as part of this consolidation.
2. No existing learner/admin functionality is replaced merely because directories changed.
3. Database remains the system of record for platform state.
4. Retrieval does not directly publish learner-visible content.
5. Content Intelligence produces governed publication packages.
6. Admin review remains the authorization boundary for publication.
7. AI remains suggestion-only and cannot bypass validation, review or publication controls.
8. PYQ material remains isolated from learner publication.
9. Provenance, versioning, lineage and audit remain mandatory.
10. Future engine consolidation must happen inside this `tnpsc/` root.

## Current Canonical Flow

SOURCE → RETRIEVAL → CONTENT INTELLIGENCE → PUBLICATION CONTRACT → EXISTING ADMIN PANEL → WEB/ANDROID → LEARNING → ANALYTICS → GAP/ADAPTIVE/OPTIMIZATION → RETRIEVAL/CONTENT INTELLIGENCE

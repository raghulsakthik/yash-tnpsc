#!/usr/bin/env bash
set -euo pipefail
curl --fail --silent --show-error http://127.0.0.1:8787/health >/tmp/tnpsc-engine-health.json
cat /tmp/tnpsc-engine-health.json

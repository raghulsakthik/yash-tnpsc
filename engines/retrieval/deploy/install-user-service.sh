#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIT="tnpsc-material-engine.service"
mkdir -p "$HOME/.config/systemd/user"
cp "$ROOT/deploy/tnpsc-retrieval-engine.service" "$HOME/.config/systemd/user/$UNIT"
sed -i "s#/home/yash/tnpsc-material-engine#$ROOT#g" "$HOME/.config/systemd/user/$UNIT"
systemctl --user daemon-reload
systemctl --user reset-failed "$UNIT" || true
systemctl --user enable --now "$UNIT"
systemctl --user --no-pager status "$UNIT"

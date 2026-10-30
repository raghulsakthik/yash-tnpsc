#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$HOME/.config/systemd/user"
cp "$ROOT/deploy/tnpsc-retrieval-engine.service" "$HOME/.config/systemd/user/tnpsc-retrieval-engine.service"
sed -i "s#/home/yash/tnpsc-material-engine#$ROOT#g" "$HOME/.config/systemd/user/tnpsc-retrieval-engine.service"
systemctl --user daemon-reload
systemctl --user enable --now tnpsc-retrieval-engine.service
systemctl --user --no-pager status tnpsc-retrieval-engine.service

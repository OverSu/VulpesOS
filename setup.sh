#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
python3 tools/prepare-assets.py
exec python3 tools/fetch-engine.py --locked "$@"

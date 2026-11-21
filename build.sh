#!/usr/bin/env bash
# Build thescoop.org into _site/ (run locally and in CI).
set -euo pipefail
cd "$(dirname "$0")"
PYTHON="${PYTHON:-python}"
rm -rf _site
"$PYTHON" manage.py staticsitegen
"$PYTHON" manage.py copyassets
npx --yes pagefind@1.5.2 --site _site

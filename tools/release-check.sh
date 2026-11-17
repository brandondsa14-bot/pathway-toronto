#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
echo "Checking tracked credentials (without printing any secret values)..."
if git ls-files | grep -E '(^|/)\.env(\.local|\.[^.]+\.local)?$' | grep -v -E '\.env\.example$' >/dev/null; then
  echo "STOP: A credential environment file is tracked." >&2; exit 1
fi
if git ls-files | grep -E '\.(pem|p12|pfx|key)$' >/dev/null; then
  echo "STOP: Check possible tracked private key material." >&2; exit 1
fi
if git grep -IlE 'AIza[0-9A-Za-z_-]{35}' -- ':!*.patch' >/dev/null; then
  echo "STOP: Possible Google key found in tracked text. No value shown." >&2; exit 1
fi
if git rev-parse --verify origin/main >/dev/null 2>&1; then
  if git log origin/main..HEAD -p --format= | grep -qE 'AIza[0-9A-Za-z_-]{35}'; then
    echo "STOP: Possible Google key in unpushed commit history. No value shown." >&2; exit 1
  fi
fi
echo "PASS: recognizable credential checks"
cd "$ROOT/backend"
python -m pytest -q
PYTHONPATH="$ROOT/backend" python "$ROOT/tools/verify-data-readiness.py"
cd "$ROOT/frontend"
npm run lint
npm run build
if [ "${PATHWAY_SKIP_NPM_AUDIT:-0}" = "1" ]; then
  echo "WARNING: npm audit intentionally skipped; NOT deployment-cleared."
else
  npm audit --omit=dev --audit-level=high
fi
echo "PASS: local checks completed; manual browser, licensing and deployment QA still required"

#!/usr/bin/env bash
# Ejecuta todos los unit tests bajo src/lib (portable sin depender de glob **).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mapfile -t FILES < <(find "$ROOT/src/lib" -name '*.test.ts' | sort)
if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "No test files found" >&2
  exit 1
fi
exec node --import tsx --test "${FILES[@]}"

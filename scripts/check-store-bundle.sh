#!/usr/bin/env bash
set -euo pipefail

[ "${PKH_EMU_STORE:-}" = sideload ] && exit 0
dist="$(dirname "${BASH_SOURCE[0]}")/../app/dist"
if grep -rqsF ko-fi.com "$dist"; then
  echo "app/dist has the Ko-fi link. Only the sideload build may ask for a coffee." >&2
  exit 1
fi

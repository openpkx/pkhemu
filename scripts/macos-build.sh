#!/usr/bin/env bash
source "$(dirname "$0")/env.sh"
npx tauri build --bundles app "$@"
"$root/scripts/check-store-bundle.sh"

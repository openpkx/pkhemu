#!/usr/bin/env bash
source "$(dirname "$0")/env.sh"

# The App Store build has no Sync, Plus or Lab, so the simulator matches it.
export PKH_EMU_STORE="${PKH_EMU_STORE:-appstore}"
npx tauri ios dev "$@"

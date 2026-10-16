#!/usr/bin/env bash
source "$(dirname "$0")/android-env.sh"
npx tauri android build --apk "$@"
"$root/scripts/check-store-bundle.sh"

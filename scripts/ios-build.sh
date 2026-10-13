#!/usr/bin/env bash
set -euo pipefail

set -a
source ~/.config/pkh-emu/ios.env
set +a

# build.rs falls back to sync.env when a variable is empty, so the file can't be overridden from here.
sync_env="$(dirname "$0")/../app/src-tauri/sync.env"
for key in PKH_EMU_PLUS PKH_EMU_GOOGLE_CLIENT_ID PKH_EMU_GOOGLE_CLIENT_SECRET PKH_EMU_DROPBOX_APP_KEY; do
  if [ -n "${!key:-}" ] || grep -Eqs "^[[:space:]]*$key[[:space:]]*=[[:space:]]*[^[:space:]]" "$sync_env"; then
    echo "$key is set. The App Store build has no Plus or Sync: unset it and comment it out in app/src-tauri/sync.env." >&2
    exit 1
  fi
done

source "$(dirname "$0")/env.sh"
export PKH_EMU_STORE=appstore

build_number="$(date +%s)"
npx tauri ios build --ci --export-method app-store-connect \
  --config "{\"bundle\":{\"iOS\":{\"bundleVersion\":\"$build_number\"}}}" "$@"
xcrun altool --upload-app --type ios --file src-tauri/gen/apple/build/arm64/pkhemu.ipa \
  --apiKey "$APPLE_API_KEY" --apiIssuer "$APPLE_API_ISSUER"

#!/usr/bin/env bash
set -euo pipefail

store=appstore
case "${1:-}" in
  --unlocked)
    store=
    shift
    ;;
  --sideload)
    store=sideload
    shift
    ;;
esac

set -a
source ~/.config/pkh-emu/ios.env
set +a

# build.rs falls back to sync.env when a variable is empty, so the file can't be overridden from here.
sync_env="$(dirname "$0")/../app/src-tauri/sync.env"
for key in PKH_EMU_PLUS PKH_EMU_GOOGLE_CLIENT_ID PKH_EMU_GOOGLE_CLIENT_SECRET PKH_EMU_DROPBOX_APP_KEY; do
  if [ "$store" = appstore ] && { [ -n "${!key:-}" ] || grep -Eqs "^[[:space:]]*$key[[:space:]]*=[[:space:]]*[^[:space:]]" "$sync_env"; }; then
    echo "$key is set. The App Store build has no Plus or Sync: unset it and comment it out in app/src-tauri/sync.env." >&2
    exit 1
  fi
done

export PKH_EMU_STORE="$store"
source "$(dirname "$0")/env.sh"

build_number="$(date +%s)"
config="{\"bundle\":{\"iOS\":{\"bundleVersion\":\"$build_number\"}}}"

work="$(mktemp -d)"
# Tauri passes only TAURI_, WRY_, CARGO_ and RUST_ variables to the Rust build inside xcodebuild, so it learns the
# flavour from sync.env.
sync_file="$PWD/src-tauri/sync.env"
if [ -f "$sync_file" ]; then
  cp "$sync_file" "$work/sync.env"
fi
cleanup() {
  if [ -f "$work/sync.env" ]; then
    cp "$work/sync.env" "$sync_file"
  else
    rm -f "$sync_file"
  fi
  rm -rf "$work"
}
trap cleanup EXIT
{
  grep -Evs '^[[:space:]]*PKH_EMU_STORE[[:space:]]*=' "$work/sync.env" || true
  echo "PKH_EMU_STORE=$store"
} >"$sync_file"

if [ "$store" != sideload ]; then
  npx tauri ios build --ci --export-method app-store-connect --config "$config" "$@"
  "$root/scripts/check-store-bundle.sh"
  "$root/scripts/ios-jit-check.sh" src-tauri/gen/apple/build/arm64/pkhemu.ipa
  xcrun altool --upload-app --type ios --file src-tauri/gen/apple/build/arm64/pkhemu.ipa \
    --apiKey "$APPLE_API_KEY" --apiIssuer "$APPLE_API_ISSUER"
  exit
fi

apple="$PWD/src-tauri/gen/apple"
icons="$PWD/src-tauri/icons"
icon_set="$apple/Assets.xcassets/AppIcon.appiconset"
# Tauri runs xcodebuild without our environment, so no build setting can pick another icon set.
trap 'cleanup; cp "$icons"/ios/AppIcon-*.png "$icon_set/"' EXIT
cp "$icons"/ios-sideload/AppIcon-*.png "$icon_set/"
npx tauri ios build --ci --no-sign --archive-only --config "$config" "$@"
IPHONEOS_DEPLOYMENT_TARGET=18.0 cargo build --release --manifest-path "$root/Cargo.toml" -p jit-helper --target aarch64-apple-ios

# SideStore and AltStore sign the app again with the player's Apple account. They keep the entitlements of this
# ad-hoc signature that the account may have, and get-task-allow lets a debugger attach to turn on JIT.
mkdir "$work/Payload"
cp -R "$apple/build/pkh-emu_iOS.xcarchive/Products/Applications/pkhemu.app" "$work/Payload/"
app="$work/Payload/pkhemu.app"
cp "$apple/pkh-emu_iOS/pkh-emu_iOS.entitlements" "$work/sideload.entitlements"
plutil -insert get-task-allow -bool YES "$work/sideload.entitlements"
for framework in "$app/Frameworks"/*; do
  codesign --force --sign - --timestamp=none "$framework"
done
# The app starts this extension to attach to it through debugserver, since an app can't debug itself.
helper="$app/PlugIns/JITHelper.appex"
mkdir -p "$helper"
cp "${CARGO_TARGET_DIR:-$root/target}/aarch64-apple-ios/release/JITHelper" "$root/crates/jit-helper/Info.plist" "$helper/"
for key in CFBundleShortVersionString CFBundleVersion; do
  plutil -replace "$key" -string "$(plutil -extract "$key" raw "$app/Info.plist")" "$helper/Info.plist"
done
plutil -replace CFBundleIdentifier -string "$(plutil -extract CFBundleIdentifier raw "$app/Info.plist").JITHelper" \
  "$helper/Info.plist"
codesign --force --sign - --timestamp=none "$helper"
codesign --force --sign - --timestamp=none --entitlements "$work/sideload.entitlements" "$app"

# StikDebug picks its JIT script for an app by name, since SideStore changes the bundle ID. Its universal.js list has
# this build as "pkhemu", its CFBundleName, so renaming the app takes us off that list.
ipa="$apple/build/pkhemu-sideload.ipa"
rm -f "$ipa"
(cd "$work" && zip -qry "$ipa" Payload)
echo "$ipa"

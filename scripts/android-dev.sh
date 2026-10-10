#!/usr/bin/env bash
source "$(dirname "$0")/android-env.sh"

# Android 17 blocks apps targeting SDK 37 from reaching LAN addresses, so tunnel the dev server through adb instead.
for device in $(adb devices | awk 'NR > 1 && $2 == "device" { print $1 }'); do
  adb -s "$device" reverse tcp:1420 tcp:1420
done
npx tauri android dev --host 127.0.0.1 "$@"

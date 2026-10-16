#!/usr/bin/env bash
# Fails when an iOS app has the sideload build's JIT code: calls to csops or ptrace, StikDebug's brk #0xf00d, the code
# that starts the JIT helper extension, or any app extension at all.
#
#   scripts/ios-jit-check.sh <pkhemu.ipa | binary>
set -euo pipefail

binary="$1"
found=0
if [[ "$binary" == *.ipa ]]; then
  work="$(mktemp -d)"
  trap 'rm -rf "$work"' EXIT
  unzip -p "$1" Payload/pkhemu.app/pkhemu >"$work/pkhemu"
  binary="$work/pkhemu"
  if unzip -Z1 "$1" | grep -q '^Payload/pkhemu.app/PlugIns/.'; then
    echo "$1 has app extensions in PlugIns" >&2
    found=1
  fi
fi

imports="$(nm -u "$binary")"
for symbol in csops ptrace; do
  if grep -qx "_$symbol" <<<"$imports"; then
    echo "$1 calls $symbol" >&2
    found=1
  fi
done
# brk #0xf00d, little-endian.
if LC_ALL=C grep -qaF "$(printf '\xa0\x01\x3e\xd4')" "$binary"; then
  echo "$1 has brk #0xf00d" >&2
  found=1
fi
if LC_ALL=C grep -qaF beginExtensionRequestWithInputItems "$binary"; then
  echo "$1 starts app extensions" >&2
  found=1
fi
exit "$found"

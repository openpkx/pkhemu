#!/usr/bin/env bash
set -euo pipefail

check="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/check-public-export.sh"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
status=0

export_dir() {
  local dir="$work/$1"
  mkdir -p "$dir/app/src" "$dir/docs"
  printf '# pkhemu\n' >"$dir/README.md"
  printf 'export const games = []\n' >"$dir/app/src/games.ts"
  git -C "$dir" init -q
  echo "$dir"
}

stage() {
  git -C "$1" add -A -f
  git -C "$1" update-index --add --cacheinfo "160000,19c3007dc5dca4b545d91de058524cfbe3155c93,vendor/mgba"
}

expect() {
  local want="$1" name="$2" dir="$3" mention="${4:-}" got=pass
  "$check" "$dir" >/dev/null 2>"$work/$name.err" || got=fail
  if [ "$got" != "$want" ]; then
    echo "FAIL $name: wanted $want, got $got"
    cat "$work/$name.err"
    status=1
  elif [ -n "$mention" ] && ! grep -qF "$mention" "$work/$name.err"; then
    echo "FAIL $name: the output doesn't name $mention"
    cat "$work/$name.err"
    status=1
  else
    echo "ok   $name"
  fi
}

dir="$(export_dir clean)"
stage "$dir"
expect pass clean "$dir"

dir="$(export_dir outside-allowlist)"
mkdir -p "$dir/docs/guides"
printf '# Guide\n' >"$dir/docs/guides/sync.md"
stage "$dir"
expect fail outside-allowlist "$dir" "docs/guides/sync.md"

dir="$(export_dir wrong-case)"
mkdir -p "$dir/SCRIPTS"
printf 'echo\n' >"$dir/SCRIPTS/run.sh"
stage "$dir"
expect fail wrong-case "$dir" "SCRIPTS/run.sh"

dir="$(export_dir agent-files)"
printf '# Agents\n' >"$dir/CLAUDE.md"
stage "$dir"
expect fail agent-files "$dir" "CLAUDE.md"

dir="$(export_dir private-mention)"
printf '# pkhemu\n\nSee [notes](%s/notes.md).\n' "docs/""private" >"$dir/README.md"
stage "$dir"
expect fail private-mention "$dir" "README.md:3"

dir="$(export_dir tracker-mention)"
printf 'export const games = []\n// %s#12\n' "pkh-emu-issue-""tracker" >"$dir/app/src/games.ts"
stage "$dir"
expect fail tracker-mention "$dir" "app/src/games.ts:2"

dir="$(export_dir private-key)"
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$dir/app/src/signing.txt" 2>/dev/null
stage "$dir"
expect fail private-key "$dir" "app/src/signing.txt:1"

dir="$(export_dir token)"
printf 'const token = "ghp_%s"\n' "$(openssl rand -hex 18)" >"$dir/app/src/sync.ts"
stage "$dir"
expect fail token "$dir" "gitleaks found secrets"

dir="$(export_dir env-file)"
mkdir -p "$dir/app/src-tauri"
printf 'PKH_EMU_DROPBOX_APP_KEY=\n' >"$dir/app/src-tauri/sync.env"
stage "$dir"
expect fail env-file "$dir" "app/src-tauri/sync.env"

dir="$(export_dir keystore)"
printf 'not a real keystore\n' >"$dir/app/release.jks"
stage "$dir"
expect fail keystore "$dir" "app/release.jks"

for file in pkhemu.mobileprovision distribution.cer AuthKey_ABC123.p8; do
  dir="$(export_dir "apple-$file")"
  printf 'not a real apple file\n' >"$dir/app/$file"
  stage "$dir"
  expect fail "apple-$file" "$dir" "app/$file"
done

dir="$(export_dir rom)"
printf 'not a real rom\n' >"$dir/app/src/Emerald.GBA"
stage "$dir"
expect fail rom "$dir" "app/src/Emerald.GBA"

dir="$(export_dir save)"
printf 'not a real save\n' >"$dir/app/src/Emerald.sav"
stage "$dir"
expect fail save "$dir" "app/src/Emerald.sav"

dir="$(export_dir bios)"
printf 'not a real bios\n' >"$dir/app/src/gba_bios.bin"
stage "$dir"
expect fail bios "$dir" "app/src/gba_bios.bin"

dir="$(export_dir large-file)"
head -c $((50 * 1024 * 1024 + 1)) /dev/zero >"$dir/app/src/huge.dat"
stage "$dir"
expect fail large-file "$dir" "app/src/huge.dat"

exit "$status"

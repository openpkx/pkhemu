#!/usr/bin/env bash
set -euo pipefail

script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ios-build.sh"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
status=0
keys=(PKH_EMU_PLUS PKH_EMU_GOOGLE_CLIENT_ID PKH_EMU_GOOGLE_CLIENT_SECRET PKH_EMU_DROPBOX_APP_KEY)
unset "${keys[@]}"
export HOME="$work/home"
mkdir -p "$HOME/.config/pkh-emu"

checkout() {
  local dir="$work/$1"
  printf 'APPLE_API_KEY=ABC123\n' >"$HOME/.config/pkh-emu/ios.env"
  mkdir -p "$dir/scripts" "$dir/app/src-tauri"
  cp "$script" "$dir/scripts/"
  printf 'echo building; echo "store=[$PKH_EMU_STORE]"; exit 0\n' >"$dir/scripts/env.sh"
  printf '%s\n' '# PKH_EMU_PLUS=' 'PKH_EMU_STORE=play' '# PKH_EMU_DROPBOX_APP_KEY=abc' 'PKH_EMU_GOOGLE_CLIENT_ID=' >"$dir/app/src-tauri/sync.env"
  echo "$dir"
}

expect() {
  local want="$1" name="$2" dir="$3" mention="${4:-}" got=refused
  shift 4
  local vars=()
  while [ $# -gt 0 ] && [ "$1" != -- ]; do
    vars+=("$1")
    shift
  done
  [ $# -gt 0 ] && shift
  env ${vars[@]+"${vars[@]}"} bash "$dir/scripts/ios-build.sh" "$@" >"$work/$name.out" 2>&1 && grep -q '^building$' "$work/$name.out" && got=built
  if [ "$got" != "$want" ]; then
    echo "FAIL $name: wanted $want, got $got"
    cat "$work/$name.out"
    status=1
  elif [ -n "$mention" ] && ! grep -qF "$mention" "$work/$name.out"; then
    echo "FAIL $name: the output doesn't name $mention"
    cat "$work/$name.out"
    status=1
  else
    echo "ok   $name"
  fi
}

expect built clean "$(checkout clean)" "store=[appstore]"
expect built unlocked "$(checkout unlocked)" "store=[]" -- --unlocked
expect built no-sync-env "$(checkout no-sync-env; rm "$work/no-sync-env/app/src-tauri/sync.env")" ""

for key in "${keys[@]}"; do
  expect refused "env-$key" "$(checkout "env-$key")" "$key is set" "$key=on"
  dir="$(checkout "file-$key")"
  printf ' %s = on\n' "$key" >>"$dir/app/src-tauri/sync.env"
  expect refused "file-$key" "$dir" "$key is set"
  dir="$(checkout "ios-env-$key")"
  printf '%s=on\n' "$key" >>"$HOME/.config/pkh-emu/ios.env"
  expect refused "ios-env-$key" "$dir" "$key is set"
done

exit "$status"

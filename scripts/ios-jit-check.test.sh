#!/usr/bin/env bash
set -euo pipefail

check="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ios-jit-check.sh"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
status=0

build() {
  printf '%s\n' "$2" >"$work/$1.c"
  clang -arch arm64 -c "$work/$1.c" -o "$work/$1.o"
}

expect() {
  local want="$1" name="$2" file="$3" mention="${4:-}" got=refused
  "$check" "$file" >"$work/$name.out" 2>&1 && got=passed
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

ipa() {
  mkdir -p "$work/$1/Payload/pkhemu.app"
  cp "$work/$2.o" "$work/$1/Payload/pkhemu.app/pkhemu"
  if [ -n "${3:-}" ]; then
    mkdir -p "$work/$1/Payload/pkhemu.app/PlugIns/$3"
    echo helper >"$work/$1/Payload/pkhemu.app/PlugIns/$3/JITHelper"
  fi
  (cd "$work/$1" && zip -qr "$work/$1.ipa" Payload)
  echo "$work/$1.ipa"
}

build clean 'int main(void) { return 0; }'
build csops 'int csops(int, unsigned, void *, unsigned long); int main(void) { return csops(0, 0, 0, 0); }'
build ptrace 'int ptrace(int, int, char *, int); int main(void) { return ptrace(0, 0, 0, 0); }'
build brk 'int main(void) { __asm__ volatile("brk #0xf00d"); return 0; }'
build other-brk 'int main(void) { __asm__ volatile("brk #0x1"); return 0; }'
build extension 'const char *selector = "beginExtensionRequestWithInputItems:error:"; int main(void) { return selector[0]; }'

expect passed clean "$work/clean.o"
expect passed other-brk "$work/other-brk.o"
expect refused csops "$work/csops.o" "calls csops"
expect refused ptrace "$work/ptrace.o" "calls ptrace"
expect refused brk "$work/brk.o" "brk #0xf00d"
expect passed clean-ipa "$(ipa clean-ipa clean)"
expect refused brk-ipa "$(ipa brk-ipa brk)" "brk #0xf00d"
expect refused extension "$work/extension.o" "starts app extensions"
expect refused helper-ipa "$(ipa helper-ipa clean JITHelper.appex)" "app extensions in PlugIns"
expect refused not-an-app "$work/clean.c"

exit "$status"

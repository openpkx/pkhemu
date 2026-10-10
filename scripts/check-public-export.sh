#!/usr/bin/env bash
set -euo pipefail

dir="${1:?usage: scripts/check-public-export.sh <export-dir>}"
allowlist="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/export-public.allowlist"
max_bytes=$((50 * 1024 * 1024))
failed=0

fail() {
  echo "$1" >&2
  failed=1
}

allowed() {
  local entry
  while IFS= read -r entry; do
    case "$entry" in
      "") ;;
      */) [[ "$1" == "$entry"* ]] && return 0 ;;
      *) [ "$1" = "$entry" ] && return 0 ;;
    esac
  done <"$allowlist"
  return 1
}

# The parentheses keep this script from matching its own patterns once it's in the export.
private_docs='docs/(private|adr|agents|research|roadmap)|pkh-emu-issue-(tracker)'
private_key='-----BEGIN ([A-Z0-9]+ )*PRIVATE KEY'

tree="$(git -C "$dir" write-tree)"
while IFS= read -r -d '' entry; do
  path="${entry#*$'\t'}"
  read -r _ type _ size <<<"${entry%%$'\t'*}"
  name="${path##*/}"

  allowed "$path" || fail "$path: not on the allowlist"
  shopt -s nocasematch
  case "$name" in
    .env | .env.* | *.env) fail "$path: environment file" ;;
    *.jks | *.keystore | *.p12 | *.pfx | *.pem | *.key) fail "$path: keystore or key file" ;;
    *.gb | *.gbc | *.gba | *.nds | *.dsi | *.n64 | *.z64 | *.v64 | *.rom) fail "$path: ROM" ;;
    *.sav | *.srm | *.dsv | *.ss[0-9] | *.state) fail "$path: save file" ;;
    *bios*.bin | firmware*.bin) fail "$path: BIOS" ;;
  esac
  shopt -u nocasematch
  if [ "$type" = blob ] && [ "$size" -gt "$max_bytes" ]; then
    fail "$path: $size bytes, over 50 MB"
  fi
done < <(git -C "$dir" ls-tree -r -l -z --full-tree "$tree")

while IFS= read -r hit; do
  fail "$hit: private path or tracker"
done < <(git -C "$dir" grep --cached -n -I -E "$private_docs" || true)

while IFS= read -r hit; do
  fail "$(cut -d: -f1,2 <<<"$hit"): private key"
done < <(git -C "$dir" grep --cached -n -I -E -e "$private_key" || true)

if ! command -v gitleaks >/dev/null; then
  fail "gitleaks isn't installed"
elif ! gitleaks dir "$dir" --no-banner --redact --verbose --log-level error >&2; then
  fail "gitleaks found secrets, listed above"
fi

if [ "$failed" != 0 ]; then
  echo "The export failed its checks." >&2
  exit 1
fi

#!/usr/bin/env bash
set -euo pipefail

tag="${1:?usage: scripts/export-public.sh <tag> [out-dir]}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(git -C "$here" rev-parse --show-toplevel)"
out="${2:-$(mktemp -d)/pkhemu}"
commit="$(git -C "$root" rev-parse --verify --quiet "$tag^{commit}")" || {
  echo "No commit for $tag." >&2
  exit 1
}

mkdir -p "$out"
if [ -n "$(ls -A "$out")" ]; then
  echo "$out isn't empty." >&2
  exit 1
fi

paths=()
while IFS= read -r path; do
  if [ -n "$path" ] && git -C "$root" cat-file -e "$commit:${path%/}" 2>/dev/null; then
    paths+=("$path")
  fi
done <"$here/export-public.allowlist"
if [ ${#paths[@]} = 0 ]; then
  echo "$tag has none of the allowlisted paths." >&2
  exit 1
fi

git -C "$root" archive "$commit" -- "${paths[@]}" | tar -x -C "$out"
git -C "$out" init -q -b main
git -C "$out" add -A -f .

submodule_url() {
  local name
  name="$(git config -f "$out/.gitmodules" --get-regexp '^submodule\..*\.path$' 2>/dev/null |
    awk -v path="$1" '$2 == path { sub(/^submodule\./, "", $1); sub(/\.path$/, "", $1); print $1 }')"
  [ -n "$name" ] && git config -f "$out/.gitmodules" --get "submodule.$name.url"
}

# Fetches the pinned commit with no credentials, so it only succeeds if anyone can get it.
public_pin() {
  case "$1" in https://*) ;; *) return 1 ;; esac
  local probe status=0
  probe="$(mktemp -d)"
  git init -q --bare "$probe"
  env -u GIT_ASKPASS -u SSH_ASKPASS GIT_TERMINAL_PROMPT=0 GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null \
    git -C "$probe" fetch -q --depth=1 --filter=tree:0 "$1" "$2" 2>/dev/null || status=$?
  rm -rf "$probe"
  return "$status"
}

pins=""
while IFS=$'\t' read -r meta path; do
  read -r _ type sha <<<"$meta"
  [ "$type" = commit ] || continue
  url="$(submodule_url "$path")" || {
    echo "$path: no URL in .gitmodules" >&2
    exit 1
  }
  public_pin "$url" "$sha" || {
    echo "$path: $url doesn't serve $sha to anonymous clones, so it isn't public" >&2
    exit 1
  }
  git -C "$out" update-index --add --cacheinfo "160000,$sha,$path"
  pins+="$path $sha $url"$'\n'
done < <(git -C "$root" ls-tree -r "$commit" -- "${paths[@]}")

"$here/check-public-export.sh" "$out"

tree="$(git -C "$out" write-tree)"
echo "Public export of $tag ($commit) in $out"
echo
echo "Files:"
git -C "$out" ls-tree -r --full-tree "$tree" | awk -F'\t' '$1 ~ / blob / { print $2 }'
echo
echo "Submodules:"
printf '%s' "$pins"
echo
git -C "$out" ls-tree -r -l --full-tree "$tree" | awk '
  $2 == "blob" { files++; bytes += $4 }
  END { printf "Size: %d files, %.1f MB (%d bytes)\n", files, bytes / 1048576, bytes }'

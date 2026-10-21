#!/usr/bin/env bash
set -euo pipefail

commit="${1:?usage: scripts/update-layouts.sh <commit>}"
repo="${LAYOUTS_REPO:-https://github.com/openpkx/layouts}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
copy="$root/app/src/research/layouts"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

git clone --quiet --bare "$repo" "$work/layouts.git"
if ! sha="$(git -C "$work/layouts.git" rev-parse --verify --quiet "$commit^{commit}")"; then
  echo "$commit isn't a commit of $repo" >&2
  exit 1
fi

git -C "$work/layouts.git" archive "$sha" LICENSE schema transforms known findings parsers tools/parser/runtime.ts tools/steps \
  ':(exclude)tools/steps/*.test.ts' ':(exclude)tools/steps/vectors.ts' | tar -x -C "$work" -f -
rm -rf "$copy"
mkdir -p "$copy"
mv "$work/LICENSE" "$work/schema" "$work/transforms" "$work/known" "$work/findings" "$work/parsers" "$work/tools" "$copy/"
echo "$sha" >"$copy/COMMIT"

git -C "$root" add -A "$copy"
ignored="$(git -C "$root" ls-files --others --ignored --exclude-standard -- "$copy")"
if [ -n "$ignored" ]; then
  echo "These layouts files are gitignored, so the copy can't be committed whole:" >&2
  echo "$ignored" >&2
  exit 1
fi
echo "Commit with: chore: update layouts to $sha"

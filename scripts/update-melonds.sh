#!/usr/bin/env bash
set -euo pipefail

ref="${1:?usage: scripts/update-melonds.sh <commit or branch melonDS DS pins>}"
upstream=https://github.com/JesseTG/melonDS
fork=https://github.com/pkhex-web/melonDS
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dep="$root/vendor/melonds-ds-deps/melonDS"

git -C "$root" submodule update --init vendor/melonds-ds-deps/melonDS
cd "$dep"

git fetch --quiet "$upstream" "+refs/heads/*:refs/remotes/upstream/*"
target="$(git rev-parse --verify --quiet "upstream/$ref^{commit}" || git rev-parse --verify "$ref^{commit}")"
git fetch --quiet "$fork" pkh-emu
published="$(git rev-parse FETCH_HEAD)"
# melonDS DS pins melonDS by commit, not by tag, so the patches are whatever upstream doesn't have.
patches="$(git rev-list --count "$published" --not --remotes=upstream)"
base="$(git rev-parse "$published~$patches")"

git checkout --quiet -B pkh-emu "$published"
if ! git rebase --quiet --onto "$target" "$base" pkh-emu; then
  stuck="$(git log -1 --format='%h %s' REBASE_HEAD)"
  git rebase --abort
  echo "Stopped: $stuck no longer applies on $ref. Fix it on pkh-emu by hand." >&2
  exit 1
fi

if [ "$(git rev-parse HEAD)" != "$published" ]; then
  git push --force-with-lease="pkh-emu:$published" "$fork" HEAD:pkh-emu
fi

node "$root/scripts/licences.mjs"
git -C "$root" add vendor/melonds-ds-deps/melonDS app/src/licences/dependencies.json

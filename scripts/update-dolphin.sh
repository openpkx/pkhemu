#!/usr/bin/env bash
set -euo pipefail

ref="${1:?usage: scripts/update-dolphin.sh <commit or branch>}"
upstream=https://github.com/libretro/dolphin
fork=https://github.com/pkhex-web/dolphin
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
core="$root/vendor/dolphin"

git -C "$root" submodule update --init vendor/dolphin
cd "$core"

git fetch --quiet "$upstream" "+refs/heads/*:refs/remotes/upstream/*"
target="$(git rev-parse --verify --quiet "upstream/$ref^{commit}" || git rev-parse --verify "$ref^{commit}")"
git fetch --quiet "$fork" pkh-emu
published="$(git rev-parse FETCH_HEAD)"
# The libretro fork has no releases, so the patches are whatever it doesn't have.
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
"$root/scripts/dolphin-externals.sh"

node "$root/scripts/licences.mjs"
git -C "$root" add vendor/dolphin app/src/licences/dependencies.json

#!/usr/bin/env bash
set -euo pipefail

tag="${1:?usage: scripts/update-mgba.sh <tag>}"
upstream=https://github.com/mgba-emu/mgba
fork=https://github.com/pkhex-web/mgba
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
core="$root/vendor/mgba"

git -C "$root" submodule update --init vendor/mgba
cd "$core"

git fetch --quiet "$fork" "+refs/tags/*:refs/tags/*"
git fetch --quiet "$upstream" "+refs/tags/$tag:refs/tags/$tag"
git fetch --quiet "$fork" pkh-emu
published="$(git rev-parse FETCH_HEAD)"
base="$(git describe --tags --abbrev=0 "$published")"

git checkout --quiet -B pkh-emu "$published"
if ! git rebase --quiet --onto "$tag" "$base" pkh-emu; then
  stuck="$(git log -1 --format='%h %s' REBASE_HEAD)"
  git rebase --abort
  echo "Stopped: $stuck no longer applies on $tag. Fix it on pkh-emu by hand." >&2
  exit 1
fi

if [ "$(git rev-parse HEAD)" != "$published" ]; then
  git push --atomic --force-with-lease="pkh-emu:$published" "$fork" HEAD:pkh-emu "refs/tags/$tag"
fi

node "$root/scripts/licences.mjs"
git -C "$root" add vendor/mgba app/src/licences/dependencies.json

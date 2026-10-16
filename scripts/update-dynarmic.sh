#!/usr/bin/env bash
set -euo pipefail

ref="${1:?usage: scripts/update-dynarmic.sh <commit or branch Azahar pins>}"
upstream=https://github.com/azahar-emu/dynarmic
fork=https://github.com/pkhex-web/dynarmic
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
core="$root/vendor/azahar"
dep="$core/externals/dynarmic"

git -C "$core" submodule update --init externals/dynarmic
cd "$dep"

git fetch --quiet "$upstream" "+refs/heads/*:refs/remotes/upstream/*"
target="$(git rev-parse --verify --quiet "upstream/$ref^{commit}" || git rev-parse --verify "$ref^{commit}")"
git fetch --quiet "$fork" pkh-emu
published="$(git rev-parse FETCH_HEAD)"
# Azahar pins dynarmic by commit, not by tag, so the patches are whatever upstream doesn't have.
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
git submodule update --init --recursive

# Azahar's pkh-emu branch pins the result. Commit it there and push it before scripts/update-azahar.sh.
git -C "$core" add externals/dynarmic

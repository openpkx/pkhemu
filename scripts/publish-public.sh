#!/usr/bin/env bash
set -euo pipefail

tag="${1:?usage: scripts/publish-public.sh <tag>}"
case "$tag" in
  v[0-9]*) ;;
  *)
    echo "$tag isn't a release tag like v0.1.1." >&2
    exit 1
    ;;
esac
version="${tag#v}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(git -C "$here" rev-parse --show-toplevel)"
remote="${PUBLIC_REPO:-git@github.com:openpkx/pkhemu.git}"

date="$(git -C "$root" for-each-ref --format='%(creatordate:iso-strict)' "refs/tags/$tag")"
if [ -z "$date" ]; then
  echo "No tag $tag." >&2
  exit 1
fi

out="$(mktemp -d)/pkhemu"
"$here/export-public.sh" "$tag" "$out"

refs="$(git -C "$out" ls-remote "$remote" refs/heads/main "refs/tags/$tag")"
if cut -f2 <<<"$refs" | grep -qxF "refs/tags/$tag"; then
  echo "$remote already has $tag." >&2
  exit 1
fi
parent=""
if cut -f2 <<<"$refs" | grep -qxF refs/heads/main; then
  git -C "$out" fetch -q "$remote" main
  parent="$(git -C "$out" rev-parse FETCH_HEAD)"
fi

tree="$(git -C "$out" write-tree)"
export GIT_AUTHOR_DATE="$date" GIT_COMMITTER_DATE="$date"
commit="$(git -C "$out" commit-tree "$tree" ${parent:+-p "$parent"} -m "pkhemu $version")"
git -C "$out" tag -a "$tag" -m "pkhemu $version" "$commit"
git -C "$out" push -q --atomic "$remote" "$commit:refs/heads/main" "refs/tags/$tag"
echo "Published $tag to $remote as $commit."

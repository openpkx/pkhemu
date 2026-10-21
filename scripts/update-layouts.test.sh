#!/usr/bin/env bash
set -euo pipefail

script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/update-layouts.sh"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
status=0

fail() {
  echo "FAIL $1"
  status=1
}

ok() {
  echo "ok   $1"
}

layouts="$work/layouts"
git init -q -b main "$layouts"
mkdir -p "$layouts/schema" "$layouts/transforms/vectors" "$layouts/known" "$layouts/findings" "$layouts/parsers" "$layouts/tools/parser" "$layouts/tools/steps"
printf 'CC0\n' >"$layouts/LICENSE"
printf '# Layouts\n' >"$layouts/README.md"
printf '{}\n' >"$layouts/schema/layout.schema.json"
printf '# gen3-sections\n' >"$layouts/transforms/gen3-sections.md"
printf 'vector\n' >"$layouts/transforms/vectors/frlg.sav"
printf '{"target":"frlg"}\n' >"$layouts/known/frlg-1.0.json"
printf '{"target":"emerald"}\n' >"$layouts/known/emerald-1.0.json"
touch "$layouts/findings/.gitkeep"
printf 'console.log()\n' >"$layouts/tools/validate.mjs"
printf 'export {}\n' >"$layouts/parsers/frlg-1.0.ts"
printf 'export {}\n' >"$layouts/tools/parser/runtime.ts"
printf 'export {}\n' >"$layouts/tools/parser/generate.ts"
printf 'export {}\n' >"$layouts/tools/steps/bytes.ts"
printf 'export {}\n' >"$layouts/tools/steps/steps.test.ts"
printf 'export {}\n' >"$layouts/tools/steps/vectors.ts"
git -C "$layouts" add -A
git -C "$layouts" -c user.name=t -c user.email=t@t commit -qm first
first="$(git -C "$layouts" rev-parse HEAD)"
git -C "$layouts" rm -q known/emerald-1.0.json
printf '{"target":"frlg","v":2}\n' >"$layouts/known/frlg-1.0.json"
git -C "$layouts" add -A
git -C "$layouts" -c user.name=t -c user.email=t@t commit -qm second
second="$(git -C "$layouts" rev-parse HEAD)"

app="$work/app"
mkdir -p "$app/scripts" "$app/app/src/research"
cp "$script" "$app/scripts/"
printf '*.sav\n!app/src/research/layouts/transforms/vectors/*.sav\n' >"$app/.gitignore"
git init -q "$app"
git -C "$app" add -A
git -C "$app" -c user.name=t -c user.email=t@t commit -qm init

update() {
  LAYOUTS_REPO="$layouts" "$app/scripts/update-layouts.sh" "$1" >"$work/out" 2>&1
}

copy="$app/app/src/research/layouts"
listing() {
  (cd "$copy" && find . -type f | LC_ALL=C sort)
}

update "$first" || fail "update to the first commit: $(cat "$work/out")"
want="./COMMIT
./LICENSE
./findings/.gitkeep
./known/emerald-1.0.json
./known/frlg-1.0.json
./parsers/frlg-1.0.ts
./schema/layout.schema.json
./tools/parser/runtime.ts
./tools/steps/bytes.ts
./transforms/gen3-sections.md
./transforms/vectors/frlg.sav"
if [ "$(listing)" = "$want" ]; then ok copies-the-layouts; else fail "copies-the-layouts: got $(listing)"; fi
if [ "$(cat "$copy/COMMIT")" = "$first" ]; then ok writes-the-commit; else fail "writes-the-commit: got $(cat "$copy/COMMIT")"; fi
if grep -qF "$first" "$work/out"; then ok names-the-commit; else fail "names-the-commit: $(cat "$work/out")"; fi
if git -C "$app" diff --cached --quiet -- app/src/research/layouts/transforms/vectors/frlg.sav; then
  fail "stages-the-copy: the vector isn't staged"
else
  ok stages-the-copy
fi

git -C "$app" -c user.name=t -c user.email=t@t commit -qm copy
update "$first" || fail "second run: $(cat "$work/out")"
if [ -z "$(git -C "$app" status --porcelain)" ]; then ok second-run-changes-nothing; else fail "second-run-changes-nothing: $(git -C "$app" status --porcelain)"; fi

update main || fail "update to main: $(cat "$work/out")"
if [ "$(cat "$copy/COMMIT")" = "$second" ]; then ok resolves-a-branch; else fail "resolves-a-branch: got $(cat "$copy/COMMIT")"; fi
if [ ! -e "$copy/known/emerald-1.0.json" ]; then ok drops-removed-files; else fail drops-removed-files; fi
if grep -qF '"v":2' "$copy/known/frlg-1.0.json"; then ok updates-changed-files; else fail updates-changed-files; fi

update "${first:0:7}" || fail "update to a short SHA: $(cat "$work/out")"
if [ "$(listing)" = "$want" ] && [ "$(cat "$copy/COMMIT")" = "$first" ]; then
  ok reproduces-an-older-commit
else
  fail "reproduces-an-older-commit: got $(listing)"
fi
if [ -z "$(git -C "$app" status --porcelain)" ]; then ok matches-the-committed-copy; else fail "matches-the-committed-copy: $(git -C "$app" status --porcelain)"; fi

if update no-such-commit; then
  fail "refuses-an-unknown-commit: it passed"
elif ! grep -qF no-such-commit "$work/out"; then
  fail "refuses-an-unknown-commit: the output doesn't name it: $(cat "$work/out")"
elif [ "$(cat "$copy/COMMIT")" != "$first" ]; then
  fail "refuses-an-unknown-commit: the copy changed"
else
  ok refuses-an-unknown-commit
fi

printf 'not a vector\n' >"$layouts/known/Emerald.sav"
git -C "$layouts" add -A
git -C "$layouts" -c user.name=t -c user.email=t@t commit -qm ignored
if update main; then
  fail "refuses-ignored-files: it passed"
elif ! grep -qF known/Emerald.sav "$work/out"; then
  fail "refuses-ignored-files: the output doesn't name the file: $(cat "$work/out")"
else
  ok refuses-ignored-files
fi

exit "$status"

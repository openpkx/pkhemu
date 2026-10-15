set -euo pipefail
unset NODE_ENV

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
app="$root/app"

git -C "$root" submodule update --init
# Only Azahar has submodules of its own, and Mupen64Plus-Next's stray gitlink stops a recursive update from the top.
git -C "$root/vendor/azahar" submodule update --init --recursive

if [ ! -d "$app/node_modules" ] || [ "$app/package-lock.json" -nt "$app/node_modules/.package-lock.json" ]; then
  npm --prefix "$app" ci
fi

cd "$app"

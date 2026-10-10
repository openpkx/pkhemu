set -euo pipefail
unset NODE_ENV

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
app="$root/app"

git -C "$root" submodule update --init

if [ ! -d "$app/node_modules" ] || [ "$app/package-lock.json" -nt "$app/node_modules/.package-lock.json" ]; then
  npm --prefix "$app" ci
fi

cd "$app"

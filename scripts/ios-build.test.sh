#!/usr/bin/env bash
set -euo pipefail

script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ios-build.sh"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
status=0
keys=(PKH_EMU_PLUS PKH_EMU_GOOGLE_CLIENT_ID PKH_EMU_GOOGLE_CLIENT_SECRET PKH_EMU_DROPBOX_APP_KEY)
unset "${keys[@]}"
export HOME="$work/home"
mkdir -p "$HOME/.config/pkh-emu" "$work/bin"
export PATH="$work/bin:$PATH"
export CARGO_TARGET_DIR="$work/target"

cat >"$work/bin/npx" <<'EOF'
#!/usr/bin/env bash
echo "npx $* icon=[$(cat src-tauri/gen/apple/Assets.xcassets/AppIcon.appiconset/AppIcon-60x60@3x.png)] sync.env=[$(grep -v '^#' src-tauri/sync.env | tr '\n' ' ')]" >>calls.log
app=src-tauri/gen/apple/build/pkh-emu_iOS.xcarchive/Products/Applications/pkhemu.app
mkdir -p "$app/Frameworks/core.framework"
echo binary >"$app/pkhemu"
plutil -create xml1 "$app/Info.plist"
plutil -insert CFBundleIdentifier -string com.example.pkhemu "$app/Info.plist"
plutil -insert CFBundleShortVersionString -string 1.2.3 "$app/Info.plist"
plutil -insert CFBundleVersion -string 456 "$app/Info.plist"
EOF
cat >"$work/bin/cargo" <<'EOF'
#!/usr/bin/env bash
echo "cargo $* deployment=[$IPHONEOS_DEPLOYMENT_TARGET]" >>calls.log
mkdir -p "$CARGO_TARGET_DIR/aarch64-apple-ios/release"
echo helper >"$CARGO_TARGET_DIR/aarch64-apple-ios/release/JITHelper"
EOF
cat >"$work/bin/xcrun" <<'EOF'
#!/usr/bin/env bash
echo "xcrun $*" >>calls.log
EOF
cat >"$work/bin/codesign" <<'EOF'
#!/usr/bin/env bash
echo "codesign $*" >>calls.log
while [ $# -gt 0 ]; do
  [ "$1" = --entitlements ] && cat "$2" >>calls.log
  shift
done
EOF
chmod +x "$work/bin"/*

original_sync_env() {
  printf '%s\n' '# PKH_EMU_PLUS=' 'PKH_EMU_STORE=play' '# PKH_EMU_DROPBOX_APP_KEY=abc' 'PKH_EMU_GOOGLE_CLIENT_ID='
}

checkout() {
  local dir="$work/$1"
  printf 'APPLE_API_KEY=ABC123\nAPPLE_API_ISSUER=DEF456\n' >"$HOME/.config/pkh-emu/ios.env"
  mkdir -p "$dir/scripts" "$dir/app/src-tauri/gen/apple/pkh-emu_iOS" "$dir/app/src-tauri/gen/apple/Assets.xcassets/AppIcon.appiconset"
  mkdir -p "$dir/app/src-tauri/icons/ios" "$dir/app/src-tauri/icons/ios-sideload"
  echo plain | tee "$dir/app/src-tauri/icons/ios/AppIcon-60x60@3x.png" >"$dir/app/src-tauri/gen/apple/Assets.xcassets/AppIcon.appiconset/AppIcon-60x60@3x.png"
  echo badged >"$dir/app/src-tauri/icons/ios-sideload/AppIcon-60x60@3x.png"
  cp "$script" "$(dirname "$script")/check-store-bundle.sh" "$dir/scripts/"
  printf '#!/usr/bin/env bash\necho "ios-jit-check $*" >>calls.log\n' >"$dir/scripts/ios-jit-check.sh"
  chmod +x "$dir/scripts/ios-jit-check.sh"
  cp "$(dirname "$script")/../app/src-tauri/gen/apple/pkh-emu_iOS/pkh-emu_iOS.entitlements" "$dir/app/src-tauri/gen/apple/pkh-emu_iOS/"
  mkdir -p "$dir/crates/jit-helper"
  cp "$(dirname "$script")/../crates/jit-helper/Info.plist" "$dir/crates/jit-helper/"
  printf 'echo building; echo "store=[$PKH_EMU_STORE]"; root="%s"; cd "%s/app"\n' "$dir" "$dir" >"$dir/scripts/env.sh"
  original_sync_env >"$dir/app/src-tauri/sync.env"
  echo "$dir"
}

expect() {
  local want="$1" name="$2" dir="$3" mention="${4:-}" got=refused
  shift 4
  local vars=()
  while [ $# -gt 0 ] && [ "$1" != -- ]; do
    vars+=("$1")
    shift
  done
  [ $# -gt 0 ] && shift
  env ${vars[@]+"${vars[@]}"} bash "$dir/scripts/ios-build.sh" "$@" >"$work/$name.out" 2>&1 && grep -q '^building$' "$work/$name.out" && got=built
  if [ "$got" != "$want" ]; then
    echo "FAIL $name: wanted $want, got $got"
    cat "$work/$name.out"
    status=1
  elif [ -n "$mention" ] && ! grep -qF "$mention" "$work/$name.out"; then
    echo "FAIL $name: the output doesn't name $mention"
    cat "$work/$name.out"
    status=1
  else
    echo "ok   $name"
  fi
}

check() {
  local name="$1" what="$2"
  shift 2
  if "$@" >/dev/null 2>&1; then
    echo "ok   $name $what"
  else
    echo "FAIL $name: $what"
    status=1
  fi
}

calls() {
  grep -q -- "$2" "$work/$1/app/calls.log"
}

expect built clean "$(checkout clean)" "store=[appstore]"
check clean "uploads to App Store Connect" calls clean "xcrun altool --upload-app"
check clean "checks for JIT code before uploading" eval "grep -A1 'ios-jit-check .*/pkhemu.ipa' '$work/clean/app/calls.log' | grep -q altool"
check clean "keeps the App Store icon" calls clean "icon=\[plain\]"
check clean "keeps the App Store signature" eval '! calls clean codesign'
check clean "leaves the JIT helper out" eval '! calls clean jit-helper'
check clean "tells the Rust build its flavour" calls clean "sync.env=\[PKH_EMU_GOOGLE_CLIENT_ID= PKH_EMU_STORE=appstore \]"
check clean "drops the flavour sync.env had" eval '! calls clean "PKH_EMU_STORE=play"'
check clean "puts sync.env back" eval "diff <(original_sync_env) '$work/clean/app/src-tauri/sync.env'"
expect built unlocked "$(checkout unlocked)" "store=[]" -- --unlocked
check unlocked "uploads to App Store Connect" calls unlocked "xcrun altool --upload-app"
check unlocked "checks for JIT code" calls unlocked "ios-jit-check"
check unlocked "tells the Rust build its flavour" calls unlocked "sync.env=\[PKH_EMU_GOOGLE_CLIENT_ID= PKH_EMU_STORE= \]"
check unlocked "puts sync.env back" eval "diff <(original_sync_env) '$work/unlocked/app/src-tauri/sync.env'"

dir="$(checkout ko-fi)"
mkdir -p "$dir/app/dist/assets"
echo 'open("https://ko-fi.com/pkhemu")' >"$dir/app/dist/assets/index.js"
expect refused ko-fi "$dir" "Ko-fi link"
check ko-fi "uploads nothing" eval '! calls ko-fi altool'
check ko-fi "puts sync.env back" eval "diff <(original_sync_env) '$dir/app/src-tauri/sync.env'"
expect built no-sync-env "$(checkout no-sync-env; rm "$work/no-sync-env/app/src-tauri/sync.env")" ""
check no-sync-env "tells the Rust build its flavour" calls no-sync-env "sync.env=\[PKH_EMU_STORE=appstore \]"
check no-sync-env "leaves no sync.env behind" test ! -e "$work/no-sync-env/app/src-tauri/sync.env"

dir="$(checkout sideload)"
printf '%s = on\n' "${keys[@]}" >>"$dir/app/src-tauri/sync.env"
printf '%s=on\n' "${keys[@]}" >>"$HOME/.config/pkh-emu/ios.env"
expect built sideload "$dir" "store=[sideload]" PKH_EMU_GOOGLE_CLIENT_ID=on -- --sideload
check sideload "uploads nothing" eval '! calls sideload altool'
check sideload "builds unsigned" calls sideload "--no-sign --archive-only"
check sideload "badges the icon" calls sideload "icon=\[badged\]"
check sideload "tells the Rust build its flavour" calls sideload "sync.env=\[PKH_EMU_GOOGLE_CLIENT_ID= .*PKH_EMU_STORE=sideload \]"
check sideload "drops the flavour sync.env had" eval '! calls sideload "PKH_EMU_STORE=play"'
check sideload "puts sync.env back" grep -qx PKH_EMU_STORE=play "$dir/app/src-tauri/sync.env"
check sideload "keeps sync.env's other lines" grep -qx "PKH_EMU_GOOGLE_CLIENT_ID = on" "$dir/app/src-tauri/sync.env"
check sideload "puts the App Store icon back" grep -qx plain "$dir/app/src-tauri/gen/apple/Assets.xcassets/AppIcon.appiconset/AppIcon-60x60@3x.png"
check sideload "signs the cores" calls sideload "codesign .*--sign - .*/core.framework"
check sideload "signs with get-task-allow" calls sideload "<key>get-task-allow</key>"
check sideload "builds the JIT helper for iPhone" calls sideload "cargo build --release .*-p jit-helper --target aarch64-apple-ios deployment=\[18.0\]"
check sideload "signs the JIT helper before the app" eval "grep codesign '$dir/app/calls.log' | grep -B1 -- --entitlements | head -1 | grep -q JITHelper.appex"
ipa="$dir/app/src-tauri/gen/apple/build/pkhemu-sideload.ipa"
helper_plist="$work/helper-Info.plist"
unzip -p "$ipa" Payload/pkhemu.app/PlugIns/JITHelper.appex/Info.plist >"$helper_plist" 2>/dev/null || true
check sideload "names the JIT helper after the app" eval "plutil -extract CFBundleIdentifier raw '$helper_plist' | grep -qx com.example.pkhemu.JITHelper"
check sideload "gives the JIT helper the app's version" eval "plutil -extract CFBundleVersion raw '$helper_plist' | grep -qx 456"
check sideload "bundles the JIT helper" unzip -Z1 "$ipa" Payload/pkhemu.app/PlugIns/JITHelper.appex/JITHelper
check sideload "exports the IPA" eval "unzip -l '$dir/app/src-tauri/gen/apple/build/pkhemu-sideload.ipa' | grep Payload/pkhemu.app/pkhemu"

for key in "${keys[@]}"; do
  expect refused "env-$key" "$(checkout "env-$key")" "$key is set" "$key=on"
  dir="$(checkout "file-$key")"
  printf ' %s = on\n' "$key" >>"$dir/app/src-tauri/sync.env"
  expect refused "file-$key" "$dir" "$key is set"
  dir="$(checkout "ios-env-$key")"
  printf '%s=on\n' "$key" >>"$HOME/.config/pkh-emu/ios.env"
  expect refused "ios-env-$key" "$dir" "$key is set"
done

exit "$status"

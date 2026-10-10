source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

export JAVA_HOME="${JAVA_HOME:-$(brew --prefix openjdk@17)}"
export ANDROID_HOME="${ANDROID_HOME:-$(brew --prefix)/share/android-commandlinetools}"
export NDK_HOME="${NDK_HOME:-$(ls -d "$ANDROID_HOME"/ndk/* | sort -V | tail -1)}"
export PATH="$ANDROID_HOME/platform-tools:$PATH"

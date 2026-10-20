#!/usr/bin/env bash
# Checks out the Dolphin submodules its libretro core builds from. Qt, FFmpeg, SDL and the rest are left out.
set -euo pipefail

dolphin="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/vendor/dolphin"

externals=(
  bzip2/bzip2
  cpp-ipc/cpp-ipc
  cpp-optparse/cpp-optparse
  curl/curl
  enet/enet
  fmt/fmt
  glslang/glslang
  hidapi/hidapi-src
  imgui/imgui
  implot/implot
  libadrenotools
  libspng/libspng
  libusb/libusb
  lz4/lz4
  mGBA/mgba
  minizip-ng/minizip-ng
  pugixml/pugixml
  SFML/SFML
  spirv_cross/SPIRV-Cross
  tinygltf/tinygltf
  Vulkan-Headers
  VulkanMemoryAllocator
  watcher/watcher
  xxhash/xxHash
  zlib-ng/zlib-ng
  zstd/zstd
)

git -C "$dolphin" submodule update --init --jobs 8 "${externals[@]/#/Externals/}"
git -C "$dolphin/Externals/libadrenotools" submodule update --init

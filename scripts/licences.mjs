import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const path = (relative) => fileURLToPath(new URL(`../${relative}`, import.meta.url));
const run = (command, args) => execFileSync(command, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const byName = (a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version);

const mgbaVersion = run("git", ["-C", path("vendor/mgba"), "describe", "--tags", "--abbrev=0"]).trim();
const mgba = `https://github.com/mgba-emu/mgba/tree/${mgbaVersion}`;

const melonDsDsRelease = run("git", ["-C", path("vendor/melonds-ds"), "describe", "--tags", "--abbrev=0"]).trim();
const pinned = (dep, repo) => {
  const commit = run("git", ["-C", path(`vendor/melonds-ds-deps/${dep}`), "rev-parse", "HEAD"]).trim();
  return `https://github.com/${repo}/tree/${commit}`;
};
const melonDs = pinned("melonDS", "pkhex-web/melonDS");

const mupenCommit = run("git", ["-C", path("vendor/mupen64plus-next"), "rev-parse", "HEAD"]).trim();
const mupen = `https://github.com/pkhex-web/mupen64plus-libretro-nx/tree/${mupenCommit}`;

const azaharRelease = run("git", ["-C", path("vendor/azahar"), "describe", "--tags", "--abbrev=0"]).trim();
const azaharCommit = run("git", ["-C", path("vendor/azahar"), "rev-parse", "HEAD"]).trim();
const azahar = `https://github.com/pkhex-web/azahar/tree/${azaharCommit}`;
const azaharPinned = (dep, repo) => {
  const commit = run("git", ["-C", path(`vendor/azahar/externals/${dep}`), "rev-parse", "HEAD"]).trim();
  return `https://github.com/${repo}/tree/${commit}`;
};

const moltenVkRelease = readFileSync(path("app/src-tauri/build.rs"), "utf8").match(/MOLTENVK_VERSION: &str = "v(.+)"/)[1];
const moltenVk = `https://github.com/KhronosGroup/MoltenVK/tree/v${moltenVkRelease}`;

// Only the parts of mGBA that core/CMakeLists.txt compiles in, what melonDS DS's CMake bundles,
// what build.rs compiles into Mupen64Plus-Next, what Azahar's libretro core links, and what Khronos links into MoltenVK.
const core = [
  {
    name: "mGBA",
    version: `${mgbaVersion}, modified`,
    licence: "MPL-2.0",
    source: "https://github.com/pkhex-web/mgba/tree/pkh-emu",
  },
  { name: "blip_buf", version: "1.1.0", licence: "LGPL-2.1-or-later", source: `${mgba}/src/third-party/blip_buf` },
  { name: "inih", licence: "BSD-3-Clause", source: `${mgba}/src/third-party/inih` },
  { name: "libretro.h", licence: "MIT", source: `${mgba}/src/platform/libretro` },
  {
    name: "melonDS DS",
    version: `${melonDsDsRelease.replace(/^v/, "")}, modified`,
    licence: "GPL-3.0-or-later",
    source: "https://github.com/pkhex-web/melonds-ds/tree/pkh-emu",
  },
  {
    name: "melonDS",
    version: "modified",
    licence: "GPL-3.0-or-later",
    source: "https://github.com/pkhex-web/melonDS/tree/pkh-emu",
  },
  { name: "Dolphin (melonDS)", licence: "GPL-2.0-or-later", source: `${melonDs}/src/dolphin` },
  { name: "Teakra", licence: "MIT", source: `${melonDs}/src/teakra` },
  { name: "FatFs", licence: "FatFs", source: `${melonDs}/src/fatfs` },
  { name: "tiny-AES-c", licence: "Unlicense", source: `${melonDs}/src/tiny-AES-c` },
  { name: "DraStic BIOS replacement", licence: "BSD-2-Clause", source: `${melonDs}/freebios` },
  { name: "libretro-common", licence: "MIT", source: pinned("libretro-common", "libretro/libretro-common") },
  { name: "glm", licence: "MIT", source: pinned("glm", "g-truc/glm") },
  { name: "libslirp", licence: "BSD-3-Clause", source: pinned("libslirp", "JesseTG/libslirp-mirror") },
  { name: "pntr", licence: "Zlib", source: pinned("pntr", "robloach/pntr") },
  { name: "fmt", licence: "MIT", source: pinned("fmt", "fmtlib/fmt") },
  { name: "yamc", licence: "MIT", source: pinned("yamc", "yohhoy/yamc") },
  { name: "span-lite", licence: "BSL-1.0", source: pinned("span-lite", "martinmoene/span-lite") },
  { name: "date", licence: "MIT", source: pinned("date", "HowardHinnant/date") },
  { name: "zlib", licence: "Zlib", source: pinned("zlib", "madler/zlib") },
  {
    name: "Mupen64Plus-Next",
    version: "modified",
    licence: "GPL-2.0-or-later",
    source: "https://github.com/pkhex-web/mupen64plus-libretro-nx/tree/pkh-emu",
  },
  { name: "GLideN64", version: "modified", licence: "GPL-2.0-only", source: `${mupen}/GLideN64` },
  { name: "cxd4 RSP", licence: "CC0-1.0", source: `${mupen}/mupen64plus-rsp-cxd4` },
  { name: "libpng (Mupen64Plus-Next)", licence: "Libpng", source: `${mupen}/custom/dependencies/libpng` },
  { name: "zlib (Mupen64Plus-Next)", licence: "Zlib", source: `${mupen}/custom/dependencies/libzlib` },
  { name: "minizip", licence: "Zlib", source: `${mupen}/mupen64plus-core/subprojects/minizip` },
  { name: "md5", licence: "Zlib", source: `${mupen}/mupen64plus-core/subprojects/md5` },
  { name: "xxHash", licence: "BSD-2-Clause", source: `${mupen}/xxHash` },
  { name: "libretro-common (Mupen64Plus-Next)", licence: "MIT", source: `${mupen}/libretro-common` },
  {
    name: "Azahar",
    version: `${azaharRelease}, modified`,
    licence: "GPL-3.0-or-later",
    source: "https://github.com/pkhex-web/azahar/tree/pkh-emu",
  },
  { name: "Open-source system archives", licence: "GPL-2.0-only", source: `${azahar}/externals/open_source_archives` },
  { name: "Montserrat", licence: "OFL-1.1", source: "https://github.com/B3n30/citra_system_archives/tree/master/shared_font" },
  {
    name: "GNU Unifont",
    version: "10.0.05",
    licence: "GPL-2.0-or-later WITH Font-exception-2.0",
    source: "https://github.com/B3n30/citra_system_archives/tree/master/shared_font",
  },
  { name: "Boost", licence: "BSL-1.0", source: azaharPinned("boost", "azahar-emu/ext-boost") },
  { name: "Crypto++", licence: "BSL-1.0", source: azaharPinned("cryptopp", "cryptopp-modern/cryptopp-modern") },
  { name: "dynarmic", licence: "0BSD", source: azaharPinned("dynarmic", "azahar-emu/dynarmic") },
  { name: "mcl", licence: "MIT", source: azaharPinned("dynarmic/externals/mcl", "azahar-emu/mcl") },
  { name: "robin-map", licence: "MIT", source: azaharPinned("dynarmic/externals/robin-map", "Tessil/robin-map") },
  { name: "oaknut", licence: "MIT", source: azaharPinned("oaknut", "merryhime/oaknut") },
  { name: "ENet", licence: "MIT", source: azaharPinned("enet", "lsalzman/enet") },
  { name: "FAAD2", licence: "GPL-2.0-or-later", source: azaharPinned("faad2/faad2", "knik0/faad2") },
  { name: "fmt (Azahar)", licence: "MIT", source: azaharPinned("fmt", "fmtlib/fmt") },
  { name: "glslang", licence: "BSD-3-Clause", source: azaharPinned("glslang", "KhronosGroup/glslang") },
  { name: "glad", licence: "MIT", source: `${azahar}/externals/glad` },
  { name: "LibreSSL", licence: "OpenSSL AND ISC", source: azaharPinned("libressl", "azahar-emu/ext-libressl-portable") },
  { name: "LodePNG", licence: "Zlib", source: azaharPinned("lodepng/lodepng", "lvandeve/lodepng") },
  { name: "nihstro", licence: "BSD-3-Clause", source: azaharPinned("nihstro", "neobrain/nihstro") },
  { name: "dds-ktx", licence: "BSD-2-Clause", source: azaharPinned("dds-ktx", "septag/dds-ktx") },
  { name: "JSON for Modern C++", licence: "MIT", source: `${azahar}/externals/json` },
  { name: "sirit", licence: "BSD-3-Clause", source: azaharPinned("sirit/sirit", "azahar-emu/sirit") },
  { name: "SoundTouch", licence: "LGPL-2.1-or-later", source: azaharPinned("soundtouch", "azahar-emu/soundtouch") },
  { name: "SPIRV-Tools", licence: "Apache-2.0", source: azaharPinned("spirv-tools", "KhronosGroup/SPIRV-Tools") },
  { name: "SPIRV-Headers", licence: "MIT", source: azaharPinned("spirv-headers", "KhronosGroup/SPIRV-Headers") },
  { name: "Teakra (Azahar)", licence: "MIT", source: azaharPinned("teakra", "wwylele/teakra") },
  { name: "Vulkan Memory Allocator", licence: "MIT", source: azaharPinned("vma", "GPUOpen-LibrariesAndSDKs/VulkanMemoryAllocator") },
  { name: "Vulkan-Headers", licence: "Apache-2.0", source: azaharPinned("vulkan-headers", "KhronosGroup/Vulkan-Headers") },
  { name: "xxHash (Azahar)", licence: "BSD-2-Clause", source: azaharPinned("xxHash", "Cyan4973/xxHash") },
  { name: "Zstandard", licence: "BSD-3-Clause OR GPL-2.0-only", source: azaharPinned("zstd", "facebook/zstd") },
  {
    name: "libretro-common (Azahar)",
    licence: "MIT",
    source: azaharPinned("libretro-common/libretro-common", "libretro/libretro-common"),
  },
  { name: "MoltenVK", version: moltenVkRelease, licence: "Apache-2.0", source: moltenVk },
  { name: "SPIRV-Cross", licence: "Apache-2.0", source: `${moltenVk}/ExternalRevisions` },
  { name: "SPIRV-Tools (MoltenVK)", licence: "Apache-2.0", source: `${moltenVk}/ExternalRevisions` },
  { name: "cereal", licence: "BSD-3-Clause", source: `${moltenVk}/ExternalRevisions` },
];

const metadata = JSON.parse(
  run("cargo", ["metadata", "--format-version", "1", "--locked", "--manifest-path", path("app/src-tauri/Cargo.toml")]),
);
// Build and dev dependencies don't ship in the app.
const nodes = new Map(metadata.resolve.nodes.map((node) => [node.id, node]));
const shipped = new Set();
const ship = (id) => {
  if (shipped.has(id)) return;
  shipped.add(id);
  for (const dep of nodes.get(id).deps) {
    if (dep.dep_kinds.some(({ kind }) => kind === null)) ship(dep.pkg);
  }
};
ship(metadata.resolve.root);
const rust = metadata.packages
  .filter(({ id, source }) => source && shipped.has(id))
  .map(({ name, version, license, repository }) => ({
    name,
    version,
    licence: license,
    source: repository?.startsWith("https://") ? repository : `https://crates.io/crates/${name}/${version}`,
  }))
  .sort(byName);

const lock = JSON.parse(readFileSync(path("app/package-lock.json"), "utf8"));
const npm = Object.entries(lock.packages)
  .filter(([at, entry]) => at && !entry.dev)
  .map(([at, { version, license }]) => {
    const name = at.split("node_modules/").at(-1);
    return { name, version, licence: license, source: `https://www.npmjs.com/package/${name}/v/${version}` };
  })
  .filter((entry, i, all) => all.findIndex((other) => other.name === entry.name && other.version === entry.version) === i)
  .sort(byName);

const require = createRequire(path("app/package.json"));
const engine = JSON.parse(readFileSync(require.resolve("@pkhex-everywhere/engine/notices.json"), "utf8")).map(
  ({ name, version, license, source }) => ({ name, version, licence: license, source }),
);

const missing = [...engine, ...rust, ...npm].filter(({ licence }) => !licence).map(({ name }) => name);
if (missing.length) throw new Error(`No licence declared by: ${missing.join(", ")}`);

writeFileSync(path("app/src/licences/dependencies.json"), `${JSON.stringify({ core, engine, rust, npm }, null, 2)}\n`);

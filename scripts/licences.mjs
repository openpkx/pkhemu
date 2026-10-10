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

// Only the parts of mGBA that core/CMakeLists.txt compiles in, what melonDS DS's CMake bundles,
// and what build.rs compiles into Mupen64Plus-Next.
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
];

const metadata = JSON.parse(
  run("cargo", ["metadata", "--format-version", "1", "--locked", "--manifest-path", path("app/src-tauri/Cargo.toml")]),
);
const rust = metadata.packages
  .filter(({ source }) => source)
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

/// <reference types="node" />
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import engineNotices from "@pkhex-everywhere/engine/notices.json";
import packageLock from "../../package-lock.json";
import { notices } from "./notices";

const cargoLock = readFileSync(path.resolve(import.meta.dirname, "../../../Cargo.lock"), "utf8");

const listed = (group: keyof typeof notices) =>
  new Map(notices[group].map(({ name, version, licence }) => [`${name}@${version}`, licence]));

it("lists the licence of every npm package the app ships", () => {
  const npm = listed("npm");
  const shipped = Object.entries(packageLock.packages)
    .filter(([path, entry]) => path && !("dev" in entry && entry.dev))
    .map(([path, entry]) => `${path.split("node_modules/").at(-1)}@${entry.version}`);

  expect(shipped.length).toBeGreaterThan(0);
  for (const pkg of shipped) expect(npm.get(pkg), pkg).toBeTruthy();
});

it("lists the licence of every Rust crate in the lockfile", () => {
  const rust = listed("rust");
  const crates = [...cargoLock.matchAll(/^name = "(.+)"\nversion = "(.+)"$/gm)]
    .filter(([, name]) => name !== "pkh-emu" && name !== "rom-art")
    .map(([, name, version]) => `${name}@${version}`);

  expect(crates.length).toBeGreaterThan(0);
  for (const crate of crates) expect(rust.get(crate), crate).toBeTruthy();
});

it("lists every component the save editor engine bundles", () => {
  expect(engineNotices.length).toBeGreaterThan(0);
  expect(notices.engine).toEqual(
    engineNotices.map(({ name, version, license, source }) => ({ name, version, licence: license, source })),
  );
});

it("credits melonDS DS under GPL-3.0-or-later as modified, with a link to the patched source", () => {
  const melonDsDs = notices.core.find(({ name }) => name === "melonDS DS");

  expect(melonDsDs?.licence).toBe("GPL-3.0-or-later");
  expect(melonDsDs?.version).toMatch(/^\d+\.\d+\.\d+, modified$/);
  expect(melonDsDs?.source).toBe("https://github.com/pkhex-web/melonds-ds/tree/pkh-emu");
});

it("credits melonDS under GPL-3.0-or-later as modified, with a link to the patched source", () => {
  const melonDs = notices.core.find(({ name }) => name === "melonDS");

  expect(melonDs?.licence).toBe("GPL-3.0-or-later");
  expect(melonDs?.version).toBe("modified");
  expect(melonDs?.source).toBe("https://github.com/pkhex-web/melonDS/tree/pkh-emu");
});

it("credits mGBA under MPL-2.0 as modified, with a link to the patched source", () => {
  const mgba = notices.core.find(({ name }) => name === "mGBA");

  expect(mgba?.licence).toBe("MPL-2.0");
  expect(mgba?.version).toMatch(/^\d+\.\d+\.\d+, modified$/);
  expect(mgba?.source).toBe("https://github.com/pkhex-web/mgba/tree/pkh-emu");
});

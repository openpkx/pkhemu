/// <reference types="node" />
import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, it } from "vitest";
import engineNotices from "@pkhex-everywhere/engine/notices.json";
import packageLock from "../../package-lock.json";
import { notices } from "./notices";

type Metadata = {
  packages: { id: string; name: string; version: string; source: string | null }[];
  resolve: { root: string; nodes: { id: string; deps: { pkg: string; dep_kinds: { kind: string | null }[] }[] }[] };
};

const metadata: Metadata = JSON.parse(
  execFileSync(
    "cargo",
    ["metadata", "--format-version", "1", "--locked", "--offline", "--manifest-path", "src-tauri/Cargo.toml"],
    { cwd: path.resolve(import.meta.dirname, "../.."), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  ),
);

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

it("lists the licence of every Rust crate the app ships, and no build or dev dependencies", () => {
  const rust = listed("rust");
  const nodes = new Map(metadata.resolve.nodes.map((node) => [node.id, node]));
  const shipped = new Set<string>();
  const ship = (id: string) => {
    if (shipped.has(id)) return;
    shipped.add(id);
    for (const dep of nodes.get(id)!.deps) {
      if (dep.dep_kinds.some(({ kind }) => kind === null)) ship(dep.pkg);
    }
  };
  ship(metadata.resolve.root);
  const crates = metadata.packages
    .filter(({ id, source }) => source && shipped.has(id))
    .map(({ name, version }) => `${name}@${version}`);

  expect(crates).toContain(`tauri@${metadata.packages.find(({ name }) => name === "tauri")!.version}`);
  expect(crates).not.toContain(`naga@${metadata.packages.find(({ name }) => name === "naga")!.version}`);
  for (const crate of crates) expect(rust.get(crate), crate).toBeTruthy();
  expect([...rust.keys()].sort()).toEqual([...new Set(crates)].sort());
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

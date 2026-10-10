// @vitest-environment node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createEngine, wasmHost } from "@pkhex-everywhere/engine";
import { expect, it } from "vitest";
import { pokemonKeys, summaryArt } from "./gameArt";

const repo = fileURLToPath(new URL("../../../", import.meta.url));
const save = `${repo}data/saves/unbound-unknown-species.sav`;
const dotnet = new URL("../../node_modules/@pkhex-everywhere/engine/_framework/dotnet.js", import.meta.url).href;

it("finds a Shadow Warrior's sprite in Unbound's art", { timeout: 300_000 }, async ({ skip }) => {
  if (!existsSync(save)) skip("needs data/saves/unbound-unknown-species.sav, an Unbound save with a Shadow Warrior");
  const listed = spawnSync("cargo", ["run", "-q", "-p", "rom-art", "--example", "hack_keys", "--", "BPRE", "Unbound"], {
    cwd: repo,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (listed.error) skip(`needs cargo to decode Unbound's art: ${listed.error.message}`);
  if (listed.status === 2) skip(listed.stderr.trim());
  expect(listed.status, listed.stderr).toBe(0);
  const keys = new Set(listed.stdout.split("\n"));

  const engine = createEngine({ host: wasmHost({ dotnetUrl: dotnet, load: (url) => import(/* @vite-ignore */ url) }) });
  await engine.game.load(readFileSync(save));
  const warrior = [...(await engine.party.get()), ...(await engine.box.get())].find(
    (pokemon) => pokemon.species === "Shadow Warrior",
  );

  expect(warrior).toBeDefined();
  const { speciesIndex, isShiny } = warrior!;
  expect(pokemonKeys(summaryArt(warrior!), 40).find((key) => keys.has(key))).toBe(
    `sprite-index-${speciesIndex}${isShiny ? "-shiny" : ""}`,
  );
});

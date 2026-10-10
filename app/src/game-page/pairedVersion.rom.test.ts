// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createEngine, wasmHost } from "@pkhex-everywhere/engine";
import { expect, it } from "vitest";

const repo = fileURLToPath(new URL("../../../", import.meta.url));
const save = `${repo}data/saves/diamond.sav`;
const dotnet = new URL("../../node_modules/@pkhex-everywhere/engine/_framework/dotnet.js", import.meta.url).href;

it("names a Diamond save's game from its own pair", { timeout: 300_000 }, async ({ skip }) => {
  if (!existsSync(save)) skip("needs data/saves/diamond.sav, a Diamond save");
  const engine = createEngine({ host: wasmHost({ dotnetUrl: dotnet, load: (url) => import(/* @vite-ignore */ url) }) });
  await engine.game.load(readFileSync(save), "diamond.sav");

  const game = await engine.game.version();
  expect(game?.version).toBe("Diamond");
  expect((await engine.encounters.versions()).default).toBe(game?.versionId);
});

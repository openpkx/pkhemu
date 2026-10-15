// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createEngine, wasmHost } from "@pkhex-everywhere/engine";
import { expect, it } from "vitest";
import { summaryOf } from "@/game-page/saveSummary";

const repo = fileURLToPath(new URL("../../../", import.meta.url));
const save = `${repo}data/saves/3ds/x-catnapfart123-main`;
const dotnet = new URL("../../node_modules/@pkhex-everywhere/engine/_framework/dotnet.js", import.meta.url).href;

// The import copies an Azahar main unchanged, so this is the save the editor gets.
it("opens an Azahar save of X in the editor", { timeout: 300_000 }, async ({ skip }) => {
  if (!existsSync(save)) skip("needs data/saves/3ds/x-catnapfart123-main, a Pokémon X save");
  const engine = createEngine({ host: wasmHost({ dotnetUrl: dotnet, load: (url) => import(/* @vite-ignore */ url) }) });
  const host = { saveSummary: async () => null, keepSaveSummary: async () => {} };

  const summary = await summaryOf(engine, host, "sha", async () => readFileSync(save), () => true);

  expect(summary?.version).toBe("X");
  expect(summary?.party.length).toBeGreaterThan(0);
});

// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createEngine, wasmHost } from "@pkhex-everywhere/engine";
import { expect, it } from "vitest";
import { summaryOf, type SaveSummary } from "./saveSummary";

const repo = fileURLToPath(new URL("../../../", import.meta.url));
const save = `${repo}data/saves/radicalred.sav`;
const dotnet = new URL("../../node_modules/@pkhex-everywhere/engine/_framework/dotnet.js", import.meta.url).href;

it("reads a Radical Red save once its format is chosen", { timeout: 300_000 }, async ({ skip }) => {
  if (!existsSync(save)) skip("needs data/saves/radicalred.sav, a Radical Red save");
  const engine = createEngine({ host: wasmHost({ dotnetUrl: dotnet, load: (url) => import(/* @vite-ignore */ url) }) });
  const cache = new Map<string, SaveSummary>();
  const host = {
    saveSummary: async (key: string) => cache.get(key) ?? null,
    keepSaveSummary: async (key: string, summary: SaveSummary) => void cache.set(key, summary),
  };
  const summarise = (formatId?: string) => summaryOf(engine, host, "sha", async () => readFileSync(save), () => true, formatId);

  const choice = await summarise().catch((error) => error);
  expect(choice.code).toBe("format-choice-required");
  const radicalRed = choice.candidates.find(({ name }: { name: string }) => /radical red/i.test(name));
  expect(radicalRed).toBeDefined();

  const summary = await summarise(radicalRed.id);
  expect(summary?.formatId).toBe(radicalRed.id);
  expect(summary?.party.length).toBeGreaterThan(0);
});

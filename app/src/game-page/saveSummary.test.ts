import type { PokemonId, PokemonSummary } from "@pkhex-everywhere/engine";
import { expect, it, vi } from "vitest";
import { fakeEngine } from "@/editor/fakeEngine";
import { formatChoices, summaryOf, summaryRevision, type SaveSummary } from "./saveSummary";

const warrior: PokemonSummary = {
  id: "warrior" as PokemonId,
  at: { source: "party", slot: 0 },
  speciesId: 0xf000 + 706,
  speciesIndex: 706,
  species: "Shadow Warrior",
  isUnknown: false,
  editable: true,
  form: { id: 0, name: "" },
  nickname: "Shadow Warrior",
  level: 50,
  isShiny: false,
  gender: "male",
  isEgg: false,
  types: [],
};

it("keeps each party member's gender, egg flag and types", async () => {
  const egg = { ...warrior, id: "egg" as PokemonId, gender: "female" as const, isEgg: true, types: [9, 3] };
  const { engine } = fakeEngine({ party: [egg] });
  const host = { saveSummary: vi.fn(async () => null), keepSaveSummary: vi.fn(async () => {}) };

  const summary = await summaryOf(engine, host, "sha", async () => new Uint8Array([1]), () => true);

  expect(summary?.party[0]).toMatchObject({ gender: "female", isEgg: true, types: [9, 3] });
});

it.each([
  ["gba/Radical Red v4.1.gba", "radicalred"],
  ["gba/POKEMON-EMERALD_LEGACY.gba", "emeraldlegacy"],
  ["C:\\Games\\Emerald Legacy\\Pokemon Emerald.gba", undefined],
])("finds the format named in %s", (path, named) => {
  const candidates = [
    { id: "emeraldlegacy", name: "Pokémon Emerald Legacy" },
    { id: "radicalred", name: "Pokémon Radical Red" },
  ];

  expect(formatChoices(candidates, path).find((choice) => choice.inRomName)?.id).toBe(named);
});

it("summarises again a save cached without a revision, and caches the fresh summary", async () => {
  const { engine } = fakeEngine({ party: [warrior], detected: "unbound" });
  const cached = {
    version: "SoulSilver",
    formatId: null,
    trainer: { name: "RED", gender: "male", money: 0 },
    party: [],
    progress: { playTime: null, badges: null, pokedex: null },
  } as unknown as SaveSummary;
  const host = { saveSummary: vi.fn(async () => cached), keepSaveSummary: vi.fn(async () => {}) };

  const summary = await summaryOf(engine, host, "sha", async () => new Uint8Array([1]), () => true);

  expect(summary).toMatchObject({ version: "Emerald", formatId: "unbound", revision: summaryRevision });
  expect(host.keepSaveSummary).toHaveBeenCalledWith("sha", summary);
  expect(host.keepSaveSummary).toHaveBeenCalledWith("sha:unbound", summary);
});

it("reuses a summary cached at the current revision without reading the save", async () => {
  const { engine } = fakeEngine({ party: [warrior] });
  const cached: SaveSummary = {
    revision: summaryRevision,
    version: "Ruby",
    formatId: null,
    trainer: { name: "RED", gender: "male", money: 0 },
    party: [],
    progress: { playTime: null, badges: null, pokedex: null },
  };
  const host = { saveSummary: vi.fn(async () => cached), keepSaveSummary: vi.fn(async () => {}) };
  const bytes = vi.fn(async () => new Uint8Array([1]));

  const summary = await summaryOf(engine, host, "sha", bytes, () => true);

  expect(summary).toBe(cached);
  expect(bytes).not.toHaveBeenCalled();
  expect(host.keepSaveSummary).not.toHaveBeenCalled();
});

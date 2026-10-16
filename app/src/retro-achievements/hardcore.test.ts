import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { trainerKey } from "@/game-page/saveSummary";
import { locked } from "./hardcore";

it("locks in-game editing, undo-edit, cheats, loading a state and undoing a load, each named in its question", () => {
  expect(locked).toEqual({
    editSave: "Editing the save ends hardcore until you restart the game",
    undoEdit: "Undoing the edit ends hardcore until you restart the game",
    cheats: "Cheats end hardcore until you restart the game",
    loadState: "Loading a state ends hardcore until you restart the game",
    undoLoad: "Undoing the load ends hardcore until you restart the game",
  });
});

it("never calls the step command, which would advance frames past hardcore's locks", () => {
  const src = join(import.meta.dirname, "..");
  const sources = readdirSync(src, { recursive: true, encoding: "utf8" }).filter(
    (file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file),
  );

  const calling = sources.filter((file) => /invoke(<[^>]*>)?\(\s*["']step["']/.test(readFileSync(join(src, file), "utf8")));

  expect(calling).toEqual([]);
});

it("keys a trainer by ID and OT, which change only when a new game starts", () => {
  expect(trainerKey({ id: "12345/54321", name: "MAY" })).toBe("12345/54321 MAY");
});

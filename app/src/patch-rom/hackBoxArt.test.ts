import { expect, it } from "vitest";
import { buildName } from "./hackBoxArt";

it.each([
  ["FireRed EN 1.0", "FireRed"],
  ["Crystal 1.1", "Crystal"],
  ["Diamond EN", "Diamond"],
  ["Platinum JP rev 1", "Platinum"],
  ["Pokemon Fire Red", "Pokemon Fire Red"],
])("searches for %s by the base game's name", (build, name) => {
  expect(buildName(build)).toBe(name);
});

import { describe, expect, it } from "vitest";
import listingHtml from "./fixtures/listing.html?raw";
import { matchBoxArt, parseListing, rankBoxArt } from "./match";

const gba = [
  "Pocket Monsters - Emerald (Japan)",
  "Pokemon - Emerald Version (USA, Europe) (Alternate)",
  "Pokemon - Emerald Version (USA, Europe)",
  "Pokemon - FireRed Version (USA)",
  "Pokemon - FireRed Version (USA, Europe) (Rev 1)",
  "Pokemon - FireRed Version (USA, Europe)",
  "Pokemon - Theta Emerald EX Version (Hack)",
  "Pokemon - Version Emeraude (France)",
  "Pokemon Pinball - Ruby & Sapphire (USA)",
];

describe("matchBoxArt", () => {
  it.each([
    ["Pokemon Emerald", gba, "Pokemon - Emerald Version (USA, Europe)"],
    ["pokémon emerald (U)", gba, "Pokemon - Emerald Version (USA, Europe)"],
    ["Emerald Rogue", gba, undefined],
    ["Pokemon - FireRed Version (USA, Europe) (Rev 1)", gba, "Pokemon - FireRed Version (USA, Europe) (Rev 1)"],
    ["Pokemon FireRed", gba, "Pokemon - FireRed Version (USA, Europe)"],
    ["Pokemon", gba, undefined],
    ["Pokemon Sapphire", ["Pokemon - Sapphire Version (Germany)", "Pokemon - Sapphire Version (USA, Europe)"], "Pokemon - Sapphire Version (USA, Europe)"],
    ["Pokemon Sapphire", ["Pokemon - Sapphire Version (Germany)", "Pokemon - Sapphire Version (France)"], undefined],
    ["Pokemon Sapphire", ["Pokemon - Sapphire Version (Germany)"], "Pokemon - Sapphire Version (Germany)"],
  ])("%s", (name, listing, expected) => {
    expect(matchBoxArt(name, listing)).toBe(expected);
  });
});

describe("rankBoxArt", () => {
  it("puts an exact name first, then the closest names, and leaves out names sharing no word", () => {
    expect(rankBoxArt("Pokemon - Emerald Version (USA, Europe) (Alternate)", gba)).toEqual([
      "Pokemon - Emerald Version (USA, Europe) (Alternate)",
      "Pokemon - Emerald Version (USA, Europe)",
      "Pocket Monsters - Emerald (Japan)",
      "Pokemon - Theta Emerald EX Version (Hack)",
    ]);
  });

  it("ranks names with more of the searched words higher", () => {
    expect(rankBoxArt("ruby emerald", gba).slice(0, 2)).toEqual([
      "Pokemon - Emerald Version (USA, Europe)",
      "Pokemon - Emerald Version (USA, Europe) (Alternate)",
    ]);
    expect(rankBoxArt("pinball ruby", gba)[0]).toBe("Pokemon Pinball - Ruby & Sapphire (USA)");
  });
});

it("reads the names of the images in a directory listing", () => {
  expect(parseListing(listingHtml)).toEqual([
    "2 Games in 1! - Dragon Ball Z - Buu's Fury + Dragon Ball GT - Transformation (USA)",
    "Pokemon - AshGray Version [Hack by metapod23]",
    "Pokemon - Emerald Version (USA, Europe) (Alternate)",
    "Pokemon - Emerald Version (USA, Europe)",
  ]);
});

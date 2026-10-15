import { expect, it } from "vitest";
import { chosenSkin, offeredSkins, skinLine, skinLocked, skins, wallColour } from "./skins";
import { systems } from "./systems";

it.each(systems)("bundles an image for every %s skin", (system) => {
  for (const skin of skins[system]) expect(skin.image, skin.id).toMatch(/\.webp$/);
});

it.each(systems)("puts pkhemu first on %s", (system) => {
  expect(skins[system][0].id).toBe("pkhemu");
});

it("falls back to pkhemu for a skin that's gone", () => {
  expect(chosenSkin("gb", { skin: "gone", look: "moulded" }, "unlocked").id).toBe("pkhemu");
});

it("walls the opening with the screen border in Moulded, and the plastic otherwise", () => {
  const classicGrey = chosenSkin("gb", { skin: "classic-grey", look: "moulded" }, "unlocked");
  const polarWhite = chosenSkin("nds", { skin: "polar-white", look: "moulded" }, "unlocked");

  expect(wallColour(classicGrey, "moulded")).toBe(classicGrey.moulded.border);
  expect(wallColour(classicGrey, "frosted")).toBe(classicGrey.base);
  expect(wallColour(polarWhite, "moulded")).toBe(polarWhite.base);
});

const red = { skin: "play-it-loud-red", look: "moulded" } as const;

it.each(["unlocked", "owned", "notOwned"] as const)("offers every skin when Plus is %s", (plus) => {
  expect(offeredSkins("gb", plus)).toEqual(skins.gb);
});

it.each(systems)("offers only the two free %s skins in a build without Plus", (system) => {
  const offered = offeredSkins(system, "unavailable");
  expect(offered.map(({ id }) => id)).toEqual(skins[system].filter(({ free }) => free).map(({ id }) => id));
  expect(offered).toHaveLength(2);
});

it.each(["unlocked", "owned", undefined] as const)("shows a Plus skin when Plus is %s", (plus) => {
  expect(chosenSkin("gb", red, plus).id).toBe("play-it-loud-red");
});

it.each(["notOwned", "unavailable"] as const)("shows pkhemu for a Plus skin when Plus is %s", (plus) => {
  expect(chosenSkin("gb", red, plus).id).toBe("pkhemu");
  expect(chosenSkin("gb", { skin: "classic-grey", look: "moulded" }, plus).id).toBe("classic-grey");
});

it("locks only Plus skins, and only without Plus", () => {
  const [pkhemu, , playItLoudRed] = skins.gb;
  expect(skinLocked(playItLoudRed, "notOwned")).toBe(true);
  expect(skinLocked(playItLoudRed, "owned")).toBe(false);
  expect(skinLocked(pkhemu, "notOwned")).toBe(false);
});

it("names the skin and its look", () => {
  expect(skinLine(skins.gb[1], "moulded")).toBe("Classic grey · Moulded");
  expect(skinLine(skins.nds[0], "frosted")).toBe("pkhemu · Frosted");
});

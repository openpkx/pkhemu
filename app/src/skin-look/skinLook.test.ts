import { expect, it } from "vitest";
import { gcColours, skins, skinLooks } from "@/skins";
import { systems } from "@/systems";
import { blendLooks, lookVariables, mixColour } from "./skinLook";

const classicGrey = skins.gb.find(({ id }) => id === "classic-grey")!;
const charcoal = skins.n64.find(({ id }) => id === "charcoal")!;
const polarWhite = skins.nds.find(({ id }) => id === "polar-white")!;

it("blends colours premultiplied, so fading to transparent keeps the colour", () => {
  expect(mixColour("#ff0000", "transparent", 0.5)).toBe("rgba(255,0,0,0.5)");
  expect(mixColour("#ff000000", "#0000ff", 0.5)).toBe("rgba(0,0,255,0.5)");
  expect(mixColour("#000000", "#ffffff", 0.5)).toBe("rgba(128,128,128,1)");
  expect(mixColour("transparent", "transparent", 0.5)).toBe("rgba(0,0,0,0)");
});

it.each(systems.flatMap((system) => skins[system].map((skin) => [system, skin.id, skin] as const)))(
  "gives %s %s the same variables in both looks",
  (_system, _id, skin) => {
    const [moulded, frosted] = skinLooks.map((look) => Object.keys(lookVariables(skin, look)).sort());
    expect(frosted).toEqual(moulded);
  },
);

it("returns either end at t 0 and 1", () => {
  const moulded = lookVariables(classicGrey, "moulded");
  const frosted = lookVariables(classicGrey, "frosted");

  expect(blendLooks(moulded, frosted, 0)).toEqual(moulded);
  expect(blendLooks(moulded, frosted, 1)).toEqual(frosted);
});

it("blends sizes, angles and colours between looks", () => {
  const halfway = blendLooks(lookVariables(classicGrey, "moulded"), lookVariables(classicGrey, "frosted"), 0.5);

  expect(halfway["--skin-blur"]).toBe("6px");
  expect(halfway["--skin-pill-rotate"]).toBe("-12deg");
  expect(halfway["--skin-arm"]).toMatch(/^rgba\(/);
});

it("blends between skins", () => {
  const from = lookVariables(classicGrey, "moulded");
  const to = lookVariables(skins.gb[0], "moulded");

  expect(blendLooks(from, to, 0.5)["--skin-arm"]).toBe(mixColour(classicGrey.moulded.dpad, skins.gb[0].moulded.dpad, 0.5));
});

it("prints Game Boy letters below the buttons in Moulded and on them in Frosted", () => {
  const moulded = lookVariables(classicGrey, "moulded");
  const frosted = lookVariables(classicGrey, "frosted");

  expect(moulded["--skin-print"]).toBe(classicGrey.moulded.print);
  expect(moulded["--skin-face-label"]).toMatch(/,0\)$/);
  expect(frosted["--skin-print"]).toMatch(/,0\)$/);
  expect(frosted["--skin-face-label"]).toBe("#1c1b22");
});

it("borders the screen in Moulded only, where the skin has a border", () => {
  expect(lookVariables(classicGrey, "moulded")["--skin-screen-border-width"]).not.toBe("0px");
  expect(lookVariables(classicGrey, "frosted")["--skin-screen-border-width"]).toBe("0px");
  expect(lookVariables(polarWhite, "moulded")["--skin-screen-border-width"]).toBe("0px");
});

it("colours N64's buttons and levels its red Start in Moulded", () => {
  const moulded = lookVariables(charcoal, "moulded");

  expect(moulded["--skin-a-mid"]).toBe(charcoal.moulded.n64!.a.fill);
  expect(moulded["--skin-c-mid"]).toBe(charcoal.moulded.n64!.c.fill);
  expect(moulded["--skin-pill"]).toBe(charcoal.moulded.n64!.start);
  expect(moulded["--skin-pill-rotate"]).toBe("0deg");
});

it.each(skins.gc.map((skin) => [skin.id, skin] as const))("colours GameCube's buttons on %s in Moulded", (_id, skin) => {
  const moulded = lookVariables(skin, "moulded");

  expect(moulded["--skin-a-mid"]).toBe(gcColours.a.fill);
  expect(moulded["--skin-b-mid"]).toBe(gcColours.b.fill);
  expect(moulded["--skin-xy-mid"]).toBe(gcColours.xy.fill);
  expect(moulded["--skin-z-mid"]).toBe(gcColours.z.fill);
  expect(moulded["--skin-c-mid"]).toBe(gcColours.c.fill);
  expect(moulded["--skin-pill-rotate"]).toBe("0deg");
});

it("shows Hold and Fast-forward as an LED in Moulded and a violet fill in Frosted", () => {
  const moulded = lookVariables(classicGrey, "moulded");
  const frosted = lookVariables(classicGrey, "frosted");

  expect(moulded["--skin-on"]).toMatch(/,0\)$|^transparent$/);
  expect(moulded["--skin-led"]).not.toMatch(/,0\)$|^transparent$/);
  expect(frosted["--skin-led"]).toMatch(/,0\)$|^transparent$/);
  expect(frosted["--skin-on"]).not.toMatch(/,0\)$|^transparent$/);
});

it("darkens Frosted labels on light skins and lightens them on dark ones", () => {
  expect(lookVariables(polarWhite, "frosted")["--skin-face-ink"]).toBe("#1c1b22");
  expect(lookVariables(charcoal, "frosted")["--skin-face-ink"]).toBe("#ffffff");
});

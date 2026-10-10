import { expect, it } from "vitest";
import { fit, fitInShell } from "./fit";

const gba = { width: 240, height: 160 };
const gb = { width: 160, height: 144 };

it("scales by a whole number when that fills the space exactly", () => {
  expect(fit(gba, { width: 1920, height: 1280 })).toEqual({ width: 1920, height: 1280 });
});

it("keeps whole-number scaling when it fills at least 85% of what fractional scaling would", () => {
  expect(fit(gb, { width: 340, height: 300 })).toEqual({ width: 320, height: 288 });
});

it("scales by a fraction when whole numbers would leave too much space", () => {
  expect(fit(gb, { width: 300, height: 300 })).toEqual({ width: 300, height: 270 });
});

it("scales down by a fraction when the space is smaller than the frame", () => {
  expect(fit(gb, { width: 100, height: 100 })).toEqual({ width: 100, height: 90 });
});

it("keeps the aspect ratio in a wide space", () => {
  expect(fit(gba, { width: 3000, height: 500 })).toEqual({ width: 720, height: 480 });
});

const shell = { border: 24 };

it("reserves the border on each side before fitting the game", () => {
  for (const space of [{ width: 340, height: 300 }, { width: 300, height: 300 }, { width: 1170, height: 1470 }]) {
    expect(fitInShell(gb, space, shell)).toEqual({ image: fit(gb, { width: space.width - 48, height: space.height - 48 }), border: 24 });
  }
});

it("shrinks a fractional fit by the border", () => {
  expect(fitInShell(gb, { width: 300, height: 300 }, shell).image).toEqual({ width: 252, height: 227 });
});

it("keeps a whole-number scale when the border fits in the space it leaves", () => {
  expect(fitInShell(gb, { width: 1170, height: 1470 }, shell).image).toEqual({ width: 1120, height: 1008 });
});

it("drops a whole-number scale a step when the border wouldn't fit beside it", () => {
  expect(fit(gb, { width: 1925, height: 2000 })).toEqual({ width: 1920, height: 1728 });
  expect(fitInShell(gb, { width: 1925, height: 2000 }, shell).image).toEqual({ width: 1760, height: 1584 });
});

it("has no border without a shell", () => {
  expect(fitInShell(gb, { width: 1170, height: 1470 })).toEqual({ image: fit(gb, { width: 1170, height: 1470 }), border: 0 });
});

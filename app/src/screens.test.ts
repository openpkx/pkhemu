import { describe, expect, it } from "vitest";
import { fit, origin } from "./fit";
import { dualScreen, pointerAt, singleScreen } from "./screens";

const ds = { width: 256, height: 384 };
const gba = { width: 240, height: 160 };
const topHalf = { x: 0, y: 0, width: 1, height: 0.5 };
const bottomHalf = { x: 0, y: 0.5, width: 1, height: 0.5 };
const shell = { border: 24 };

describe("single screen", () => {
  it("draws the whole frame at the size fit gives it", () => {
    expect(singleScreen(gba, { width: 1920, height: 1280 })).toEqual({
      canvas: { width: 1920, height: 1280 },
      border: 0,
      views: [{ source: { x: 0, y: 0, width: 1, height: 1 }, target: { x: 0, y: 0, width: 1920, height: 1280 }, window: 0 }],
    });
  });

  it("frames the game in the shell's border", () => {
    const layout = singleScreen(gba, { width: 1000, height: 1000 }, shell);

    expect(layout.border).toBe(24);
    expect(layout.canvas).toEqual({ width: 1000, height: 683 });
    expect(layout.views[0].target).toEqual({ x: 24, y: 24, width: 952, height: 635 });
  });

  it("takes no pointer", () => {
    expect(pointerAt(singleScreen(gba, { width: 240, height: 160 }), { x: 10, y: 10 })).toBeUndefined();
  });
});

describe("two screens", () => {
  it("stacks them, top over bottom, when the space is narrower than 4:3", () => {
    const layout = dualScreen(ds, { width: 512, height: 900 }, false);

    expect(layout.canvas).toEqual({ width: 512, height: 768 });
    expect(layout.views).toEqual([
      { source: topHalf, target: { x: 0, y: 0, width: 512, height: 384 }, window: 0 },
      { source: bottomHalf, target: { x: 0, y: 384, width: 512, height: 384 }, window: 1 },
    ]);
  });

  it("puts them side by side, top on the left, when the space is at least 4:3 wide", () => {
    const layout = dualScreen(ds, { width: 1100, height: 400 }, false);

    expect(layout.canvas).toEqual({ width: 1024, height: 384 });
    expect(layout.views).toEqual([
      { source: topHalf, target: { x: 0, y: 0, width: 512, height: 384 }, window: 0 },
      { source: bottomHalf, target: { x: 512, y: 0, width: 512, height: 384 }, window: 1 },
    ]);
  });

  it("exchanges the screens when swapped", () => {
    const stacked = dualScreen(ds, { width: 512, height: 900 }, true);
    const sideBySide = dualScreen(ds, { width: 1100, height: 400 }, true);

    expect(stacked.views.map((view) => [view.source, view.target.y])).toEqual([
      [bottomHalf, 0],
      [topHalf, 384],
    ]);
    expect(sideBySide.views.map((view) => [view.source, view.target.x])).toEqual([
      [bottomHalf, 0],
      [topHalf, 512],
    ]);
  });

  it("stacks them in a near-square space", () => {
    const layout = dualScreen(ds, { width: 360, height: 356 }, false);

    expect(layout.views.map((view) => view.target.x)).toEqual([0, 0]);
  });

  it("stacks them in a space a little taller than wide", () => {
    const layout = dualScreen(ds, { width: 315, height: 375 }, false);

    expect(layout.views.map((view) => view.target.x)).toEqual([0, 0]);
  });

  it("puts them side by side at exactly 4:3", () => {
    const layout = dualScreen(ds, { width: 400, height: 300 }, false);

    expect(layout.views.map((view) => view.target.y)).toEqual([0, 0]);
  });

  it.each([1.2, 1.3, 1.33, 4 / 3, 1.34, 1.4, 1.5])("picks the bigger screens when the space is %f wide", (ratio) => {
    const space = { width: 375 * ratio, height: 375 };
    const half = { width: ds.width, height: ds.height / 2 };
    const stacked = fit(half, { width: space.width, height: space.height / 2 });
    const sideBySide = fit(half, { width: space.width / 2, height: space.height });

    expect(dualScreen(ds, space, false).views[0].target.width).toBe(Math.max(stacked.width, sideBySide.width));
  });

  it("gives each screen its own border in the shell", () => {
    const layout = dualScreen(ds, { width: 540, height: 1000 }, false, shell);

    expect(layout.border).toBe(24);
    expect(layout.canvas).toEqual({ width: 540, height: 834 });
    expect(layout.views.map((view) => view.target)).toEqual([
      { x: 24, y: 24, width: 492, height: 369 },
      { x: 24, y: 441, width: 492, height: 369 },
    ]);
  });

  it("leaves a strip of shell between stacked screens and still fits them in the space", () => {
    const space = { width: 540, height: 1000 };
    const layout = dualScreen(ds, space, false, { border: 24, gap: 16 });

    const [top, bottom] = layout.views.map((view) => view.target);
    expect(bottom.y - 24 - (top.y + top.height + 24)).toBe(16);
    expect(layout.canvas.height).toBe(bottom.y + bottom.height + 24);
    expect(layout.canvas.height).toBeLessThanOrEqual(space.height);
    expect(layout.canvas.width).toBeLessThanOrEqual(space.width);
  });

  it("reserves the strip before picking the scale", () => {
    const layout = dualScreen(ds, { width: 1000, height: 810 }, false, { border: 8, gap: 16 });

    expect(layout.canvas.height).toBeLessThanOrEqual(810);
    expect(layout.views[1].target.y - layout.views[0].target.y).toBe(layout.views[0].target.height + 2 * 8 + 16);
  });

  it("keeps side-by-side screens together", () => {
    const layout = dualScreen(ds, { width: 1100, height: 400 }, false, { border: 8, gap: 16 });

    expect(layout.canvas.width).toBe(2 * (layout.views[0].target.width + 16));
    expect(layout.views[1].target.x).toBe(layout.views[0].target.x + layout.views[0].target.width + 16);
  });

  it("keeps each screen's window when swapped", () => {
    const layout = dualScreen(ds, { width: 512, height: 900 }, true);

    expect(layout.views.map((view) => [view.source, view.window])).toEqual([
      [bottomHalf, 1],
      [topHalf, 0],
    ]);
    expect(layout.touch?.window).toBe(1);
  });

  it("scales each screen by the rules of fit", () => {
    expect(dualScreen(ds, { width: 540, height: 1000 }, false).canvas).toEqual({ width: 512, height: 768 });
    expect(dualScreen(ds, { width: 300, height: 1000 }, false).canvas).toEqual({ width: 300, height: 450 });
  });
});

describe("pointer on the bottom screen", () => {
  const max = 0x7fff;

  it("maps the bottom screen to the bottom half of the core's pointer space when stacked", () => {
    const layout = dualScreen(ds, { width: 512, height: 900 }, false);

    expect(pointerAt(layout, { x: 0, y: 384 })).toEqual({ x: -max, y: 0 });
    expect(pointerAt(layout, { x: 256, y: 576 })).toEqual({ x: 0, y: Math.round(max / 2) });
    expect(pointerAt(layout, { x: 511, y: 767 })).toEqual({ x: Math.round(max * (511 / 256 - 1)), y: Math.round(max * (383 / 384)) });
  });

  it("follows the bottom screen side by side", () => {
    const layout = dualScreen(ds, { width: 1100, height: 400 }, false);

    expect(pointerAt(layout, { x: 768, y: 192 })).toEqual({ x: 0, y: Math.round(max / 2) });
  });

  it("follows the bottom screen when swapped", () => {
    const stacked = dualScreen(ds, { width: 512, height: 900 }, true);
    const sideBySide = dualScreen(ds, { width: 1100, height: 400 }, true);

    expect(pointerAt(stacked, { x: 256, y: 192 })).toEqual({ x: 0, y: Math.round(max / 2) });
    expect(pointerAt(sideBySide, { x: 256, y: 192 })).toEqual({ x: 0, y: Math.round(max / 2) });
  });

  it("maps only the game pixels inside the shell's border", () => {
    const layout = dualScreen(ds, { width: 540, height: 1000 }, false, shell);

    expect(pointerAt(layout, { x: 24, y: 441 })).toEqual({ x: -max, y: 0 });
    expect(pointerAt(layout, { x: 10, y: 500 })).toBeUndefined();
  });

  it("follows the image where the bottom window's tilt moves it", () => {
    const layout = dualScreen(ds, { width: 540, height: 1000 }, false, shell);
    const shifts = [{ x: 7, y: 7 }, { x: -10, y: 5 }];

    expect(pointerAt(layout, { x: 14, y: 446 }, shifts)).toEqual({ x: -max, y: 0 });
    expect(pointerAt(layout, { x: 24, y: 441 }, [origin, { x: 1, y: 0 }])).toBeUndefined();
  });

  it("returns none for points off the bottom screen", () => {
    const layout = dualScreen(ds, { width: 512, height: 900 }, false);

    expect(pointerAt(layout, { x: 256, y: 192 })).toBeUndefined();
    expect(pointerAt(layout, { x: 256, y: 768 })).toBeUndefined();
    expect(pointerAt(layout, { x: -1, y: 500 })).toBeUndefined();
    expect(pointerAt(layout, { x: 512, y: 500 })).toBeUndefined();
  });
});

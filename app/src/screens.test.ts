import { describe, expect, it } from "vitest";
import { fit, origin } from "./fit";
import { dualScreen, dualScreens, inPortrait, pointerAt, singleScreen } from "./screens";

const ds = { width: 256, height: 384 };
const gba = { width: 240, height: 160 };
const topHalf = { x: 0, y: 0, width: 1, height: 0.5 };
const bottomHalf = { x: 0, y: 0.5, width: 1, height: 0.5 };
const nds = { top: topHalf, bottom: bottomHalf };
const threeDs = { width: 400, height: 480 };
const threeDsBottom = { x: 0.1, y: 0.5, width: 0.8, height: 0.5 };
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

  it("gives up the clearance on both sides", () => {
    const layout = singleScreen(gba, { width: 1210, height: 834 }, undefined, 176);

    expect(layout.canvas).toEqual({ width: 858, height: 572 });
  });

  it("keeps its size when the clearance leaves room enough", () => {
    expect(singleScreen(gba, { width: 844, height: 160 }, undefined, 176).canvas).toEqual({ width: 240, height: 160 });
  });

  it("lies under the controls rather than shrink below its own size", () => {
    expect(singleScreen(gba, { width: 312, height: 480 }, undefined, 176).canvas).toEqual({ width: 312, height: 208 });
  });

  it("takes no pointer", () => {
    expect(pointerAt(singleScreen(gba, { width: 240, height: 160 }), { x: 10, y: 10 })).toBeUndefined();
  });
});

describe("two screens", () => {
  it("stacks them, top over bottom, when the space is narrower than 4:3", () => {
    const layout = dualScreen(ds, nds, { width: 512, height: 900 }, false);

    expect(layout.canvas).toEqual({ width: 512, height: 768 });
    expect(layout.views).toEqual([
      { source: topHalf, target: { x: 0, y: 0, width: 512, height: 384 }, window: 0 },
      { source: bottomHalf, target: { x: 0, y: 384, width: 512, height: 384 }, window: 1 },
    ]);
  });

  it("puts them side by side, top on the left, when the space is at least 4:3 wide", () => {
    const layout = dualScreen(ds, nds, { width: 1100, height: 400 }, false);

    expect(layout.canvas).toEqual({ width: 1024, height: 384 });
    expect(layout.views).toEqual([
      { source: topHalf, target: { x: 0, y: 0, width: 512, height: 384 }, window: 0 },
      { source: bottomHalf, target: { x: 512, y: 0, width: 512, height: 384 }, window: 1 },
    ]);
  });

  it("exchanges the screens when swapped", () => {
    const stacked = dualScreen(ds, nds, { width: 512, height: 900 }, true);
    const sideBySide = dualScreen(ds, nds, { width: 1100, height: 400 }, true);

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
    const layout = dualScreen(ds, nds, { width: 360, height: 356 }, false);

    expect(layout.views.map((view) => view.target.x)).toEqual([0, 0]);
  });

  it("stacks them in a space a little taller than wide", () => {
    const layout = dualScreen(ds, nds, { width: 315, height: 375 }, false);

    expect(layout.views.map((view) => view.target.x)).toEqual([0, 0]);
  });

  it("stacks them just under 4:3 even when both ways snap to the same whole scale", () => {
    const layout = dualScreen(ds, nds, { width: 1024, height: 770 }, false);

    expect(layout.views.map((view) => view.target.x)).toEqual([0, 0]);
  });

  it("puts them side by side at exactly 4:3", () => {
    const layout = dualScreen(ds, nds, { width: 400, height: 300 }, false);

    expect(layout.views.map((view) => view.target.y)).toEqual([0, 0]);
  });

  it.each([1.2, 1.3, 1.33, 4 / 3, 1.34, 1.4, 1.5])("picks the bigger screens when the space is %f wide", (ratio) => {
    const space = { width: 375 * ratio, height: 375 };
    const half = { width: ds.width, height: ds.height / 2 };
    const stacked = fit(half, { width: space.width, height: space.height / 2 });
    const sideBySide = fit(half, { width: space.width / 2, height: space.height });

    expect(dualScreen(ds, nds, space, false).views[0].target.width).toBe(Math.max(stacked.width, sideBySide.width));
  });

  it("gives each screen its own border in the shell", () => {
    const layout = dualScreen(ds, nds, { width: 540, height: 1000 }, false, shell);

    expect(layout.border).toBe(24);
    expect(layout.canvas).toEqual({ width: 540, height: 834 });
    expect(layout.views.map((view) => view.target)).toEqual([
      { x: 24, y: 24, width: 492, height: 369 },
      { x: 24, y: 441, width: 492, height: 369 },
    ]);
  });

  it("leaves a strip of shell between stacked screens and still fits them in the space", () => {
    const space = { width: 540, height: 1000 };
    const layout = dualScreen(ds, nds, space, false, { border: 24, gap: 16 });

    const [top, bottom] = layout.views.map((view) => view.target);
    expect(bottom.y - 24 - (top.y + top.height + 24)).toBe(16);
    expect(layout.canvas.height).toBe(bottom.y + bottom.height + 24);
    expect(layout.canvas.height).toBeLessThanOrEqual(space.height);
    expect(layout.canvas.width).toBeLessThanOrEqual(space.width);
  });

  it("reserves the strip before picking the scale", () => {
    const layout = dualScreen(ds, nds, { width: 1000, height: 810 }, false, { border: 8, gap: 16 });

    expect(layout.canvas.height).toBeLessThanOrEqual(810);
    expect(layout.views[1].target.y - layout.views[0].target.y).toBe(layout.views[0].target.height + 2 * 8 + 16);
  });

  it("keeps side-by-side screens together", () => {
    const layout = dualScreen(ds, nds, { width: 1100, height: 400 }, false, { border: 8, gap: 16 });

    expect(layout.canvas.width).toBe(2 * (layout.views[0].target.width + 16));
    expect(layout.views[1].target.x).toBe(layout.views[0].target.x + layout.views[0].target.width + 16);
  });

  it("puts them side by side when one gap of clearance leaves room, though two gaps would stack them", () => {
    const space = { width: 800, height: 384 };
    const layout = dualScreen(ds, nds, space, false, undefined, 176);

    expect(layout.views.map((view) => view.target.y)).toEqual([0, 0]);
    expect(layout.canvas.width).toBeLessThanOrEqual(space.width - 176);
  });

  it("clears both sides beside each other when asked", () => {
    const space = { width: 1210, height: 834 };
    const layout = dualScreen(threeDs, dualScreens["3ds"]!, space, false, undefined, 176, true);

    expect(layout.canvas.width).toBeLessThanOrEqual(space.width - 2 * 176);
  });

  it("clears both sides when stacked", () => {
    const space = { width: 700, height: 900 };
    const layout = dualScreen(ds, nds, space, false, undefined, 176);

    expect(layout.views.map((view) => view.target.x)).toEqual([0, 0]);
    expect(layout.canvas.width).toBeLessThanOrEqual(space.width - 2 * 176);
  });

  it("lies under the controls rather than shrink below its own size", () => {
    const space = { width: 750, height: 972 };

    expect(dualScreen(ds, nds, space, false, undefined, 352, true)).toEqual(dualScreen(ds, nds, space, false));
    expect(dualScreen(threeDs, dualScreens["3ds"]!, space, false, undefined, 352, true)).toEqual(
      dualScreen(threeDs, dualScreens["3ds"]!, space, false),
    );
  });

  it("keeps each screen's window when swapped", () => {
    const layout = dualScreen(ds, nds, { width: 512, height: 900 }, true);

    expect(layout.views.map((view) => [view.source, view.window])).toEqual([
      [bottomHalf, 1],
      [topHalf, 0],
    ]);
    expect(layout.touch?.window).toBe(1);
  });

  it("scales each screen by the rules of fit", () => {
    expect(dualScreen(ds, nds, { width: 540, height: 1000 }, false).canvas).toEqual({ width: 512, height: 768 });
    expect(dualScreen(ds, nds, { width: 300, height: 1000 }, false).canvas).toEqual({ width: 300, height: 450 });
  });
});

describe("3DS screens", () => {
  const screens = dualScreens["3ds"]!;

  it("shows the middle 320 pixels of the bottom half as the bottom screen", () => {
    expect(screens).toEqual({ top: topHalf, bottom: threeDsBottom, largeAndSmall: true });
  });

  it("centres the narrower bottom screen under the top one at the same scale", () => {
    const layout = dualScreen(threeDs, screens, { width: 800, height: 1000 }, false);

    expect(layout.canvas).toEqual({ width: 800, height: 960 });
    expect(layout.views).toEqual([
      { source: topHalf, target: { x: 0, y: 0, width: 800, height: 480 }, window: 0 },
      { source: threeDsBottom, target: { x: 80, y: 480, width: 640, height: 480 }, window: 1 },
    ]);
  });

  it("exchanges the screens when swapped", () => {
    const layout = dualScreen(threeDs, screens, { width: 800, height: 1000 }, true);

    expect(layout.views.map((view) => view.target)).toEqual([
      { x: 80, y: 0, width: 640, height: 480 },
      { x: 0, y: 480, width: 800, height: 480 },
    ]);
  });

  it("gives each screen a window its own width in the shell", () => {
    const space = { width: 390, height: 600 };
    const layout = dualScreen(threeDs, screens, space, false, { border: 8, gap: 16 });

    const [top, bottom] = layout.views.map((view) => view.target);
    expect(bottom.width / top.width).toBeCloseTo(0.8, 2);
    expect(bottom.height).toBe(top.height);
    expect(bottom.x - top.x).toBe(Math.floor((top.width - bottom.width) / 2));
    expect(layout.canvas.width).toBe(top.width + 16);
    expect(layout.canvas.width).toBeLessThanOrEqual(space.width);
    expect(layout.canvas.height).toBeLessThanOrEqual(space.height);
  });

  it("maps a touch on the bottom screen to its part of the core's pointer space", () => {
    const max = 0x7fff;
    const layout = dualScreen(threeDs, screens, { width: 800, height: 1000 }, false);

    expect(pointerAt(layout, { x: 80, y: 480 })).toEqual({ x: Math.round(-0.8 * max), y: 0 });
    expect(pointerAt(layout, { x: 400, y: 720 })).toEqual({ x: 0, y: Math.round(max / 2) });
    expect(pointerAt(layout, { x: 79, y: 720 })).toBeUndefined();
    expect(pointerAt(layout, { x: 720, y: 720 })).toBeUndefined();
  });
});

describe("3DS screens in a landscape space", () => {
  const screens = dualScreens["3ds"]!;
  const space = { width: 1425, height: 950 };

  it("shows the top screen large on the left and the bottom screen at half its scale beside it", () => {
    const layout = dualScreen(threeDs, screens, space, false);

    expect(layout.canvas).toEqual({ width: 1425, height: 611 });
    expect(layout.views).toEqual([
      { source: topHalf, target: { x: 0, y: 0, width: 1018, height: 611 }, window: 0 },
      { source: threeDsBottom, target: { x: 1018, y: 153, width: 407, height: 305 }, window: 1 },
    ]);
  });

  it("makes the bottom screen the large one when swapped", () => {
    const layout = dualScreen(threeDs, screens, space, true);

    expect(layout.views).toEqual([
      { source: threeDsBottom, target: { x: 0, y: 0, width: 877, height: 658 }, window: 1 },
      { source: topHalf, target: { x: 877, y: 164, width: 548, height: 329 }, window: 0 },
    ]);
    expect(layout.touch?.window).toBe(1);
  });

  it("maps a tap on the small bottom screen to its part of the core's pointer space", () => {
    const layout = dualScreen(threeDs, screens, space, false);
    const { x, y, width, height } = layout.touch!.target;

    expect(pointerAt(layout, { x: x + width / 2, y: y + height / 2 })).toEqual({ x: 0, y: 16384 });
  });

  it("keeps two equal DS screens side by side", () => {
    const layout = dualScreen(ds, nds, space, false);

    const [top, bottom] = layout.views.map((view) => view.target);
    expect(bottom).toEqual({ ...top, x: top.width });
  });

  it("stacks the screens in a portrait window, even where the space is wider than tall", () => {
    const layout = dualScreen(threeDs, inPortrait(screens), { width: 984, height: 720 }, false);

    expect(layout.views.map((view) => view.target.y)).toEqual([0, layout.views[0].target.height]);
  });

  it("still stacks the screens in a space taller than wide", () => {
    const layout = dualScreen(threeDs, screens, { width: 950, height: 1425 }, false);

    expect(layout.views.map((view) => view.target.y)).toEqual([0, layout.views[0].target.height]);
  });
});

describe("3DS screens on phones and iPads", () => {
  const screens = dualScreens["3ds"]!;

  it.each([
    { window: "13-inch iPad portrait", space: { width: 1968, height: 1441 }, top: { width: 1200, height: 720 } },
    { window: "11-inch iPad portrait", space: { width: 1572, height: 1128 }, top: { width: 940, height: 564 } },
    { window: "phone portrait", space: { width: 1026, height: 1017 }, top: { width: 800, height: 480 } },
  ])("stacks both screens at one scale in $window", ({ space, top }) => {
    const layout = dualScreen(threeDs, inPortrait(screens), space, false);

    expect(layout.views.map((view) => view.target)).toEqual([
      { x: 0, y: 0, ...top },
      { x: top.width / 10, y: top.height, width: (top.width * 4) / 5, height: top.height },
    ]);
  });

  it.each([
    {
      window: "phone landscape",
      space: { width: 2532, height: 1170 },
      clearance: 528,
      bothSides: false,
      targets: [
        { x: 0, y: 0, width: 1431, height: 859 },
        { x: 1431, y: 215, width: 573, height: 429 },
      ],
    },
  ])("shows large and small in $window", ({ space, clearance, bothSides, targets }) => {
    const layout = dualScreen(threeDs, screens, space, false, undefined, clearance, bothSides);

    expect(layout.views.map((view) => view.target)).toEqual(targets);
  });

  it.each([
    {
      window: "13-inch iPad landscape",
      space: { width: 2752, height: 2064 },
      targets: [
        { x: 0, y: 0, width: 1600, height: 960 },
        { x: 160, y: 960, width: 1280, height: 960 },
      ],
    },
    {
      window: "11-inch iPad landscape",
      space: { width: 2420, height: 1668 },
      targets: [
        { x: 0, y: 0, width: 1390, height: 834 },
        { x: 139, y: 834, width: 1112, height: 834 },
      ],
    },
  ])("stacks the screens in $window, where stacking makes them bigger than large and small", ({ space, targets }) => {
    const layout = dualScreen(threeDs, screens, space, false, undefined, 352, true);

    expect(layout.views.map((view) => view.target)).toEqual(targets);
  });

  it("stacks swapped screens in 11-inch iPad landscape", () => {
    const layout = dualScreen(threeDs, screens, { width: 2420, height: 1668 }, true, undefined, 352, true);

    expect(layout.views.map((view) => view.target)).toEqual([
      { x: 139, y: 0, width: 1112, height: 834 },
      { x: 0, y: 834, width: 1390, height: 834 },
    ]);
  });
});

describe("pointer on the bottom screen", () => {
  const max = 0x7fff;

  it("maps the bottom screen to the bottom half of the core's pointer space when stacked", () => {
    const layout = dualScreen(ds, nds, { width: 512, height: 900 }, false);

    expect(pointerAt(layout, { x: 0, y: 384 })).toEqual({ x: -max, y: 0 });
    expect(pointerAt(layout, { x: 256, y: 576 })).toEqual({ x: 0, y: Math.round(max / 2) });
    expect(pointerAt(layout, { x: 511, y: 767 })).toEqual({ x: Math.round(max * (511 / 256 - 1)), y: Math.round(max * (383 / 384)) });
  });

  it("follows the bottom screen side by side", () => {
    const layout = dualScreen(ds, nds, { width: 1100, height: 400 }, false);

    expect(pointerAt(layout, { x: 768, y: 192 })).toEqual({ x: 0, y: Math.round(max / 2) });
  });

  it("follows the bottom screen when swapped", () => {
    const stacked = dualScreen(ds, nds, { width: 512, height: 900 }, true);
    const sideBySide = dualScreen(ds, nds, { width: 1100, height: 400 }, true);

    expect(pointerAt(stacked, { x: 256, y: 192 })).toEqual({ x: 0, y: Math.round(max / 2) });
    expect(pointerAt(sideBySide, { x: 256, y: 192 })).toEqual({ x: 0, y: Math.round(max / 2) });
  });

  it("maps only the game pixels inside the shell's border", () => {
    const layout = dualScreen(ds, nds, { width: 540, height: 1000 }, false, shell);

    expect(pointerAt(layout, { x: 24, y: 441 })).toEqual({ x: -max, y: 0 });
    expect(pointerAt(layout, { x: 10, y: 500 })).toBeUndefined();
  });

  it("follows the image where the bottom window's tilt moves it", () => {
    const layout = dualScreen(ds, nds, { width: 540, height: 1000 }, false, shell);
    const shifts = [{ x: 7, y: 7 }, { x: -10, y: 5 }];

    expect(pointerAt(layout, { x: 14, y: 446 }, shifts)).toEqual({ x: -max, y: 0 });
    expect(pointerAt(layout, { x: 24, y: 441 }, [origin, { x: 1, y: 0 }])).toBeUndefined();
  });

  it("returns none for points off the bottom screen", () => {
    const layout = dualScreen(ds, nds, { width: 512, height: 900 }, false);

    expect(pointerAt(layout, { x: 256, y: 192 })).toBeUndefined();
    expect(pointerAt(layout, { x: 256, y: 768 })).toBeUndefined();
    expect(pointerAt(layout, { x: -1, y: 500 })).toBeUndefined();
    expect(pointerAt(layout, { x: 512, y: 500 })).toBeUndefined();
  });
});

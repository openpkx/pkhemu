import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { skins } from "@/skins";
import { openingsMask, SkinPlastic } from "./SkinPlastic";

afterEach(cleanup);

const svg = (mask: string) => decodeURIComponent(mask.slice('url("data:image/svg+xml,'.length, -2));

it("cuts each window out of the plastic, a pixel in from its edge", () => {
  const mask = svg(openingsMask({ width: 390, height: 844 }, [{ x: 20, y: 80, width: 100, height: 50 }], 3, 1));

  expect(mask).toContain('viewBox="0 0 390 844"');
  expect(mask).toContain('fill-rule="evenodd"');
  expect(mask).toContain("M0 0H390V844H0Z");
  expect(mask).toContain("M23 81H117A2 2 0 0 1 119 83V127A2 2 0 0 1 117 129H23A2 2 0 0 1 21 127V83A2 2 0 0 1 23 81Z");
});

it("draws the skin's image over its base colour", () => {
  const skin = skins.gb[0];
  const { container } = render(<SkinPlastic skin={skin} radius={3} />);
  const plastic = container.firstElementChild as HTMLElement;

  expect(plastic.style.backgroundImage).toContain(skin.image);
  expect(plastic.style.backgroundColor).not.toBe("");
  expect(plastic.style.maskImage).toBe("");
});

it("masks the plastic once there are windows", () => {
  const { container } = render(<SkinPlastic skin={skins.gb[0]} radius={3} windows={[{ x: 20, y: 80, width: 100, height: 50 }]} />);

  expect((container.firstElementChild as HTMLElement).style.maskImage).toContain("data:image/svg+xml");
});

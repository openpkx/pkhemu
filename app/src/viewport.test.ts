import { expect, it } from "vitest";
import indexHtml from "../index.html?raw";

it("stops pinch and double-tap zoom", () => {
  const viewport = new DOMParser()
    .parseFromString(indexHtml, "text/html")
    .querySelector('meta[name="viewport"]')!
    .getAttribute("content")!
    .split(",")
    .map((part) => part.trim());
  expect(viewport).toContain("user-scalable=no");
  expect(viewport).toContain("maximum-scale=1.0");
});

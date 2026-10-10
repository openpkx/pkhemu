import { expect, it } from "vitest";
import indexHtml from "../index.html?raw";
import iconSvg from "../src-tauri/icons/icon.svg?raw";

const normalizedSvg = (markup: string) =>
  markup.match(/<svg[\s\S]*?<\/svg>/)![0].replace(/\s+/g, " ");

it("draws the app icon as the splash logo", () => {
  const splash = indexHtml.match(/<div id="splash">[\s\S]*?<\/div>/)![0];
  expect(normalizedSvg(splash)).toBe(normalizedSvg(iconSvg));
});

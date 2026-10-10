import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import indexHtml from "../index.html?raw";

const branding = (file: string) => readFileSync(join(import.meta.dirname, "../../branding", file), "utf8");

const shapes = (markup: string) => (markup.match(/<(rect|circle|path) [^>]*\/>/g) ?? []).map((shape) => shape.replace(/\s+/g, " ")).sort();

it("builds the splash logo from the glyph and wordmark masters", () => {
  const splash = indexHtml.slice(indexHtml.indexOf('<div id="splash">'));
  expect(shapes(splash)).toEqual(shapes(branding("glyph.svg") + branding("wordmark.svg")));
});

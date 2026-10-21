import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { expect, it } from "vitest";

const src = join(import.meta.dirname, "..");
const allowed = ["research", "plugin-kit", join("components", "ui")];
// A plug-in reaches the app, Tauri and the engine only through its host.
const hostOnly = /^@(tauri-apps|pkhex-everywhere)\//;
const inside = (file: string, dirs: string[]) => dirs.some((dir) => file === dir || file.startsWith(dir + sep));

const files = readdirSync(join(src, "research"), { recursive: true, encoding: "utf8" })
  .map((file) => join("research", file))
  .filter((file) => /\.tsx?$/.test(file));
const sources = files.filter((file) => !/\.test\.tsx?$/.test(file));

const imports = (file: string) =>
  [...readFileSync(join(src, file), "utf8").matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map(([, specifier]) => specifier);

it("builds Research on its host, the plug-in kit and the ui components, and nothing else in the app", () => {
  const leaks = sources.flatMap((file) =>
    imports(file)
      .filter((specifier) => {
        if (specifier.startsWith("@/")) return !inside(join(specifier.slice(2)), allowed);
        if (specifier.startsWith(".")) return !inside(relative(src, join(src, dirname(file), specifier)), allowed);
        return hostOnly.test(specifier);
      })
      .map((specifier) => `${file} imports ${specifier}`),
  );

  expect(sources).toContain(join("research", "host.ts"));
  expect(leaks).toEqual([]);
});

// Tests may use the app's test helpers, so the engine mustn't reach them through one either.
const helpers = (file: string) =>
  imports(file)
    .filter((specifier) => specifier.startsWith("@/testing/"))
    .flatMap((specifier) => [".ts", ".tsx"].map((extension) => specifier.slice(2) + extension))
    .filter((helper) => existsSync(join(src, helper)));

it("reads saves without the engine, in Research's tests too", () => {
  const checked = [...new Set([...files, ...files.flatMap(helpers)])];
  const leaks = checked.flatMap((file) =>
    imports(file)
      .filter((specifier) => specifier.startsWith("@pkhex-everywhere/"))
      .map((specifier) => `${file} imports ${specifier}`),
  );

  expect(checked).toContain(join("research", "values.test.ts"));
  expect(leaks).toEqual([]);
});

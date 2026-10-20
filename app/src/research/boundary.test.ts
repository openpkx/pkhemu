import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { expect, it } from "vitest";

const src = join(import.meta.dirname, "..");
const allowed = ["research", "plugin-kit", join("components", "ui")];
// A plug-in reaches the app, Tauri and the engine only through its host.
const hostOnly = /^@(tauri-apps|pkhex-everywhere)\//;
const inside = (file: string, dirs: string[]) => dirs.some((dir) => file === dir || file.startsWith(dir + sep));

it("builds Research on its host, the plug-in kit and the ui components, and nothing else in the app", () => {
  const sources = readdirSync(join(src, "research"), { recursive: true, encoding: "utf8" })
    .map((file) => join("research", file))
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file));

  const leaks = sources.flatMap((file) => {
    const code = readFileSync(join(src, file), "utf8");
    const specifiers = [...code.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map(([, specifier]) => specifier);
    return specifiers
      .filter((specifier) => {
        if (specifier.startsWith("@/")) return !inside(join(specifier.slice(2)), allowed);
        if (specifier.startsWith(".")) return !inside(relative(src, join(src, dirname(file), specifier)), allowed);
        return hostOnly.test(specifier);
      })
      .map((specifier) => `${file} imports ${specifier}`);
  });

  expect(sources).toContain(join("research", "host.ts"));
  expect(leaks).toEqual([]);
});

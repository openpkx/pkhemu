import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { expect, it } from "vitest";

const src = join(import.meta.dirname, "..");
const kit = ["plugin-kit", join("components", "ui")];
const inKit = (file: string) => kit.some((dir) => file === dir || file.startsWith(dir + sep));

it("builds the plug-in kit and the components under it on nothing else in the app", () => {
  const sources = readdirSync(src, { recursive: true, encoding: "utf8" }).filter(
    (file) => inKit(file) && /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file),
  );

  const leaks = sources.flatMap((file) => {
    const code = readFileSync(join(src, file), "utf8");
    const specifiers = [...code.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map(([, specifier]) => specifier);
    return specifiers
      .filter((specifier) => {
        if (specifier.startsWith("@/")) return !inKit(join(specifier.slice(2)));
        if (specifier.startsWith(".")) return !inKit(relative(src, join(src, dirname(file), specifier)));
        return false;
      })
      .map((specifier) => `${file} imports ${specifier}`);
  });

  expect(leaks).toEqual([]);
});

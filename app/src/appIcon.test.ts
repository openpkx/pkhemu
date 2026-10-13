import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const icons = join(import.meta.dirname, "../src-tauri/icons/ios");
const catalog = join(import.meta.dirname, "../src-tauri/gen/apple/Assets.xcassets/AppIcon.appiconset");

it.each(readdirSync(icons).filter((name) => /^AppIcon-.*\.png$/.test(name)))(
  "puts the branded %s in the Xcode asset catalog",
  (name) => {
    expect(existsSync(join(catalog, name))).toBe(true);
    expect(readFileSync(join(catalog, name)).equals(readFileSync(join(icons, name)))).toBe(true);
  },
);

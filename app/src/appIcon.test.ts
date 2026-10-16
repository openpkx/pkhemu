import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const icons = join(import.meta.dirname, "../src-tauri/icons/ios");
const catalog = join(import.meta.dirname, "../src-tauri/gen/apple/Assets.xcassets/AppIcon.appiconset");
const sideloadIcons = join(import.meta.dirname, "../src-tauri/icons/ios-sideload");
const pngs = readdirSync(icons).filter((name) => /^AppIcon-.*\.png$/.test(name));

it.each(pngs)(
  "puts the branded %s in the Xcode asset catalog",
  (name) => {
    expect(existsSync(join(catalog, name))).toBe(true);
    expect(readFileSync(join(catalog, name)).equals(readFileSync(join(icons, name)))).toBe(true);
  },
);

it.each(pngs)(
  "has a badged %s for the sideload build",
  (name) => {
    expect(existsSync(join(sideloadIcons, name))).toBe(true);
    expect(readFileSync(join(sideloadIcons, name)).equals(readFileSync(join(icons, name)))).toBe(false);
  },
);

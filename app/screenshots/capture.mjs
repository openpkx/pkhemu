import { mkdir } from "node:fs/promises";
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import pkhexEngine from "@pkhex-everywhere/engine/vite";
import { chromium } from "playwright";
import { createServer } from "vite";

const here = import.meta.dirname;
const ipad = process.argv.includes("--ipad");
const out = path.join(here, "out", ipad ? "ipad" : "");
const screens = [
  "library",
  "library-3ds",
  "library-no-resume",
  "library-cloud",
  "library-unplayed",
  "library-box-art",
  "library-empty",
  "library-empty-android",
  "library-import-menu",
  "library-syncing",
  "import-which-game",
  "import-replace",
  "import-folder-where",
  "import-folder-where-emulator",
  "import-folder-where-emulator-ios",
  "import-folder-where-emulator-ipad",
  "import-folder-where-emulator-mac",
  "import-folder-scanning",
  "import-folder-summary",
  "import-folder-summary-onboarding",
  "import-folder-empty",
  "import-folder-new-folder",
  "import-folder-copying",
  "import-folder-conflicts",
  "settings",
  "settings-skins",
  "settings-sync",
  "settings-sync-details",
  "settings-sideload",
  "coffee-ask",
  "welcome",
  "welcome-folder",
  "welcome-mac",
  "welcome-folder-mac",
  "welcome-ios",
  "welcome-folder-ios",
  "welcome-ipad",
  "welcome-previous",
  "welcome-previous-warning",
  ...["gb", "gbc", "gba", "nds", "n64", "3ds"].flatMap((system) => [`game-page-${system}`, `game-page-${system}-art`]),
  "game-page-gba-menu",
  "game-page-gba-achievements",
  "achievements",
  "achievements-sheet",
  "retro-achievements",
  "settings-retro-achievements",
  "settings-jit",
  "settings-jit-pairing-file",
  "patch-rom",
  "box-art-sheet",
  "editor",
  "editor-stadium",
  "editor-teams",
  "editor-events",
  "editor-events-confirm",
  "editor-mystery-gift",
  "editor-mystery-gift-preview",
  "editor-mystery-gift-review",
  "playing-gb",
  "playing-gbc",
  "playing-gba",
  "playing-nds",
  "playing-n64",
  "playing-3ds",
  "skin-picker-gb",
  "skin-picker-gbc",
  "skin-picker-gba",
  "skin-picker-nds",
  "skin-picker-n64",
  "skin-picker-3ds",
  "overlays",
  "overlays-dialog",
  "transfer",
  "transfer-pak",
];
const themes = ipad ? ["dark"] : ["dark", "light"];
const shownOnPhone = (screen) => screen.startsWith("playing-") || screen.startsWith("skin-picker-");
const ipadViewports = [
  { name: "11-portrait", width: 834, height: 1210 },
  { name: "11-landscape", width: 1210, height: 834 },
  { name: "13-portrait", width: 1032, height: 1376 },
  { name: "13-landscape", width: 1376, height: 1032 },
  { name: "split-half", width: 683, height: 1032 },
  { name: "split-third", width: 375, height: 1032 },
  { name: "stage-manager", width: 600, height: 480 },
  { name: "stage-manager-portrait", width: 375, height: 486 },
];
const narrowScreens = new Set(["settings", "settings-skins", "settings-sync", "settings-sync-details", "settings-sideload"]);
const viewports = (screen) =>
  ipad
    ? ipadViewports
    : shownOnPhone(screen)
    ? [
        { name: "portrait", width: 390, height: 844 },
        { name: "landscape", width: 844, height: 390 },
      ]
    : [...(narrowScreens.has(screen) ? [320] : []), 390, 1280].map((width) => ({ name: width, width, height: 844 }));
// A full-page shot stretches the viewport, which moves a sheet sized to it.
const sheets = new Set(["box-art-sheet", "settings-skins", "settings-sync-details"]);
const lightSkins = {
  "playing-gb": "classic-grey",
  "playing-gba": "glacier",
  "playing-nds": "polar-white",
  "playing-n64": "gold",
  "playing-3ds": "polar-white",
};
const freeSkins = {
  "playing-gb": "classic-grey",
  "playing-gbc": "berry",
  "playing-gba": "indigo",
  "playing-nds": "polar-white",
  "playing-n64": "charcoal",
  "playing-3ds": "polar-white",
};
const skinShots = (screen) =>
  [...new Set([lightSkins[screen], freeSkins[screen]])]
    .filter(Boolean)
    .flatMap((skin) => [
      { name: `-skin-${skin}`, query: `&skin=${skin}` },
      ...(skin === freeSkins[screen] ? [{ name: `-skin-${skin}-frosted`, query: `&skin=${skin}&look=frosted` }] : []),
    ]);
const ipadVariants = (screen, skin = lightSkins[screen] ?? freeSkins[screen]) => [
  { name: "", query: screen.startsWith("skin-picker-") ? "&hinted" : "" },
  ...(screen.startsWith("playing-")
    ? [
        { name: "-paused", query: `&skin=${freeSkins[screen]}`, pause: true },
        { name: "-frosted", query: "&look=frosted" },
        { name: `-skin-${skin}`, query: `&skin=${skin}` },
        { name: "-controller", query: "&touch=off" },
      ]
    : []),
];
const variants = (screen, viewport) => [
  { name: "", query: screen.startsWith("skin-picker-") ? "&hinted" : "" },
  ...(screen.startsWith("skin-picker-") && viewport === "portrait"
    ? [
        { name: "-empty", query: "&hinted&empty" },
        { name: "-frosted", query: "&hinted&look=frosted" },
        { name: "-swiping", query: "&hinted", swipe: true },
      ]
    : []),
  ...(screen.startsWith("playing-") ? [{ name: "-paused", query: `&skin=${freeSkins[screen]}`, pause: true }] : []),
  ...(screen.startsWith("playing-")
    ? [
        { name: "-unlock", query: `&skin=${freeSkins[screen]}&unlocks=1`, unlock: true },
        { name: "-unlock-long", query: "&unlocks=1&unlockFrom=1&badges", unlock: true },
        { name: "-mastery", query: `&skin=${freeSkins[screen]}&completed`, mastery: true },
        { name: "-indicators", query: `&skin=${freeSkins[screen]}&progress&challenge`, indicators: true },
        { name: "-leaderboard", query: `&skin=${freeSkins[screen]}&leaderboard&progress`, leaderboard: true },
      ]
    : []),
  ...(screen === "playing-gba" && viewport === "portrait" ? [{ name: "-unlock-tapped", query: "&unlocks=2&badges", unlock: true, tap: true }] : []),
  ...(screen.startsWith("playing-") && viewport === "portrait"
    ? [{ name: "-frosted", query: "&look=frosted" }, ...skinShots(screen)]
    : []),
  ...(["playing-gb", "playing-nds", "playing-3ds"].includes(screen) && viewport === "portrait"
    ? [
        { name: "-shift+5+5", query: "&shift=5,5" },
        { name: "-shift-5-5", query: "&shift=-5,-5" },
        { name: "-glass", query: "&glass=on" },
        { name: "-glass-shift+5+5", query: "&glass=on&shift=5,5" },
      ]
    : []),
];
const pointers = (screen) => (ipad || shownOnPhone(screen) ? ["touch"] : ["touch", "mouse"]);
const only = process.argv.slice(2).filter((arg) => arg !== "--ipad");

const placeholder = (url) => {
  const name = decodeURIComponent(url.split("/").at(-1)).replace(/\.png$/, "");
  const [width, height] = url.includes("/Named_Titles/") ? [240, 160] : [256, 256];
  const hue = [...name].reduce((sum, char) => sum + char.charCodeAt(0) * 7, 0) % 360;
  const label = name.replace(/^Pokemon - /, "").replace(/ Version/, "").replace(/[<&]/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="hsl(${hue} 55% 38%)"/><text x="12" y="${height - 16}" fill="#fff" font-family="sans-serif" font-size="18">${label}</text></svg>`;
};

const server = await createServer({
  configFile: false,
  root: path.resolve(here, ".."),
  logLevel: "warn",
  plugins: [react(), tailwindcss(), pkhexEngine()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(here, "../src") },
      // The test fakes call vi.fn, and vitest doesn't load in a browser.
      { find: /^vitest$/, replacement: path.join(here, "vitest.ts") },
      { find: /^\.\/motion\/tilt$/, replacement: path.join(here, "tilt.ts") },
      { find: /^\.\/coffee\/sideloadBuild$/, replacement: path.join(here, "sideloadBuild.ts") },
    ],
  },
  server: { port: 0 },
});
await server.listen();
const url = new URL("screenshots/", server.resolvedUrls.local[0]);

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const screen of screens.filter((screen) => !only.length || only.some((name) => screen.startsWith(name)))) {
    for (const theme of themes) {
      for (const { name, width, height } of viewports(screen)) {
        for (const [pointer, variant] of pointers(screen).flatMap((pointer) => (ipad ? ipadVariants(screen) : variants(screen, name)).map((variant) => [pointer, variant]))) {
          const shot = `${screen}-${theme}-${name}${variant.name}-${pointer}`;
          const page = await browser.newPage({
            viewport: { width, height },
            deviceScaleFactor: ipad ? 2 : shownOnPhone(screen) ? 3 : 1,
            colorScheme: theme,
            hasTouch: pointer === "touch",
          });
          page.on("pageerror", (error) => console.error(`${shot}: ${error.message}`));
          await page.route("https://thumbnails.libretro.com/**", (route) =>
            route.fulfill({ contentType: "image/svg+xml", body: placeholder(route.request().url()) }),
          );
          await page.goto(`${url}?screen=${screen}&theme=${theme}${variant.query}`);
          await page.waitForLoadState("networkidle");
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(500);
          if (screen.endsWith("-menu")) {
            await page.getByRole("button", { name: screen.startsWith("library-") ? "Import" : "More" }).first().click();
            await page.getByRole("menu").waitFor();
            await page.waitForTimeout(500);
          }
          if (screen.endsWith("-warning")) {
            await page.getByRole("button", { name: "Choose folder" }).click();
            await page.getByRole("alert").waitFor();
          }
          if (screen.startsWith("editor-events")) {
            await page.getByRole("button", { name: "Add a Pokémon" }).click();
            await page.getByRole("button", { name: /^Events/ }).click();
            const events = page.getByRole("list", { name: "Events" });
            await events.getByRole("button").first().waitFor();
            if (screen.endsWith("-confirm")) {
              await events.getByRole("button", { name: /WISHMKR/ }).click();
              await page.getByRole("alertdialog").waitFor();
            }
            await page.waitForTimeout(800);
          }
          if (screen.startsWith("editor-mystery-gift")) {
            await page.getByRole("button", { name: "Mystery Gift" }).click();
            const events = page.getByRole("list", { name: "Events" });
            await events.waitFor();
            if (screen !== "editor-mystery-gift") {
              await events.getByRole("button", { name: /Manaphy/ }).click();
              await page.getByRole("alertdialog").waitFor();
            }
            if (screen.endsWith("-review")) {
              await page.getByRole("button", { name: "Review" }).click();
              await page.getByRole("article").waitFor();
            }
            await page.waitForTimeout(800);
          }
          if (variant.unlock) {
            await page.getByRole("status", { name: /^Achievement unlocked/ }).waitFor();
            await page.waitForTimeout(1200);
          }
          if (variant.mastery) {
            await page.getByRole("status", { name: /^Mastered/ }).waitFor();
            await page.waitForTimeout(1300);
          }
          if (variant.leaderboard) {
            await page.getByRole("status", { name: /^Leaderboard started/ }).waitFor();
            await page.waitForTimeout(400);
          }
          if (variant.indicators) {
            await page.getByRole("status", { name: /47\/100$/ }).waitFor();
            await page.waitForTimeout(400);
          }
          if (variant.tap) {
            await page.getByRole("status", { name: /^Achievement unlocked/ }).click();
            await page.getByRole("dialog").waitFor();
            await page.waitForTimeout(800);
          }
          if (screen === "achievements-sheet") {
            await page.getByRole("button", { name: /Gotta Catch/ }).click();
            await page.getByRole("dialog").waitFor();
            await page.waitForTimeout(800);
          }
          if (variant.pause) {
            await page.getByRole("button", { name: "Pause menu" }).first().click();
            await page.getByRole("dialog").waitFor();
            await page.getByRole("button", { name: /^Skin/ }).scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);
          }
          if (screen.startsWith("settings-sync")) await page.getByText("Syncing · 42%").waitFor();
          if (screen === "library-syncing") {
            await page.getByRole("button", { name: "Import" }).click();
            await page.getByRole("menuitem", { name: "Import files" }).click();
            await page.getByRole("button", { name: "Syncing · 42%" }).waitFor();
            await page.waitForTimeout(800);
          }
          if (screen === "settings-sync-details") {
            await page.getByRole("button", { name: "Syncing · 42%" }).click();
            await page.getByRole("dialog", { name: "Sync" }).getByText("Adding 2 games").waitFor();
            await page.waitForTimeout(800);
          }
          if (screen === "settings-skins") {
            await page.getByRole("button", { name: "Skins" }).click();
            await page.getByRole("list", { name: "Systems" }).waitFor();
            await page.waitForTimeout(500);
          }
          if (variant.swipe) {
            const box = await page.getByLabel("Preview").boundingBox();
            await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2, { steps: 8 });
            await page.waitForTimeout(100);
          }
          if (pointer === "touch") {
            const small = await page.evaluate(() =>
              [...document.querySelectorAll("[data-slot=button]:not([data-slot=input-group] *, [inert] *), [role^=menuitem]")]
                .map((target) => ({ target, box: target.getBoundingClientRect() }))
                .filter(({ box }) => box.width && box.height && (box.width < 44 || box.height < 44))
                .map(({ target, box }) => `${target.getAttribute("aria-label") ?? target.textContent} ${box.width}×${box.height}`),
            );
            for (const target of small) console.error(`${shot}: tap target under 44px: ${target}`);
          }
          const file = path.join(out, `${shot}.png`);
          await page.screenshot({ path: file, fullPage: !sheets.has(screen), animations: "disabled" });
          console.log(path.relative(process.cwd(), file));
          await page.close();
        }
      }
    }
  }
} finally {
  await browser.close();
  await server.close();
}

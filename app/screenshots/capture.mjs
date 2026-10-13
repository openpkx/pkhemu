import { mkdir } from "node:fs/promises";
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import pkhexEngine from "@pkhex-everywhere/engine/vite";
import { chromium } from "playwright";
import { createServer } from "vite";

const here = import.meta.dirname;
const out = path.join(here, "out");
const screens = [
  "library",
  "library-no-resume",
  "library-cloud",
  "library-unplayed",
  "library-box-art",
  "library-empty",
  "library-empty-android",
  "library-import-menu",
  "import-which-game",
  "import-replace",
  "import-folder-where",
  "import-folder-where-delta-ios",
  "import-folder-scanning",
  "import-folder-summary",
  "import-folder-summary-onboarding",
  "import-folder-empty",
  "import-folder-new-folder",
  "import-folder-copying",
  "import-folder-conflicts",
  "settings",
  "welcome",
  "welcome-folder",
  "welcome-mac",
  "welcome-folder-mac",
  "welcome-ios",
  "welcome-folder-ios",
  "welcome-previous",
  "welcome-previous-warning",
  ...["gb", "gbc", "gba", "nds", "n64"].flatMap((system) => [`game-page-${system}`, `game-page-${system}-art`]),
  "game-page-gba-menu",
  "patch-rom",
  "box-art-sheet",
  "editor",
  "editor-stadium",
  "editor-teams",
  "playing-gb",
  "playing-gba",
  "playing-nds",
  "playing-n64",
  "overlays",
  "overlays-dialog",
  "transfer",
  "transfer-pak",
];
const themes = ["dark", "light"];
const viewports = (screen) =>
  screen.startsWith("playing-")
    ? [
        { name: "portrait", width: 390, height: 844 },
        { name: "landscape", width: 844, height: 390 },
      ]
    : [390, 1280].map((width) => ({ name: width, width, height: 844 }));
// A full-page shot stretches the viewport, which moves a sheet sized to it.
const sheets = new Set(["box-art-sheet"]);
const variants = (screen, viewport) =>
  ["playing-gb", "playing-nds"].includes(screen) && viewport === "portrait"
    ? [
        { name: "", query: "" },
        { name: "-shift+5+5", query: "&shift=5,5" },
        { name: "-shift-5-5", query: "&shift=-5,-5" },
        { name: "-glass", query: "&glass=on" },
        { name: "-glass-shift+5+5", query: "&glass=on&shift=5,5" },
      ]
    : [{ name: "", query: "" }];
const pointers = (screen) => (screen.startsWith("playing-") ? ["touch"] : ["touch", "mouse"]);
const only = process.argv.slice(2);

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
        for (const [pointer, variant] of pointers(screen).flatMap((pointer) => variants(screen, name).map((variant) => [pointer, variant]))) {
          const shot = `${screen}-${theme}-${name}${variant.name}-${pointer}`;
          const page = await browser.newPage({
            viewport: { width, height },
            deviceScaleFactor: screen.startsWith("playing-") ? 3 : 1,
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
          if (pointer === "touch") {
            const small = await page.evaluate(() =>
              [...document.querySelectorAll("[data-slot=button]:not([data-slot=input-group] *), [role^=menuitem]")]
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

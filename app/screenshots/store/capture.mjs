import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import pkhexEngine from "@pkhex-everywhere/engine/vite";
import { chromium } from "playwright";
import { createServer } from "vite";
import { devices, picked } from "./devices.mjs";

const here = import.meta.dirname;
const frames = path.resolve(here, "../../../data/store/frames");
const out = path.resolve(here, "../../../data/store/raw");
const only = process.argv.slice(2);
const screens = picked(
  ["library", "library-more", "editor", "playing-gbc", "playing-gba", "playing-nds", "playing-gb", "playing-pause"].map((name) => ({ name })),
  only,
).map((screen) => screen.name);

const server = await createServer({
  configFile: false,
  root: path.resolve(here, "../.."),
  logLevel: "warn",
  plugins: [react(), tailwindcss(), pkhexEngine()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(here, "../../src") },
      { find: /^vitest$/, replacement: path.join(here, "../vitest.ts") },
      { find: /^\.\/motion\/tilt$/, replacement: path.join(here, "../tilt.ts") },
    ],
  },
  server: { port: 0 },
});
await server.listen();
const url = new URL("screenshots/store/", server.resolvedUrls.local[0]);

const browser = await chromium.launch();
try {
  for (const device of picked(devices, only)) {
    await mkdir(path.join(out, device.name), { recursive: true });
    for (const screen of screens) {
      const page = await browser.newPage({ viewport: device.viewport, deviceScaleFactor: 3, colorScheme: "dark", hasTouch: true });
      page.on("pageerror", (error) => console.error(`${device.name}/${screen}: ${error.message}`));
      await page.route("**/store-frames/*.png", async (route) =>
        route.fulfill({ contentType: "image/png", body: await readFile(path.join(frames, path.basename(new URL(route.request().url()).pathname))) }),
      );
      await page.goto(`${url}?screen=${screen}&platform=${device.platform}`);
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1500);
      if (screen === "library-more") {
        await page.getByText("Game Boy Advance", { exact: true }).first().evaluate((heading) => heading.scrollIntoView({ block: "start" }));
        await page.waitForTimeout(500);
      }
      if (screen === "playing-pause") {
        await page.getByRole("button", { name: "Pause menu" }).first().click();
        await page.waitForTimeout(1000);
      }
      const file = path.join(out, device.name, `${screen}.png`);
      await page.screenshot({ path: file, animations: "disabled" });
      console.log(file);
      await page.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}

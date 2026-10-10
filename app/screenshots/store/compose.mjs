import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const here = import.meta.dirname;
const store = join(here, "../../../data/store");
const fonts = join(here, "../../../site/public/fonts");
const shots = JSON.parse(readFileSync(join(here, "shots.json"), "utf8"));
const only = process.argv.slice(2);

const font = (file) => `data:font/woff2;base64,${readFileSync(join(fonts, file)).toString("base64")}`;
const png = (file) => `data:image/png;base64,${readFileSync(join(store, "raw", file)).toString("base64")}`;

const page = (shot) => `<!doctype html>
<html><head><style>
@font-face { font-family: Geist; src: url(${font("geist.woff2")}); font-weight: 100 900; }
@font-face { font-family: Pixel; src: url(${font("pixelify-sans.woff2")}); font-weight: 400 700; }
* { margin: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1920px; overflow: hidden; }
body {
  background:
    radial-gradient(900px 700px at 50% 108%, rgba(109, 74, 255, 0.55), transparent 70%),
    radial-gradient(700px 500px at 0% 0%, rgba(109, 74, 255, 0.18), transparent 70%),
    #0e0b1c;
  color: #fff; font-family: Geist, sans-serif; position: relative;
}
.copy { position: absolute; top: 112px; left: 80px; right: 80px; text-align: center; }
.kicker { font-family: Pixel; font-size: 40px; color: #a996ff; letter-spacing: 1px; }
h1 { margin-top: 20px; font-size: 76px; line-height: 1.08; font-weight: 650; letter-spacing: -1.5px; text-wrap: balance; }
.phone {
  position: absolute; left: 50%; top: ${shot.top ?? 500}px; width: ${shot.width ?? 780}px;
  transform: translateX(-50%); padding: 14px; border-radius: 74px;
  background: #1b1730; box-shadow: 0 0 0 2px #2e2850, 0 40px 120px rgba(0, 0, 0, 0.6);
}
.phone img { display: block; width: 100%; border-radius: 60px; }
</style></head><body>
<div class="copy"><div class="kicker">${shot.kicker}</div><h1>${shot.title}</h1></div>
<div class="phone"><img src="${png(shot.raw)}"></div>
</body></html>`;

mkdirSync(join(store, "out"), { recursive: true });
const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
for (const shot of shots) {
  if (only.length && !only.includes(shot.name)) continue;
  await tab.setContent(page(shot));
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: join(store, "out", `${shot.name}.png`) });
  console.log(shot.name);
}
await browser.close();

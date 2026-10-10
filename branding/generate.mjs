import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";

const branding = new URL("./", import.meta.url);
const app = new URL("../app/", import.meta.url);
const icons = new URL("src-tauri/icons/", app);
const out = new URL("out/", branding);

const { Resvg } = createRequire(new URL("package.json", app))("@resvg/resvg-js");

const PRIMARY = "#6d4aff";
const GROUND = "#0e0b1c";

const master = (name) => readFileSync(new URL(name, branding), "utf8");
const svgBody = (svg) => svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1].trim();
const viewBox = (svg) => svg.match(/viewBox="([^"]+)"/)[1].split(" ").map(Number);

const glyph = svgBody(master("glyph.svg"));
const wordmark = master("wordmark.svg");

const render = (svg, width) =>
  new Resvg(svg, { fitTo: { mode: "width", value: width }, font: { loadSystemFonts: false } }).render();

copyFileSync(new URL("icon.svg", branding), new URL("icon.svg", icons));
copyFileSync(new URL("icon.svg", branding), new URL("../site/public/icon.svg", branding));

// The adaptive canvas is 108dp and launchers show the middle 72dp, so 0.576 draws the glyph at 80% of
// its size in the icon, as in design/icon.html, well inside the 66dp safe zone.
writeFileSync(
  new URL("android-foreground.svg", icons),
  `<svg width="432" height="432" viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(54 54) scale(0.576) translate(-50 -50)">
    ${glyph.replace(/\n\s*/g, "\n    ")}
  </g>
</svg>
`,
);

execFileSync("npx", ["tauri", "icon", "src-tauri/icons/icon.json"], {
  cwd: app,
  stdio: "inherit",
});

// macOS draws the Dock icon edge to edge, so Big Sur's template puts the shape at 824 in a 1024 canvas.
const macosTmp = mkdtempSync(join(tmpdir(), "pkh-emu-icon-"));
try {
  writeFileSync(
    join(macosTmp, "icon.svg"),
    `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <svg x="100" y="100" width="824" height="824" viewBox="0 0 100 100">
    ${svgBody(master("icon.svg"))}
  </svg>
</svg>`,
  );
  execFileSync("npx", ["tauri", "icon", join(macosTmp, "icon.svg"), "--output", join(macosTmp, "out")], {
    cwd: app,
    stdio: "inherit",
  });
  writeFileSync(new URL("icon.icns", icons), sortIcns(readFileSync(join(macosTmp, "out", "icon.icns"))));
} finally {
  rmSync(macosTmp, { recursive: true, force: true });
}

const storeIcon = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="${PRIMARY}" />
  ${glyph}
</svg>`;

// iOS applies its own mask and App Store validation rejects icons with an alpha channel.
const ios = new URL("ios/", icons);
for (const name of readdirSync(ios)) {
  const size = name.match(/^AppIcon-([\d.]+)(?:x[\d.]+)?@(\d)x(?:-\d+)?\.png$/);
  if (size) writeFileSync(new URL(name, ios), opaquePng(render(storeIcon, Number(size[1]) * Number(size[2]))));
}

mkdirSync(out, { recursive: true });

writeFileSync(new URL("play-icon-512.png", out), render(storeIcon, 512).asPng());

writeFileSync(new URL("appstore-icon-1024.png", out), opaquePng(render(storeIcon, 1024)));

const [, , wordWidth, wordHeight] = viewBox(wordmark);
const iconSize = 160;
const gap = 48;
const wordScale = 1.2;
const left = (1024 - (iconSize + gap + wordWidth * wordScale)) / 2;
const feature = `<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse">
      <circle cx="8" cy="8" r="2.6" fill="#a48bff" fill-opacity="0.5" />
    </pattern>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" />
      <stop offset="0.62" stop-color="#fff" stop-opacity="0" />
    </linearGradient>
    <mask id="fade-mask">
      <rect width="1024" height="500" fill="url(#fade)" />
    </mask>
  </defs>
  <rect width="1024" height="500" fill="${GROUND}" />
  <rect width="1024" height="500" fill="url(#dots)" mask="url(#fade-mask)" />
  <svg x="${left}" y="${250 - iconSize / 2}" width="${iconSize}" height="${iconSize}" viewBox="0 0 100 100">
    ${svgBody(master("icon.svg"))}
  </svg>
  <svg x="${left + iconSize + gap}" y="${250 - (wordHeight * wordScale) / 2}" width="${wordWidth * wordScale}" height="${wordHeight * wordScale}" viewBox="0 0 ${wordWidth} ${wordHeight}">
    ${svgBody(wordmark)}
  </svg>
</svg>`;

writeFileSync(new URL("play-feature-1024x500.png", out), opaquePng(render(feature, 1024)));

// tauri icon writes the .icns entries in a random order, so each run would change the file.
function sortIcns(file) {
  const entries = [];
  for (let at = 8; at < file.length; at += file.readUInt32BE(at + 4)) {
    entries.push(file.subarray(at, at + file.readUInt32BE(at + 4)));
  }
  entries.sort((a, b) => Buffer.compare(a.subarray(0, 4), b.subarray(0, 4)));
  return Buffer.concat([file.subarray(0, 8), ...entries]);
}

function opaquePng({ width, height, pixels: rgba }) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const from = (y * width + x) * 4;
      const to = y * (width * 3 + 1) + 1 + x * 3;
      raw[to] = rgba[from];
      raw[to + 1] = rgba[from + 1];
      raw[to + 2] = rgba[from + 2];
    }
  }
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

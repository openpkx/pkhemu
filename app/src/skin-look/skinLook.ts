import type { ColouredButton, Skin, SkinLook } from "@/skins";

export type LookVariables = Record<`--skin-${string}`, string>;

type Rgba = [number, number, number, number];

function parse(colour: string): Rgba {
  if (colour === "transparent") return [0, 0, 0, 0];
  if (colour.startsWith("rgba(")) return colour.slice(5, -1).split(",").map(Number) as Rgba;
  const at = (i: number) => parseInt(colour.slice(i, i + 2), 16);
  return [at(1), at(3), at(5), colour.length === 9 ? at(7) / 255 : 1];
}

const css = ([r, g, b, a]: Rgba) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${+a.toFixed(3)})`;

export function mixColour(from: string, to: string, t: number) {
  const [a, b] = [parse(from), parse(to)];
  const alpha = a[3] + (b[3] - a[3]) * t;
  if (alpha <= 0) return css([0, 0, 0, 0]);
  const channel = (i: number) => (a[i] * a[3] + (b[i] * b[3] - a[i] * a[3]) * t) / alpha;
  return css([channel(0), channel(1), channel(2), alpha]);
}

const fade = (colour: string) => css([...parse(colour).slice(0, 3), 0] as Rgba);
const shade = (colour: string, by: number) => mixColour(colour, "#000000", by);
const tint = (colour: string, by: number) => mixColour(colour, "#ffffff", by);
const isLight = (colour: string) => {
  const [r, g, b] = parse(colour);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.55;
};

const violet = "#6d4aff";
const led = "#b4a0ff";

const buttonColours = ["face", "a", "b", "xy", "z", "c"] as const;

function domed(name: (typeof buttonColours)[number], { fill, label }: ColouredButton) {
  return {
    [`--skin-${name}-hi`]: tint(fill, 0.28),
    [`--skin-${name}-mid`]: fill,
    [`--skin-${name}-lo`]: shade(fill, 0.22),
    [`--skin-${name}-ink`]: label,
    [`--skin-${name}-edge`]: shade(fill, 0.5),
  };
}

function glass(name: (typeof buttonColours)[number], fill: string, ink: string) {
  return {
    [`--skin-${name}-hi`]: fill,
    [`--skin-${name}-mid`]: fill,
    [`--skin-${name}-lo`]: fill,
    [`--skin-${name}-ink`]: ink,
    [`--skin-${name}-edge`]: fade(fill),
  };
}

export function lookVariables(skin: Skin, look: SkinLook): LookVariables {
  const light = skin.tone === "light";
  const ink = light ? "#1c1b22" : "#ffffff";
  const shared = { "--skin-wordmark": skin.moulded.print, "--skin-reach": light ? "#1c1b224d" : "#ffffff4d" };

  if (look === "frosted") {
    const fill = light ? "#ffffff59" : "#ffffff26";
    const face = light ? "#ffffff66" : "#ffffff33";
    return {
      ...shared,
      "--skin-print": fade(skin.moulded.print),
      "--skin-blur": "12px",
      "--skin-hairline": light ? "#ffffffa6" : "#ffffff4d",
      "--skin-inset": light ? "#ffffffb3" : "#ffffff40",
      "--skin-drop": light ? "#00000014" : "#0000001f",
      "--skin-press": "#ffffff59",
      "--skin-arm-press": "#ffffff59",
      "--skin-screen-border": "transparent",
      "--skin-screen-border-width": "0px",
      "--skin-screen-rim": "transparent",
      "--skin-arm": fill,
      "--skin-arm-ink": ink,
      "--skin-arm-sheen": "transparent",
      "--skin-dpad-edge": "transparent",
      "--skin-dpad-shadow": "transparent",
      "--skin-dimple": "transparent",
      ...Object.assign({}, ...buttonColours.map((name) => glass(name, face, ink))),
      "--skin-face-label": ink,
      "--skin-face-lift": "0px",
      "--skin-face-shadow": light ? "#00000014" : "#0000001f",
      "--skin-well": "transparent",
      "--skin-knob-hi": face,
      "--skin-knob-mid": face,
      "--skin-knob-edge": fade(face),
      "--skin-rubber": fill,
      "--skin-rubber-top": fill,
      "--skin-rubber-bottom": fill,
      "--skin-rubber-edge": fade(fill),
      "--skin-rubber-lift": "0px",
      "--skin-rubber-ink": ink,
      "--skin-rubber-well": "transparent",
      "--skin-pill": fill,
      "--skin-pill-ink": ink,
      "--skin-pill-x": "0px",
      "--skin-pill-y": "0px",
      "--skin-pill-rotate": "0deg",
      "--skin-on": `${violet}d9`,
      "--skin-on-ink": "#ffffff",
      "--skin-led": fade(led),
      "--skin-stick-centre": fill,
      "--skin-stick-edge": fill,
      "--skin-stick-inset": "transparent",
    };
  }

  const parts = skin.moulded;
  const face = { fill: parts.face, label: parts.faceLabel };
  const pad = parts.gc ?? parts.n64;
  const border = parts.border !== null;
  return {
    ...shared,
    "--skin-print": parts.print,
    "--skin-blur": "0px",
    "--skin-hairline": "transparent",
    "--skin-inset": "transparent",
    "--skin-drop": "transparent",
    "--skin-press": "#00000038",
    "--skin-arm-press": isLight(parts.dpad) ? "#00000038" : "#ffffff1f",
    "--skin-screen-border": parts.border ?? "transparent",
    "--skin-screen-border-width": border ? "14px" : "0px",
    "--skin-screen-rim": border ? "#ffffff14" : "transparent",
    "--skin-arm": parts.dpad,
    "--skin-arm-ink": isLight(parts.dpad) ? shade(parts.dpad, 0.22) : tint(parts.dpad, 0.22),
    "--skin-arm-sheen": "#ffffff24",
    "--skin-dpad-edge": shade(parts.dpad, 0.55),
    "--skin-dpad-shadow": "#00000059",
    "--skin-dimple": "#00000040",
    ...domed("face", face),
    ...domed("a", pad?.a ?? face),
    ...domed("b", pad?.b ?? face),
    ...domed("xy", parts.gc?.xy ?? face),
    ...domed("z", pad?.z ?? face),
    ...domed("c", pad?.c ?? { fill: parts.rubber, label: parts.print }),
    "--skin-face-label": fade(parts.faceLabel),
    "--skin-face-lift": "3px",
    "--skin-face-shadow": "#00000048",
    "--skin-well": "#00000020",
    "--skin-knob-hi": tint(parts.dpad, 0.22),
    "--skin-knob-mid": parts.dpad,
    "--skin-knob-edge": shade(parts.dpad, 0.45),
    "--skin-rubber": parts.rubber,
    "--skin-rubber-top": tint(parts.rubber, 0.14),
    "--skin-rubber-bottom": shade(parts.rubber, 0.18),
    "--skin-rubber-edge": shade(parts.rubber, 0.45),
    "--skin-rubber-lift": "2px",
    "--skin-rubber-ink": parts.print,
    "--skin-rubber-well": "#0000001c",
    "--skin-pill": pad?.start ?? parts.rubber,
    "--skin-pill-ink": "transparent",
    "--skin-pill-x": pad ? "14px" : "6px",
    "--skin-pill-y": pad ? "12px" : "15px",
    "--skin-pill-rotate": pad ? "0deg" : "-24deg",
    "--skin-on": "transparent",
    "--skin-on-ink": parts.print,
    "--skin-led": led,
    "--skin-stick-centre": "#00000030",
    "--skin-stick-edge": "#00000012",
    "--skin-stick-inset": "#0000004d",
  };
}

const measure = /^(-?[\d.]+)(px|deg)$/;

export function blendLooks(from: LookVariables, to: LookVariables, t: number): LookVariables {
  if (t <= 0) return from;
  if (t >= 1) return to;
  const blended: LookVariables = {};
  for (const key of Object.keys(from) as (keyof LookVariables)[]) {
    const [a, b] = [measure.exec(from[key]), measure.exec(to[key])];
    blended[key] = a && b ? `${+(+a[1] + (+b[1] - +a[1]) * t).toFixed(3)}${a[2]}` : mixColour(from[key], to[key], t);
  }
  return blended;
}

import type { PlusState } from "@/plus/plus";
import { systems, type System } from "@/systems";

export const skinLooks = ["moulded", "frosted"] as const;

export type SkinLook = (typeof skinLooks)[number];

export const lookNames: Record<SkinLook, string> = { moulded: "Moulded", frosted: "Frosted" };

export type ColouredButton = { fill: string; label: string };

export type MouldedColours = {
  dpad: string;
  face: string;
  faceLabel: string;
  rubber: string;
  print: string;
  border: string | null;
  n64?: { a: ColouredButton; b: ColouredButton; z: ColouredButton; c: ColouredButton; start: string };
};

export type Skin = {
  id: string;
  name: string;
  image: string;
  free: boolean;
  tone: "light" | "dark";
  base: string;
  moulded: MouldedColours;
};

export type SkinChoice = { skin: string; look: SkinLook };

export const defaultSkins = Object.fromEntries(
  systems.map((system) => [system, { skin: "pkhemu", look: "moulded" }]),
) as Record<System, SkinChoice>;

const images = import.meta.glob<string>("./assets/skins/*.webp", { eager: true, query: "?url", import: "default" });

const image = (file: string) => images[`./assets/skins/${file}.webp`];

const violet: MouldedColours = {
  dpad: "#1a1730",
  face: "#6d4aff",
  faceLabel: "#e6deff",
  rubber: "#2a2640",
  print: "#d4caffaa",
  border: "#0b0916",
};

const black: MouldedColours = {
  dpad: "#232326",
  face: "#2a2a2e",
  faceLabel: "#8a8a92",
  rubber: "#3a3a40",
  print: "#ffffffcc",
  border: "#141416",
};

const n64Buttons: MouldedColours["n64"] = {
  a: { fill: "#2a48c8", label: "#b9c6ff" },
  b: { fill: "#1f9442", label: "#b4ecc4" },
  z: { fill: "#4a4a52", label: "#b0b0b8" },
  c: { fill: "#e8b923", label: "#3a2a00" },
  start: "#c42a30",
};

const n64Black: MouldedColours = { ...black, border: "#08080a", n64: n64Buttons };

const ds: Skin[] = [
  {
    id: "pkhemu",
    name: "pkhemu",
    image: image("nds-pkhemu"),
    free: true,
    tone: "dark",
    base: "#201a3e",
    moulded: { ...violet, border: null },
  },
  {
    id: "polar-white",
    name: "Polar White",
    image: image("nds-polar-white"),
    free: true,
    tone: "light",
    base: "#ebeae6",
    moulded: {
      dpad: "#ececef",
      face: "#f4f4f6",
      faceLabel: "#9a9aa4",
      rubber: "#dedee2",
      print: "#5a5a64e6",
      border: null,
    },
  },
  {
    id: "enamel-navy",
    name: "Enamel Navy",
    image: image("nds-enamel-navy"),
    free: false,
    tone: "dark",
    base: "#202d46",
    moulded: {
      dpad: "#1b2036",
      face: "#232a48",
      faceLabel: "#8f9ac4",
      rubber: "#2a3150",
      print: "#ffffffaa",
      border: null,
    },
  },
  {
    id: "crimson",
    name: "Crimson",
    image: image("nds-crimson"),
    free: false,
    tone: "dark",
    base: "#991d27",
    moulded: { ...black, border: null },
  },
];

export const skins: Record<System, Skin[]> = {
  gb: [
    { id: "pkhemu", name: "pkhemu", image: image("gb-pkhemu"), free: true, tone: "dark", base: "#252437", moulded: violet },
    {
      id: "classic-grey",
      name: "Classic grey",
      image: image("gb-classic-grey"),
      free: true,
      tone: "light",
      base: "#b6ada3",
      moulded: {
        dpad: "#2a2a2e",
        face: "#8c1c4c",
        faceLabel: "#d9a3b9",
        rubber: "#77777f",
        print: "#2b2a6ccc",
        border: "#55566a",
      },
    },
    {
      id: "play-it-loud-red",
      name: "Play It Loud red",
      image: image("gb-play-it-loud-red"),
      free: false,
      tone: "dark",
      base: "#b91f25",
      moulded: black,
    },
    {
      id: "play-it-loud-clear",
      name: "Play It Loud clear",
      image: image("gb-play-it-loud-clear"),
      free: false,
      tone: "light",
      base: "#969ea9",
      moulded: { ...black, print: "#1c1c20cc" },
    },
  ],
  gbc: [
    { id: "pkhemu", name: "pkhemu", image: image("gbc-pkhemu"), free: true, tone: "dark", base: "#221e31", moulded: violet },
    { id: "berry", name: "Berry", image: image("gbc-berry"), free: true, tone: "dark", base: "#9b2d4e", moulded: black },
    { id: "teal", name: "Teal", image: image("gbc-teal"), free: false, tone: "dark", base: "#0e7b8c", moulded: black },
    {
      id: "atomic-purple",
      name: "Atomic Purple",
      image: image("gbc-atomic-purple"),
      free: false,
      tone: "dark",
      base: "#685493",
      moulded: {
        dpad: "#3a2d5c",
        face: "#4b3a78",
        faceLabel: "#b8a8e8",
        rubber: "#3a2d5c",
        print: "#ffffffcc",
        border: "#17121f",
      },
    },
  ],
  gba: [
    { id: "pkhemu", name: "pkhemu", image: image("gba-pkhemu"), free: true, tone: "dark", base: "#24213a", moulded: violet },
    {
      id: "indigo",
      name: "Indigo",
      image: image("gba-indigo"),
      free: true,
      tone: "dark",
      base: "#3c367c",
      moulded: {
        dpad: "#2c2c38",
        face: "#9a9aab",
        faceLabel: "#4a4a58",
        rubber: "#3a3a4a",
        print: "#ffffffaa",
        border: "#111116",
      },
    },
    {
      id: "black",
      name: "Black",
      image: image("gba-black"),
      free: false,
      tone: "dark",
      base: "#28282b",
      moulded: { ...black, face: "#4a4a50", faceLabel: "#9a9aa2", print: "#ffffff99", border: "#0a0a0c" },
    },
    {
      id: "glacier",
      name: "Glacier",
      image: image("gba-glacier"),
      free: false,
      tone: "light",
      base: "#84afd0",
      moulded: {
        dpad: "#8a9cb8",
        face: "#a8b8d0",
        faceLabel: "#4c5a72",
        rubber: "#7d8fab",
        print: "#26304ae6",
        border: "#1a2030",
      },
    },
  ],
  nds: ds,
  n64: [
    {
      id: "pkhemu",
      name: "pkhemu",
      image: image("n64-pkhemu"),
      free: true,
      tone: "dark",
      base: "#272237",
      moulded: { ...violet, n64: n64Buttons },
    },
    {
      id: "charcoal",
      name: "Charcoal",
      image: image("n64-charcoal"),
      free: true,
      tone: "dark",
      base: "#464548",
      moulded: n64Black,
    },
    {
      id: "gold",
      name: "Gold",
      image: image("n64-gold"),
      free: false,
      tone: "light",
      base: "#b7954a",
      moulded: { ...n64Black, dpad: "#3a3a3e", rubber: "#4a4a50", print: "#2a2410cc" },
    },
    {
      id: "jungle-green",
      name: "Jungle Green",
      image: image("n64-jungle-green"),
      free: false,
      tone: "dark",
      base: "#457c52",
      moulded: n64Black,
    },
  ],
  // 3DS stays out of Plus, so every 3DS skin is free.
  "3ds": [
    {
      id: "pkhemu",
      name: "pkhemu",
      image: image("3ds-pkhemu"),
      free: true,
      tone: "dark",
      base: "#221e44",
      moulded: { ...violet, border: null },
    },
    {
      id: "cosmo-black",
      name: "Cosmo Black",
      image: image("3ds-cosmo-black"),
      free: true,
      tone: "dark",
      base: "#23262b",
      moulded: { ...black, border: null },
    },
    {
      id: "aqua-blue",
      name: "Aqua Blue",
      image: image("3ds-aqua-blue"),
      free: true,
      tone: "dark",
      base: "#1a7da4",
      moulded: {
        dpad: "#155f7a",
        face: "#1a6f8e",
        faceLabel: "#a8dcef",
        rubber: "#1a6a86",
        print: "#ffffffcc",
        border: null,
      },
    },
    {
      id: "flame-red",
      name: "Flame Red",
      image: image("3ds-flame-red"),
      free: true,
      tone: "dark",
      base: "#9b1820",
      moulded: { ...black, border: null },
    },
  ],
};

export function isSkinChoice(system: System, value: unknown): value is SkinChoice {
  if (typeof value !== "object" || value === null) return false;
  const { skin, look } = value as Record<string, unknown>;
  return skins[system].some(({ id }) => id === skin) && skinLooks.includes(look as SkinLook);
}

export function skinLocked(skin: Skin, plus: PlusState | undefined) {
  return !skin.free && (plus === "notOwned" || plus === "unavailable");
}

export function offeredSkins(system: System, plus: PlusState | undefined) {
  return plus === "unavailable" ? skins[system].filter(({ free }) => free) : skins[system];
}

export function chosenSkin(system: System, choice: SkinChoice, plus: PlusState | undefined): Skin {
  const skin = skins[system].find(({ id }) => id === choice.skin);
  return skin && !skinLocked(skin, plus) ? skin : skins[system][0];
}

export function wallColour(skin: Skin, look: SkinLook) {
  return (look === "moulded" && skin.moulded.border) || skin.base;
}

export function skinLine(skin: Skin, look: SkinLook) {
  return `${skin.name} · ${lookNames[look]}`;
}

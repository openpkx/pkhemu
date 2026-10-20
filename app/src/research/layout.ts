export type Uint = number | `0x${string}`;

export type LayoutRange = {
  offset: Uint;
  length: Uint;
  type: string;
  name: string;
  confidence: "known" | "guess";
  source: string;
  count?: Uint;
  stride?: Uint;
  bits?: { bit: number; width: number; name: string }[];
  note?: string;
};

export type LayoutSpace = {
  name: string;
  length: Uint;
  transform?: "gen3-sections" | "pk3-crypt";
  args?: Record<string, unknown>;
  source?: { regions: { space: string; start: Uint; end: Uint }[]; offset: Uint; stride?: Uint };
  kind?: string;
  ranges?: LayoutRange[];
  note?: string;
};

export type Layout = {
  target: { kind: "save"; format: string; version: string; roms?: { sha1: string; name: string }[] };
  kinds?: Record<string, { length: Uint; ranges: LayoutRange[]; note?: string }>;
  spaces?: LayoutSpace[];
};

export type PickedLayout = { layout: Layout; checked: boolean };

export const uint = (value: Uint) => (typeof value === "number" ? value : parseInt(value, 16));

const files = import.meta.glob<Layout>("./layouts/known/*.json", { import: "default" });

export const knownLayouts = () => Promise.all(Object.values(files).map((load) => load()));

const newer = (a: Layout, b: Layout) => {
  const [x, y] = [a, b].map(({ target }) => target.version.split(".").map(Number));
  for (let index = 0; index < Math.max(x.length, y.length); index++)
    if ((x[index] ?? 0) !== (y[index] ?? 0)) return (x[index] ?? 0) > (y[index] ?? 0);
  return false;
};

export function pickLayout(layouts: Layout[], game: { format: string; romSha1: string }): PickedLayout | undefined {
  const romSha1 = game.romSha1.toLowerCase();
  const checked = layouts.find(({ target }) => target.roms?.some(({ sha1 }) => sha1 === romSha1));
  if (checked) return { layout: checked, checked: true };
  const fallback = layouts.filter(({ target }) => target.format === game.format).reduce<Layout | undefined>(
    (newest, layout) => (newest && !newer(layout, newest) ? newest : layout),
    undefined,
  );
  return fallback && { layout: fallback, checked: false };
}

const RETAIL: Record<number, string> = { 1: "rs", 2: "rs", 3: "emerald", 4: "frlg", 5: "frlg" };

export function layoutFormat(version: { versionId: number; formatId: string | null }) {
  return version.formatId ?? RETAIL[version.versionId];
}

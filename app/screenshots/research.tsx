import { useEffect, useState } from "react";
import { Research } from "@/research/Research";
import type { Finding } from "@/research/findings";
import type { HostEvent, ResearchHost, SaveFile } from "@/research/host";
import type { Compare } from "@/research/useCompare";
import { gen3Save, type Gen3Edit } from "@/testing/gen3Save";

const at = (minutes: number) => new Date(new Date().setHours(14, 2, 0, 0)).getTime() + minutes * 60_000;
const le = (value: number, length: number) => Array.from({ length }, (_, index) => (value >>> (index * 8)) & 0xff);

const shared: Gen3Edit[] = [
  { section: 0, offset: 0x0000, bytes: [0xc7, 0xbb, 0xd3, 0xff] },
  { section: 1, offset: 0x0234, bytes: le(1, 4) },
  { section: 1, offset: 0x0650, bytes: [...le(4, 2), ...le(10, 2)] },
];

const before: SaveFile = {
  bytes: gen3Save([
    ...shared,
    { section: 0, offset: 0x000e, bytes: [...le(24, 2), 41, 7] },
    { section: 1, offset: 0x0490, bytes: le(3000, 4) },
    { section: 2, offset: 0x061c, bytes: le(17, 4) },
    { section: 4, offset: 0x0c40, bytes: [0x03, 0, 0, 0, 0x47] },
  ]),
  writtenAt: at(0),
};

const after: SaveFile = {
  bytes: gen3Save([
    ...shared,
    { section: 0, offset: 0x000e, bytes: [...le(24, 2), 54, 19] },
    { section: 1, offset: 0x0490, bytes: le(2800, 4) },
    { section: 1, offset: 0x0654, bytes: [...le(3, 2), ...le(1, 2)] },
    { section: 2, offset: 0x061c, bytes: le(18, 4) },
    { section: 2, offset: 0x0880, bytes: [0x01, 0x00, 0x02] },
    { section: 4, offset: 0x0c40, bytes: [0x07, 0, 0, 0, 0x52, 0, 0, 0, 0, 0x11] },
  ]),
  writtenAt: at(13),
};

const compares: Record<string, Compare | undefined> = {
  "research-start": undefined,
  "research-waiting": { stage: "after", baseline: before, latest: true },
  "research-diff": { stage: "open", baseline: before, latest: true, after },
  "research-hex": { stage: "open", baseline: before, latest: true, after },
  "research-value": { stage: "open", baseline: before, latest: true, after },
  "research-name": { stage: "open", baseline: before, latest: true, after },
  "research-findings": { stage: "open", baseline: before, latest: true, after },
  "research-export": { stage: "open", baseline: before, latest: true, after },
};

const rom = "1f1c08fb4ffd1d1a8c8a3d4e8ad2c6a9b0a0e6b4";
const app = "pkh-emu 0.12.0";

const own: Finding[] = [
  {
    id: "section:4@3136",
    kind: "range",
    space: "section:4",
    offset: 0x0c40,
    length: 1,
    type: "u8",
    name: "Bike steps",
    confidence: "guess",
    note: "Rode the Acro Bike for a while",
    before: "03",
    after: "07",
    rom,
    app,
  },
  { id: "item:368", kind: "value", domain: "item", index: 368, name: "Devon Scope", confidence: "known", pocket: "Key items", rom, app },
];

const imported: Finding[] = [
  {
    id: "emerald-1.0-findings-2026-10-18.json:section:2@2176",
    kind: "range",
    space: "section:2",
    offset: 0x0880,
    length: 3,
    type: "bytes",
    name: "Contest ribbons seen",
    confidence: "guess",
    before: "00 00 00",
    after: "01 00 02",
    rom,
    app,
    file: "emerald-1.0-findings-2026-10-18.json",
  },
];

const withFindings = new Set(["research-findings", "research-export"]);

const keyItems = (count: number) => ({ pocket: "Key items", items: [{ index: 359, count: 1 }, ...(count ? [{ index: 368, count }] : [])] });

function researchHost(screen: string, listeners: Set<(event: HostEvent) => void>): ResearchHost {
  const stored: Record<string, unknown> = {
    compare: compares[screen],
    ...(withFindings.has(screen) && { "findings:emerald-1.0": own, "imported:emerald-1.0": imported }),
  };
  return {
    context: async () => ({ game: "Emerald", build: "BPEE", format: { id: "emerald", name: "Emerald" }, romSha1: null, romHack: false, app: "0.12.0" }),
    saveFile: async () => before,
    read: async (bytes) => ({
      pouches: [keyItems(bytes === after.bytes ? 1 : 0), { pocket: "Items", items: [{ index: 79, count: bytes === after.bytes ? 93 : 92 }] }],
      held: [],
    }),
    load: async <T,>(key: string) => stored[key] as T | undefined,
    store: async () => {},
    exportFile: async () => undefined,
    importFile: async () => undefined,
    setStatus: async () => {},
    notify: async () => {},
    close: async () => {},
    resume: async () => {},
    listen: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

export const researchScreens = Object.keys(compares);

export function ResearchScreen({ screen }: { screen: string }) {
  const [listeners] = useState(() => new Set<(event: HostEvent) => void>());
  const [host] = useState(() => researchHost(screen, listeners));
  useEffect(() => listeners.forEach((listener) => listener({ kind: "open" })), [listeners]);
  return <Research host={host} />;
}

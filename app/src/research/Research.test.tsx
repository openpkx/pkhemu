import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import Ajv2020 from "ajv/dist/2020";
import { afterEach, expect, it } from "vitest";
import { KitProvider } from "@/plugin-kit/host";
import { emeraldSave } from "@/testing/gen3Save";
import type { HostEvent, ResearchHost, SaveFile } from "./host";
import { read as readEmerald } from "./layouts/parsers/emerald-1.0.ts";
import schema from "./layouts/schema/layout.schema.json";
import { Research } from "./Research";

afterEach(cleanup);
Element.prototype.scrollIntoView ??= () => {};

function fakeHost({
  stored = new Map<string, unknown>(),
  saveFile = save(1, "2026-10-20T10:02:00"),
  romSha1 = null as string | null,
  romHack = false,
} = {}) {
  const listeners = new Set<(event: HostEvent) => void>();
  const calls = { status: [] as string[], notices: [] as string[], closed: 0, resumed: 0, exported: [] as { name: string; text: string }[] };
  const host: ResearchHost = {
    context: async () => ({ game: "Emerald", build: "BPEE", romSha1, romHack, app: "0.12.0" }),
    saveFile: async () => saveFile,
    load: async <T,>(key: string) => structuredClone(stored.get(key)) as T | undefined,
    store: async (key, value) => void (value === undefined ? stored.delete(key) : stored.set(key, structuredClone(value))),
    exportFile: async (file) => void calls.exported.push(file),
    importFile: async () => undefined,
    setStatus: async (status) => void calls.status.push(status),
    notify: async (message) => void calls.notices.push(message),
    close: async () => void calls.closed++,
    resume: async () => void calls.resumed++,
    listen: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
  const emit = (event: HostEvent) => act(async () => listeners.forEach((listener) => listener(event)));
  return { host, calls, stored, emit, status: () => calls.status.at(-1) };
}

function save(fill: number, at = "2026-10-20T10:15:00"): SaveFile {
  return { bytes: new Uint8Array(16).fill(fill), writtenAt: new Date(at).getTime() };
}

async function openResearch(fake: ReturnType<typeof fakeHost>) {
  render(
    <KitProvider host={{ useBack() {} }}>
      <Research host={fake.host} />
    </KitProvider>,
  );
  await fake.emit({ kind: "open" });
}

const choose = async (name: RegExp) => {
  fireEvent.click(await screen.findByRole("button", { name }));
  await act(async () => {});
};

it("takes the latest save as the first save, and the next save the game writes as the second", async () => {
  const fake = fakeHost();
  await openResearch(fake);
  expect(fake.status()).toBe("Compare two saves");
  expect(screen.getByRole("button", { name: /Latest save.*10:02/ })).toBeTruthy();

  await choose(/Latest save/);
  expect(fake.status()).toBe("Waiting for your next save");

  await fake.emit({ kind: "save-written", save: save(2) });
  expect(fake.status()).toBe("Compare ready");
  expect(fake.calls.notices).toEqual(["Compare ready in Research"]);
});

it("waits for the game's next save as the first save when the player saves now", async () => {
  const fake = fakeHost();
  await openResearch(fake);

  await choose(/I'll save now/);
  expect(fake.status()).toBe("Waiting for your first save");

  await fake.emit({ kind: "save-written", save: save(2, "2026-10-20T10:10:00") });
  expect(fake.status()).toBe("Waiting for your next save");
  expect(screen.getByText(/Kept · 10:10/)).toBeTruthy();

  await fake.emit({ kind: "save-written", save: save(3) });
  expect(fake.status()).toBe("Compare ready");
  expect(await screen.findByText(/Save 10:10/)).toBeTruthy();
});

it("finishes a compare started before the game quit", async () => {
  const stored = new Map<string, unknown>();
  const before = fakeHost({ stored });
  await openResearch(before);
  await choose(/Latest save/);
  cleanup();

  const after = fakeHost({ stored });
  render(
    <KitProvider host={{ useBack() {} }}>
      <Research host={after.host} />
    </KitProvider>,
  );
  await act(async () => {});
  expect(after.status()).toBe("Waiting for your next save");

  await after.emit({ kind: "save-written", save: save(2) });
  expect(after.status()).toBe("Compare ready");
  expect(after.calls.notices).toEqual(["Compare ready in Research"]);
});

it("ends a compare when a save state loads", async () => {
  const fake = fakeHost();
  await openResearch(fake);
  await choose(/Latest save/);

  await fake.emit({ kind: "state-loaded" });
  expect(fake.status()).toBe("Compare two saves");
  expect(screen.getByRole("button", { name: /Latest save/ })).toBeTruthy();

  await fake.emit({ kind: "save-written", save: save(2) });
  expect(fake.status()).toBe("Compare two saves");
});

async function ready() {
  const fake = fakeHost();
  await openResearch(fake);
  await choose(/Latest save/);
  await fake.emit({ kind: "save-written", save: save(2) });
  fireEvent.pointerDown(screen.getByRole("button", { name: "Compare actions" }), { button: 0 });
  return fake;
}

it("closes the panel on Close compare, with the compare gone", async () => {
  const fake = await ready();

  fireEvent.click(await screen.findByRole("menuitem", { name: /Close compare/ }));
  await choose(/^Close compare$/);

  expect(fake.calls.closed).toBe(1);
  expect(screen.queryByRole("region", { name: "Research" })).toBeNull();
  expect(fake.status()).toBe("Compare two saves");
});

it("goes back to the start on New compare", async () => {
  const fake = await ready();

  fireEvent.click(await screen.findByRole("menuitem", { name: /New compare/ }));
  await choose(/^New compare$/);

  expect(fake.calls.closed).toBe(0);
  expect(screen.getByRole("button", { name: /I'll save now/ })).toBeTruthy();
  expect(fake.status()).toBe("Compare two saves");
});

it("ends a stored compare when a save state loaded before Research read it", async () => {
  const stored = new Map<string, unknown>();
  const before = fakeHost({ stored });
  await openResearch(before);
  await choose(/Latest save/);
  cleanup();

  const after = fakeHost({ stored });
  render(
    <KitProvider host={{ useBack() {} }}>
      <Research host={after.host} />
    </KitProvider>,
  );
  await after.emit({ kind: "state-loaded" });
  await act(async () => {});

  expect(after.status()).toBe("Compare two saves");
  expect(after.calls.notices).toEqual(["Loading a state ended your compare"]);
  await after.emit({ kind: "save-written", save: save(2) });
  expect(after.status()).toBe("Compare two saves");
});

it("keeps waiting when the game's next save is the latest save over again", async () => {
  const fake = fakeHost();
  await openResearch(fake);
  await choose(/Latest save/);

  await fake.emit({ kind: "save-written", save: save(1) });
  expect(fake.status()).toBe("Waiting for your next save");
});

it("stays at the start when the save file can't be read", async () => {
  const fake = fakeHost();
  fake.host.saveFile = async () => Promise.reject(new Error("no save"));
  await openResearch(fake);

  await choose(/Latest save/);

  expect(fake.status()).toBe("Compare two saves");
  expect(fake.calls.notices).toHaveLength(1);
});

const MONEY = { section: 1, offset: 0x490 };
const bought = (options: Parameters<typeof fakeHost>[0] = {}) => {
  const fake = fakeHost({ ...options, saveFile: { bytes: emeraldSave([{ ...MONEY, bytes: [0xa0, 0x0f, 0, 0] }]), writtenAt: 1 } });
  const after = emeraldSave([
    { ...MONEY, bytes: [0x38, 0x0e, 0, 0] },
    { section: 4, offset: 0x4b, bytes: [7] },
    { section: 4, offset: 0x80, bytes: [1] },
  ]);
  return { fake, after: { bytes: after, writtenAt: 2 } };
};

async function compareBought(options?: Parameters<typeof fakeHost>[0]) {
  const { fake, after } = bought(options);
  await openResearch(fake);
  await choose(/Latest save/);
  await fake.emit({ kind: "save-written", save: after });
  await screen.findByRole("region", { name: "Known changes" });
  return fake;
}

it("lists a purchase's money as a known change, after the bytes no range covers", async () => {
  await compareBought();

  const unmapped = screen.getByRole("region", { name: "Unmapped bytes" });
  const known = screen.getByRole("region", { name: "Known changes" });
  expect(within(unmapped).getByRole("region", { name: "Section 4" }).textContent).toContain("0x004B");
  expect(within(known).getByRole("region", { name: "Section 1" }).textContent).toMatch(/Money.*A0 0F 00 00.*38 0E 00 00/);
  expect(unmapped.compareDocumentPosition(known) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByText(/2 of 444 spaces changed/)).toBeTruthy();
});

it("uses the Emerald layout for an unlisted retail ROM, marked not checked", async () => {
  await compareBought({ romSha1: "c".repeat(40) });

  expect(within(screen.getByRole("region", { name: "Known changes" })).getByRole("region", { name: "Section 1" }).textContent).toContain("Money");
  expect(screen.getByText("Not checked against this ROM")).toBeTruthy();
});

it("shows every change as unmapped for a ROM hack that loads as Emerald", async () => {
  const { fake, after } = bought({ romSha1: "c".repeat(40), romHack: true });
  await openResearch(fake);
  await choose(/Latest save/);
  await fake.emit({ kind: "save-written", save: after });
  const unmapped = await screen.findByRole("region", { name: "Unmapped bytes" });

  expect(within(unmapped).getByRole("region", { name: "Section 1" }).textContent).toContain("0x0490");
  expect(within(unmapped).getByRole("region", { name: "Section 4" }).textContent).toContain("0x004B");
  expect(screen.queryByRole("region", { name: "Known changes" })).toBeNull();
});

it("opens a change in its space's hex view, names the byte under the cursor, and goes back to the list", async () => {
  const fake = await compareBought();

  fireEvent.click(screen.getByRole("button", { name: /Money/ }));
  await act(async () => {});

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Section 1");
  const grid = screen.getByRole("grid", { name: "Section 1, after" });
  expect(within(grid).getByRole("gridcell", { name: "0x0490, Money · u32le, changed from A0 to 38" })).toBeTruthy();
  fireEvent.click(within(grid).getByRole("gridcell", { name: /^0x0494,/ }));
  expect(screen.getByText("Coins")).toBeTruthy();

  await fake.emit({ kind: "back" });
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Research");
  expect(screen.getByRole("region", { name: "Known changes" })).toBeTruthy();
  expect(fake.calls.closed).toBe(0);
});

it("jumps between a space's changes with N and P", async () => {
  await compareBought();
  fireEvent.click(screen.getByRole("button", { name: /0x004B/ }));
  await act(async () => {});
  const grid = screen.getByRole("grid", { name: "Section 4, after" });
  const cursor = () => grid.getAttribute("aria-activedescendant")?.split("-").at(-1);
  expect(cursor()).toBe(String(0x4b));
  expect(screen.getByText("Unmapped")).toBeTruthy();

  fireEvent.keyDown(grid, { key: "ArrowRight", shiftKey: true });
  expect(screen.getByText(/Selected 0x004B–0x004C · 2 bytes/)).toBeTruthy();
  fireEvent.keyDown(grid, { key: "n" });
  expect(cursor()).toBe(String(0x80));
  fireEvent.keyDown(grid, { key: "p" });
  expect(cursor()).toBe(String(0x4b));
});

async function compareBoughtUnnamedItem() {
  const { fake, after } = bought();
  const save = readEmerald(after.bytes);
  Object.assign(save.bag.keyItems[0], { item: 52, count: 1 });
  await openResearch(fake);
  await choose(/Latest save/);
  await fake.emit({ kind: "save-written", save: { ...after, bytes: save.write() } });
  return screen.findByRole("region", { name: "Unnamed items" });
}

it("lists an item the layout has no name for as an unnamed item, between unmapped bytes and known changes", async () => {
  const values = await compareBoughtUnnamedItem();

  expect(values.textContent).toMatch(/Item 52.*Key items/);
  const known = screen.getByRole("region", { name: "Known changes" });
  expect(screen.getByRole("region", { name: "Unmapped bytes" }).compareDocumentPosition(values) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(values.compareDocumentPosition(known) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it("opens the naming sheet when a phone taps an unnamed item", async () => {
  await compareBoughtUnnamedItem();

  fireEvent.click(screen.getByRole("button", { name: /Item 52/ }));
  await act(async () => {});

  const sheet = screen.getByRole("dialog", { name: "Name this item" });
  expect(within(sheet).getByText("52")).toBeTruthy();
  expect(within(sheet).getByRole("combobox", { name: "Pocket" }).textContent).toBe("Key items");
  expect(screen.queryByRole("grid")).toBeNull();
});

it("shows an unnamed item in the detail pane on desktop, with no hex view", async () => {
  const matchMedia = window.matchMedia;
  window.matchMedia = ((media: string) => ({ matches: true, media, addEventListener() {}, removeEventListener() {} })) as never;
  try {
    await compareBoughtUnnamedItem();

    fireEvent.click(screen.getByRole("button", { name: /Item 52/ }));
    await act(async () => {});

    const pane = screen.getByRole("region", { name: "Item 52" });
    expect(within(pane).getByText("Key items")).toBeTruthy();
    expect(screen.queryByRole("grid")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  } finally {
    window.matchMedia = matchMedia;
  }
});

const ROM = "1f1c08fb4ffd1d1a8c8a3d4e8ad2c6a9b0a0e6b4";

const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

async function nameStepCounter() {
  fireEvent.click(screen.getByRole("button", { name: /0x004B/ }));
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: "Name this" }));
  await act(async () => {});
  return screen.getByRole("dialog", { name: "Name these bytes" });
}

async function findingsTab() {
  if (!screen.queryAllByRole("tab").length) {
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await act(async () => {});
  }
  fireEvent.mouseDown(screen.getByRole("tab", { name: /Findings/ }));
  await act(async () => {});
}

it("names unmapped bytes as a finding, and lists it on the Findings tab", async () => {
  await compareBought({ romSha1: ROM });

  const sheet = await nameStepCounter();
  expect((within(sheet).getByLabelText("Offset") as HTMLInputElement).value).toBe("004B");
  expect((within(sheet).getByLabelText("Length") as HTMLInputElement).value).toBe("1");
  type("Name", "Step counter");
  type("Note", "Walked ten steps");
  fireEvent.click(within(sheet).getByRole("button", { name: "Save finding" }));
  await act(async () => {});

  expect(screen.getByRole("gridcell", { name: /^0x004B, Step counter · u8 · your finding/ })).toBeTruthy();
  await findingsTab();
  const yours = screen.getByRole("region", { name: "Yours" });
  expect(yours.textContent).toMatch(/Step counter.*Section 4 · 0x004B · 1 byte · u8.*Walked ten steps/);
});

it("blocks a range that overlaps a known range or another finding, or holds over 256 bytes", async () => {
  await compareBought();
  let sheet = await nameStepCounter();
  type("Name", "Step counter");
  fireEvent.click(within(sheet).getByRole("button", { name: "Save finding" }));
  await act(async () => {});

  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: /0x0080/ }));
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: "Name this" }));
  await act(async () => {});
  sheet = screen.getByRole("dialog", { name: "Name these bytes" });
  type("Name", "Something");
  const save = within(sheet).getByRole("button", { name: "Save finding" }) as HTMLButtonElement;

  type("Offset", "004B");
  expect(within(sheet).getByRole("alert").textContent).toBe('Overlaps your finding "Step counter".');
  expect(save.disabled).toBe(true);
  type("Offset", "0112");
  expect(within(sheet).getByRole("alert").textContent).toBe("Overlaps Painting PID 1 at 0x0110–0x0113, which the layout already names.");
  type("Offset", "0080");
  type("Length", "300");
  expect(within(sheet).getByRole("alert").textContent).toBe("A finding holds at most 256 bytes.");
  type("Length", "2");
  expect(within(sheet).queryByRole("alert")).toBeNull();
  expect(save.disabled).toBe(false);
});

it("names an unnamed item as a value finding, with its pocket", async () => {
  await compareBoughtUnnamedItem();
  fireEvent.click(screen.getByRole("button", { name: /Item 52/ }));
  await act(async () => {});
  const sheet = screen.getByRole("dialog", { name: "Name this item" });

  type("Name", "Mega Ring");
  fireEvent.click(within(sheet).getByRole("button", { name: "Save finding" }));
  await act(async () => {});

  expect(screen.getByRole("button", { name: /Item 52/ }).textContent).toContain("Mega Ring");
  await findingsTab();
  expect(screen.getByRole("region", { name: "Yours" }).textContent).toMatch(/Mega Ring.*Item 52 · Key items/);
});

it("edits and deletes a finding from the Findings tab", async () => {
  await compareBought();
  const sheet = await nameStepCounter();
  type("Name", "Step counter");
  fireEvent.click(within(sheet).getByRole("button", { name: "Save finding" }));
  await act(async () => {});
  await findingsTab();

  fireEvent.click(screen.getByRole("button", { name: /Step counter/ }));
  await act(async () => {});
  const edit = screen.getByRole("dialog", { name: "Edit finding" });
  expect((within(edit).getByLabelText("Offset") as HTMLInputElement).disabled).toBe(true);
  type("Name", "Steps walked");
  fireEvent.click(within(edit).getByRole("button", { name: "Save finding" }));
  await act(async () => {});
  expect(screen.getByRole("region", { name: "Yours" }).textContent).toContain("Steps walked");

  fireEvent.click(screen.getByRole("button", { name: /Steps walked/ }));
  await act(async () => {});
  fireEvent.click(within(screen.getByRole("dialog", { name: "Edit finding" })).getByRole("button", { name: "Delete" }));
  await act(async () => {});
  expect(screen.getByRole("region", { name: "Yours" }).textContent).toContain("Nothing named yet");
});

async function exportStepCounter() {
  const fake = await compareBought({ romSha1: ROM });
  const sheet = await nameStepCounter();
  type("Name", "Step counter");
  fireEvent.click(within(sheet).getByRole("button", { name: "Save finding" }));
  await act(async () => {});
  await findingsTab();
  fireEvent.click(screen.getByRole("button", { name: "Export findings" }));
  await act(async () => {});
  const preview = screen.getByLabelText("File contents").textContent;
  fireEvent.click(within(screen.getByRole("dialog", { name: "Export findings" })).getByRole("button", { name: "Export" }));
  await act(async () => {});
  return { fake, preview, file: fake.calls.exported[0] };
}

it("exports the player's findings as a layout file the schema accepts, as the preview shows it", async () => {
  const { preview, file } = await exportStepCounter();

  expect(file.name).toMatch(/^emerald-1\.0-findings-\d{4}-\d{2}-\d{2}\.json$/);
  expect(file.text).toBe(preview);
  const validate = new Ajv2020().compile(schema);
  expect(validate(JSON.parse(file.text)), JSON.stringify(validate.errors)).toBe(true);
});

it("exports only each finding's own bytes and nothing else from the save", async () => {
  const { file } = await exportStepCounter();

  expect(JSON.parse(file.text)).toEqual({
    $schema: "../schema/layout.schema.json",
    schema: "1.0",
    target: { kind: "save", format: "emerald", version: "1.0" },
    findings: [
      {
        rom: ROM,
        app: "pkh-emu 0.12.0",
        range: { space: "section:4", offset: "0x004B", length: 1, type: "u8", name: "Step counter", confidence: "guess", before: "00", after: "07" },
      },
    ],
  });
  expect(file.text).not.toMatch(/\b(A0 0F|38 0E)\b/);
  expect(file.text.length).toBeLessThan(550);
});

it("shows an imported file's findings in the list and the hex view, marked with the file's name, and leaves them out of an export", async () => {
  const { file } = await exportStepCounter();
  cleanup();

  const other = await compareBought({ romSha1: "b".repeat(40) });
  other.host.importFile = async () => ({ name: "their-findings.json", text: file.text });
  await findingsTab();
  fireEvent.click(screen.getByRole("button", { name: "Import findings" }));
  await act(async () => {});

  expect(screen.getByRole("status").textContent).toBe("Added 1 finding from their-findings.json");
  expect(screen.getByRole("region", { name: "From their-findings.json" }).textContent).toContain("Step counter");
  expect((screen.getByRole("button", { name: "Export findings" }) as HTMLButtonElement).disabled).toBe(true);

  fireEvent.mouseDown(screen.getByRole("tab", { name: /Compare/ }));
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: /0x004B/ }));
  await act(async () => {});
  expect(screen.getByRole("gridcell", { name: /^0x004B, Step counter · u8 · from their-findings\.json/ })).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  await act(async () => {});
  await findingsTab();
  fireEvent.click(screen.getByRole("button", { name: "Remove" }));
  await act(async () => {});
  expect(screen.queryByRole("region", { name: "From their-findings.json" })).toBeNull();
});

it("turns away findings for another layout", async () => {
  const fake = await compareBought();
  fake.host.importFile = async () => ({
    name: "unbound.json",
    text: JSON.stringify({ target: { kind: "save", format: "unbound", version: "2.1" }, findings: [] }),
  });
  await findingsTab();
  fireEvent.click(screen.getByRole("button", { name: "Import findings" }));
  await act(async () => {});

  expect(screen.getByRole("alert").textContent).toBe("These findings are for unbound 2.1.");
});

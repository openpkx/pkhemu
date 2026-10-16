import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EngineProvider } from "@pkhex-everywhere/react";
import type { EventFlag, EventWork, Pouch, SaveEvents } from "@pkhex-everywhere/engine";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BackProvider } from "@/back/back";
import { PreferencesProvider, type Preferences, type PreferencesHost } from "@/preferences/preferences";
import { EditorScreen } from "./EditorScreen";
import { fakeEngine } from "./fakeEngine";
import { saveHome } from "./saveHome";
import { defaultSkins } from "@/skins";

// jsdom lays nothing out, so the virtualized list would think it has no room for rows.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(800);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const flags: EventFlag[] = [
  { index: 2, name: "Got the Running Shoes", category: "Story", value: false },
  { index: 7, name: "Beat Roxanne", category: "Story", value: true },
  { index: 12, name: "Hidden Potion on Route 104", category: "Hidden Item", value: false },
  { index: 30, name: "Talked to Mom", category: "Misc", value: false },
  { index: 41, name: "Beat Kyogre", category: "Rebattle", value: true },
];

const saveEvents: SaveEvents = { flags, work: [], flagCount: 64, workCount: 0, workMin: 0, workMax: 0, gen3: null };

const work: EventWork[] = [
  {
    index: 3,
    name: "Lab state",
    category: "Story",
    value: 1,
    options: [
      { name: "Not started", value: 0 },
      { name: "Got a starter", value: 1 },
      { name: "Done", value: 2 },
    ],
  },
  { index: 9, name: "Steps to hatch", category: "Misc", value: 120, options: [] },
  {
    index: 15,
    name: "Weather",
    category: "Misc",
    value: 7,
    options: [
      { name: "Sunny", value: 0 },
      { name: "Rain", value: 1 },
    ],
  },
];

const withWork: SaveEvents = { ...saveEvents, work, workCount: 32, workMin: 0, workMax: 65535 };

const defaults: Preferences = {
  touchControls: false,
  fastForwardSpeed: 2,
  showFps: false,
  theme: "system",
  eventsNoticeDismissed: false,
  updateDismissedVersion: 0,
  gameClockOffset: { days: 0, hours: 0 },
  restoreBackupsKept: 10,
  stickSensitivity: 1,
  playInSilentMode: false,
  renderer: "automatic",
  skins: defaultSkins,
  skinHintSeen: false,
  screenDepth: true,
  screenGlass: true,
  asyncShaders: false,
};

function memoryPreferences() {
  let saved: Partial<Preferences> = {};
  const host: PreferencesHost = {
    load: async () => saved,
    save: async (preferences) => {
      saved = preferences;
    },
  };
  return { host, saved: () => saved };
}

function launch(events?: SaveEvents, inventory?: Pouch[], preferences = memoryPreferences().host) {
  const { engine } = fakeEngine({ events, inventory });
  const host = { read: async () => new Uint8Array([1]), apply: async () => {}, playTimeSinceSave: async () => 0 };
  render(
    <BackProvider>
      <PreferencesProvider host={preferences} defaults={defaults}>
        <EngineProvider engine={engine}>
          <EditorScreen host={host} home={saveHome} onBackGesture={() => () => {}} onClose={() => {}} onSaveFirst={() => {}} />
        </EngineProvider>
      </PreferencesProvider>
    </BackProvider>,
  );
  return engine;
}

async function openEvents(events = saveEvents, inventory?: Pouch[], preferences?: PreferencesHost) {
  const engine = launch(events, inventory, preferences);
  fireEvent.click(await screen.findByRole("button", { name: "Events" }));
  await screen.findByRole("heading", { name: "Events" });
  await screen.findByRole("list", { name: "Flags" });
  return engine;
}

const list = () => screen.findByRole("list", { name: "Flags" });
const shownFlags = async () =>
  within(await list())
    .queryAllByRole("switch")
    .map((flag) => document.querySelector(`label[for="${flag.id}"]`)?.textContent);
const search = (text: string) =>
  fireEvent.change(screen.getByRole("searchbox", { name: "Search flags" }), { target: { value: text } });

it("hides the Events tile when the save has no events", async () => {
  launch();

  await screen.findByRole("button", { name: "Trainer" });
  expect(screen.queryByRole("button", { name: "Events" })).toBeNull();
});

it("lists the named flags with their state", async () => {
  await openEvents();

  expect(await shownFlags()).toEqual(flags.map((flag) => flag.name));
  expect(screen.getByRole("switch", { name: "Beat Roxanne" }).getAttribute("aria-checked")).toBe("true");
  expect(screen.getByRole("switch", { name: "Talked to Mom" }).getAttribute("aria-checked")).toBe("false");
});

it("searches by name", async () => {
  await openEvents();

  search("roxanne");

  await waitFor(async () => expect(await shownFlags()).toEqual(["Beat Roxanne"]));
});

it("searches by index", async () => {
  await openEvents();

  search("12");

  await waitFor(async () => expect(await shownFlags()).toEqual(["Hidden Potion on Route 104"]));
});

it("filters by category", async () => {
  await openEvents();

  fireEvent.click(screen.getByRole("button", { name: "Story" }));
  await waitFor(async () => expect(await shownFlags()).toEqual(["Got the Running Shoes", "Beat Roxanne"]));

  fireEvent.click(screen.getByRole("button", { name: "Misc" }));
  await waitFor(async () => expect(await shownFlags()).toEqual(["Got the Running Shoes", "Beat Roxanne", "Talked to Mom"]));
});

it("filters to a shortcut's category and clears the search", async () => {
  await openEvents();
  search("roxanne");
  fireEvent.click(screen.getByRole("button", { name: "Story" }));

  fireEvent.click(screen.getByRole("button", { name: "Legendaries and rebattles" }));

  await waitFor(async () => expect(await shownFlags()).toEqual(["Beat Kyogre"]));
  expect((screen.getByRole("searchbox", { name: "Search flags" }) as HTMLInputElement).value).toBe("");
  expect(screen.getByRole("button", { name: "Rebattle" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("button", { name: "Story" }).getAttribute("aria-pressed")).toBe("false");
});

it("hides a shortcut whose category has no flags in the save", async () => {
  await openEvents();

  expect(screen.getByRole("button", { name: "Legendaries and rebattles" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Story progress" })).toBeNull();
});

it("sets a flag in the pending save", async () => {
  const engine = await openEvents();
  const setFlag = vi.spyOn(engine.events, "setFlag");

  fireEvent.click(await screen.findByRole("switch", { name: "Talked to Mom" }));

  await waitFor(async () => expect(await engine.events.flag(30)).toBe(true));
  expect(setFlag).toHaveBeenCalledWith(30, true);
  await waitFor(() => expect(screen.getByRole("switch", { name: "Talked to Mom" }).getAttribute("aria-checked")).toBe("true"));

  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(await screen.findByRole("button", { name: "Apply and restart" })).toBeTruthy();
});

it("edits a flag without a name by its index", async () => {
  const engine = await openEvents();
  await engine.events.setFlag(50, true);

  fireEvent.change(await screen.findByRole("spinbutton", { name: "Edit by index" }), { target: { value: "50" } });

  const flag = await screen.findByRole("switch", { name: "Flag 50" });
  expect(flag.getAttribute("aria-checked")).toBe("true");

  fireEvent.click(flag);

  await waitFor(async () => expect(await engine.events.flag(50)).toBe(false));
  await waitFor(() => expect(screen.getByRole("switch", { name: "Flag 50" }).getAttribute("aria-checked")).toBe("false"));
});

it("only edits indexes the save has", async () => {
  await openEvents();

  fireEvent.change(await screen.findByRole("spinbutton", { name: "Edit by index" }), { target: { value: "64" } });

  expect(screen.queryByRole("switch", { name: "Flag 64" })).toBeNull();
});

it("warns until the warning is dismissed", async () => {
  const preferences = memoryPreferences();
  await openEvents(saveEvents, undefined, preferences.host);

  fireEvent.click(await screen.findByRole("button", { name: "Got it" }));
  expect(screen.queryByRole("button", { name: "Got it" })).toBeNull();
  await waitFor(() => expect(preferences.saved().eventsNoticeDismissed).toBe(true));

  cleanup();
  await openEvents(saveEvents, undefined, preferences.host);
  expect(screen.queryByRole("button", { name: "Got it" })).toBeNull();
});

it("warns when the preferences can't be read", async () => {
  const preferences = memoryPreferences();
  preferences.host.load = async () => {
    throw new Error("corrupt store");
  };

  await openEvents(saveEvents, undefined, preferences.host);

  expect(await screen.findByRole("button", { name: "Got it" })).toBeTruthy();
});

it("doesn't touch localStorage", async () => {
  const getItem = vi.spyOn(Storage.prototype, "getItem");
  const setItem = vi.spyOn(Storage.prototype, "setItem");

  await openEvents();
  fireEvent.click(await screen.findByRole("button", { name: "Got it" }));

  expect(getItem).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
});

async function openWork() {
  const engine = await openEvents(withWork);
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Work" }));
  await screen.findByRole("list", { name: "Work" });
  return engine;
}

const shownWork = async () =>
  within(await screen.findByRole("list", { name: "Work" }))
    .getAllByRole("listitem")
    .map((row) => row.querySelector("label")?.textContent);

function enter(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

it("shows the Work tab only when the save has work entries", async () => {
  await openEvents();
  expect(screen.queryByRole("tab", { name: "Work" })).toBeNull();

  cleanup();
  await openEvents(withWork);
  expect(screen.getByRole("tab", { name: "Work" })).toBeTruthy();
});

it("lists the named work entries", async () => {
  await openWork();

  expect(await shownWork()).toEqual(work.map((entry) => entry.name));
  expect(screen.getByRole("combobox", { name: "Lab state" }).textContent).toBe("Got a starter");
  expect((screen.getByRole("spinbutton", { name: "Steps to hatch" }) as HTMLInputElement).value).toBe("120");
});

it("searches and filters work", async () => {
  await openWork();

  fireEvent.change(screen.getByRole("searchbox", { name: "Search work" }), { target: { value: "lab" } });
  await waitFor(async () => expect(await shownWork()).toEqual(["Lab state"]));

  fireEvent.change(screen.getByRole("searchbox", { name: "Search work" }), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Misc" }));
  await waitFor(async () => expect(await shownWork()).toEqual(["Steps to hatch", "Weather"]));
});

it("sets work to one of its options", async () => {
  const engine = await openWork();
  const setWork = vi.spyOn(engine.events, "setWork");

  fireEvent.click(screen.getByRole("combobox", { name: "Lab state" }));
  fireEvent.click(within(await screen.findByRole("listbox")).getByRole("option", { name: "Done" }));

  expect(setWork).toHaveBeenCalledWith(3, 2);
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Lab state" }).textContent).toBe("Done"));
});

it("shows a value that isn't one of the options as Other", async () => {
  await openWork();

  expect(screen.getByRole("combobox", { name: "Weather" }).textContent).toBe("Other (7)");
});

it("sets work without options as a number", async () => {
  const engine = await openWork();
  const setWork = vi.spyOn(engine.events, "setWork");

  enter(screen.getByRole("spinbutton", { name: "Steps to hatch" }), "250");

  expect(setWork).toHaveBeenCalledWith(9, 250);
  await waitFor(async () => expect((await engine.events.get())?.work[1].value).toBe(250));
});

it("rejects a number outside the values the save accepts", async () => {
  const engine = await openWork();
  const setWork = vi.spyOn(engine.events, "setWork");
  const steps = screen.getByRole("spinbutton", { name: "Steps to hatch" }) as HTMLInputElement;

  enter(steps, "65536");
  enter(steps, "-1");

  expect(setWork).not.toHaveBeenCalled();
  expect(steps.value).toBe("120");
});

it("edits work without a name by its index", async () => {
  const engine = await openWork();
  const setWork = vi.spyOn(engine.events, "setWork");

  fireEvent.change(screen.getByRole("spinbutton", { name: "Edit by index" }), { target: { value: "32" } });
  expect(screen.queryByRole("spinbutton", { name: "Work 32" })).toBeNull();

  fireEvent.change(screen.getByRole("spinbutton", { name: "Edit by index" }), { target: { value: "20" } });
  enter(await screen.findByRole("spinbutton", { name: "Work 20" }), "5");

  expect(setWork).toHaveBeenCalledWith(20, 5);
});

const keyItems = (names: string[]): Pouch[] => [
  {
    name: "KeyItems",
    items: names.map((name, id) => ({ id, index: id, name, count: 1, maxCount: 1, isUnknown: false })),
    addable: [],
  },
];

const withTickets = (gen3: Partial<NonNullable<SaveEvents["gen3"]>> = {}): SaveEvents => ({
  ...saveEvents,
  gen3: {
    tickets: ["Eon Ticket", "Mystic Ticket", "Old Sea Map"],
    anyTicketMissing: true,
    oldSeaMapNeedsConfirmation: false,
    islands: [],
    ...gen3,
  },
});

async function openTickets(events: SaveEvents, inventory = keyItems(["Eon Ticket"])) {
  const engine = await openEvents(events, inventory);
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Tickets" }));
  await screen.findByRole("list", { name: "Tickets" });
  return engine;
}

const giveTickets = () => screen.getByRole("button", { name: "Give tickets" }) as HTMLButtonElement;

it("shows the Tickets tab only for saves with Gen 3 events", async () => {
  await openEvents();
  expect(screen.queryByRole("tab", { name: "Tickets" })).toBeNull();

  cleanup();
  await openEvents(withTickets());
  expect(screen.getByRole("tab", { name: "Tickets" })).toBeTruthy();
});

it("lists the tickets and whether the bag holds them", async () => {
  await openTickets(withTickets());

  const rows = within(screen.getByRole("list", { name: "Tickets" })).getAllByRole("listitem");
  expect(rows.map((row) => row.dataset.held)).toEqual(["true", "false", "false"]);
});

it("gives the missing tickets", async () => {
  const engine = await openTickets(withTickets());
  const give = vi.spyOn(engine.events, "giveTickets");

  fireEvent.click(giveTickets());

  expect(give).toHaveBeenCalledWith(false);
  expect(screen.queryByRole("alertdialog")).toBeNull();
  await waitFor(() => expect(giveTickets().disabled).toBe(true));
});

it("disables Give tickets when the bag holds every ticket", async () => {
  await openTickets(withTickets(), keyItems(["Eon Ticket", "Mystic Ticket", "Old Sea Map"]));

  expect(giveTickets().disabled).toBe(true);
});

it("asks before giving the Old Sea Map", async () => {
  const engine = await openTickets(withTickets({ oldSeaMapNeedsConfirmation: true }));
  const give = vi.spyOn(engine.events, "giveTickets");

  fireEvent.click(giveTickets());
  expect(give).not.toHaveBeenCalled();
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Include it" }));

  expect(give).toHaveBeenCalledWith(true);
  await waitFor(() => expect(giveTickets().disabled).toBe(true));
});

it("leaves out the Old Sea Map when told to", async () => {
  const engine = await openTickets(withTickets({ oldSeaMapNeedsConfirmation: true }));
  const give = vi.spyOn(engine.events, "giveTickets");

  fireEvent.click(giveTickets());
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Leave it out" }));

  expect(give).toHaveBeenCalledWith(false);
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
});

it("switches island access", async () => {
  const islands: EventFlag[] = [
    { index: 50, name: "Southern Island", category: "Island", value: false },
    { index: 51, name: "Faraway Island", category: "Island", value: true },
  ];
  const engine = await openTickets(withTickets({ islands }));
  const setFlag = vi.spyOn(engine.events, "setFlag");

  expect(screen.getByRole("switch", { name: "Faraway Island" }).getAttribute("aria-checked")).toBe("true");
  fireEvent.click(screen.getByRole("switch", { name: "Southern Island" }));

  expect(setFlag).toHaveBeenCalledWith(50, true);
  await waitFor(() => expect(screen.getByRole("switch", { name: "Southern Island" }).getAttribute("aria-checked")).toBe("true"));
});

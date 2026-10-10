import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EngineProvider } from "@pkhex-everywhere/react";
import { draftHandle, type EditablePokemon, type ItemChoice, type PokemonId, type PokemonSummary } from "@pkhex-everywhere/engine";
import { invoke } from "@tauri-apps/api/core";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FakeGameArt, gameWithArt } from "@/game-art/fakeGameArt";
import { androidExportHost } from "./androidHost";
import { EditorScreen } from "./EditorScreen";
import { ExportProvider, type ExportHost } from "./exportFile";
import { fakeEngine } from "./fakeEngine";
import { saveHome } from "./saveHome";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(async () => {}) }));

let rowsInView: boolean;
const hiddenRows: (() => void)[] = [];

beforeEach(() => {
  rowsInView = true;
  hiddenRows.length = 0;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private callback: IntersectionObserverCallback) {}
      observe(target: Element) {
        const enter = () =>
          this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
        if (rowsInView) enter();
        else hiddenRows.push(enter);
      }
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function pokemon(species: string, slot: number, nickname = species.toUpperCase()): PokemonSummary {
  const at = { source: "party" as const, slot };
  return {
    id: `${species}:${slot}` as PokemonId,
    at,
    speciesId: slot + 1,
    speciesIndex: slot + 1,
    species,
    isUnknown: false,
    editable: true,
    form: { id: 0, name: "" },
    nickname,
    level: 5,
    isShiny: false,
    gender: "male",
    isEgg: false,
    types: [],
  };
}

const bulbasaur = () => pokemon("Bulbasaur", 0);
const pikachu = () => pokemon("Pikachu", 1);

function launch({
  party = [bulbasaur(), pikachu()],
  generation = 3,
  details = {},
  heldItems,
  art = {},
  savedAs = (fileName: string) => fileName,
  exportVia,
}: {
  party?: PokemonSummary[];
  generation?: number;
  details?: Record<string, Partial<EditablePokemon>>;
  heldItems?: ItemChoice[];
  art?: Record<string, Uint8Array>;
  savedAs?(fileName: string): string | undefined;
  exportVia?: ExportHost;
} = {}) {
  const fake = fakeEngine({ party, generation, details, heldItems });
  const host = { read: async () => new Uint8Array([1]), apply: vi.fn(async () => {}), playTimeSinceSave: async () => 0 };
  const onClose = vi.fn();
  const exportHost = { saveFile: vi.fn(async ({ fileName }: { fileName: string }) => savedAs(fileName)), saveFiles: vi.fn(async () => undefined) };
  render(
    <EngineProvider engine={fake.engine}>
      <FakeGameArt art={gameWithArt(art)}>
        <ExportProvider host={exportVia ?? exportHost}>
          <EditorScreen host={host} home={saveHome} onBackGesture={() => () => {}} onClose={onClose} onSaveFirst={() => {}} />
        </ExportProvider>
      </FakeGameArt>
    </EngineProvider>,
  );
  return { ...fake, party, host, onClose, exportHost };
}

async function openPokemon(nickname: string) {
  const party = await screen.findByRole("region", { name: "Party" });
  fireEvent.click(within(party).getByRole("button", { name: new RegExp(nickname) }));
  return screen.findByRole("region", { name: "Basics" });
}

const field = (name: string) => screen.findByLabelText(name) as Promise<HTMLInputElement | HTMLButtonElement>;

async function type(name: string, value: string) {
  const input = await field(name);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

const search = () => screen.findByRole("combobox", { name: "Search" });

async function open(name: string) {
  fireEvent.click(await screen.findByRole("combobox", { name }));
  return screen.findByRole("listbox");
}

async function filter(name: string, text: string) {
  const list = await open(name);
  fireEvent.change(await search(), { target: { value: text } });
  return list;
}

async function pick(name: string, option: string) {
  const list = await filter(name, option.slice(1, 4).toLowerCase());
  fireEvent.click(within(list).getByRole("option", { name: option }));
}

const back = () => fireEvent.click(screen.getByRole("button", { name: "Back" }));
const saveBar = () => screen.findByRole("region", { name: "Unsaved changes" });
const dialog = () => screen.findByRole("alertdialog", { name: "Discard changes?" });
const applyButton = () => screen.findByRole("button", { name: "Apply and restart" });
const applyInPrompt = async () =>
  fireEvent.click(within(await screen.findByRole("alertdialog", { name: "Apply and restart?" })).getByRole("button", { name: "Apply and restart" }));

it("opens a Pokémon into one page with its nickname as the title", async () => {
  launch();

  await openPokemon("BULBASAUR");

  expect(screen.getByRole("heading", { name: "BULBASAUR" })).toBeTruthy();
  expect(screen.getByRole("region", { name: "Moves" })).toBeTruthy();
  expect(screen.getByRole("region", { name: "Stats" })).toBeTruthy();
  expect(screen.queryByRole("region", { name: "Unsaved changes" })).toBeNull();
});

const png = (byte: number) => new Uint8Array([byte]);
const dataUrl = (byte: number) => `data:image/png;base64,${btoa(String.fromCharCode(byte))}`;
const heroImage = (name: string) => within(screen.getByRole("region", { name: "BULBASAUR" })).getByRole("img", { name });

it("plays the game's animated sprite in the artwork slot", async () => {
  launch({ art: { "sprite-1-0": png(1), "icon-1-0": png(2), "anim-1-0": png(3) } });

  await openPokemon("BULBASAUR");

  await waitFor(() => expect(heroImage("Bulbasaur").getAttribute("src")).toBe(dataUrl(3)));
});

it("shows the game's front sprite in the artwork slot when it has no animation", async () => {
  launch({ art: { "sprite-1-0": png(1), "icon-1-0": png(2) } });

  await openPokemon("BULBASAUR");

  await waitFor(() => expect(heroImage("Bulbasaur").getAttribute("src")).toBe(dataUrl(1)));
});

it("shows the female sprite of a female Pokémon", async () => {
  launch({ art: { "sprite-1-0": png(1), "sprite-1-0-female": png(2) }, details: { BULBASAUR: { gender: "female" } } });

  await openPokemon("BULBASAUR");

  await waitFor(() => expect(heroImage("Bulbasaur").getAttribute("src")).toBe(dataUrl(2)));
});

it("shows a placeholder in the artwork slot when the game has no art for it", async () => {
  launch();

  await openPokemon("BULBASAUR");

  await waitFor(() => expect(heroImage("Bulbasaur").tagName).not.toBe("IMG"));
});

it("lists the engine's legality messages after tapping the chip", async () => {
  const messages = ["Moves: Thunderbolt isn't learnable.", "Ball: Invalid."];
  launch({ details: { PIKACHU: { legality: { valid: false, messages } } } });

  await openPokemon("BULBASAUR");
  expect(screen.getByText("Legal")).toBeTruthy();

  fireEvent.click(within(await screen.findByRole("region", { name: "Party" })).getByRole("button", { name: /PIKACHU/ }));
  const chip = await screen.findByRole("button", { name: /2 issues/ });
  expect(screen.queryByText(messages[0])).toBeNull();
  fireEvent.click(chip);
  expect(screen.getByText(messages[0])).toBeTruthy();
  expect(screen.getByText(messages[1])).toBeTruthy();
});

it("shows no legality chip when the engine gives none", async () => {
  launch({ generation: 2 });

  await openPokemon("BULBASAUR");

  expect(screen.queryByText(/legal|issue/i)).toBeNull();
});

it("edits the basics in the draft and shows the save bar", async () => {
  const { draft, stored, party } = launch();
  await openPokemon("BULBASAUR");

  await pick("Species", "Evolved");
  await waitFor(() => expect(draft()?.species).toBe(999));
  await type("Level", "42");
  await waitFor(() => expect(draft()?.level).toBe(42));
  await pick("Ability", "Chlorophyll");
  await waitFor(() => expect(draft()?.ability).toBe(34));
  await pick("Held item", "Leftovers");
  await waitFor(() => expect(draft()?.heldItem).toBe(234));

  expect(within(await saveBar()).getByText(/4 changes/)).toBeTruthy();
  expect((await field("Level")).value).toBe("42");
  expect(stored(party[0].at).level).toBe(5);
  expect(screen.queryByRole("button", { name: "Apply and restart" })).toBeNull();
});

it("edits the nickname and shiny star in the hero", async () => {
  const { draft } = launch();
  await openPokemon("BULBASAUR");
  const star = screen.getByRole("button", { name: "Shiny" });
  expect(star.getAttribute("aria-pressed")).toBe("false");

  await type("Nickname", "LEAFY");
  await waitFor(() => expect(draft()?.nickname).toBe("LEAFY"));
  fireEvent.click(star);

  await waitFor(() => expect(draft()?.isShiny).toBe(true));
  await waitFor(() => expect(screen.getByRole("button", { name: "Shiny" }).getAttribute("aria-pressed")).toBe("true"));
  expect(await screen.findByRole("heading", { name: "LEAFY" })).toBeTruthy();
});

it("shows a pill per type in the hero, in type order", async () => {
  launch({ details: { BULBASAUR: { types: [11, 3] } } });

  await openPokemon("BULBASAUR");

  const types = within(screen.getByRole("region", { name: "BULBASAUR" })).getByRole("list", { name: "Types" });
  expect(within(types).getAllByRole("listitem").map((pill) => pill.textContent)).toEqual(["Grass", "Poison"]);
});

it("saves the draft to the slot and keeps editing", async () => {
  const { draft, stored, party } = launch();
  await openPokemon("BULBASAUR");
  await type("Level", "42");

  fireEvent.click(within(await saveBar()).getByRole("button", { name: "Save" }));

  await waitFor(() => expect(stored(party[0].at).level).toBe(42));
  await waitFor(() => expect(screen.queryByRole("region", { name: "Unsaved changes" })).toBeNull());
  expect(await applyButton()).toBeTruthy();
  await type("Level", "43");
  await waitFor(() => expect(draft()?.level).toBe(43));
  expect(stored(party[0].at).level).toBe(42);
});

it("discards the draft and shows the saved values", async () => {
  const { stored, party } = launch();
  await openPokemon("BULBASAUR");
  await type("Level", "42");

  fireEvent.click(within(await saveBar()).getByRole("button", { name: "Discard" }));

  await waitFor(() => expect(screen.queryByRole("region", { name: "Unsaved changes" })).toBeNull());
  expect((await field("Level")).value).toBe("5");
  expect(stored(party[0].at).level).toBe(5);
  expect(screen.queryByRole("button", { name: "Apply and restart" })).toBeNull();
});

it("changes the nature where the game allows it", async () => {
  const { draft } = launch({ generation: 5 });
  await openPokemon("BULBASAUR");

  await pick("Nature", "Adamant");

  await waitFor(() => expect(draft()?.nature).toBe(3));
});

it("shows a nature the game derives from the Pokémon as read-only", async () => {
  launch({ generation: 3 });
  await openPokemon("BULBASAUR");

  expect((await field("Nature")).disabled).toBe(true);
});

it("leaves out the fields a Gen 1 or 2 game doesn't have", async () => {
  launch({ generation: 2 });
  await openPokemon("BULBASAUR");
  await field("Level");

  expect(screen.queryByLabelText("Nature")).toBeNull();
  expect(screen.queryByLabelText("Ability")).toBeNull();
  expect(screen.getByLabelText("Held item")).toBeTruthy();
});

it("says why the engine refused a change and keeps the old value", async () => {
  const { draft } = launch();
  await openPokemon("BULBASAUR");

  await type("Level", "250");

  expect(await screen.findByText(/Level must be between 1 and 100/)).toBeTruthy();
  expect((await field("Level")).value).toBe("5");
  expect(draft()?.level).toBe(5);
});

it("changes moves", async () => {
  const { draft } = launch();
  await openPokemon("BULBASAUR");

  await pick("Move 2", "Growl");

  await waitFor(() => expect(draft()?.moves.map((move) => move.id)).toEqual([33, 45, 0, 0]));
});

it("keeps both of two quick move changes", async () => {
  const { draft } = launch();
  await openPokemon("BULBASAUR");

  await pick("Move 2", "Growl");
  await pick("Move 3", "Pound");

  await waitFor(() => expect(draft()?.moves.map((move) => move.id)).toEqual([33, 45, 1, 0]));
});

it("offers every move when asked", async () => {
  launch();
  await openPokemon("BULBASAUR");
  expect(within(await open("Move 1")).queryByRole("option", { name: "Psychic" })).toBeNull();
  fireEvent.keyDown(await search(), { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());

  fireEvent.click(screen.getByLabelText("Show all moves"));

  expect(within(await open("Move 1")).getByRole("option", { name: "Psychic" })).toBeTruthy();
});

it("filters a list to the names matching what's typed", async () => {
  launch();
  await openPokemon("BULBASAUR");

  const list = await filter("Species", "EVO");

  await waitFor(() => expect(within(list).getAllByRole("option")).toHaveLength(1));
  expect(within(list).getByRole("option", { name: "Evolved" })).toBeTruthy();
});

it("says when nothing matches what's typed", async () => {
  launch();
  await openPokemon("BULBASAUR");

  await filter("Species", "zzz");

  expect(await screen.findByText("No matches")).toBeTruthy();
  expect(screen.queryAllByRole("option")).toEqual([]);
});

const rowImage = (list: HTMLElement, name: string) => within(list).getByRole("option", { name }).querySelector("img");

it("shows each species' menu icon in its row", async () => {
  launch({ art: { "icon-1-0": png(2) } });
  await openPokemon("BULBASAUR");

  const list = await open("Species");

  await waitFor(() => expect(rowImage(list, "Bulbasaur")?.getAttribute("src")).toBe(dataUrl(2)));
});

it("shows held items' icons in a game with item icons", async () => {
  launch({ generation: 4, art: { "item-234": png(3) } });
  await openPokemon("BULBASAUR");

  const list = await open("Held item");

  await waitFor(() => expect(rowImage(list, "Leftovers")?.getAttribute("src")).toBe(dataUrl(3)));
});

it("shows a Gen 3 hack's held items' icons by the index its save stores", async () => {
  const heldItems = [
    { id: 0, index: 0, name: "(None)", isUnknown: false },
    { id: 234, index: 500, name: "Leftovers", isUnknown: false },
  ];
  launch({ generation: 3, heldItems, art: { "item-234": png(3), "item-500": png(4) } });
  await openPokemon("BULBASAUR");

  const list = await open("Held item");

  await waitFor(() => expect(rowImage(list, "Leftovers")?.getAttribute("src")).toBe(dataUrl(4)));
});

it("shows no held item icons in a game without item icons", async () => {
  launch({ generation: 4, art: { "icon-1-0": png(2) } });
  await openPokemon("BULBASAUR");
  await waitFor(() => expect(heroImage("Bulbasaur").getAttribute("src")).toBe(dataUrl(2)));

  const list = await open("Held item");

  expect(within(list).getByRole("option", { name: "Leftovers" }).innerHTML).toBe("Leftovers");
});

it("loads a row's sprite only once it scrolls into view", async () => {
  rowsInView = false;
  launch({ art: { "icon-1-0": png(2) } });
  await openPokemon("BULBASAUR");
  const list = await open("Species");
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(rowImage(list, "Bulbasaur")).toBeNull();

  act(() => hiddenRows.forEach((enter) => enter()));

  await waitFor(() => expect(rowImage(list, "Bulbasaur")?.getAttribute("src")).toBe(dataUrl(2)));
});

it("uses no native select on the Pokémon page", async () => {
  launch();
  await openPokemon("BULBASAUR");
  await field("Species");

  expect(document.querySelector("select")).toBeNull();
});

it("changes IVs and EVs", async () => {
  const { draft } = launch();
  await openPokemon("BULBASAUR");

  await type("Attack IV", "31");
  await waitFor(() => expect(draft()?.ivs.attack).toBe(31));
  await type("Speed EV", "252");
  await waitFor(() => expect(draft()?.evs.speed).toBe(252));
});

it("goes back without asking when nothing changed", async () => {
  launch();
  await openPokemon("BULBASAUR");

  back();

  expect(await screen.findByRole("region", { name: "Party" })).toBeTruthy();
  expect(screen.queryByRole("alertdialog")).toBeNull();
});

it("asks before going back with unsaved changes, and Discard leaves the slot untouched", async () => {
  const { stored, party } = launch();
  await openPokemon("BULBASAUR");
  await type("Nickname", "LEAFY");
  await saveBar();

  back();
  fireEvent.click(within(await dialog()).getByRole("button", { name: "Keep editing" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(screen.getByRole("heading", { name: "LEAFY" })).toBeTruthy();

  back();
  fireEvent.click(within(await dialog()).getByRole("button", { name: "Discard" }));

  expect(await screen.findByRole("heading", { name: "Edit save" })).toBeTruthy();
  expect(stored(party[0].at).nickname).toBe("BULBASAUR");
  expect(screen.queryByRole("button", { name: "Apply and restart" })).toBeNull();
  await openPokemon("BULBASAUR");
  expect((await field("Nickname")).value).toBe("BULBASAUR");
});

it("asks before going back right after leaving an edited field", async () => {
  const { stored, party } = launch();
  await openPokemon("BULBASAUR");

  await type("Nickname", "LEAFY");
  back();
  fireEvent.click(within(await dialog()).getByRole("button", { name: "Save" }));

  await waitFor(() => expect(stored(party[0].at).nickname).toBe("LEAFY"));
});

it("saves before going back when asked to", async () => {
  const { stored, party } = launch();
  await openPokemon("BULBASAUR");
  await type("Nickname", "LEAFY");
  await saveBar();

  back();
  fireEvent.click(within(await dialog()).getByRole("button", { name: "Save" }));

  expect(await screen.findByRole("heading", { name: "Edit save" })).toBeTruthy();
  expect(stored(party[0].at).nickname).toBe("LEAFY");
  expect(await screen.findByRole("button", { name: /LEAFY/ })).toBeTruthy();
  expect(await applyButton()).toBeTruthy();
});

it("asks before opening another Pokémon from the list beside it", async () => {
  const { stored, party } = launch();
  await openPokemon("BULBASAUR");
  await type("Nickname", "LEAFY");
  await saveBar();

  fireEvent.click(within(await screen.findByRole("region", { name: "Party" })).getByRole("button", { name: /PIKACHU/ }));
  fireEvent.click(within(await dialog()).getByRole("button", { name: "Save" }));

  expect(await screen.findByRole("heading", { name: "PIKACHU" })).toBeTruthy();
  expect(stored(party[0].at).nickname).toBe("LEAFY");
  expect((await field("Nickname")).value).toBe("PIKACHU");
});

it("shows no Apply on the Pokémon page, only on the home beside it", async () => {
  const { stored, party } = launch();
  await openPokemon("BULBASAUR");
  await type("Level", "42");
  fireEvent.click(within(await saveBar()).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(stored(party[0].at).level).toBe(42));

  const apply = await applyButton();

  expect(within(screen.getByRole("banner")).queryByRole("button", { name: /Apply/ })).toBeNull();
  expect(apply.closest("section")?.contains(screen.getByRole("region", { name: "Party" }))).toBe(true);
  expect(apply.closest("section")?.contains(screen.getByRole("region", { name: "Basics" }))).toBe(false);
});

it("disables Apply beside a Pokémon with unsaved changes", async () => {
  const { stored, party } = launch();
  await openPokemon("BULBASAUR");
  await type("Level", "42");
  fireEvent.click(within(await saveBar()).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(stored(party[0].at).level).toBe(42));
  await waitFor(async () => expect((await applyButton()).hasAttribute("disabled")).toBe(false));

  await type("Level", "43");

  await waitFor(async () => expect((await applyButton()).hasAttribute("disabled")).toBe(true));
});

it("applies the save without the unsaved draft", async () => {
  const { stored, party, host, onClose } = launch();
  await openPokemon("BULBASAUR");
  await type("Level", "42");
  fireEvent.click(within(await saveBar()).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(stored(party[0].at).level).toBe(42));
  await type("Level", "43");
  await saveBar();

  back();
  fireEvent.click(within(await dialog()).getByRole("button", { name: "Discard" }));
  fireEvent.click(await applyButton());
  await applyInPrompt();

  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(stored(party[0].at).level).toBe(42);
  expect(host.apply).toHaveBeenCalled();
});

it("keeps editing after a failed apply", async () => {
  const { draft, host, stored, party } = launch();
  await openPokemon("BULBASAUR");
  await type("Level", "42");
  fireEvent.click(within(await saveBar()).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(stored(party[0].at).level).toBe(42));
  host.apply.mockRejectedValueOnce("no room");

  fireEvent.click(await applyButton());
  await applyInPrompt();
  await screen.findByText(/no room/);
  await type("Level", "43");

  await waitFor(() => expect(draft()?.level).toBe(43));
});

it("shows a Pokémon that can't be edited read-only", async () => {
  launch({
    party: [{ ...pokemon("Missingno", 0, "MISSINGNO"), editable: false }],
    details: { MISSINGNO: { editable: false, level: 33 } },
  });

  fireEvent.click(within(await screen.findByRole("region", { name: "Party" })).getByRole("button", { name: /MISSINGNO/ }));

  const hero = await screen.findByRole("region", { name: "MISSINGNO" });
  expect(within(hero).getByText(/Lv\. 33/)).toBeTruthy();
  expect(screen.queryByLabelText("Nickname")).toBeNull();
  expect(screen.queryByRole("button", { name: "Shiny" })).toBeNull();
});

async function exportFile(nickname: string) {
  const hero = await screen.findByRole("region", { name: nickname });
  fireEvent.keyDown(within(hero).getByRole("button", { name: "More" }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("menuitem", { name: /export/i }));
}

it("exports the Pokémon's file through the host", async () => {
  const { exports, exportHost, party } = launch();
  await openPokemon("BULBASAUR");

  await exportFile("BULBASAUR");

  await waitFor(() => expect(exportHost.saveFile).toHaveBeenCalledWith({ bytes: new Uint8Array([5]), fileName: "BULBASAUR.pk3" }));
  expect(exports()).toEqual([party[0].at]);
  expect(await screen.findByRole("status")).toBeTruthy();
});

it("exports the draft when the page has unsaved edits", async () => {
  const { exports, exportHost } = launch();
  await openPokemon("BULBASAUR");
  await type("Level", "42");
  await saveBar();

  await exportFile("BULBASAUR");

  await waitFor(() => expect(exportHost.saveFile).toHaveBeenCalledWith({ bytes: new Uint8Array([42]), fileName: "BULBASAUR.pk3" }));
  expect(exports()).toEqual([draftHandle]);
});

it("exports a Pokémon that fails the legality check", async () => {
  const { exportHost } = launch({ details: { BULBASAUR: { legality: { valid: false, messages: ["Ball: Invalid."] } } } });
  await openPokemon("BULBASAUR");

  await exportFile("BULBASAUR");

  await waitFor(() => expect(exportHost.saveFile).toHaveBeenCalled());
});

it("shows no toast when the save is cancelled", async () => {
  const { exportHost } = launch({ savedAs: () => undefined });
  await openPokemon("BULBASAUR");

  await exportFile("BULBASAUR");

  await waitFor(() => expect(exportHost.saveFile).toHaveResolved());
  await act(async () => {});
  expect(screen.queryByRole("status")).toBeNull();
});

it("shares the Pokémon's file on Android and shows no toast", async () => {
  launch({ exportVia: androidExportHost });
  await openPokemon("BULBASAUR");

  await exportFile("BULBASAUR");

  await waitFor(() =>
    expect(invoke).toHaveBeenCalledWith("export_share", new Uint8Array([5]), { headers: { name: "BULBASAUR.pk3" } }),
  );
  await act(async () => {});
  expect(screen.queryByRole("status")).toBeNull();
});

it("exports a Pokémon that can't be edited", async () => {
  const { exports, exportHost, party } = launch({
    party: [{ ...pokemon("Missingno", 0, "MISSINGNO"), editable: false }],
    details: { MISSINGNO: { editable: false, level: 33 } },
  });
  fireEvent.click(within(await screen.findByRole("region", { name: "Party" })).getByRole("button", { name: /MISSINGNO/ }));

  await exportFile("MISSINGNO");

  await waitFor(() => expect(exportHost.saveFile).toHaveBeenCalledWith({ bytes: new Uint8Array([33]), fileName: "MISSINGNO.pk3" }));
  expect(exports()).toEqual([party[0].at]);
});

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EngineProvider } from "@pkhex-everywhere/react";
import type { WonderCardEntry } from "@pkhex-everywhere/engine";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FakeGameArt } from "@/game-art/fakeGameArt";
import { EditorScreen } from "./EditorScreen";
import { fakeCardFile, fakeEngine, type FakeGiftEvent, type FakeMysteryGift } from "./fakeEngine";
import { PokemonFileProvider, type PickedFile } from "./pokemonFile";
import { saveHome } from "./saveHome";

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private callback: IntersectionObserverCallback) {}
      observe(target: Element) {
        this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const manaphy: FakeGiftEvent = {
  id: "pcd-1-ENG",
  title: "Manaphy Egg",
  kind: "pokemon",
  species: { id: 490, name: "Manaphy" },
  item: null,
  language: "ENG",
  cardId: 1,
};
const darkrai: FakeGiftEvent = {
  id: "pcd-2-JPN",
  title: "Newmoon Darkrai",
  kind: "pokemon",
  species: { id: 491, name: "Darkrai" },
  item: null,
  language: "JPN",
  cardId: 2,
};
const memberCard: FakeGiftEvent = {
  id: "pcd-3",
  title: "Member Card",
  kind: "item",
  species: null,
  item: { id: 467, name: "Member Card" },
  language: null,
  cardId: 3,
};
const seals: FakeGiftEvent = {
  id: "pcd-4-ENG",
  title: "Seal Set",
  kind: "other",
  species: null,
  item: null,
  language: "ENG",
  cardId: 4,
};
const events = [manaphy, darkrai, memberCard, seals];

const inAlbum = ({ title, kind, species, item, language, cardId }: FakeGiftEvent): WonderCardEntry => ({
  title,
  kind,
  species,
  item,
  language,
  cardId,
  known: true,
});

function launch(mysteryGift?: Partial<FakeMysteryGift>, picked: (PickedFile | null)[] = []) {
  const fake = fakeEngine({
    generation: 4,
    version: "Platinum",
    mysteryGift: mysteryGift && { unlocked: true, slots: 3, events, ...mysteryGift },
  });
  const host = { read: async () => new Uint8Array([1]), apply: async () => {}, playTimeSinceSave: async () => 0 };
  const files = { pick: vi.fn(async () => picked.shift() ?? null) };
  render(
    <EngineProvider engine={fake.engine}>
      <FakeGameArt>
        <PokemonFileProvider host={files}>
          <EditorScreen host={host} home={saveHome} onBackGesture={() => () => {}} onClose={() => {}} onSaveFirst={() => {}} />
        </PokemonFileProvider>
      </FakeGameArt>
    </EngineProvider>,
  );
  return fake;
}

async function openMysteryGift(mysteryGift: Partial<FakeMysteryGift> = {}, picked?: (PickedFile | null)[]) {
  const fake = launch(mysteryGift, picked);
  fireEvent.click(await screen.findByRole("button", { name: "Mystery Gift" }));
  await screen.findByRole("list", { name: "Events" });
  return fake;
}

// Leaves out the art, whose placeholder tiles carry the dex number.
const shownText = (element: Element) => {
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll("[aria-hidden]").forEach((art) => art.remove());
  return copy.textContent;
};

const eventList = () => screen.getByRole("list", { name: "Events" });
const shownEvents = () => within(eventList()).queryAllByRole("button").map(shownText);
const shownCards = () =>
  within(screen.queryByRole("list", { name: "Cards" }) ?? document.createElement("ul"))
    .queryAllByRole("listitem")
    .map(shownText);
const search = (text: string) => fireEvent.change(screen.getByRole("searchbox", { name: "Search events" }), { target: { value: text } });

async function review(title: string) {
  fireEvent.click(within(eventList()).getByRole("button", { name: new RegExp(title) }));
  const dialog = await screen.findByRole("alertdialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Review" }));
  return screen.findByRole("article");
}

const addCard = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Add card" }));
  await screen.findByRole("list", { name: "Events" });
};

it("shows the Mystery Gift tile only for a save with a card album", async () => {
  launch();
  await screen.findByRole("button", { name: "Trainer" });
  expect(screen.queryByRole("button", { name: "Mystery Gift" })).toBeNull();
  cleanup();

  launch({});
  expect(await screen.findByRole("button", { name: "Mystery Gift" })).toBeTruthy();
});

it("lists the album's cards and the events with their language and Received tags", async () => {
  await openMysteryGift({ cards: [inAlbum(memberCard)], received: [2] });

  expect(shownCards()).toEqual(["Member Card"]);
  expect(shownEvents()).toEqual(["Manaphy EggENG", "Newmoon DarkraiJPNReceived", "Member Card", "Seal SetENG"]);
});

it("searches events by title, species and item", async () => {
  await openMysteryGift();

  search("newmoon");
  expect(shownEvents()).toEqual(["Newmoon DarkraiJPN"]);

  search("manaphy");
  expect(shownEvents()).toEqual(["Manaphy EggENG"]);

  search("member");
  expect(shownEvents()).toEqual(["Member Card"]);

  search("zzz");
  expect(screen.getByText("Nothing matches.")).toBeTruthy();
});

it("filters to Pokémon or items, and shows other cards only with no filter", async () => {
  await openMysteryGift();

  fireEvent.click(screen.getByRole("radio", { name: "Pokémon" }));
  expect(shownEvents()).toEqual(["Manaphy EggENG", "Newmoon DarkraiJPN"]);

  fireEvent.click(screen.getByRole("radio", { name: "Item" }));
  expect(shownEvents()).toEqual(["Member Card"]);

  fireEvent.click(screen.getByRole("radio", { name: "Item" }));
  expect(shownEvents()).toContain("Seal SetENG");
});

it("previews the Pokémon a card gives", async () => {
  await openMysteryGift();

  fireEvent.click(within(eventList()).getByRole("button", { name: /Manaphy Egg/ }));

  const dialog = await screen.findByRole("alertdialog");
  expect(within(dialog).getByRole("heading", { name: "Manaphy Egg" })).toBeTruthy();
  expect(within(dialog).getByText("Manaphy · Lv. 1")).toBeTruthy();
  expect(within(dialog).queryByText("Not a known event")).toBeNull();
});

it("adds a card into the first free slot", async () => {
  const fake = await openMysteryGift({ cards: [inAlbum(darkrai)] });
  const insertEvent = vi.spyOn(fake.engine.mysteryGift, "insertEvent");

  const card = await review("Member Card");
  expect(within(card).getByText("Slot 2")).toBeTruthy();
  expect(within(card).getByText("Empty → Member Card")).toBeTruthy();
  await addCard();

  expect(insertEvent).toHaveBeenCalledWith("pcd-3", 1);
  await waitFor(() => expect(shownCards()).toEqual(["Newmoon DarkraiJPN", "Member Card"]));
  expect(await screen.findByRole("button", { name: "Apply and restart" })).toBeTruthy();
});

it("replaces the card the player picks when the album is full", async () => {
  const fake = await openMysteryGift({ cards: [inAlbum(darkrai), inAlbum(seals), inAlbum(manaphy)] });
  const insertEvent = vi.spyOn(fake.engine.mysteryGift, "insertEvent");

  await review("Member Card");
  const add = screen.getByRole("button", { name: "Add card" }) as HTMLButtonElement;
  expect(add.disabled).toBe(true);
  fireEvent.click(screen.getByRole("radio", { name: "Seal Set" }));
  expect(within(screen.getByRole("article")).getByText("Seal Set → Member Card")).toBeTruthy();
  await addCard();

  expect(insertEvent).toHaveBeenCalledWith("pcd-3", 1);
  await waitFor(() => expect(shownCards()).toEqual(["Newmoon DarkraiJPN", "Member Card", "Manaphy EggENG"]));
});

it("removes a card and moves the later ones up", async () => {
  const fake = await openMysteryGift({ cards: [inAlbum(darkrai), inAlbum(memberCard)] });
  const remove = vi.spyOn(fake.engine.mysteryGift, "remove");

  fireEvent.click(screen.getByRole("button", { name: "Remove Newmoon Darkrai" }));
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Remove" }));

  await waitFor(() => expect(shownCards()).toEqual(["Member Card"]));
  expect(remove).toHaveBeenCalledWith(0);
});

it("unlocks Mystery Gift when it's locked", async () => {
  const fake = await openMysteryGift({ unlocked: false });
  const setUnlocked = vi.spyOn(fake.engine.mysteryGift, "setUnlocked");

  const card = await review("Member Card");
  expect(within(card).getByText("Also unlocks Mystery Gift in the menu")).toBeTruthy();
  await addCard();

  expect(setUnlocked).toHaveBeenCalledWith(true);
  expect((await fake.engine.mysteryGift.status()).unlocked).toBe(true);
});

it("leaves the unlock alone when Mystery Gift is already unlocked", async () => {
  const fake = await openMysteryGift({ unlocked: true });
  const setUnlocked = vi.spyOn(fake.engine.mysteryGift, "setUnlocked");

  const card = await review("Member Card");
  expect(within(card).queryByText("Also unlocks Mystery Gift in the menu")).toBeNull();
  await addCard();

  expect(setUnlocked).not.toHaveBeenCalled();
});

it("has no unlock in Gen 5", async () => {
  const fake = await openMysteryGift({ unlocked: null, slots: 12 });
  const setUnlocked = vi.spyOn(fake.engine.mysteryGift, "setUnlocked");

  const card = await review("Member Card");
  expect(within(card).queryByText("Also unlocks Mystery Gift in the menu")).toBeNull();
  await addCard();

  expect(setUnlocked).not.toHaveBeenCalled();
  await waitFor(() => expect(shownCards()).toEqual(["Member Card"]));
});

it("adds a received event again with no extra call", async () => {
  const fake = await openMysteryGift({ received: [3] });
  const setReceived = vi.spyOn(fake.engine.mysteryGift, "setReceived");
  expect(shownEvents()).toContain("Member CardReceived");

  await review("Member Card");
  await addCard();

  await waitFor(() => expect(shownCards()).toEqual(["Member Card"]));
  expect(setReceived).not.toHaveBeenCalled();
});

it("marks an added card received", async () => {
  await openMysteryGift();

  await review("Member Card");
  await addCard();

  await waitFor(() => expect(shownEvents()).toContain("Member CardReceived"));
});

it("adds a card from a file", async () => {
  const fake = await openMysteryGift({}, [{ name: "member.pcd", bytes: fakeCardFile("pcd-3") }]);
  const insertFile = vi.spyOn(fake.engine.mysteryGift, "insertFile");

  fireEvent.click(screen.getByRole("button", { name: "From a file" }));
  const dialog = await screen.findByRole("alertdialog");
  expect(within(dialog).getByRole("heading", { name: "Member Card" })).toBeTruthy();
  fireEvent.click(within(dialog).getByRole("button", { name: "Review" }));
  await screen.findByRole("article");
  await addCard();

  expect(insertFile).toHaveBeenCalledWith(fakeCardFile("pcd-3"), 0);
  await waitFor(() => expect(shownCards()).toEqual(["Member Card"]));
});

it("says a card file matches no known event", async () => {
  await openMysteryGift({}, [{ name: "mine.pgf", bytes: fakeCardFile("unknown:Homemade") }]);

  fireEvent.click(screen.getByRole("button", { name: "From a file" }));

  const dialog = await screen.findByRole("alertdialog");
  expect(within(dialog).getByText("Not a known event")).toBeTruthy();
});

it("says when a file isn't a Wonder Card", async () => {
  await openMysteryGift({}, [{ name: "pokemon.pk4", bytes: new Uint8Array([1, 2]) }]);

  fireEvent.click(screen.getByRole("button", { name: "From a file" }));

  expect(await screen.findByRole("status")).toBeTruthy();
  expect(screen.queryByRole("alertdialog")).toBeNull();
});

it("says when the delivery queue is full", async () => {
  await openMysteryGift({ queueFull: true });

  await review("Member Card");
  fireEvent.click(screen.getByRole("button", { name: "Add card" }));

  expect(await screen.findByRole("status")).toBeTruthy();
  expect(screen.getByRole("article")).toBeTruthy();
});

it("doesn't add the card twice when unlocking fails and the player tries again", async () => {
  const fake = await openMysteryGift({ unlocked: false });
  const insertEvent = vi.spyOn(fake.engine.mysteryGift, "insertEvent");
  vi.spyOn(fake.engine.mysteryGift, "setUnlocked").mockRejectedValueOnce(new Error("Couldn't unlock"));

  await review("Member Card");
  fireEvent.click(screen.getByRole("button", { name: "Add card" }));
  await screen.findByRole("status");
  await addCard();

  expect(insertEvent).toHaveBeenCalledTimes(1);
  expect((await fake.engine.mysteryGift.status()).unlocked).toBe(true);
  await waitFor(() => expect(shownCards()).toEqual(["Member Card"]));
});

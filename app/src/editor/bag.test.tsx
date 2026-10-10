import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EngineProvider } from "@pkhex-everywhere/react";
import type { Pouch } from "@pkhex-everywhere/engine";
import { afterEach, expect, it, vi } from "vitest";
import { EditorScreen } from "./EditorScreen";
import { fakeEngine } from "./fakeEngine";
import { saveHome } from "./saveHome";
import { FakeGameArt, gameWithArt } from "@/game-art/fakeGameArt";

afterEach(cleanup);

const png = new Uint8Array([1]);

const owned = (id: number, name: string, count: number, maxCount = 99) => ({ id, index: id, name, count, maxCount, isUnknown: false });

const bag: Pouch[] = [
  { name: "Balls", items: [owned(4, "Poké Ball", 3)], addable: [{ id: 1, index: 1, name: "Master Ball", maxCount: 99 }] },
  {
    name: "Items",
    items: [owned(50, "Yellow Shard", 5)],
    addable: [
      { id: 13, index: 13, name: "Potion", maxCount: 99 },
      { id: 17, index: 17, name: "Antidote", maxCount: 99 },
    ],
  },
  { name: "KeyItems", items: [], addable: [{ id: 259, index: 259, name: "Bicycle", maxCount: 1 }] },
  { name: "Berries", items: [owned(149, "Cheri Berry", 2)], addable: [] },
];

async function openBag(art = gameWithArt({ "item-1": png }), inventory = bag) {
  const { engine } = fakeEngine({ inventory });
  const host = { read: async () => new Uint8Array([1]), apply: async () => {}, playTimeSinceSave: async () => 0 };
  render(
    <EngineProvider engine={engine}>
      <FakeGameArt art={art}>
        <EditorScreen host={host} home={saveHome} onBackGesture={() => () => {}} onClose={() => {}} onSaveFirst={() => {}} />
      </FakeGameArt>
    </EngineProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Bag" }));
  await screen.findByRole("heading", { name: "Bag" });
  return engine;
}

const quantity = (name: string) => screen.findByRole<HTMLInputElement>("spinbutton", { name });

async function setQuantity(name: string, value: string) {
  const input = await quantity(name);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

async function countOf(engine: ReturnType<typeof fakeEngine>["engine"], name: string) {
  const pouches = await engine.inventory.get();
  return pouches.flatMap((pouch) => pouch.items).find((item) => item.name === name)?.count;
}

it("opens on the Items pocket with each item's quantity", async () => {
  await openBag();

  expect((await quantity("Yellow Shard")).value).toBe("5");
  expect(screen.queryByRole("spinbutton", { name: "Poké Ball" })).toBeNull();
});

it("shows each item's icon", async () => {
  await openBag(gameWithArt({ "item-50": png }));

  const row = (await quantity("Yellow Shard")).closest("li")!;

  await waitFor(() => expect(row.querySelector("img")?.src).toMatch(/^data:image\/png/));
});

it("shows the icon of the index a hack save stores for an item", async () => {
  const pouch = { name: "Items", items: [{ ...owned(50, "Yellow Shard", 5), index: 600 }], addable: [] };
  await openBag(gameWithArt({ "item-600": png }), [pouch]);

  const row = (await quantity("Yellow Shard")).closest("li")!;

  await waitFor(() => expect(row.querySelector("img")?.src).toMatch(/^data:image\/png/));
});

it("shows a placeholder for an item the game has no icon for", async () => {
  await openBag(gameWithArt({ "item-4": png }));

  const row = (await quantity("Yellow Shard")).closest("li")!;

  await waitFor(() => expect(row.textContent).toBe("Yellow ShardYellow Shard"));
  expect(row.querySelector("img")).toBeNull();
});

it("shows no icons in a game without item icons", async () => {
  await openBag(gameWithArt({ "sprite-1-0": png }));
  const row = (await quantity("Yellow Shard")).closest("li")!;

  await new Promise((resolve) => setTimeout(resolve, 20));

  expect(row.firstElementChild?.tagName).toBe("LABEL");
});

it("switches pockets", async () => {
  await openBag();

  fireEvent.click(await screen.findByRole("radio", { name: "Balls" }));
  expect((await quantity("Poké Ball")).value).toBe("3");

  fireEvent.click(screen.getByRole("radio", { name: "Key items" }));
  expect(await screen.findByText(/pocket is empty/i)).toBeTruthy();
});

it("changes a quantity", async () => {
  const engine = await openBag();

  await setQuantity("Yellow Shard", "42");

  await waitFor(async () => expect(await countOf(engine, "Yellow Shard")).toBe(42));
  expect(await screen.findByRole("button", { name: "Apply and restart" })).toBeTruthy();
  expect((await quantity("Yellow Shard")).value).toBe("42");
});

it("keeps a quantity within what the pocket holds", async () => {
  const engine = await openBag();

  await setQuantity("Yellow Shard", "500");

  await waitFor(async () => expect(await countOf(engine, "Yellow Shard")).toBe(99));
  expect((await quantity("Yellow Shard")).value).toBe("99");
});

it("removes an item set to 0", async () => {
  const engine = await openBag();

  await setQuantity("Yellow Shard", "0");

  await waitFor(() => expect(screen.queryByRole("spinbutton", { name: "Yellow Shard" })).toBeNull());
  expect(await countOf(engine, "Yellow Shard")).toBeUndefined();
});

it("puts the quantity back when it isn't a number", async () => {
  const engine = await openBag();

  await setQuantity("Yellow Shard", "");

  expect((await quantity("Yellow Shard")).value).toBe("5");
  expect(await countOf(engine, "Yellow Shard")).toBe(5);
});

it("adds an item the pocket can hold", async () => {
  const engine = await openBag();

  fireEvent.click(await screen.findByRole("button", { name: "Add item" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "pot" } });
  expect(within(dialog).queryByRole("button", { name: "Antidote" })).toBeNull();
  fireEvent.click(within(dialog).getByRole("button", { name: "Potion" }));

  expect((await quantity("Potion")).value).toBe("1");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(await countOf(engine, "Potion")).toBe(1);
});

it("puts Add item above the item list", async () => {
  await openBag();

  const add = await screen.findByRole("button", { name: "Add item" });
  const list = (await quantity("Yellow Shard")).closest("ul")!;

  expect(add.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it("hides Add item in a pocket with nothing to add", async () => {
  await openBag();

  fireEvent.click(await screen.findByRole("radio", { name: "Berries" }));

  expect((await quantity("Cheri Berry")).value).toBe("2");
  expect(screen.queryByRole("button", { name: "Add item" })).toBeNull();
});

it("says why a change didn't go through and puts the quantity back", async () => {
  const engine = await openBag();
  vi.spyOn(engine.inventory, "setItem").mockRejectedValue("the pocket is full");

  await setQuantity("Yellow Shard", "42");

  expect(await screen.findByText(/the pocket is full/)).toBeTruthy();
  expect((await quantity("Yellow Shard")).value).toBe("5");
});

it("puts a Gen 4 bag's pockets in the game's order", async () => {
  const pocket = (name: string): Pouch => ({ name, items: [], addable: [] });
  await openBag(
    undefined,
    ["Balls", "BattleItems", "Berries", "Items", "KeyItems", "MailItems", "Medicine", "TMHMs"].map(pocket),
  );

  const pockets = (await screen.findAllByRole("radio")).map((radio) => radio.textContent);

  expect(pockets).toEqual(["Items", "Medicine", "Balls", "TMs & HMs", "Berries", "Mail", "Battle items", "Key items"]);
});

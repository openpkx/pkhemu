import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { fakeGameArt } from "./fakeGameArt";
import { GameArtFor, GameArtProvider, ItemArt, PokemonArt, summaryArt, type ArtPokemon } from "./gameArt";
import type { PokemonId, PokemonSummary } from "@pkhex-everywhere/engine";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const sha1 = "a".repeat(40);
const png = (byte: number) => new Uint8Array([byte]);
const dataUrl = (byte: number) => `data:image/png;base64,${btoa(String.fromCharCode(byte))}`;
const pikachu: ArtPokemon = { speciesId: 25, species: "Pikachu" };

function show(art: ReturnType<typeof fakeGameArt>, children: ReactNode) {
  return render(
    <GameArtProvider host={art.host}>
      <GameArtFor path="game.gba">{children}</GameArtFor>
    </GameArtProvider>,
  );
}

const image = () => screen.findByRole<HTMLImageElement>("img", { name: "Pikachu" });

it("shows the image for a key the manifest lists", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: { "sprite-25-0": png(1) } } });

  show(art, <PokemonArt pokemon={pikachu} size={16} />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(1)));
});

it("shows a placeholder for a key the manifest doesn't list", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: { "sprite-1-0": png(1) } } });

  show(art, <PokemonArt pokemon={pikachu} size={16} />);

  expect((await image()).tagName).not.toBe("IMG");
});

it("shows placeholders for a game with no art yet", async () => {
  show(fakeGameArt(), <PokemonArt pokemon={pikachu} size={16} />);

  expect((await image()).tagName).not.toBe("IMG");
});

it("swaps the placeholder for the image when the game's art changes", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: {} } });
  show(art, <PokemonArt pokemon={pikachu} size={16} />);
  expect((await image()).tagName).not.toBe("IMG");

  art.art[sha1]["sprite-25-0"] = png(1);
  act(() => art.change(sha1));

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(1)));
});

it("finds the game once its ROM is hashed", async () => {
  const art = fakeGameArt({ art: { [sha1]: { "sprite-25-0": png(1) } } });
  show(art, <PokemonArt pokemon={pikachu} size={16} />);
  expect((await image()).tagName).not.toBe("IMG");

  art.games["game.gba"] = sha1;
  act(() => art.change(sha1));

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(1)));
});

it("uses the menu icon at 12 and below and the front sprite above", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: { "sprite-25-0": png(1), "icon-25-0": png(2) } } });

  show(
    art,
    <>
      <PokemonArt pokemon={{ ...pikachu, species: "Small" }} size={12} />
      <PokemonArt pokemon={{ ...pikachu, species: "Large" }} size={14} />
    </>,
  );

  await waitFor(() => expect(screen.getByRole("img", { name: "Small" }).getAttribute("src")).toBe(dataUrl(2)));
  await waitFor(() => expect(screen.getByRole("img", { name: "Large" }).getAttribute("src")).toBe(dataUrl(1)));
});

it("falls back to whichever of the menu icon and front sprite exists", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: { "sprite-25-0": png(1), "icon-1-0": png(2) } } });

  show(
    art,
    <>
      <PokemonArt pokemon={{ ...pikachu, species: "Small" }} size={8} />
      <PokemonArt pokemon={{ speciesId: 1, species: "Large" }} size={40} />
    </>,
  );

  await waitFor(() => expect(screen.getByRole("img", { name: "Small" }).getAttribute("src")).toBe(dataUrl(1)));
  await waitFor(() => expect(screen.getByRole("img", { name: "Large" }).getAttribute("src")).toBe(dataUrl(2)));
});

it("uses form 0's menu icon when the form has none of its own", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: { "icon-664-0": png(1) } } });

  show(art, <PokemonArt pokemon={{ speciesId: 664, form: 7, species: "Scatterbug" }} size={12} />);

  await waitFor(async () =>
    expect((await screen.findByRole("img", { name: "Scatterbug" })).getAttribute("src")).toBe(dataUrl(1)),
  );
});

it("uses a form's own menu icon over form 0's", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: { "icon-666-0": png(1), "icon-666-7": png(2) } } });

  show(art, <PokemonArt pokemon={{ speciesId: 666, form: 7, species: "Vivillon" }} size={12} />);

  await waitFor(async () =>
    expect((await screen.findByRole("img", { name: "Vivillon" })).getAttribute("src")).toBe(dataUrl(2)),
  );
});

function reducedMotion(reduce: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: reduce,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  };
  vi.stubGlobal("matchMedia", (media: string) =>
    media === "(prefers-reduced-motion: reduce)" ? query : { matches: false, addEventListener() {}, removeEventListener() {} },
  );
  return (next: boolean) => {
    query.matches = next;
    listeners.forEach((listener) => listener());
  };
}

const animated = { "sprite-25-0": png(1), "anim-25-0": png(2), "icon-25-0": png(3) };

it("plays the animated sprite when asked to animate", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: animated } });

  show(art, <PokemonArt pokemon={pikachu} size={40} animate />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(2)));
});

it("shows the shiny still rather than an animation in other colors", async () => {
  const art = fakeGameArt({
    games: { "game.gba": sha1 },
    art: { [sha1]: { ...animated, "sprite-25-0-shiny": png(4) } },
  });

  show(art, <PokemonArt pokemon={{ ...pikachu, isShiny: true }} size={40} animate />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(4)));
});

it("shows the still sprite when the OS asks for reduced motion", async () => {
  const reduce = reducedMotion(true);
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: animated } });

  show(art, <PokemonArt pokemon={pikachu} size={40} animate />);
  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(1)));

  act(() => reduce(false));
  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(2)));

  act(() => reduce(true));
  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(1)));
});

it("shows the still sprite unless asked to animate", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: animated } });

  show(art, <PokemonArt pokemon={pikachu} size={40} />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(1)));
});

it("never animates the menu icon", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: animated } });

  show(art, <PokemonArt pokemon={pikachu} size={12} animate />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(3)));
});

it("shows the form and shiny sprite", async () => {
  const art = fakeGameArt({
    games: { "game.gba": sha1 },
    art: { [sha1]: { "sprite-25-0": png(1), "sprite-25-2-shiny": png(2) } },
  });

  show(art, <PokemonArt pokemon={{ ...pikachu, form: 2, isShiny: true }} size={16} />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(2)));
});

it("shows the female sprite for a female Pokémon", async () => {
  const art = fakeGameArt({
    games: { "game.gba": sha1 },
    art: { [sha1]: { "sprite-25-0": png(1), "sprite-25-0-female": png(2) } },
  });

  show(art, <PokemonArt pokemon={{ ...pikachu, gender: "female" }} size={16} />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(2)));
});

it("falls back to the normal sprite when the ROM has no female one", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: { "sprite-25-0-shiny": png(1) } } });

  show(art, <PokemonArt pokemon={{ ...pikachu, gender: "female", isShiny: true }} size={16} />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(1)));
});

it("falls back to the normal sprite when the ROM has no shiny one", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: { "sprite-25-0": png(1), "icon-25-0": png(2) } } });

  show(art, <PokemonArt pokemon={{ ...pikachu, isShiny: true }} size={16} />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(1)));
});

it("shows the egg sprite for an egg", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: { "sprite-25-0": png(1), egg: png(2) } } });

  show(art, <PokemonArt pokemon={{ ...pikachu, isEgg: true }} size={16} />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(2)));
});

it("shows a placeholder for a species the engine doesn't know", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: { "sprite-25-0": png(1) } } });

  show(art, <PokemonArt pokemon={{ ...pikachu, isUnknown: true }} size={16} />);

  expect((await image()).tagName).not.toBe("IMG");
});

const shadowWarrior: PokemonSummary = {
  id: "shadow-warrior" as PokemonId,
  at: { source: "box", box: 22, slot: 18 },
  speciesId: 0xf000 + 706,
  speciesIndex: 706,
  species: "Shadow Warrior",
  isUnknown: false,
  editable: true,
  form: { id: 0, name: "" },
  nickname: "Shadow Warrior",
  level: 50,
  isShiny: false,
  gender: "male",
  isEgg: false,
  types: [],
};

it("shows a hack-only species' art by its species index", async () => {
  const art = fakeGameArt({
    games: { "game.gba": sha1 },
    art: { [sha1]: { "sprite-index-706": png(1), "sprite-index-706-shiny": png(2), "icon-index-706": png(3) } },
  });

  show(
    art,
    <>
      <PokemonArt pokemon={summaryArt(shadowWarrior)} size={16} />
      <PokemonArt pokemon={summaryArt({ ...shadowWarrior, species: "Shiny", isShiny: true })} size={16} />
      <PokemonArt pokemon={summaryArt({ ...shadowWarrior, species: "Small" })} size={8} />
    </>,
  );

  await waitFor(() => expect(screen.getByRole("img", { name: "Shadow Warrior" }).getAttribute("src")).toBe(dataUrl(1)));
  await waitFor(() => expect(screen.getByRole("img", { name: "Shiny" }).getAttribute("src")).toBe(dataUrl(2)));
  await waitFor(() => expect(screen.getByRole("img", { name: "Small" }).getAttribute("src")).toBe(dataUrl(3)));
});

it("shows a summary's female and egg sprites", async () => {
  const art = fakeGameArt({
    games: { "game.gba": sha1 },
    art: { [sha1]: { "sprite-25-0": png(1), "sprite-25-0-female": png(2), egg: png(3) } },
  });
  const summary = { ...shadowWarrior, speciesId: 25, speciesIndex: 84 };

  show(
    art,
    <>
      <PokemonArt pokemon={summaryArt({ ...summary, species: "Female", gender: "female" })} size={16} />
      <PokemonArt pokemon={summaryArt({ ...summary, species: "Egg", isEgg: true })} size={16} />
    </>,
  );

  await waitFor(() => expect(screen.getByRole("img", { name: "Female" }).getAttribute("src")).toBe(dataUrl(2)));
  await waitFor(() => expect(screen.getByRole("img", { name: "Egg" }).getAttribute("src")).toBe(dataUrl(3)));
});

it("gives the art a summary's types to tint its placeholder by", () => {
  expect(summaryArt({ ...shadowWarrior, types: [9, 3] }).types).toEqual([9, 3]);
});

it("prefers the species index over the species and form", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: { "sprite-19-0": png(1), "sprite-index-1020": png(2) } } });

  show(art, <PokemonArt pokemon={{ speciesId: 19, speciesIndex: 1020, species: "Pikachu", form: 1 }} size={16} />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(2)));
});

it("shows an unknown species' art by its species index", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: { "sprite-index-412": png(1) } } });

  show(art, <PokemonArt pokemon={{ speciesId: null, speciesIndex: 412, species: "Pikachu", isUnknown: true }} size={16} />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(1)));
});

it("shows a hack-only species' placeholder with its name and no dex number", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: { "sprite-25-0": png(1) } } });

  show(art, <PokemonArt pokemon={summaryArt(shadowWarrior)} size={16} />);

  const placeholder = await screen.findByRole("img", { name: "Shadow Warrior" });
  expect(placeholder.tagName).not.toBe("IMG");
  expect(placeholder.textContent).toBe("Shadow Warrior");
});

it("shows an item's icon", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: { "item-4": png(1) } } });

  show(art, <ItemArt item={{ index: 4, name: "Poké Ball" }} size={8} />);

  await waitFor(async () => expect((await screen.findByRole("img", { name: "Poké Ball" })).getAttribute("src")).toBe(dataUrl(1)));
});

it("keys an item's icon by the index its save stores, even for an item PKHeX has no id for", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: { "item-4": png(1), "item-600": png(2) } } });
  const hackItem = { id: 4, index: 600, name: "Shadow Plate", isUnknown: true };

  show(art, <ItemArt item={hackItem} size={8} />);

  await waitFor(async () => expect((await screen.findByRole("img", { name: "Shadow Plate" })).getAttribute("src")).toBe(dataUrl(2)));
});

it("shows a placeholder for an item with no icon in a game with item icons", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: { "item-4": png(1) } } });

  show(art, <ItemArt item={{ index: 5, name: "Safari Ball" }} size={8} />);

  expect((await screen.findByRole("img", { name: "Safari Ball" })).tagName).not.toBe("IMG");
});

it("shows no item icon in a game without item icons", async () => {
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: { "sprite-25-0": png(1) } } });

  show(
    art,
    <>
      <ItemArt item={{ index: 4, name: "Poké Ball" }} size={8} />
      <PokemonArt pokemon={pikachu} size={16} />
    </>,
  );

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(1)));
  expect(screen.queryByRole("img", { name: "Poké Ball" })).toBeNull();
});

it("loads art without network requests", async () => {
  const fetch = vi.fn(async () => new Response());
  vi.stubGlobal("fetch", fetch);
  const art = fakeGameArt({ games: { "game.gba": sha1 }, art: { [sha1]: { "item-4": png(1) } } });

  show(
    art,
    <>
      <PokemonArt pokemon={pikachu} size={8} />
      <PokemonArt pokemon={pikachu} size={40} />
      <ItemArt item={{ index: 5, name: "Safari Ball" }} size={8} />
    </>,
  );

  await screen.findByRole("img", { name: "Safari Ball" });
  expect(fetch).not.toHaveBeenCalled();
});

const stadium = "5".repeat(40);
const black = "b".repeat(40);
const red = "1".repeat(40);
const fireRed = "3".repeat(40);
const emerald = "e".repeat(40);

function showStadium(art: ReturnType<typeof fakeGameArt>, children: ReactNode) {
  return render(
    <GameArtProvider host={art.host}>
      <GameArtFor path="stadium.z64">{children}</GameArtFor>
    </GameArtProvider>,
  );
}

const library = (
  lenders: { sha1: string; generation: number; art: Record<string, Uint8Array> }[],
  rest: Parameters<typeof fakeGameArt>[0] = {},
) =>
  fakeGameArt({
    games: { "stadium.z64": stadium, ...rest.games },
    statuses: { "stadium.z64": "unsupported", ...rest.statuses },
    art: { [stadium]: {}, ...Object.fromEntries(lenders.map(({ sha1, art }) => [sha1, art])), ...rest.art },
    lenders: lenders.map(({ sha1, generation }) => ({ sha1, generation })),
  });

it("borrows art from the newest generation in the library when the game's ROM gives none", async () => {
  const art = library([
    { sha1: red, generation: 1, art: { "sprite-25-0": png(1) } },
    { sha1: black, generation: 5, art: { "sprite-25-0": png(5) } },
  ]);

  showStadium(art, <PokemonArt pokemon={pikachu} size={16} />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(5)));
});

it("borrows from an older generation for a Pokémon the newer ROMs lack", async () => {
  const art = library([
    { sha1: black, generation: 5, art: { "sprite-1-0": png(5) } },
    { sha1: red, generation: 1, art: { "sprite-25-0": png(1) } },
  ]);

  showStadium(art, <PokemonArt pokemon={pikachu} size={16} />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(1)));
});

it("borrows the chosen ROM's shiny sprite for a shiny", async () => {
  const art = library([
    { sha1: black, generation: 5, art: { "sprite-25-0": png(5), "sprite-25-0-shiny": png(6) } },
    { sha1: red, generation: 1, art: { "sprite-25-0": png(1) } },
  ]);

  showStadium(art, <PokemonArt pokemon={{ ...pikachu, isShiny: true }} size={16} />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(6)));
});

it("borrows the shiny sprite from whichever ROM of the generation has it", async () => {
  const art = library([
    { sha1: fireRed, generation: 3, art: { "sprite-25-0": png(1) } },
    { sha1: emerald, generation: 3, art: { "sprite-25-0": png(2), "sprite-25-0-shiny": png(3) } },
  ]);

  showStadium(art, <PokemonArt pokemon={{ ...pikachu, isShiny: true }} size={16} />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(3)));
});

it("borrows an older generation's sprite over a newer one's menu icon above icon size", async () => {
  const art = library([
    { sha1: black, generation: 5, art: { "icon-25-0": png(5) } },
    { sha1: red, generation: 1, art: { "sprite-25-0": png(1) } },
  ]);

  showStadium(art, <PokemonArt pokemon={pikachu} size={16} />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(1)));
});

it("borrows from a ROM with an animated sprite within a generation when animating", async () => {
  const art = library([
    { sha1: fireRed, generation: 3, art: { "sprite-25-0": png(1) } },
    { sha1: emerald, generation: 3, art: { "sprite-25-0": png(2), "anim-25-0": png(3) } },
  ]);

  showStadium(art, <PokemonArt pokemon={pikachu} size={40} animate />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(3)));
});

it("shows a placeholder when only a ROM hack has the Pokémon", async () => {
  const hack = "c".repeat(40);
  const art = library([], { games: { "hack.gba": hack }, art: { [hack]: { "sprite-25-0": png(1) } } });

  showStadium(art, <PokemonArt pokemon={pikachu} size={16} />);

  expect((await image()).tagName).not.toBe("IMG");
});

it("borrows once the library's ROM gives its art", async () => {
  const art = library([{ sha1: black, generation: 5, art: {} }]);
  showStadium(art, <PokemonArt pokemon={pikachu} size={16} />);
  expect((await image()).tagName).not.toBe("IMG");

  art.art[black]["sprite-25-0"] = png(5);
  act(() => art.change(black));

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(5)));
});

it("never borrows for a game whose ROM gives its own art", async () => {
  const art = library([{ sha1: black, generation: 5, art: { "sprite-25-0": png(5), "sprite-1-0": png(5) } }], {
    games: { "game.gba": sha1 },
    statuses: { "game.gba": "done" },
    art: { [sha1]: { "sprite-25-0": png(3) } },
  });

  show(
    art,
    <>
      <PokemonArt pokemon={pikachu} size={16} />
      <PokemonArt pokemon={{ speciesId: 1, species: "Bulbasaur" }} size={16} />
    </>,
  );

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(3)));
  expect(screen.getByRole("img", { name: "Bulbasaur" }).tagName).not.toBe("IMG");
});

function showX(art: ReturnType<typeof fakeGameArt>, children: ReactNode) {
  return render(
    <GameArtProvider host={art.host}>
      <GameArtFor path="3ds/X.cxi">{children}</GameArtFor>
    </GameArtProvider>,
  );
}

const x = "6".repeat(40);
const froakie: ArtPokemon = { speciesId: 650, species: "Froakie" };

const withX = () =>
  library(
    [
      { sha1: x, generation: 6, art: { "icon-25-0": png(6), "icon-650-0": png(7) } },
      { sha1: black, generation: 5, art: { "sprite-25-0": png(5), "icon-25-0": png(4) } },
    ],
    { games: { "3ds/X.cxi": x }, statuses: { "3ds/X.cxi": "done" } },
  );

it("borrows a sprite for each Pokémon a 3DS game has none for above icon size", async () => {
  showX(
    withX(),
    <>
      <PokemonArt pokemon={pikachu} size={40} />
      <PokemonArt pokemon={froakie} size={40} />
    </>,
  );

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(5)));
  await waitFor(() => expect(screen.getByRole("img", { name: "Froakie" }).getAttribute("src")).toBe(dataUrl(7)));
});

it("shows a 3DS game's own icon over a lent one at icon size", async () => {
  showX(withX(), <PokemonArt pokemon={pikachu} size={8} />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(6)));
});

it("borrows an older generation's form icon over a newer one's form 0 icon", async () => {
  const art = library([
    { sha1: x, generation: 6, art: { "icon-25-3": png(6) } },
    { sha1: "7".repeat(40), generation: 7, art: { "icon-25-0": png(7) } },
  ]);

  showStadium(art, <PokemonArt pokemon={{ ...pikachu, form: 3 }} size={8} />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(6)));
});

it("borrows a form's own icon over a 3DS game's form 0 icon", async () => {
  const art = library(
    [
      { sha1: x, generation: 6, art: { "icon-25-0": png(6) } },
      { sha1: black, generation: 5, art: { "icon-25-3": png(5) } },
    ],
    { games: { "3ds/X.cxi": x }, statuses: { "3ds/X.cxi": "done" } },
  );

  showX(art, <PokemonArt pokemon={{ ...pikachu, form: 3 }} size={8} />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(5)));
});

it("shows a 3DS game's own form 0 icon when no lent game has the form's icon", async () => {
  showX(withX(), <PokemonArt pokemon={{ ...pikachu, form: 3 }} size={8} />);

  await waitFor(async () => expect((await image()).getAttribute("src")).toBe(dataUrl(6)));
});

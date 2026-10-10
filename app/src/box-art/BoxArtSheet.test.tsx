import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BackProvider } from "@/back/back";
import { GamesFolderProvider, type GamesFolderHost } from "@/games-folder/gamesFolder";
import type { Game } from "@/library/scan";
import { BoxArtProvider } from "./boxArt";
import { BoxArtSheet } from "./BoxArtSheet";
import { fakeBoxArt } from "./fakeBoxArt";

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const gamesFolder: GamesFolderHost = {
  pickFolder: async () => "/games",
  ensureFolder: async () => {},
  folderExists: async () => true,
  loadSaved: async () => "/games",
  save: async () => {},
  label: (folder) => folder,
};

const emerald: Game = { system: "gba", name: "Pokemon Emerald", path: "gba/Pokemon Emerald.gba" };

function renderSheet(boxArt = fakeBoxArt()) {
  const onChanged = vi.fn();
  const onClose = vi.fn();
  render(
    <GamesFolderProvider host={gamesFolder}>
      <BoxArtProvider host={boxArt.host}>
        <BackProvider>
          <BoxArtSheet open game={emerald} onClose={onClose} onChanged={onChanged} />
        </BackProvider>
      </BoxArtProvider>
    </GamesFolderProvider>,
  );
  return { onChanged, onClose };
}

const ready = () => screen.findByRole("button", { name: /No box art|Use default/ });

it("offers Use default only when the game has chosen box art", async () => {
  renderSheet();
  expect(await screen.findByRole("button", { name: /No box art/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Use default/ })).toBeNull();
  cleanup();

  const boxArt = fakeBoxArt();
  boxArt.choose(emerald.path, { kind: "none" });
  renderSheet(boxArt);
  expect(await screen.findByRole("button", { name: /Use default/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /No box art/ })).toBeNull();
});

it("uses the default box art again", async () => {
  const boxArt = fakeBoxArt();
  boxArt.choose(emerald.path, { kind: "none" });
  const chooseDefault = vi.spyOn(boxArt.host, "chooseDefault");
  const { onChanged } = renderSheet(boxArt);

  fireEvent.click(await screen.findByRole("button", { name: /Use default/ }));

  await waitFor(() => expect(onChanged).toHaveBeenCalled());
  expect(chooseDefault).toHaveBeenCalledWith("/games", emerald.path);
});

it("ranks the system's box art by the game's name", async () => {
  const png = new Uint8Array([137, 80, 78, 71]);
  renderSheet(
    fakeBoxArt({
      "Nintendo - Game Boy Advance/Named_Boxarts/Pokemon - Ruby Version (USA).png": png,
      "Nintendo - Game Boy Advance/Named_Boxarts/Pokemon - Emerald Version (USA, Europe).png": png,
      "Nintendo - Game Boy Advance/Named_Boxarts/Pokemon - Emerald Version (Japan).png": png,
    }),
  );

  await screen.findByRole("button", { name: /Emerald Version \(USA/ });
  const results = screen.getAllByRole("button", { name: /^Pokemon - / }).map((button) => button.getAttribute("aria-label"));
  expect(results).toEqual(["Pokemon - Emerald Version (USA, Europe)", "Pokemon - Emerald Version (Japan)"]);

  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "ruby" } });

  expect(screen.getAllByRole("button", { name: /^Pokemon - / }).map((button) => button.getAttribute("aria-label"))).toEqual([
    "Pokemon - Ruby Version (USA)",
  ]);
});

it("keeps the sheet open with the reason when a link can't be used", async () => {
  const boxArt = fakeBoxArt();
  boxArt.network.online = false;
  const { onChanged } = renderSheet(boxArt);
  await ready();

  fireEvent.click(screen.getByRole("button", { name: /From URL/ }));
  fireEvent.change(screen.getByRole("textbox", { name: "Image URL" }), { target: { value: "https://example.com/emerald.png" } });
  fireEvent.click(screen.getByRole("button", { name: "Use" }));

  expect((await screen.findByRole("alert")).textContent).toBe("Couldn't download that link");
  expect(screen.getByRole("textbox", { name: "Image URL" }).getAttribute("aria-invalid")).toBe("true");
  expect(onChanged).not.toHaveBeenCalled();
});

it("asks for the internet to browse box art, and still takes an image", async () => {
  const boxArt = fakeBoxArt();
  boxArt.network.online = false;
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  boxArt.picker.image = new Uint8Array([137, 80, 78, 71]);
  const { onChanged } = renderSheet(boxArt);

  expect(await screen.findByText("Connect to the internet to browse box art")).toBeTruthy();
  await ready();
  fireEvent.click(screen.getByRole("button", { name: /Choose image/ }));

  await waitFor(() => expect(onChanged).toHaveBeenCalled());
});

it("stays open when the picker closes without an image", async () => {
  const boxArt = fakeBoxArt();
  const choose = vi.spyOn(boxArt.host, "chooseFile");
  const { onChanged, onClose } = renderSheet(boxArt);
  await ready();

  fireEvent.click(screen.getByRole("button", { name: /Choose image/ }));

  await waitFor(() => expect(choose).toHaveBeenCalledWith("/games", emerald.path));
  await waitFor(() => expect(screen.getByRole("button", { name: /Choose image/ }).hasAttribute("disabled")).toBe(false));
  expect(onChanged).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

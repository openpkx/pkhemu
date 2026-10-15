import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BackProvider } from "@/back/back";
import type { Game } from "@/library/scan";
import type { PatchedFrom } from "@/preferences/gameSettings";
import {
  PatchRomDialog,
  PatchRomProvider,
  type OpenedPatch,
  type PatchBases,
  type PatchDrops,
  type PatchFailure,
  type PatchRomHost,
  type PickedPatch,
} from "./patchRom";

afterEach(cleanup);

const fireRed: Game = { system: "gba", name: "Pokemon - FireRed Version (USA)", path: "gba/FireRed.gba" };
const radicalRed: PickedPatch = { file: "/patches/radical_red.ups", name: "radical_red.ups", format: "ups", baseChecked: true };

function fakeHost({
  picked = radicalRed as PickedPatch | null,
  taken = [] as string[],
  failure = undefined as PatchFailure | undefined,
  build = "FireRed EN 1.0" as string | null,
  bases = { checked: true, games: [] } as PatchBases,
} = {}) {
  const origins = new Map<string, PatchedFrom>();
  let finish = () => {};
  const drops = new Set<PatchDrops>();
  return {
    origins,
    finish: () => finish(),
    drops,
    host: {
      baseBuild: vi.fn(async () => build),
      pick: vi.fn(async () => picked),
      bases: vi.fn(async () => bases),
      dropped: vi.fn(async (file: string) => ({ file, name: file.slice(file.lastIndexOf("/") + 1), format: "ups" as const, baseChecked: true })),
      watchDrops: vi.fn((listener: PatchDrops) => {
        drops.add(listener);
        return () => void drops.delete(listener);
      }),
      checkName: vi.fn(async (_folder: string, _system: string, name: string) => {
        if (taken.includes(name)) throw { kind: "nameTaken" } satisfies PatchFailure;
      }),
      create: vi.fn(
        (_folder: string, _path: string, system: string, name: string) =>
          new Promise<{ path: string; sha256: string; baseChecked: boolean }>((resolve, reject) => {
            finish = () => (failure ? reject(failure) : resolve({ path: `${system}/${name}.${system}`, sha256: "c0ffee", baseChecked: true }));
          }),
      ),
      patchedFrom: vi.fn(async (path: string) => origins.get(path) ?? null),
      keepPatchedFrom: vi.fn(async (path: string, from: PatchedFrom) => void origins.set(path, from)),
    } satisfies PatchRomHost,
  };
}

async function launch(fake = fakeHost(), game = fireRed) {
  const props = { onClose: vi.fn(), onCreated: vi.fn() };
  const dialog = (open: boolean) => (
    <BackProvider>
      <PatchRomProvider host={fake.host}>
        <PatchRomDialog open={open} folder="/games" game={game} {...props} />
      </PatchRomProvider>
    </BackProvider>
  );
  const { rerender } = render(dialog(true));
  await act(async () => {});
  return { ...fake, ...props, close: () => rerender(dialog(false)) };
}

const emerald: Game = { system: "gba", name: "Emerald", path: "gba/Emerald.gba" };
const red: Game = { system: "gb", name: "Red", path: "gb/Red.gb" };
const unbound: OpenedPatch = { file: "/Inbox/Unbound.bps", name: "Unbound.bps", format: "bps", games: [emerald, fireRed, red] };

async function launchOpened(fake = fakeHost(), patch = unbound, onAddGame?: () => Promise<Game[]>) {
  const props = { onClose: vi.fn(), onCreated: vi.fn() };
  render(
    <BackProvider>
      <PatchRomProvider host={fake.host}>
        <PatchRomDialog open folder="/games" opened={patch} onAddGame={onAddGame} {...props} />
      </PatchRomProvider>
    </BackProvider>,
  );
  await act(async () => {});
  return { ...fake, ...props };
}

const base = () => screen.getByRole("combobox", { name: "Base ROM" });

async function baseOptions() {
  fireEvent.click(base());
  return within(await screen.findByRole("listbox")).getAllByRole("option");
}

async function drop(drops: Set<PatchDrops>, ...paths: string[]) {
  await act(async () => drops.forEach((listener) => listener.hover(true)));
  await act(async () => drops.forEach((listener) => listener.drop(paths)));
}

const dropping = () => document.querySelector("[data-dropping]");

const create = () => screen.getByRole<HTMLButtonElement>("button", { name: "Create" });
const nameField = () => screen.getByRole<HTMLInputElement>("textbox", { name: "Name" });

async function choosePatch() {
  fireEvent.click(screen.getByRole("button", { name: "Choose patch file" }));
  await act(async () => {});
}

async function createGame(finish: () => void) {
  fireEvent.click(create());
  await act(async () => {});
  await act(async () => finish());
}

it("shows the base game's build", async () => {
  await launch();

  expect(screen.getByText("FireRed EN 1.0")).toBeTruthy();
});

it("names the base by its title when the header doesn't say", async () => {
  await launch(fakeHost({ build: null }));

  expect(screen.getByText("Pokemon - FireRed Version")).toBeTruthy();
});

it("creates a new game named after the patch file and records where it came from", async () => {
  const { host, finish, origins, onCreated } = await launch();
  expect(create().disabled).toBe(true);

  await choosePatch();
  expect(nameField().value).toBe("radical_red");
  await waitFor(() => expect(create().disabled).toBe(false));
  await createGame(finish);

  expect(host.create).toHaveBeenCalledWith("/games", "gba/FireRed.gba", "gba", "radical_red", "/patches/radical_red.ups");
  expect(origins.get("gba/radical_red.gba")).toEqual({ build: "FireRed EN 1.0", patch: "radical_red.ups", sha256: "c0ffee" });
  expect(onCreated).toHaveBeenCalledWith({ system: "gba", name: "radical_red", path: "gba/radical_red.gba" });
});

it("creates the game under the name the player typed", async () => {
  const { host, finish, onCreated } = await launch();
  await choosePatch();

  fireEvent.change(nameField(), { target: { value: "Radical Red" } });
  await waitFor(() => expect(create().disabled).toBe(false));
  await createGame(finish);

  expect(host.create).toHaveBeenCalledWith("/games", "gba/FireRed.gba", "gba", "Radical Red", "/patches/radical_red.ups");
  expect(onCreated).toHaveBeenCalledWith({ system: "gba", name: "Radical Red", path: "gba/Radical Red.gba" });
});

it("ignores spaces around the name", async () => {
  const { host, finish, onCreated } = await launch();
  await choosePatch();

  fireEvent.change(nameField(), { target: { value: "Radical Red " } });
  await waitFor(() => expect(create().disabled).toBe(false));
  await createGame(finish);

  expect(host.checkName).toHaveBeenLastCalledWith("/games", "gba", "Radical Red");
  expect(onCreated).toHaveBeenCalledWith({ system: "gba", name: "Radical Red", path: "gba/Radical Red.gba" });
});

it("keeps Create disabled while the name is taken", async () => {
  await launch(fakeHost({ taken: ["radical_red"] }));
  await choosePatch();

  expect(nameField().getAttribute("aria-invalid")).toBe("true");
  expect(create().disabled).toBe(true);

  fireEvent.change(nameField(), { target: { value: "Radical Red" } });
  await waitFor(() => expect(create().disabled).toBe(false));
  expect(nameField().getAttribute("aria-invalid")).toBeNull();
});

it("lets an IPS patch through and says it can't be checked", async () => {
  await launch(fakeHost({ picked: { file: "/patches/hack.ips", name: "hack.ips", format: "ips", baseChecked: false } }));

  await choosePatch();

  expect(screen.getByText(/can't be checked/)).toBeTruthy();
  await waitFor(() => expect(create().disabled).toBe(false));
});

it("says an xdelta patch without checksums can't be checked", async () => {
  await launch(fakeHost({ picked: { file: "/patches/hack.xdelta", name: "hack.xdelta", format: "xdelta", baseChecked: false } }));

  await choosePatch();

  expect(screen.getByText(/can't be checked/)).toBeTruthy();
});

it("says nothing about checking an xdelta patch with checksums", async () => {
  await launch(fakeHost({ picked: { file: "/patches/hack.xdelta", name: "hack.xdelta", format: "xdelta", baseChecked: true } }));

  await choosePatch();

  expect(screen.queryByText(/can't be checked/)).toBeNull();
});

it("refuses a file that isn't a patch", async () => {
  await launch(fakeHost({ picked: { file: "/notes.txt", name: "notes.txt", format: null, baseChecked: false } }));

  await choosePatch();

  expect(screen.getByRole("alert")).toBeTruthy();
  expect(create().disabled).toBe(true);
});

it("shows the CRC32 a patch for another ROM expects", async () => {
  const { finish, onCreated } = await launch(fakeHost({ failure: { kind: "wrongBase", expectedCrc32: 0x1a2b3c4d } }));
  await choosePatch();
  await waitFor(() => expect(create().disabled).toBe(false));

  await createGame(finish);

  expect(screen.getByRole("alert").textContent).toContain("1A2B3C4D");
  expect(onCreated).not.toHaveBeenCalled();
});

it("says which system's cartridge a patch is too big for", async () => {
  const { finish } = await launch(fakeHost({ failure: { kind: "tooBig" } }));
  await choosePatch();
  await waitFor(() => expect(create().disabled).toBe(false));

  await createGame(finish);

  expect(screen.getByRole("alert").textContent).toContain("Game Boy Advance");
});

it("can't be dismissed while it patches", async () => {
  const { finish, onClose } = await launch();
  await choosePatch();
  await waitFor(() => expect(create().disabled).toBe(false));

  fireEvent.click(create());
  await act(async () => {});

  expect(create().disabled).toBe(true);
  expect(create().getAttribute("aria-busy")).toBe("true");
  expect(create().querySelector("svg")).toBeTruthy();
  expect(screen.getByRole<HTMLButtonElement>("button", { name: "Cancel" }).disabled).toBe(true);
  fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => finish());
});

it("does nothing when the player cancels the file picker", async () => {
  const { host } = await launch(fakeHost({ picked: null }));

  await choosePatch();

  expect(nameField().value).toBe("");
  expect(host.checkName).not.toHaveBeenCalled();
  expect(create().disabled).toBe(true);
});

it("takes a patch file dropped on the window", async () => {
  const { host, drops, finish } = await launch();

  await drop(drops, "/downloads/unbound.bps");

  expect(host.dropped).toHaveBeenCalledWith("/downloads/unbound.bps");
  expect(nameField().value).toBe("unbound");
  await waitFor(() => expect(create().disabled).toBe(false));
  await createGame(finish);
  expect(host.create).toHaveBeenCalledWith("/games", "gba/FireRed.gba", "gba", "unbound", "/downloads/unbound.bps");
});

it("takes the first of several dropped files", async () => {
  const { host, drops } = await launch();

  await drop(drops, "/downloads/unbound.bps", "/downloads/readme.txt");

  expect(host.dropped).toHaveBeenCalledTimes(1);
  expect(host.dropped).toHaveBeenCalledWith("/downloads/unbound.bps");
});

it("highlights while a file hovers over the window", async () => {
  const { drops } = await launch();
  expect(dropping()).toBeNull();

  await act(async () => drops.forEach((listener) => listener.hover(true)));
  expect(dropping()).toBeTruthy();

  await act(async () => drops.forEach((listener) => listener.hover(false)));
  expect(dropping()).toBeNull();
});

it("stops listening for drops once closed", async () => {
  const { drops, close } = await launch();
  expect(drops.size).toBe(1);

  close();

  expect(drops.size).toBe(0);
});

it("ignores drops while it patches, even before the window stops listening", async () => {
  const { host, drops, finish } = await launch();
  await choosePatch();
  await waitFor(() => expect(create().disabled).toBe(false));
  const stillListening = new Set(drops);
  fireEvent.click(create());
  await act(async () => {});

  await drop(stillListening, "/downloads/unbound.bps");

  expect(host.dropped).not.toHaveBeenCalled();
  expect(dropping()).toBeNull();
  await act(async () => finish());
});

it("preselects the only game an opened patch fits and creates the hack from it", async () => {
  const { host, finish, onCreated } = await launchOpened(fakeHost({ bases: { checked: true, games: ["gba/FireRed.gba"] } }));

  expect(host.bases).toHaveBeenCalledWith("/games", "/Inbox/Unbound.bps", ["gba/Emerald.gba", "gba/FireRed.gba", "gb/Red.gb"]);
  expect(base().textContent).toBe(fireRed.name);
  expect(screen.queryByText(/can't be checked/)).toBeNull();
  expect(nameField().value).toBe("Unbound");
  await waitFor(() => expect(create().disabled).toBe(false));
  await createGame(finish);

  expect(host.create).toHaveBeenCalledWith("/games", "gba/FireRed.gba", "gba", "Unbound", "/Inbox/Unbound.bps");
  expect(onCreated).toHaveBeenCalledWith({ system: "gba", name: "Unbound", path: "gba/Unbound.gba" });
});

it("lists only the games an opened patch fits and waits for the player to pick one", async () => {
  const { host, finish } = await launchOpened(fakeHost({ bases: { checked: true, games: ["gba/Emerald.gba", "gba/FireRed.gba"] } }));
  expect(create().disabled).toBe(true);

  const options = await baseOptions();
  expect(options.map((option) => option.textContent)).toEqual(["Emerald", fireRed.name]);
  fireEvent.click(options[0]);
  await waitFor(() => expect(create().disabled).toBe(false));
  await createGame(finish);

  expect(host.create).toHaveBeenCalledWith("/games", "gba/Emerald.gba", "gba", "Unbound", "/Inbox/Unbound.bps");
});

it("lists every game under the can't-be-checked note when an opened patch can't check its base", async () => {
  const brown: OpenedPatch = { file: "/Inbox/Brown.ips", name: "Brown.ips", format: "ips", games: [emerald, fireRed, red] };
  const { host } = await launchOpened(fakeHost({ bases: { checked: false, games: [emerald.path, fireRed.path, red.path] } }), brown);

  expect(screen.getByText(/can't be checked/)).toBeTruthy();
  expect(create().disabled).toBe(true);
  const options = await baseOptions();
  expect(options).toHaveLength(3);
  fireEvent.click(options[2]);

  await waitFor(() => expect(create().disabled).toBe(false));
  expect(host.checkName).toHaveBeenLastCalledWith("/games", "gb", "Brown");
});

it("checks the name again in the system of the base picked", async () => {
  const { host } = await launchOpened(fakeHost({ bases: { checked: false, games: [emerald.path, red.path] } }));

  fireEvent.click((await baseOptions())[0]);
  await waitFor(() => expect(host.checkName).toHaveBeenLastCalledWith("/games", "gba", "Unbound"));
  fireEvent.click((await baseOptions())[1]);

  await waitFor(() => expect(host.checkName).toHaveBeenLastCalledWith("/games", "gb", "Unbound"));
});

it("offers no base when no game fits an opened patch", async () => {
  await launchOpened(fakeHost({ bases: { checked: true, games: [] } }));

  expect(screen.queryByRole("combobox", { name: "Base ROM" })).toBeNull();
  expect(create().disabled).toBe(true);
});

it("names the build an opened patch needs when no game fits", async () => {
  await launchOpened(fakeHost({ bases: { checked: true, games: [], needs: { crc32: 0xdd88761c, build: "FireRed EN 1.0" } } }));

  expect(screen.getByText(/FireRed EN 1\.0/)).toBeTruthy();
  expect(screen.queryByText(/DD88761C/)).toBeNull();
});

it("shows the CRC32 an opened patch needs when the build is unknown", async () => {
  await launchOpened(fakeHost({ bases: { checked: true, games: [], needs: { crc32: 0x1a2b3c, build: null } } }));

  expect(screen.getByText(/001A2B3C/)).toBeTruthy();
});

it("adds a game and continues with it as the base when it fits the opened patch", async () => {
  const leafGreen: Game = { system: "gba", name: "LeafGreen", path: "gba/LeafGreen.gba" };
  const onAddGame = vi.fn(async () => [emerald, fireRed, leafGreen, red]);
  const { host } = await launchOpened(fakeHost({ bases: { checked: true, games: [], needs: { crc32: 0xd69c96cc, build: "LeafGreen EN 1.0" } } }), unbound, onAddGame);
  host.bases.mockResolvedValueOnce({ checked: true, games: [leafGreen.path] });

  fireEvent.click(screen.getByRole("button", { name: "Add game" }));

  await waitFor(() => expect(base().textContent).toBe("LeafGreen"));
  expect(host.bases).toHaveBeenLastCalledWith("/games", "/Inbox/Unbound.bps", [emerald.path, fireRed.path, leafGreen.path, red.path]);
  expect(nameField().value).toBe("Unbound");
  await waitFor(() => expect(create().disabled).toBe(false));
});

it("can't be closed while a game is being added", async () => {
  let finish = (_games: Game[]) => {};
  const onAddGame = () => new Promise<Game[]>((resolve) => (finish = resolve));
  const { onClose } = await launchOpened(fakeHost({ bases: { checked: true, games: [] } }), unbound, onAddGame);

  fireEvent.click(screen.getByRole("button", { name: "Add game" }));
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

  expect(onClose).not.toHaveBeenCalled();
  await act(async () => finish([emerald, fireRed, red]));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onClose).toHaveBeenCalled();
});

it("keeps waiting when the game added doesn't fit the opened patch", async () => {
  const onAddGame = vi.fn(async () => [emerald, fireRed, red]);
  await launchOpened(fakeHost({ bases: { checked: true, games: [], needs: { crc32: 0xd69c96cc, build: "LeafGreen EN 1.0" } } }), unbound, onAddGame);

  fireEvent.click(screen.getByRole("button", { name: "Add game" }));
  await act(async () => {});

  expect(screen.getByText(/LeafGreen EN 1\.0/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Add game" })).toBeTruthy();
});

it("doesn't swap an opened patch for one dropped on the window", async () => {
  const { host, drops } = await launchOpened();

  await drop(drops, "/downloads/radical_red.ups");

  expect(host.dropped).not.toHaveBeenCalled();
});

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BackProvider } from "@/back/back";
import type { Game } from "@/library/scan";
import type { PatchedFrom } from "@/preferences/gameSettings";
import { PatchRomDialog, PatchRomProvider, type PatchDrops, type PatchFailure, type PatchRomHost, type PickedPatch } from "./patchRom";

afterEach(cleanup);

const fireRed: Game = { system: "gba", name: "Pokemon - FireRed Version (USA)", path: "gba/FireRed.gba" };
const radicalRed: PickedPatch = { file: "/patches/radical_red.ups", name: "radical_red.ups", format: "ups" };

function fakeHost({
  picked = radicalRed as PickedPatch | null,
  taken = [] as string[],
  failure = undefined as PatchFailure | undefined,
  build = "FireRed EN 1.0" as string | null,
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
      dropped: vi.fn(async (file: string) => ({ file, name: file.slice(file.lastIndexOf("/") + 1), format: "ups" as const })),
      watchDrops: vi.fn((listener: PatchDrops) => {
        drops.add(listener);
        return () => void drops.delete(listener);
      }),
      checkName: vi.fn(async (_folder: string, _system: string, name: string) => {
        if (taken.includes(name)) throw { kind: "nameTaken" } satisfies PatchFailure;
      }),
      create: vi.fn(
        (_folder: string, _path: string, system: string, name: string) =>
          new Promise<{ path: string; sha256: string }>((resolve, reject) => {
            finish = () => (failure ? reject(failure) : resolve({ path: `${system}/${name}.${system}`, sha256: "c0ffee" }));
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
  await launch(fakeHost({ picked: { file: "/patches/hack.ips", name: "hack.ips", format: "ips" } }));

  await choosePatch();

  expect(screen.getByText(/IPS/)).toBeTruthy();
  await waitFor(() => expect(create().disabled).toBe(false));
});

it("refuses a file that isn't a patch", async () => {
  await launch(fakeHost({ picked: { file: "/notes.txt", name: "notes.txt", format: null } }));

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

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BackProvider } from "@/back/back";
import { desktopBackHost } from "@/back/desktopHost";
import { fakePads, padButtons } from "@/input/fakePads";
import { createInput } from "@/input/input";
import { REJECTED, StatesScreen, undoLoad, type Mode, type SavedState, type StatesHost } from "./StatesScreen";

let pads: ReturnType<typeof fakePads>;

beforeEach(() => {
  pads = fakePads();
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const saved = (slot: number, loadable = true): SavedState => ({ slot, savedAt: Date.now() - 3600_000, playSinceSave: 10, loadable });

function fakeHost({ slots = [] as number[], current = null as number | null, otherVersion = [] as number[] } = {}) {
  return {
    listStates: vi.fn(async () => ({
      current,
      slots: slots.map((slot) => saved(slot, !otherVersion.includes(slot))),
      canUndoLoad: false,
    })),
    stateScreenshot: vi.fn(async () => [137, 80, 78, 71]),
    saveState: vi.fn(async () => {}),
    loadState: vi.fn(async () => {}),
    undoLoadState: vi.fn(async () => {}),
    deleteState: vi.fn(async () => {}),
  } satisfies StatesHost;
}

async function launch(mode: Mode, host = fakeHost()) {
  const props = { onDone: vi.fn(), onBack: vi.fn() };
  render(
    <BackProvider host={desktopBackHost}>
      <StatesScreen mode={mode} host={host} folder="/games" path="gba/Emerald.gba" input={createInput(pads.gamepads)} {...props} />
    </BackProvider>,
  );
  pads.hold();
  await act(async () => {});
  return { ...props, host };
}

const tile = (slot: number) => screen.getByRole<HTMLButtonElement>("button", { name: new RegExp(`^Slot ${slot}(?!\\d)`) });
const trash = (slot: number) => screen.queryByRole<HTMLButtonElement>("button", { name: `Delete slot ${slot}` });

function layOutInRowsOfFive() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const slot = Number(this.textContent?.match(/^Slot (\d+)/)?.[1]);
    const trashOf = Number(this.getAttribute("aria-label")?.match(/^Delete slot (\d+)/)?.[1]);
    const [left, top] = [((slot || trashOf) - 1) % 5, Math.floor(((slot || trashOf) - 1) / 5)];
    if (slot) return new DOMRect(left * 110, 100 + top * 100, 100, 80);
    if (trashOf) return new DOMRect(left * 110 + 70, 104 + top * 100, 26, 26);
    return new DOMRect();
  });
}

async function pick(slot: number) {
  fireEvent.click(tile(slot));
  await act(async () => {});
}

async function choose(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
  await act(async () => {});
}

it("shows 10 slots, empty ones as empty", async () => {
  await launch("save", fakeHost({ slots: [3] }));

  for (let slot = 1; slot <= 10; slot++) expect(tile(slot)).toBeTruthy();
  expect(tile(7).textContent).toMatch(/Empty/);
  expect(tile(3).textContent).not.toMatch(/Empty/);
});

it("saves to an empty slot without asking", async () => {
  const { host, onDone } = await launch("save");

  await pick(7);

  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(host.saveState).toHaveBeenCalledWith(7);
  expect(onDone).toHaveBeenCalled();
});

it("asks before overwriting a filled slot", async () => {
  const { host, onDone } = await launch("save", fakeHost({ slots: [3] }));

  await pick(3);
  expect(screen.getByRole("alertdialog")).toBeTruthy();
  expect(host.saveState).not.toHaveBeenCalled();
  await choose("Overwrite");

  expect(host.saveState).toHaveBeenCalledWith(3);
  expect(onDone).toHaveBeenCalled();
});

it("leaves a filled slot alone when overwriting is cancelled", async () => {
  const { host, onDone } = await launch("save", fakeHost({ slots: [3] }));

  await pick(3);
  await choose("Cancel");

  expect(host.saveState).not.toHaveBeenCalled();
  expect(onDone).not.toHaveBeenCalled();
});

it("can't load an empty slot", async () => {
  await launch("load", fakeHost({ slots: [3] }));

  expect(tile(7).disabled).toBe(true);
  expect(tile(3).disabled).toBe(false);
});

it("can't load a slot saved with a different version, but can delete it", async () => {
  const { host } = await launch("load", fakeHost({ slots: [3, 5], otherVersion: [3] }));

  expect(tile(3).disabled).toBe(true);
  expect(tile(5).disabled).toBe(false);
  fireEvent.click(trash(3)!);
  await act(async () => {});
  await choose("Delete");
  expect(host.deleteState).toHaveBeenCalledWith("/games", "gba/Emerald.gba", 3);
});

it("can overwrite a slot saved with a different version", async () => {
  await launch("save", fakeHost({ slots: [3], otherVersion: [3] }));

  expect(tile(3).disabled).toBe(false);
});

it("loads the slot it's playing from without asking", async () => {
  const { host, onDone } = await launch("load", fakeHost({ slots: [3, 5], current: 5 }));

  await pick(5);

  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(host.loadState).toHaveBeenCalledWith("/games", "gba/Emerald.gba", 5);
  expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ undoable: true }));
});

it("offers no undo after saving", async () => {
  const { onDone } = await launch("save");

  await pick(7);

  expect(onDone).toHaveBeenCalledWith(expect.not.objectContaining({ undoable: true }));
});

it("asks before loading another slot", async () => {
  const { host, onDone } = await launch("load", fakeHost({ slots: [3, 5], current: 5 }));

  await pick(3);
  expect(screen.getByRole("alertdialog")).toBeTruthy();
  expect(host.loadState).not.toHaveBeenCalled();
  await choose("Load");

  expect(host.loadState).toHaveBeenCalledWith("/games", "gba/Emerald.gba", 3);
  expect(onDone).toHaveBeenCalled();
});

it("asks before loading when it isn't playing from a slot", async () => {
  const { host } = await launch("load", fakeHost({ slots: [3] }));

  await pick(3);
  await choose("Cancel");

  expect(host.loadState).not.toHaveBeenCalled();
});

it("says when a slot's state can't be loaded", async () => {
  const host = fakeHost({ slots: [3], current: 3 });
  host.loadState.mockRejectedValue(REJECTED);
  const { onDone } = await launch("load", host);

  await pick(3);

  const [[toast]] = onDone.mock.calls;
  expect(toast.message).not.toContain(REJECTED);
  expect(toast.undoable).toBeFalsy();
});

it("undoes a load", async () => {
  const host = fakeHost();

  expect(await undoLoad(host, "/games", "gba/Emerald.gba")).toBeUndefined();

  expect(host.undoLoadState).toHaveBeenCalledWith("/games", "gba/Emerald.gba");
});

it("says when a load can't be undone", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const host = fakeHost();
  host.undoLoadState.mockRejectedValue(REJECTED);

  const toast = await undoLoad(host, "/games", "gba/Emerald.gba");

  expect(toast?.message).not.toContain(REJECTED);
});

it("starts on the slot it's playing from", async () => {
  await launch("load", fakeHost({ slots: [3, 5], current: 5 }));

  expect(document.activeElement).toBe(tile(5));
});

it("moves between slots with the D-pad and picks with A", async () => {
  layOutInRowsOfFive();
  const { host } = await launch("save");

  pads.press(padButtons.right);
  pads.press(padButtons.down);
  expect(document.activeElement).toBe(tile(7));
  pads.press(padButtons.a);
  await act(async () => {});

  expect(host.saveState).toHaveBeenCalledWith(7);
});

it("moves between slots with the arrow keys", async () => {
  layOutInRowsOfFive();
  await launch("save");

  fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
  fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });

  expect(document.activeElement).toBe(tile(7));
});

it("goes back with B, closing a dialog first", async () => {
  const { onBack } = await launch("save", fakeHost({ slots: [3] }));
  await pick(3);

  pads.press(padButtons.b);
  await act(async () => {});
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(onBack).not.toHaveBeenCalled();

  pads.press(padButtons.b);
  expect(onBack).toHaveBeenCalled();
});

it("goes back with Esc", async () => {
  const { onBack } = await launch("save");

  fireEvent.keyDown(document.activeElement!, { key: "Escape" });

  expect(onBack).toHaveBeenCalled();
});

it("closes a dialog with Esc without leaving the page", async () => {
  const { onBack } = await launch("save", fakeHost({ slots: [3] }));
  await pick(3);

  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  await act(async () => {});

  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(onBack).not.toHaveBeenCalled();
});

it("closes the delete confirmation with Esc without leaving the page", async () => {
  const { host, onBack } = await launch("save", fakeHost({ slots: [3] }));
  fireEvent.click(trash(3)!);
  await act(async () => {});

  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  await act(async () => {});

  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(host.deleteState).not.toHaveBeenCalled();
  expect(onBack).not.toHaveBeenCalled();
});

it("shows a trash button only on filled tiles", async () => {
  await launch("load", fakeHost({ slots: [3] }));

  expect(trash(3)).toBeTruthy();
  expect(trash(7)).toBeNull();
});

it("deletes a slot after asking", async () => {
  const { host, onDone } = await launch("save", fakeHost({ slots: [3] }));

  fireEvent.click(trash(3)!);
  await act(async () => {});
  expect(screen.getByRole("alertdialog")).toBeTruthy();
  expect(host.deleteState).not.toHaveBeenCalled();
  await choose("Delete");

  expect(host.deleteState).toHaveBeenCalledWith("/games", "gba/Emerald.gba", 3);
  expect(tile(3).textContent).toMatch(/Empty/);
  expect(trash(3)).toBeNull();
  expect(host.saveState).not.toHaveBeenCalled();
  expect(onDone).not.toHaveBeenCalled();
});

it("deletes nothing when deleting is cancelled", async () => {
  const { host } = await launch("load", fakeHost({ slots: [3] }));

  fireEvent.click(trash(3)!);
  await act(async () => {});
  await choose("Cancel");

  expect(host.deleteState).not.toHaveBeenCalled();
  expect(host.loadState).not.toHaveBeenCalled();
  expect(tile(3).textContent).not.toMatch(/Empty/);
});

it("reaches a tile's trash button by moving right with the D-pad", async () => {
  layOutInRowsOfFive();
  const { host } = await launch("save", fakeHost({ slots: [3], current: 3 }));

  pads.press(padButtons.right);
  expect(document.activeElement).toBe(trash(3));
  pads.press(padButtons.left);
  expect(document.activeElement).toBe(tile(3));
  pads.press(padButtons.right);
  pads.press(padButtons.right);
  expect(document.activeElement).toBe(tile(4));
  pads.press(padButtons.left);
  pads.press(padButtons.right);
  pads.press(padButtons.a);
  await act(async () => {});
  await choose("Delete");

  expect(host.deleteState).toHaveBeenCalledWith("/games", "gba/Emerald.gba", 3);
});

it("reaches a tile's trash button with the arrow keys", async () => {
  layOutInRowsOfFive();
  await launch("load", fakeHost({ slots: [3], current: 3 }));

  fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });

  expect(document.activeElement).toBe(trash(3));
});

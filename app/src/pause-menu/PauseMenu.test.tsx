import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createInput } from "@/input/input";
import { PauseMenu } from "./PauseMenu";

const B = 0;
const A = 1;
const UP = 12;
const DOWN = 13;

let pads: (Gamepad | null)[];

beforeEach(() => {
  pads = [];
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function pad(...pressed: number[]) {
  pads = [
    {
      mapping: "standard",
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), touched: false, value: 0 })),
    } as unknown as Gamepad,
  ];
  act(() => void vi.advanceTimersToNextFrame());
}

function press(button: number) {
  pad(button);
  pad();
}

function launch({
  canEdit = true,
  canUndo = false,
  canLoadState = true,
  canUndoLoad = false,
  fastForward = false,
  pokemonInfo = undefined as boolean | undefined,
  randomized = undefined as boolean | undefined,
  skin = undefined as string | undefined,
  onSwapScreens = undefined as (() => void) | undefined,
  held = [] as number[],
} = {}) {
  const props = {
    input: createInput(() => pads),
    canEdit,
    canUndo,
    canSaveState: true,
    canLoadState,
    canUndoLoad,
    fastForward: { on: fastForward, speed: fastForward ? 2 : 1, toggle: vi.fn() } as const,
    pokemonInfo,
    onTogglePokemonInfo: vi.fn(),
    randomized,
    onToggleRandomized: vi.fn(),
    onResume: vi.fn(),
    onEditSave: vi.fn(),
    onUndo: vi.fn(),
    onSaveState: vi.fn(),
    onLoadState: vi.fn(),
    onUndoLoad: vi.fn(),
    onCheats: vi.fn(),
    skin,
    onSkin: vi.fn(),
    onSettings: vi.fn(),
    onQuit: vi.fn(),
    onSwapScreens,
  };
  render(<PauseMenu {...props} />);
  pad(...held);
  return props;
}

const item = (name: string) => screen.getByRole<HTMLButtonElement>("button", { name });

it("lists the menu", () => {
  launch({ canUndo: true, canUndoLoad: true });

  expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
    "Resume",
    "Edit save",
    "Undo last edit",
    "Save state",
    "Load state",
    "Undo load state",
    "Cheats",
    expect.stringMatching(/^Fast-forward/),
    "Settings",
    "Quit",
  ]);
  for (const button of screen.getAllByRole<HTMLButtonElement>("button")) expect(button.disabled).toBe(false);
});

it("puts Skin above Settings, with the skin and look in a line under it", () => {
  const props = launch({ skin: "Classic grey · Moulded" });
  const names = screen.getAllByRole("button").map((button) => button.textContent);

  expect(names.slice(-3)).toEqual(["SkinClassic grey · Moulded", "Settings", "Quit"]);
  fireEvent.click(screen.getByRole("button", { name: /^Skin/ }));
  expect(props.onSkin).toHaveBeenCalled();
});

it("leaves Skin out without a skin line", () => {
  launch();

  expect(screen.queryByRole("button", { name: /^Skin/ })).toBeNull();
});

it("puts Swap screens below Fast-forward when the game has two screens", () => {
  const onSwapScreens = vi.fn();
  launch({ onSwapScreens });
  const names = screen.getAllByRole("button").map((button) => button.textContent);

  expect(names[names.indexOf("Swap screens") - 1]).toMatch(/^Fast-forward/);
  fireEvent.click(item("Swap screens"));
  expect(onSwapScreens).toHaveBeenCalled();
});

it("leaves Swap screens out for a game with one screen", () => {
  launch();

  expect(screen.queryByRole("button", { name: "Swap screens" })).toBeNull();
});

it("disables Undo last edit when there's no edit to undo", () => {
  launch({ canUndo: false });

  expect(item("Undo last edit").disabled).toBe(true);
});

it("disables Load state when every slot is empty", () => {
  launch({ canLoadState: false });

  expect(item("Load state").disabled).toBe(true);
  expect(item("Save state").disabled).toBe(false);
});

it("shows Undo load state only while a load can be undone", () => {
  launch({ canUndoLoad: false });

  expect(screen.queryByRole("button", { name: "Undo load state" })).toBeNull();
});

it("disables Edit save when it can't edit", () => {
  launch({ canEdit: false });

  expect(item("Edit save").disabled).toBe(true);
});

it.each([
  ["Resume", "onResume"],
  ["Edit save", "onEditSave"],
  ["Undo last edit", "onUndo"],
  ["Save state", "onSaveState"],
  ["Load state", "onLoadState"],
  ["Undo load state", "onUndoLoad"],
  ["Cheats", "onCheats"],
  ["Settings", "onSettings"],
  ["Quit", "onQuit"],
] as const)("calls %s", (name, handler) => {
  const props = launch({ canUndo: true, canUndoLoad: true });

  fireEvent.click(item(name));

  expect(props[handler]).toHaveBeenCalled();
});

it("toggles fast-forward and shows whether it's on", () => {
  const props = launch({ fastForward: true });

  fireEvent.click(item("Fast-forward"));

  expect(props.fastForward.toggle).toHaveBeenCalled();
  expect(item("Fast-forward").getAttribute("aria-pressed")).toBe("true");
});

it("hides the switches for a game it can't read", () => {
  launch();

  expect(screen.queryByRole("switch")).toBeNull();
});

it("switches Pokémon info", () => {
  const props = launch({ pokemonInfo: false });
  const toggle = screen.getByRole("switch", { name: /Pokémon info/ });

  expect(toggle.getAttribute("aria-checked")).toBe("false");
  fireEvent.click(toggle);

  expect(props.onTogglePokemonInfo).toHaveBeenCalled();
});

it("switches Randomized", () => {
  const props = launch({ pokemonInfo: false, randomized: true });
  const toggle = screen.getByRole("switch", { name: /Randomized/ });

  expect(toggle.getAttribute("aria-checked")).toBe("true");
  fireEvent.click(toggle);

  expect(props.onToggleRandomized).toHaveBeenCalled();
});

it("resumes with Esc", () => {
  const props = launch();

  fireEvent.keyDown(document.activeElement!, { key: "Escape" });

  expect(props.onResume).toHaveBeenCalled();
});

it("starts on Resume", () => {
  launch();

  expect(document.activeElement).toBe(item("Resume"));
});

it("moves with the arrow keys, skipping disabled entries", () => {
  launch();

  fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
  fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
  expect(document.activeElement).toBe(item("Save state"));

  fireEvent.keyDown(document.activeElement!, { key: "ArrowUp" });
  expect(document.activeElement).toBe(item("Edit save"));
});

it("moves with the D-pad and picks with A", () => {
  const props = launch();

  press(DOWN);
  press(DOWN);
  press(DOWN);
  press(DOWN);
  press(DOWN);
  press(DOWN);
  press(UP);
  expect(document.activeElement).toBe(item("Fast-forward"));

  press(DOWN);
  press(A);
  expect(props.onSettings).toHaveBeenCalled();
});

it("resumes with B", () => {
  const props = launch();

  press(B);

  expect(props.onResume).toHaveBeenCalled();
});

it("ignores buttons already held when it opens", () => {
  const props = launch({ held: [B, DOWN] });
  pad(B, DOWN);

  expect(props.onResume).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(item("Resume"));
});

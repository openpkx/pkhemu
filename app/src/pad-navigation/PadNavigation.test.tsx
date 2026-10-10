import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BackProvider, useBack } from "@/back/back";
import { fakePads, padButtons } from "@/input/fakePads";
import { createInput, type Input } from "@/input/input";
import { PadNavigation } from "./PadNavigation";

const { a: A, b: B, up: UP, down: DOWN, left: LEFT, right: RIGHT } = padButtons;

let pads: ReturnType<typeof fakePads>;
const press = (button: number) => pads.press(button);

beforeEach(() => {
  pads = fakePads();
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function Tile({ name, x, y, onClick }: { name: string; x: number; y: number; onClick?(): void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      ref={(button) => {
        if (button) button.getBoundingClientRect = () => new DOMRect(x, y, 100, 80);
      }}
    >
      {name}
    </button>
  );
}

type Spot = [name: string, x: number, y: number];

const grid: Spot[] = [
  ["Red", 0, 100],
  ["Blue", 110, 100],
  ["Gold", 220, 100],
  ["Ruby", 0, 190],
  ["Emerald", 110, 190],
];

function Library({ onOpen, onBack, extra = [] }: { onOpen(name: string): void; onBack?(): void; extra?: Spot[] }) {
  useBack(onBack);
  return (
    <>
      <header>
        <Tile name="Refresh" x={300} y={0} />
        <Tile name="Settings" x={400} y={0} />
      </header>
      <main>
        {[...grid, ...extra].map(([name, x, y]) => (
          <Tile key={name} name={name} x={x} y={y} onClick={() => onOpen(name)} />
        ))}
      </main>
    </>
  );
}

function launch({
  onBack,
  extra,
  input = createInput(pads.gamepads),
}: { onBack?(): void; extra?: Spot[]; input?: Input } = {}) {
  const onOpen = vi.fn<(name: string) => void>();
  render(
    <BackProvider>
      <PadNavigation input={input} />
      <Library onOpen={onOpen} onBack={onBack} extra={extra} />
    </BackProvider>,
  );
  pads.hold();
  return onOpen;
}

const focused = () => document.activeElement?.textContent;

it("starts on the first game", () => {
  launch();

  press(RIGHT);

  expect(focused()).toBe("Red");
});

it("moves through the grid with the D-pad", () => {
  launch();
  press(DOWN);

  press(RIGHT);
  expect(focused()).toBe("Blue");
  press(DOWN);
  expect(focused()).toBe("Emerald");
  press(LEFT);
  expect(focused()).toBe("Ruby");
  press(UP);
  expect(focused()).toBe("Red");
});

it("goes to the nearest row, even when its tile is off to the side", () => {
  launch({ extra: [["Crystal", 330, 280]] });
  press(DOWN);
  press(RIGHT);
  press(RIGHT);

  press(DOWN);
  expect(focused()).toBe("Emerald");
  press(DOWN);
  expect(focused()).toBe("Crystal");
  press(UP);
  expect(focused()).toBe("Emerald");
});

it("skips what isn't shown", () => {
  launch({ extra: [["Hidden", 0, 185]] });
  screen.getByText("Hidden").getBoundingClientRect = () => new DOMRect(0, 185, 0, 0);
  press(DOWN);

  press(DOWN);

  expect(focused()).toBe("Ruby");
});

it("stays put at the ends of a row", () => {
  launch();
  press(DOWN);

  press(LEFT);
  expect(focused()).toBe("Red");
  press(DOWN);
  press(RIGHT);
  press(RIGHT);
  expect(focused()).toBe("Emerald");
});

it("goes up from the grid into the header and along it", () => {
  launch();
  press(DOWN);
  press(RIGHT);
  press(RIGHT);

  press(UP);
  expect(focused()).toBe("Refresh");
  press(RIGHT);
  expect(focused()).toBe("Settings");
});

it("moves with a calibrated pad that has no standard layout", () => {
  const [DOWN_HAT, RIGHT_HAT, NEUTRAL_HAT] = [0.142857, -0.428571, 1.285714];
  let hat = NEUTRAL_HAT;
  const oddPad = () => [{ id: "Odd Pad", mapping: "", axes: [0, 0, hat], buttons: [] } as unknown as Gamepad];
  const calibrations = () => ({
    pads: { "Odd Pad": { down: { axis: 2, value: DOWN_HAT }, right: { axis: 2, value: RIGHT_HAT } } },
  });
  const tap = (value: number) => {
    hat = value;
    act(() => void vi.advanceTimersToNextFrame());
    hat = NEUTRAL_HAT;
    act(() => void vi.advanceTimersToNextFrame());
  };
  launch({ input: createInput(oddPad, calibrations) });

  tap(DOWN_HAT);
  tap(RIGHT_HAT);

  expect(focused()).toBe("Blue");
});

it("stays inside the dialog that has focus, and reaches its text fields", () => {
  launch();
  render(
    <div role="dialog">
      <Tile name="Cancel" x={0} y={300} />
      <textarea
        aria-label="Code"
        ref={(field) => {
          if (field) field.getBoundingClientRect = () => new DOMRect(0, 220, 200, 60);
        }}
      />
    </div>,
  );
  screen.getByText("Cancel").focus();

  press(UP);
  expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Code" }));
  press(UP);
  expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Code" }));
});

it("opens the focused game with A", () => {
  const onOpen = launch();
  press(DOWN);
  press(RIGHT);

  press(A);

  expect(onOpen).toHaveBeenCalledExactlyOnceWith("Blue");
});

it("does nothing on A with nothing focused", () => {
  const onOpen = launch();

  press(A);

  expect(onOpen).not.toHaveBeenCalled();
});

it("goes back with B", () => {
  const onBack = vi.fn();
  launch({ onBack });

  press(B);

  expect(onBack).toHaveBeenCalledOnce();
});

it("shows focus while the gamepad is in use", () => {
  launch();

  press(DOWN);
  expect(document.documentElement.hasAttribute("data-gamepad")).toBe(true);

  fireEvent.pointerDown(screen.getByText("Ruby"));
  expect(document.documentElement.hasAttribute("data-gamepad")).toBe(false);
});

const row: Spot[] = [330, 440, 550, 660, 770].map((x, i) => [`Row ${i}`, x, 100]);
const holdFor = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

it("repeats a held direction after a delay", () => {
  launch({ extra: row });
  press(DOWN);
  pads.hold(RIGHT);
  expect(focused()).toBe("Blue");

  holdFor(399);
  expect(focused()).toBe("Blue");
  holdFor(1);
  expect(focused()).toBe("Gold");
  holdFor(400);
  expect(focused()).toBe("Row 3");
});

it("moves once for a direction let go before the delay", () => {
  launch({ extra: row });
  press(DOWN);
  pads.hold(RIGHT);
  holdFor(300);

  pads.hold();
  holdFor(1000);

  expect(focused()).toBe("Blue");
});

it("clicks once for a held A", () => {
  const onOpen = launch();
  press(DOWN);

  pads.hold(A);
  holdFor(1000);

  expect(onOpen).toHaveBeenCalledExactlyOnceWith("Red");
});

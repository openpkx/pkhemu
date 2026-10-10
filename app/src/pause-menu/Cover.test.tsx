import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createInput } from "@/input/input";
import { Cover } from "./Cover";

const B = 0;

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

function launch() {
  const onBack = vi.fn();
  render(
    <Cover input={createInput(() => pads)} onBack={onBack}>
      <p>Settings</p>
    </Cover>,
  );
  pad();
  return onBack;
}

it("goes back with B", () => {
  const onBack = launch();

  pad(B);

  expect(onBack).toHaveBeenCalledOnce();
});

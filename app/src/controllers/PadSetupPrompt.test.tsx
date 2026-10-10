import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BackProvider } from "@/back/back";
import { parseCalibrations, type Calibrations } from "@/input/calibration";
import { CalibrationsProvider, useCalibrations, type CalibrationsHost } from "@/input/calibrations";
import { fakePads } from "@/input/fakePads";
import { createInput } from "@/input/input";
import { PadNavigation } from "@/pad-navigation/PadNavigation";
import { PadSetupPrompt } from "./PadSetupPrompt";

const STEPS = 17;

let pads: ReturnType<typeof fakePads>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
  pads = fakePads();
  Object.defineProperty(navigator, "getGamepads", { configurable: true, value: pads.gamepads });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const connectOddPad = (id = "Odd Pad") => pads.connect({ id, mapping: "" });

function Prompted({ dismissed }: { dismissed: Set<string> }) {
  const { current } = useCalibrations();
  const [input] = useState(() => createInput(pads.gamepads, current));
  return (
    <>
      <PadNavigation input={input} />
      <PadSetupPrompt input={input} dismissed={dismissed} />
    </>
  );
}

async function launch(stored?: Calibrations, dismissed = new Set<string>()) {
  let saved: unknown = stored;
  const host: CalibrationsHost = {
    load: async () => saved,
    save: async (calibrations) => {
      saved = calibrations;
    },
  };
  const view = render(
    <BackProvider>
      <CalibrationsProvider host={host}>
        <Prompted dismissed={dismissed} />
      </CalibrationsProvider>
    </BackProvider>,
  );
  await act(async () => {});
  act(() => void vi.advanceTimersToNextFrame());
  return { saved: () => parseCalibrations(saved), dismissed, unmount: view.unmount };
}

const notice = () => screen.queryByRole("alertdialog");
const setupOpen = () => screen.queryAllByRole("listitem").length > 0;

it("shows a notice on the first press from a pad it can't read", async () => {
  const pad = connectOddPad();
  await launch();
  pads.connect().press(0);
  expect(notice()).toBeNull();

  pad.press(3);

  expect(notice()).toBeTruthy();
});

it("shows a notice when a pad it can't read moves an axis", async () => {
  const pad = connectOddPad();
  await launch();

  pad.move(1, 1);

  expect(notice()).toBeTruthy();
});

it("shows no notice for a calibrated pad", async () => {
  const pad = connectOddPad();
  await launch({ pads: { "Odd Pad": { east: { button: 1 } } } });

  pad.press(3);
  pad.move(1, 1);

  expect(notice()).toBeNull();
});

it("opens setup for the pad that was pressed", async () => {
  connectOddPad();
  const pad = connectOddPad("Other Odd Pad");
  const { saved } = await launch();
  pad.press(3);

  fireEvent.click(screen.getByRole("button", { name: "Set up" }));
  act(() => void vi.advanceTimersToNextFrame());
  expect(notice()).toBeNull();
  expect(setupOpen()).toBe(true);
  for (let button = 0; button < STEPS; button++) pad.press(button);
  await act(async () => {});

  expect(setupOpen()).toBe(false);
  expect(Object.keys(saved().pads)).toEqual(["Other Odd Pad"]);
});

it("doesn't show the notice again for a dismissed pad model", async () => {
  const pad = connectOddPad();
  const { dismissed, unmount } = await launch();
  pad.press(3);

  fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
  expect(notice()).toBeNull();
  pad.press(3);
  expect(notice()).toBeNull();

  unmount();
  const same = connectOddPad();
  await launch(undefined, dismissed);
  same.press(3);

  expect(notice()).toBeNull();
});

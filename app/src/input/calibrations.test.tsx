import type { ReactNode } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { Calibrations } from "./calibration";
import { CalibrationsProvider, useCalibrations, type CalibrationsHost } from "./calibrations";

afterEach(cleanup);

function fakeStore(stored?: unknown) {
  let saved = stored;
  const host: CalibrationsHost = {
    load: async () => saved,
    save: async (calibrations) => {
      saved = calibrations;
    },
  };
  return {
    saved: () => saved,
    launch: () =>
      renderHook(useCalibrations, {
        wrapper: ({ children }: { children: ReactNode }) => (
          <CalibrationsProvider host={host}>{children}</CalibrationsProvider>
        ),
      }),
  };
}

const calibrated: Calibrations = {
  pads: {
    "Odd Pad": {
      south: { button: 2 },
      up: { axis: 9, value: -1 },
      stickLeft: { axis: 0, direction: -1 },
    },
  },
  keyboard: { east: "KeyJ" },
};

it("has no calibrations until one is saved", async () => {
  const { result } = fakeStore().launch();

  await act(async () => {});
  expect(result.current.current()).toEqual({ pads: {} });
});

it("keeps calibrations across restarts", async () => {
  const store = fakeStore();
  const first = store.launch();
  await act(() => first.result.current.save(calibrated));
  first.unmount();

  const { result } = store.launch();

  await waitFor(() => expect(result.current.current()).toEqual(calibrated));
});

it("drops what it can't read from stored calibrations", async () => {
  const { result } = fakeStore({
    pads: {
      "Odd Pad": {
        south: { button: 2 },
        east: { button: -1 },
        west: "B",
        jump: { button: 3 },
      },
    },
    keyboard: { east: "KeyJ", west: 4 },
  }).launch();

  await waitFor(() =>
    expect(result.current.current()).toEqual({
      pads: { "Odd Pad": { south: { button: 2 } } },
      keyboard: { east: "KeyJ" },
    }),
  );
});

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BackProvider } from "@/back/back";
import { CoffeeAsk, type CoffeeHost, type CoffeeState } from "./coffee";

const HOUR_MS = 60 * 60 * 1000;

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function fakeCoffee(stored: Partial<CoffeeState> = {}) {
  const host: CoffeeHost & { state: CoffeeState } = {
    state: { secondsPlayed: 0, asked: false, ...stored },
    load: vi.fn(async () => host.state),
    save: vi.fn(async (state: CoffeeState) => void (host.state = state)),
    openKoFi: vi.fn(async () => {}),
  };
  return host;
}

type Props = { playing: boolean; canAsk: boolean };

async function show(host: CoffeeHost, props: Props) {
  const tree = (props: Props) => (
    <BackProvider>
      <CoffeeAsk host={host} {...props} />
    </BackProvider>
  );
  const view = render(tree(props));
  await act(async () => {});
  return {
    ...view,
    rerender: async (next: Props) => {
      view.rerender(tree(next));
      await act(async () => {});
    },
  };
}

it("asks once the player is back in the library after 2 hours of play", async () => {
  const host = fakeCoffee();
  const view = await show(host, { playing: true, canAsk: false });

  await act(() => vi.advanceTimersByTimeAsync(2 * HOUR_MS));
  expect(screen.queryByRole("alertdialog")).toBeNull();

  await view.rerender({ playing: false, canAsk: true });
  expect(screen.getByRole("alertdialog", { name: "Enjoying pkhemu?" })).toBeTruthy();
});

it("waits for 2 hours across sessions", async () => {
  const host = fakeCoffee({ secondsPlayed: 90 * 60 });
  const view = await show(host, { playing: false, canAsk: true });
  expect(screen.queryByRole("alertdialog")).toBeNull();

  await view.rerender({ playing: true, canAsk: false });
  await act(() => vi.advanceTimersByTimeAsync(29 * 60 * 1000));
  await view.rerender({ playing: false, canAsk: true });
  expect(screen.queryByRole("alertdialog")).toBeNull();

  await view.rerender({ playing: true, canAsk: false });
  await act(() => vi.advanceTimersByTimeAsync(60 * 1000));
  await view.rerender({ playing: false, canAsk: true });
  expect(screen.getByRole("alertdialog")).toBeTruthy();
});

it("keeps the play time between launches", async () => {
  const host = fakeCoffee();
  const view = await show(host, { playing: true, canAsk: false });
  await act(() => vi.advanceTimersByTimeAsync(30 * 60 * 1000));
  view.unmount();

  expect(host.state.secondsPlayed).toBe(30 * 60);
});

it("doesn't count time the app spends in the background", async () => {
  const host = fakeCoffee();
  await show(host, { playing: true, canAsk: false });
  let visibility: DocumentVisibilityState = "hidden";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  await act(async () => void document.dispatchEvent(new Event("visibilitychange")));

  await act(() => vi.advanceTimersByTimeAsync(3 * HOUR_MS));
  visibility = "visible";
  await act(async () => void document.dispatchEvent(new Event("visibilitychange")));

  expect(host.state.secondsPlayed).toBe(0);
});

it.each(["Buy me a coffee", "Already did", "No thanks"])("never asks again after %s", async (button) => {
  const host = fakeCoffee({ secondsPlayed: 3 * 60 * 60 });
  const view = await show(host, { playing: false, canAsk: true });

  await act(async () => void fireEvent.click(screen.getByRole("button", { name: button })));
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(host.state.asked).toBe(true);
  view.unmount();

  await show(host, { playing: false, canAsk: true });
  expect(screen.queryByRole("alertdialog")).toBeNull();
});

it("opens Ko-fi from Buy me a coffee", async () => {
  const host = fakeCoffee({ secondsPlayed: 3 * 60 * 60 });
  await show(host, { playing: false, canAsk: true });

  await act(async () => void fireEvent.click(screen.getByRole("button", { name: "Buy me a coffee" })));

  expect(host.openKoFi).toHaveBeenCalledOnce();
});

it("doesn't ask while a game runs", async () => {
  const host = fakeCoffee({ secondsPlayed: 3 * 60 * 60 });
  await show(host, { playing: true, canAsk: false });

  expect(screen.queryByRole("alertdialog")).toBeNull();
});

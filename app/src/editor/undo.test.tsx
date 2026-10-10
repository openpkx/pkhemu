import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { UndoToast, useUndo, type UndoHost } from "./undo";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  delete (Element.prototype as Partial<Element>).getAnimations;
  vi.useRealTimers();
});

function game() {
  let undoable = false;
  const host: UndoHost = {
    read: async () => new Uint8Array(),
    apply: vi.fn(async () => void (undoable = true)),
    playTimeSinceSave: async () => 0,
    undo: vi.fn(async () => {
      if (!undoable) throw "there's no edit to undo";
      undoable = false;
    }),
    canUndo: async () => undoable,
  };
  return {
    host,
    play: (seconds: number) => act(() => vi.advanceTimersByTimeAsync(seconds * 1000)),
    save: () => (undoable = false),
  };
}

it("has nothing to undo before an edit", () => {
  const { host } = game();

  const { result } = renderHook(() => useUndo(host));

  expect(result.current.undoable).toBe(false);
});

it("can undo an applied edit", async () => {
  const { host, play } = game();
  const { result } = renderHook(() => useUndo(host));

  await act(() => result.current.host.apply(new Uint8Array([9])));
  await play(10);
  expect(host.apply).toHaveBeenCalledWith(new Uint8Array([9]));
  expect(result.current.undoable).toBe(true);

  await act(() => result.current.undo());

  expect(host.undo).toHaveBeenCalledOnce();
  expect(result.current.undoable).toBe(false);
});

it("stops offering the undo once the game saves", async () => {
  const { host, play, save } = game();
  const { result } = renderHook(() => useUndo(host));
  await act(() => result.current.host.apply(new Uint8Array([9])));

  save();
  await play(1);

  expect(result.current.undoable).toBe(false);
});

it("stops offering the undo when undoing fails", async () => {
  const { host } = game();
  const { result } = renderHook(() => useUndo(host));
  await act(() => result.current.host.apply(new Uint8Array([9])));
  vi.mocked(host.undo).mockRejectedValueOnce("the core couldn't load the state");
  vi.spyOn(console, "error").mockImplementation(() => {});

  await act(() => result.current.undo());

  expect(result.current.undoable).toBe(false);
});

it("undoes from the toast", () => {
  const onUndo = vi.fn();
  render(<UndoToast onUndo={onUndo}>Save edited</UndoToast>);

  fireEvent.click(screen.getByRole("button", { name: "Undo" }));

  expect(onUndo).toHaveBeenCalled();
});

it("rises out with its Undo when the undo goes", () => {
  Element.prototype.getAnimations = () => [{ finished: new Promise(() => {}) } as Animation];
  const { rerender } = render(<UndoToast onUndo={vi.fn()}>Save edited</UndoToast>);

  rerender(<UndoToast onUndo={vi.fn()} />);

  expect(screen.getByRole("status").dataset.state).toBe("closed");
  expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy();
});

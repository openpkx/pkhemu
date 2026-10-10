import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CoreMessageToast, type CoreMessage } from "./CoreMessage";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function core() {
  let send: (message: CoreMessage) => void = () => {};
  const messages = vi.fn((listener: (message: CoreMessage) => void) => {
    send = listener;
    return vi.fn();
  });
  return { messages, send: (message: CoreMessage) => act(() => send(message)) };
}

it("shows a message from the core for its duration", () => {
  const { messages, send } = core();
  render(<CoreMessageToast messages={messages} />);

  send({ text: "Cheat #0 isn't valid", durationMs: 5000 });
  expect(screen.getByRole("status").textContent).toBe("Cheat #0 isn't valid");

  act(() => vi.advanceTimersByTime(4900));
  expect(screen.queryByRole("status")).toBeTruthy();
  act(() => vi.advanceTimersByTime(100));
  expect(screen.queryByRole("status")).toBeNull();
});

it("stops listening when it goes", () => {
  const { messages } = core();
  const { unmount } = render(<CoreMessageToast messages={messages} />);

  unmount();

  expect(messages.mock.results[0].value).toHaveBeenCalled();
});

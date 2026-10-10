import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { Toast } from "./Toast";

let finish: () => void;

beforeEach(() => {
  const finished = new Promise<Animation>((resolve) => (finish = () => resolve({} as Animation)));
  Element.prototype.getAnimations = () => [{ finished } as Animation];
});

afterEach(() => {
  cleanup();
  delete (Element.prototype as Partial<Element>).getAnimations;
});

it("shows an inline toast where it's rendered", () => {
  const { container } = render(<Toast inline>Saved</Toast>);

  const toast = screen.getByRole("status");
  expect(container.contains(toast)).toBe(true);
  expect(toast.dataset.state).toBe("open");
});

it("plays an inline toast's exit before removing it", async () => {
  const { rerender } = render(<Toast inline>Saved</Toast>);

  rerender(<Toast inline>{""}</Toast>);
  expect(screen.getByRole("status").dataset.state).toBe("closed");
  expect(screen.getByRole("status").textContent).toBe("Saved");

  await act(async () => finish());
  expect(screen.queryByRole("status")).toBeNull();
});

it("shows other toasts over the page", () => {
  const { container } = render(<Toast>Saved</Toast>);

  expect(container.contains(screen.getByRole("status"))).toBe(false);
});

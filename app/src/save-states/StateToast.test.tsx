import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { StateToast } from "./StateToast";

afterEach(() => {
  cleanup();
  delete (Element.prototype as Partial<Element>).getAnimations;
});

it("undoes a load from its toast", () => {
  const onUndo = vi.fn();
  render(<StateToast toast={{ message: "Loaded slot 3", undoable: true }} onUndo={onUndo} />);

  fireEvent.click(screen.getByRole("button", { name: "Undo" }));

  expect(onUndo).toHaveBeenCalled();
});

it("offers no undo on other toasts", () => {
  render(<StateToast toast={{ message: "Saved to slot 3" }} onUndo={vi.fn()} />);

  expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
});

it("rises out with its Undo when the toast goes", () => {
  Element.prototype.getAnimations = () => [{ finished: new Promise(() => {}) } as Animation];
  const { rerender } = render(<StateToast toast={{ message: "Loaded slot 3", undoable: true }} onUndo={vi.fn()} />);

  rerender(<StateToast onUndo={vi.fn()} />);

  expect(screen.getByRole("status").dataset.state).toBe("closed");
  expect(screen.getByRole("status").textContent).toContain("Loaded slot 3");
  expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy();
});

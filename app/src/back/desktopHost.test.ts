import { afterEach, beforeEach, expect, it } from "vitest";
import { desktopBackHost } from "./desktopHost";

let backs: number;
let stop: () => void;

beforeEach(() => {
  backs = 0;
  stop = desktopBackHost.listen(() => backs++);
});

afterEach(() => {
  stop();
  document.body.innerHTML = "";
});

function press(init: KeyboardEventInit, target: EventTarget = window) {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

it.each([
  ["Escape", { key: "Escape", code: "Escape" }],
  ["Cmd+Left", { key: "ArrowLeft", code: "ArrowLeft", metaKey: true }],
  ["Cmd+[", { key: "[", code: "BracketLeft", metaKey: true }],
  ["Alt+Left", { key: "ArrowLeft", code: "ArrowLeft", altKey: true }],
])("goes back with %s", (_, init) => {
  press(init);

  expect(backs).toBe(1);
});

it("leaves other keys alone", () => {
  press({ key: "ArrowLeft", code: "ArrowLeft" });
  press({ key: "[", code: "BracketLeft" });

  expect(backs).toBe(0);
});

it("takes Cmd+Left so the page doesn't navigate", () => {
  expect(press({ key: "ArrowLeft", code: "ArrowLeft", metaKey: true }).defaultPrevented).toBe(true);
});

it("ignores an Escape something else already used, like a dialog closing", () => {
  const dialog = document.body.appendChild(document.createElement("div"));
  dialog.addEventListener("keydown", (event) => event.preventDefault());

  press({ key: "Escape", code: "Escape" }, dialog);

  expect(backs).toBe(0);
});

it.each([
  ["Cmd+Left", { key: "ArrowLeft", code: "ArrowLeft", metaKey: true }],
  ["Alt+Left", { key: "ArrowLeft", code: "ArrowLeft", altKey: true }],
])("leaves %s to a text field, where it moves the cursor", (_, init) => {
  const field = document.body.appendChild(document.createElement("input"));

  const event = press(init, field);

  expect(backs).toBe(0);
  expect(event.defaultPrevented).toBe(false);
});

it("still goes back with Escape from a text field", () => {
  const field = document.body.appendChild(document.createElement("input"));

  press({ key: "Escape", code: "Escape" }, field);

  expect(backs).toBe(1);
});

it("stops listening", () => {
  stop();

  press({ key: "Escape", code: "Escape" });

  expect(backs).toBe(0);
});

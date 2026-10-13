import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { iosBackHost } from "./iosHost";

let backs: number;
let stop: () => void;

beforeEach(() => {
  backs = 0;
  stop = iosBackHost.listen(() => backs++);
});

afterEach(() => {
  stop();
  document.body.innerHTML = "";
});

function swipe(from: [number, number], to: [number, number], target: Element = document.body) {
  const at = ([clientX, clientY]: [number, number]) => [{ identifier: 0, clientX, clientY }];
  fireEvent.touchStart(target, { touches: at(from), changedTouches: at(from) });
  fireEvent.touchMove(target, { touches: at(to), changedTouches: at(to) });
  fireEvent.touchEnd(target, { touches: [], changedTouches: at(to) });
}

it("goes back on a swipe from the left edge", () => {
  swipe([4, 300], [120, 310]);

  expect(backs).toBe(1);
});

it("leaves a swipe that starts away from the edge alone", () => {
  swipe([80, 300], [200, 300]);

  expect(backs).toBe(0);
});

it("leaves a short swipe from the edge alone", () => {
  swipe([4, 300], [30, 300]);

  expect(backs).toBe(0);
});

it("leaves a scroll that starts at the edge alone", () => {
  swipe([4, 300], [70, 500]);

  expect(backs).toBe(0);
});

it("leaves a swipe on the game to the game", () => {
  const game = document.body.appendChild(document.createElement("div"));
  game.dataset.noBackSwipe = "";
  const dpad = game.appendChild(document.createElement("button"));

  swipe([4, 300], [120, 300], dpad);

  expect(backs).toBe(0);
});

it("leaves a swipe made with a second finger down alone", () => {
  const one = { identifier: 0, clientX: 200, clientY: 300 };
  const two = { identifier: 1, clientX: 4, clientY: 300 };
  const twoMoved = { ...two, clientX: 120 };
  fireEvent.touchStart(document.body, { touches: [one], changedTouches: [one] });
  fireEvent.touchStart(document.body, { touches: [one, two], changedTouches: [two] });
  fireEvent.touchEnd(document.body, { touches: [one], changedTouches: [twoMoved] });

  expect(backs).toBe(0);
});

it("leaves a swipe the system took over alone", () => {
  const start = { identifier: 0, clientX: 4, clientY: 300 };
  const end = { ...start, clientX: 120 };
  fireEvent.touchStart(document.body, { touches: [start], changedTouches: [start] });
  fireEvent.touchCancel(document.body, { touches: [], changedTouches: [end] });
  fireEvent.touchEnd(document.body, { touches: [], changedTouches: [end] });

  expect(backs).toBe(0);
});

it.each([
  ["Escape", { key: "Escape", code: "Escape" }],
  ["Cmd+[", { key: "[", code: "BracketLeft", metaKey: true }],
])("goes back with %s on a keyboard", (_, init) => {
  fireEvent.keyDown(window, init);

  expect(backs).toBe(1);
});

it("stops listening", () => {
  stop();

  swipe([4, 300], [120, 300]);
  fireEvent.keyDown(window, { key: "Escape", code: "Escape" });

  expect(backs).toBe(0);
});

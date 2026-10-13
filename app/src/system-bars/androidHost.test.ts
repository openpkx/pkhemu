import { afterEach, expect, it } from "vitest";
import { androidSystemBarsHost } from "./androidHost";

afterEach(() => {
  delete window.androidSystemBars;
});

it("passes each call to the bridge", () => {
  const calls: unknown[] = [];
  window.androidSystemBars = {
    setHidden: (hidden) => void calls.push(["hidden", hidden]),
    setLight: (light) => void calls.push(["light", light]),
    splashHidden: () => void calls.push("splashHidden"),
  };

  androidSystemBarsHost.setHidden(true);
  androidSystemBarsHost.setLight(false);
  androidSystemBarsHost.splashHidden();

  expect(calls).toEqual([["hidden", true], ["light", false], "splashHidden"]);
});

it("does nothing where the bridge doesn't exist", () => {
  androidSystemBarsHost.setHidden(true);
  androidSystemBarsHost.setLight(true);
  androidSystemBarsHost.splashHidden();
});

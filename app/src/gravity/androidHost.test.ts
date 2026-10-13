import { afterEach, expect, it } from "vitest";
import { androidGravityHost } from "./androidHost";

afterEach(() => {
  delete window.androidGravity;
});

it("reads nothing where the bridge doesn't exist", () => {
  expect(androidGravityHost.read()).toBeUndefined();
  androidGravityHost.start();
  androidGravityHost.stop();
});

it("reads the latest gravity from the bridge", () => {
  window.androidGravity = { start: () => {}, stop: () => {}, read: () => "0.5,-9.7,1.25" };

  expect(androidGravityHost.read()).toEqual({ x: 0.5, y: -9.7, z: 1.25 });
});

it("reads nothing before the sensor reports or where the device has none", () => {
  window.androidGravity = { start: () => {}, stop: () => {}, read: () => null };

  expect(androidGravityHost.read()).toBeUndefined();
});

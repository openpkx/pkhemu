import { expect, it } from "vitest";
import { experiments } from "./experiments";

const experiment = (id: string) => experiments.find((experiment) => experiment.id === id);

it("leaves Screen depth and Screen glass to Settings", () => {
  expect(experiment("tiltScreen")).toBeUndefined();
  expect(experiment("displayGlass")).toBeUndefined();
});

it("offers the demo game, on by default", () => {
  expect(experiment("demoGame")?.values[0]).toBe("on");
});

it("has no GameCube experiment", () => {
  expect(experiment("gameCube")).toBeUndefined();
});

it("leaves 3DS async shaders to Settings", () => {
  expect(experiment("asyncShaders")).toBeUndefined();
});

it("has no 3DS experiment", () => {
  expect(experiment("threeDs")).toBeUndefined();
});

it("leaves RetroAchievements to Settings", () => {
  expect(experiment("retroAchievements")).toBeUndefined();
});

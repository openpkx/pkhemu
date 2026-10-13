import { expect, it } from "vitest";
import { experiments } from "./experiments";

const experiment = (id: string) => experiments.find((experiment) => experiment.id === id);

it("offers display glass in the Lab, off by default", () => {
  expect(experiment("displayGlass")).toMatchObject({ label: "Handheld display glass", players: false });
  expect(experiment("displayGlass")?.values[0]).toBe("off");
});

it("names the tilt experiment after the handheld display's depth", () => {
  expect(experiment("tiltScreen")?.label).toBe("Handheld display depth");
});

it("offers the demo game, on by default", () => {
  expect(experiment("demoGame")?.values[0]).toBe("on");
});

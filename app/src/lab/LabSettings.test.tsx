import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { Experiment } from "./experiments";
import { ExperimentsProvider, type ExperimentsHost, type ExperimentValues } from "./lab";
import { LabSettings } from "./LabSettings";
import { fakePlus } from "@/plus/fakePlus";
import { PlusProvider, type PlusStatus } from "@/plus/plus";

afterEach(cleanup);

const registry: Experiment[] = [
  { id: "blend", label: "Blend frames", line: "Blends skipped frames.", values: ["off", "on"], players: false },
  { id: "pacing", label: "Pacing", line: "How owed frames run.", values: ["catch-up", "drop", "spread"], players: false },
  { id: "tilt", label: "Tilt", line: "Tilts the screen.", values: ["off", "on"], players: true },
];

function openLab({ plus = undefined as PlusStatus | undefined, stored = {} as unknown, experiments = registry } = {}) {
  let saved = stored;
  const host: ExperimentsHost = {
    load: async () => saved,
    save: async (values) => {
      saved = values;
    },
  };
  const lab = (
    <ExperimentsProvider host={host} registry={experiments}>
      <LabSettings />
    </ExperimentsProvider>
  );
  render(plus ? <PlusProvider host={fakePlus({ status: plus }).host}>{lab}</PlusProvider> : lab);
  return { host, saved: () => saved as ExperimentValues };
}

it.each([
  ["without Plus", { state: "notOwned", price: "$3.99" }],
  ["with the Plus switch off", { state: "unavailable" }],
] as const)("hides the Lab in a store build %s, whatever is stored", async (_, plus) => {
  openLab({ plus, stored: { tilt: "on" } });
  await act(async () => {});

  expect(screen.queryByRole("region", { name: "Lab" })).toBeNull();
});

it("lists only the player experiments for a Plus owner in a store build", async () => {
  openLab({ plus: { state: "owned" } });
  const lab = await screen.findByRole("region", { name: "Lab" });

  expect(within(lab).getByRole("switch", { name: "Tilt" })).toBeTruthy();
  expect(within(lab).queryByRole("switch", { name: "Blend frames" })).toBeNull();
  expect(within(lab).queryByRole("radiogroup", { name: "Pacing" })).toBeNull();
});

it("hides the Lab in a store build with no player experiments", async () => {
  openLab({ plus: { state: "owned" }, experiments: registry.filter(({ players }) => !players) });
  await act(async () => {});

  expect(screen.queryByRole("region", { name: "Lab" })).toBeNull();
});

it("hides the Lab when there are no experiments", async () => {
  openLab({ experiments: [] });
  await act(async () => {});

  expect(screen.queryByRole("region", { name: "Lab" })).toBeNull();
});

it("lists every experiment with what it does in a build that isn't a store build", async () => {
  openLab({ plus: { state: "unlocked" } });
  const lab = await screen.findByRole("region", { name: "Lab" });

  expect(within(lab).getByRole("switch", { name: "Blend frames" })).toBeTruthy();
  expect(within(lab).getByText("Blends skipped frames.")).toBeTruthy();
  expect(within(lab).getByRole("radiogroup", { name: "Pacing" })).toBeTruthy();
  expect(within(lab).getByText("How owed frames run.")).toBeTruthy();
  expect(within(lab).getByRole("switch", { name: "Tilt" })).toBeTruthy();
  expect(within(lab).queryByRole("button", { name: "Reset" })).toBeNull();
});

it("turns a two-value experiment on and resets it", async () => {
  const { saved } = openLab();
  const lab = await screen.findByRole("region", { name: "Lab" });

  fireEvent.click(within(lab).getByRole("switch", { name: "Blend frames" }));
  await act(async () => {});

  expect(saved()).toEqual({ blend: "on", pacing: "catch-up", tilt: "off" });
  expect(within(lab).getByRole("switch", { name: "Blend frames" }).getAttribute("aria-checked")).toBe("true");

  fireEvent.click(within(lab).getByRole("button", { name: "Reset" }));
  await act(async () => {});

  expect(saved()).toEqual({ blend: "off", pacing: "catch-up", tilt: "off" });
  expect(within(lab).queryByRole("button", { name: "Reset" })).toBeNull();
});

it("picks a value of a longer experiment", async () => {
  const { saved } = openLab({ stored: { pacing: "drop" } });
  const lab = await screen.findByRole("region", { name: "Lab" });
  const pacing = within(lab).getByRole("radiogroup", { name: "Pacing" });
  expect(within(pacing).getByRole("radio", { name: "drop" }).getAttribute("aria-checked")).toBe("true");

  fireEvent.click(within(pacing).getByRole("radio", { name: "spread" }));
  await act(async () => {});

  expect(saved()).toEqual({ blend: "off", pacing: "spread", tilt: "off" });
  expect(within(lab).getByRole("button", { name: "Reset" })).toBeTruthy();
});

it("names values by their labels", async () => {
  const blend: Experiment = {
    id: "blend",
    label: "Blend frames",
    line: "Blends skipped frames.",
    values: ["off", "lastTwo", "all"],
    labels: { off: "Off", lastTwo: "Last 2", all: "All" },
    players: true,
  };
  const { saved } = openLab({ experiments: [blend] });
  const lab = await screen.findByRole("region", { name: "Lab" });

  fireEvent.click(within(lab).getByRole("radio", { name: "Last 2" }));
  await act(async () => {});

  expect(saved()).toEqual({ blend: "lastTwo" });
});

it("shows a change that couldn't be saved", async () => {
  const { host } = openLab();
  host.save = async () => {
    throw new Error("disk full");
  };
  const lab = await screen.findByRole("region", { name: "Lab" });

  fireEvent.click(within(lab).getByRole("switch", { name: "Blend frames" }));

  expect(await within(lab).findByText("Error: disk full")).toBeTruthy();
});

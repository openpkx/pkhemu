import type { ReactNode } from "react";
import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { Experiment } from "./experiments";
import { ExperimentsProvider, useExperiment, useExperiments, type ExperimentsHost } from "./lab";
import { fakePlus } from "@/plus/fakePlus";
import { PlusProvider, type PlusStatus } from "@/plus/plus";

afterEach(cleanup);

const registry: Experiment[] = [
  { id: "blend", label: "Blend frames", line: "Blends skipped frames.", values: ["off", "on"], players: true },
  { id: "pacing", label: "Pacing", line: "How owed frames run.", values: ["catch-up", "drop", "spread"], players: false },
];

function fakeStore(stored: unknown = {}) {
  let saved = stored;
  const host: ExperimentsHost = {
    load: async () => saved,
    save: async (values) => {
      saved = values;
    },
  };
  const wrapper = (plus?: ReturnType<typeof fakePlus>) =>
    function Wrapper({ children }: { children: ReactNode }) {
      const experiments = (
        <ExperimentsProvider host={host} registry={registry}>
          {children}
        </ExperimentsProvider>
      );
      return plus ? <PlusProvider host={plus.host}>{experiments}</PlusProvider> : experiments;
    };
  return {
    host,
    saved: () => saved,
    launch: (plus?: ReturnType<typeof fakePlus>) => renderHook(useExperiments, { wrapper: wrapper(plus) }),
  };
}

it("starts every experiment at its first value", async () => {
  const { launch } = fakeStore();

  const { result } = launch();

  await waitFor(() => expect(result.current.values).toEqual({ blend: "off", pacing: "catch-up" }));
});

it("keeps changes across restarts", async () => {
  const { launch } = fakeStore();
  const first = launch();
  await waitFor(() => expect(first.result.current).not.toBeNull());

  await act(() => first.result.current.change("pacing", "spread"));
  first.unmount();
  const { result } = launch();

  await waitFor(() => expect(result.current.values).toEqual({ blend: "off", pacing: "spread" }));
});

it("ignores stored ids and values the registry doesn't know", async () => {
  const { launch } = fakeStore({ blend: "sometimes", pacing: "drop", removed: "on" });

  const { result } = launch();

  await waitFor(() => expect(result.current.values).toEqual({ blend: "off", pacing: "drop" }));
});

it.each([["nothing", undefined], ["text", "on"], ["a list", ["on"]]])("ignores a stored %s", async (_, stored) => {
  const { launch } = fakeStore(stored);

  const { result } = launch();

  await waitFor(() => expect(result.current.values).toEqual({ blend: "off", pacing: "catch-up" }));
});

it("drops ids the registry doesn't know when it saves", async () => {
  const { launch, saved } = fakeStore({ removed: "on" });
  const { result } = launch();
  await waitFor(() => expect(result.current).not.toBeNull());

  await act(() => result.current.change("blend", "on"));

  expect(saved()).toEqual({ blend: "on", pacing: "catch-up" });
});

it("re-renders a component that reads an experiment when it changes", async () => {
  const { host } = fakeStore();
  let change: ReturnType<typeof useExperiments>["change"] = async () => {};
  function Reader() {
    change = useExperiments().change;
    return <p>blend {useExperiment("blend")}</p>;
  }
  render(
    <ExperimentsProvider host={host} registry={registry}>
      <Reader />
    </ExperimentsProvider>,
  );
  expect(await screen.findByText("blend off")).toBeTruthy();

  await act(() => change("blend", "on"));

  expect(screen.getByText("blend on")).toBeTruthy();
});

const reporting = (status: PlusStatus) => fakePlus({ status });

it.each([
  ["without Plus", { state: "notOwned", price: "$3.99" }],
  ["with the Plus switch off", { state: "unavailable" }],
] as const)("runs every experiment at its first value in a store build %s", async (_, status) => {
  const { launch } = fakeStore({ blend: "on", pacing: "drop" });

  const { result } = launch(reporting(status));
  await act(async () => {});

  expect(result.current.values).toEqual({ blend: "off", pacing: "catch-up" });
  expect(result.current.shown).toEqual([]);
});

it("runs only the player experiments for a Plus owner in a store build", async () => {
  const { launch } = fakeStore({ blend: "on", pacing: "drop" });

  const { result } = launch(reporting({ state: "owned" }));

  await waitFor(() => expect(result.current.values).toEqual({ blend: "on", pacing: "catch-up" }));
  expect(result.current.shown.map(({ id }) => id)).toEqual(["blend"]);
});

it("runs every experiment at its first value after a refund", async () => {
  const { launch } = fakeStore({ blend: "on" });
  const plus = reporting({ state: "owned" });
  const { result } = launch(plus);
  await waitFor(() => expect(result.current.values.blend).toBe("on"));

  act(() => plus.report({ state: "notOwned", price: "$3.99" }));

  expect(result.current.values.blend).toBe("off");
  expect(result.current.shown).toEqual([]);
});

it("runs every experiment as stored in a build that isn't a store build", async () => {
  const { launch } = fakeStore({ blend: "on", pacing: "drop" });

  const { result } = launch(reporting({ state: "unlocked" }));

  await waitFor(() => expect(result.current.values).toEqual({ blend: "on", pacing: "drop" }));
  expect(result.current.shown).toEqual(registry);
});

it("falls back to the first values when the store can't be read", async () => {
  const { host, launch } = fakeStore();
  host.load = async () => {
    throw new Error("corrupt store");
  };

  const { result } = launch();

  await waitFor(() => expect(result.current.values).toEqual({ blend: "off", pacing: "catch-up" }));
});

it("reports a change that couldn't be saved and keeps it for this session", async () => {
  const { host, launch } = fakeStore();
  host.save = async () => {
    throw new Error("disk full");
  };
  const { result } = launch();
  await waitFor(() => expect(result.current).not.toBeNull());

  await act(() => result.current.change("blend", "on"));

  expect(result.current.values.blend).toBe("on");
  expect(result.current.error).toBe("Error: disk full");
});

import { act, cleanup, render, screen } from "@testing-library/react";
import { createEngine, type EngineHost } from "@pkhex-everywhere/engine";
import { EngineProvider } from "@pkhex-everywhere/react";
import { afterEach, expect, it, vi } from "vitest";
import { Status } from "./Status";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async () => ({ name: "mGBA", version: "0.10.5" })),
}));

afterEach(cleanup);

function renderWithHost() {
  let start!: () => void;
  const started = new Promise<void>((resolve) => (start = resolve));
  const host: EngineHost = {
    ready: () => started,
    onChange: () => {},
    onEvent: () => {},
    getAssemblyExports: async () => ({
      PKHeX: { Everywhere: { Engine: { EngineExports: { Call: async () => "null" } } } },
    }),
  };
  render(
    <EngineProvider engine={createEngine({ host })}>
      <Status />
    </EngineProvider>,
  );
  return { start };
}

it("reports the engine ready once its runtime starts", async () => {
  const { start } = renderWithHost();
  expect(screen.getByTestId("engine").dataset.state).toBe("booting");

  await act(async () => start());

  expect(screen.getByTestId("engine").dataset.state).toBe("ready");
});

it("shows the linked core's name and version", async () => {
  renderWithHost();

  expect(await screen.findByText("mGBA 0.10.5")).toBeTruthy();
});

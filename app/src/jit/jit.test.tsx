import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { fakePlus } from "@/plus/fakePlus";
import { PlusProvider, type PlusStatus } from "@/plus/plus";
import { fakeJit } from "./fakeJit";
import { JitProvider } from "./jit";
import { JitSettings } from "./JitSettings";

afterEach(cleanup);

function show({ jit = fakeJit(), status = { state: "unlocked", sideload: true } as PlusStatus } = {}) {
  render(
    <PlusProvider host={fakePlus({ status }).host}>
      <JitProvider host={jit.host}>
        <JitSettings />
      </JitProvider>
    </PlusProvider>,
  );
  return jit;
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  act(() => void document.dispatchEvent(new Event("visibilitychange")));
}

it("opens StikDebug from the sideload build while JIT is off", async () => {
  const jit = show();

  fireEvent.click(await screen.findByRole("button", { name: "Enable JIT" }));

  expect(jit.host.enable).toHaveBeenCalledOnce();
});

it("offers nothing to turn on once JIT is on", async () => {
  show({ jit: fakeJit({ on: true }) });

  await screen.findByRole("region", { name: "JIT" });
  expect(screen.queryByRole("button", { name: "Enable JIT" })).toBeNull();
});

it("leaves JIT out of every other build", async () => {
  const jit = fakeJit();
  for (const status of [{ state: "unlocked" }, { state: "owned" }] as PlusStatus[]) {
    show({ jit, status });
    await waitFor(() => expect(screen.queryByRole("region", { name: "JIT" })).toBeNull());
    cleanup();
  }
  expect(jit.host.on).not.toHaveBeenCalled();
  expect(jit.host.pairingFile).not.toHaveBeenCalled();
});

it("checks again when the player comes back from StikDebug", async () => {
  const jit = show();
  fireEvent.click(await screen.findByRole("button", { name: "Enable JIT" }));

  setVisibility("hidden");
  jit.turnOn();
  setVisibility("visible");

  await waitFor(() => expect(screen.queryByRole("button", { name: "Enable JIT" })).toBeNull());
});

it("says why StikDebug didn't open", async () => {
  const jit = fakeJit();
  jit.host.enable.mockRejectedValueOnce("StikDebug isn't installed");
  show({ jit });

  fireEvent.click(await screen.findByRole("button", { name: "Enable JIT" }));

  expect(await screen.findByText("StikDebug isn't installed")).toBeTruthy();
});

it("imports a pairing file beside the StikDebug button", async () => {
  const jit = show();

  fireEvent.click(await screen.findByRole("button", { name: "Import pairing file" }));

  expect(jit.host.importPairingFile).toHaveBeenCalledOnce();
  expect(await screen.findByRole("button", { name: "Remove" })).toBeTruthy();
});

it("offers to replace a pairing file set earlier", async () => {
  show({ jit: fakeJit({ pairingFile: true }) });

  expect(await screen.findByRole("button", { name: "Remove" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Import pairing file" })).toBeTruthy();
});

it("keeps showing a pairing file once JIT is on", async () => {
  show({ jit: fakeJit({ on: true, pairingFile: true }) });

  expect(await screen.findByRole("button", { name: "Remove" })).toBeTruthy();
});

it("leaves things as they were when the picker is cancelled", async () => {
  const jit = fakeJit();
  jit.host.importPairingFile.mockResolvedValueOnce(false);
  show({ jit });

  fireEvent.click(await screen.findByRole("button", { name: "Import pairing file" }));

  await waitFor(() => expect(jit.host.importPairingFile).toHaveBeenCalledOnce());
  expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
});

it("says why a pairing file was rejected", async () => {
  const jit = fakeJit();
  jit.host.importPairingFile.mockRejectedValueOnce("iPhone.plist is missing HostID.");
  show({ jit });

  fireEvent.click(await screen.findByRole("button", { name: "Import pairing file" }));

  expect(await screen.findByText("iPhone.plist is missing HostID.")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Import pairing file" })).toBeTruthy();
});

it("removes the pairing file", async () => {
  const jit = show({ jit: fakeJit({ pairingFile: true }) });

  fireEvent.click(await screen.findByRole("button", { name: "Remove" }));

  await waitFor(() => expect(screen.queryByRole("button", { name: "Remove" })).toBeNull());
  expect(jit.host.removePairingFile).toHaveBeenCalledOnce();
});

it("turns JIT on inside the app once a pairing file is set", async () => {
  const jit = show({ jit: fakeJit({ pairingFile: true }) });

  fireEvent.click(await screen.findByRole("button", { name: "Turn on JIT" }));

  await waitFor(() => expect(screen.queryByRole("button", { name: "Turn on JIT" })).toBeNull());
  expect(jit.host.turnOn).toHaveBeenCalledOnce();
  expect(jit.host.enable).not.toHaveBeenCalled();
});

it("keeps StikDebug next to the in-app button", async () => {
  const jit = show({ jit: fakeJit({ pairingFile: true }) });

  fireEvent.click(await screen.findByRole("button", { name: "Use StikDebug" }));

  expect(jit.host.enable).toHaveBeenCalledOnce();
});

it("needs a pairing file to turn JIT on inside the app", async () => {
  show();

  await screen.findByRole("button", { name: "Enable JIT" });
  expect(screen.queryByRole("button", { name: "Turn on JIT" })).toBeNull();
});

it("holds the buttons while JIT turns on", async () => {
  const jit = fakeJit({ pairingFile: true });
  let finish = (_on: boolean) => {};
  jit.host.turnOn.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
  show({ jit });

  fireEvent.click(await screen.findByRole("button", { name: "Turn on JIT" }));

  const working = await screen.findByRole("button", {
    name: "Turning on JIT…",
  });
  expect((working as HTMLButtonElement).disabled).toBe(true);
  await act(async () => finish(true));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Turning on JIT…" })).toBeNull());
});

it("says why JIT didn't turn on inside the app", async () => {
  const jit = fakeJit({ pairingFile: true });
  jit.host.turnOn.mockRejectedValueOnce("Can't reach the iPhone. Turn LocalDevVPN on and try again.");
  show({ jit });

  fireEvent.click(await screen.findByRole("button", { name: "Turn on JIT" }));

  expect(await screen.findByText("Can't reach the iPhone. Turn LocalDevVPN on and try again.")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Turn on JIT" })).toBeTruthy();
});

it("points to StikDebug when SideStore removed the helper", async () => {
  show({ jit: fakeJit({ pairingFile: true, helper: "removed" }) });

  await screen.findByRole("button", { name: "Enable JIT" });
  expect(screen.queryByRole("button", { name: "Turn on JIT" })).toBeNull();
  expect(screen.getByText(/SideStore/)).toBeTruthy();
});

it("offers only StikDebug where the helper can't start", async () => {
  show({ jit: fakeJit({ pairingFile: true, helper: "unavailable" }) });

  await screen.findByRole("button", { name: "Enable JIT" });
  expect(screen.queryByRole("button", { name: "Turn on JIT" })).toBeNull();
  expect(screen.queryByText(/SideStore/)).toBeNull();
});

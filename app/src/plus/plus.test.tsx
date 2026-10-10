import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { fakePlus } from "./fakePlus";
import { PlusProvider, usePlus, type Plus, type PlusStatus } from "./plus";

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
}

afterEach(() => {
  cleanup();
  setVisibility("visible");
});

async function start(plus = fakePlus()) {
  const current: { plus?: Plus } = {};
  function Probe() {
    current.plus = usePlus();
    return null;
  }
  render(
    <PlusProvider host={plus.host}>
      <Probe />
    </PlusProvider>,
  );
  await act(async () => {});
  return { ...plus, current };
}

it.each<PlusStatus>([
  { state: "unlocked" },
  { state: "owned" },
  { state: "notOwned", price: "$3.99" },
  { state: "unavailable" },
])("reports $state from the host", async (status) => {
  const { current } = await start(fakePlus({ status }));

  expect(current.plus!.status).toEqual(status);
});

it("is unlocked without a host", async () => {
  const current: { plus?: Plus } = {};
  function Probe() {
    current.plus = usePlus();
    return null;
  }
  render(<Probe />);

  expect(current.plus!.status).toEqual({ state: "unlocked" });
});

it("buying moves not owned to owned", async () => {
  const { current } = await start();

  let bought;
  await act(async () => {
    bought = await current.plus!.buy();
  });

  expect(bought).toBe("purchased");
  expect(current.plus!.status).toEqual({ state: "owned" });
});

it("a pending purchase stays not owned", async () => {
  const { current } = await start(fakePlus({ buys: "pending" }));

  await act(async () => void (await current.plus!.buy()));

  expect(current.plus!.status).toEqual({ state: "notOwned", price: "$3.99" });
});

it("restoring reports what the store says the player owns", async () => {
  const { current } = await start(fakePlus({ owned: true }));

  await act(() => current.plus!.restore());

  expect(current.plus!.status).toEqual({ state: "owned" });
});

it("follows a change the store reports later", async () => {
  const { current, report } = await start();

  act(() => report({ state: "owned" }));

  expect(current.plus!.status).toEqual({ state: "owned" });
});

it("asks the store again when the app returns to the foreground", async () => {
  const { current, host } = await start(fakePlus({ status: { state: "owned" } }));
  host.status.mockResolvedValueOnce({ state: "notOwned", price: "$3.99" });

  await act(async () => setVisibility("visible"));

  expect(host.status).toHaveBeenCalledTimes(2);
  expect(current.plus!.status).toEqual({ state: "notOwned", price: "$3.99" });
});

it("doesn't ask the store when the app goes to the background", async () => {
  const { host } = await start();

  await act(async () => setVisibility("hidden"));

  expect(host.status).toHaveBeenCalledTimes(1);
});

it("keeps the status when asking the store again fails", async () => {
  const { current, host } = await start(fakePlus({ status: { state: "owned" } }));
  host.status.mockRejectedValueOnce(new Error("offline"));
  const error = vi.spyOn(console, "error").mockImplementation(() => {});

  await act(async () => setVisibility("visible"));

  expect(host.status).toHaveBeenCalledTimes(2);
  expect(current.plus!.status).toEqual({ state: "owned" });
  error.mockRestore();
});

it("ignores an answer overtaken by a newer one", async () => {
  const { current, host } = await start();
  let answerLate!: (status: PlusStatus) => void;
  host.status.mockReturnValueOnce(new Promise((resolve) => (answerLate = resolve)));
  host.status.mockResolvedValueOnce({ state: "owned" });

  await act(async () => setVisibility("visible"));
  await act(async () => setVisibility("visible"));
  await act(async () => answerLate({ state: "notOwned", price: "$3.99" }));

  expect(current.plus!.status).toEqual({ state: "owned" });
});

it("ignores an answer overtaken by a status the store reports", async () => {
  const { current, host, report } = await start();
  let answerLate!: (status: PlusStatus) => void;
  host.status.mockReturnValueOnce(new Promise((resolve) => (answerLate = resolve)));

  await act(async () => setVisibility("visible"));
  act(() => report({ state: "owned" }));
  await act(async () => answerLate({ state: "notOwned", price: "$3.99" }));

  expect(current.plus!.status).toEqual({ state: "owned" });
});

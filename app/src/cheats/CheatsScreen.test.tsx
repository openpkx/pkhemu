import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BackProvider } from "@/back/back";
import { desktopBackHost } from "@/back/desktopHost";
import { fakePads, padButtons } from "@/input/fakePads";
import { createInput } from "@/input/input";
import { CheatsScreen } from "./CheatsScreen";
import { fakeCheats } from "./fakeCheats";

const { a: A, b: B, down: DOWN, right: RIGHT } = padButtons;
const VBA = "02000000:01";
const VBA_REASON = "VBA codes like AAAAAAAA:VV don't work here.";

let pads: ReturnType<typeof fakePads>;

beforeEach(() => {
  pads = fakePads();
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function launch(host = fakeCheats()) {
  const onBack = vi.fn();
  render(
    <BackProvider host={desktopBackHost}>
      <CheatsScreen host={host} folder="/games" path="gba/Emerald.gba" system="gba" input={createInput(pads.gamepads)} onBack={onBack} />
    </BackProvider>,
  );
  pads.hold();
  await act(async () => {});
  return { host, onBack };
}

const toggle = (name: string) => screen.getByRole<HTMLButtonElement>("switch", { name });
const row = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) });
const form = () => screen.queryByRole("dialog");
const field = (name: string) => within(form()!).getByRole<HTMLInputElement>("textbox", { name });

async function click(element: HTMLElement) {
  fireEvent.click(element);
  await act(async () => {});
}

async function choose(name: string) {
  await click(screen.getByRole("button", { name }));
}

async function fill(name: string, code: string) {
  fireEvent.change(field("Name"), { target: { value: name } });
  fireEvent.change(field("Code"), { target: { value: code } });
  await click(within(form()!).getByRole("button", { name: "Save" }));
}

it("lists the game's codes with a switch each", async () => {
  await launch(fakeCheats([{ name: "Infinite money", code: "82025838 FFFF" }, { name: "Walk through walls", code: "82000000 1234", on: false }]));

  expect(toggle("Infinite money").getAttribute("aria-checked")).toBe("true");
  expect(toggle("Walk through walls").getAttribute("aria-checked")).toBe("false");
});

it("turns a code on with the toggle command", async () => {
  const { host } = await launch(fakeCheats([{ name: "Infinite money", code: "82025838 FFFF", on: false }]));

  await click(toggle("Infinite money"));

  expect(host.toggleCheat).toHaveBeenCalledWith("/games", "gba/Emerald.gba", "id-1", true);
  expect(toggle("Infinite money").getAttribute("aria-checked")).toBe("true");
});

it("shows a code added with a blank name by the name the backend gives it", async () => {
  const { host } = await launch();

  await choose("Add code");
  await fill("", "82025838 FFFF");

  expect(host.addCheat).toHaveBeenCalledWith("/games", "gba/Emerald.gba", "", "82025838 FFFF");
  expect(form()).toBeNull();
  expect(toggle("Code 1").getAttribute("aria-checked")).toBe("true");
});

it("shows why the backend rejected a code as it's saved, and keeps it off", async () => {
  await launch(fakeCheats([], { [VBA]: VBA_REASON }));

  await choose("Add code");
  await fill("Rare candies", VBA);

  expect(within(form()!).getByText(VBA_REASON)).toBeTruthy();
  expect(field("Code").getAttribute("aria-invalid")).toBe("true");
  await click(within(form()!).getByRole("button", { name: "Cancel" }));

  expect(row("Rare candies").textContent).toContain(VBA_REASON);
  expect(toggle("Rare candies").getAttribute("aria-checked")).toBe("false");
  expect(toggle("Rare candies").disabled).toBe(true);
});

it("edits the rejected code rather than adding it again when it's fixed", async () => {
  const { host } = await launch(fakeCheats([], { [VBA]: VBA_REASON }));
  await choose("Add code");
  await fill("Rare candies", VBA);

  await fill("Rare candies", "02000000 0001");

  expect(host.addCheat).toHaveBeenCalledTimes(1);
  expect(host.editCheat).toHaveBeenCalledWith("/games", "gba/Emerald.gba", "id-1", "Rare candies", "02000000 0001");
  expect(form()).toBeNull();
  expect(toggle("Rare candies").disabled).toBe(false);
});

it("edits a code from its row", async () => {
  const { host } = await launch(fakeCheats([{ name: "Infinite money", code: "82025838 FFFF" }]));

  await click(row("Infinite money"));
  expect(field("Name").value).toBe("Infinite money");
  expect(field("Code").value).toBe("82025838 FFFF");
  await fill("Lots of money", "82025838 FFFF");

  expect(host.editCheat).toHaveBeenCalledWith("/games", "gba/Emerald.gba", "id-1", "Lots of money", "82025838 FFFF");
  expect(toggle("Lots of money")).toBeTruthy();
});

it("can't save a blank code", async () => {
  await launch();

  await choose("Add code");
  fireEvent.change(field("Name"), { target: { value: "Nothing" } });

  expect(within(form()!).getByRole<HTMLButtonElement>("button", { name: "Save" }).disabled).toBe(true);
});

it("asks before deleting a code, and cancelling keeps it", async () => {
  const { host } = await launch(fakeCheats([{ name: "Infinite money", code: "82025838 FFFF" }]));

  await choose("Delete Infinite money");
  expect(screen.getByRole("alertdialog")).toBeTruthy();
  await choose("Cancel");

  expect(host.deleteCheat).not.toHaveBeenCalled();
  expect(toggle("Infinite money")).toBeTruthy();
});

it("deletes a code once confirmed", async () => {
  const { host } = await launch(fakeCheats([{ name: "Infinite money", code: "82025838 FFFF" }]));

  await choose("Delete Infinite money");
  await choose("Delete");

  expect(host.deleteCheat).toHaveBeenCalledWith("/games", "gba/Emerald.gba", "id-1");
  expect(screen.queryByRole("switch")).toBeNull();
});

it("keeps the switch enabled while its change saves, so focus stays on it, and sends one change at a time", async () => {
  const host = fakeCheats([{ name: "Infinite money", code: "82025838 FFFF", on: false }]);
  let finish = () => {};
  host.toggleCheat.mockImplementationOnce(() => new Promise((resolve) => (finish = () => resolve([]))));
  await launch(host);

  await click(toggle("Infinite money"));
  expect(toggle("Infinite money").disabled).toBe(false);
  await click(toggle("Infinite money"));

  expect(host.toggleCheat).toHaveBeenCalledTimes(1);
  await act(async () => finish());
});

it("shows what went wrong when a command fails", async () => {
  const host = fakeCheats([{ name: "Infinite money", code: "82025838 FFFF", on: false }]);
  host.toggleCheat.mockRejectedValueOnce("That code is gone.");
  await launch(host);

  await click(toggle("Infinite money"));

  expect(screen.getByRole("alert").textContent).toBe("That code is gone.");
});

it("goes back from the header, Escape and B", async () => {
  const { onBack } = await launch();

  await choose("Back");
  fireEvent.keyDown(window, { key: "Escape" });
  pads.press(B);

  expect(onBack).toHaveBeenCalledTimes(3);
});

it("closes the form, not the list, on B", async () => {
  const { onBack } = await launch();
  await choose("Add code");

  pads.press(B);
  await act(async () => {});

  expect(form()).toBeNull();
  expect(onBack).not.toHaveBeenCalled();
});

it("turns codes on and off with a gamepad", async () => {
  const host = fakeCheats([{ name: "Infinite money", code: "82025838 FFFF", on: false }]);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.textContent === "Add code") return new DOMRect(16, 70, 120, 36);
    if (this.getAttribute("role") === "switch") return new DOMRect(300, 120, 32, 18);
    if (this.getAttribute("aria-label")?.startsWith("Delete")) return new DOMRect(340, 116, 26, 26);
    if (this.textContent?.startsWith("Infinite money")) return new DOMRect(16, 116, 270, 26);
    return new DOMRect();
  });
  await launch(host);

  pads.press(DOWN);
  pads.press(RIGHT);
  pads.press(A);
  await act(async () => {});

  expect(host.toggleCheat).toHaveBeenCalledWith("/games", "gba/Emerald.gba", "id-1", true);
});

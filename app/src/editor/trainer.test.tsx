import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EngineProvider } from "@pkhex-everywhere/react";
import type { TrainerCard } from "@pkhex-everywhere/engine";
import { afterEach, expect, it, vi } from "vitest";
import { EditorScreen } from "./EditorScreen";
import { fakeEngine } from "./fakeEngine";
import { saveHome } from "./saveHome";

afterEach(cleanup);

const card: TrainerCard = {
  id: "12345/54321",
  name: "MAY",
  maxNameLength: 7,
  gender: "female",
  money: 3000,
  battlePoints: null,
  rival: null,
};

async function openTrainer(trainer: Partial<TrainerCard> = {}) {
  const { engine } = fakeEngine({ trainer: { ...card, ...trainer } });
  const host = { read: async () => new Uint8Array([1]), apply: async () => {}, playTimeSinceSave: async () => 0 };
  render(
    <EngineProvider engine={engine}>
      <EditorScreen host={host} home={saveHome} onBackGesture={() => () => {}} onClose={() => {}} onSaveFirst={() => {}} />
    </EngineProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Trainer" }));
  await screen.findByRole("heading", { name: "Trainer" });
  return engine;
}

const name = () => screen.findByRole<HTMLInputElement>("textbox", { name: "Name" });
const money = () => screen.findByRole<HTMLInputElement>("spinbutton", { name: "Money" });

async function enter(input: Promise<HTMLInputElement>, value: string) {
  const field = await input;
  fireEvent.change(field, { target: { value } });
  fireEvent.blur(field);
}

it("shows the trainer's name, gender and money", async () => {
  await openTrainer();

  expect((await name()).value).toBe("MAY");
  expect((await name()).maxLength).toBe(7);
  expect(screen.getByRole("radio", { name: "Female" }).getAttribute("aria-checked")).toBe("true");
  expect((await money()).value).toBe("3000");
});

it("changes the name", async () => {
  const engine = await openTrainer();

  await enter(name(), "LEAF");

  await waitFor(async () => expect((await engine.trainer.get()).name).toBe("LEAF"));
  expect(await screen.findByRole("button", { name: "Apply and restart" })).toBeTruthy();
  expect((await name()).value).toBe("LEAF");
});

it("puts the name back when it's left empty", async () => {
  const engine = await openTrainer();

  await enter(name(), "");

  expect((await name()).value).toBe("MAY");
  expect((await engine.trainer.get()).name).toBe("MAY");
});

it("changes the gender", async () => {
  const engine = await openTrainer();

  fireEvent.click(await screen.findByRole("radio", { name: "Male" }));

  await waitFor(async () => expect((await engine.trainer.get()).gender).toBe("male"));
  expect(screen.getByRole("radio", { name: "Male" }).getAttribute("aria-checked")).toBe("true");
});

it("changes the money", async () => {
  const engine = await openTrainer();

  await enter(money(), "123456");

  await waitFor(async () => expect((await engine.trainer.get()).money).toBe(123456));
  expect((await money()).value).toBe("123456");
});

it("keeps the money within what the engine accepts", async () => {
  const engine = await openTrainer();

  await enter(money(), "5000000");

  await waitFor(async () => expect((await engine.trainer.get()).money).toBe(999999));
  expect((await money()).value).toBe("999999");
});

it("puts the money back when it isn't a number", async () => {
  const engine = await openTrainer();

  await enter(money(), "");

  expect((await money()).value).toBe("3000");
  expect((await engine.trainer.get()).money).toBe(3000);
});

it("leaves money out when the save has none", async () => {
  await openTrainer({ money: null });

  await name();
  expect(screen.queryByRole("spinbutton", { name: "Money" })).toBeNull();
});

it("leaves gender out when the game has none", async () => {
  await openTrainer({ gender: null });

  await name();
  expect(screen.queryByRole("radio", { name: "Female" })).toBeNull();
});

it("says why a change didn't go through and puts the value back", async () => {
  const engine = await openTrainer();
  vi.spyOn(engine.trainer, "setName").mockRejectedValue("the name has a character the game can't show");

  await enter(name(), "LÉAF");

  expect(await screen.findByText(/can't show/)).toBeTruthy();
  expect((await name()).value).toBe("MAY");
});

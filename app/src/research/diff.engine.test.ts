// @vitest-environment node
import { expect, it } from "vitest";
import { diffSpaces } from "./diff";
import { knownLayouts, pickLayout } from "./layout";
import { decodeSpaces } from "./spaces";
import { findSave, testEngine } from "@/testing/research";

it.for(["emerald", "frlg", "rs"])("shows the money a %s save spent on a Poké Ball as a known change", { timeout: 300_000 }, async (format, { skip }) => {
  const engine = testEngine();
  const found = await findSave(engine, format);
  if (!found) return skip(`needs a ${format} save in data/saves/`);

  await engine.game.load(found.save);
  const before = (await engine.game.export()).bytes;
  const { money } = await engine.trainer.get();
  if (!money) return skip(`${found.path} has no money to spend`);
  await engine.trainer.setMoney(money - 200);
  const balls = (await engine.inventory.get()).find(({ name }) => name === "Balls")!;
  const count = (itemId: number) => balls.items.find(({ index }) => index === itemId)?.count ?? 0;
  const ball = [4, 3, 2].find((itemId) => count(itemId) < 99)!;
  await engine.inventory.setItem({ pouch: "Balls", itemId: ball }, count(ball) + 1);
  const after = (await engine.game.export()).bytes;

  const { layout } = pickLayout(await knownLayouts(), { format, romSha1: "" })!;
  const changes = diffSpaces(decodeSpaces(before, layout), decodeSpaces(after, layout));

  const known = changes.flatMap(({ space, known }) => known.map(({ name }) => `${space.name} ${name}`));
  expect(known).toContain("section:1 Money");
  expect(known.some((name) => name.startsWith("section:1 Poké Balls pocket"))).toBe(true);
  expect(changes.flatMap(({ candidates }) => candidates)).toEqual([]);
});

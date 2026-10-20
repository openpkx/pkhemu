// @vitest-environment node
import { expect, it } from "vitest";
import { diffReadings } from "@/research/diff";
import { findSave, testEngine } from "@/testing/research";
import { readSave } from "./reading";

it("finds an Unbound item the engine can't name, bought between two saves, as a value candidate", { timeout: 300_000 }, async ({ skip }) => {
  const engine = testEngine();
  const found = await findSave(engine, "unbound");
  if (!found) return skip("needs an Unbound save in data/saves/");

  await engine.game.load(found.save);
  const items = (await engine.inventory.get()).find(({ name }) => name === "Items")!.items;
  const [kept, bought] = items.filter(({ isUnknown, count, maxCount }) => isUnknown && count < maxCount);
  if (!bought) return skip(`${found.path} needs two unknown items in its Items pocket`);
  await engine.trainer.setMoney(2800);
  await engine.inventory.setItem({ pouch: "Items", itemId: kept.id }, kept.count + 1);
  const after = (await engine.game.export()).bytes;
  await engine.trainer.setMoney(3000);
  await engine.inventory.setItem({ pouch: "Items", itemId: kept.id }, kept.count);
  await engine.inventory.setItem({ pouch: "Items", itemId: bought.id }, 0);
  const before = (await engine.game.export()).bytes;
  await engine.game.close();

  const values = diffReadings(await readSave(engine, before, "unbound"), await readSave(engine, after, "unbound"));

  expect(values).toEqual([
    expect.objectContaining({ kind: "value", domain: "item", index: bought.index, pocket: "Items", before: 0, after: bought.count }),
    expect.objectContaining({ kind: "value", domain: "item", index: kept.index, pocket: "Items", before: kept.count, after: kept.count + 1 }),
  ]);
});

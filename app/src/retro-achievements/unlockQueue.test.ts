import { expect, it } from "vitest";
import { advance, arrive, emptyQueue, finish, type Arrival, type Shown, type UnlockQueue } from "./unlockQueue";

const unlock = (id: number): Arrival => ({
  kind: "unlock",
  unlock: { id, title: `Achievement ${id}`, description: "", points: 10, badge: `${id}` },
});

const completion: Arrival = { kind: "completion", completion: { game: "Emerald", points: 1240, badge: "", hardcore: true } };

function name(shown: Shown) {
  if (shown.kind === "unlock") return shown.unlock.title;
  if (shown.kind === "completion") return `Completed ${shown.completion.game}`;
  return `+${shown.count} more`;
}

function played(queue: UnlockQueue) {
  const shown: string[] = [];
  for (let next = advance(queue); next.showing; next = advance(finish(next, next.showing.key))) {
    shown.push(name(next.showing));
  }
  return shown;
}

it("plays unlocks one at a time in the order they came", () => {
  const queue = [1, 2, 3].map(unlock).reduce(arrive, emptyQueue);

  expect(played(queue)).toEqual(["Achievement 1", "Achievement 2", "Achievement 3"]);
});

it("plays the first of five waiting, then folds the rest into one", () => {
  const queue = [1, 2, 3, 4, 5].map(unlock).reduce(arrive, emptyQueue);

  expect(played(queue)).toEqual(["Achievement 1", "+4 more"]);
});

it("folds four that arrive while one plays, counting the one playing as the first", () => {
  let queue = advance(arrive(emptyQueue, unlock(1)));
  queue = [2, 3, 4, 5].map(unlock).reduce(arrive, queue);

  expect(played(finish(queue, queue.showing!.key))).toEqual(["+4 more"]);
});

it("plays three that arrive while one plays one at a time", () => {
  let queue = advance(arrive(emptyQueue, unlock(1)));
  queue = [2, 3, 4].map(unlock).reduce(arrive, queue);

  expect(played(finish(queue, queue.showing!.key))).toEqual(["Achievement 2", "Achievement 3", "Achievement 4"]);
});

it("plays a completion after the unlocks folded before it", () => {
  const queue = [...[1, 2, 3, 4, 5].map(unlock), completion].reduce(arrive, emptyQueue);

  expect(played(queue)).toEqual(["Achievement 1", "+4 more", "Completed Emerald"]);
});

it("counts only unlocks towards folding", () => {
  let queue = advance(arrive(emptyQueue, unlock(1)));
  queue = [unlock(2), unlock(3), unlock(4), completion].reduce(arrive, queue);

  expect(played(finish(queue, queue.showing!.key))).toEqual([
    "Achievement 2",
    "Achievement 3",
    "Achievement 4",
    "Completed Emerald",
  ]);
});

it("starts nothing new while one is showing", () => {
  const queue = advance(arrive(emptyQueue, unlock(1)));

  expect(advance(arrive(queue, unlock(2))).showing).toBe(queue.showing);
});

it("ignores finishing one that isn't showing", () => {
  const queue = advance(arrive(emptyQueue, unlock(1)));

  expect(finish(queue, queue.showing!.key + 1)).toBe(queue);
});

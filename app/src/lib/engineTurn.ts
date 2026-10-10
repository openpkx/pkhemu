let engineTurn: Promise<unknown> = Promise.resolve();

// The engine holds one save at a time, so everything that loads one takes turns.
export function inTurn<T>(task: () => Promise<T>): Promise<T> {
  const run = engineTurn.then(task, task);
  engineTurn = run.catch(() => {});
  return run;
}

import { act } from "@testing-library/react";
import type { BackHost } from "./back";

export function fakeBackHost() {
  let press: (() => void) | undefined;
  let exits = 0;
  const host: BackHost = {
    listen(handler) {
      press = handler;
      return () => (press = undefined);
    },
    exit: () => void exits++,
  };
  return {
    host,
    press: () => act(() => press?.()),
    exits: () => exits,
    listening: () => press !== undefined,
  };
}

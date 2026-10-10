import { act } from "@testing-library/react";
import { vi } from "vitest";

export const padButtons = { b: 0, a: 1, up: 12, down: 13, left: 14, right: 15 } as const;

type PadState = { id: string; mapping: GamepadMappingType; pressed: readonly number[]; axes: number[] };

export function fakePads() {
  const connected: PadState[] = [];
  const frame = () => act(() => void vi.advanceTimersToNextFrame());

  function connect({
    id = "Standard Pad",
    mapping = "standard",
    axes = [0, 0, 0, 0],
  }: { id?: string; mapping?: GamepadMappingType; axes?: readonly number[] } = {}) {
    const state: PadState = { id, mapping, pressed: [], axes: [...axes] };
    const resting = [...axes];
    connected.push(state);
    const pad = {
      hold(...pressed: number[]) {
        state.pressed = pressed;
        frame();
      },
      press(button: number) {
        pad.hold(button);
        pad.hold();
      },
      move(axis: number, value: number) {
        state.axes[axis] = value;
        frame();
      },
      flick(axis: number, value: number) {
        pad.move(axis, value);
        pad.move(axis, resting[axis]);
      },
    };
    return pad;
  }

  let main: ReturnType<typeof connect> | undefined;
  return {
    gamepads: () =>
      connected.map(
        ({ id, mapping, pressed, axes }, index) =>
          ({
            id,
            index,
            mapping,
            connected: true,
            axes: [...axes],
            buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), touched: false, value: 0 })),
          }) as unknown as Gamepad,
      ),
    connect,
    hold: (...pressed: number[]) => (main ??= connect()).hold(...pressed),
    press: (button: number) => (main ??= connect()).press(button),
  };
}

import { useState, type ReactNode } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { OnBackGesture } from "@/backGesture";
import { BackProvider, useBack, useBackGesture, useGoBack, type BackHost } from "./back";
import { desktopBackHost } from "./desktopHost";

afterEach(cleanup);

function fakeHost() {
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

function Screen({ onBack, children }: { onBack: (() => void) | undefined; children?: ReactNode }) {
  useBack(onBack);
  return <>{children}</>;
}

it("exits when no screen handles back", () => {
  const back = fakeHost();
  render(<BackProvider host={back.host}>library</BackProvider>);

  back.press();

  expect(back.exits()).toBe(1);
});

it("sends back to the screen that handles it instead of exiting", () => {
  const back = fakeHost();
  const presses: string[] = [];
  render(
    <BackProvider host={back.host}>
      <Screen onBack={() => presses.push("game")} />
    </BackProvider>,
  );

  back.press();

  expect(presses).toEqual(["game"]);
  expect(back.exits()).toBe(0);
});

it("sends back to the innermost screen only", () => {
  const back = fakeHost();
  const presses: string[] = [];
  render(
    <BackProvider host={back.host}>
      <Screen onBack={() => presses.push("game")}>
        <Screen onBack={() => presses.push("pause menu")} />
      </Screen>
    </BackProvider>,
  );

  back.press();

  expect(presses).toEqual(["pause menu"]);
});

it("goes back to the outer screen once the inner one closes", () => {
  const back = fakeHost();
  const presses: string[] = [];
  function Game() {
    const [paused, setPaused] = useState(false);
    return (
      <Screen onBack={() => (presses.push("game"), setPaused(true))}>
        {paused && <Screen onBack={() => (presses.push("pause menu"), setPaused(false))} />}
      </Screen>
    );
  }
  render(
    <BackProvider host={back.host}>
      <Game />
    </BackProvider>,
  );

  back.press();
  back.press();
  back.press();

  expect(presses).toEqual(["game", "pause menu", "game"]);
});

it("exits again once the screen that handled back is gone", () => {
  const back = fakeHost();
  const { rerender } = render(
    <BackProvider host={back.host}>
      <Screen onBack={() => {}} />
    </BackProvider>,
  );

  rerender(<BackProvider host={back.host}>library</BackProvider>);
  back.press();

  expect(back.exits()).toBe(1);
});

it("calls the latest handler a screen gave", () => {
  const back = fakeHost();
  const presses: number[] = [];
  const { rerender } = render(
    <BackProvider host={back.host}>
      <Screen onBack={() => presses.push(1)} />
    </BackProvider>,
  );

  rerender(
    <BackProvider host={back.host}>
      <Screen onBack={() => presses.push(2)} />
    </BackProvider>,
  );
  back.press();

  expect(presses).toEqual([2]);
});

it("stops listening when the app closes", () => {
  const back = fakeHost();
  const { unmount } = render(<BackProvider host={back.host}>library</BackProvider>);

  unmount();

  expect(back.listening()).toBe(false);
});

it("does nothing without a host, as on macOS", () => {
  render(
    <BackProvider>
      <Screen onBack={() => {}} />
    </BackProvider>,
  );
});

it("passes back on from a screen that doesn't handle it right now", () => {
  const back = fakeHost();
  const presses: string[] = [];
  render(
    <BackProvider host={back.host}>
      <Screen onBack={() => presses.push("settings")}>
        <Screen onBack={undefined} />
      </Screen>
    </BackProvider>,
  );

  back.press();

  expect(presses).toEqual(["settings"]);
});

it("sends back to a handler registered after the screens, like an overlay", () => {
  const back = fakeHost();
  const presses: string[] = [];
  let register: OnBackGesture | undefined;
  function Overlay() {
    register = useBackGesture();
    return null;
  }
  render(
    <BackProvider host={back.host}>
      <Screen onBack={() => presses.push("game")}>
        <Overlay />
      </Screen>
    </BackProvider>,
  );

  let unregister = () => {};
  act(() => void (unregister = register!(() => presses.push("editor"))));
  back.press();
  unregister();
  back.press();

  expect(presses).toEqual(["editor", "game"]);
});

it("goes back from inside the app without exiting when no screen handles it", () => {
  const back = fakeHost();
  const presses: string[] = [];
  let goBack = () => {};
  function Library({ children }: { children?: ReactNode }) {
    goBack = useGoBack();
    return <>{children}</>;
  }
  const { rerender } = render(
    <BackProvider host={back.host}>
      <Library>
        <Screen onBack={() => presses.push("settings")} />
      </Library>
    </BackProvider>,
  );

  act(goBack);
  rerender(
    <BackProvider host={back.host}>
      <Library />
    </BackProvider>,
  );
  act(goBack);

  expect(presses).toEqual(["settings"]);
  expect(back.exits()).toBe(0);
});

it("goes back with Escape on a computer", () => {
  const presses: string[] = [];
  render(
    <BackProvider host={desktopBackHost}>
      <Screen onBack={() => presses.push("settings")} />
    </BackProvider>,
  );

  fireEvent.keyDown(window, { key: "Escape" });

  expect(presses).toEqual(["settings"]);
});

it("does nothing with Escape on a computer when no screen handles it", () => {
  const presses: string[] = [];
  const { rerender } = render(
    <BackProvider host={desktopBackHost}>
      <Screen onBack={() => presses.push("settings")} />
    </BackProvider>,
  );
  rerender(<BackProvider host={desktopBackHost}>library</BackProvider>);

  fireEvent.keyDown(window, { key: "Escape" });

  expect(presses).toEqual([]);
});

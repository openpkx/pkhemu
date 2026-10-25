import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BackProvider } from "@/back/back";
import { HapticsProvider } from "@/haptics/haptics";
import { fakePlus } from "@/plus/fakePlus";
import { PlusProvider, type Bought, type PlusHost, type PlusStatus } from "@/plus/plus";
import { PreferencesProvider, type Preferences, type PreferencesHost } from "@/preferences/preferences";
import { defaultSkins, type SkinChoice } from "@/skins";
import type { System } from "@/systems";
import { SkinPicker } from "./SkinPicker";

vi.mock("@/screen", () => ({ createScreen: () => () => {} }));

let failChoosing = false;

// The provider catches save errors itself, so this makes its chooseSkin reject to cover the picker's own handling.
vi.mock("@/preferences/preferences", async (original) => {
  const actual = await original<typeof import("@/preferences/preferences")>();
  return {
    ...actual,
    usePreferences: () => {
      const state = actual.usePreferences();
      return failChoosing ? { ...state, chooseSkin: () => Promise.reject(new Error("disk full")) } : state;
    },
  };
});

const defaults: Preferences = { touchControls: true, fastForwardSpeed: 2, showFps: false, theme: "system", eventsNoticeDismissed: false, updateDismissedVersion: 0, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1, playInSilentMode: false, renderer: "automatic", skins: defaultSkins, skinHintSeen: false, screenDepth: true, screenGlass: true, asyncShaders: false, gameCubeResolution: 1 };

const CARD = 400;
let taps: number;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "setTimeout", "clearTimeout", "performance"] });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  taps = 0;
  failChoosing = false;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function storage(stored: Partial<Preferences> = {}) {
  let saved = { ...stored };
  const chooseSkin = vi.fn(async (system: System, choice: SkinChoice) => {
    saved = { ...saved, skins: { ...defaultSkins, ...saved.skins, [system]: choice } };
  });
  const host: PreferencesHost = {
    load: async () => saved,
    save: async (preferences) => {
      saved = { ...preferences, skins: saved.skins ?? defaultSkins };
    },
    chooseSkin,
  };
  return { host, chooseSkin, saved: () => saved };
}

async function open(host: PreferencesHost, system: System = "gb", plus: PlusHost = fakePlus({ status: { state: "unlocked" } }).host) {
  const onClose = vi.fn();
  const view = render(
    <PlusProvider host={plus}>
      <PreferencesProvider host={host} defaults={defaults}>
        <BackProvider>
          <HapticsProvider host={{ tap: () => void taps++ }}>
            <SkinPicker system={system} onClose={onClose} />
          </HapticsProvider>
        </BackProvider>
      </PreferencesProvider>
    </PlusProvider>,
  );
  await act(async () => {});
  return { ...view, onClose };
}

const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const shown = () => screen.getByRole("status").textContent;
const incoming = (container: HTMLElement) => container.querySelector("[data-incoming]");

function card() {
  const element = screen.getByLabelText("Preview");
  element.getBoundingClientRect = () => ({ left: 0, top: 0, width: CARD, height: 800 }) as DOMRect;
  return element;
}

function pointer(type: string, target: Element, clientX: number) {
  fireEvent(target, new PointerEvent(type, { pointerId: 1, pointerType: "touch", clientX, clientY: 300, bubbles: true }));
}

async function tapAt(x: number) {
  const target = card();
  pointer("pointerdown", target, x);
  pointer("pointerup", target, x);
  await wait(1000);
}

async function slowDrag(from: number, to: number) {
  const target = card();
  pointer("pointerdown", target, from);
  await wait(300);
  pointer("pointermove", target, to);
  await wait(300);
  pointer("pointerup", target, to);
  await wait(1000);
}

it("lifts the preview's controls by half the plastic left under its screen, as in the game", async () => {
  vi.stubGlobal("innerWidth", 390);
  vi.stubGlobal("innerHeight", 844);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private report: ResizeObserverCallback) {}
      observe() {
        this.report([{ contentRect: { width: 342, height: 400 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
      }
      disconnect() {}
    },
  );
  const { container } = await open(storage().host);

  const controls = container.querySelector('[data-part="dpad"]')!.closest<HTMLElement>("[style]")!;
  expect(controls.style.translate).toBe("0 -52px");
});

it("saves the previewed skin and look with Use this skin, then closes", async () => {
  const { host, chooseSkin } = storage();
  const { onClose } = await open(host);
  expect(screen.getByRole("button", { name: "In use" })).toHaveProperty("disabled", true);

  fireEvent.click(screen.getByRole("button", { name: "Next skin" }));
  await wait(1000);
  fireEvent.click(screen.getByRole("radio", { name: "Frosted" }));
  await wait(1000);
  expect(shown()).toBe("Classic grey");
  expect(taps).toBe(2);
  fireEvent.click(screen.getByRole("button", { name: "Use this skin" }));
  await act(async () => {});

  expect(chooseSkin).toHaveBeenCalledWith("gb", { skin: "classic-grey", look: "frosted" });
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("stays open when saving the skin fails", async () => {
  failChoosing = true;
  const { onClose } = await open(storage({ skinHintSeen: true }).host);
  fireEvent.click(screen.getByRole("button", { name: "Next skin" }));
  await wait(1000);
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});

  fireEvent.click(screen.getByRole("button", { name: "Use this skin" }));
  await act(async () => {});

  expect(logged).toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

it("closes without changing the saved skin", async () => {
  const { host, chooseSkin } = storage({ skins: { ...defaultSkins, gb: { skin: "classic-grey", look: "frosted" } } });
  const { onClose } = await open(host);
  expect(shown()).toBe("Classic grey");

  fireEvent.click(screen.getByRole("button", { name: "Next skin" }));
  await wait(1000);
  fireEvent.click(screen.getByRole("radio", { name: "Moulded" }));
  await wait(1000);
  fireEvent.click(screen.getByRole("button", { name: "Close" }));

  expect(onClose).toHaveBeenCalled();
  expect(chooseSkin).not.toHaveBeenCalled();
});

it("wraps around at both ends", async () => {
  await open(storage({ skinHintSeen: true }).host);

  fireEvent.click(screen.getByRole("button", { name: "Previous skin" }));
  await wait(1000);
  expect(shown()).toBe("Play It Loud clear");

  fireEvent.click(screen.getByRole("button", { name: "Next skin" }));
  await wait(1000);
  expect(shown()).toBe("pkhemu");
});

it("moves with the arrow keys and the dots", async () => {
  await open(storage({ skinHintSeen: true }).host);

  fireEvent.keyDown(window, { key: "ArrowRight" });
  await wait(1000);
  expect(shown()).toBe("Classic grey");
  fireEvent.keyDown(window, { key: "ArrowLeft" });
  await wait(1000);
  expect(shown()).toBe("pkhemu");
  fireEvent.click(screen.getByRole("button", { name: "Play It Loud red" }));
  await wait(1000);
  expect(shown()).toBe("Play It Loud red");
});

it("moves back from a tap on the left quarter and forward from the right one", async () => {
  await open(storage({ skinHintSeen: true }).host);

  await tapAt(CARD - 20);
  expect(shown()).toBe("Classic grey");
  await tapAt(CARD / 2);
  expect(shown()).toBe("Classic grey");
  await tapAt(20);
  expect(shown()).toBe("pkhemu");
});

it("lands a swipe released past 40% and springs back from a shorter one", async () => {
  const { container } = await open(storage({ skinHintSeen: true }).host);

  await slowDrag(300, 300 - 0.38 * CARD);
  expect(shown()).toBe("pkhemu");
  expect(incoming(container)).toBeNull();

  await slowDrag(300, 300 - 0.42 * CARD);
  expect(shown()).toBe("Classic grey");

  await slowDrag(100, 100 + 0.42 * CARD);
  expect(shown()).toBe("pkhemu");
});

it("lands a flick short of 40%", async () => {
  await open(storage({ skinHintSeen: true }).host);
  const target = card();

  pointer("pointerdown", target, 300);
  await wait(20);
  pointer("pointermove", target, 260);
  await wait(20);
  pointer("pointerup", target, 220);
  await wait(1000);

  expect(shown()).toBe("Classic grey");
});

it("hints at the next skin until the player first moves to another", async () => {
  const { host, saved } = storage();
  const first = await open(host);
  expect(incoming(first.container)).toBeNull();

  await wait(1100);
  expect(incoming(first.container)).not.toBeNull();
  expect(screen.getByRole("button", { name: "In use" })).toBeTruthy();
  await wait(2000);
  expect(incoming(first.container)).toBeNull();
  expect(shown()).toBe("pkhemu");
  fireEvent.click(screen.getByRole("button", { name: "Next skin" }));
  await wait(1000);
  first.unmount();
  expect(saved().skinHintSeen).toBe(true);

  const second = await open(host);
  await wait(3000);
  expect(incoming(second.container)).toBeNull();
});

const notOwned: PlusStatus = { state: "notOwned", price: "$3.99" };
const dots = () => screen.getAllByRole("button", { name: /^(pkhemu|Classic grey|Play It Loud)/ }).map((dot) => dot.getAttribute("aria-label"));
const locked = () => screen.queryByRole("img", { name: "Plus" }) !== null;

async function toRed() {
  fireEvent.click(screen.getByRole("button", { name: "Play It Loud red" }));
  await wait(1000);
}

it.each([{ state: "unlocked" }, { state: "owned" }] as PlusStatus[])("lets $state Plus use every skin", async (status) => {
  const { host, chooseSkin } = storage({ skinHintSeen: true });
  await open(host, "gb", fakePlus({ status }).host);
  expect(dots()).toHaveLength(4);

  await toRed();
  expect(locked()).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Use this skin" }));
  await act(async () => {});

  expect(chooseSkin).toHaveBeenCalledWith("gb", { skin: "play-it-loud-red", look: "moulded" });
});

it("previews a Plus skin without Plus, with a lock and Get Plus", async () => {
  await open(storage({ skinHintSeen: true }).host, "gb", fakePlus({ status: notOwned }).host);
  expect(dots()).toHaveLength(4);
  expect(locked()).toBe(false);

  await toRed();

  expect(locked()).toBe(true);
  expect(screen.queryByRole("button", { name: "Use this skin" })).toBeNull();
  screen.getByRole("button", { name: "Get Plus" });
});

it("saves a Plus skin once Get Plus buys it, then closes", async () => {
  const { host, chooseSkin } = storage({ skinHintSeen: true });
  const plus = fakePlus({ status: notOwned });
  const { onClose } = await open(host, "gb", plus.host);
  await toRed();

  fireEvent.click(screen.getByRole("button", { name: "Get Plus" }));
  await act(async () => {});

  expect(plus.host.buy).toHaveBeenCalled();
  expect(chooseSkin).toHaveBeenCalledWith("gb", { skin: "play-it-loud-red", look: "moulded" });
  expect(onClose).toHaveBeenCalledTimes(1);
});

it.each(["cancelled", "pending"] as Bought[])("changes nothing when buying ends %s", async (buys) => {
  const { host, chooseSkin } = storage({ skinHintSeen: true });
  const plus = fakePlus({ status: notOwned, buys });
  const { onClose } = await open(host, "gb", plus.host);
  await toRed();

  fireEvent.click(screen.getByRole("button", { name: "Get Plus" }));
  await act(async () => {});

  expect(plus.host.buy).toHaveBeenCalled();
  expect(chooseSkin).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Get Plus" })).toHaveProperty("disabled", false);
});

it("offers only the free skins in a build without Plus", async () => {
  await open(storage({ skinHintSeen: true }).host, "gb", fakePlus({ status: { state: "unavailable" } }).host);

  expect(dots()).toEqual(["pkhemu", "Classic grey"]);
  fireEvent.click(screen.getByRole("button", { name: "Next skin" }));
  await wait(1000);
  fireEvent.click(screen.getByRole("button", { name: "Next skin" }));
  await wait(1000);
  expect(shown()).toBe("pkhemu");
});

it("opens on pkhemu, in use, when the saved skin needs Plus the player no longer has", async () => {
  const { host, chooseSkin } = storage({ skinHintSeen: true, skins: { ...defaultSkins, gb: { skin: "play-it-loud-red", look: "frosted" } } });
  await open(host, "gb", fakePlus({ status: notOwned }).host);

  expect(shown()).toBe("pkhemu");
  expect(screen.getByRole("radio", { name: "Frosted" })).toHaveProperty("ariaChecked", "true");
  expect(screen.getByRole("button", { name: "In use" })).toHaveProperty("disabled", true);
  expect(chooseSkin).not.toHaveBeenCalled();
});

it("waits for the store before using a skin", async () => {
  const { host, chooseSkin } = storage({ skinHintSeen: true });
  const plus = fakePlus({ status: notOwned }).host;
  await open(host, "gb", { ...plus, status: () => new Promise<PlusStatus>(() => {}) });
  await toRed();

  expect(screen.getByRole("button", { name: "Use this skin" })).toHaveProperty("disabled", true);
  expect(chooseSkin).not.toHaveBeenCalled();
});

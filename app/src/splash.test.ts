import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import indexHtml from "../index.html?raw";
import { hideSplash, playSplash } from "./splash";

function fakeAnimate(this: Element, _keyframes: unknown, options?: number | KeyframeAnimationOptions) {
  const { delay = 0, duration = 0 } = typeof options === "number" ? { duration: options } : (options ?? {});
  let finish!: () => void;
  const finished = new Promise<void>((resolve) => (finish = resolve));
  setTimeout(finish, delay + Number(duration));
  return { finished, finish } as unknown as Animation;
}

const splash = () => document.getElementById("splash");

beforeEach(() => {
  vi.useFakeTimers();
  Element.prototype.animate = fakeAnimate;
  const markup = new DOMParser().parseFromString(indexHtml, "text/html").getElementById("splash")!;
  document.body.append(document.importNode(markup, true));
});

afterEach(() => {
  splash()?.remove();
  delete (Element.prototype as Partial<Element>).animate;
  delete window.androidSystemBars;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("keeps the splash while the animation runs", async () => {
  playSplash();
  hideSplash();

  await vi.advanceTimersByTimeAsync(1000);

  expect(splash()).not.toBeNull();
});

it("keeps the splash while the app isn't ready", async () => {
  playSplash();

  await vi.advanceTimersByTimeAsync(5000);

  expect(splash()).not.toBeNull();
});

it("hides the splash once the animation has ended and the app is ready", async () => {
  playSplash();
  await vi.advanceTimersByTimeAsync(2000);

  hideSplash();
  await vi.advanceTimersByTimeAsync(220);

  expect(splash()).toBeNull();
});

it("hides the splash when the animation ends after the app is ready", async () => {
  playSplash();
  hideSplash();

  await vi.advanceTimersByTimeAsync(2000);

  expect(splash()).toBeNull();
});

it("skips the rest of the animation on a tap", async () => {
  playSplash();
  hideSplash();
  await vi.advanceTimersByTimeAsync(300);

  fireEvent.pointerDown(splash()!);
  await vi.advanceTimersByTimeAsync(220);

  expect(splash()).toBeNull();
});

it("fades the finished logo in when the system asks for reduced motion", async () => {
  vi.stubGlobal("matchMedia", (media: string) => ({ matches: media === "(prefers-reduced-motion: reduce)", media }));
  playSplash();
  hideSplash();

  await vi.advanceTimersByTimeAsync(300 + 220);

  expect(splash()).toBeNull();
});

it("gives Android its theme's bar colours back once the splash hides", async () => {
  const splashHidden = vi.fn();
  window.androidSystemBars = { setHidden() {}, setLight() {}, splashHidden };
  playSplash();
  hideSplash();

  await vi.advanceTimersByTimeAsync(1440);
  expect(splashHidden).not.toHaveBeenCalled();

  await vi.advanceTimersByTimeAsync(220);
  expect(splashHidden).toHaveBeenCalledOnce();
});

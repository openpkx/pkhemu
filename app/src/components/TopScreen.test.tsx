import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { dualScreens } from "@/screens";
import { TopScreen } from "./TopScreen";

afterEach(cleanup);

function load(frame: { width: number; height: number }) {
  const image = screen.getByRole("img", { name: "Last screen" });
  Object.defineProperties(image, { naturalWidth: { value: frame.width }, naturalHeight: { value: frame.height } });
  fireEvent.load(image);
  return image;
}

it.each([
  { system: "nds", frame: { width: 256, height: 384 }, aspect: 4 / 3 },
  { system: "3ds", frame: { width: 400, height: 480 }, aspect: 5 / 3 },
] as const)("takes the shape of the $system top screen and shows only it", ({ system, frame, aspect }) => {
  render(<TopScreen src="data:image/png;base64," screens={dualScreens[system]!} alt="Last screen" />);

  const image = load(frame);

  expect(Number(image.parentElement!.parentElement!.style.getPropertyValue("--top-aspect"))).toBeCloseTo(aspect);
  expect(image.style).toMatchObject({ left: "0%", top: "0%", width: "100%", height: "200%" });
});

it("keeps the last top screen's shape while a new screenshot loads", () => {
  const { rerender } = render(<TopScreen key="first" src="data:image/png;base64," screens={dualScreens["3ds"]!} alt="Last screen" />);
  load({ width: 400, height: 480 });

  rerender(<TopScreen key="second" src="data:image/png;base64,AA==" screens={dualScreens["3ds"]!} alt="Last screen" />);

  const box = screen.getByRole("img", { name: "Last screen" }).parentElement!.parentElement!;
  expect(Number(box.style.getPropertyValue("--top-aspect"))).toBeCloseTo(5 / 3);
});

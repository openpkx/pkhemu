import { useLayoutEffect, useRef } from "react";
import type { Size } from "@/fit";
import type { Rect } from "@/screens";
import type { Skin } from "@/skins";

const round = (value: number) => +value.toFixed(2);

function roundedRect({ x, y, width, height }: Rect, radius: number) {
  const [left, top, right, bottom, r] = [x, y, x + width, y + height, radius].map(round);
  const corner = (toX: number, toY: number) => `A${r} ${r} 0 0 1 ${round(toX)} ${round(toY)}`;
  return (
    `M${round(left + r)} ${top}H${round(right - r)}${corner(right, top + r)}V${round(bottom - r)}${corner(right - r, bottom)}` +
    `H${round(left + r)}${corner(left, bottom - r)}V${round(top + r)}${corner(left + r, top)}Z`
  );
}

export function openingsMask(size: Size, windows: Rect[], radius: number, inset: number) {
  const { width, height } = { width: round(size.width), height: round(size.height) };
  const holes = windows.map((window) =>
    roundedRect(
      { x: window.x + inset, y: window.y + inset, width: window.width - 2 * inset, height: window.height - 2 * inset },
      Math.max(0, radius - inset),
    ),
  );
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">` +
    `<path fill-rule="evenodd" d="M0 0H${width}V${height}H0Z${holes.join("")}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// The native surface draws the opening under the page, and the hole stops a device pixel short of its edge so the
// surface's own anti-aliased corner stays under the plastic.
export function SkinPlastic({ skin, radius, windows }: { skin: Skin; radius: number; windows?: Rect[] }) {
  const plastic = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const style = plastic.current!.style;
    if (!windows) {
      style.maskImage = style.webkitMaskImage = "";
      return;
    }
    const box = plastic.current!.getBoundingClientRect();
    const local = windows.map((window) => ({ ...window, x: window.x - box.x, y: window.y - box.y }));
    style.maskImage = style.webkitMaskImage = openingsMask(box, local, radius, 1 / devicePixelRatio);
  }, [windows, radius]);

  return (
    <div
      ref={plastic}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-top bg-no-repeat [mask-size:100%_100%]"
      style={{ backgroundImage: `url(${skin.image})`, backgroundColor: skin.base }}
    />
  );
}

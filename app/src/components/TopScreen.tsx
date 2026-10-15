import { useState, type CSSProperties } from "react";
import { cn } from "cn";
import type { Size } from "@/fit";
import type { Screens } from "@/screens";

// The shape a box sized by width alone takes before its image loads, so a hero doesn't collapse when its screenshot changes.
const lastAspects = new WeakMap<Screens, number>();

// object-view-box would crop this, but WebKit lacks it.
export function TopScreen({ src, screens, alt = "", className }: { src: string; screens: Screens; alt?: string; className?: string }) {
  const [aspect, setAspect] = useState(() => lastAspects.get(screens));
  const { top } = screens;
  const load = (frame: Size) => {
    const loaded = (frame.width * top.width) / (frame.height * top.height);
    lastAspects.set(screens, loaded);
    setAspect(loaded);
  };
  return (
    <div
      className={cn("relative aspect-(--top-aspect) overflow-hidden [container-type:size]", className)}
      style={{ "--top-aspect": aspect } as CSSProperties}
    >
      <div className="absolute top-0 left-1/2 h-[max(100cqh,100cqw/var(--top-aspect))] w-[max(100cqw,var(--top-aspect)*100cqh)] -translate-x-1/2">
        <img
          src={src}
          alt={alt}
          onLoad={({ currentTarget }) => load({ width: currentTarget.naturalWidth, height: currentTarget.naturalHeight })}
          className="absolute max-w-none [image-rendering:pixelated]"
          style={{
            left: `${(-100 * top.x) / top.width}%`,
            top: `${(-100 * top.y) / top.height}%`,
            width: `${100 / top.width}%`,
            height: `${100 / top.height}%`,
          }}
        />
      </div>
    </div>
  );
}

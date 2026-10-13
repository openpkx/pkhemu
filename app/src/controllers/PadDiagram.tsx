import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SetupStep } from "@/input/padSetup";

function Part({ lit, children }: { lit: boolean; children: ReactNode }) {
  return <g className={cn(lit ? "fill-primary stroke-primary" : "fill-muted stroke-border")}>{children}</g>;
}

export function PadDiagram({ target, label }: { target: SetupStep; label: string }) {
  return (
    <svg viewBox="0 0 240 150" role="img" aria-label={label} className="mx-auto w-full max-w-72" strokeWidth={1.5}>
      <Part lit={target === "l2"}>
        <rect x={44} y={2} width={42} height={10} rx={4} />
      </Part>
      <Part lit={target === "r2"}>
        <rect x={154} y={2} width={42} height={10} rx={4} />
      </Part>
      <Part lit={target === "l1"}>
        <rect x={38} y={14} width={54} height={10} rx={4} />
      </Part>
      <Part lit={target === "r1"}>
        <rect x={148} y={14} width={54} height={10} rx={4} />
      </Part>
      <path
        d="M60 24 H180 C215 24 235 60 232 100 C230 130 210 140 195 130 L170 108 H70 L45 130 C30 140 10 130 8 100 C5 60 25 24 60 24 Z"
        className="fill-card stroke-border"
      />
      <Part lit={target === "up"}>
        <rect x={56} y={44} width={12} height={13} rx={2} />
      </Part>
      <Part lit={target === "down"}>
        <rect x={56} y={67} width={12} height={13} rx={2} />
      </Part>
      <Part lit={target === "left"}>
        <rect x={42} y={56} width={13} height={12} rx={2} />
      </Part>
      <Part lit={target === "right"}>
        <rect x={69} y={56} width={13} height={12} rx={2} />
      </Part>
      <Part lit={target === "north"}>
        <circle cx={178} cy={47} r={7} />
      </Part>
      <Part lit={target === "south"}>
        <circle cx={178} cy={77} r={7} />
      </Part>
      <Part lit={target === "west"}>
        <circle cx={163} cy={62} r={7} />
      </Part>
      <Part lit={target === "east"}>
        <circle cx={193} cy={62} r={7} />
      </Part>
      <Part lit={target === "select"}>
        <rect x={98} y={58} width={16} height={7} rx={3.5} />
      </Part>
      <Part lit={target === "start"}>
        <rect x={126} y={58} width={16} height={7} rx={3.5} />
      </Part>
      <Part lit={target === "guide"}>
        <circle cx={120} cy={42} r={7} />
      </Part>
      <Part lit={target === "stickUp" || target === "stickLeft"}>
        <circle cx={92} cy={94} r={13} />
      </Part>
      {target === "stickUp" && <path d="M92 70 l-6 8 h12 Z" className="fill-primary" />}
      {target === "stickLeft" && <path d="M68 94 l8 -6 v12 Z" className="fill-primary" />}
      <Part lit={target === "rightStickUp" || target === "rightStickLeft"}>
        <circle cx={148} cy={94} r={13} />
      </Part>
      {target === "rightStickUp" && <path d="M148 70 l-6 8 h12 Z" className="fill-primary" />}
      {target === "rightStickLeft" && <path d="M124 94 l8 -6 v12 Z" className="fill-primary" />}
    </svg>
  );
}

import { ArrowUpDown, CircleAlert } from "lucide-react";
import { cn } from "cn";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePresence } from "@/motion/motion";
import type { SyncBadgeState } from "@/sync/gameStatus";

export function Ring({ percent, className }: { percent: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} className={cn("size-3.5 -rotate-90", className)}>
      <circle cx="12" cy="12" r="9" className="stroke-current opacity-30" />
      <circle
        cx="12"
        cy="12"
        r="9"
        pathLength={100}
        strokeDasharray={100}
        strokeDashoffset={100 - percent}
        strokeLinecap="round"
        className="motion-ring stroke-current"
      />
    </svg>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
      <path d="M20 6 9 17l-5-5" pathLength={1} strokeDasharray={1} className="motion-tick stroke-white" />
    </svg>
  );
}

function Icon({ badge }: { badge: SyncBadgeState }) {
  if (badge.kind === "ring") return <Ring percent={badge.percent} />;
  if (badge.kind === "done") return <Tick />;
  if (badge.kind === "waiting") return <ArrowUpDown className="size-3.5" />;
  return <CircleAlert className="size-3.5 text-overlay-warning" />;
}

export function SyncBadge({ badge }: { badge?: SyncBadgeState }) {
  const { ref, shown, state } = usePresence(badge);
  if (!shown) return null;
  return (
    <span ref={ref} data-presence={state} className="motion-badge flex">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              role={shown.kind === "ring" ? "progressbar" : "img"}
              aria-label={shown.label}
              aria-valuenow={shown.kind === "ring" ? shown.percent : undefined}
              className="rounded-full bg-overlay/60 p-1 text-white"
            >
              <Icon badge={shown} />
            </span>
          </TooltipTrigger>
          <TooltipContent>{shown.label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}

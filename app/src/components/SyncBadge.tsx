import { CircleAlert, Wifi } from "lucide-react";
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

function Icon({ badge }: { badge: SyncBadgeState }) {
  if (badge.kind === "ring") return <Ring percent={badge.percent} />;
  if (badge.kind === "wifi") return <Wifi className="size-3.5" />;
  return <CircleAlert className="size-3.5 text-overlay-warning" />;
}

export function SyncBadge({ badge, onResolve }: { badge?: SyncBadgeState; onResolve(): void }) {
  const { ref, shown, state } = usePresence(badge);
  if (!shown) return null;
  const label = shown.kind === "conflict" ? `${shown.label}. Choose a version to keep` : shown.label;
  const className = "rounded-full bg-overlay/60 p-1 text-white";
  return (
    <span ref={ref} data-presence={state} className="motion-badge flex">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {shown.kind === "conflict" ? (
              <button
                type="button"
                aria-label={label}
                onClick={(event) => {
                  event.stopPropagation();
                  onResolve();
                }}
                className={cn("motion-press outline-none focus-visible:ring-3 focus-visible:ring-ring/50", className)}
              >
                <Icon badge={shown} />
              </button>
            ) : (
              <span
                role={shown.kind === "ring" ? "progressbar" : "img"}
                aria-label={label}
                aria-valuenow={shown.kind === "ring" ? shown.percent : undefined}
                className={className}
              >
                <Icon badge={shown} />
              </span>
            )}
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}

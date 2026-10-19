import { CircleAlert, Wifi } from "lucide-react";
import { Ring } from "@/components/SyncBadge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePresence } from "@/motion/motion";
import { useRunRing } from "@/sync/gameStatus";

export function SyncRing({ importing, onOpen }: { importing: boolean; onOpen(): void }) {
  const { ref, shown, state } = usePresence(useRunRing(importing));
  if (!shown) return null;
  return (
    <span ref={ref} data-presence={state} className="motion-badge flex">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={shown.label} onClick={onOpen}>
              {shown.kind === "warning" ? (
                <CircleAlert className="text-warning" />
              ) : shown.kind === "wifi" ? (
                <Wifi />
              ) : (
                <Ring
                  percent={shown.kind === "ring" ? shown.percent : 25}
                  className={shown.kind === "spinning" ? "size-5 animate-spin" : "size-5"}
                />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{shown.label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}

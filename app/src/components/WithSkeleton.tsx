import { useState, type ReactNode } from "react";
import { usePresence } from "@/motion/motion";

export function WithSkeleton({ loading, skeleton, children }: { loading: boolean; skeleton: ReactNode; children?: ReactNode }) {
  const { ref, shown, state } = usePresence(loading || undefined);
  const [replacing, setReplacing] = useState(loading);
  if (loading && !replacing) setReplacing(true);
  if (!shown && !children) return null;
  return (
    <span className="grid *:[grid-area:1/1]">
      {shown && (
        <span ref={ref} data-state={state} className="motion-skeleton grid">
          {skeleton}
        </span>
      )}
      {!loading && <span className={replacing ? "motion-crossfade-in grid" : "grid"}>{children}</span>}
    </span>
  );
}

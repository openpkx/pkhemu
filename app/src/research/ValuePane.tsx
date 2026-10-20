import { Check, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { valueName, type ValueCandidate } from "./diff";
import { valueFinding, whose, type Finding } from "./findings";

function ValueFacts({ change }: { change: ValueCandidate }) {
  return (
    <>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Item</dt>
        <dd className="font-mono text-[13px] tabular-nums">{change.index}</dd>
        {change.pocket ? (
          <>
            <dt className="text-muted-foreground">Pocket</dt>
            <dd>{change.pocket}</dd>
          </>
        ) : (
          change.holder && (
            <>
              <dt className="text-muted-foreground">Held by</dt>
              <dd>
                {change.holder.species}, {change.holder.slot}
              </dd>
            </>
          )
        )}
        <dt className="text-muted-foreground">Count</dt>
        <dd className="tabular-nums">
          {change.before} <span aria-label="to">→</span> {change.after}
        </dd>
      </dl>
      <p className="text-sm text-muted-foreground">The engine reads this item but has no name for it.</p>
    </>
  );
}

export function ValuePane({ change, findings, onName }: { change: ValueCandidate; findings: readonly Finding[]; onName(): void }) {
  const named = valueFinding(findings, change.domain, change.index);
  return (
    <div className="mx-auto grid w-full max-w-[40rem] gap-4">
      <Card key={change.id} className="motion-crossfade-in gap-3 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid min-w-0 gap-1.5">
            <Badge variant="outline" className="border-warning/40 text-warning">
              Unknown item
            </Badge>
            <h2 className="font-mono text-base font-medium tabular-nums">{valueName(change)}</h2>
          </div>
          {named ? (
            <Badge variant="outline" className="h-8 px-3 text-success">
              <Check />
              Named
            </Badge>
          ) : (
            <Button onClick={onName}>
              <Tag />
              Name this
            </Button>
          )}
        </div>
        <ValueFacts change={change} />
        {named && (
          <p className="text-sm text-success">
            {named.name}, {whose(named)}
          </p>
        )}
      </Card>
    </div>
  );
}

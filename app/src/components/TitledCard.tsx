import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sectionHeading } from "@/components/sectionHeading";

export function TitledCard({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <Card role="region" aria-labelledby={titleId} className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle id={titleId} className={sectionHeading}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-3">{children}</CardContent>
    </Card>
  );
}

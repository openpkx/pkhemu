import type { Legality } from "@pkhex-everywhere/engine";
import { ChevronDown, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function LegalityDetails({ messages }: { messages: string[] }) {
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="link" size="sm" className="group h-auto p-0">
          Details
          <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="grid gap-0.5 pt-1">
          {messages.map((message, index) => (
            <li key={index} className="break-words">
              {message}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export const ambiguousCopies = "pkhemu keeps copies of more than one Pokémon that could be this one, so nothing is restored.";

export function UnofficialAlert({
  destination,
  keptFrom,
  ambiguous,
  legality,
}: {
  destination: string;
  keptFrom?: string;
  ambiguous?: boolean;
  legality: Legality | null;
}) {
  return (
    <Alert>
      <TriangleAlert />
      <AlertTitle>Not possible in the real games</AlertTitle>
      <AlertDescription>
        <p>
          {keptFrom
            ? `It may fail the legality check. pkhemu keeps its ${keptFrom} data and puts it back if it moves forward again.`
            : `It may fail the legality check, and anything ${destination} can't hold is lost, even if it moves back later.`}
        </p>
        {ambiguous && <p>{ambiguousCopies}</p>}
        {legality && !legality.valid && <LegalityDetails messages={legality.messages} />}
      </AlertDescription>
    </Alert>
  );
}

import { useState } from "react";
import { cn } from "cn";
import { Binary, ChevronRight, FileDown, FileJson, FileUp, Package, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { sectionHeading } from "@/plugin-kit/sectionHeading";
import { spaceTitle } from "./diff";
import type { Finding } from "./findings";
import type { ResearchHost } from "./host";
import { hex, plural } from "./text";
import type { Findings } from "./useFindings";

export function FindingsTab({
  host,
  findings,
  format,
  exporting,
  onExporting,
  onEdit,
}: {
  host: ResearchHost;
  findings: Findings;
  format: string;
  exporting: boolean;
  onExporting(open: boolean): void;
  onEdit(finding: Finding): void;
}) {
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean }>();
  const files = [...new Set(findings.imported.map(({ file }) => file!))];

  const importFile = async () => {
    setImporting(true);
    setMessage(undefined);
    try {
      const result = await findings.importFile();
      if (result && "error" in result) setMessage({ text: result.error, error: true });
      if (result && "added" in result) setMessage({ text: `Added ${plural(result.added, "finding")} from ${result.file}` });
    } catch {
      setMessage({ text: "That file couldn't be opened.", error: true });
    } finally {
      setImporting(false);
    }
  };

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto grid w-full max-w-2xl grid-cols-[minmax(0,1fr)] content-start gap-8 px-4 pt-6 pb-8 md:px-8 md:pt-10">
        <header className="grid gap-4">
          <div className="grid gap-1">
            <h2 className="font-heading text-xl font-medium">Findings for {format}</h2>
            <p className="text-sm text-muted-foreground">They stay on this device until you export them.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!findings.own.length || !findings.exported} onClick={() => onExporting(true)}>
              <FileDown />
              Export findings
            </Button>
            <Button variant="outline" disabled={importing} onClick={() => void importFile()}>
              {importing ? <Spinner /> : <FileUp />}
              Import findings
            </Button>
          </div>
          {message && (
            <p role={message.error ? "alert" : "status"} className={cn("text-sm", message.error ? "text-destructive" : "text-muted-foreground")}>
              {message.text}
            </p>
          )}
        </header>

        <section aria-label="Yours" className="grid grid-cols-[minmax(0,1fr)] gap-2">
          <h3 className={cn(sectionHeading, "px-1")}>Yours</h3>
          {findings.own.length ? (
            <ul className="grid gap-0.5">
              {findings.own.map((finding) => (
                <li key={finding.id}>
                  <FindingRow finding={finding} onClick={() => onEdit(finding)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-balance text-muted-foreground">
              Nothing named yet. Open a change in a compare and pick Name this.
            </p>
          )}
        </section>

        {files.map((file) => (
          <section key={file} aria-label={`From ${file}`} className="grid grid-cols-[minmax(0,1fr)] gap-2">
            <div className="flex items-center gap-2 px-1">
              <FileJson className="size-4 shrink-0 text-muted-foreground" />
              <h3 className="min-w-0 flex-1 truncate font-mono text-[13px] text-muted-foreground">{file}</h3>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => findings.removeFile(file)}>
                Remove
              </Button>
            </div>
            <ul className="grid gap-0.5">
              {findings.imported
                .filter((finding) => finding.file === file)
                .map((finding) => (
                  <li key={finding.id}>
                    <FindingRow finding={finding} />
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
      <ExportDialog host={host} open={exporting} findings={findings} onOpenChange={onExporting} />
    </main>
  );
}

export const findingWhere = (finding: Finding) =>
  finding.kind === "value"
    ? [`${finding.domain[0].toUpperCase()}${finding.domain.slice(1)} ${finding.index}`, finding.pocket].filter(Boolean).join(" · ")
    : `${spaceTitle(finding.space)} · ${hex(finding.offset)} · ${plural(finding.length, "byte")} · ${finding.type}`;

function FindingRow({ finding, onClick }: { finding: Finding; onClick?(): void }) {
  const body = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/12 text-success [&_svg]:size-4">
        {finding.kind === "range" ? <Binary /> : <Package />}
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5 text-left">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-foreground">{finding.name}</span>
          <Badge variant="outline" className="text-muted-foreground">
            {finding.confidence === "known" ? "Checked" : "Guess"}
          </Badge>
        </span>
        <span className="truncate font-mono text-[12px] text-muted-foreground tabular-nums">{findingWhere(finding)}</span>
        {finding.note && <span className="truncate text-sm text-muted-foreground">{finding.note}</span>}
      </span>
    </>
  );
  if (!onClick) return <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">{body}</div>;
  return (
    <Button variant="ghost" className="motion-press h-auto w-full justify-start gap-3 rounded-lg px-3 py-2.5 font-normal whitespace-normal" onClick={onClick}>
      {body}
      <ChevronRight className="text-muted-foreground" />
    </Button>
  );
}

function ExportDialog({ host, open, findings, onOpenChange }: { host: ResearchHost; open: boolean; findings: Findings; onOpenChange(open: boolean): void }) {
  const [busy, setBusy] = useState(false);
  const file = findings.exported;
  const count = file?.count ?? 0;
  const left = findings.own.length - count;

  const exportFile = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const saved = await host.exportFile({ name: file.name, text: file.text });
      if (saved) void host.notify(`Saved ${saved}`);
      onOpenChange(false);
    } catch {
      void host.notify("Couldn't export your findings");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open && file !== undefined} onOpenChange={(open) => !busy && onOpenChange(open)}>
      <DialogContent showCloseButton={false} className="gap-4 sm:max-w-xl" onOpenAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Export findings</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-[13px] break-all text-foreground">{file?.name}</span> · {plural(count, "finding")}
          </DialogDescription>
        </DialogHeader>
        <pre
          aria-label="File contents"
          tabIndex={0}
          className="max-h-[min(22rem,50dvh)] overflow-auto rounded-lg border bg-background/60 p-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {file?.text}
        </pre>
        <p className="flex gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
          Only your findings and their own bytes. Nothing else from the save, and no imported findings.
        </p>
        {left > 0 && <p className="text-sm text-muted-foreground">{plural(left, "finding")} without a ROM SHA-1 stay out.</p>}
        <DialogFooter>
          <Button variant="secondary" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy || !count} onClick={() => void exportFile()}>
            {busy ? <Spinner /> : <FileDown />}
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { createContext, useContext, type ReactNode } from "react";
import { Ellipsis } from "lucide-react";
import { Toast, useToast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type ExportedFile = { bytes: Uint8Array; fileName: string };

export type ExportHost = {
  saveFile(file: ExportedFile): Promise<string | undefined>;
  saveFiles(files: ExportedFile[]): Promise<string | undefined>;
};

const ExportContext = createContext<ExportHost | null>(null);

export function ExportProvider({ host, children }: { host: ExportHost; children: ReactNode }) {
  return <ExportContext.Provider value={host}>{children}</ExportContext.Provider>;
}

export function ExportMenu({ file }: { file: () => Promise<ExportedFile | ExportedFile[]> }) {
  const host = useContext(ExportContext);
  if (!host) throw new Error("ExportMenu needs an ExportProvider");
  const [toast, setToast] = useToast();

  const exportFile = async () => {
    try {
      const files = [await file()].flat();
      const saved = await (files.length === 1 ? host.saveFile(files[0]) : host.saveFiles(files));
      if (saved) setToast(`Saved ${saved}`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void exportFile()}>Export file</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Toast>{toast}</Toast>
    </>
  );
}

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BackProvider } from "@/back/back";
import { ExportProvider } from "@/editor/exportFile";
import type { Game } from "@/library/scan";
import { BackupPage, backupFile, backupLabel, BackupsScreen, type Backup } from "./backups";

afterEach(cleanup);

const now = new Date(2026, 9, 5, 18, 30);

it.each([
  ["2026-10-05T14:02", /^Today /],
  ["2026-10-04T23:59", /^Yesterday /],
  ["2026-09-28T09:00", /^(?!Today|Yesterday)(?!.*2026)/],
  ["2025-12-31T09:00", /2025/],
])("says when %s was taken", (at, when) => {
  expect(backupLabel({ at, reason: "restore" }, now)).toMatch(when);
});

const transfer: Backup = {
  name: "2026-10-05_1412_transfer.sav",
  at: "2026-10-05T14:12",
  reason: "transfer",
  sha256: "a",
  note: "Sent Pikachu to Emerald",
};
const edit: Backup = { name: "2026-10-05_1400_edit.sav", at: "2026-10-05T14:00", reason: "edit", sha256: "b" };

const noFile = async () => ({ bytes: new Uint8Array(), fileName: "" });

it("shows a backup's note in the list, and no line for one without", () => {
  render(
    <BackProvider>
      <BackupsScreen backups={[transfer, edit]} summaries={{}} onPick={() => {}} onBack={() => {}} />
    </BackProvider>,
  );

  const [withNote, withoutNote] = screen.getAllByRole("button", { name: /·/ });
  expect(within(withNote).getByTestId("backup-note").textContent).toBe(transfer.note);
  expect(within(withoutNote).queryByTestId("backup-note")).toBeNull();
});

it.each([
  ["transfer", transfer, transfer.note],
  ["edit", edit, undefined],
])("shows the note when inspecting the %s backup", (_, backup, note) => {
  render(
    <BackProvider>
      <ExportProvider host={{ saveFile: async () => undefined, saveFiles: async () => undefined }}>
        <BackupPage backup={backup} file={noFile} busy={false} onRestore={() => {}} onDelete={() => {}} onBack={() => {}} />
      </ExportProvider>
    </BackProvider>,
  );

  expect(screen.queryByTestId("backup-note")?.textContent).toBe(note);
});

const heartGold: Game = { system: "nds", name: "HeartGold", path: "nds/HeartGold.nds" };

it.each([
  ["2026-10-05_1400_edit.sav", "HeartGold 2026-10-05_1400_edit.sav"],
  ["2026-10-05_1400_edit.dsv", "HeartGold 2026-10-05_1400_edit.sav"],
  ["2026-10-05_1400_edit.srm", "HeartGold 2026-10-05_1400_edit.srm"],
])("exports the backup %s as %s", async (name, fileName) => {
  const backup = { ...edit, name };
  const host = { readBackup: vi.fn(async () => new Uint8Array([7, 8])) };
  const exportHost = { saveFile: vi.fn(async () => undefined), saveFiles: vi.fn(async () => undefined) };
  render(
    <BackProvider>
      <ExportProvider host={exportHost}>
        <BackupPage
          backup={backup}
          file={() => backupFile(host, "/games", heartGold, backup)}
          busy={false}
          onRestore={() => {}}
          onDelete={() => {}}
          onBack={() => {}}
        />
      </ExportProvider>
    </BackProvider>,
  );

  fireEvent.keyDown(within(screen.getByRole("region", { name: "Backup" })).getByRole("button", { name: "More" }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("menuitem", { name: "Export file" }));

  await waitFor(() => expect(exportHost.saveFile).toHaveBeenCalledWith({ bytes: new Uint8Array([7, 8]), fileName }));
  expect(host.readBackup).toHaveBeenCalledWith("/games", heartGold.path, name);
});

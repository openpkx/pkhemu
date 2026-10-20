import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { useState, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BackProvider, useBack, type BackHost } from "@/back/back";
import { desktopBackHost } from "@/back/desktopHost";
import { fakeBackHost } from "@/back/fakeBackHost";
import { BottomSheet } from "@/plugin-kit/BottomSheet";
import { AlertDialog, AlertDialogContent, AlertDialogTitle } from "./alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "./dialog";

afterEach(cleanup);

function OpenDialog() {
  const [open, setOpen] = useState(true);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>Dialog</DialogTitle>
      </DialogContent>
    </Dialog>
  );
}

function OpenAlertDialog() {
  const [open, setOpen] = useState(true);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent aria-describedby={undefined}>
        <AlertDialogTitle>Alert</AlertDialogTitle>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function OpenBottomSheet() {
  const [open, setOpen] = useState(true);
  return (
    <BottomSheet open={open} title="Sheet" onClose={() => setOpen(false)}>
      <p>Sheet</p>
    </BottomSheet>
  );
}

function Screen({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  useBack(onBack);
  return <>{children}</>;
}

function onScreen(host: BackHost, surface: ReactNode) {
  const onBack = vi.fn();
  render(
    <BackProvider host={host}>
      <Screen onBack={onBack}>{surface}</Screen>
    </BackProvider>,
  );
  return onBack;
}

it.each([
  ["Dialog", <OpenDialog />, "dialog"],
  ["AlertDialog", <OpenAlertDialog />, "alertdialog"],
  ["BottomSheet", <OpenBottomSheet />, "dialog"],
])("closes an open %s on back and keeps the screen", (_, surface, role) => {
  const back = fakeBackHost();
  const onBack = onScreen(back.host, surface);
  expect(screen.getByRole(role)).toBeTruthy();

  back.press();

  expect(screen.queryByRole(role)).toBeNull();
  expect(onBack).not.toHaveBeenCalled();
});

it("closes an open sheet on back instead of exiting when no screen handles back", () => {
  const back = fakeBackHost();
  render(
    <BackProvider host={back.host}>
      <OpenBottomSheet />
    </BackProvider>,
  );

  back.press();

  expect(screen.queryByRole("dialog")).toBeNull();
  expect(back.exits()).toBe(0);
});

it("lets back through to the screen from a dialog that doesn't close itself", () => {
  const back = fakeBackHost();
  const onBack = onScreen(
    back.host,
    <Dialog open>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>Dialog</DialogTitle>
      </DialogContent>
    </Dialog>,
  );

  back.press();

  expect(onBack).toHaveBeenCalledOnce();
});

it("closes only the dialog with Escape on a computer", async () => {
  const onBack = onScreen(desktopBackHost, <OpenDialog />);
  const onWindow = vi.fn();
  window.addEventListener("keydown", onWindow);

  await act(async () => fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" }));
  window.removeEventListener("keydown", onWindow);

  expect(screen.queryByRole("dialog")).toBeNull();
  expect(onBack).not.toHaveBeenCalled();
  expect(onWindow).not.toHaveBeenCalled();
});

it("builds every dialog on the shared components, which close on back", () => {
  const src = join(import.meta.dirname, "../..");
  const ui = join("components", "ui") + sep;
  const sources = readdirSync(src, { recursive: true, encoding: "utf8" }).filter(
    (file) => /\.tsx?$/.test(file) && !file.startsWith(ui),
  );

  const bypassing = sources.filter((file) => {
    const code = readFileSync(join(src, file), "utf8");
    const named = [...code.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']radix-ui["']/g)].flatMap(([, names]) =>
      names.split(",").map((name) => name.trim().split(/\s+/)[0]),
    );
    return named.some((name) => name === "Dialog" || name === "AlertDialog") || /["']@radix-ui\/react-(alert-)?dialog["']/.test(code);
  });

  expect(bypassing).toEqual([]);
});

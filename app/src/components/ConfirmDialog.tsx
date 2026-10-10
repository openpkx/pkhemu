import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ConfirmDialog({
  title,
  action,
  destructive = false,
  open,
  onConfirm,
  onCancel,
  onCloseAutoFocus,
  children,
}: {
  title: string;
  action: string;
  destructive?: boolean;
  open: boolean;
  onConfirm(): void;
  onCancel(): void;
  onCloseAutoFocus?(event: Event): void;
  children: ReactNode;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      {/* The page's own Esc would otherwise leave it as the dialog closes. */}
      <AlertDialogContent onEscapeKeyDown={(event) => event.stopPropagation()} onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{children}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={destructive ? "destructive" : "default"} onClick={onConfirm}>
            {action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

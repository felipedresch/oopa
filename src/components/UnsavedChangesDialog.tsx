import type { Blocker } from "react-router-dom";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { UNSAVED_CHANGES_MESSAGE } from "@/hooks/useDirtyFormGuard";
import { ACTION_COPY } from "@/lib/copy";

type UnsavedChangesDialogProps = {
  blocker: Blocker;
  message?: string;
};

export function UnsavedChangesDialog({
  blocker,
  message = UNSAVED_CHANGES_MESSAGE,
}: UnsavedChangesDialogProps) {
  return (
    <ConfirmDialog
      cancelLabel={ACTION_COPY.cancel}
      confirmLabel="Sair sem salvar"
      confirmVariant="destructive"
      description={message}
      onConfirm={() => blocker.proceed?.()}
      onOpenChange={(open) => {
        if (!open) {
          blocker.reset?.();
        }
      }}
      open={blocker.state === "blocked"}
      title="Alterações não salvas"
    />
  );
}

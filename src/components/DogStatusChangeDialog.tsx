import { useMutation } from "convex/react";
import { useState } from "react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/auth-errors";
import type { DogStatus } from "@/lib/domain-colors";
import { DOG_STATUS_LABELS } from "@/lib/domain-colors";

const CONFIRM_STATUSES: DogStatus[] = ["falecido", "desaparecido", "transferido"];

const ALL_STATUSES = Object.keys(DOG_STATUS_LABELS) as DogStatus[];

type DogStatusChangeDialogProps = {
  dogId: Id<"dogs">;
  currentStatus: DogStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DogStatusChangeDialog({
  dogId,
  currentStatus,
  open,
  onOpenChange,
}: DogStatusChangeDialogProps) {
  const changeStatus = useMutation(api.dogs.changeStatus);
  const [nextStatus, setNextStatus] = useState<DogStatus>(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const needsConfirmation = CONFIRM_STATUSES.includes(nextStatus) && nextStatus !== currentStatus;

  const applyStatus = async () => {
    if (nextStatus === currentStatus) {
      onOpenChange(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await changeStatus({ dogId, status: nextStatus });
      onOpenChange(false);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Não foi possível alterar o status."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfirmDialog
      confirmLabel={loading ? "Salvando..." : "Confirmar status"}
      description={
        needsConfirmation
          ? `Confirme a alteracao para "${DOG_STATUS_LABELS[nextStatus]}". Está ação atualiza a ficha do cão.`
          : "Selecione o novo status do cão."
      }
      onConfirm={() => void applyStatus()}
      onOpenChange={onOpenChange}
      open={open}
      title="Alterar status"
    >
      <div className="flex flex-col gap-2 py-2">
        <Label htmlFor="dog-status">Status</Label>
        <select
          className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          id="dog-status"
          onChange={(event) => setNextStatus(event.target.value as DogStatus)}
          value={nextStatus}
        >
          {ALL_STATUSES.map((status) => (
            <option key={status} value={status}>
              {DOG_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </ConfirmDialog>
  );
}

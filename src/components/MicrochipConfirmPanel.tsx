import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskMicrochipInput } from "@/lib/masks";

type MicrochipConfirmPanelProps = {
  value: string;
  warning?: string | null;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
};

export function MicrochipConfirmPanel({
  value,
  warning,
  onChange,
  onConfirm,
  onCancel,
  confirmLabel = "Confirmar e buscar",
}: MicrochipConfirmPanelProps) {
  const digits = value.replace(/\D/g, "");
  const canConfirm = digits.length === 15;

  return (
    <div className="flex flex-col gap-4 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
      <div>
        <h2 className="text-lg font-semibold">Confira o numero antes de buscar</h2>
        <p className="text-sm text-muted-foreground">
          Edite se necessario. A busca so acontece apos sua confirmacao.
        </p>
      </div>

      {warning ? (
        <p className="rounded-lg border border-amber-300 bg-white/70 p-3 text-sm font-medium text-amber-950 dark:bg-black/20 dark:text-amber-100">
          {warning}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="microchip-confirm">Microchip (15 digitos)</Label>
        <Input
          className="min-h-14 text-center text-2xl font-semibold tracking-[0.2em] sm:text-3xl"
          id="microchip-confirm"
          inputMode="numeric"
          onChange={(event) => onChange(maskMicrochipInput(event.target.value))}
          value={value}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {onCancel ? (
          <Button className="min-h-12 flex-1" onClick={onCancel} type="button" variant="outline">
            Voltar
          </Button>
        ) : null}
        <Button
          className="min-h-12 flex-1 text-base"
          disabled={!canConfirm}
          onClick={onConfirm}
          type="button"
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

import { EyeOffIcon } from "lucide-react";

export function SensitiveDataHidden() {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">
      <EyeOffIcon aria-hidden="true" className="mt-1 size-4 shrink-0" />
      <p>
        Dados sensiveis ocultos. Você não tem permissão para visualizar CPF, RG, contato,
        endereco, data de nascimento, observações e alertas deste tutor.
      </p>
    </div>
  );
}

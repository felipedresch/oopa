export function SensitiveDataHidden() {
  return (
    <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
      Dados sensiveis ocultos. Voce nao tem permissao para visualizar CPF, RG, contato,
      endereco, data de nascimento, observacoes e alertas deste tutor.
    </div>
  );
}

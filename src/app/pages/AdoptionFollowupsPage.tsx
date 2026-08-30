import { HeartHandshakeIcon } from "lucide-react";

import { AdoptionFollowupList } from "@/components/AdoptionFollowupList";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { usePermissions } from "@/hooks/usePermissions";

export function AdoptionFollowupsPage() {
  const { can } = usePermissions();

  if (!can("adoptions.read")) {
    return <PermissionDenied />;
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description="Acompanhe os contatos com tutores após a adoção e mantenha o histórico da ONG atualizado."
        title="Acompanhamento pós-adoção"
      />
      <div className="flex items-start gap-3 rounded-2xl border bg-card p-4 text-sm leading-6 text-muted-foreground">
        <HeartHandshakeIcon
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-primary"
        />
        <p>
          A fila mostra os acompanhamentos pendentes por ordem de atraso. Os lembretes
          são internos e não enviam e-mail ou SMS.
        </p>
      </div>
      <AdoptionFollowupList status="pendente" />
    </section>
  );
}

import { useLocation } from "react-router-dom";

import { PageHeader } from "@/components/PageHeader";

type PlaceholderPageProps = {
  title: string;
  description?: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  const location = useLocation();

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description={
          description ??
          "Está rota já está registrada no roteamento. A implementação funcional chega nas próximas fases."
        }
        title={title}
      />
      <p className="rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
        Rota atual: <code>{location.pathname}</code>
      </p>
    </section>
  );
}

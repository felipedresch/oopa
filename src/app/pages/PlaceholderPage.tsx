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
          "Esta rota ja esta registrada no roteamento. A implementacao funcional chega nas proximas fases."
        }
        title={title}
      />
      <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Rota atual: <code>{location.pathname}</code>
      </p>
    </section>
  );
}

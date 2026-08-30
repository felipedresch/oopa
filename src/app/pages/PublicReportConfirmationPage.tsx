import { CheckCircle2Icon } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * O id do Convex tem 32 caracteres; o denunciante so precisa de algo curto e
 * anotavel para referenciar a denuncia por telefone.
 */
function formatProtocol(id: string): string {
  return id.slice(-8);
}

const NEXT_STEPS = [
  "A equipe lê a denúncia e avalia a gravidade.",
  "Se houver informação suficiente, ela vira uma ocorrência e entra na fila de atendimento.",
  "Se você deixou contato, podemos ligar para confirmar detalhes do local.",
];

export function PublicReportConfirmationPage() {
  const { id } = useParams();

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader className="items-center text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-success/12 text-success">
          <CheckCircle2Icon aria-hidden="true" className="size-7" />
        </span>
        <CardTitle>Denúncia recebida</CardTitle>
        <CardDescription>
          Obrigado por avisar. Nossa equipe vai analisar as informações enviadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {id ? (
          <div className="rounded-xl border border-dashed bg-muted/40 px-4 py-3 text-center">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              Protocolo
            </p>
            <p className="font-mono text-lg font-semibold uppercase">
              {formatProtocol(id)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Anote esse número para falar sobre a denúncia depois.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">O que acontece agora</p>
          <ol className="flex flex-col gap-2 text-sm leading-6 text-muted-foreground">
            {NEXT_STEPS.map((step, index) => (
              <li className="flex gap-2.5" key={step}>
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground"
                >
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <Button asChild className="min-h-11" variant="outline">
          <Link to="/denuncia">Enviar outra denúncia</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

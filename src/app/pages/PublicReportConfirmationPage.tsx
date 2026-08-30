import { CheckCircle2Icon } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PublicReportConfirmationPage() {
  const { id } = useParams();

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-success/12 text-success">
          <CheckCircle2Icon aria-hidden="true" className="size-7" />
        </span>
        <CardTitle>Denúncia recebida</CardTitle>
        <CardDescription>
          Obrigado por avisar. Nossa equipe vai analisar as informações enviadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 text-center">
        {id ? (
          <p className="text-xs text-muted-foreground">
            Protocolo: <span className="font-mono">{id}</span>
          </p>
        ) : null}
        <Button asChild className="min-h-11">
          <Link to="/denuncia">Enviar outra denúncia</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

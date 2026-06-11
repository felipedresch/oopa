import { AlertCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  title?: string;
  description: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Algo deu errado",
  description,
  onRetry,
}: ErrorStateProps) {
  return (
    <section
      className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center"
      role="alert"
    >
      <AlertCircleIcon aria-hidden="true" className="text-destructive" />
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {onRetry ? (
        <Button className="min-h-11" onClick={onRetry} type="button" variant="outline">
          Tentar novamente
        </Button>
      ) : null}
    </section>
  );
}

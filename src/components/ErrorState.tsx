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
      className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-xl bg-destructive/6 px-6 py-12 text-center"
      role="alert"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-destructive/12 text-destructive">
        <AlertCircleIcon aria-hidden="true" className="size-6" />
      </span>
      <div className="flex max-w-md flex-col gap-1.5">
        <h2 className="text-lg font-semibold">{title}</h2>
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

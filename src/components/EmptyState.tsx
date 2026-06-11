import { PawPrintIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  children?: ReactNode;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  children,
}: EmptyStateProps) {
  return (
    <section className="flex min-h-48 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
        {icon ?? <PawPrintIcon aria-hidden="true" className="size-6" />}
      </span>
      <div className="flex max-w-md flex-col gap-1.5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
      {actionLabel && onAction ? (
        <Button className="min-h-11 min-w-44" onClick={onAction} type="button">
          {actionLabel}
        </Button>
      ) : null}
    </section>
  );
}

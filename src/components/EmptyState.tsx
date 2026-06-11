import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <section className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-card px-6 py-10 text-center">
      {icon}
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <Button className="min-h-11 min-w-44" onClick={onAction} type="button">
          {actionLabel}
        </Button>
      ) : null}
    </section>
  );
}

import { ShieldOffIcon } from "lucide-react";

import { ACTION_COPY } from "@/lib/copy";

type PermissionDeniedProps = {
  message?: string;
};

export function PermissionDenied({
  message = ACTION_COPY.permissionDenied,
}: PermissionDeniedProps) {
  return (
    <section className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-xl border bg-card px-6 py-10 text-center">
      <ShieldOffIcon aria-hidden="true" className="text-muted-foreground" />
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-lg font-medium">Permissao negada</h2>
        <p className="text-sm leading-6 text-muted-foreground">{message}</p>
      </div>
    </section>
  );
}

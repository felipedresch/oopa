import { ShieldOffIcon } from "lucide-react";

import { ACTION_COPY } from "@/lib/copy";

type PermissionDeniedProps = {
  message?: string;
};

export function PermissionDenied({
  message = ACTION_COPY.permissionDenied,
}: PermissionDeniedProps) {
  return (
    <section className="flex min-h-48 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ShieldOffIcon aria-hidden="true" className="size-6" />
      </span>
      <div className="flex max-w-md flex-col gap-1.5">
        <h2 className="text-lg font-semibold">Permissão negada</h2>
        <p className="text-sm leading-6 text-muted-foreground">{message}</p>
      </div>
    </section>
  );
}

import { useMutation } from "convex/react";
import { useState } from "react";

import { api } from "../../../convex/_generated/api";
import { PageHeader } from "@/components/PageHeader";
import { usePermissions } from "@/hooks/usePermissions";

export function ProfilePage() {
  const { user } = usePermissions();
  const updateMyPreferences = useMutation(api.users.updateMyPreferences);
  const [saving, setSaving] = useState(false);

  if (!user) {
    return null;
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader description={user.email} title={user.nome} />

      <p className="text-sm">
        <span className="text-muted-foreground">Organização:</span>{" "}
        <span className="font-medium">{user.organizacao}</span>
      </p>

      <section className="flex flex-col gap-3 border-t pt-5">
        <h2 className="font-semibold">Notificações</h2>
        <label className="flex min-h-11 w-fit cursor-pointer items-center gap-2.5 rounded-lg border border-input bg-card px-3 text-sm font-medium transition-colors has-checked:border-primary has-checked:bg-accent has-checked:text-accent-foreground">
          <input
            checked={user.receber_alertas_resgate}
            className="accent-primary"
            disabled={saving}
            onChange={async (event) => {
              setSaving(true);
              try {
                await updateMyPreferences({
                  receber_alertas_resgate: event.target.checked,
                });
              } finally {
                setSaving(false);
              }
            }}
            type="checkbox"
          />
          Receber notificações de alerta de resgate
        </label>
      </section>
    </section>
  );
}

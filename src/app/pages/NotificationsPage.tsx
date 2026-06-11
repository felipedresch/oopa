import { useMutation, usePaginatedQuery } from "convex/react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/formatters";
import { groupByDate } from "@/lib/group-notifications";
import { cn } from "@/lib/utils";

type ReadFilter = "all" | "unread" | "read";

export function NotificationsPage() {
  const navigate = useNavigate();
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [now] = useState(() => Date.now());

  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  const { results, status, loadMore } = usePaginatedQuery(
    api.notifications.listMine,
    { readFilter },
    { initialNumItems: 20 },
  );

  const grouped = useMemo(() => groupByDate(results ?? [], now), [now, results]);

  const handleOpen = (notification: {
    _id: Id<"notifications">;
    href: string | null;
    lida: boolean;
  }) => {
    if (!notification.lida) {
      void markRead({ notificationId: notification._id });
    }
    if (notification.href) {
      void navigate(notification.href);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        actions={
          <Button
            className="min-h-11"
            onClick={() => void markAllRead({})}
            type="button"
            variant="outline"
          >
            Marcar todas como lidas
          </Button>
        }
        description="Acompanhe alertas legais e avisos operacionais da ONG."
        title="Notificacoes"
      />

      <div className="flex flex-wrap gap-2">
        {(["all", "unread", "read"] as const).map((filter) => (
          <Button
            className="min-h-11"
            key={filter}
            onClick={() => setReadFilter(filter)}
            type="button"
            variant={readFilter === filter ? "default" : "outline"}
          >
            {filter === "all" ? "Todas" : filter === "unread" ? "Nao lidas" : "Lidas"}
          </Button>
        ))}
      </div>

      {status === "LoadingFirstPage" ? <LoadingSkeleton rows={4} /> : null}

      {status !== "LoadingFirstPage" && results.length === 0 ? (
        <EmptyState
          description="Quando houver alertas legais ou avisos de identificacao, eles aparecerao aqui."
          title="Nenhuma notificacao"
        />
      ) : null}

      <div className="flex flex-col gap-6">
        {grouped.map((group) => (
          <section className="flex flex-col gap-3" key={group.label}>
            <h2 className="text-sm font-semibold text-muted-foreground">{group.label}</h2>
            <ul className="flex flex-col gap-2">
              {group.items.map((notification) => (
                <li key={notification._id}>
                  <button
                    className={cn(
                      "w-full rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/40",
                      !notification.lida && "border-primary/40 bg-primary/5",
                    )}
                    onClick={() => handleOpen(notification)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{notification.titulo}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {notification.mensagem}
                        </p>
                      </div>
                      {!notification.lida ? (
                        <span className="rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                          Nova
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDateTime(notification.criado_em)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {status === "CanLoadMore" ? (
        <Button className="min-h-11" onClick={() => loadMore(20)} type="button" variant="outline">
          Carregar mais
        </Button>
      ) : null}
    </section>
  );
}

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
    { initialNumItems: 25 },
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
        title="Notificações"
      />

      <div className="flex w-fit gap-1 rounded-xl bg-muted p-1">
        {(["all", "unread", "read"] as const).map((filter) => (
          <button
            aria-pressed={readFilter === filter}
            className={cn(
              "min-h-10 rounded-lg px-4 text-sm font-medium transition-colors",
              readFilter === filter
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
            key={filter}
            onClick={() => setReadFilter(filter)}
            type="button"
          >
            {filter === "all" ? "Todas" : filter === "unread" ? "Não lidas" : "Lidas"}
          </button>
        ))}
      </div>

      {status === "LoadingFirstPage" ? <LoadingSkeleton rows={4} /> : null}

      {status !== "LoadingFirstPage" && results.length === 0 ? (
        <EmptyState
          description="Quando houver alertas legais ou avisos de identificação, eles aparecerão aqui."
          title="Nenhuma notificação"
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
                      "flex w-full items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-xs transition-colors hover:border-ring/40 hover:bg-accent/30",
                      !notification.lida && "border-primary/50 bg-accent/40",
                    )}
                    onClick={() => handleOpen(notification)}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        notification.lida ? "bg-border" : "bg-primary",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block",
                          notification.lida ? "font-medium" : "font-semibold",
                        )}
                      >
                        {notification.titulo}
                      </span>
                      <span className="mt-0.5 block text-sm leading-6 text-muted-foreground">
                        {notification.mensagem}
                      </span>
                      <span className="mt-1.5 block text-xs text-muted-foreground">
                        {formatDateTime(notification.criado_em)}
                      </span>
                    </span>
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

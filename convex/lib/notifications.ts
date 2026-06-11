import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { normalizeMicrochip } from "../domainValidators";

type NotificationType = Doc<"notifications">["tipo"];
type EntityType = NonNullable<Doc<"notifications">["entidade_tipo"]>;

export async function insertNotification(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    tipo: NotificationType;
    titulo: string;
    mensagem: string;
    entidade_tipo?: EntityType;
    entidade_id?: string;
    criado_em?: number;
  },
): Promise<Id<"notifications">> {
  return await ctx.db.insert("notifications", {
    user_id: args.userId,
    tipo: args.tipo,
    titulo: args.titulo,
    mensagem: args.mensagem,
    entidade_tipo: args.entidade_tipo,
    entidade_id: args.entidade_id,
    lida: false,
    criado_em: args.criado_em ?? Date.now(),
  });
}

export async function fanOutNotification(
  ctx: MutationCtx,
  args: {
    organizacao: string;
    shouldNotify: (user: Doc<"users">) => boolean;
    tipo: NotificationType;
    titulo: string;
    mensagem: string;
    entidade_tipo?: EntityType;
    entidade_id?: string;
  },
): Promise<number> {
  const users = await ctx.db
    .query("users")
    .withIndex("by_active", (q) => q.eq("ativo", true))
    .collect();

  const now = Date.now();
  let count = 0;

  for (const user of users) {
    if (user.organizacao !== args.organizacao || !args.shouldNotify(user)) {
      continue;
    }

    await insertNotification(ctx, {
      userId: user._id,
      tipo: args.tipo,
      titulo: args.titulo,
      mensagem: args.mensagem,
      entidade_tipo: args.entidade_tipo,
      entidade_id: args.entidade_id,
      criado_em: now,
    });
    count += 1;
  }

  return count;
}

export async function notifyLegalOccurrence(
  ctx: MutationCtx,
  args: {
    organizacao: string;
    occurrenceId: Id<"occurrences">;
    dogNome: string;
    typeNome: string;
    actorNome: string;
  },
): Promise<number> {
  return await fanOutNotification(ctx, {
    organizacao: args.organizacao,
    shouldNotify: (user) => user.permissions.includes("occurrences.read_legal"),
    tipo: "legal_occurrence",
    titulo: "Ocorrencia legal registrada",
    mensagem: `${args.actorNome} registrou ${args.typeNome} para ${args.dogNome}.`,
    entidade_tipo: "occurrence",
    entidade_id: args.occurrenceId,
  });
}

export async function resolveNotificationHref(
  ctx: Pick<QueryCtx, "db">,
  notification: Doc<"notifications">,
): Promise<string | null> {
  if (notification.tipo === "dog_not_found" && notification.entidade_id) {
    return `/identify?microchip=${notification.entidade_id}`;
  }

  if (notification.entidade_tipo === "dog" && notification.entidade_id) {
    return `/dogs/${notification.entidade_id}`;
  }

  if (notification.entidade_tipo === "tutor" && notification.entidade_id) {
    return `/tutors/${notification.entidade_id}`;
  }

  if (notification.entidade_tipo === "occurrence" && notification.entidade_id) {
    const occurrence = await ctx.db.get("occurrences", notification.entidade_id as Id<"occurrences">);
    if (!occurrence) {
      return null;
    }
    return `/dogs/${occurrence.dog_id}/occurrences/${occurrence._id}`;
  }

  return null;
}

export function formatMicrochipForMessage(microchip: string): string {
  const digits = normalizeMicrochip(microchip);
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

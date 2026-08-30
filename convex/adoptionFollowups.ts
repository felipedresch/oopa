import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { fanOutNotification } from "./lib/notifications";
import { createAdoptionFollowupVisit } from "./lib/adoptions";
import { addCalendarMonths } from "./lib/adoptionFollowups";
import { getCurrentUser, requirePermission } from "./lib/auth";
import { recordAudit } from "./audit";
import {
  adoptionFollowupStatusValidator,
  dogSpeciesValidator,
} from "./domainValidators";
import { notFound, validationError } from "./errors";
import { hasPermission } from "./permissions";
import { internalMutation, mutation, query } from "./_generated/server";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const ESCALATION_AFTER_DAYS = 7;

const contactStatusValidator = v.union(
  v.literal("contatado"),
  v.literal("sem_resposta"),
);

const dogSummaryValidator = v.object({
  _id: v.id("dogs"),
  nome: v.string(),
  especie: v.optional(dogSpeciesValidator),
  microchip: v.optional(v.string()),
});

const personSummaryValidator = v.object({
  _id: v.id("people"),
  nome_completo: v.string(),
  telefone: v.optional(v.string()),
  email: v.optional(v.string()),
});

const followupItemValidator = v.object({
  _id: v.id("adoption_followups"),
  dog_id: v.id("dogs"),
  pessoa_id: v.id("people"),
  occurrence_id_adocao: v.id("occurrences"),
  data_prevista: v.number(),
  sequencia: v.number(),
  status: adoptionFollowupStatusValidator,
  tentativas: v.number(),
  ultima_tentativa_em: v.optional(v.number()),
  resultado: v.optional(v.string()),
  notificado_em: v.optional(v.number()),
  ocorrencia_visita_id: v.optional(v.id("occurrences")),
  dog: v.union(dogSummaryValidator, v.null()),
  pessoa: v.union(personSummaryValidator, v.null()),
  atraso_dias: v.number(),
});

const listReturnValidator = v.object({
  page: v.array(followupItemValidator),
  isDone: v.boolean(),
  continueCursor: v.string(),
});

function dueDelayInDays(
  status: Doc<"adoption_followups">["status"],
  dueAt: number,
  now: number,
) {
  if (status !== "pendente") {
    return 0;
  }

  return Math.max(0, Math.floor((now - dueAt) / DAY_IN_MS));
}

async function getAdoptionOwner(
  ctx: Pick<QueryCtx, "db">,
  followup: Doc<"adoption_followups">,
): Promise<Doc<"users"> | null> {
  const adoption = await ctx.db.get("occurrences", followup.occurrence_id_adocao);
  if (!adoption?.registrado_por) {
    return null;
  }

  return await ctx.db.get("users", adoption.registrado_por);
}

async function buildFollowupItem(
  ctx: Pick<QueryCtx, "db">,
  followup: Doc<"adoption_followups">,
  now: number,
  canSeeSensitivePersonData: boolean,
) {
  const [dog, person] = await Promise.all([
    ctx.db.get("dogs", followup.dog_id),
    ctx.db.get("people", followup.pessoa_id),
  ]);

  return {
    _id: followup._id,
    dog_id: followup.dog_id,
    pessoa_id: followup.pessoa_id,
    occurrence_id_adocao: followup.occurrence_id_adocao,
    data_prevista: followup.data_prevista,
    sequencia: followup.sequencia,
    status: followup.status,
    tentativas: followup.tentativas,
    ultima_tentativa_em: followup.ultima_tentativa_em,
    resultado: followup.resultado,
    notificado_em: followup.notificado_em,
    ocorrencia_visita_id: followup.ocorrencia_visita_id,
    dog: dog
      ? {
          _id: dog._id,
          nome: dog.nome,
          especie: dog.especie,
          microchip: dog.microchip,
        }
      : null,
    pessoa: person
      ? {
          _id: person._id,
          nome_completo: person.nome_completo,
          ...(canSeeSensitivePersonData
            ? { telefone: person.telefone, email: person.email }
            : {}),
        }
      : null,
    atraso_dias: dueDelayInDays(followup.status, followup.data_prevista, now),
  };
}

async function getAutomationActor(
  ctx: Pick<MutationCtx, "db">,
  followup: Doc<"adoption_followups">,
): Promise<Doc<"users"> | null> {
  const adoption = await ctx.db.get("occurrences", followup.occurrence_id_adocao);
  if (!adoption?.registrado_por) {
    return null;
  }

  const registeredBy = await ctx.db.get("users", adoption.registrado_por);
  if (registeredBy?.ativo) {
    return registeredBy;
  }

  if (!registeredBy) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_organization_and_active", (q) =>
      q.eq("organizacao", registeredBy.organizacao).eq("ativo", true),
    )
    .first();
}

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    dogId: v.optional(v.id("dogs")),
    status: v.optional(adoptionFollowupStatusValidator),
    agora: v.number(),
  },
  returns: listReturnValidator,
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "adoptions.read");

    const followups = ctx.db.query("adoption_followups");
    const baseQuery = args.dogId
      ? followups.withIndex("by_dog_and_due", (q) => q.eq("dog_id", args.dogId!))
      : args.status
        ? followups.withIndex("by_status_and_due", (q) => q.eq("status", args.status!))
        : followups.withIndex("by_due");

    const result = await baseQuery.order("asc").paginate(args.paginationOpts);
    const visibleFollowups = [] as Doc<"adoption_followups">[];

    for (const followup of result.page) {
      if (args.dogId && followup.dog_id !== args.dogId) {
        continue;
      }
      if (args.status && followup.status !== args.status) {
        continue;
      }

      const owner = await getAdoptionOwner(ctx, followup);
      if (owner?.organizacao === actor.organizacao) {
        visibleFollowups.push(followup);
      }
    }

    const page = await Promise.all(
      visibleFollowups.map((followup) =>
        buildFollowupItem(
          ctx,
          followup,
          args.agora,
          hasPermission(actor.permissions, "people.read_sensitive"),
        ),
      ),
    );

    return {
      page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const get = query({
  args: {
    followupId: v.id("adoption_followups"),
    agora: v.number(),
  },
  returns: v.union(followupItemValidator, v.null()),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "adoptions.read");

    const followup = await ctx.db.get("adoption_followups", args.followupId);
    if (!followup) {
      return null;
    }

    const owner = await getAdoptionOwner(ctx, followup);
    if (owner?.organizacao !== actor.organizacao) {
      throw notFound("Acompanhamento pós-adoção");
    }

    return await buildFollowupItem(
      ctx,
      followup,
      args.agora,
      hasPermission(actor.permissions, "people.read_sensitive"),
    );
  },
});

export const registerContact = mutation({
  args: {
    followupId: v.id("adoption_followups"),
    status: contactStatusValidator,
    resultado: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "adoptions.manage");

    const followup = await ctx.db.get("adoption_followups", args.followupId);
    if (!followup) {
      throw notFound("Acompanhamento pós-adoção");
    }

    const owner = await getAdoptionOwner(ctx, followup);
    if (owner?.organizacao !== actor.organizacao) {
      throw notFound("Acompanhamento pós-adoção");
    }
    if (followup.status !== "pendente") {
      throw validationError("Este acompanhamento já foi encerrado.");
    }

    const resultado = args.resultado.trim();
    if (!resultado) {
      throw validationError("Informe a observação do contato.");
    }

    const now = Date.now();
    const attempts = followup.tentativas + 1;

    if (args.status === "contatado") {
      await ctx.db.patch(followup._id, {
        status: "contatado",
        tentativas: attempts,
        ultima_tentativa_em: now,
        resultado,
        atualizado_em: now,
        atualizado_por: actor._id,
      });

      const nextFollowupId = await ctx.db.insert("adoption_followups", {
        dog_id: followup.dog_id,
        pessoa_id: followup.pessoa_id,
        occurrence_id_adocao: followup.occurrence_id_adocao,
        data_prevista: addCalendarMonths(now, 6),
        sequencia: followup.sequencia + 1,
        status: "pendente",
        tentativas: 0,
        criado_em: now,
        criado_por: actor._id,
      });

      await recordAudit(ctx, {
        actorUserId: actor._id,
        action: "adoptionFollowups.register_contact",
        entityType: "adoption_followup",
        entityId: followup._id,
        summary: "Contato de pós-adoção registrado",
        metadata: { status: args.status, next_followup_id: nextFollowupId },
      });
      return null;
    }

    const visitOccurrenceId = await createAdoptionFollowupVisit(ctx, actor, {
      dogId: followup.dog_id,
      pessoaId: followup.pessoa_id,
      data_ocorrencia: now,
      descricao: `Acompanhamento pós-adoção sem resposta. ${resultado}`,
    });

    await ctx.db.patch(followup._id, {
      status: "sem_resposta",
      tentativas: attempts,
      ultima_tentativa_em: now,
      resultado,
      ocorrencia_visita_id: visitOccurrenceId,
      atualizado_em: now,
      atualizado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "adoptionFollowups.register_contact",
      entityType: "adoption_followup",
      entityId: followup._id,
      summary: "Contato de pós-adoção encerrado sem resposta",
      metadata: { status: args.status, ocorrencia_visita_id: visitOccurrenceId },
    });
    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "adoptionFollowups.auto_visit",
      entityType: "adoption_followup",
      entityId: followup._id,
      summary: "Visita de acompanhamento criada após contato sem resposta",
      metadata: { ocorrencia_visita_id: visitOccurrenceId },
    });

    return null;
  },
});

export const runDaily = internalMutation({
  args: { agora: v.optional(v.number()) },
  returns: v.object({ notified: v.number(), automaticVisits: v.number() }),
  handler: async (ctx, args) => {
    const now = args.agora ?? Date.now();
    const dueFollowups = await ctx.db
      .query("adoption_followups")
      .withIndex("by_status_and_due", (q) =>
        q.eq("status", "pendente").lte("data_prevista", now),
      )
      .order("asc")
      .take(100);

    let notified = 0;
    let automaticVisits = 0;

    for (const followup of dueFollowups) {
      const actor = await getAutomationActor(ctx, followup);
      if (!actor) {
        continue;
      }

      const [dog, person] = await Promise.all([
        ctx.db.get("dogs", followup.dog_id),
        ctx.db.get("people", followup.pessoa_id),
      ]);
      if (!dog || !person) {
        continue;
      }

      const escalatedAt = followup.data_prevista + ESCALATION_AFTER_DAYS * DAY_IN_MS;
      if (now >= escalatedAt) {
        const visitOccurrenceId = await createAdoptionFollowupVisit(ctx, actor, {
          dogId: followup.dog_id,
          pessoaId: followup.pessoa_id,
          data_ocorrencia: now,
          descricao:
            "Acompanhamento pós-adoção sem resposta após 7 dias do vencimento.",
        });

        await ctx.db.patch(followup._id, {
          status: "sem_resposta",
          ocorrencia_visita_id: visitOccurrenceId,
          atualizado_em: now,
          atualizado_por: actor._id,
        });
        await recordAudit(ctx, {
          actorUserId: actor._id,
          action: "adoptionFollowups.auto_visit",
          entityType: "adoption_followup",
          entityId: followup._id,
          summary: `Visita de acompanhamento criada para ${dog.nome}`,
          metadata: { ocorrencia_visita_id: visitOccurrenceId, motivo: "sem_resposta" },
        });
        automaticVisits += 1;
        continue;
      }

      if (followup.notificado_em) {
        continue;
      }

      const notificationCount = await fanOutNotification(ctx, {
        organizacao: actor.organizacao,
        shouldNotify: (user) => hasPermission(user.permissions, "adoptions.manage"),
        tipo: "adoption_followup_due",
        titulo: "Acompanhamento pós-adoção pendente",
        mensagem: `O acompanhamento de ${dog.nome} está vencido e aguarda contato com ${person.nome_completo}.`,
        entidade_tipo: "adoption_followup",
        entidade_id: followup._id,
      });
      await ctx.db.patch(followup._id, { notificado_em: now });
      await recordAudit(ctx, {
        actorUserId: actor._id,
        action: "adoptionFollowups.notify",
        entityType: "adoption_followup",
        entityId: followup._id,
        summary: `Lembrete de pós-adoção enviado para ${dog.nome}`,
        metadata: { recipients: notificationCount },
      });
      notified += notificationCount;
    }

    return { notified, automaticVisits };
  },
});

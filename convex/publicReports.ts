import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { recordAudit } from "./audit";
import { publicReportStatusValidator } from "./domainValidators";
import { forbidden, notFound, validationError } from "./errors";
import { getCurrentUser } from "./lib/auth";
import { getOccurrenceTypeByName } from "./lib/occurrences";
import { normalizePaginationOpts } from "./lib/pagination";
import { MAX_PUBLIC_REPORT_PHOTOS, validateImageStorage } from "./lib/storage";
import { hasPermission } from "./permissions";
import { mutation, query } from "./_generated/server";

const MAX_DESCRIPTION_LENGTH = 4000;
const MAX_SHORT_TEXT_LENGTH = 200;

const publicReportSummaryValidator = v.object({
  _id: v.id("public_reports"),
  nome_denunciante: v.optional(v.string()),
  contato: v.optional(v.string()),
  tipo_denuncia: v.string(),
  descricao: v.string(),
  bairro_id: v.optional(v.id("bairros")),
  bairro_nome: v.union(v.string(), v.null()),
  local_descricao: v.optional(v.string()),
  status: publicReportStatusValidator,
  photo_urls: v.array(v.string()),
  occurrence_id_gerada: v.optional(v.id("occurrences")),
  criado_em: v.number(),
});

/**
 * URL assinada de upload sem autenticação: o portal público de denúncia
 * (`/denuncia`) é usado por visitantes não logados. Decisão confirmada
 * (docs/ajustes-cliente-modulos.md secao 4.1): sem protecao anti-spam na v1.
 */
export const createUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    nome_denunciante: v.optional(v.string()),
    contato: v.optional(v.string()),
    tipo_denuncia: v.string(),
    descricao: v.string(),
    bairro_id: v.optional(v.id("bairros")),
    local_descricao: v.optional(v.string()),
    photo_storage_ids: v.array(v.id("_storage")),
  },
  returns: v.id("public_reports"),
  handler: async (ctx, args) => {
    const descricao = args.descricao.trim();
    if (!descricao) {
      throw validationError("Descrição obrigatória.");
    }
    if (descricao.length > MAX_DESCRIPTION_LENGTH) {
      throw validationError(
        `Descrição deve ter no máximo ${MAX_DESCRIPTION_LENGTH} caracteres.`,
      );
    }

    const tipoDenuncia = args.tipo_denuncia.trim();
    if (!tipoDenuncia) {
      throw validationError("Tipo de denúncia obrigatório.");
    }

    const nomeDenunciante = args.nome_denunciante?.trim() || undefined;
    if (nomeDenunciante && nomeDenunciante.length > MAX_SHORT_TEXT_LENGTH) {
      throw validationError("Nome muito longo.");
    }

    const contato = args.contato?.trim() || undefined;
    if (contato && contato.length > MAX_SHORT_TEXT_LENGTH) {
      throw validationError("Contato muito longo.");
    }

    const localDescricao = args.local_descricao?.trim() || undefined;
    if (localDescricao && localDescricao.length > MAX_SHORT_TEXT_LENGTH) {
      throw validationError("Descrição do local muito longa.");
    }

    if (args.photo_storage_ids.length > MAX_PUBLIC_REPORT_PHOTOS) {
      throw validationError(`Envie no máximo ${MAX_PUBLIC_REPORT_PHOTOS} fotos.`);
    }

    if (args.bairro_id) {
      const bairro = await ctx.db.get("bairros", args.bairro_id);
      if (!bairro?.ativo) {
        throw validationError("Bairro inválido ou inativo.");
      }
    }

    for (const storageId of args.photo_storage_ids) {
      await validateImageStorage(ctx, storageId);
    }

    return await ctx.db.insert("public_reports", {
      nome_denunciante: nomeDenunciante,
      contato,
      tipo_denuncia: tipoDenuncia,
      descricao,
      bairro_id: args.bairro_id,
      local_descricao: localDescricao,
      fotos: args.photo_storage_ids,
      status: "novo",
      criado_em: Date.now(),
    });
  },
});

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(publicReportStatusValidator),
  },
  returns: v.object({
    page: v.array(publicReportSummaryValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "public_reports.triage")) {
      throw forbidden();
    }

    const paginationOpts = normalizePaginationOpts(args.paginationOpts);
    const status = args.status;
    const baseQuery = status
      ? ctx.db.query("public_reports").withIndex("by_status", (q) => q.eq("status", status))
      : ctx.db.query("public_reports");

    const result = await baseQuery.order("desc").paginate(paginationOpts);

    const page = await Promise.all(
      result.page.map(async (report) => {
        const bairro = report.bairro_id ? await ctx.db.get("bairros", report.bairro_id) : null;
        const photoUrls = (
          await Promise.all(report.fotos.map((storageId) => ctx.storage.getUrl(storageId)))
        ).filter((url): url is string => url !== null);

        return {
          _id: report._id,
          nome_denunciante: report.nome_denunciante,
          contato: report.contato,
          tipo_denuncia: report.tipo_denuncia,
          descricao: report.descricao,
          bairro_id: report.bairro_id,
          bairro_nome: bairro?.nome ?? null,
          local_descricao: report.local_descricao,
          status: report.status,
          photo_urls: photoUrls,
          occurrence_id_gerada: report.occurrence_id_gerada,
          criado_em: report.criado_em,
        };
      }),
    );

    return {
      page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const convertToOccurrence = mutation({
  args: {
    publicReportId: v.id("public_reports"),
    dogId: v.optional(v.id("dogs")),
    data_ocorrencia: v.optional(v.number()),
  },
  returns: v.id("occurrences"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "public_reports.triage")) {
      throw forbidden();
    }

    const report = await ctx.db.get("public_reports", args.publicReportId);
    if (!report) {
      throw notFound("Denúncia");
    }
    if (report.status === "convertido") {
      throw validationError("Denúncia já convertida em ocorrência.");
    }
    if (report.status === "arquivado") {
      throw validationError("Denúncia arquivada não pode ser convertida.");
    }

    if (args.dogId) {
      const dog = await ctx.db.get("dogs", args.dogId);
      if (!dog) {
        throw notFound("Cão");
      }
    }

    const type = await getOccurrenceTypeByName(ctx, "Denúncia Externa");
    if (!type?.ativo) {
      throw notFound("Tipo de ocorrência");
    }

    const contatoLine = [report.nome_denunciante, report.contato].filter(Boolean).join(" · ");
    const descricao = contatoLine
      ? `${report.descricao}\n\nDenunciante: ${contatoLine}`
      : report.descricao;

    const now = Date.now();
    const occurrenceId = await ctx.db.insert("occurrences", {
      dog_id: args.dogId,
      atribuivel_a_pessoa: false,
      occurrence_type_id: type._id,
      gravidade: type.gravidade_padrao,
      data_ocorrencia: args.data_ocorrencia ?? now,
      bairro_id: report.bairro_id,
      local_descricao: report.local_descricao,
      descricao,
      registrado_por: actor._id,
      criado_em: now,
    });

    for (const storageId of report.fotos) {
      await ctx.db.insert("occurrence_photos", {
        occurrence_id: occurrenceId,
        storage_id: storageId,
        criado_em: now,
        criado_por: actor._id,
      });
    }

    await ctx.db.patch(args.publicReportId, {
      status: "convertido",
      occurrence_id_gerada: occurrenceId,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "public_reports.convert_to_occurrence",
      entityType: "public_report",
      entityId: args.publicReportId,
      summary: `Denúncia convertida em ocorrência ${occurrenceId}`,
      metadata: { occurrence_id: occurrenceId, dog_id: args.dogId },
    });

    return occurrenceId;
  },
});

export const archive = mutation({
  args: {
    publicReportId: v.id("public_reports"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "public_reports.triage")) {
      throw forbidden();
    }

    const report = await ctx.db.get("public_reports", args.publicReportId);
    if (!report) {
      throw notFound("Denúncia");
    }
    if (report.status === "convertido") {
      throw validationError("Denúncia já convertida não pode ser arquivada.");
    }
    if (report.status === "arquivado") {
      return null;
    }

    await ctx.db.patch(args.publicReportId, { status: "arquivado" });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "public_reports.archive",
      entityType: "public_report",
      entityId: args.publicReportId,
      summary: "Denúncia arquivada",
    });

    return null;
  },
});

import { v } from "convex/values";

import { recordAudit } from "./audit";
import { isValidCnpj, normalizeCnpj } from "./domainValidators";
import { validationError } from "./errors";
import { getCurrentUser, requirePermission } from "./lib/auth";
import { validateImageStorage } from "./lib/storage";
import { mutation, query } from "./_generated/server";

const organizationValidator = v.object({
  _id: v.id("organization_settings"),
  razao_social: v.string(),
  nome_fantasia: v.optional(v.string()),
  cnpj: v.string(),
  inscricao_estadual: v.optional(v.string()),
  endereco_logradouro: v.optional(v.string()),
  endereco_numero: v.optional(v.string()),
  endereco_complemento: v.optional(v.string()),
  endereco_cep: v.optional(v.string()),
  bairro_id: v.optional(v.id("bairros")),
  bairro_nome: v.union(v.string(), v.null()),
  telefone: v.optional(v.string()),
  email: v.optional(v.string()),
  logo_url: v.union(v.string(), v.null()),
  atualizado_em: v.optional(v.number()),
});

/**
 * Dados da própria ONG (linha única). Leitura liberada para qualquer usuário
 * autenticado - são dados de identificação institucional, não sensíveis, e
 * serão consumidos por outras telas no futuro (ex.: comprovante de venda,
 * Fase 21) sem exigir `organization.manage`.
 */
export const get = query({
  args: {},
  returns: v.union(organizationValidator, v.null()),
  handler: async (ctx) => {
    await getCurrentUser(ctx);

    const settings = await ctx.db.query("organization_settings").first();
    if (!settings) {
      return null;
    }

    const bairro = settings.bairro_id ? await ctx.db.get("bairros", settings.bairro_id) : null;

    return {
      _id: settings._id,
      razao_social: settings.razao_social,
      nome_fantasia: settings.nome_fantasia,
      cnpj: settings.cnpj,
      inscricao_estadual: settings.inscricao_estadual,
      endereco_logradouro: settings.endereco_logradouro,
      endereco_numero: settings.endereco_numero,
      endereco_complemento: settings.endereco_complemento,
      endereco_cep: settings.endereco_cep,
      bairro_id: settings.bairro_id,
      bairro_nome: bairro?.nome ?? null,
      telefone: settings.telefone,
      email: settings.email,
      logo_url: settings.logo_storage_id
        ? await ctx.storage.getUrl(settings.logo_storage_id)
        : null,
      atualizado_em: settings.atualizado_em,
    };
  },
});

export const update = mutation({
  args: {
    razao_social: v.string(),
    nome_fantasia: v.optional(v.string()),
    cnpj: v.string(),
    inscricao_estadual: v.optional(v.string()),
    endereco_logradouro: v.optional(v.string()),
    endereco_numero: v.optional(v.string()),
    endereco_complemento: v.optional(v.string()),
    endereco_cep: v.optional(v.string()),
    bairro_id: v.optional(v.id("bairros")),
    telefone: v.optional(v.string()),
    email: v.optional(v.string()),
    logo_storage_id: v.optional(v.id("_storage")),
  },
  returns: v.id("organization_settings"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "organization.manage");

    const razaoSocial = args.razao_social.trim();
    if (!razaoSocial) {
      throw validationError("Razão social obrigatória.");
    }

    const cnpj = normalizeCnpj(args.cnpj);
    if (!isValidCnpj(cnpj)) {
      throw validationError("CNPJ inválido.");
    }

    if (args.bairro_id) {
      const bairro = await ctx.db.get("bairros", args.bairro_id);
      if (!bairro?.ativo) {
        throw validationError("Bairro inválido ou inativo.");
      }
    }

    if (args.logo_storage_id) {
      await validateImageStorage(ctx, args.logo_storage_id);
    }

    const payload = {
      razao_social: razaoSocial,
      nome_fantasia: args.nome_fantasia?.trim() || undefined,
      cnpj,
      inscricao_estadual: args.inscricao_estadual?.trim() || undefined,
      endereco_logradouro: args.endereco_logradouro?.trim() || undefined,
      endereco_numero: args.endereco_numero?.trim() || undefined,
      endereco_complemento: args.endereco_complemento?.trim() || undefined,
      endereco_cep: args.endereco_cep?.trim() || undefined,
      bairro_id: args.bairro_id,
      telefone: args.telefone?.trim() || undefined,
      email: args.email?.trim() || undefined,
      logo_storage_id: args.logo_storage_id,
      atualizado_em: Date.now(),
      atualizado_por: actor._id,
    };

    const existing = await ctx.db.query("organization_settings").first();
    const settingsId = existing
      ? existing._id
      : await ctx.db.insert("organization_settings", payload);

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    }

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "organization.update",
      entityType: "organization_settings",
      entityId: settingsId,
      summary: `Dados da ONG atualizados: ${razaoSocial}`,
    });

    return settingsId;
  },
});

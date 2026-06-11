import { v } from "convex/values";

import type { MutationCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import {
  moduleMapToPermissions,
  permissionsToModuleMap,
  SEED_PERMISSION_TEMPLATES,
} from "./permissions";

const SEED_OCCURRENCE_TYPES = [
  {
    nome: "Consulta/Visualizacao",
    categoria: "rotina" as const,
    requer_foto: false,
    gravidade_padrao: "info" as const,
  },
  {
    nome: "Castracao",
    categoria: "clinica" as const,
    requer_foto: false,
    gravidade_padrao: "baixa" as const,
  },
  {
    nome: "Vacinacao",
    categoria: "clinica" as const,
    requer_foto: false,
    gravidade_padrao: "baixa" as const,
  },
  {
    nome: "Atendimento Veterinario",
    categoria: "clinica" as const,
    requer_foto: false,
    gravidade_padrao: "media" as const,
  },
  {
    nome: "Resgate na Rua",
    categoria: "risco" as const,
    requer_foto: true,
    gravidade_padrao: "media" as const,
  },
  {
    nome: "Devolucao a ONG",
    categoria: "adocao" as const,
    requer_foto: true,
    gravidade_padrao: "media" as const,
  },
  {
    nome: "Adocao",
    categoria: "adocao" as const,
    requer_foto: false,
    gravidade_padrao: "baixa" as const,
  },
  {
    nome: "Transferencia de Tutor",
    categoria: "adocao" as const,
    requer_foto: false,
    gravidade_padrao: "baixa" as const,
  },
  {
    nome: "Fuga Confirmada",
    categoria: "risco" as const,
    requer_foto: false,
    gravidade_padrao: "alta" as const,
  },
  {
    nome: "Abandono Suspeito",
    categoria: "legal" as const,
    requer_foto: true,
    gravidade_padrao: "alta" as const,
  },
  {
    nome: "Denuncia de Maus-Tratos",
    categoria: "legal" as const,
    requer_foto: true,
    gravidade_padrao: "alta" as const,
  },
  {
    nome: "Obito",
    categoria: "outro" as const,
    requer_foto: false,
    gravidade_padrao: "alta" as const,
  },
  {
    nome: "Correcao/Retificacao",
    categoria: "outro" as const,
    requer_foto: false,
    gravidade_padrao: "info" as const,
  },
  {
    nome: "Outro",
    categoria: "outro" as const,
    requer_foto: false,
    gravidade_padrao: "info" as const,
  },
] as const;

const SEED_BAIRROS = ["Centro", "Zona Rural", "Nao informado"] as const;

const now = () => Date.now();

async function seedOccurrenceTypes(ctx: Pick<MutationCtx, "db">) {
  const existing = await ctx.db.query("occurrence_types").first();
  if (existing) {
    return 0;
  }

  for (const type of SEED_OCCURRENCE_TYPES) {
    await ctx.db.insert("occurrence_types", {
      ...type,
      ativo: true,
      criado_em: now(),
    });
  }

  return SEED_OCCURRENCE_TYPES.length;
}

async function seedBairros(ctx: Pick<MutationCtx, "db">) {
  const existing = await ctx.db.query("bairros").first();
  if (existing) {
    return 0;
  }

  for (const nome of SEED_BAIRROS) {
    await ctx.db.insert("bairros", {
      nome,
      ativo: true,
      criado_em: now(),
    });
  }

  return SEED_BAIRROS.length;
}

async function seedPermissionTemplates(ctx: Pick<MutationCtx, "db">) {
  const existing = await ctx.db.query("permission_templates").first();
  if (existing) {
    return 0;
  }

  for (const template of SEED_PERMISSION_TEMPLATES) {
    await ctx.db.insert("permission_templates", {
      nome: template.nome,
      descricao: template.descricao,
      permissions: moduleMapToPermissions(template.moduleMap),
      ativo: true,
      criado_em: now(),
    });
  }

  return SEED_PERMISSION_TEMPLATES.length;
}

export const runInitialSeeds = internalMutation({
  args: {},
  returns: v.object({
    occurrenceTypes: v.number(),
    bairros: v.number(),
    permissionTemplates: v.number(),
  }),
  handler: async (ctx) => {
    const occurrenceTypes = await seedOccurrenceTypes(ctx);
    const bairros = await seedBairros(ctx);
    const permissionTemplates = await seedPermissionTemplates(ctx);

    return { occurrenceTypes, bairros, permissionTemplates };
  },
});

export const seedAll = mutation({
  args: {},
  returns: v.object({
    occurrenceTypes: v.number(),
    bairros: v.number(),
    permissionTemplates: v.number(),
  }),
  handler: async (ctx) => {
    const occurrenceTypes = await seedOccurrenceTypes(ctx);
    const bairros = await seedBairros(ctx);
    const permissionTemplates = await seedPermissionTemplates(ctx);

    return { occurrenceTypes, bairros, permissionTemplates };
  },
});

export const getSeedSummary = query({
  args: {},
  returns: v.object({
    occurrenceTypeCount: v.number(),
    bairroCount: v.number(),
    permissionTemplateCount: v.number(),
    permissionCatalogSize: v.number(),
    uiModuleCount: v.number(),
  }),
  handler: async (ctx) => {
    const occurrenceTypes = await ctx.db.query("occurrence_types").collect();
    const bairros = await ctx.db.query("bairros").collect();
    const permissionTemplates = await ctx.db.query("permission_templates").collect();

    return {
      occurrenceTypeCount: occurrenceTypes.length,
      bairroCount: bairros.length,
      permissionTemplateCount: permissionTemplates.length,
      permissionCatalogSize: 23,
      uiModuleCount: 7,
    };
  },
});

export const getPermissionTemplateMaps = query({
  args: {},
  returns: v.array(
    v.object({
      nome: v.string(),
      moduleMap: v.object({
        dogs: v.union(
          v.literal("none"),
          v.literal("read"),
          v.literal("write"),
          v.literal("manage"),
        ),
        tutors: v.union(
          v.literal("none"),
          v.literal("read"),
          v.literal("write"),
          v.literal("manage"),
        ),
        occurrences: v.union(
          v.literal("none"),
          v.literal("read"),
          v.literal("write"),
          v.literal("manage"),
        ),
        adoptions: v.union(
          v.literal("none"),
          v.literal("read"),
          v.literal("write"),
          v.literal("manage"),
        ),
        team: v.union(
          v.literal("none"),
          v.literal("read"),
          v.literal("write"),
          v.literal("manage"),
        ),
        settings: v.union(
          v.literal("none"),
          v.literal("read"),
          v.literal("write"),
          v.literal("manage"),
        ),
        system: v.union(
          v.literal("none"),
          v.literal("read"),
          v.literal("write"),
          v.literal("manage"),
        ),
      }),
    }),
  ),
  handler: async (ctx) => {
    const templates = await ctx.db.query("permission_templates").collect();
    return templates.map((template) => ({
      nome: template.nome,
      moduleMap: permissionsToModuleMap(template.permissions),
    }));
  },
});

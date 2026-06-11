import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { recordAudit } from "./audit";
import {
  dogSexValidator,
  dogSizeValidator,
  dogStatusValidator,
  normalizeMicrochip,
} from "./domainValidators";
import { conflict, forbidden, notFound, validationError } from "./errors";
import {
  assertValidMicrochip,
  dogHasRecentGraveOccurrence,
  filterDogForViewer,
} from "./lib/dogs";
import { getCurrentUser, requirePermission } from "./lib/auth";
import { normalizePaginationOpts } from "./lib/pagination";
import { validateImageStorage } from "./lib/storage";
import { hasPermission } from "./permissions";
import { mutation, query } from "./_generated/server";

const dogSummaryValidator = v.object({
  _id: v.id("dogs"),
  microchip: v.string(),
  nome: v.string(),
  porte: dogSizeValidator,
  status_atual: dogStatusValidator,
  foto_perfil_url: v.union(v.string(), v.null()),
  grave_alert: v.boolean(),
});

const dogDetailValidator = v.object({
  _id: v.id("dogs"),
  microchip: v.string(),
  nome: v.string(),
  sexo: dogSexValidator,
  data_nascimento_aproximada: v.optional(v.number()),
  porte: dogSizeValidator,
  raca_aparente: v.optional(v.string()),
  cor_pelagem: v.optional(v.string()),
  caracteristicas_visuais: v.optional(v.string()),
  caracteristicas_comportamentais: v.optional(v.string()),
  condicoes_saude: v.optional(v.string()),
  castrado: v.boolean(),
  vacinas_em_dia: v.boolean(),
  foto_perfil_storage_id: v.optional(v.id("_storage")),
  foto_perfil_url: v.union(v.string(), v.null()),
  status_atual: dogStatusValidator,
  tutor_atual_id: v.optional(v.id("tutors")),
  observacoes: v.optional(v.string()),
  criado_em: v.number(),
  criado_por: v.optional(v.id("users")),
  atualizado_em: v.optional(v.number()),
  atualizado_por: v.optional(v.id("users")),
  grave_alert: v.boolean(),
});

const dogInputFields = {
  microchip: v.string(),
  nome: v.string(),
  sexo: dogSexValidator,
  data_nascimento_aproximada: v.optional(v.number()),
  porte: dogSizeValidator,
  raca_aparente: v.optional(v.string()),
  cor_pelagem: v.optional(v.string()),
  caracteristicas_visuais: v.optional(v.string()),
  caracteristicas_comportamentais: v.optional(v.string()),
  condicoes_saude: v.optional(v.string()),
  castrado: v.boolean(),
  vacinas_em_dia: v.boolean(),
  foto_perfil_storage_id: v.id("_storage"),
  observacoes: v.optional(v.string()),
};

export const create = mutation({
  args: dogInputFields,
  returns: v.id("dogs"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "dogs.create");

    const microchip = assertValidMicrochip(args.microchip);
    const nome = args.nome.trim();
    if (!nome) {
      throw validationError("Nome obrigatorio.");
    }

    if (!args.foto_perfil_storage_id) {
      throw validationError("Foto de perfil obrigatoria.");
    }

    await validateImageStorage(ctx, args.foto_perfil_storage_id);

    const existing = await ctx.db
      .query("dogs")
      .withIndex("by_microchip", (q) => q.eq("microchip", microchip))
      .unique();
    if (existing) {
      throw conflict("Ja existe um cao com este microchip.");
    }

    const now = Date.now();
    const dogId = await ctx.db.insert("dogs", {
      microchip,
      nome,
      sexo: args.sexo,
      data_nascimento_aproximada: args.data_nascimento_aproximada,
      porte: args.porte,
      raca_aparente: args.raca_aparente?.trim() || undefined,
      cor_pelagem: args.cor_pelagem?.trim() || undefined,
      caracteristicas_visuais: args.caracteristicas_visuais?.trim() || undefined,
      caracteristicas_comportamentais:
        args.caracteristicas_comportamentais?.trim() || undefined,
      condicoes_saude: args.condicoes_saude?.trim() || undefined,
      castrado: args.castrado,
      vacinas_em_dia: args.vacinas_em_dia,
      foto_perfil_storage_id: args.foto_perfil_storage_id,
      status_atual: "na_ong",
      observacoes: args.observacoes?.trim() || undefined,
      criado_em: now,
      criado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "dogs.create",
      entityType: "dog",
      entityId: dogId,
      summary: `Cao cadastrado: ${nome} (${microchip})`,
    });

    return dogId;
  },
});

export const update = mutation({
  args: {
    dogId: v.id("dogs"),
    nome: v.string(),
    sexo: dogSexValidator,
    data_nascimento_aproximada: v.optional(v.number()),
    porte: dogSizeValidator,
    raca_aparente: v.optional(v.string()),
    cor_pelagem: v.optional(v.string()),
    caracteristicas_visuais: v.optional(v.string()),
    caracteristicas_comportamentais: v.optional(v.string()),
    condicoes_saude: v.optional(v.string()),
    castrado: v.boolean(),
    vacinas_em_dia: v.boolean(),
    foto_perfil_storage_id: v.optional(v.id("_storage")),
    observacoes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "dogs.edit");

    const dog = await ctx.db.get("dogs", args.dogId);
    if (!dog) {
      throw notFound("Cao");
    }

    const nome = args.nome.trim();
    if (!nome) {
      throw validationError("Nome obrigatorio.");
    }

    if (args.foto_perfil_storage_id) {
      await validateImageStorage(ctx, args.foto_perfil_storage_id);
    }

    const now = Date.now();
    await ctx.db.patch(args.dogId, {
      nome,
      sexo: args.sexo,
      data_nascimento_aproximada: args.data_nascimento_aproximada,
      porte: args.porte,
      raca_aparente: args.raca_aparente?.trim() || undefined,
      cor_pelagem: args.cor_pelagem?.trim() || undefined,
      caracteristicas_visuais: args.caracteristicas_visuais?.trim() || undefined,
      caracteristicas_comportamentais:
        args.caracteristicas_comportamentais?.trim() || undefined,
      condicoes_saude: args.condicoes_saude?.trim() || undefined,
      castrado: args.castrado,
      vacinas_em_dia: args.vacinas_em_dia,
      foto_perfil_storage_id: args.foto_perfil_storage_id ?? dog.foto_perfil_storage_id,
      observacoes: args.observacoes?.trim() || undefined,
      atualizado_em: now,
      atualizado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "dogs.update",
      entityType: "dog",
      entityId: args.dogId,
      summary: `Cao atualizado: ${nome}`,
    });

    return null;
  },
});

export const changeStatus = mutation({
  args: {
    dogId: v.id("dogs"),
    status: dogStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "dogs.change_status");

    const dog = await ctx.db.get("dogs", args.dogId);
    if (!dog) {
      throw notFound("Cao");
    }

    if (dog.status_atual === args.status) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(args.dogId, {
      status_atual: args.status,
      atualizado_em: now,
      atualizado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "dogs.change_status",
      entityType: "dog",
      entityId: args.dogId,
      summary: `Status alterado para ${args.status}: ${dog.nome}`,
      metadata: { from: dog.status_atual, to: args.status },
    });

    return null;
  },
});

export const get = query({
  args: {
    dogId: v.id("dogs"),
    now: v.number(),
  },
  returns: v.union(dogDetailValidator, v.null()),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "dogs.read")) {
      throw forbidden();
    }

    const dog = await ctx.db.get("dogs", args.dogId);
    if (!dog) {
      return null;
    }

    const filtered = filterDogForViewer(dog, actor.permissions);
    const grave_alert = await dogHasRecentGraveOccurrence(ctx, dog._id, args.now);

    return {
      ...filtered,
      foto_perfil_url: dog.foto_perfil_storage_id
        ? await ctx.storage.getUrl(dog.foto_perfil_storage_id)
        : null,
      grave_alert,
    };
  },
});

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(dogStatusValidator),
    porte: v.optional(dogSizeValidator),
    search: v.optional(v.string()),
    graveRecent: v.optional(v.boolean()),
    now: v.number(),
  },
  returns: v.object({
    page: v.array(dogSummaryValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "dogs.read")) {
      throw forbidden();
    }

    const search = args.search?.trim().toLowerCase();
    const baseQuery = args.status
      ? ctx.db.query("dogs").withIndex("by_status", (q) => q.eq("status_atual", args.status!))
      : ctx.db.query("dogs");

    const result = await baseQuery
      .order("desc")
      .paginate(normalizePaginationOpts(args.paginationOpts));

    const page = (
      await Promise.all(
        result.page.map(async (dog) => {
          if (args.porte && dog.porte !== args.porte) {
            return null;
          }

          if (search) {
            const haystack = `${dog.nome} ${dog.microchip}`.toLowerCase();
            if (!haystack.includes(search)) {
              return null;
            }
          }

          const grave_alert = await dogHasRecentGraveOccurrence(ctx, dog._id, args.now);
          if (args.graveRecent && !grave_alert) {
            return null;
          }

          return {
            _id: dog._id,
            microchip: dog.microchip,
            nome: dog.nome,
            porte: dog.porte,
            status_atual: dog.status_atual,
            foto_perfil_url: dog.foto_perfil_storage_id
              ? await ctx.storage.getUrl(dog.foto_perfil_storage_id)
              : null,
            grave_alert,
          };
        }),
      )
    ).filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const findByMicrochip = query({
  args: {
    microchip: v.string(),
    now: v.number(),
  },
  returns: v.union(dogDetailValidator, v.null()),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "dogs.read")) {
      throw forbidden();
    }

    const microchip = normalizeMicrochip(args.microchip);
    if (!microchip) {
      return null;
    }

    const dog = await ctx.db
      .query("dogs")
      .withIndex("by_microchip", (q) => q.eq("microchip", microchip))
      .unique();

    if (!dog) {
      return null;
    }

    const filtered = filterDogForViewer(dog, actor.permissions);
    const grave_alert = await dogHasRecentGraveOccurrence(ctx, dog._id, args.now);

    return {
      ...filtered,
      foto_perfil_url: dog.foto_perfil_storage_id
        ? await ctx.storage.getUrl(dog.foto_perfil_storage_id)
        : null,
      grave_alert,
    };
  },
});

import { v } from "convex/values";

import { query } from "./_generated/server";
import { getCurrentUser, requirePermission } from "./lib/auth";
import { buildCsv } from "./lib/csv";

const MAX_EXPORT_ROWS = 5000;

export const exportDogsCsv = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "system.audit_log");

    const maxRows = Math.min(args.limit ?? 2000, MAX_EXPORT_ROWS);
    const dogs = await ctx.db.query("dogs").order("desc").take(maxRows);

    const rows: Array<Array<string | number | boolean | null | undefined>> = [
      [
        "microchip",
        "nome",
        "especie",
        "sexo",
        "porte",
        "status_atual",
        "castrado",
        "vacinas_em_dia",
        "pessoa_atual_id",
        "criado_em",
      ],
    ];

    for (const dog of dogs) {
      rows.push([
        dog.microchip,
        dog.nome,
        dog.especie ?? "cao",
        dog.sexo,
        dog.porte,
        dog.status_atual,
        dog.castrado,
        dog.vacinas_em_dia,
        dog.pessoa_atual_id ?? "",
        new Date(dog.criado_em).toISOString(),
      ]);
    }

    return buildCsv(rows);
  },
});

export const exportPeopleCsv = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "system.audit_log");

    const maxRows = Math.min(args.limit ?? 2000, MAX_EXPORT_ROWS);
    const people = await ctx.db.query("people").order("desc").take(maxRows);

    const rows: Array<Array<string | number | boolean | null | undefined>> = [
      [
        "nome_completo",
        "cpf",
        "telefone",
        "email",
        "bairro_id",
        "endereco_cep",
        "criado_em",
      ],
    ];

    for (const person of people) {
      rows.push([
        person.nome_completo,
        person.cpf ?? "",
        person.telefone ?? "",
        person.email ?? "",
        person.bairro_id ?? "",
        person.endereco_cep ?? "",
        new Date(person.criado_em).toISOString(),
      ]);
    }

    return buildCsv(rows);
  },
});

export const exportOccurrencesCsv = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "system.audit_log");

    const maxRows = Math.min(args.limit ?? 2000, MAX_EXPORT_ROWS);
    const occurrences = await ctx.db.query("occurrences").order("desc").take(maxRows);

    const rows: Array<Array<string | number | boolean | null | undefined>> = [
      [
        "dog_id",
        "occurrence_type_id",
        "gravidade",
        "data_ocorrencia",
        "bairro_id",
        "pessoa_id",
        "atribuivel_a_pessoa",
        "descricao",
        "criado_em",
      ],
    ];

    for (const occurrence of occurrences) {
      rows.push([
        occurrence.dog_id,
        occurrence.occurrence_type_id,
        occurrence.gravidade,
        new Date(occurrence.data_ocorrencia).toISOString(),
        occurrence.bairro_id ?? "",
        occurrence.pessoa_id ?? "",
        occurrence.atribuivel_a_pessoa,
        occurrence.descricao,
        new Date(occurrence.criado_em).toISOString(),
      ]);
    }

    return buildCsv(rows);
  },
});

export const exportPersonDogHistoryCsv = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "system.audit_log");

    const maxRows = Math.min(args.limit ?? 2000, MAX_EXPORT_ROWS);
    const history = await ctx.db.query("person_dog_history").order("desc").take(maxRows);

    const rows: Array<Array<string | number | boolean | null | undefined>> = [
      [
        "dog_id",
        "pessoa_id",
        "inicio",
        "fim",
        "tipo_inicio",
        "tipo_fim",
        "occurrence_id_inicio",
        "occurrence_id_fim",
      ],
    ];

    for (const entry of history) {
      rows.push([
        entry.dog_id,
        entry.pessoa_id,
        new Date(entry.inicio).toISOString(),
        entry.fim ? new Date(entry.fim).toISOString() : "",
        entry.tipo_inicio,
        entry.tipo_fim ?? "",
        entry.occurrence_id_inicio ?? "",
        entry.occurrence_id_fim ?? "",
      ]);
    }

    return buildCsv(rows);
  },
});

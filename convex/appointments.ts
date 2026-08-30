import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalQuery, mutation, query } from "./_generated/server";
import { recordAudit } from "./audit";
import {
  appointmentStatusValidator,
  appointmentTypeValidator,
  dogSpeciesValidator,
  serviceCategoryValidator,
  supplyCategoryValidator,
} from "./domainValidators";
import { conflict, notFound, validationError } from "./errors";
import { getCurrentUser, requireAnyPermission, requirePermission } from "./lib/auth";
import { validateNotaFiscalStorage } from "./lib/storage";
import { fanOutNotification } from "./lib/notifications";
import { normalizePaginationOpts } from "./lib/pagination";
import { hasPermission } from "./permissions";
import { parseNfeXml } from "./lib/nfe";

const serviceLineInputValidator = v.object({
  service_id: v.id("services"),
  quantidade: v.number(),
  valor_unitario: v.number(),
});

const supplyLineInputValidator = v.object({
  supply_id: v.id("supplies"),
  quantidade: v.number(),
  valor_unitario: v.number(),
});

const medicalRecordInputValidator = v.object({
  anamnese: v.optional(v.string()),
  diagnostico: v.optional(v.string()),
  procedimentos: v.optional(v.string()),
  medicamentos: v.optional(v.string()),
  peso_kg: v.optional(v.number()),
  temperatura_c: v.optional(v.number()),
  anexos: v.optional(v.array(v.id("_storage"))),
});

const dogSummaryValidator = v.object({
  _id: v.id("dogs"),
  nome: v.string(),
  especie: v.optional(dogSpeciesValidator),
  microchip: v.optional(v.string()),
});

const personSummaryValidator = v.object({
  _id: v.id("people"),
  nome_completo: v.string(),
});

const veterinarianSummaryValidator = v.object({
  _id: v.id("users"),
  nome: v.string(),
  email: v.optional(v.string()),
});

const serviceItemValidator = v.object({
  service_id: v.id("services"),
  nome: v.string(),
  categoria: serviceCategoryValidator,
  quantidade: v.number(),
  valor_unitario: v.number(),
  subtotal: v.number(),
});

const supplyItemValidator = v.object({
  supply_id: v.id("supplies"),
  nome: v.string(),
  categoria: supplyCategoryValidator,
  unidade_medida: v.optional(v.string()),
  quantidade: v.number(),
  valor_unitario: v.number(),
  subtotal: v.number(),
});

const medicalRecordValidator = v.object({
  _id: v.id("medical_records"),
  appointment_id: v.optional(v.id("service_appointments")),
  data_atendimento: v.number(),
  tipo: appointmentTypeValidator,
  veterinario: veterinarianSummaryValidator,
  anamnese: v.optional(v.string()),
  diagnostico: v.optional(v.string()),
  procedimentos: v.optional(v.string()),
  medicamentos: v.optional(v.string()),
  peso_kg: v.optional(v.number()),
  temperatura_c: v.optional(v.number()),
  anexos_urls: v.array(v.string()),
});

const appointmentListItemValidator = v.object({
  _id: v.id("service_appointments"),
  data_atendimento: v.number(),
  tipo_atendimento: appointmentTypeValidator,
  status: appointmentStatusValidator,
  historico: v.string(),
  valor_total: v.number(),
  nota_fiscal_numero: v.optional(v.string()),
  nota_fiscal_valor: v.optional(v.number()),
  data_emissao_nota_fiscal: v.optional(v.number()),
  nota_fiscal_url: v.union(v.string(), v.null()),
  dog: v.union(dogSummaryValidator, v.null()),
  solicitante: v.union(personSummaryValidator, v.null()),
  veterinario: veterinarianSummaryValidator,
});

const appointmentDetailValidator = v.object({
  ...appointmentListItemValidator.fields,
  servicos: v.array(serviceItemValidator),
  insumos: v.array(supplyItemValidator),
  desconto_valor: v.number(),
  medical_record: v.union(medicalRecordValidator, v.null()),
});

const medicalRecordListItemValidator = v.object({
  _id: v.id("medical_records"),
  appointment_id: v.optional(v.id("service_appointments")),
  data_atendimento: v.number(),
  tipo: appointmentTypeValidator,
  veterinario: veterinarianSummaryValidator,
  anamnese: v.optional(v.string()),
  diagnostico: v.optional(v.string()),
  procedimentos: v.optional(v.string()),
  medicamentos: v.optional(v.string()),
  peso_kg: v.optional(v.number()),
  temperatura_c: v.optional(v.number()),
  anexos_urls: v.array(v.string()),
});

const nfeParseResultValidator = v.object({
  sucesso: v.boolean(),
  numero: v.union(v.string(), v.null()),
  data_emissao: v.union(v.number(), v.null()),
  valor_total: v.union(v.number(), v.null()),
  mensagem: v.union(v.string(), v.null()),
});

const appointmentTypeForMedicalRecord = new Set([
  "consulta",
  "vacina",
  "cirurgia",
  "exame",
  "castracao",
  "emergencia",
]);

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertPositiveQuantity(value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw validationError("A quantidade deve ser maior que zero.");
  }
}

function assertNonNegativeMoney(value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw validationError("Os valores devem ser números maiores ou iguais a zero.");
  }
}

function assertDate(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw validationError(`${label} inválida.`);
  }
}

async function validateServiceLines(
  ctx: Parameters<typeof getCurrentUser>[0],
  lines: Array<{
    service_id: Id<"services">;
    quantidade: number;
    valor_unitario: number;
  }>,
) {
  const ids = new Set<Id<"services">>();
  const services = await Promise.all(
    lines.map(async (line) => {
      assertPositiveQuantity(line.quantidade);
      assertNonNegativeMoney(line.valor_unitario);
      if (ids.has(line.service_id)) {
        throw validationError("Não repita o mesmo serviço no atendimento.");
      }
      ids.add(line.service_id);

      const service = await ctx.db.get("services", line.service_id);
      if (!service) {
        throw notFound("Serviço");
      }
      if (!service.ativo) {
        throw validationError(`O serviço "${service.nome}" está inativo.`);
      }
      return { line, service };
    }),
  );
  return services;
}

async function validateSupplyLines(
  ctx: Parameters<typeof getCurrentUser>[0],
  lines: Array<{
    supply_id: Id<"supplies">;
    quantidade: number;
    valor_unitario: number;
  }>,
) {
  const ids = new Set<Id<"supplies">>();
  const supplies = await Promise.all(
    lines.map(async (line) => {
      assertPositiveQuantity(line.quantidade);
      assertNonNegativeMoney(line.valor_unitario);
      if (ids.has(line.supply_id)) {
        throw validationError("Não repita o mesmo insumo no atendimento.");
      }
      ids.add(line.supply_id);

      const supply = await ctx.db.get("supplies", line.supply_id);
      if (!supply) {
        throw notFound("Insumo");
      }
      if (!supply.ativo) {
        throw validationError(`O insumo "${supply.nome}" está inativo.`);
      }
      return { line, supply };
    }),
  );
  return supplies;
}

async function getAppointmentOrThrow(
  ctx: Parameters<typeof getCurrentUser>[0],
  appointmentId: Id<"service_appointments">,
) {
  const appointment = await ctx.db.get("service_appointments", appointmentId);
  if (!appointment) {
    throw notFound("Atendimento");
  }
  return appointment;
}

async function buildVeterinarianSummary(
  ctx: Parameters<typeof getCurrentUser>[0],
  userId: Id<"users">,
) {
  const user = await ctx.db.get("users", userId);
  return {
    _id: userId,
    nome: user?.nome ?? "Usuário removido",
    email: user?.email,
  };
}

async function buildAppointmentListItem(
  ctx: Parameters<typeof getCurrentUser>[0],
  appointment: Doc<"service_appointments">,
) {
  const [dog, person, veterinarian, notaFiscalUrl] = await Promise.all([
    ctx.db.get("dogs", appointment.dog_id),
    appointment.solicitante_id ? ctx.db.get("people", appointment.solicitante_id) : null,
    buildVeterinarianSummary(ctx, appointment.veterinario_user_id),
    appointment.nota_fiscal_storage_id
      ? ctx.storage.getUrl(appointment.nota_fiscal_storage_id)
      : null,
  ]);

  return {
    _id: appointment._id,
    data_atendimento: appointment.data_atendimento,
    tipo_atendimento: appointment.tipo_atendimento,
    status: appointment.status,
    historico: appointment.historico,
    valor_total: appointment.valor_total,
    nota_fiscal_numero: appointment.nota_fiscal_numero,
    nota_fiscal_valor: appointment.nota_fiscal_valor,
    data_emissao_nota_fiscal: appointment.data_emissao_nota_fiscal,
    nota_fiscal_url: notaFiscalUrl,
    dog: dog
      ? {
          _id: dog._id,
          nome: dog.nome,
          especie: dog.especie,
          microchip: dog.microchip,
        }
      : null,
    solicitante: person ? { _id: person._id, nome_completo: person.nome_completo } : null,
    veterinario: veterinarian,
  };
}

async function buildMedicalRecord(
  ctx: Parameters<typeof getCurrentUser>[0],
  record: Doc<"medical_records">,
) {
  const [veterinario, anexosUrls] = await Promise.all([
    buildVeterinarianSummary(ctx, record.veterinario_user_id),
    Promise.all(record.anexos.map((storageId) => ctx.storage.getUrl(storageId))).then((urls) =>
      urls.filter((url): url is string => Boolean(url)),
    ),
  ]);

  return {
    _id: record._id,
    appointment_id: record.appointment_id,
    data_atendimento: record.data_atendimento,
    tipo: record.tipo,
    veterinario,
    anamnese: record.anamnese,
    diagnostico: record.diagnostico,
    procedimentos: record.procedimentos,
    medicamentos: record.medicamentos,
    peso_kg: record.peso_kg,
    temperatura_c: record.temperatura_c,
    anexos_urls: anexosUrls,
  };
}

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(appointmentStatusValidator),
    dogId: v.optional(v.id("dogs")),
    solicitanteId: v.optional(v.id("people")),
    inicio: v.optional(v.number()),
    fim: v.optional(v.number()),
  },
  returns: v.object({
    page: v.array(appointmentListItemValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "appointments.read");

    if (args.inicio !== undefined && args.fim !== undefined && args.inicio > args.fim) {
      throw validationError("O período informado é inválido.");
    }

    const appointments = ctx.db.query("service_appointments");
    const baseQuery = args.dogId
      ? appointments.withIndex("by_dog_and_date", (q) => q.eq("dog_id", args.dogId!))
      : args.solicitanteId
        ? appointments.withIndex("by_person_and_date", (q) =>
          q.eq("solicitante_id", args.solicitanteId),
          )
        : args.status
          ? appointments.withIndex("by_status_and_date", (q) => q.eq("status", args.status!))
          : args.inicio !== undefined && args.fim !== undefined
            ? ctx.db
                .query("service_appointments")
                .withIndex("by_date", (q) =>
                  q.gte("data_atendimento", args.inicio!).lte("data_atendimento", args.fim!),
                )
            : args.inicio !== undefined
              ? ctx.db
                  .query("service_appointments")
                  .withIndex("by_date", (q) => q.gte("data_atendimento", args.inicio!))
              : args.fim !== undefined
                ? ctx.db
                    .query("service_appointments")
                    .withIndex("by_date", (q) => q.lte("data_atendimento", args.fim!))
                : appointments.withIndex("by_date");

    const result = await baseQuery
      .order("desc")
      .paginate(normalizePaginationOpts(args.paginationOpts));
    const filteredPage = result.page.filter((appointment) => {
      if (args.dogId && appointment.dog_id !== args.dogId) {
        return false;
      }
      if (args.solicitanteId && appointment.solicitante_id !== args.solicitanteId) {
        return false;
      }
      if (args.status && appointment.status !== args.status) {
        return false;
      }
      if (args.inicio !== undefined && appointment.data_atendimento < args.inicio) {
        return false;
      }
      if (args.fim !== undefined && appointment.data_atendimento > args.fim) {
        return false;
      }
      return true;
    });
    const page = await Promise.all(
      filteredPage.map((appointment) => buildAppointmentListItem(ctx, appointment)),
    );

    return {
      page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const get = query({
  args: { appointmentId: v.id("service_appointments") },
  returns: appointmentDetailValidator,
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "appointments.read");
    const appointment = await getAppointmentOrThrow(ctx, args.appointmentId);
    const summary = await buildAppointmentListItem(ctx, appointment);

    const [services, supplies, record] = await Promise.all([
      Promise.all(
        appointment.servicos.map(async (line) => {
          const service = await ctx.db.get("services", line.service_id);
          return {
            service_id: line.service_id,
            nome: service?.nome ?? "Serviço removido",
            categoria: service?.categoria ?? "outro",
            quantidade: line.quantidade,
            valor_unitario: line.valor_unitario,
            subtotal: roundMoney(line.quantidade * line.valor_unitario),
          };
        }),
      ),
      Promise.all(
        appointment.insumos.map(async (line) => {
          const supply = await ctx.db.get("supplies", line.supply_id);
          return {
            supply_id: line.supply_id,
            nome: supply?.nome ?? "Insumo removido",
            categoria: supply?.categoria ?? "outro",
            unidade_medida: supply?.unidade_medida,
            quantidade: line.quantidade,
            valor_unitario: line.valor_unitario,
            subtotal: roundMoney(line.quantidade * line.valor_unitario),
          };
        }),
      ),
      ctx.db
        .query("medical_records")
        .withIndex("by_appointment", (q) => q.eq("appointment_id", appointment._id))
        .unique(),
    ]);

    return {
      ...summary,
      servicos: services,
      insumos: supplies,
      desconto_valor: appointment.desconto_valor ?? 0,
      medical_record: record ? await buildMedicalRecord(ctx, record) : null,
    };
  },
});

export const listVeterinarians = query({
  args: {},
  returns: v.array(veterinarianSummaryValidator),
  handler: async (ctx) => {
    const actor = await getCurrentUser(ctx);
    requireAnyPermission(actor, ["appointments.read", "appointments.create"]);

    const users = await ctx.db
      .query("users")
      .withIndex("by_organization_and_active", (q) =>
        q.eq("organizacao", actor.organizacao).eq("ativo", true),
      )
      .take(200);

    return users
      .filter((user) => user.veterinario === true)
      .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"))
      .map((user) => ({ _id: user._id, nome: user.nome, email: user.email }));
  },
});

export const listMedicalRecordsByDog = query({
  args: {
    dogId: v.id("dogs"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(medicalRecordListItemValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "appointments.read");
    const result = await ctx.db
      .query("medical_records")
      .withIndex("by_dog_and_date", (q) => q.eq("dog_id", args.dogId))
      .order("desc")
      .paginate(normalizePaginationOpts(args.paginationOpts));
    const page = await Promise.all(result.page.map((record) => buildMedicalRecord(ctx, record)));

    return {
      page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const create = mutation({
  args: {
    dogId: v.id("dogs"),
    solicitanteId: v.optional(v.id("people")),
    veterinarioUserId: v.id("users"),
    tipoAtendimento: appointmentTypeValidator,
    dataAtendimento: v.number(),
    historico: v.string(),
    servicos: v.array(serviceLineInputValidator),
    insumos: v.array(supplyLineInputValidator),
    descontoValor: v.optional(v.number()),
    notaFiscalStorageId: v.optional(v.id("_storage")),
    notaFiscalNumero: v.optional(v.string()),
    notaFiscalValor: v.optional(v.number()),
    dataEmissaoNotaFiscal: v.optional(v.number()),
  },
  returns: v.id("service_appointments"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "appointments.create");

    const dog = await ctx.db.get("dogs", args.dogId);
    if (!dog) {
      throw notFound("Animal");
    }
    if (args.solicitanteId && !(await ctx.db.get("people", args.solicitanteId))) {
      throw notFound("Pessoa solicitante");
    }

    const veterinarian = await ctx.db.get("users", args.veterinarioUserId);
    if (!veterinarian || !veterinarian.ativo || veterinarian.organizacao !== actor.organizacao) {
      throw validationError("Selecione um veterinário ativo da organização.");
    }
    if (veterinarian.veterinario !== true) {
      throw validationError("O usuário selecionado não está marcado como veterinário.");
    }

    const historico = args.historico.trim();
    if (!historico) {
      throw validationError("O histórico do atendimento é obrigatório.");
    }
    assertDate(args.dataAtendimento, "Data do atendimento");

    const services = await validateServiceLines(ctx, args.servicos);
    const supplies = await validateSupplyLines(ctx, args.insumos);
    const desconto = args.descontoValor ?? 0;
    assertNonNegativeMoney(desconto);

    const subtotal = services.reduce(
      (total, { line }) => total + line.quantidade * line.valor_unitario,
      0,
    ) + supplies.reduce((total, { line }) => total + line.quantidade * line.valor_unitario, 0);
    if (desconto > subtotal) {
      throw validationError("O desconto não pode ser maior que o subtotal.");
    }

    if (args.notaFiscalStorageId) {
      await validateNotaFiscalStorage(ctx, args.notaFiscalStorageId);
    }
    if (args.notaFiscalValor !== undefined) {
      assertNonNegativeMoney(args.notaFiscalValor);
    }
    if (args.dataEmissaoNotaFiscal !== undefined) {
      assertDate(args.dataEmissaoNotaFiscal, "Data de emissão da nota fiscal");
    }

    const now = Date.now();
    const appointmentId = await ctx.db.insert("service_appointments", {
      dog_id: args.dogId,
      solicitante_id: args.solicitanteId,
      veterinario_user_id: args.veterinarioUserId,
      tipo_atendimento: args.tipoAtendimento,
      data_atendimento: args.dataAtendimento,
      historico,
      servicos: services.map(({ line }) => ({
        service_id: line.service_id,
        quantidade: line.quantidade,
        valor_unitario: roundMoney(line.valor_unitario),
      })),
      insumos: supplies.map(({ line }) => ({
        supply_id: line.supply_id,
        quantidade: line.quantidade,
        valor_unitario: roundMoney(line.valor_unitario),
      })),
      desconto_valor: roundMoney(desconto),
      valor_total: roundMoney(subtotal - desconto),
      nota_fiscal_storage_id: args.notaFiscalStorageId,
      nota_fiscal_numero: normalizeOptionalText(args.notaFiscalNumero),
      nota_fiscal_valor:
        args.notaFiscalValor === undefined ? undefined : roundMoney(args.notaFiscalValor),
      data_emissao_nota_fiscal: args.dataEmissaoNotaFiscal,
      status: "agendado",
      criado_em: now,
      criado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "appointments.create",
      entityType: "appointment",
      entityId: appointmentId,
      summary: `Atendimento criado para ${dog.nome}`,
      metadata: {
        valor_total: roundMoney(subtotal - desconto),
        nota_fiscal_anexada: Boolean(args.notaFiscalStorageId),
      },
    });

    if (args.notaFiscalStorageId) {
      await recordAudit(ctx, {
        actorUserId: actor._id,
        action: "appointments.nota_fiscal_upload",
        entityType: "appointment",
        entityId: appointmentId,
        summary: `Nota fiscal anexada ao atendimento de ${dog.nome}`,
      });
    }

    return appointmentId;
  },
});

export const complete = mutation({
  args: {
    appointmentId: v.id("service_appointments"),
    medicalRecord: v.optional(medicalRecordInputValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "appointments.manage");
    const appointment = await getAppointmentOrThrow(ctx, args.appointmentId);
    if (appointment.status === "cancelado") {
      throw conflict("Um atendimento cancelado não pode ser concluído.");
    }

    const medicalRecord = args.medicalRecord;
    if (medicalRecord?.peso_kg !== undefined) {
      if (!Number.isFinite(medicalRecord.peso_kg) || medicalRecord.peso_kg <= 0) {
        throw validationError("O peso deve ser maior que zero.");
      }
    }
    if (medicalRecord?.temperatura_c !== undefined) {
      if (!Number.isFinite(medicalRecord.temperatura_c) || medicalRecord.temperatura_c <= 0) {
        throw validationError("A temperatura deve ser maior que zero.");
      }
    }

    const wasCompleted = appointment.status === "realizado";
    await ctx.db.patch(appointment._id, {
      status: "realizado",
      atualizado_em: Date.now(),
      atualizado_por: actor._id,
    });

    let medicalRecordId: Id<"medical_records"> | null = null;
    const isClinical = appointmentTypeForMedicalRecord.has(appointment.tipo_atendimento);
    if (isClinical) {
      const existingRecord = await ctx.db
        .query("medical_records")
        .withIndex("by_appointment", (q) => q.eq("appointment_id", appointment._id))
        .unique();
      const fields = {
        dog_id: appointment.dog_id,
        appointment_id: appointment._id,
        data_atendimento: appointment.data_atendimento,
        tipo: appointment.tipo_atendimento,
        veterinario_user_id: appointment.veterinario_user_id,
        anamnese: normalizeOptionalText(medicalRecord?.anamnese),
        diagnostico: normalizeOptionalText(medicalRecord?.diagnostico),
        procedimentos: normalizeOptionalText(medicalRecord?.procedimentos),
        medicamentos: normalizeOptionalText(medicalRecord?.medicamentos),
        peso_kg: medicalRecord?.peso_kg,
        temperatura_c: medicalRecord?.temperatura_c,
        anexos: medicalRecord?.anexos ?? existingRecord?.anexos ?? [],
        atualizado_em: Date.now(),
        atualizado_por: actor._id,
      };

      if (existingRecord) {
        await ctx.db.patch(existingRecord._id, fields);
        medicalRecordId = existingRecord._id;
      } else {
        medicalRecordId = await ctx.db.insert("medical_records", {
          ...fields,
          criado_em: Date.now(),
          criado_por: actor._id,
        });
      }
    }

    const dog = await ctx.db.get("dogs", appointment.dog_id);
    let notified = 0;
    if (!wasCompleted && dog && !dog.microchip) {
      notified = await fanOutNotification(ctx, {
        organizacao: actor.organizacao,
        shouldNotify: (user) => hasPermission(user.permissions, "dogs.edit"),
        tipo: "microchip_pendente",
        titulo: "Microchip pendente após atendimento",
        mensagem: `O atendimento de ${dog.nome} foi concluído, mas o animal ainda não tem microchip cadastrado.`,
        entidade_tipo: "dog",
        entidade_id: dog._id,
      });
    }

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "appointments.complete",
      entityType: "appointment",
      entityId: appointment._id,
      summary: `Atendimento concluído${dog ? `: ${dog.nome}` : ""}`,
      metadata: {
        prontuario_id: medicalRecordId,
        microchip_pendente_notificado: notified,
      },
    });

    return null;
  },
});

export const cancel = mutation({
  args: { appointmentId: v.id("service_appointments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "appointments.manage");
    const appointment = await getAppointmentOrThrow(ctx, args.appointmentId);
    if (appointment.status === "realizado") {
      throw conflict("Um atendimento realizado não pode ser cancelado.");
    }
    if (appointment.status === "cancelado") {
      return null;
    }

    await ctx.db.patch(appointment._id, {
      status: "cancelado",
      atualizado_em: Date.now(),
      atualizado_por: actor._id,
    });
    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "appointments.cancel",
      entityType: "appointment",
      entityId: appointment._id,
      summary: "Atendimento cancelado",
    });
    return null;
  },
});

export const authorizeNotaFiscalParse = internalQuery({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "appointments.create");
    await validateNotaFiscalStorage(ctx, args.storageId);
    return null;
  },
});

export const parseNotaFiscal = action({
  args: { storageId: v.id("_storage") },
  returns: nfeParseResultValidator,
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.appointments.authorizeNotaFiscalParse, {
      storageId: args.storageId,
    });
    const file = await ctx.storage.get(args.storageId);
    if (!file) {
      throw notFound("Nota fiscal");
    }

    return parseNfeXml(await file.text());
  },
});

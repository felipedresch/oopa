import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { buildCsv } from "./lib/csv";
import { getCurrentUser, requirePermission } from "./lib/auth";
import {
  APPOINTMENT_TYPE_LABELS,
  CASTRATION_STATUS_LABELS,
  ESPECIE_LABELS,
  PUBLIC_REPORT_STATUS_LABELS,
  RESCUE_STATUS_LABELS,
  SEVERITY_LABELS,
} from "./lib/reportLabels";
import { validationError } from "./errors";

/** Teto de linhas por relatório, alinhado com `convex/exports.ts`. */
const MAX_REPORT_ROWS = 2000;

export const reportIdValidator = v.union(
  v.literal("castracoes"),
  v.literal("denuncias"),
  v.literal("atendimentos_urgentes"),
  v.literal("atendimentos_veterinarios"),
  v.literal("adocoes"),
);

type ReportId = "castracoes" | "denuncias" | "atendimentos_urgentes" | "atendimentos_veterinarios" | "adocoes";

const reportCellValidator = v.object({
  texto: v.string(),
  /** URL externa (ex.: download da nota fiscal). */
  href: v.optional(v.string()),
});

const reportRowValidator = v.object({
  id: v.string(),
  /** Rota interna da entidade de origem, quando existe. */
  rota: v.optional(v.string()),
  celulas: v.array(reportCellValidator),
});

const reportResultValidator = v.object({
  colunas: v.array(v.string()),
  linhas: v.array(reportRowValidator),
  resumo: v.array(v.object({ label: v.string(), valor: v.string() })),
  truncado: v.boolean(),
});

type ReportCell = { texto: string; href?: string };
type ReportRow = { id: string; rota?: string; celulas: ReportCell[] };
type ReportSummary = { label: string; valor: string };
type ReportResult = {
  colunas: string[];
  linhas: ReportRow[];
  resumo: ReportSummary[];
  truncado: boolean;
};

type ReportFilters = {
  inicio?: number;
  fim?: number;
  dogId?: Id<"dogs">;
  personId?: Id<"people">;
  bairroId?: Id<"bairros">;
};

const text = (value: string | undefined | null): ReportCell => ({ texto: value?.trim() || "—" });

/**
 * Data em dd/mm/aaaa no fuso de Sao Paulo. `toISOString()` usaria UTC e jogaria
 * atendimentos noturnos para o dia seguinte.
 */
const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDate(timestamp: number | undefined): ReportCell {
  if (timestamp === undefined) {
    return text(undefined);
  }
  return { texto: DATE_FORMATTER.format(new Date(timestamp)) };
}

function formatMoney(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function formatCurrency(value: number): ReportCell {
  return { texto: formatMoney(value) };
}

async function dogName(ctx: QueryCtx, id: Id<"dogs"> | undefined) {
  return id ? (await ctx.db.get("dogs", id))?.nome : undefined;
}

async function personName(ctx: QueryCtx, id: Id<"people"> | undefined) {
  return id ? (await ctx.db.get("people", id))?.nome_completo : undefined;
}

async function bairroName(ctx: QueryCtx, id: Id<"bairros"> | undefined) {
  return id ? (await ctx.db.get("bairros", id))?.nome : undefined;
}

function percent(part: number, total: number): string {
  if (total === 0) {
    return "0%";
  }
  return `${((part / total) * 100).toFixed(1).replace(".", ",")}%`;
}

async function buildCastrationsReport(
  ctx: QueryCtx,
  filters: ReportFilters,
): Promise<ReportResult> {
  const requests = await ctx.db
    .query("castration_requests")
    .withIndex("by_data_solicitacao", (q) => {
      if (filters.inicio !== undefined && filters.fim !== undefined) {
        return q.gte("data_solicitacao", filters.inicio).lte("data_solicitacao", filters.fim);
      }
      if (filters.inicio !== undefined) {
        return q.gte("data_solicitacao", filters.inicio);
      }
      if (filters.fim !== undefined) {
        return q.lte("data_solicitacao", filters.fim);
      }
      return q;
    })
    .order("asc")
    .take(MAX_REPORT_ROWS + 1);

  const truncado = requests.length > MAX_REPORT_ROWS;
  const page = requests.slice(0, MAX_REPORT_ROWS);

  const linhas: ReportRow[] = [];
  let ordem = 0;
  const counts: Record<string, number> = {};

  for (const request of page) {
    if (filters.personId && request.pessoa_id !== filters.personId) {
      continue;
    }
    if (filters.dogId && request.dog_id !== filters.dogId) {
      continue;
    }

    ordem += 1;
    counts[request.status] = (counts[request.status] ?? 0) + 1;
    const pessoaNome = await personName(ctx, request.pessoa_id);
    const animalNome =
      request.animal_descricao.nome?.trim() ||
      (await dogName(ctx, request.dog_id)) ||
      undefined;

    linhas.push({
      id: request._id,
      rota: `/castration/${request._id}`,
      celulas: [
        { texto: String(ordem) },
        formatDate(request.data_solicitacao),
        formatDate(request.data_agendada),
        text(animalNome),
        text(ESPECIE_LABELS[request.animal_descricao.especie]),
        text(pessoaNome),
        text(CASTRATION_STATUS_LABELS[request.status]),
      ],
    });
  }

  const realizadas = counts.realizada ?? 0;
  const naoCompareceu = counts.nao_compareceu ?? 0;

  return {
    colunas: [
      "Ordem",
      "Solicitação",
      "Agendada",
      "Animal",
      "Espécie",
      "Solicitante",
      "Status",
    ],
    linhas,
    resumo: [
      { label: "Solicitações no período", valor: String(linhas.length) },
      {
        label: "Na fila",
        valor: String((counts.aguardando ?? 0) + (counts.agendada ?? 0)),
      },
      { label: "Realizadas", valor: String(realizadas) },
      { label: "Não compareceu", valor: String(naoCompareceu) },
      {
        label: "Taxa de não comparecimento",
        valor: percent(naoCompareceu, realizadas + naoCompareceu),
      },
    ],
    truncado,
  };
}

/** Mapa `occurrence_type_id -> tipo`, carregado uma vez por relatório. */
async function loadOccurrenceTypes(ctx: QueryCtx) {
  const types = await ctx.db.query("occurrence_types").collect();
  return new Map(types.map((type) => [type._id, type]));
}

async function listOccurrencesInPeriod(ctx: QueryCtx, filters: ReportFilters) {
  return await ctx.db
    .query("occurrences")
    .withIndex("by_date", (q) => {
      if (filters.inicio !== undefined && filters.fim !== undefined) {
        return q.gte("data_ocorrencia", filters.inicio).lte("data_ocorrencia", filters.fim);
      }
      if (filters.inicio !== undefined) {
        return q.gte("data_ocorrencia", filters.inicio);
      }
      if (filters.fim !== undefined) {
        return q.lte("data_ocorrencia", filters.fim);
      }
      return q;
    })
    .order("asc")
    .take(MAX_REPORT_ROWS + 1);
}

function occurrenceRoute(occurrence: Doc<"occurrences">): string | undefined {
  return occurrence.dog_id
    ? `/dogs/${occurrence.dog_id}/occurrences/${occurrence._id}`
    : undefined;
}

async function buildComplaintsReport(
  ctx: QueryCtx,
  filters: ReportFilters,
): Promise<ReportResult> {
  const publicReports = await ctx.db
    .query("public_reports")
    .withIndex("by_criado_em", (q) => {
      if (filters.inicio !== undefined && filters.fim !== undefined) {
        return q.gte("criado_em", filters.inicio).lte("criado_em", filters.fim);
      }
      if (filters.inicio !== undefined) {
        return q.gte("criado_em", filters.inicio);
      }
      if (filters.fim !== undefined) {
        return q.lte("criado_em", filters.fim);
      }
      return q;
    })
    .order("asc")
    .take(MAX_REPORT_ROWS + 1);

  const types = await loadOccurrenceTypes(ctx);
  const occurrences = (await listOccurrencesInPeriod(ctx, filters)).filter(
    (occurrence) => types.get(occurrence.occurrence_type_id)?.categoria === "denuncia_externa",
  );

  const truncado =
    publicReports.length > MAX_REPORT_ROWS || occurrences.length > MAX_REPORT_ROWS;

  type Entry = {
    id: string;
    data: number;
    origem: string;
    tipo: string;
    bairroId?: Id<"bairros">;
    status: string;
    descricao: string;
    rota?: string;
  };

  const entries: Entry[] = [];

  for (const report of publicReports.slice(0, MAX_REPORT_ROWS)) {
    if (filters.bairroId && report.bairro_id !== filters.bairroId) {
      continue;
    }
    entries.push({
      id: report._id,
      data: report.criado_em,
      origem: "Portal público",
      tipo: report.tipo_denuncia,
      bairroId: report.bairro_id,
      status: PUBLIC_REPORT_STATUS_LABELS[report.status],
      descricao: report.descricao,
      rota: "/occurrences",
    });
  }

  for (const occurrence of occurrences.slice(0, MAX_REPORT_ROWS)) {
    if (filters.bairroId && occurrence.bairro_id !== filters.bairroId) {
      continue;
    }
    entries.push({
      id: occurrence._id,
      data: occurrence.data_ocorrencia,
      origem: "Ocorrência interna",
      tipo: types.get(occurrence.occurrence_type_id)?.nome ?? "Denúncia externa",
      bairroId: occurrence.bairro_id,
      status: SEVERITY_LABELS[occurrence.gravidade],
      descricao: occurrence.descricao,
      rota: occurrenceRoute(occurrence),
    });
  }

  entries.sort((a, b) => a.data - b.data);

  const linhas: ReportRow[] = [];
  const porOrigem: Record<string, number> = {};

  for (const [index, entry] of entries.entries()) {
    porOrigem[entry.origem] = (porOrigem[entry.origem] ?? 0) + 1;
    linhas.push({
      id: entry.id,
      rota: entry.rota,
      celulas: [
        { texto: String(index + 1) },
        formatDate(entry.data),
        text(entry.origem),
        text(entry.tipo),
        text(await bairroName(ctx, entry.bairroId)),
        text(entry.status),
        text(entry.descricao),
      ],
    });
  }

  return {
    colunas: [
      "Ordem",
      "Data",
      "Origem",
      "Tipo",
      "Bairro",
      "Status / gravidade",
      "Descrição",
    ],
    linhas,
    resumo: [
      { label: "Denúncias no período", valor: String(linhas.length) },
      { label: "Portal público", valor: String(porOrigem["Portal público"] ?? 0) },
      {
        label: "Ocorrências internas",
        valor: String(porOrigem["Ocorrência interna"] ?? 0),
      },
    ],
    truncado,
  };
}

async function buildUrgentCareReport(
  ctx: QueryCtx,
  filters: ReportFilters,
): Promise<ReportResult> {
  const rescues = await ctx.db
    .query("rescue_requests")
    .withIndex("by_criado_em", (q) => {
      if (filters.inicio !== undefined && filters.fim !== undefined) {
        return q.gte("criado_em", filters.inicio).lte("criado_em", filters.fim);
      }
      if (filters.inicio !== undefined) {
        return q.gte("criado_em", filters.inicio);
      }
      if (filters.fim !== undefined) {
        return q.lte("criado_em", filters.fim);
      }
      return q;
    })
    .order("asc")
    .take(MAX_REPORT_ROWS + 1);

  const types = await loadOccurrenceTypes(ctx);
  const occurrences = (await listOccurrencesInPeriod(ctx, filters)).filter((occurrence) => {
    const categoria = types.get(occurrence.occurrence_type_id)?.categoria;
    return categoria === "risco" || categoria === "legal";
  });

  const truncado = rescues.length > MAX_REPORT_ROWS || occurrences.length > MAX_REPORT_ROWS;

  type Entry = {
    id: string;
    data: number;
    origem: string;
    tipo: string;
    gravidade: keyof typeof SEVERITY_LABELS;
    bairroId?: Id<"bairros">;
    situacao: string;
    rota?: string;
  };

  const entries: Entry[] = [];

  for (const rescue of rescues.slice(0, MAX_REPORT_ROWS)) {
    if (rescue.gravidade !== "alta") {
      continue;
    }
    if (filters.bairroId && rescue.bairro_id !== filters.bairroId) {
      continue;
    }
    entries.push({
      id: rescue._id,
      data: rescue.criado_em,
      origem: "Resgate",
      tipo: rescue.tipo,
      gravidade: rescue.gravidade,
      bairroId: rescue.bairro_id,
      situacao: RESCUE_STATUS_LABELS[rescue.status],
      rota: `/rescues/${rescue._id}`,
    });
  }

  for (const occurrence of occurrences.slice(0, MAX_REPORT_ROWS)) {
    if (filters.bairroId && occurrence.bairro_id !== filters.bairroId) {
      continue;
    }
    const type = types.get(occurrence.occurrence_type_id);
    entries.push({
      id: occurrence._id,
      data: occurrence.data_ocorrencia,
      origem: type?.categoria === "legal" ? "Ocorrência legal" : "Ocorrência de risco",
      tipo: type?.nome ?? "Ocorrência",
      gravidade: occurrence.gravidade,
      bairroId: occurrence.bairro_id,
      situacao: occurrence.descricao,
      rota: occurrenceRoute(occurrence),
    });
  }

  entries.sort((a, b) => a.data - b.data);

  const linhas: ReportRow[] = [];
  const porOrigem: Record<string, number> = {};

  for (const [index, entry] of entries.entries()) {
    porOrigem[entry.origem] = (porOrigem[entry.origem] ?? 0) + 1;
    linhas.push({
      id: entry.id,
      rota: entry.rota,
      celulas: [
        { texto: String(index + 1) },
        formatDate(entry.data),
        text(entry.origem),
        text(entry.tipo),
        text(SEVERITY_LABELS[entry.gravidade]),
        text(await bairroName(ctx, entry.bairroId)),
        text(entry.situacao),
      ],
    });
  }

  return {
    colunas: [
      "Ordem",
      "Data",
      "Origem",
      "Tipo",
      "Gravidade",
      "Bairro",
      "Situação",
    ],
    linhas,
    resumo: [
      { label: "Atendimentos urgentes", valor: String(linhas.length) },
      { label: "Resgates graves", valor: String(porOrigem.Resgate ?? 0) },
      {
        label: "Ocorrências de risco",
        valor: String(porOrigem["Ocorrência de risco"] ?? 0),
      },
      {
        label: "Ocorrências legais",
        valor: String(porOrigem["Ocorrência legal"] ?? 0),
      },
    ],
    truncado,
  };
}

async function buildVeterinaryReport(
  ctx: QueryCtx,
  filters: ReportFilters,
): Promise<ReportResult> {
  const appointments = await ctx.db
    .query("service_appointments")
    .withIndex("by_date", (q) => {
      if (filters.inicio !== undefined && filters.fim !== undefined) {
        return q.gte("data_atendimento", filters.inicio).lte("data_atendimento", filters.fim);
      }
      if (filters.inicio !== undefined) {
        return q.gte("data_atendimento", filters.inicio);
      }
      if (filters.fim !== undefined) {
        return q.lte("data_atendimento", filters.fim);
      }
      return q;
    })
    .order("asc")
    .take(MAX_REPORT_ROWS + 1);

  const truncado = appointments.length > MAX_REPORT_ROWS;

  const linhas: ReportRow[] = [];
  let ordem = 0;
  let total = 0;
  let comNota = 0;

  for (const appointment of appointments.slice(0, MAX_REPORT_ROWS)) {
    if (filters.dogId && appointment.dog_id !== filters.dogId) {
      continue;
    }
    if (filters.personId && appointment.solicitante_id !== filters.personId) {
      continue;
    }

    ordem += 1;
    total += appointment.valor_total;

    const dog = await ctx.db.get("dogs", appointment.dog_id);
    const solicitante = await personName(ctx, appointment.solicitante_id);
    const notaUrl = appointment.nota_fiscal_storage_id
      ? await ctx.storage.getUrl(appointment.nota_fiscal_storage_id)
      : null;
    if (appointment.nota_fiscal_storage_id || appointment.nota_fiscal_numero) {
      comNota += 1;
    }

    linhas.push({
      id: appointment._id,
      rota: `/appointments/${appointment._id}`,
      celulas: [
        { texto: String(ordem) },
        formatDate(appointment.data_atendimento),
        text(dog?.nome),
        text(ESPECIE_LABELS[dog?.especie ?? "cao"]),
        text(solicitante),
        text(`${APPOINTMENT_TYPE_LABELS[appointment.tipo_atendimento]}: ${appointment.historico}`),
        formatCurrency(appointment.valor_total),
        {
          texto: appointment.nota_fiscal_numero ?? (notaUrl ? "Nota anexada" : "—"),
          ...(notaUrl ? { href: notaUrl } : {}),
        },
        formatDate(appointment.data_emissao_nota_fiscal),
      ],
    });
  }

  return {
    colunas: [
      "Ordem",
      "Data do atendimento",
      "Animal",
      "Espécie",
      "Solicitante",
      "Histórico",
      "Valor",
      "Nota fiscal",
      "Data de emissão",
    ],
    linhas,
    resumo: [
      { label: "Atendimentos no período", valor: String(linhas.length) },
      { label: "Valor total", valor: formatMoney(total) },
      {
        label: "Ticket médio",
        valor: formatMoney(linhas.length === 0 ? 0 : total / linhas.length),
      },
      { label: "Com nota fiscal", valor: String(comNota) },
    ],
    truncado,
  };
}

async function buildAdoptionsReport(
  ctx: QueryCtx,
  filters: ReportFilters,
): Promise<ReportResult> {
  const occurrences = await listOccurrencesInPeriod(ctx, filters);
  const adoptions = occurrences.filter((occurrence) => occurrence.adoption_payload);

  const followups = await ctx.db
    .query("adoption_followups")
    .withIndex("by_status_and_due", (q) => {
      const scoped = q.eq("status", "pendente");
      if (filters.inicio !== undefined && filters.fim !== undefined) {
        return scoped.gte("data_prevista", filters.inicio).lte("data_prevista", filters.fim);
      }
      if (filters.inicio !== undefined) {
        return scoped.gte("data_prevista", filters.inicio);
      }
      if (filters.fim !== undefined) {
        return scoped.lte("data_prevista", filters.fim);
      }
      return scoped;
    })
    .order("asc")
    .take(MAX_REPORT_ROWS + 1);

  const truncado =
    occurrences.length > MAX_REPORT_ROWS || followups.length > MAX_REPORT_ROWS;

  type Entry = {
    id: string;
    data: number;
    tipo: "Adoção" | "Acompanhamento";
    dogId?: Id<"dogs">;
    personId?: Id<"people">;
    detalhe: string;
    situacao: string;
    rota?: string;
  };

  const entries: Entry[] = [];

  for (const adoption of adoptions.slice(0, MAX_REPORT_ROWS)) {
    if (filters.dogId && adoption.dog_id !== filters.dogId) {
      continue;
    }
    if (filters.personId && adoption.pessoa_id !== filters.personId) {
      continue;
    }
    entries.push({
      id: adoption._id,
      data: adoption.adoption_payload?.data_adocao ?? adoption.data_ocorrencia,
      tipo: "Adoção",
      dogId: adoption.dog_id,
      personId: adoption.pessoa_id,
      detalhe: `Termo ${adoption.adoption_payload?.numero_termo_adocao ?? "—"}`,
      situacao: "Concluída",
      rota: occurrenceRoute(adoption),
    });
  }

  const agora = Date.now();
  let atrasados = 0;

  for (const followup of followups.slice(0, MAX_REPORT_ROWS)) {
    if (filters.dogId && followup.dog_id !== filters.dogId) {
      continue;
    }
    if (filters.personId && followup.pessoa_id !== filters.personId) {
      continue;
    }
    const atraso = Math.max(
      0,
      Math.floor((agora - followup.data_prevista) / (24 * 60 * 60 * 1000)),
    );
    if (atraso > 0) {
      atrasados += 1;
    }
    entries.push({
      id: followup._id,
      data: followup.data_prevista,
      tipo: "Acompanhamento",
      dogId: followup.dog_id,
      personId: followup.pessoa_id,
      detalhe: `Sequência ${followup.sequencia}`,
      situacao: atraso > 0 ? `Atrasado ${atraso} dia(s)` : "Pendente",
      rota: "/adoptions/followups",
    });
  }

  entries.sort((a, b) => a.data - b.data);

  const linhas: ReportRow[] = [];
  let totalAdocoes = 0;
  let totalFollowups = 0;

  for (const [index, entry] of entries.entries()) {
    if (entry.tipo === "Adoção") {
      totalAdocoes += 1;
    } else {
      totalFollowups += 1;
    }

    linhas.push({
      id: entry.id,
      rota: entry.rota,
      celulas: [
        { texto: String(index + 1) },
        formatDate(entry.data),
        text(entry.tipo),
        text(await dogName(ctx, entry.dogId)),
        text(await personName(ctx, entry.personId)),
        text(entry.detalhe),
        text(entry.situacao),
      ],
    });
  }

  return {
    colunas: ["Ordem", "Data", "Tipo", "Animal", "Pessoa", "Detalhe", "Situação"],
    linhas,
    resumo: [
      { label: "Adoções no período", valor: String(totalAdocoes) },
      { label: "Acompanhamentos pendentes", valor: String(totalFollowups) },
      { label: "Acompanhamentos atrasados", valor: String(atrasados) },
    ],
    truncado,
  };
}

const REPORT_BUILDERS: Record<
  ReportId,
  (ctx: QueryCtx, filters: ReportFilters) => Promise<ReportResult>
> = {
  castracoes: buildCastrationsReport,
  denuncias: buildComplaintsReport,
  atendimentos_urgentes: buildUrgentCareReport,
  atendimentos_veterinarios: buildVeterinaryReport,
  adocoes: buildAdoptionsReport,
};

const filterArgs = {
  relatorio: reportIdValidator,
  inicio: v.optional(v.number()),
  fim: v.optional(v.number()),
  dogId: v.optional(v.id("dogs")),
  personId: v.optional(v.id("people")),
  bairroId: v.optional(v.id("bairros")),
};

async function runReport(
  ctx: QueryCtx,
  args: {
    relatorio: ReportId;
    inicio?: number;
    fim?: number;
    dogId?: Id<"dogs">;
    personId?: Id<"people">;
    bairroId?: Id<"bairros">;
  },
): Promise<ReportResult> {
  const actor = await getCurrentUser(ctx);
  requirePermission(actor, "reports.read");

  if (args.inicio !== undefined && args.fim !== undefined && args.inicio > args.fim) {
    throw validationError("O período informado é inválido.");
  }

  const filters: ReportFilters = {
    inicio: args.inicio,
    fim: args.fim,
    dogId: args.dogId,
    personId: args.personId,
    bairroId: args.bairroId,
  };

  return await REPORT_BUILDERS[args.relatorio](ctx, filters);
}

export const run = query({
  args: filterArgs,
  returns: reportResultValidator,
  handler: async (ctx, args) => await runReport(ctx, args),
});

export const exportCsv = query({
  args: filterArgs,
  returns: v.string(),
  handler: async (ctx, args) => {
    const result = await runReport(ctx, args);
    const rows: Array<Array<string>> = [result.colunas];
    for (const linha of result.linhas) {
      rows.push(linha.celulas.map((celula) => celula.href ?? celula.texto));
    }
    return buildCsv(rows);
  },
});

/**
 * Busca leve de animais/pessoas para os seletores de filtro dos relatórios.
 * Vive aqui (e não em `dogs`/`people`) para que `reports.read` baste — quem só
 * lê relatórios não precisa de `dogs.read`/`people.read` para filtrar.
 */
export const searchEntities = query({
  args: {
    tipo: v.union(v.literal("dogs"), v.literal("people")),
    termo: v.optional(v.string()),
    limite: v.optional(v.number()),
  },
  returns: v.array(v.object({ id: v.string(), label: v.string() })),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "reports.read");

    const termo = args.termo?.trim().toLowerCase() ?? "";
    const limite = Math.min(Math.max(args.limite ?? 20, 1), 50);
    const candidates =
      args.tipo === "dogs"
        ? (await ctx.db.query("dogs").order("desc").take(MAX_REPORT_ROWS)).map((dog) => ({
            id: dog._id,
            label: dog.nome,
          }))
        : (await ctx.db.query("people").order("desc").take(MAX_REPORT_ROWS)).map((person) => ({
            id: person._id,
            label: person.nome_completo,
          }));

    return candidates
      .filter((item) => (termo ? item.label.toLowerCase().includes(termo) : true))
      .slice(0, limite);
  },
});

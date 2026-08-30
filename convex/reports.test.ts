/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { asUser, ensureSeeds, seedAdmin, seedUser, storeTestImage } from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const PERIOD_START = Date.UTC(2026, 3, 1);
const PERIOD_END = Date.UTC(2026, 3, 30, 23, 59);
const IN_PERIOD = Date.UTC(2026, 3, 10, 12);
const OUT_OF_PERIOD = Date.UTC(2026, 1, 10, 12);

async function seedDog(
  t: ReturnType<typeof convexTest>,
  adminId: Id<"users">,
  nome: string,
  microchip: string,
) {
  const storageId = await storeTestImage(t);
  return await asUser(t, adminId, (client) =>
    client.mutation(api.dogs.create, {
      microchip,
      nome,
      especie: "cao",
      sexo: "femea",
      porte: "medio",
      castrado: false,
      vacinas_em_dia: true,
      foto_perfil_storage_id: storageId,
    }),
  );
}

async function typeIdByName(
  t: ReturnType<typeof convexTest>,
  adminId: Id<"users">,
  nome: string,
) {
  const types = await asUser(t, adminId, (client) =>
    client.query(api.occurrenceTypes.list, {}),
  );
  const type = types.find((item) => item.nome === nome);
  if (!type) {
    throw new Error(`Tipo ${nome} não encontrado`);
  }
  return type._id;
}

async function reader(t: ReturnType<typeof convexTest>) {
  return await seedUser(t, {
    nome: "Leitor de relatórios",
    email: "relatorios@ong.local",
    permissions: ["reports.read"],
  });
}

test("run exige reports.read", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const semAcesso = await seedUser(t, {
    nome: "Sem relatórios",
    email: "sem-relatorios@ong.local",
    permissions: ["dogs.read"],
  });

  await expect(
    asUser(t, semAcesso, (client) =>
      client.query(api.reports.run, { relatorio: "castracoes" }),
    ),
  ).rejects.toThrow();
});

test("run rejeita período invertido", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const readerId = await reader(t);

  await expect(
    asUser(t, readerId, (client) =>
      client.query(api.reports.run, {
        relatorio: "castracoes",
        inicio: PERIOD_END,
        fim: PERIOD_START,
      }),
    ),
  ).rejects.toThrow();
});

test("relatório de castrações traz fila, status e taxa de não comparecimento", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const readerId = await reader(t);
  const personId = await asUser(t, adminId, (client) =>
    client.mutation(api.people.create, {
      nome_completo: "Solicitante Castração",
      cpf: "39053344705",
    }),
  );

  const ids: Id<"castration_requests">[] = [];
  for (const nome of ["Bolinha", "Nina", "Thor"]) {
    ids.push(
      await asUser(t, adminId, (client) =>
        client.mutation(api.castration.create, {
          pessoa_id: personId,
          animal_descricao: { nome, especie: "cao", porte: "pequeno", sexo: "femea" },
        }),
      ),
    );
  }

  await t.run(async (ctx) => {
    await ctx.db.patch(ids[0], { data_solicitacao: IN_PERIOD, status: "realizada" });
    await ctx.db.patch(ids[1], { data_solicitacao: IN_PERIOD, status: "nao_compareceu" });
    await ctx.db.patch(ids[2], { data_solicitacao: OUT_OF_PERIOD });
  });

  const result = await asUser(t, readerId, (client) =>
    client.query(api.reports.run, {
      relatorio: "castracoes",
      inicio: PERIOD_START,
      fim: PERIOD_END,
    }),
  );

  expect(result.linhas).toHaveLength(2);
  expect(result.linhas[0]?.rota).toBe(`/castration/${ids[0]}`);
  expect(result.linhas.map((linha) => linha.celulas[3]?.texto)).toEqual([
    "Bolinha",
    "Nina",
  ]);
  expect(result.resumo).toContainEqual({
    label: "Taxa de não comparecimento",
    valor: "50,0%",
  });
});

test("relatório de denúncias une portal público e ocorrências de denúncia externa", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const readerId = await reader(t);
  const dogId = await seedDog(t, adminId, "Luna", "111111111111111");

  const publicId = await t.mutation(api.publicReports.create, {
    tipo_denuncia: "maus-tratos",
    descricao: "Animal preso sem água.",
    photo_storage_ids: [],
  });
  await t.run(async (ctx) => {
    await ctx.db.patch(publicId, { criado_em: IN_PERIOD });
  });

  const externaTypeId = await typeIdByName(t, adminId, "Denúncia Externa");
  await asUser(t, adminId, (client) =>
    client.mutation(api.occurrences.create, {
      dogId,
      occurrenceTypeId: externaTypeId,
      descricao: "Denúncia convertida em ocorrência.",
      data_ocorrencia: IN_PERIOD,
      photo_storage_ids: [],
    }),
  );

  const result = await asUser(t, readerId, (client) =>
    client.query(api.reports.run, {
      relatorio: "denuncias",
      inicio: PERIOD_START,
      fim: PERIOD_END,
    }),
  );

  expect(result.linhas).toHaveLength(2);
  expect(result.linhas.map((linha) => linha.celulas[2]?.texto).sort()).toEqual([
    "Ocorrência interna",
    "Portal público",
  ]);
  expect(result.resumo).toContainEqual({ label: "Portal público", valor: "1" });
});

test("relatório de atendimentos urgentes traz resgates graves e ocorrências de risco/legal", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const readerId = await reader(t);
  const dogId = await seedDog(t, adminId, "Pipoca", "222222222222222");

  const graveId = await asUser(t, adminId, (client) =>
    client.mutation(api.rescues.create, {
      tipo: "Atropelamento",
      gravidade: "alta",
      descricao_solicitante: "Animal atropelado na avenida.",
      photo_storage_ids: [],
    }),
  );
  const levelId = await asUser(t, adminId, (client) =>
    client.mutation(api.rescues.create, {
      tipo: "Abandono",
      gravidade: "baixa",
      descricao_solicitante: "Animal solto na praça.",
      photo_storage_ids: [],
    }),
  );
  await t.run(async (ctx) => {
    await ctx.db.patch(graveId, { criado_em: IN_PERIOD });
    await ctx.db.patch(levelId, { criado_em: IN_PERIOD });
  });

  const legalTypeId = await typeIdByName(t, adminId, "Denúncia de Maus-Tratos");
  const photoId = await storeTestImage(t);
  await asUser(t, adminId, (client) =>
    client.mutation(api.occurrences.create, {
      dogId,
      occurrenceTypeId: legalTypeId,
      descricao: "Suspeita de maus-tratos.",
      data_ocorrencia: IN_PERIOD,
      photo_storage_ids: [photoId],
    }),
  );

  const result = await asUser(t, readerId, (client) =>
    client.query(api.reports.run, {
      relatorio: "atendimentos_urgentes",
      inicio: PERIOD_START,
      fim: PERIOD_END,
    }),
  );

  expect(result.linhas).toHaveLength(2);
  expect(result.resumo).toContainEqual({ label: "Resgates graves", valor: "1" });
  expect(result.resumo).toContainEqual({ label: "Ocorrências legais", valor: "1" });
});

test("relatório veterinário usa as colunas pedidas e soma valores", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const readerId = await reader(t);
  const dogId = await seedDog(t, adminId, "Mel", "333333333333333");
  const personId = await asUser(t, adminId, (client) =>
    client.mutation(api.people.create, {
      nome_completo: "Solicitante Atendimento",
      cpf: "39053344705",
    }),
  );
  const vetId = await seedUser(t, {
    nome: "Dra. Ana",
    email: "ana.relatorios@ong.local",
    permissions: ["appointments.read", "appointments.create"],
    veterinario: true,
  });
  const serviceId = await asUser(t, adminId, (client) =>
    client.mutation(api.services.create, {
      nome: "Consulta clínica",
      categoria: "consulta",
      valor_padrao: 80,
    }),
  );

  await asUser(t, adminId, (client) =>
    client.mutation(api.appointments.create, {
      dogId,
      solicitanteId: personId,
      veterinarioUserId: vetId,
      tipoAtendimento: "consulta",
      dataAtendimento: IN_PERIOD,
      historico: "Avaliação de rotina.",
      servicos: [{ service_id: serviceId, quantidade: 1, valor_unitario: 80 }],
      insumos: [],
    }),
  );

  const result = await asUser(t, readerId, (client) =>
    client.query(api.reports.run, {
      relatorio: "atendimentos_veterinarios",
      inicio: PERIOD_START,
      fim: PERIOD_END,
    }),
  );

  expect(result.colunas).toEqual([
    "Ordem",
    "Data do atendimento",
    "Animal",
    "Espécie",
    "Solicitante",
    "Histórico",
    "Valor",
    "Nota fiscal",
    "Data de emissão",
  ]);
  expect(result.linhas).toHaveLength(1);
  expect(result.linhas[0]?.celulas[2]?.texto).toBe("Mel");
  expect(result.linhas[0]?.celulas[4]?.texto).toBe("Solicitante Atendimento");
  expect(result.resumo).toContainEqual({ label: "Valor total", valor: "R$ 80,00" });

  const outroDogId = await seedDog(t, adminId, "Outro", "444444444444444");
  const filtrado = await asUser(t, readerId, (client) =>
    client.query(api.reports.run, {
      relatorio: "atendimentos_veterinarios",
      inicio: PERIOD_START,
      fim: PERIOD_END,
      dogId: outroDogId,
    }),
  );
  expect(filtrado.linhas).toHaveLength(0);
});

test("relatório de adoções une adoções e acompanhamentos pendentes", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const readerId = await reader(t);
  const dogId = await seedDog(t, adminId, "Luna", "555555555555555");
  const personId = await asUser(t, adminId, (client) =>
    client.mutation(api.people.create, {
      nome_completo: "Marina Tutora",
      cpf: "39053344705",
    }),
  );

  await asUser(t, adminId, (client) =>
    client.mutation(api.adoptions.create, {
      dogId,
      personId,
      data_adocao: IN_PERIOD,
      numero_termo_adocao: "TERM-REL",
      responsavel_ong_user_id: adminId,
      condicoes_adocao: "Acompanhamento em três meses.",
      confirmou_documentos: true,
      confirmou_orientacoes: true,
    }),
  );

  const result = await asUser(t, readerId, (client) =>
    client.query(api.reports.run, {
      relatorio: "adocoes",
      inicio: PERIOD_START,
      fim: Date.UTC(2026, 11, 31),
    }),
  );

  expect(result.linhas.map((linha) => linha.celulas[2]?.texto)).toEqual([
    "Adoção",
    "Acompanhamento",
  ]);
  expect(result.linhas[0]?.celulas[5]?.texto).toBe("Termo TERM-REL");
  expect(result.resumo).toContainEqual({ label: "Adoções no período", valor: "1" });
  expect(result.resumo).toContainEqual({
    label: "Acompanhamentos pendentes",
    valor: "1",
  });
});

test("exportCsv gera cabeçalho e linhas do relatório", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const readerId = await reader(t);
  const personId = await asUser(t, adminId, (client) =>
    client.mutation(api.people.create, {
      nome_completo: "Solicitante CSV",
      cpf: "39053344705",
    }),
  );
  const castrationId = await asUser(t, adminId, (client) =>
    client.mutation(api.castration.create, {
      pessoa_id: personId,
      animal_descricao: { nome: "Bolinha", especie: "cao", porte: "pequeno", sexo: "femea" },
    }),
  );
  await t.run(async (ctx) => {
    await ctx.db.patch(castrationId, { data_solicitacao: IN_PERIOD });
  });

  const csv = await asUser(t, readerId, (client) =>
    client.query(api.reports.exportCsv, {
      relatorio: "castracoes",
      inicio: PERIOD_START,
      fim: PERIOD_END,
    }),
  );

  const [header, first] = csv.split("\n");
  expect(header).toContain('"Solicitante"');
  expect(first).toContain('"Bolinha"');
  expect(first).toContain('"Solicitante CSV"');
});

test("exportCsv exige reports.read", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const semAcesso = await seedUser(t, {
    nome: "Sem relatórios",
    email: "sem-relatorios-csv@ong.local",
    permissions: ["dogs.read"],
  });

  await expect(
    asUser(t, semAcesso, (client) =>
      client.query(api.reports.exportCsv, { relatorio: "denuncias" }),
    ),
  ).rejects.toThrow();
});

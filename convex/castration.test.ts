/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { asUser, ensureSeeds, seedAdmin, seedUser, storeTestImage } from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedPerson(t: ReturnType<typeof convexTest>, adminId: Id<"users">) {
  return await asUser(t, adminId, async (client) =>
    client.mutation(api.people.create, {
      nome_completo: "Solicitante Castração",
      cpf: "39053344705",
    }),
  );
}

async function seedDog(t: ReturnType<typeof convexTest>, adminId: Id<"users">) {
  const storageId = await storeTestImage(t);
  return await asUser(t, adminId, async (client) =>
    client.mutation(api.dogs.create, {
      microchip: "555555555555555",
      nome: "Fido",
      especie: "cao",
      sexo: "macho",
      porte: "pequeno",
      castrado: false,
      vacinas_em_dia: false,
      foto_perfil_storage_id: storageId,
    }),
  );
}

test("create exige castration.create", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const personId = await seedPerson(t, adminId);
  const readerId = await seedUser(t, {
    nome: "Sem permissao",
    email: "sem-castration@ong.local",
    permissions: ["dogs.read"],
  });

  await expect(
    asUser(t, readerId, async (client) =>
      client.mutation(api.castration.create, {
        pessoa_id: personId,
        animal_descricao: { especie: "cao", porte: "medio", sexo: "macho" },
      }),
    ),
  ).rejects.toThrow();
});

test("create insere solicitacao com status aguardando", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const personId = await seedPerson(t, adminId);

  const castrationId = await asUser(t, adminId, async (client) =>
    client.mutation(api.castration.create, {
      pessoa_id: personId,
      animal_descricao: { nome: "Bolinha", especie: "cao", porte: "pequeno", sexo: "femea" },
      observacoes: "Trazida pela vizinha.",
    }),
  );

  const request = await t.run(async (ctx) => ctx.db.get("castration_requests", castrationId));
  expect(request?.status).toBe("aguardando");
  expect(request?.animal_descricao.nome).toBe("Bolinha");
  expect(request?.dog_id).toBeUndefined();
});

test("updateDataSolicitacao exige castration.manage e audita reordenacao", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const personId = await seedPerson(t, adminId);
  const creatorId = await seedUser(t, {
    nome: "Sem gestao",
    email: "sem-gestao-castration@ong.local",
    permissions: ["castration.create"],
  });

  const castrationId = await asUser(t, creatorId, async (client) =>
    client.mutation(api.castration.create, {
      pessoa_id: personId,
      animal_descricao: { especie: "gato", porte: "pequeno", sexo: "macho" },
    }),
  );

  await expect(
    asUser(t, creatorId, async (client) =>
      client.mutation(api.castration.updateDataSolicitacao, {
        castrationId,
        data_solicitacao: Date.now() - 1000,
      }),
    ),
  ).rejects.toThrow();

  const novaData = Date.now() - 5000;
  await asUser(t, adminId, async (client) =>
    client.mutation(api.castration.updateDataSolicitacao, {
      castrationId,
      data_solicitacao: novaData,
    }),
  );

  const request = await t.run(async (ctx) => ctx.db.get("castration_requests", castrationId));
  expect(request?.data_solicitacao).toBe(novaData);
});

test("updateStatus bloqueia transicao direta para realizada", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const personId = await seedPerson(t, adminId);

  const castrationId = await asUser(t, adminId, async (client) =>
    client.mutation(api.castration.create, {
      pessoa_id: personId,
      animal_descricao: { especie: "cao", porte: "medio", sexo: "macho" },
    }),
  );

  await expect(
    asUser(t, adminId, async (client) =>
      client.mutation(api.castration.updateStatus, { castrationId, status: "realizada" }),
    ),
  ).rejects.toThrow(/concluir/i);

  const agendada = Date.now() + 86_400_000;
  await asUser(t, adminId, async (client) =>
    client.mutation(api.castration.updateStatus, {
      castrationId,
      status: "agendada",
      data_agendada: agendada,
    }),
  );

  const request = await t.run(async (ctx) => ctx.db.get("castration_requests", castrationId));
  expect(request?.status).toBe("agendada");
  expect(request?.data_agendada).toBe(agendada);
});

test("markRealizada com dogId existente vincula sem criar novo animal", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const personId = await seedPerson(t, adminId);
  const dogId = await seedDog(t, adminId);

  const castrationId = await asUser(t, adminId, async (client) =>
    client.mutation(api.castration.create, {
      pessoa_id: personId,
      animal_descricao: { especie: "cao", porte: "pequeno", sexo: "macho" },
    }),
  );

  const dogsBefore = await t.run(async (ctx) => (await ctx.db.query("dogs").collect()).length);

  const resultDogId = await asUser(t, adminId, async (client) =>
    client.mutation(api.castration.markRealizada, { castrationId, dogId }),
  );

  const dogsAfter = await t.run(async (ctx) => (await ctx.db.query("dogs").collect()).length);
  expect(dogsAfter).toBe(dogsBefore);
  expect(resultDogId).toBe(dogId);

  const request = await t.run(async (ctx) => ctx.db.get("castration_requests", castrationId));
  expect(request?.status).toBe("realizada");
  expect(request?.dog_id).toBe(dogId);
});

test("markRealizada sem dogId cria animal sem microchip vinculado a pessoa", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const personId = await seedPerson(t, adminId);

  const castrationId = await asUser(t, adminId, async (client) =>
    client.mutation(api.castration.create, {
      pessoa_id: personId,
      animal_descricao: { nome: "Sem Nome Ainda", especie: "gato", porte: "pequeno", sexo: "femea", cor: "preta" },
    }),
  );

  const newDogId = await asUser(t, adminId, async (client) =>
    client.mutation(api.castration.markRealizada, { castrationId }),
  );

  const dog = await t.run(async (ctx) => ctx.db.get("dogs", newDogId));
  expect(dog?.microchip).toBeUndefined();
  expect(dog?.castrado).toBe(true);
  expect(dog?.pessoa_atual_id).toBe(personId);
  expect(dog?.nome).toBe("Sem Nome Ainda");

  const request = await t.run(async (ctx) => ctx.db.get("castration_requests", castrationId));
  expect(request?.status).toBe("realizada");
  expect(request?.dog_id).toBe(newDogId);

  await expect(
    asUser(t, adminId, async (client) =>
      client.mutation(api.castration.markRealizada, { castrationId }),
    ),
  ).rejects.toThrow(/já marcada/i);
});

test("list ordena por data_solicitacao (FIFO) e filtra por status", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const personId = await seedPerson(t, adminId);

  const firstId = await asUser(t, adminId, async (client) =>
    client.mutation(api.castration.create, {
      pessoa_id: personId,
      animal_descricao: { especie: "cao", porte: "pequeno", sexo: "macho" },
    }),
  );
  const secondId = await asUser(t, adminId, async (client) =>
    client.mutation(api.castration.create, {
      pessoa_id: personId,
      animal_descricao: { especie: "gato", porte: "pequeno", sexo: "femea" },
    }),
  );

  await asUser(t, adminId, async (client) =>
    client.mutation(api.castration.updateStatus, {
      castrationId: secondId,
      status: "cancelada",
    }),
  );

  const all = await asUser(t, adminId, async (client) =>
    client.query(api.castration.list, { paginationOpts: { numItems: 10, cursor: null } }),
  );
  expect(all.page.map((item) => item._id)).toEqual([firstId, secondId]);

  const onlyCancelada = await asUser(t, adminId, async (client) =>
    client.query(api.castration.list, {
      paginationOpts: { numItems: 10, cursor: null },
      status: "cancelada",
    }),
  );
  expect(onlyCancelada.page.map((item) => item._id)).toEqual([secondId]);
});

test("list e get exigem castration.read", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const personId = await seedPerson(t, adminId);
  const creatorId = await seedUser(t, {
    nome: "Sem leitura",
    email: "sem-leitura-castration@ong.local",
    permissions: ["castration.create"],
  });

  const castrationId = await asUser(t, creatorId, async (client) =>
    client.mutation(api.castration.create, {
      pessoa_id: personId,
      animal_descricao: { especie: "cao", porte: "grande", sexo: "macho" },
    }),
  );

  await expect(
    asUser(t, creatorId, async (client) =>
      client.query(api.castration.list, { paginationOpts: { numItems: 10, cursor: null } }),
    ),
  ).rejects.toThrow();

  await expect(
    asUser(t, creatorId, async (client) => client.query(api.castration.get, { castrationId })),
  ).rejects.toThrow();

  const detail = await asUser(t, adminId, async (client) =>
    client.query(api.castration.get, { castrationId }),
  );
  expect(detail?.pessoa_nome).toBe("Solicitante Castração");
});

test("updateStatus recusa agendar sem data agendada", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const personId = await seedPerson(t, adminId);

  const castrationId = await asUser(t, adminId, async (client) =>
    client.mutation(api.castration.create, {
      pessoa_id: personId,
      animal_descricao: { especie: "cao", porte: "medio", sexo: "macho" },
    }),
  );

  await expect(
    asUser(t, adminId, async (client) =>
      client.mutation(api.castration.updateStatus, {
        castrationId,
        status: "agendada",
      }),
    ),
  ).rejects.toThrow();

  const stillWaiting = await asUser(t, adminId, async (client) =>
    client.query(api.castration.get, { castrationId }),
  );
  expect(stillWaiting?.status).toBe("aguardando");
});

test("updateStatus mantém a data já agendada ao reagendar sem informá-la", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const personId = await seedPerson(t, adminId);
  const agendada = Date.UTC(2026, 4, 20, 13);

  const castrationId = await asUser(t, adminId, async (client) =>
    client.mutation(api.castration.create, {
      pessoa_id: personId,
      animal_descricao: { especie: "cao", porte: "medio", sexo: "macho" },
    }),
  );
  await asUser(t, adminId, async (client) =>
    client.mutation(api.castration.updateStatus, {
      castrationId,
      status: "agendada",
      data_agendada: agendada,
    }),
  );
  await asUser(t, adminId, async (client) =>
    client.mutation(api.castration.updateStatus, { castrationId, status: "agendada" }),
  );

  const detail = await asUser(t, adminId, async (client) =>
    client.query(api.castration.get, { castrationId }),
  );
  expect(detail?.data_agendada).toBe(agendada);
});

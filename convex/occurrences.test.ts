/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { asUser, ensureSeeds, seedAdmin, seedBairro, seedUser, storeTestImage } from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedDog(t: ReturnType<typeof convexTest>, adminId: Id<"users">) {
  const storageId = await storeTestImage(t);
  return await asUser(t, adminId, async (client) =>
    client.mutation(api.dogs.create, {
      microchip: "222222222222222",
      nome: "Luna",
      especie: "gato",
      sexo: "femea",
      porte: "pequeno",
      castrado: true,
      vacinas_em_dia: true,
      foto_perfil_storage_id: storageId,
    }),
  );
}

async function seedPerson(t: ReturnType<typeof convexTest>, adminId: Id<"users">) {
  return await asUser(t, adminId, async (client) =>
    client.mutation(api.people.create, {
      nome_completo: "Paula Tutora",
      cpf: "39053344705",
    }),
  );
}

async function getTypeId(
  t: ReturnType<typeof convexTest>,
  adminId: Id<"users">,
  nome: string,
): Promise<Id<"occurrence_types">> {
  const types = await asUser(t, adminId, async (client) =>
    client.query(api.occurrenceTypes.list, {}),
  );
  const type = types.find((item) => item.nome === nome);
  if (!type) {
    throw new Error(`Tipo ${nome} nao encontrado`);
  }
  return type._id;
}

test("create exige foto para tipo que requer foto e salva snapshot", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const dogId = await seedDog(t, adminId);
  const personId = await seedPerson(t, adminId);
  const bairroId = await seedBairro(t, "Centro");
  const resgateTypeId = await getTypeId(t, adminId, "Resgate na Rua");

  await t.run(async (ctx) => {
    await ctx.db.patch(dogId, { pessoa_atual_id: personId });
  });

  await expect(
    asUser(t, adminId, async (client) => {
      await client.mutation(api.occurrences.create, {
        dogId,
        occurrenceTypeId: resgateTypeId,
        descricao: "Sem foto",
        data_ocorrencia: Date.now(),
        photo_storage_ids: [],
      });
    }),
  ).rejects.toThrow(/foto/i);

  const storageId = await storeTestImage(t);
  const occurrenceId = await asUser(t, adminId, async (client) =>
    client.mutation(api.occurrences.create, {
      dogId,
      occurrenceTypeId: resgateTypeId,
      descricao: "Resgate com foto",
      data_ocorrencia: Date.now(),
      bairro_id: bairroId,
      photo_storage_ids: [storageId],
    }),
  );

  const detail = await asUser(t, adminId, async (client) =>
    client.query(api.occurrences.get, { occurrenceId }),
  );

  expect(detail?.pessoa_snapshot?.nome_completo).toBe("Paula Tutora");
  expect(detail?.photos).toHaveLength(1);
});

test("usuario sem read_legal nao le ocorrencia legal", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const readerId = await seedUser(t, {
    nome: "Leitor",
    email: "occ-reader@ong.local",
    permissions: ["dogs.read", "occurrences.read", "occurrences.create_rotina"],
  });
  const dogId = await seedDog(t, adminId);
  const legalTypeId = await getTypeId(t, adminId, "Denúncia de Maus-Tratos");
  const storageId = await storeTestImage(t);

  const occurrenceId = await asUser(t, adminId, async (client) =>
    client.mutation(api.occurrences.create, {
      dogId,
      occurrenceTypeId: legalTypeId,
      descricao: "Denuncia",
      data_ocorrencia: Date.now(),
      photo_storage_ids: [storageId],
    }),
  );

  await expect(
    asUser(t, readerId, async (client) =>
      client.query(api.occurrences.get, { occurrenceId }),
    ),
  ).rejects.toThrow();
});

test("retificacao cria ocorrencia com original_id", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const dogId = await seedDog(t, adminId);
  const rotinaTypeId = await getTypeId(t, adminId, "Consulta/Visualização");

  const originalId = await asUser(t, adminId, async (client) =>
    client.mutation(api.occurrences.create, {
      dogId,
      occurrenceTypeId: rotinaTypeId,
      descricao: "Consulta original",
      data_ocorrencia: Date.now(),
      photo_storage_ids: [],
    }),
  );

  const rectificationId = await asUser(t, adminId, async (client) =>
    client.mutation(api.occurrences.rectify, {
      originalId,
      descricao: "Correcao do horario registrado",
    }),
  );

  const rectification = await asUser(t, adminId, async (client) =>
    client.query(api.occurrences.get, { occurrenceId: rectificationId }),
  );

  expect(rectification?.original_id).toBe(originalId);
  expect(rectification?.type_nome).toBe("Correção/Retificação");
});

test("adocao atualiza historico vigente e pessoa atual", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const dogId = await seedDog(t, adminId);
  const oldPersonId = await seedPerson(t, adminId);
  const newPersonId = await asUser(t, adminId, async (client) =>
    client.mutation(api.people.create, {
      nome_completo: "Novo Tutor",
      cpf: "52998224725",
    }),
  );
  const adocaoTypeId = await getTypeId(t, adminId, "Adoção");

  await t.run(async (ctx) => {
    await ctx.db.patch(dogId, { pessoa_atual_id: oldPersonId, status_atual: "na_ong" });
    await ctx.db.insert("person_dog_history", {
      dog_id: dogId,
      pessoa_id: oldPersonId,
      inicio: Date.now() - 1000,
      tipo_inicio: "Resgate",
    });
  });

  await asUser(t, adminId, async (client) => {
    await client.mutation(api.occurrences.create, {
      dogId,
      occurrenceTypeId: adocaoTypeId,
      descricao: "Adocao formalizada",
      data_ocorrencia: Date.now(),
      photo_storage_ids: [],
      new_pessoa_id: newPersonId,
    });
  });

  const dog = await t.run(async (ctx) => ctx.db.get("dogs", dogId));
  const history = await t.run(async (ctx) =>
    ctx.db.query("person_dog_history").withIndex("by_dog", (q) => q.eq("dog_id", dogId)).collect(),
  );

  expect(dog?.pessoa_atual_id).toBe(newPersonId);
  expect(dog?.status_atual).toBe("adotado");
  expect(history.filter((entry) => entry.fim === undefined)).toHaveLength(1);
  expect(history.find((entry) => entry.fim === undefined)?.pessoa_id).toBe(newPersonId);
});

test("get oculta snapshot sensivel da pessoa sem people.read_sensitive", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const readerId = await seedUser(t, {
    nome: "Leitor",
    email: "leitor-occ@ong.local",
    permissions: ["dogs.read", "occurrences.read", "occurrences.create_rotina"],
  });
  const dogId = await seedDog(t, adminId);
  const personId = await seedPerson(t, adminId);
  const typeId = await getTypeId(t, adminId, "Consulta/Visualização");

  await t.run(async (ctx) => {
    await ctx.db.patch(dogId, { pessoa_atual_id: personId });
  });

  const occurrenceId = await asUser(t, adminId, async (client) =>
    client.mutation(api.occurrences.create, {
      dogId,
      occurrenceTypeId: typeId,
      descricao: "Consulta com tutor",
      data_ocorrencia: Date.now(),
      photo_storage_ids: [],
    }),
  );

  const asReader = await asUser(t, readerId, async (client) =>
    client.query(api.occurrences.get, { occurrenceId }),
  );
  expect(asReader?.pessoa_snapshot?.nome_completo).toBe("Paula Tutora");
  expect(asReader?.pessoa_snapshot?.cpf).toBeUndefined();

  const asAdmin = await asUser(t, adminId, async (client) =>
    client.query(api.occurrences.get, { occurrenceId }),
  );
  expect(asAdmin?.pessoa_snapshot?.cpf).toBeDefined();
});

test("listAll retorna ocorrencias com filtros e nome do cao/pessoa", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const dogId = await seedDog(t, adminId);
  const personId = await seedPerson(t, adminId);
  const bairroId = await seedBairro(t, "Centro");
  const outroBairroId = await seedBairro(t, "Norte");
  const rotinaTypeId = await getTypeId(t, adminId, "Consulta/Visualização");
  const resgateTypeId = await getTypeId(t, adminId, "Resgate na Rua");

  await t.run(async (ctx) => {
    await ctx.db.patch(dogId, { pessoa_atual_id: personId });
  });

  await asUser(t, adminId, async (client) =>
    client.mutation(api.occurrences.create, {
      dogId,
      occurrenceTypeId: rotinaTypeId,
      descricao: "Consulta de rotina",
      data_ocorrencia: Date.now(),
      bairro_id: bairroId,
      photo_storage_ids: [],
    }),
  );

  const storageId = await storeTestImage(t);
  await asUser(t, adminId, async (client) =>
    client.mutation(api.occurrences.create, {
      dogId,
      occurrenceTypeId: resgateTypeId,
      descricao: "Resgate com risco",
      data_ocorrencia: Date.now(),
      bairro_id: outroBairroId,
      photo_storage_ids: [storageId],
    }),
  );

  const all = await asUser(t, adminId, async (client) =>
    client.query(api.occurrences.listAll, { paginationOpts: { numItems: 10, cursor: null } }),
  );
  expect(all.page).toHaveLength(2);
  const rotina = all.page.find((item) => item.type_nome === "Consulta/Visualização");
  expect(rotina?.dog_nome).toBe("Luna");
  expect(rotina?.pessoa_nome).toBe("Paula Tutora");
  expect(rotina?.bairro_nome).toBe("Centro");

  const filteredByCategoria = await asUser(t, adminId, async (client) =>
    client.query(api.occurrences.listAll, {
      paginationOpts: { numItems: 10, cursor: null },
      categoria: "risco",
    }),
  );
  expect(filteredByCategoria.page).toHaveLength(1);
  expect(filteredByCategoria.page[0]?.type_nome).toBe("Resgate na Rua");

  const filteredByBairro = await asUser(t, adminId, async (client) =>
    client.query(api.occurrences.listAll, {
      paginationOpts: { numItems: 10, cursor: null },
      bairro_id: bairroId,
    }),
  );
  expect(filteredByBairro.page).toHaveLength(1);
  expect(filteredByBairro.page[0]?.bairro_nome).toBe("Centro");
});

test("listAll oculta categoria de risco de quem nao tem read_legal", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const readerId = await seedUser(t, {
    nome: "Leitor",
    email: "occ-listall-reader@ong.local",
    permissions: ["dogs.read", "occurrences.read", "occurrences.create_rotina"],
  });
  const dogId = await seedDog(t, adminId);
  const rotinaTypeId = await getTypeId(t, adminId, "Consulta/Visualização");
  const resgateTypeId = await getTypeId(t, adminId, "Resgate na Rua");
  const storageId = await storeTestImage(t);

  await asUser(t, adminId, async (client) =>
    client.mutation(api.occurrences.create, {
      dogId,
      occurrenceTypeId: rotinaTypeId,
      descricao: "Consulta de rotina",
      data_ocorrencia: Date.now(),
      photo_storage_ids: [],
    }),
  );

  await asUser(t, adminId, async (client) =>
    client.mutation(api.occurrences.create, {
      dogId,
      occurrenceTypeId: resgateTypeId,
      descricao: "Resgate com risco",
      data_ocorrencia: Date.now(),
      photo_storage_ids: [storageId],
    }),
  );

  const asReader = await asUser(t, readerId, async (client) =>
    client.query(api.occurrences.listAll, { paginationOpts: { numItems: 10, cursor: null } }),
  );
  expect(asReader.page).toHaveLength(1);
  expect(asReader.page[0]?.type_nome).toBe("Consulta/Visualização");

  const asAdmin = await asUser(t, adminId, async (client) =>
    client.query(api.occurrences.listAll, { paginationOpts: { numItems: 10, cursor: null } }),
  );
  expect(asAdmin.page).toHaveLength(2);
});

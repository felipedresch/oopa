/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { asUser, seedAdmin, seedBairro, seedUser, storeTestImage } from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function ensureSeeds(t: ReturnType<typeof convexTest>) {
  await t.mutation(api.seeds.seedAll, {});
}

async function seedDog(t: ReturnType<typeof convexTest>, adminId: Id<"users">) {
  const storageId = await storeTestImage(t);
  return await asUser(t, adminId, async (client) =>
    client.mutation(api.dogs.create, {
      microchip: "222222222222222",
      nome: "Luna",
      sexo: "femea",
      porte: "pequeno",
      castrado: true,
      vacinas_em_dia: true,
      foto_perfil_storage_id: storageId,
    }),
  );
}

async function seedTutor(t: ReturnType<typeof convexTest>, adminId: Id<"users">) {
  return await asUser(t, adminId, async (client) =>
    client.mutation(api.tutors.create, {
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
  const tutorId = await seedTutor(t, adminId);
  const bairroId = await seedBairro(t, "Centro");
  const resgateTypeId = await getTypeId(t, adminId, "Resgate na Rua");

  await t.run(async (ctx) => {
    await ctx.db.patch(dogId, { tutor_atual_id: tutorId });
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

  expect(detail?.tutor_snapshot?.nome_completo).toBe("Paula Tutora");
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
  const legalTypeId = await getTypeId(t, adminId, "Denuncia de Maus-Tratos");
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
  const rotinaTypeId = await getTypeId(t, adminId, "Consulta/Visualizacao");

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
  expect(rectification?.type_nome).toBe("Correcao/Retificacao");
});

test("adocao atualiza historico vigente e tutor atual", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const dogId = await seedDog(t, adminId);
  const oldTutorId = await seedTutor(t, adminId);
  const newTutorId = await asUser(t, adminId, async (client) =>
    client.mutation(api.tutors.create, {
      nome_completo: "Novo Tutor",
      cpf: "52998224725",
    }),
  );
  const adocaoTypeId = await getTypeId(t, adminId, "Adocao");

  await t.run(async (ctx) => {
    await ctx.db.patch(dogId, { tutor_atual_id: oldTutorId, status_atual: "na_ong" });
    await ctx.db.insert("tutor_dog_history", {
      dog_id: dogId,
      tutor_id: oldTutorId,
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
      new_tutor_id: newTutorId,
    });
  });

  const dog = await t.run(async (ctx) => ctx.db.get("dogs", dogId));
  const history = await t.run(async (ctx) =>
    ctx.db.query("tutor_dog_history").withIndex("by_dog", (q) => q.eq("dog_id", dogId)).collect(),
  );

  expect(dog?.tutor_atual_id).toBe(newTutorId);
  expect(dog?.status_atual).toBe("adotado");
  expect(history.filter((entry) => entry.fim === undefined)).toHaveLength(1);
  expect(history.find((entry) => entry.fim === undefined)?.tutor_id).toBe(newTutorId);
});

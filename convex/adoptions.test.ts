/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { BAIRRO_WARNING_MESSAGE } from "./lib/adoptions";
import { asUser, ensureSeeds, seedAdmin, seedBairro, seedUser, storeTestImage } from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedDog(t: ReturnType<typeof convexTest>, adminId: Id<"users">) {
  const storageId = await storeTestImage(t);
  return await asUser(t, adminId, async (client) =>
    client.mutation(api.dogs.create, {
      microchip: "333333333333333",
      nome: "Bolt",
      sexo: "macho",
      porte: "medio",
      castrado: true,
      vacinas_em_dia: true,
      foto_perfil_storage_id: storageId,
    }),
  );
}

const adoptionPayload = {
  data_adocao: Date.now(),
  numero_termo_adocao: "TERM-001",
  confirmou_documentos: true,
  confirmou_orientacoes: true,
  condicoes_adocao: "Retornar em 30 dias se necessario.",
};

test("create exige confirmacoes e atualiza tutor e historico", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const dogId = await seedDog(t, adminId);
  const tutorId = await asUser(t, adminId, async (client) =>
    client.mutation(api.tutors.create, {
      nome_completo: "Tutor Adocao",
      cpf: "39053344705",
    }),
  );

  await expect(
    asUser(t, adminId, async (client) => {
      await client.mutation(api.adoptions.create, {
        dogId,
        tutorId,
        responsavel_ong_user_id: adminId,
        ...adoptionPayload,
        confirmou_documentos: false,
      });
    }),
  ).rejects.toThrow(/documentos/i);

  const occurrenceId = await asUser(t, adminId, async (client) =>
    client.mutation(api.adoptions.create, {
      dogId,
      tutorId,
      responsavel_ong_user_id: adminId,
      ...adoptionPayload,
    }),
  );

  const dog = await t.run(async (ctx) => ctx.db.get("dogs", dogId));
  const occurrence = await t.run(async (ctx) => ctx.db.get("occurrences", occurrenceId));

  expect(dog?.tutor_atual_id).toBe(tutorId);
  expect(dog?.status_atual).toBe("adotado");
  expect(occurrence?.adoption_payload?.numero_termo_adocao).toBe("TERM-001");
});

test("evaluateTutor retorna alerta e warning de bairro", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const bairroId = await seedBairro(t, "Centro");
  const dogId = await seedDog(t, adminId);

  const oldTutorId = await asUser(t, adminId, async (client) =>
    client.mutation(api.tutors.create, {
      nome_completo: "Tutor Antigo",
      cpf: "52998224725",
      bairro_id: bairroId,
    }),
  );
  const newTutorId = await asUser(t, adminId, async (client) =>
    client.mutation(api.tutors.create, {
      nome_completo: "Tutor Novo",
      cpf: "15350946056",
      bairro_id: bairroId,
    }),
  );

  await asUser(t, adminId, async (client) => {
    await client.mutation(api.adoptions.create, {
      dogId,
      tutorId: oldTutorId,
      responsavel_ong_user_id: adminId,
      ...adoptionPayload,
      numero_termo_adocao: "TERM-OLD",
    });
  });

  const storageId = await storeTestImage(t);
  await asUser(t, adminId, async (client) => {
    const types = await client.query(api.occurrenceTypes.list, {});
    const devolucaoType = types.find((type) => type.nome === "Devolucao a ONG");
    await client.mutation(api.occurrences.create, {
      dogId,
      occurrenceTypeId: devolucaoType!._id,
      descricao: "Devolucao por mudanca",
      data_ocorrencia: Date.now(),
      photo_storage_ids: [storageId],
    });
  });

  const evaluation = await asUser(t, adminId, async (client) =>
    client.query(api.adoptions.evaluateTutor, { dogId, tutorId: newTutorId }),
  );

  expect(evaluation.bairro_warning.has_warning).toBe(true);
  expect(evaluation.bairro_warning.message).toBe(BAIRRO_WARNING_MESSAGE);
});

test("returnToOng encerra historico vigente", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const dogId = await seedDog(t, adminId);
  const tutorId = await asUser(t, adminId, async (client) =>
    client.mutation(api.tutors.create, {
      nome_completo: "Tutor Devolucao",
      cpf: "39053344705",
    }),
  );
  const storageId = await storeTestImage(t);

  await asUser(t, adminId, async (client) => {
    await client.mutation(api.adoptions.create, {
      dogId,
      tutorId,
      responsavel_ong_user_id: adminId,
      ...adoptionPayload,
    });
  });

  await asUser(t, adminId, async (client) => {
    await client.mutation(api.adoptions.returnToOng, {
      dogId,
      descricao: "Nao pode mais cuidar",
      photo_storage_ids: [storageId],
    });
  });

  const dog = await t.run(async (ctx) => ctx.db.get("dogs", dogId));
  const history = await t.run(async (ctx) =>
    ctx.db.query("tutor_dog_history").withIndex("by_dog", (q) => q.eq("dog_id", dogId)).collect(),
  );

  expect(dog?.tutor_atual_id).toBeUndefined();
  expect(dog?.status_atual).toBe("na_ong");
  expect(history.every((entry) => entry.fim !== undefined)).toBe(true);
});

test("transferTutor troca tutor atual", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const dogId = await seedDog(t, adminId);
  const tutorA = await asUser(t, adminId, async (client) =>
    client.mutation(api.tutors.create, {
      nome_completo: "Tutor A",
      cpf: "39053344705",
    }),
  );
  const tutorB = await asUser(t, adminId, async (client) =>
    client.mutation(api.tutors.create, {
      nome_completo: "Tutor B",
      cpf: "52998224725",
    }),
  );

  await asUser(t, adminId, async (client) => {
    await client.mutation(api.adoptions.create, {
      dogId,
      tutorId: tutorA,
      responsavel_ong_user_id: adminId,
      ...adoptionPayload,
    });
  });

  await asUser(t, adminId, async (client) => {
    await client.mutation(api.adoptions.transferTutor, {
      dogId,
      newTutorId: tutorB,
      descricao: "Mudanca de responsavel familiar",
    });
  });

  const dog = await t.run(async (ctx) => ctx.db.get("dogs", dogId));
  expect(dog?.tutor_atual_id).toBe(tutorB);
});

test("usuario sem create_adocao nao cria adocao", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const limitedId = await seedUser(t, {
    nome: "Sem adocao",
    email: "noadopt@ong.local",
    permissions: ["dogs.read", "tutors.read"],
  });
  const dogId = await seedDog(t, adminId);
  const tutorId = await asUser(t, adminId, async (client) =>
    client.mutation(api.tutors.create, { nome_completo: "Tutor", cpf: "39053344705" }),
  );

  await expect(
    asUser(t, limitedId, async (client) => {
      await client.mutation(api.adoptions.create, {
        dogId,
        tutorId,
        responsavel_ong_user_id: adminId,
        ...adoptionPayload,
      });
    }),
  ).rejects.toThrow();
});

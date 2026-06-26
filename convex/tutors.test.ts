/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { FIXTURE_TUTOR_WITHOUT_ALERT, FIXTURE_TUTOR_WITH_ALERT } from "./testFixtures";
import { asUser, seedAdmin, seedBairro, seedUser } from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedOccurrenceType(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("occurrence_types", {
      nome: "Teste",
      categoria: "risco",
      requer_foto: false,
      gravidade_padrao: "media",
      ativo: true,
      criado_em: Date.now(),
    });
  });
}

async function seedDogForTutor(
  t: ReturnType<typeof convexTest>,
  tutorId: Id<"tutors">,
): Promise<Id<"dogs">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("dogs", {
      microchip: "111111111111111",
      nome: "Rex",
      sexo: "macho",
      porte: "medio",
      castrado: true,
      vacinas_em_dia: true,
      status_atual: "adotado",
      tutor_atual_id: tutorId,
      criado_em: Date.now(),
    });
  });
}

test("create exige CPF unico e get oculta dados sensiveis", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);
  const bairroId = await seedBairro(t, "Centro");
  const readerId = await seedUser(t, {
    nome: "Leitor",
    email: "leitor@ong.local",
    permissions: ["tutors.read"],
  });

  const tutorId = await asUser(t, adminId, async (client) =>
    client.mutation(api.tutors.create, {
      ...FIXTURE_TUTOR_WITHOUT_ALERT,
      bairro_id: bairroId,
    }),
  );

  await expect(
    asUser(t, adminId, async (client) => {
      await client.mutation(api.tutors.create, {
        ...FIXTURE_TUTOR_WITHOUT_ALERT,
        bairro_id: bairroId,
      });
    }),
  ).rejects.toThrow(/cpf/i);

  const sensitive = await asUser(t, adminId, async (client) =>
    client.query(api.tutors.get, { tutorId }),
  );
  expect(sensitive?.sensitive?.cpf).toBe(FIXTURE_TUTOR_WITHOUT_ALERT.cpf);
  expect(sensitive?.alert?.level).toBe("none");

  const basic = await asUser(t, readerId, async (client) =>
    client.query(api.tutors.get, { tutorId }),
  );
  expect(basic?.sensitive_hidden).toBe(true);
  expect(basic?.sensitive).toBeUndefined();
  expect(basic?.alert).toBeUndefined();
});

test("create exige RG unico (normalizado)", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);
  const bairroId = await seedBairro(t, "Centro");

  await asUser(t, adminId, async (client) =>
    client.mutation(api.tutors.create, {
      ...FIXTURE_TUTOR_WITHOUT_ALERT,
      bairro_id: bairroId,
    }),
  );

  // Mesmo RG (com mascara diferente) mas CPF distinto deve conflitar no RG.
  await expect(
    asUser(t, adminId, async (client) => {
      await client.mutation(api.tutors.create, {
        ...FIXTURE_TUTOR_WITHOUT_ALERT,
        cpf: FIXTURE_TUTOR_WITH_ALERT.cpf,
        rg: "1.234.567",
        bairro_id: bairroId,
      });
    }),
  ).rejects.toThrow(/rg/i);
});

test("checkDuplicate sinaliza CPF e RG ja cadastrados", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);
  const bairroId = await seedBairro(t, "Centro");

  const tutorId = await asUser(t, adminId, async (client) =>
    client.mutation(api.tutors.create, {
      ...FIXTURE_TUTOR_WITHOUT_ALERT,
      bairro_id: bairroId,
    }),
  );

  const taken = await asUser(t, adminId, async (client) =>
    client.query(api.tutors.checkDuplicate, {
      cpf: FIXTURE_TUTOR_WITHOUT_ALERT.cpf,
      rg: "1.234.567",
    }),
  );
  expect(taken.cpf.exists).toBe(true);
  expect(taken.cpf.nome).toBe(FIXTURE_TUTOR_WITHOUT_ALERT.nome_completo);
  expect(taken.rg.exists).toBe(true);

  // O proprio tutor nao deve conflitar consigo mesmo na edicao.
  const excluded = await asUser(t, adminId, async (client) =>
    client.query(api.tutors.checkDuplicate, {
      cpf: FIXTURE_TUTOR_WITHOUT_ALERT.cpf,
      rg: FIXTURE_TUTOR_WITHOUT_ALERT.rg,
      excludeTutorId: tutorId,
    }),
  );
  expect(excluded.cpf.exists).toBe(false);
  expect(excluded.rg.exists).toBe(false);

  const free = await asUser(t, adminId, async (client) =>
    client.query(api.tutors.checkDuplicate, {
      cpf: FIXTURE_TUTOR_WITH_ALERT.cpf,
      rg: FIXTURE_TUTOR_WITH_ALERT.rg,
    }),
  );
  expect(free.cpf.exists).toBe(false);
  expect(free.rg.exists).toBe(false);
});

test("alerta vermelho e amarelo derivam de ocorrencias atribuiveis", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);
  const bairroId = await seedBairro(t, "Centro");
  const occurrenceTypeId = await seedOccurrenceType(t);

  const tutorId = await asUser(t, adminId, async (client) =>
    client.mutation(api.tutors.create, {
      ...FIXTURE_TUTOR_WITH_ALERT,
      bairro_id: bairroId,
    }),
  );
  const dogId = await seedDogForTutor(t, tutorId);

  await t.run(async (ctx) => {
    await ctx.db.insert("occurrences", {
      dog_id: dogId,
      tutor_id: tutorId,
      atribuivel_ao_tutor: true,
      occurrence_type_id: occurrenceTypeId,
      gravidade: "media",
      data_ocorrencia: Date.now(),
      descricao: "Ocorrencia media",
      registrado_por: adminId,
      criado_em: Date.now(),
    });
  });

  const yellow = await asUser(t, adminId, async (client) =>
    client.query(api.tutors.get, { tutorId }),
  );
  expect(yellow?.alert?.level).toBe("yellow");
  expect(yellow?.alert?.media_count).toBe(1);

  await t.run(async (ctx) => {
    await ctx.db.insert("occurrences", {
      dog_id: dogId,
      tutor_id: tutorId,
      atribuivel_ao_tutor: true,
      occurrence_type_id: occurrenceTypeId,
      gravidade: "alta",
      data_ocorrencia: Date.now(),
      descricao: "Ocorrencia alta",
      registrado_por: adminId,
      criado_em: Date.now(),
    });
  });

  const red = await asUser(t, adminId, async (client) =>
    client.query(api.tutors.get, { tutorId }),
  );
  expect(red?.alert?.level).toBe("red");
  expect(red?.alert?.alta_count).toBe(1);
});

test("list permite busca por CPF apenas com permissao sensivel", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);
  const readerId = await seedUser(t, {
    nome: "Leitor",
    email: "reader2@ong.local",
    permissions: ["tutors.read"],
  });

  await asUser(t, adminId, async (client) => {
    await client.mutation(api.tutors.create, FIXTURE_TUTOR_WITHOUT_ALERT);
  });

  const adminList = await asUser(t, adminId, async (client) =>
    client.query(api.tutors.list, {
      paginationOpts: { numItems: 10, cursor: null },
      search: FIXTURE_TUTOR_WITHOUT_ALERT.cpf,
    }),
  );
  expect(adminList.page).toHaveLength(1);
  expect(adminList.page[0]?.alert_level).toBe("none");

  const readerList = await asUser(t, readerId, async (client) =>
    client.query(api.tutors.list, {
      paginationOpts: { numItems: 10, cursor: null },
      search: FIXTURE_TUTOR_WITHOUT_ALERT.cpf,
    }),
  );
  expect(readerList.page).toHaveLength(0);
});

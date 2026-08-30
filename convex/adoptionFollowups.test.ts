/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { addCalendarMonths } from "./lib/adoptionFollowups";
import {
  asUser,
  ensureSeeds,
  seedAdmin,
  seedUser,
  storeTestImage,
} from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedDog(t: ReturnType<typeof convexTest>, adminId: Id<"users">) {
  const storageId = await storeTestImage(t);
  return await asUser(t, adminId, async (client) =>
    client.mutation(api.dogs.create, {
      microchip: "444444444444444",
      nome: "Luna",
      especie: "cao",
      sexo: "femea",
      porte: "medio",
      castrado: true,
      vacinas_em_dia: true,
      foto_perfil_storage_id: storageId,
    }),
  );
}

async function createAdoption(
  t: ReturnType<typeof convexTest>,
  adminId: Id<"users">,
  dataAdocao: number,
) {
  const dogId = await seedDog(t, adminId);
  const personId = await asUser(t, adminId, async (client) =>
    client.mutation(api.people.create, {
      nome_completo: "Marina Tutora",
      cpf: "39053344705",
      telefone: "51999990000",
      email: "marina@example.com",
    }),
  );
  const occurrenceId = await asUser(t, adminId, async (client) =>
    client.mutation(api.adoptions.create, {
      dogId,
      personId,
      data_adocao: dataAdocao,
      numero_termo_adocao: "TERM-FOLLOWUP",
      responsavel_ong_user_id: adminId,
      condicoes_adocao: "Manter acompanhamento inicial.",
      confirmou_documentos: true,
      confirmou_orientacoes: true,
    }),
  );

  return { dogId, personId, occurrenceId };
}

test("cria o primeiro acompanhamento três meses após a adoção", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const adoptionDate = Date.UTC(2026, 0, 31);
  const { dogId, personId, occurrenceId } = await createAdoption(
    t,
    adminId,
    adoptionDate,
  );

  const followups = await t.run(async (ctx) =>
    ctx.db
      .query("adoption_followups")
      .withIndex("by_adoption_occurrence", (q) =>
        q.eq("occurrence_id_adocao", occurrenceId),
      )
      .collect(),
  );

  expect(followups).toHaveLength(1);
  expect(followups[0]).toMatchObject({
    dog_id: dogId,
    pessoa_id: personId,
    sequencia: 1,
    status: "pendente",
    data_prevista: Date.UTC(2026, 3, 30),
  });
});

test("contato realizado encerra o ciclo e agenda o próximo em seis meses", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const { occurrenceId } = await createAdoption(t, adminId, Date.UTC(2026, 0, 10));
  const initial = await t.run(async (ctx) =>
    ctx.db
      .query("adoption_followups")
      .withIndex("by_adoption_occurrence", (q) =>
        q.eq("occurrence_id_adocao", occurrenceId),
      )
      .unique(),
  );
  if (!initial) {
    throw new Error("Acompanhamento inicial não encontrado");
  }

  const contactBefore = Date.now();
  await asUser(t, adminId, async (client) => {
    await client.mutation(api.adoptionFollowups.registerContact, {
      followupId: initial._id,
      status: "contatado",
      resultado: "Tutor confirmou que está tudo bem.",
    });
  });
  const contactAfter = Date.now();

  const followups = await t.run(async (ctx) =>
    ctx.db
      .query("adoption_followups")
      .withIndex("by_adoption_occurrence", (q) =>
        q.eq("occurrence_id_adocao", occurrenceId),
      )
      .collect(),
  );
  const next = followups.find((followup) => followup.sequencia === 2);

  expect(followups.find((followup) => followup._id === initial._id)).toMatchObject({
    status: "contatado",
    tentativas: 1,
    resultado: "Tutor confirmou que está tudo bem.",
  });
  expect(next).toMatchObject({ sequencia: 2, status: "pendente", tentativas: 0 });
  expect(next?.data_prevista).toBeGreaterThanOrEqual(
    addCalendarMonths(contactBefore, 6),
  );
  expect(next?.data_prevista).toBeLessThanOrEqual(addCalendarMonths(contactAfter, 6));
});

test("cron notifica uma vez e cria visita após sete dias sem resposta", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const { dogId, occurrenceId } = await createAdoption(
    t,
    adminId,
    Date.UTC(2026, 0, 31),
  );
  const initial = await t.run(async (ctx) =>
    ctx.db
      .query("adoption_followups")
      .withIndex("by_adoption_occurrence", (q) =>
        q.eq("occurrence_id_adocao", occurrenceId),
      )
      .unique(),
  );
  if (!initial) {
    throw new Error("Acompanhamento inicial não encontrado");
  }

  const dueDate = initial.data_prevista + 2 * 24 * 60 * 60 * 1000;
  const firstRun = await t.mutation(internal.adoptionFollowups.runDaily, {
    agora: dueDate,
  });
  const secondRun = await t.mutation(internal.adoptionFollowups.runDaily, {
    agora: dueDate + 1_000,
  });

  expect(firstRun.notified).toBeGreaterThan(0);
  expect(secondRun.notified).toBe(0);
  const notification = await t.run(async (ctx) =>
    ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("user_id", adminId).eq("lida", false))
      .filter((q) => q.eq(q.field("tipo"), "adoption_followup_due"))
      .unique(),
  );
  expect(notification?.entidade_id).toBe(initial._id);

  const escalationRun = await t.mutation(internal.adoptionFollowups.runDaily, {
    agora: initial.data_prevista + 7 * 24 * 60 * 60 * 1000,
  });
  expect(escalationRun.automaticVisits).toBe(1);

  const updated = await t.run(async (ctx) =>
    ctx.db.get("adoption_followups", initial._id),
  );
  expect(updated?.status).toBe("sem_resposta");
  expect(updated?.ocorrencia_visita_id).toBeTruthy();

  const visits = await t.run(async (ctx) =>
    ctx.db
      .query("occurrences")
      .withIndex("by_dog", (q) => q.eq("dog_id", dogId))
      .collect(),
  );
  const visit = visits.find(
    (occurrence) => occurrence._id === updated?.ocorrencia_visita_id,
  );
  expect(visit).toBeTruthy();
  const visitType = visit
    ? await t.run(async (ctx) =>
        ctx.db.get("occurrence_types", visit.occurrence_type_id),
      )
    : null;
  expect(visitType?.nome).toBe("Visita de acompanhamento");
});

test("somente gestão pode registrar contato", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const readerId = await seedUser(t, {
    nome: "Leitora",
    email: "leitora@ong.local",
    permissions: ["adoptions.read"],
  });
  const { occurrenceId } = await createAdoption(t, adminId, Date.UTC(2026, 0, 10));
  const initial = await t.run(async (ctx) =>
    ctx.db
      .query("adoption_followups")
      .withIndex("by_adoption_occurrence", (q) =>
        q.eq("occurrence_id_adocao", occurrenceId),
      )
      .unique(),
  );
  if (!initial) {
    throw new Error("Acompanhamento inicial não encontrado");
  }

  const page = await asUser(t, readerId, async (client) =>
    client.query(api.adoptionFollowups.list, {
      paginationOpts: { numItems: 10, cursor: null },
      agora: Date.now(),
    }),
  );
  expect(page.page).toHaveLength(1);

  await expect(
    asUser(t, readerId, async (client) =>
      client.mutation(api.adoptionFollowups.registerContact, {
        followupId: initial._id,
        status: "contatado",
        resultado: "Tentativa de contato.",
      }),
    ),
  ).rejects.toThrow();
});

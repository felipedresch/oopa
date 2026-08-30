/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { asUser, ensureSeeds, seedAdmin, seedUser, storeTestImage } from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const ADOPTION_DATE = Date.UTC(2026, 0, 10);
/** Primeiro follow-up: três meses após a adoção. */
const FOLLOWUP_DATE = Date.UTC(2026, 3, 10);
const CASTRATION_DATE = Date.UTC(2026, 3, 12, 14);
const APPOINTMENT_DATE = Date.UTC(2026, 3, 15, 13);

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

/** Cria um evento de cada fonte do calendário. */
async function seedCalendarSources(t: ReturnType<typeof convexTest>, adminId: Id<"users">) {
  const adoptedDogId = await seedDog(t, adminId, "Luna", "111111111111111");
  const patientDogId = await seedDog(t, adminId, "Pipoca", "222222222222222");
  const personId = await asUser(t, adminId, (client) =>
    client.mutation(api.people.create, {
      nome_completo: "Marina Tutora",
      cpf: "39053344705",
    }),
  );

  await asUser(t, adminId, (client) =>
    client.mutation(api.adoptions.create, {
      dogId: adoptedDogId,
      personId,
      data_adocao: ADOPTION_DATE,
      numero_termo_adocao: "TERM-CAL",
      responsavel_ong_user_id: adminId,
      condicoes_adocao: "Acompanhamento em três meses.",
      confirmou_documentos: true,
      confirmou_orientacoes: true,
    }),
  );

  const castrationId = await asUser(t, adminId, (client) =>
    client.mutation(api.castration.create, {
      pessoa_id: personId,
      animal_descricao: { nome: "Bolinha", especie: "cao", porte: "pequeno", sexo: "femea" },
    }),
  );
  await asUser(t, adminId, (client) =>
    client.mutation(api.castration.updateStatus, {
      castrationId,
      status: "agendada",
      data_agendada: CASTRATION_DATE,
    }),
  );

  const vetId = await seedUser(t, {
    nome: "Dra. Ana",
    email: "ana.calendar@ong.local",
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
  const appointmentId = await asUser(t, adminId, (client) =>
    client.mutation(api.appointments.create, {
      dogId: patientDogId,
      veterinarioUserId: vetId,
      tipoAtendimento: "consulta",
      dataAtendimento: APPOINTMENT_DATE,
      historico: "Avaliação de rotina.",
      servicos: [{ service_id: serviceId, quantidade: 1, valor_unitario: 80 }],
      insumos: [],
    }),
  );

  return { adoptedDogId, patientDogId, castrationId, appointmentId };
}

test("list une acompanhamentos, castrações e atendimentos ordenados por data", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const { castrationId, appointmentId } = await seedCalendarSources(t, adminId);

  const events = await asUser(t, adminId, (client) => client.query(api.calendar.list, {}));

  expect(events.map((event) => event.tipo)).toEqual([
    "lembrete_adocao",
    "castracao",
    "consulta",
  ]);
  expect(events.map((event) => event.data)).toEqual([
    FOLLOWUP_DATE,
    CASTRATION_DATE,
    APPOINTMENT_DATE,
  ]);
  expect(events[0]).toMatchObject({
    titulo: "Acompanhamento pós-adoção — Luna",
    entidade_tipo: "adoption_followup",
    status: "pendente",
  });
  expect(events[1]).toMatchObject({
    titulo: "Castração — Bolinha",
    entidade_tipo: "castration_request",
    entidade_id: castrationId,
    status: "agendada",
  });
  expect(events[2]).toMatchObject({
    titulo: "Consulta — Pipoca",
    entidade_tipo: "service_appointment",
    entidade_id: appointmentId,
    status: "agendado",
  });
});

test("list filtra por período", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  await seedCalendarSources(t, adminId);

  const events = await asUser(t, adminId, (client) =>
    client.query(api.calendar.list, {
      inicio: Date.UTC(2026, 3, 11),
      fim: Date.UTC(2026, 3, 13),
    }),
  );

  expect(events).toHaveLength(1);
  expect(events[0]?.tipo).toBe("castracao");
});

test("list rejeita período invertido", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);

  await expect(
    asUser(t, adminId, (client) =>
      client.query(api.calendar.list, {
        inicio: Date.UTC(2026, 3, 20),
        fim: Date.UTC(2026, 3, 1),
      }),
    ),
  ).rejects.toThrow();
});

test("list filtra por tipo em multi-seleção", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  await seedCalendarSources(t, adminId);

  const events = await asUser(t, adminId, (client) =>
    client.query(api.calendar.list, { tipos: ["lembrete_adocao", "consulta"] }),
  );

  expect(events.map((event) => event.tipo)).toEqual(["lembrete_adocao", "consulta"]);
});

test("list inclui apenas as fontes permitidas ao usuário", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  await seedCalendarSources(t, adminId);

  const castrationOnlyId = await seedUser(t, {
    nome: "Só castração",
    email: "castracao.calendar@ong.local",
    permissions: ["dogs.read", "castration.read"],
  });
  const noAccessId = await seedUser(t, {
    nome: "Sem acesso",
    email: "sem-acesso.calendar@ong.local",
    permissions: ["dogs.read"],
  });

  const castrationEvents = await asUser(t, castrationOnlyId, (client) =>
    client.query(api.calendar.list, {}),
  );
  expect(castrationEvents.map((event) => event.tipo)).toEqual(["castracao"]);

  const emptyEvents = await asUser(t, noAccessId, (client) =>
    client.query(api.calendar.list, {}),
  );
  expect(emptyEvents).toEqual([]);
});

test("list ignora castrações e atendimentos que não estão agendados", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const { castrationId, appointmentId } = await seedCalendarSources(t, adminId);

  await asUser(t, adminId, (client) =>
    client.mutation(api.castration.updateStatus, { castrationId, status: "cancelada" }),
  );
  await asUser(t, adminId, (client) =>
    client.mutation(api.appointments.cancel, { appointmentId }),
  );

  const events = await asUser(t, adminId, (client) => client.query(api.calendar.list, {}));

  expect(events.map((event) => event.tipo)).toEqual(["lembrete_adocao"]);
});

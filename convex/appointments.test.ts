/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import {
  asUser,
  seedAdmin,
  seedUser,
  storeTestImage,
  storeTestXml,
} from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const NFE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe>
      <ide><nNF>12345</nNF><dhEmi>2026-08-30T10:15:00-03:00</dhEmi></ide>
      <total><ICMSTot><vNF>105.90</vNF></ICMSTot></total>
    </infNFe>
  </NFe>
</nfeProc>`;

async function createDog(t: ReturnType<typeof convexTest>, adminId: Awaited<ReturnType<typeof seedAdmin>>) {
  const imageId = await storeTestImage(t);
  return await asUser(t, adminId, (client) =>
    client.mutation(api.dogs.create, {
      nome: "Pipoca",
      especie: "cao",
      sexo: "femea",
      porte: "medio",
      castrado: false,
      vacinas_em_dia: true,
      foto_perfil_storage_id: imageId,
    }),
  );
}

async function createService(t: ReturnType<typeof convexTest>, adminId: Awaited<ReturnType<typeof seedAdmin>>) {
  return await asUser(t, adminId, (client) =>
    client.mutation(api.services.create, {
      nome: "Consulta clínica",
      categoria: "consulta",
      valor_padrao: 80,
    }),
  );
}

test("create calcula o total com serviços, insumos e desconto", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);
  const vetId = await seedUser(t, {
    nome: "Dra. Ana",
    email: "ana.vet@ong.local",
    permissions: ["appointments.read", "appointments.create", "appointments.manage"],
    veterinario: true,
  });
  const dogId = await createDog(t, adminId);
  const serviceId = await createService(t, adminId);
  const supplyId = await asUser(t, adminId, (client) =>
    client.mutation(api.supplies.create, {
      nome: "Soro fisiológico",
      categoria: "medicamento",
      unidade_medida: "ml",
      valor_padrao: 10,
    }),
  );

  const appointmentId = await asUser(t, adminId, (client) =>
    client.mutation(api.appointments.create, {
      dogId,
      veterinarioUserId: vetId,
      tipoAtendimento: "consulta",
      dataAtendimento: Date.UTC(2026, 7, 30, 13),
      historico: "Avaliação clínica inicial.",
      servicos: [{ service_id: serviceId, quantidade: 1, valor_unitario: 80 }],
      insumos: [{ supply_id: supplyId, quantidade: 2, valor_unitario: 10 }],
      descontoValor: 15,
    }),
  );

  const detail = await asUser(t, adminId, (client) =>
    client.query(api.appointments.get, { appointmentId }),
  );
  expect(detail.valor_total).toBe(85);
  expect(detail.servicos[0]?.nome).toBe("Consulta clínica");
  expect(detail.insumos[0]?.subtotal).toBe(20);
  expect(detail.status).toBe("agendado");
});

test("create e list respeitam a permissão de atendimentos", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);
  const readerId = await seedUser(t, {
    nome: "Leitor",
    email: "leitor.appointments@ong.local",
    permissions: ["appointments.read"],
  });
  const dogId = await createDog(t, adminId);
  const serviceId = await createService(t, adminId);
  const vetId = await seedUser(t, {
    nome: "Veterinária",
    email: "vet.appointments@ong.local",
    permissions: ["appointments.read", "appointments.create", "appointments.manage"],
    veterinario: true,
  });

  await expect(
    asUser(t, readerId, (client) =>
      client.mutation(api.appointments.create, {
        dogId,
        veterinarioUserId: vetId,
        tipoAtendimento: "vacina",
        dataAtendimento: Date.now(),
        historico: "Aplicação de vacina.",
        servicos: [{ service_id: serviceId, quantidade: 1, valor_unitario: 20 }],
        insumos: [],
      }),
    ),
  ).rejects.toThrow();

  const appointmentId = await asUser(t, adminId, (client) =>
    client.mutation(api.appointments.create, {
      dogId,
      veterinarioUserId: vetId,
      tipoAtendimento: "vacina",
      dataAtendimento: Date.UTC(2026, 7, 30),
      historico: "Aplicação de vacina.",
      servicos: [{ service_id: serviceId, quantidade: 1, valor_unitario: 20 }],
      insumos: [],
    }),
  );

  const list = await asUser(t, readerId, (client) =>
    client.query(api.appointments.list, {
      paginationOpts: { numItems: 10, cursor: null },
      dogId,
      status: "agendado",
    }),
  );
  expect(list.page.map((item) => item._id)).toContain(appointmentId);

  const completedOnly = await asUser(t, readerId, (client) =>
    client.query(api.appointments.list, {
      paginationOpts: { numItems: 10, cursor: null },
      dogId,
      status: "realizado",
    }),
  );
  expect(completedOnly.page).toHaveLength(0);
});

test("complete cria prontuário e notifica dogs.edit uma única vez para microchip pendente", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);
  const recipientId = await seedUser(t, {
    nome: "Cadastro",
    email: "cadastro@ong.local",
    permissions: ["dogs.edit"],
  });
  const vetId = await seedUser(t, {
    nome: "Dr. Beto",
    email: "beto.vet@ong.local",
    permissions: ["appointments.read", "appointments.create", "appointments.manage"],
    veterinario: true,
  });
  const dogId = await createDog(t, adminId);
  const serviceId = await createService(t, adminId);
  const appointmentId = await asUser(t, adminId, (client) =>
    client.mutation(api.appointments.create, {
      dogId,
      veterinarioUserId: vetId,
      tipoAtendimento: "consulta",
      dataAtendimento: Date.UTC(2026, 7, 30),
      historico: "Animal alerta e responsivo.",
      servicos: [{ service_id: serviceId, quantidade: 1, valor_unitario: 80 }],
      insumos: [],
    }),
  );

  await asUser(t, adminId, (client) =>
    client.mutation(api.appointments.complete, {
      appointmentId,
      medicalRecord: {
        anamnese: "Sem alterações relatadas.",
        diagnostico: "Saudável.",
        procedimentos: "Avaliação clínica.",
        peso_kg: 12.4,
      },
    }),
  );

  const detail = await asUser(t, adminId, (client) =>
    client.query(api.appointments.get, { appointmentId }),
  );
  expect(detail.status).toBe("realizado");
  expect(detail.medical_record?.diagnostico).toBe("Saudável.");

  const notificationsBefore = await t.run(async (ctx) =>
    ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("user_id", recipientId).eq("lida", false))
      .collect(),
  );
  expect(notificationsBefore).toHaveLength(1);
  expect(notificationsBefore[0]?.tipo).toBe("microchip_pendente");

  await asUser(t, adminId, (client) =>
    client.mutation(api.appointments.complete, { appointmentId }),
  );
  const notificationsAfter = await t.run(async (ctx) =>
    ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("user_id", recipientId).eq("lida", false))
      .collect(),
  );
  expect(notificationsAfter).toHaveLength(1);
});

test("parseNotaFiscal preenche NFe válida e não bloqueia XML inválido", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);
  const validStorageId = await storeTestXml(t, NFE_XML);
  const invalidStorageId = await storeTestXml(t, "<xml incompleto");

  const valid = await asUser(t, adminId, (client) =>
    client.action(api.appointments.parseNotaFiscal, { storageId: validStorageId }),
  );
  expect(valid.sucesso).toBe(true);
  expect(valid.numero).toBe("12345");
  expect(valid.valor_total).toBe(105.9);
  expect(valid.data_emissao).toBe(Date.parse("2026-08-30T10:15:00-03:00"));

  const invalid = await asUser(t, adminId, (client) =>
    client.action(api.appointments.parseNotaFiscal, { storageId: invalidStorageId }),
  );
  expect(invalid.sucesso).toBe(false);
  expect(invalid.numero).toBeNull();
});

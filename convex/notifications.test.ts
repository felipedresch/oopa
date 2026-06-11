/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import { asUser, ensureSeeds, seedAdmin, seedUser, storeTestImage } from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("reportDogNotFound notifica equipe com dogs.create e dogs.read", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);
  const reporterId = await seedUser(t, {
    nome: "Voluntario",
    email: "voluntario@ong.local",
    permissions: ["dogs.read"],
  });

  await asUser(t, reporterId, async (client) => {
    await client.mutation(api.notifications.reportDogNotFound, {
      microchip: "956000013141707",
    });
  });

  const notifications = await t.run(async (ctx) =>
    ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("user_id", adminId).eq("lida", false))
      .collect(),
  );

  expect(notifications.length).toBeGreaterThan(0);
  expect(notifications[0]?.tipo).toBe("dog_not_found");
});

test("listMine, unreadCount, markRead e markAllRead", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);

  await t.run(async (ctx) => {
    await ctx.db.insert("notifications", {
      user_id: adminId,
      tipo: "system",
      titulo: "Teste 1",
      mensagem: "Primeira notificacao",
      lida: false,
      criado_em: Date.now(),
    });
    await ctx.db.insert("notifications", {
      user_id: adminId,
      tipo: "system",
      titulo: "Teste 2",
      mensagem: "Segunda notificacao",
      lida: false,
      criado_em: Date.now() - 1000,
    });
  });

  const unread = await asUser(t, adminId, async (client) =>
    client.query(api.notifications.unreadCount, {}),
  );
  expect(unread).toBe(2);

  const page = await asUser(t, adminId, async (client) =>
    client.query(api.notifications.listMine, {
      paginationOpts: { numItems: 10, cursor: null },
      readFilter: "unread",
    }),
  );
  expect(page.page).toHaveLength(2);
  expect(page.page[0]?.href).toBeNull();

  const firstId = page.page[0]?._id;
  if (!firstId) {
    throw new Error("Notificacao esperada nao encontrada");
  }
  await asUser(t, adminId, async (client) => {
    await client.mutation(api.notifications.markRead, { notificationId: firstId });
  });

  const unreadAfterOne = await asUser(t, adminId, async (client) =>
    client.query(api.notifications.unreadCount, {}),
  );
  expect(unreadAfterOne).toBe(1);

  await asUser(t, adminId, async (client) => {
    await client.mutation(api.notifications.markAllRead, {});
  });

  const unreadAfterAll = await asUser(t, adminId, async (client) =>
    client.query(api.notifications.unreadCount, {}),
  );
  expect(unreadAfterAll).toBe(0);
});

test("markRead impede acesso a notificacao de outro usuario", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);
  const otherId = await seedUser(t, {
    nome: "Outro",
    email: "outro@ong.local",
    permissions: ["dogs.read"],
  });

  const notificationId = await t.run(async (ctx) =>
    ctx.db.insert("notifications", {
      user_id: adminId,
      tipo: "system",
      titulo: "Privada",
      mensagem: "Somente admin",
      lida: false,
      criado_em: Date.now(),
    }),
  );

  await expect(
    asUser(t, otherId, async (client) => {
      await client.mutation(api.notifications.markRead, { notificationId });
    }),
  ).rejects.toThrow();
});

test("ocorrencia legal gera notificacao para read_legal", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const legalReaderId = await seedUser(t, {
    nome: "Juridico",
    email: "legal@ong.local",
    permissions: ["dogs.read", "occurrences.read", "occurrences.read_legal", "occurrences.create_legal"],
  });

  const storageId = await storeTestImage(t);
  const dogId = await asUser(t, adminId, async (client) =>
    client.mutation(api.dogs.create, {
      microchip: "444444444444444",
      nome: "Thor",
      sexo: "macho",
      porte: "grande",
      castrado: true,
      vacinas_em_dia: true,
      foto_perfil_storage_id: storageId,
    }),
  );

  await asUser(t, adminId, async (client) => {
    const types = await client.query(api.occurrenceTypes.list, {});
    const legalType = types.find((type) => type.categoria === "legal");
    await client.mutation(api.occurrences.create, {
      dogId,
      occurrenceTypeId: legalType!._id,
      descricao: "Denuncia recebida",
      data_ocorrencia: Date.now(),
      photo_storage_ids: [storageId],
    });
  });

  const notifications = await t.run(async (ctx) =>
    ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("user_id", legalReaderId).eq("lida", false))
      .collect(),
  );

  expect(notifications.some((item) => item.tipo === "legal_occurrence")).toBe(true);

  const listed = await asUser(t, legalReaderId, async (client) =>
    client.query(api.notifications.listMine, {
      paginationOpts: { numItems: 5, cursor: null },
    }),
  );

  const legalNotification = listed.page.find((item) => item.tipo === "legal_occurrence");
  expect(legalNotification?.href).toContain(`/dogs/${dogId}/occurrences/`);
});

test("usuario com dogs.create nao usa reportDogNotFound", async () => {
  const t = convexTest(schema, modules);
  await seedAdmin(t);
  const creatorId = await seedUser(t, {
    nome: "Cadastrador",
    email: "creator@ong.local",
    permissions: ["dogs.read", "dogs.create"],
  });

  await expect(
    asUser(t, creatorId, async (client) => {
      await client.mutation(api.notifications.reportDogNotFound, {
        microchip: "956000013141707",
      });
    }),
  ).rejects.toThrow(/cadastro/i);
});

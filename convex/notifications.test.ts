/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import { asUser, seedAdmin, seedUser } from "./testHelpers";
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
      .filter((q) => q.eq(q.field("tipo"), "dog_not_found"))
      .collect(),
  );

  expect(notifications.length).toBeGreaterThan(0);
  expect(notifications.some((item) => item.user_id === adminId)).toBe(true);
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

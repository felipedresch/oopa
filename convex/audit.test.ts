/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import { asUser, seedAdmin, seedUser } from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("audit.list e exportCsv exigem system.audit_log", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);
  const limitedId = await seedUser(t, {
    nome: "Sem auditoria",
    email: "noaudit@ong.local",
    permissions: ["dogs.read"],
  });

  await expect(
    asUser(t, limitedId, async (client) => {
      await client.query(api.audit.list, {
        paginationOpts: { numItems: 10, cursor: null },
      });
    }),
  ).rejects.toThrow();

  const page = await asUser(t, adminId, async (client) =>
    client.query(api.audit.list, {
      paginationOpts: { numItems: 10, cursor: null },
    }),
  );

  expect(Array.isArray(page.page)).toBe(true);

  const csv = await asUser(t, adminId, async (client) => client.query(api.audit.exportCsv, {}));
  expect(csv.startsWith("created_at,")).toBe(true);

  await expect(
    asUser(t, limitedId, async (client) => client.query(api.audit.exportCsv, {})),
  ).rejects.toThrow();
});

test("audit.list filtra por acao", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);

  await t.run(async (ctx) => {
    await ctx.db.insert("audit_logs", {
      actor_user_id: adminId,
      action: "dogs.create",
      entity_type: "dog",
      entity_id: "dog_test",
      summary: "Cao criado",
      created_at: Date.now(),
    });
    await ctx.db.insert("audit_logs", {
      actor_user_id: adminId,
      action: "tutors.create",
      entity_type: "tutor",
      entity_id: "tutor_test",
      summary: "Tutor criado",
      created_at: Date.now(),
    });
  });

  const filtered = await asUser(t, adminId, async (client) =>
    client.query(api.audit.list, {
      paginationOpts: { numItems: 10, cursor: null },
      action: "dogs.create",
    }),
  );

  expect(filtered.page.every((entry) => entry.action === "dogs.create")).toBe(true);
});

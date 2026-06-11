/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import { asUser, ensureSeeds, seedAdmin, seedUser } from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("exportacoes operacionais exigem system.audit_log", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);

  const readerId = await seedUser(t, {
    nome: "Leitor",
    email: "leitor@ong.local",
    permissions: ["dogs.read"],
  });

  await expect(
    asUser(t, readerId, async (client) => client.query(api.exports.exportDogsCsv, {})),
  ).rejects.toThrow();

  const adminId = await seedAdmin(t);
  const csv = await asUser(t, adminId, async (client) =>
    client.query(api.exports.exportDogsCsv, { limit: 10 }),
  );

  expect(csv).toContain("microchip");
  expect(csv).toContain("nome");
});

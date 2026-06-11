/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test } from "vitest";

import { api, internal } from "./_generated/api";
import { asUser, seedAdmin } from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const originalProvider = process.env.OCR_PROVIDER;
const originalFixture = process.env.OCR_FIXTURE_TEXT;

beforeEach(() => {
  process.env.OCR_PROVIDER = "fixture";
  process.env.OCR_FIXTURE_TEXT = "956 000 013 141 707";
});

afterEach(() => {
  process.env.OCR_PROVIDER = originalProvider;
  process.env.OCR_FIXTURE_TEXT = originalFixture;
});

test("extractMicrochip retorna candidato e registra log tecnico", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);
  const tinyPng = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("base64");

  const result = await asUser(t, adminId, async (client) =>
    client.action(api.ocr.extractMicrochip, {
      imageBase64: tinyPng,
      contentType: "image/png",
    }),
  );

  expect(result.candidate).toBe("956000013141707");
  expect(result.needsManualReview).toBe(false);

  const logs = await t.run(async (ctx) => ctx.db.query("ocr_logs").collect());
  expect(logs).toHaveLength(1);
  expect(logs[0]?.user_id).toBe(adminId);
  expect(logs[0]?.candidate).toBe("956000013141707");
});

test("extractMicrochip rejeita imagem invalida", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);

  await expect(
    asUser(t, adminId, async (client) => {
      await client.action(api.ocr.extractMicrochip, {
        imageBase64: "",
        contentType: "image/png",
      });
    }),
  ).rejects.toThrow();

  const logs = await t.run(async (ctx) => ctx.db.query("ocr_logs").collect());
  expect(logs[0]?.success).toBe(false);
});

test("logAttempt persiste falha sem imagem", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);

  await t.mutation(internal.ocrInternals.logAttempt, {
    userId: adminId,
    success: false,
    failureCode: "OCR_FAILED",
    failureMessage: "Falha simulada",
  });

  const log = await t.run(async (ctx) => ctx.db.query("ocr_logs").first());
  expect(log?.failure_message).toBe("Falha simulada");
});

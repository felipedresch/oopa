import { expect, test } from "vitest";

import {
  needsManualReview,
  parseMicrochipFromOcrText,
  validateOcrImageInput,
} from "./ocr";

test("parseMicrochipFromOcrText aceita 15 digitos limpos com alta confianca", () => {
  const result = parseMicrochipFromOcrText("956000013141707");
  expect(result.candidate).toBe("956000013141707");
  expect(result.confidence).toBeGreaterThanOrEqual(0.98);
  expect(result.needsManualReview).toBe(false);
});

test("parseMicrochipFromOcrText marca baixa confianca com ruido", () => {
  const result = parseMicrochipFromOcrText("Leitor RFID 956 000 013 141 707 OK");
  expect(result.candidate).toBe("956000013141707");
  expect(result.needsManualReview).toBe(true);
});

test("parseMicrochipFromOcrText retorna revisao manual para numero invalido", () => {
  const result = parseMicrochipFromOcrText("12345");
  expect(result.candidate).toBe("12345");
  expect(result.needsManualReview).toBe(true);
});

test("parseMicrochipFromOcrText falha sem candidato", () => {
  const result = parseMicrochipFromOcrText("sem numero legivel");
  expect(result.candidate).toBeNull();
  expect(result.needsManualReview).toBe(true);
});

test("needsManualReview exige 15 digitos e confianca minima", () => {
  expect(needsManualReview("956000013141707", 0.99)).toBe(false);
  expect(needsManualReview("956000013141707", 0.97)).toBe(true);
  expect(needsManualReview("123", 0.99)).toBe(true);
});

test("validateOcrImageInput rejeita arquivo grande e formato invalido", () => {
  const small = new Uint8Array([1, 2, 3]);
  expect(() => validateOcrImageInput(small, "image/jpeg")).not.toThrow();

  const huge = new Uint8Array(8 * 1024 * 1024 + 1);
  expect(() => validateOcrImageInput(huge, "image/jpeg")).toThrow(/8 MB/i);

  expect(() => validateOcrImageInput(small, "image/gif")).toThrow(/formato/i);
});

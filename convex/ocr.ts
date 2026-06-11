"use node";

import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { ocrFailed } from "./errors";
import {
  buildOcrFailureCode,
  parseMicrochipFromOcrText,
  validateOcrImageInput,
} from "./lib/ocr";
import { recognizeTextFromImage } from "./ocrRecognize";

const ocrResultValidator = v.object({
  candidate: v.union(v.string(), v.null()),
  confidence: v.number(),
  needsManualReview: v.boolean(),
});

const allowedContentTypeValidator = v.union(
  v.literal("image/jpeg"),
  v.literal("image/png"),
  v.literal("image/webp"),
);

export const extractMicrochip = action({
  args: {
    imageBase64: v.string(),
    contentType: allowedContentTypeValidator,
  },
  returns: ocrResultValidator,
  handler: async (ctx, args) => {
    const actor = await ctx.runQuery(internal.ocrInternals.getActiveUser, {});

    let bytes: Buffer;
    try {
      bytes = Buffer.from(args.imageBase64, "base64");
      validateOcrImageInput(bytes, args.contentType);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Imagem invalida.";
      await ctx.runMutation(internal.ocrInternals.logAttempt, {
        userId: actor._id,
        success: false,
        failureCode: buildOcrFailureCode(message),
        failureMessage: message,
      });
      throw ocrFailed(message);
    }

    try {
      const recognizedText = await recognizeTextFromImage(bytes, args.contentType);
      const parsed = parseMicrochipFromOcrText(recognizedText);

      await ctx.runMutation(internal.ocrInternals.logAttempt, {
        userId: actor._id,
        success: Boolean(parsed.candidate),
        candidate: parsed.candidate ?? undefined,
        confidence: parsed.confidence,
      });

      return parsed;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel ler o microchip na foto.";
      const code =
        error && typeof error === "object" && "data" in error
          ? ((error as { data?: { code?: string } }).data?.code ?? buildOcrFailureCode(message))
          : buildOcrFailureCode(message);

      await ctx.runMutation(internal.ocrInternals.logAttempt, {
        userId: actor._id,
        success: false,
        failureCode: code,
        failureMessage: message,
      });

      throw error;
    }
  },
});

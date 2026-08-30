import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { notFound, uploadRejected } from "../errors";

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_GALLERY_PHOTOS = 20;
export const MAX_PUBLIC_REPORT_PHOTOS = 5;

export const ALLOWED_IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const MAX_PDF_BYTES = 8 * 1024 * 1024;
export const MAX_NOTA_FISCAL_BYTES = 8 * 1024 * 1024;

export const ALLOWED_PDF_CONTENT_TYPES = new Set(["application/pdf"]);
export const ALLOWED_NOTA_FISCAL_CONTENT_TYPES = new Set([
  "application/xml",
  "text/xml",
  "application/pdf",
]);

type StorageCtx = Pick<MutationCtx, "db"> | Pick<QueryCtx, "db">;

export async function validateImageStorage(
  ctx: StorageCtx,
  storageId: Id<"_storage">,
): Promise<void> {
  const metadata = await ctx.db.system.get("_storage", storageId);
  if (!metadata) {
    throw notFound("Arquivo");
  }

  if (metadata.size > MAX_PHOTO_BYTES) {
    throw uploadRejected("A foto deve ter no maximo 8 MB.");
  }

  const contentType = metadata.contentType ?? "";
  if (contentType && !ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)) {
    throw uploadRejected("Formato inválido. Use JPEG, PNG ou WebP.");
  }
}

export async function validatePdfStorage(
  ctx: StorageCtx,
  storageId: Id<"_storage">,
): Promise<void> {
  const metadata = await ctx.db.system.get("_storage", storageId);
  if (!metadata) {
    throw notFound("Arquivo");
  }

  if (metadata.size > MAX_PDF_BYTES) {
    throw uploadRejected("O arquivo deve ter no maximo 8 MB.");
  }

  const contentType = metadata.contentType ?? "";
  if (contentType && !ALLOWED_PDF_CONTENT_TYPES.has(contentType)) {
    throw uploadRejected("Formato inválido. Envie um arquivo PDF.");
  }
}

export async function validateNotaFiscalStorage(
  ctx: StorageCtx,
  storageId: Id<"_storage">,
): Promise<void> {
  const metadata = await ctx.db.system.get("_storage", storageId);
  if (!metadata) {
    throw notFound("Nota fiscal");
  }

  if (metadata.size > MAX_NOTA_FISCAL_BYTES) {
    throw uploadRejected("A nota fiscal deve ter no maximo 8 MB.");
  }

  const contentType = metadata.contentType ?? "";
  if (contentType && !ALLOWED_NOTA_FISCAL_CONTENT_TYPES.has(contentType)) {
    throw uploadRejected("Formato inválido. Envie um XML ou PDF de nota fiscal.");
  }
}

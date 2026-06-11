import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { notFound, uploadRejected } from "../errors";

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_GALLERY_PHOTOS = 20;

export const ALLOWED_IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
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
    throw uploadRejected("Formato invalido. Use JPEG, PNG ou WebP.");
  }
}

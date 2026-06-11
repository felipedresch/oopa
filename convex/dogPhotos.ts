import { v } from "convex/values";

import { recordAudit } from "./audit";
import { forbidden, notFound } from "./errors";
import { getCurrentUser, requirePermission } from "./lib/auth";
import { MAX_GALLERY_PHOTOS, validateImageStorage } from "./lib/storage";
import { hasPermission } from "./permissions";
import { mutation, query } from "./_generated/server";

const galleryPhotoValidator = v.object({
  _id: v.id("dog_photos"),
  dog_id: v.id("dogs"),
  storage_id: v.id("_storage"),
  url: v.union(v.string(), v.null()),
  descricao: v.optional(v.string()),
  criado_em: v.number(),
});

export const listByDog = query({
  args: { dogId: v.id("dogs") },
  returns: v.object({
    photos: v.array(galleryPhotoValidator),
    count: v.number(),
    maxPhotos: v.number(),
  }),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "dogs.read")) {
      throw forbidden();
    }

    const dog = await ctx.db.get("dogs", args.dogId);
    if (!dog) {
      throw notFound("Cao");
    }

    const photos = await ctx.db
      .query("dog_photos")
      .withIndex("by_dog", (q) => q.eq("dog_id", args.dogId))
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      photos.map(async (photo) => ({
        _id: photo._id,
        dog_id: photo.dog_id,
        storage_id: photo.storage_id,
        url: await ctx.storage.getUrl(photo.storage_id),
        descricao: photo.descricao,
        criado_em: photo.criado_em,
      })),
    );

    return {
      photos: enriched,
      count: enriched.length,
      maxPhotos: MAX_GALLERY_PHOTOS,
    };
  },
});

export const add = mutation({
  args: {
    dogId: v.id("dogs"),
    storageId: v.id("_storage"),
    descricao: v.optional(v.string()),
  },
  returns: v.id("dog_photos"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "dogs.edit");

    const dog = await ctx.db.get("dogs", args.dogId);
    if (!dog) {
      throw notFound("Cao");
    }

    await validateImageStorage(ctx, args.storageId);

    const existing = await ctx.db
      .query("dog_photos")
      .withIndex("by_dog", (q) => q.eq("dog_id", args.dogId))
      .collect();

    if (existing.length >= MAX_GALLERY_PHOTOS) {
      throw forbidden(`Limite de ${MAX_GALLERY_PHOTOS} fotos adicionais atingido.`);
    }

    const photoId = await ctx.db.insert("dog_photos", {
      dog_id: args.dogId,
      storage_id: args.storageId,
      descricao: args.descricao?.trim() || undefined,
      criado_em: Date.now(),
      criado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "dog_photos.add",
      entityType: "dog",
      entityId: args.dogId,
      summary: `Foto adicionada ao cao ${dog.nome}`,
    });

    return photoId;
  },
});

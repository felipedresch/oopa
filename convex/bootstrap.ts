import { createAccount } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { moduleMapToPermissions, SEED_PERMISSION_TEMPLATES } from "./permissions";

const DEFAULT_ADMIN_EMAIL = "admin@ong.local";

export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();
    return user?._id ?? null;
  },
});

export const insertBootstrapUser = internalMutation({
  args: {
    email: v.string(),
    nome: v.string(),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("users", {
      nome: args.nome,
      name: args.nome,
      email: args.email,
      organizacao: "ONG OOPA",
      ativo: true,
      permissions: moduleMapToPermissions(SEED_PERMISSION_TEMPLATES[0].moduleMap),
      criado_em: now,
      ultimo_acesso_em: now,
    });
  },
});

/**
 * Cria o primeiro administrador em ambientes de desenvolvimento.
 * Requer BOOTSTRAP_ADMIN_PASSWORD nas variaveis de ambiente do deployment.
 */
export const ensureDevAdmin = internalAction({
  args: {
    email: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  returns: v.object({
    created: v.boolean(),
    email: v.string(),
  }),
  handler: async (ctx, args) => {
    const email = (args.email ?? process.env.BOOTSTRAP_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL)
      .trim()
      .toLowerCase();
    const password = args.password ?? process.env.BOOTSTRAP_ADMIN_PASSWORD;

    if (!password || password.length < 8) {
      throw new Error(
        "Defina BOOTSTRAP_ADMIN_PASSWORD (min. 8 caracteres) para criar o admin inicial.",
      );
    }

    const existingUserId = await ctx.runQuery(internal.bootstrap.getUserByEmail, { email });
    if (existingUserId) {
      return { created: false, email };
    }

    const permissions = moduleMapToPermissions(SEED_PERMISSION_TEMPLATES[0].moduleMap);

    await ctx.runMutation(internal.bootstrap.insertBootstrapUser, {
      email,
      nome: "Administrador",
    });

    await createAccount(ctx, {
      provider: "password",
      account: {
        id: email,
        secret: password,
      },
      profile: {
        email,
        name: "Administrador",
        nome: "Administrador",
        organizacao: "ONG OOPA",
        ativo: true,
        permissions,
        criado_em: Date.now(),
      },
    });

    return { created: true, email };
  },
});

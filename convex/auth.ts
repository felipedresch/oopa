import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

import type { GenericMutationCtx } from "convex/server";

import type { DataModel } from "./_generated/dataModel";
import { userInactive, validationError } from "./errors";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      id: "password",
      profile(params) {
        const flow = params.flow;
        if (flow === "signUp") {
          throw validationError("Cadastro disponivel apenas por convite.");
        }

        const rawEmail = params.email;
        const email = (typeof rawEmail === "string" ? rawEmail : "")
          .trim()
          .toLowerCase();
        if (!email.includes("@")) {
          throw validationError("Email invalido.");
        }

        const displayName =
          typeof params.name === "string" ? params.name : email.split("@")[0] ?? "Usuario";

        return {
          email,
          name: displayName,
          nome: displayName,
          organizacao: "",
          ativo: false,
          permissions: [],
          criado_em: Date.now(),
        };
      },
      validatePasswordRequirements(password) {
        if (password.length < 8) {
          throw validationError("Senha deve ter pelo menos 8 caracteres.");
        }
      },
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx, { existingUserId, type, profile }) {
      if (type !== "credentials") {
        throw new Error("Metodo de autenticacao nao suportado.");
      }

      const email = profile.email?.trim().toLowerCase();
      if (!email) {
        throw validationError("Email obrigatorio.");
      }

      const db = (ctx as GenericMutationCtx<DataModel>).db;
      const invitedUser = await db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .unique();

      if (invitedUser) {
        const now = Date.now();
        await ctx.db.patch(invitedUser._id, {
          email,
          name: invitedUser.nome,
          ativo: true,
          ultimo_acesso_em: now,
          atualizado_em: now,
        });
        return invitedUser._id;
      }

      if (existingUserId) {
        await ctx.db.patch(existingUserId, { email });
        return existingUserId;
      }

      throw validationError("Conta nao encontrada. Use o link de convite.");
    },
    async beforeSessionCreation(ctx, { userId }) {
      const db = (ctx as GenericMutationCtx<DataModel>).db;
      const user = await db.get("users", userId);
      if (!user?.ativo) {
        throw userInactive();
      }

      await db.patch(userId, {
        ultimo_acesso_em: Date.now(),
      });
    },
  },
});

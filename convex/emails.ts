"use node";

import { v } from "convex/values";
import { Resend } from "resend";

import { internalAction } from "./_generated/server";

const fromEmail = () =>
  process.env.RESEND_FROM_EMAIL ?? "OOPA <noreply@oopa.local>";

function appBaseUrl(): string {
  return process.env.SITE_URL ?? "http://localhost:5173";
}

async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY ausente; email nao enviado.", {
      to: args.to,
      subject: args.subject,
    });
    return;
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: fromEmail(),
    to: args.to,
    subject: args.subject,
    html: args.html,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

export const sendInviteEmail = internalAction({
  args: {
    email: v.string(),
    nome: v.string(),
    token: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const link = `${appBaseUrl()}/accept-invite/${args.token}`;
    await sendEmail({
      to: args.email,
      subject: "Convite para acessar o OOPA",
      html: `
        <p>Ola, ${args.nome}.</p>
        <p>Voce foi convidado para acessar o sistema OOPA.</p>
        <p><a href="${link}">Aceitar convite e criar senha</a></p>
        <p>Este link expira em 7 dias.</p>
      `,
    });
    return null;
  },
});

export const sendPasswordResetEmail = internalAction({
  args: {
    email: v.string(),
    token: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const link = `${appBaseUrl()}/reset-password/${args.token}`;
    await sendEmail({
      to: args.email,
      subject: "Redefinir senha do OOPA",
      html: `
        <p>Recebemos um pedido para redefinir sua senha.</p>
        <p><a href="${link}">Criar nova senha</a></p>
        <p>Este link expira em 60 minutos.</p>
      `,
    });
    return null;
  },
});

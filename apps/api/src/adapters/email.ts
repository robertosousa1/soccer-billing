import { Resend } from "resend";
import { render } from "@react-email/render";
import { InviteEmail } from "../emails/InviteEmail";
import { WelcomeEmail } from "../emails/WelcomeEmail";
import { ForgotPasswordEmail } from "../emails/ForgotPasswordEmail";
import { env } from "../config/env";

const resend = new Resend(env.emailApiKey);

export interface InviteEmailParams {
  to: string;
  name: string;
  inviteUrl: string;
  peladaNome: string;
  role: string;
}

export async function sendInviteEmail(params: InviteEmailParams): Promise<void> {
  const html = await render(InviteEmail(params));
  const { error } = await resend.emails.send({
    from: env.emailFrom,
    to: params.to,
    subject: `Você foi convidado para ${params.peladaNome}`,
    html,
  });
  if (error) throw new Error(`[email] ${error.message}`);
}

export interface ForgotPasswordEmailParams {
  to: string;
  name: string;
  resetUrl: string;
}

export async function sendForgotPasswordEmail(params: ForgotPasswordEmailParams): Promise<void> {
  const html = await render(ForgotPasswordEmail({ name: params.name, resetUrl: params.resetUrl }));
  const { error } = await resend.emails.send({
    from: env.emailFrom,
    to: params.to,
    subject: "Redefinição de senha — Caixa da Pelada",
    html,
  });
  if (error) throw new Error(`[email] ${error.message}`);
}

export interface WelcomeEmailParams {
  to: string;
  name: string;
  peladaNome: string;
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<void> {
  const html = await render(WelcomeEmail({ ...params, loginUrl: env.appUrl }));
  const { error } = await resend.emails.send({
    from: env.emailFrom,
    to: params.to,
    subject: "Sua senha foi cadastrada — bem-vindo ao Caixa da Pelada!",
    html,
  });
  if (error) throw new Error(`[email] ${error.message}`);
}

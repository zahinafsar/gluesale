import { Resend } from "resend";
import type React from "react";
import { env } from "./env.server";

let client: Resend | null = null;

function getClient(): Resend {
  if (!client) client = new Resend(env.RESEND_API_KEY());
  return client;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  react?: React.ReactElement;
  html?: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}) {
  const replyTo = opts.replyTo ?? env.RESEND_REPLY_TO();
  const { data, error } = await getClient().emails.send({
    from: env.RESEND_FROM(),
    to: opts.to,
    subject: opts.subject,
    react: opts.react,
    html: opts.html,
    text: opts.text,
    ...(replyTo ? { replyTo } : {}),
    ...(opts.headers ? { headers: opts.headers } : {}),
  } as Parameters<Resend["emails"]["send"]>[0]);
  if (error) throw new Error(`Resend error: ${error.message ?? JSON.stringify(error)}`);
  return data;
}

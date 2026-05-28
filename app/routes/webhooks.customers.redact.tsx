import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { recordWebhook } from "../lib/webhook.server";

type Payload = { customer?: { email?: string | null } };

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload, webhookId, apiVersion } = await authenticate.webhook(request);
  console.log(`[${topic}] ${shop}`);

  const { duplicate } = await recordWebhook({ webhookId, topic, shop, apiVersion, payload });
  if (duplicate) return new Response();

  const email = ((payload as Payload).customer?.email ?? "").toLowerCase();
  if (!email) return new Response();

  const brand = await prisma.brand.findUnique({ where: { shop } });
  if (!brand) return new Response();

  // Cascade: deleting the Customer drops their Referrer/Referee rows and any Referral they participated in.
  await prisma.customer.deleteMany({ where: { brandId: brand.id, email } });
  return new Response();
};

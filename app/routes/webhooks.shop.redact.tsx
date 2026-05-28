import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { recordWebhook } from "../lib/webhook.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload, webhookId, apiVersion } = await authenticate.webhook(request);
  console.log(`[${topic}] ${shop}`);

  const { duplicate } = await recordWebhook({ webhookId, topic, shop, apiVersion, payload });
  if (duplicate) return new Response();

  await prisma.brand.deleteMany({ where: { shop } });
  await prisma.session.deleteMany({ where: { shop } });
  return new Response();
};

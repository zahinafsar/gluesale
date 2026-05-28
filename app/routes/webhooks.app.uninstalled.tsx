import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { recordWebhook } from "../lib/webhook.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic, payload, webhookId, apiVersion } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const { duplicate } = await recordWebhook({ webhookId, topic, shop, apiVersion, payload });
  if (duplicate) return new Response();

  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { recordWebhook } from "../lib/webhook.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload, webhookId, apiVersion } = await authenticate.webhook(request);
  console.log(`[${topic}] ${shop}`);
  await recordWebhook({ webhookId, topic, shop, apiVersion, payload });
  return new Response();
};

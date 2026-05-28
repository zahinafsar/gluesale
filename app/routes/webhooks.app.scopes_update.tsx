import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { recordWebhook } from "../lib/webhook.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { payload, session, topic, shop, webhookId, apiVersion } = await authenticate.webhook(request);
    console.log(`Received ${topic} webhook for ${shop}`);

    const { duplicate } = await recordWebhook({ webhookId, topic, shop, apiVersion, payload });
    if (duplicate) return new Response();

    const current = payload.current as string[];
    if (session) {
        await db.session.update({
            where: {
                id: session.id
            },
            data: {
                scope: current.toString(),
            },
        });
    }
    return new Response();
};

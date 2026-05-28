import { Prisma } from "@prisma/client";
import prisma from "../db.server";

export async function recordWebhook(args: {
  webhookId: string;
  topic: string;
  shop: string;
  apiVersion?: string;
  payload: unknown;
}): Promise<{ duplicate: boolean }> {
  try {
    await prisma.processedWebhook.create({
      data: {
        id: args.webhookId,
        topic: args.topic,
        shop: args.shop,
        apiVersion: args.apiVersion,
        payload: (args.payload ?? {}) as Prisma.InputJsonValue,
      },
    });
    return { duplicate: false };
  } catch {
    return { duplicate: true };
  }
}

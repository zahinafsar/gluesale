import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`[${topic}] ${shop}`);
  await prisma.brand.deleteMany({ where: { shop } });
  await prisma.session.deleteMany({ where: { shop } });
  return new Response();
};

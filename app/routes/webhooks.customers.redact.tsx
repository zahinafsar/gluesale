import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

type Payload = { customer?: { email?: string | null } };

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`[${topic}] ${shop}`);
  const email = ((payload as Payload).customer?.email ?? "").toLowerCase();
  if (!email) return new Response();

  const brand = await prisma.brand.findUnique({ where: { shop } });
  if (!brand) return new Response();

  await prisma.referral.deleteMany({ where: { brandId: brand.id, friendEmail: email } });
  await prisma.referrer.deleteMany({ where: { brandId: brand.id, email } });
  return new Response();
};

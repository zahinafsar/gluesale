import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate, unauthenticated } from "../shopify.server";
import { getOrCreateBrand, getOrCreateCustomer, getOrCreateReferrer } from "../lib/customer.server";
import { getReferralConfig } from "../lib/feature.server";
import { buildShareLink } from "../lib/referral.server";
import { getOrderContact } from "../lib/shopify-admin.server";
import {
  parseDiscountConfig,
  formatDiscountLabel,
  describeDiscountConditions,
} from "../lib/discount-config";

function preflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}

async function handle(request: Request) {
  const { sessionToken, cors } = await authenticate.public.checkout(request);
  const shop = String(sessionToken.dest ?? "").replace(/^https?:\/\//, "");
  const orderId = new URL(request.url).searchParams.get("orderId");
  if (!shop || !orderId) return cors(Response.json({ active: false }));

  const brand = await getOrCreateBrand(shop);
  const config = await getReferralConfig(brand);
  if (!config.enabled) return cors(Response.json({ active: false }));

  const { admin } = await unauthenticated.admin(shop);
  const contact = await getOrderContact(admin.graphql, orderId);
  if (!contact?.email) return cors(Response.json({ active: false }));
  if (contact.numberOfOrders > 1) return cors(Response.json({ active: false }));

  const customer = await getOrCreateCustomer(brand, { email: contact.email });
  const referrer = await getOrCreateReferrer(config, customer);

  const refereeDiscount = parseDiscountConfig(config.refereeDiscount);
  const referrerDiscount = parseDiscountConfig(config.referrerDiscount);

  return cors(
    Response.json({
      active: true,
      code: referrer.code,
      shareUrl: buildShareLink({ shop, code: referrer.code }),
      refereeLabel: formatDiscountLabel(refereeDiscount),
      refererLabel: formatDiscountLabel(referrerDiscount),
      conditions: describeDiscountConditions(refereeDiscount),
    }),
  );
}

export const loader = async ({ request }: LoaderFunctionArgs) => handle(request);

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") return preflight();
  return handle(request);
};

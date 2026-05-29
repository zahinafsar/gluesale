import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { unauthenticated } from "../shopify.server";
import { verifyAppProxySignature } from "../lib/proxy.server";
import {
  getOrCreateBrand,
  getOrCreateCustomer,
  getOrCreateReferrer,
} from "../lib/customer.server";
import { getReferralConfig } from "../lib/feature.server";
import { buildShareLink } from "../lib/referral.server";
import { getOrderContact } from "../lib/shopify-admin.server";
import {
  parseDiscountConfig,
  formatDiscountLabel,
  describeDiscountConditions,
} from "../lib/discount-config";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  return json({ active: false }, 405);
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (!verifyAppProxySignature(url)) return json({ active: false }, 401);

  const shop = url.searchParams.get("shop") ?? "";
  const orderId = url.searchParams.get("orderId") ?? "";
  if (!shop || !orderId) return json({ active: false });

  try {
    const brand = await getOrCreateBrand(shop);
    const config = await getReferralConfig(brand);
    if (!config.enabled) return json({ active: false });

    const { admin } = await unauthenticated.admin(shop);
    const contact = await getOrderContact(admin.graphql, orderId);
    if (!contact?.email) return json({ active: false });
    if (config.firstPurchaseOnly && contact.numberOfOrders > 1) {
      return json({ active: false });
    }

    const customer = await getOrCreateCustomer(brand, { email: contact.email });
    const referrer = await getOrCreateReferrer(config, customer);

    const refereeDiscount = parseDiscountConfig(config.refereeDiscount);
    const referrerDiscount = parseDiscountConfig(config.referrerDiscount);

    return json({
      active: true,
      code: referrer.code,
      shareUrl: buildShareLink({ shop, code: referrer.code }),
      refereeLabel: formatDiscountLabel(refereeDiscount),
      refererLabel: formatDiscountLabel(referrerDiscount),
      conditions: describeDiscountConditions(refereeDiscount),
    });
  } catch (error) {
    console.error("[gluesale] referral share failed", error);
    return json({ active: false, error: String((error as Error)?.message ?? error) }, 500);
  }
};

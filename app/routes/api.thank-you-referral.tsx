import type { LoaderFunctionArgs } from "react-router";
import { authenticate, unauthenticated } from "../shopify.server";
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

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const headers = cors();

  try {
    const { sessionToken } = await authenticate.public.checkout(request);
    const shop = String(sessionToken.dest ?? "").replace(/^https?:\/\//, "");
    const orderId = new URL(request.url).searchParams.get("orderId");
    if (!shop || !orderId) return Response.json({ active: false }, { headers });

    const brand = await getOrCreateBrand(shop);
    const config = await getReferralConfig(brand);
    if (!config.enabled) return Response.json({ active: false }, { headers });

    const { admin } = await unauthenticated.admin(shop);
    const contact = await getOrderContact(admin.graphql, orderId);
    if (!contact?.email) return Response.json({ active: false }, { headers });
    if (config.firstPurchaseOnly && contact.numberOfOrders > 1) {
      return Response.json({ active: false }, { headers });
    }

    const customer = await getOrCreateCustomer(brand, { email: contact.email });
    const referrer = await getOrCreateReferrer(config, customer);

    const refereeDiscount = parseDiscountConfig(config.refereeDiscount);
    const referrerDiscount = parseDiscountConfig(config.referrerDiscount);

    return Response.json(
      {
        active: true,
        code: referrer.code,
        shareUrl: buildShareLink({ shop, code: referrer.code }),
        refereeLabel: formatDiscountLabel(refereeDiscount),
        refererLabel: formatDiscountLabel(referrerDiscount),
        conditions: describeDiscountConditions(refereeDiscount),
      },
      { headers },
    );
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("[gluesale] thank-you-referral failed", error);
    return Response.json(
      { active: false, error: String((error as Error)?.message ?? error) },
      { status: 500, headers },
    );
  }
};

export const action = async () => new Response(null, { status: 204, headers: cors() });

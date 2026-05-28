import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import { buildShareLink } from "../lib/referral.server";
import {
  getOrCreateBrand,
  getOrCreateCustomer,
  getOrCreateReferrer,
} from "../lib/customer.server";
import { getReferralConfig } from "../lib/feature.server";
import { parseDiscountConfig } from "../lib/discount-config";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) throw new Response("Unauthorized", { status: 401 });
  const shop = session.shop;

  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase();
  const customerId = url.searchParams.get("customerId") ?? null;
  if (!email) return data({ error: "Missing email" }, { status: 400 });

  const brand = await getOrCreateBrand(shop);
  const config = await getReferralConfig(brand);
  if (!config.enabled) return data({ active: false });

  const customer = await getOrCreateCustomer(brand, { email, shopifyCustomerId: customerId });
  const referrer = await getOrCreateReferrer(config, customer);

  const refereeDiscount = parseDiscountConfig(config.refereeDiscount);
  const referrerDiscount = parseDiscountConfig(config.referrerDiscount);

  return data({
    active: true,
    code: referrer.code,
    url: buildShareLink({ shop, code: referrer.code }),
    refereeDiscount,
    referrerDiscount,
  });
};

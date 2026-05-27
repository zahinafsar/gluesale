import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import { buildShareLink, getOrCreateBrand, getOrCreateReferrer } from "../lib/referral.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) throw new Response("Unauthorized", { status: 401 });
  const shop = session.shop;

  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase();
  const customerId = url.searchParams.get("customerId") ?? null;
  if (!email) return data({ error: "Missing email" }, { status: 400 });

  const brand = await getOrCreateBrand(shop);
  if (!brand.programActive) return data({ active: false });

  const referrer = await getOrCreateReferrer(brand, { email, shopifyCustomerId: customerId });
  return data({
    active: true,
    code: referrer.code,
    url: buildShareLink({ shop, code: referrer.code }),
    refereePercent: brand.refereePercent,
    refererPercent: brand.refererPercent,
  });
};

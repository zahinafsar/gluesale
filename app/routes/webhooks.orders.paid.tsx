import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { convertReferral, buildShareLink } from "../lib/referral.server";
import { getOrCreateBrand, getOrCreateCustomer, getOrCreateReferrer } from "../lib/customer.server";
import { getReferralConfig } from "../lib/feature.server";
import { parseDiscountConfig } from "../lib/discount-config";
import { sendEmail } from "../lib/resend.server";
import { ReferrerInviteEmail } from "../emails/ReferrerInviteEmail";
import { recordWebhook } from "../lib/webhook.server";

type OrderPayload = {
  id: number;
  admin_graphql_api_id?: string;
  email?: string | null;
  customer?: {
    id?: number | null;
    admin_graphql_api_id?: string;
    email?: string | null;
    orders_count?: number | string | null;
    number_of_orders?: number | string | null;
  } | null;
  note_attributes?: Array<{ name: string; value: string }>;
  discount_codes?: Array<{ code: string }>;
  cart_token?: string | null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload, webhookId, apiVersion } = await authenticate.webhook(request);
  if (!webhookId) return new Response("Missing webhook id", { status: 400 });

  const { duplicate } = await recordWebhook({ webhookId, topic, shop, apiVersion, payload });
  if (duplicate) return new Response();

  const order = payload as OrderPayload;
  const customerOrdersCount =
    order.customer?.orders_count ?? order.customer?.number_of_orders ?? 1;

  const orderId = order.admin_graphql_api_id ?? `gid://shopify/Order/${order.id}`;

  const conv = await convertReferral({
    shop,
    order: {
      id: orderId,
      email: order.email,
      customer: {
        id: order.customer?.admin_graphql_api_id ?? null,
        numberOfOrders: customerOrdersCount,
      },
      note_attributes: order.note_attributes,
      discount_codes: order.discount_codes,
      cart_token: order.cart_token,
    },
  }).catch((e) => {
    console.error("[webhook orders/paid] convertReferral failed", e);
    return { rewarded: false, reason: "exception" };
  });

  const isFirstOrder = Number(customerOrdersCount) <= 1;
  if (isFirstOrder && order.email) {
    try {
      const brand = await getOrCreateBrand(shop);
      const config = await getReferralConfig(brand);
      if (config.enabled) {
        const customer = await getOrCreateCustomer(brand, {
          email: order.email,
          shopifyCustomerId: order.customer?.admin_graphql_api_id ?? null,
        });
        const referrer = await getOrCreateReferrer(config, customer);
        if (!referrer.welcomeEmailedAt) {
          const shareUrl = buildShareLink({ shop, code: referrer.code });
          const storeName = shop.replace(/\.myshopify\.com$/, "");
          const refereeDiscount = parseDiscountConfig(config.refereeDiscount);
          const referrerDiscount = parseDiscountConfig(config.referrerDiscount);
          await sendEmail({
            to: customer.email,
            subject: `Your referral link for ${storeName}`,
            entityRefId: String(order.id),
            react: ReferrerInviteEmail({
              shop,
              shareUrl,
              refereePercent: refereeDiscount.amount,
              refererPercent: referrerDiscount.amount,
            }),
          });
          await prisma.referrer.update({
            where: { id: referrer.id },
            data: { welcomeEmailedAt: new Date() },
          });
        }
      }
    } catch (e) {
      console.error("[webhook orders/paid] new-referrer email failed", e);
    }
  }

  void conv;
  return new Response();
};

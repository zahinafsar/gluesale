import prisma from "../db.server";
import { unauthenticated } from "../shopify.server";
import { sendEmail } from "./resend.server";
import { generateDiscountCode, hashIp } from "./code.server";
import { createDiscountCode, findCustomerByEmail } from "./shopify-admin.server";
import { RefereeCodeEmail } from "../emails/RefereeCodeEmail";
import { ReferrerRewardEmail } from "../emails/ReferrerRewardEmail";
import { getOrCreateBrand, getOrCreateCustomer, getOrCreateReferee } from "./customer.server";
import { getReferralConfig } from "./feature.server";
import { parseDiscountConfig } from "./discount-config";

const norm = (s: string) => s.trim().toLowerCase();

export { getOrCreateBrand };

export type ClaimResult =
  | { ok: true; refereeCode: string; redirectUrl: string }
  | {
      ok: false;
      reason:
        | "self"
        | "existing"
        | "duplicate"
        | "invalid_code"
        | "program_off"
        | "device_reuse"
        | "limit_reached"
        | "error";
      message: string;
    };

export async function claimReferral(args: {
  shop: string;
  referrerCode: string;
  friendEmail: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<ClaimResult> {
  const friendEmail = norm(args.friendEmail);
  if (!/^.+@.+\..+$/.test(friendEmail))
    return { ok: false, reason: "error", message: "Invalid email" };

  const brand = await getOrCreateBrand(args.shop);
  const config = await getReferralConfig(brand);
  if (!config.enabled)
    return { ok: false, reason: "program_off", message: "Referral program not active" };

  const referrer = await prisma.referrer.findUnique({
    where: { code: args.referrerCode },
    include: { customer: true },
  });
  if (!referrer || referrer.referralConfigId !== config.id)
    return { ok: false, reason: "invalid_code", message: "Unknown referral code" };

  if (norm(referrer.customer.email) === friendEmail)
    return { ok: false, reason: "self", message: "You can't refer yourself" };

  const friendCustomer = await getOrCreateCustomer(brand, { email: friendEmail });
  const friendReferee = await getOrCreateReferee(config, friendCustomer);

  const existingClaim = await prisma.referral.findUnique({
    where: { refereeId: friendReferee.id },
  });
  if (existingClaim)
    return {
      ok: false,
      reason: "duplicate",
      message: "This email has already claimed a referral",
    };

  const ipHash = hashIp(args.ip);

  if (config.preventDeviceReuse && ipHash) {
    const sameDevice = await prisma.referral.findFirst({
      where: { referrerId: referrer.id, ipHash },
    });
    if (sameDevice) {
      await prisma.referral.create({
        data: {
          referralConfigId: config.id,
          referrerId: referrer.id,
          refereeId: friendReferee.id,
          status: "REJECTED_FRAUD",
          ipHash,
          userAgent: args.userAgent ?? undefined,
        },
      });
      return {
        ok: false,
        reason: "device_reuse",
        message: "This device has already used this referral link",
      };
    }
  }

  if (config.maxReferralsPerUser != null) {
    const convertedCount = await prisma.referral.count({
      where: { referrerId: referrer.id, status: "CONVERTED" },
    });
    if (convertedCount >= config.maxReferralsPerUser)
      return {
        ok: false,
        reason: "limit_reached",
        message: "This referrer has reached their referral limit",
      };
  }

  const { admin } = await unauthenticated.admin(args.shop);

  if (config.firstPurchaseOnly) {
    const existingCustomer = await findCustomerByEmail(admin.graphql, friendEmail);
    if (existingCustomer && existingCustomer.numberOfOrders > 0) {
      await prisma.referral.create({
        data: {
          referralConfigId: config.id,
          referrerId: referrer.id,
          refereeId: friendReferee.id,
          status: "REJECTED_EXISTING",
          ipHash,
          userAgent: args.userAgent ?? undefined,
        },
      });
      return {
        ok: false,
        reason: "existing",
        message: "This email belongs to an existing customer",
      };
    }
  }

  const d = parseDiscountConfig(config.refereeDiscount);
  const code = generateDiscountCode("REF");
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + d.validity_seconds * 1000);

  const { nodeId } = await createDiscountCode(admin.graphql, {
    title: `Referral discount for ${friendEmail}`,
    code,
    type: d.type,
    amount: d.amount,
    startsAt,
    endsAt,
    usageLimit: d.max_uses,
    minOrderAmount: d.min_order_amount,
    appliesOncePerCustomer: true,
  });

  const discount = await prisma.discount.create({
    data: { shopifyCodeId: nodeId, code },
  });

  await prisma.referral.create({
    data: {
      referralConfigId: config.id,
      referrerId: referrer.id,
      refereeId: friendReferee.id,
      refereeDiscountId: discount.id,
      status: "CLAIMED",
      ipHash,
      userAgent: args.userAgent ?? undefined,
    },
  });

  try {
    await sendEmail({
      to: friendEmail,
      subject: `Your referral code for ${args.shop.replace(/\.myshopify\.com$/, "")}`,
      react: RefereeCodeEmail({
        shop: args.shop,
        code,
        percent: d.amount,
        expiresAt: endsAt,
      }),
    });
    await prisma.discount.update({
      where: { id: discount.id },
      data: { emailedAt: new Date() },
    });
  } catch (e) {
    console.error("[referral] send referee email failed", e);
  }

  const redirectUrl = `https://${args.shop}/discount/${encodeURIComponent(code)}?redirect=/`;
  return { ok: true, refereeCode: code, redirectUrl };
}

export async function convertReferral(args: {
  shop: string;
  order: {
    id: string;
    email?: string | null;
    customer?: { id?: string | null; numberOfOrders?: number | string | null } | null;
    note_attributes?: Array<{ name: string; value: string }>;
    discount_codes?: Array<{ code: string }>;
    cart_token?: string | null;
  };
}): Promise<{ rewarded: boolean; reason?: string }> {
  const orderEmail = norm(args.order.email ?? "");
  if (!orderEmail) return { rewarded: false, reason: "no_email" };

  const brand = await getOrCreateBrand(args.shop);
  const config = await getReferralConfig(brand);
  if (!config.enabled) return { rewarded: false, reason: "program_off" };

  const attrCode = args.order.note_attributes?.find(
    (a) => a.name === "_referral_code" || a.name === "referral_code",
  )?.value;
  const codeFromAttr = attrCode ? attrCode.trim() : null;
  const codeFromDiscount = args.order.discount_codes?.[0]?.code ?? null;

  type FoundReferral = NonNullable<
    Awaited<ReturnType<typeof prisma.referral.findUnique>>
  > & {
    referrer: NonNullable<Awaited<ReturnType<typeof prisma.referrer.findUnique>>> & {
      customer: NonNullable<Awaited<ReturnType<typeof prisma.customer.findUnique>>>;
    };
  };
  let referral: FoundReferral | null = null;

  const codeCandidate = codeFromAttr || codeFromDiscount;
  if (codeCandidate) {
    const discount = await prisma.discount.findUnique({
      where: { code: codeCandidate },
      include: {
        refereeFor: {
          include: { referrer: { include: { customer: true } } },
        },
      },
    });
    referral = (discount?.refereeFor as FoundReferral | undefined) ?? null;
  }

  if (!referral) {
    const friendCustomer = await prisma.customer.findUnique({
      where: { brandId_email: { brandId: brand.id, email: orderEmail } },
      include: {
        asReferee: {
          include: {
            referral: {
              include: { referrer: { include: { customer: true } } },
            },
          },
        },
      },
    });
    referral = (friendCustomer?.asReferee?.referral as FoundReferral | undefined) ?? null;
  }

  if (!referral || referral.status !== "CLAIMED")
    return { rewarded: false, reason: "no_match" };

  const referrer = referral.referrer;

  if (norm(referrer.customer.email) === orderEmail) {
    await prisma.referral.update({
      where: { id: referral.id },
      data: { status: "REJECTED_SELF" },
    });
    return { rewarded: false, reason: "self_referral" };
  }

  if (config.firstPurchaseOnly) {
    const customerOrderCount =
      typeof args.order.customer?.numberOfOrders === "string"
        ? parseInt(args.order.customer.numberOfOrders, 10)
        : args.order.customer?.numberOfOrders ?? 1;
    if (customerOrderCount > 1) {
      await prisma.referral.update({
        where: { id: referral.id },
        data: { status: "REJECTED_EXISTING" },
      });
      return { rewarded: false, reason: "not_first_order" };
    }
  }

  const d = parseDiscountConfig(config.referrerDiscount);

  if (d.type === "NONE") {
    await prisma.referral.update({
      where: { id: referral.id },
      data: { status: "CONVERTED", convertedAt: new Date(), orderId: args.order.id },
    });
    return { rewarded: true, reason: "no_incentive" };
  }

  const { admin } = await unauthenticated.admin(args.shop);
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + d.validity_seconds * 1000);
  const rewardCode = generateDiscountCode("THANKS");

  const { nodeId } = await createDiscountCode(admin.graphql, {
    title: `Referrer reward for ${referrer.customer.email}`,
    code: rewardCode,
    type: d.type,
    amount: d.amount,
    startsAt,
    endsAt,
    usageLimit: d.max_uses,
    minOrderAmount: d.min_order_amount,
    appliesOncePerCustomer: true,
  });

  const discount = await prisma.discount.create({
    data: { shopifyCodeId: nodeId, code: rewardCode },
  });

  await prisma.referral.update({
    where: { id: referral.id },
    data: {
      status: "CONVERTED",
      convertedAt: new Date(),
      orderId: args.order.id,
      referrerDiscountId: discount.id,
    },
  });

  try {
    await sendEmail({
      to: referrer.customer.email,
      subject: `Your referral reward at ${args.shop.replace(/\.myshopify\.com$/, "")}`,
      entityRefId: args.order.id,
      react: ReferrerRewardEmail({
        shop: args.shop,
        code: rewardCode,
        percent: d.amount,
        expiresAt: endsAt,
      }),
    });
    await prisma.discount.update({
      where: { id: discount.id },
      data: { emailedAt: new Date() },
    });
  } catch (e) {
    console.error("[referral] send referrer reward email failed", e);
  }

  return { rewarded: true };
}

export function buildShareLink(opts: { shop: string; code: string }): string {
  return `https://${opts.shop}/apps/referral?c=${encodeURIComponent(opts.code)}`;
}

import type { Brand, Customer, Referee, ReferralConfig, Referrer } from "@prisma/client";
import prisma from "../db.server";
import { generateReferralCode } from "./code.server";

const norm = (s: string) => s.trim().toLowerCase();

export async function getOrCreateBrand(shop: string): Promise<Brand> {
  return prisma.brand.upsert({
    where: { shop },
    create: { shop },
    update: {},
  });
}

export async function getOrCreateCustomer(
  brand: Brand,
  input: { email: string; shopifyCustomerId?: string | null },
): Promise<Customer> {
  const email = norm(input.email);
  return prisma.customer.upsert({
    where: { brandId_email: { brandId: brand.id, email } },
    create: {
      brandId: brand.id,
      email,
      shopifyCustomerId: input.shopifyCustomerId ?? undefined,
    },
    update: {
      shopifyCustomerId: input.shopifyCustomerId ?? undefined,
    },
  });
}

export async function getOrCreateReferrer(
  config: ReferralConfig,
  customer: Customer,
): Promise<Referrer> {
  return prisma.referrer.upsert({
    where: { customerId: customer.id },
    create: {
      referralConfigId: config.id,
      customerId: customer.id,
      code: generateReferralCode(12),
    },
    update: {},
  });
}

export async function getOrCreateReferee(
  config: ReferralConfig,
  customer: Customer,
): Promise<Referee> {
  return prisma.referee.upsert({
    where: { customerId: customer.id },
    create: {
      referralConfigId: config.id,
      customerId: customer.id,
    },
    update: {},
  });
}

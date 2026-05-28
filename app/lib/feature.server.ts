import type { Brand, ReferralConfig } from "@prisma/client";
import prisma from "../db.server";

export async function getReferralConfig(brand: Brand): Promise<ReferralConfig> {
  return prisma.referralConfig.upsert({
    where: { brandId: brand.id },
    create: { brandId: brand.id },
    update: {},
  });
}

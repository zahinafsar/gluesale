import type { Prisma } from "@prisma/client";

export type DiscountType = "PERCENT" | "FIXED_AMOUNT" | "NONE";

export type DiscountConfig = {
  type: DiscountType;
  amount: number;
  validity_seconds: number;
  max_uses: number | null;
  min_order_amount: number;
};

export const defaultDiscountConfig: DiscountConfig = {
  type: "PERCENT",
  amount: 10,
  validity_seconds: 2592000,
  max_uses: 1,
  min_order_amount: 0,
};

export function parseDiscountConfig(value: Prisma.JsonValue | null | undefined): DiscountConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...defaultDiscountConfig };
  }
  const v = value as Record<string, unknown>;
  const type: DiscountType =
    v.type === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : v.type === "NONE" ? "NONE" : "PERCENT";
  const amount = typeof v.amount === "number" && v.amount > 0 ? v.amount : defaultDiscountConfig.amount;
  const validity_seconds =
    typeof v.validity_seconds === "number" && v.validity_seconds > 0
      ? Math.floor(v.validity_seconds)
      : defaultDiscountConfig.validity_seconds;
  const max_uses =
    v.max_uses === null
      ? null
      : typeof v.max_uses === "number" && v.max_uses > 0
        ? Math.floor(v.max_uses)
        : defaultDiscountConfig.max_uses;
  const min_order_amount =
    typeof v.min_order_amount === "number" && v.min_order_amount >= 0
      ? v.min_order_amount
      : defaultDiscountConfig.min_order_amount;
  return { type, amount, validity_seconds, max_uses, min_order_amount };
}

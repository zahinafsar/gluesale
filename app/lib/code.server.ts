import crypto from "node:crypto";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateReferralCode(length = 12): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CROCKFORD[bytes[i] % CROCKFORD.length];
  }
  return out;
}

export function generateDiscountCode(prefix = "REF"): string {
  return `${prefix}-${generateReferralCode(8)}`;
}

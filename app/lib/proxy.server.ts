import crypto from "node:crypto";
import { env } from "./env.server";

export function verifyAppProxySignature(url: URL): boolean {
  const params = new URLSearchParams(url.search);
  const signature = params.get("signature");
  if (!signature) return false;
  params.delete("signature");

  const keys = Array.from(params.keys()).sort();
  const message = keys
    .map((k) => `${k}=${params.getAll(k).join(",")}`)
    .join("");

  const digest = crypto
    .createHmac("sha256", env.SHOPIFY_API_SECRET())
    .update(message)
    .digest("hex");

  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

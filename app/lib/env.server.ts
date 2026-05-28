function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  RESEND_API_KEY: () => required("RESEND_API_KEY"),
  RESEND_FROM: () => required("RESEND_FROM"),
  RESEND_REPLY_TO: () => optional("RESEND_REPLY_TO"),
  SHOPIFY_API_SECRET: () => required("SHOPIFY_API_SECRET"),
  SHOPIFY_APP_URL: () => required("SHOPIFY_APP_URL"),
};

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, redirect, useActionData, useLoaderData } from "react-router";
import { verifyAppProxySignature } from "../lib/proxy.server";
import prisma from "../db.server";
import { claimReferral } from "../lib/referral.server";
import { getReferralConfig } from "../lib/feature.server";
import { parseDiscountConfig } from "../lib/discount-config";

type LoaderData = {
  shop: string;
  code: string;
  brandName: string;
  discountLabel: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (!verifyAppProxySignature(url)) {
    throw new Response("Invalid signature", { status: 401 });
  }
  const shop = url.searchParams.get("shop") ?? "";
  const code = url.searchParams.get("c") ?? url.searchParams.get("code") ?? "";
  if (!shop || !code) throw new Response("Missing shop or code", { status: 400 });

  const brand = await prisma.brand.findUnique({ where: { shop } });
  if (!brand) throw new Response("Referral program not active", { status: 404 });
  const config = await getReferralConfig(brand);
  if (!config.enabled)
    throw new Response("Referral program not active", { status: 404 });

  const referrer = await prisma.referrer.findUnique({ where: { code } });
  if (!referrer || referrer.referralConfigId !== config.id)
    throw new Response("Unknown referral code", { status: 404 });

  const refereeDiscount = parseDiscountConfig(config.refereeDiscount);
  const discountLabel =
    refereeDiscount.type === "PERCENT"
      ? `${refereeDiscount.amount}% off`
      : `$${refereeDiscount.amount.toFixed(2)} off`;

  return data<LoaderData>({
    shop,
    code,
    brandName: shop.replace(/\.myshopify\.com$/, ""),
    discountLabel,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  if (!verifyAppProxySignature(url)) {
    throw new Response("Invalid signature", { status: 401 });
  }
  const shop = url.searchParams.get("shop") ?? "";
  const form = await request.formData();
  const code = String(form.get("code") ?? "");
  const email = String(form.get("email") ?? "");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = request.headers.get("user-agent");

  const result = await claimReferral({
    shop,
    referrerCode: code,
    friendEmail: email,
    ip,
    userAgent: ua,
  });

  if (!result.ok) {
    return data({ ok: false as const, reason: result.reason, message: result.message }, { status: 400 });
  }

  return redirect(result.redirectUrl, {
    headers: {
      "Set-Cookie": `sc_ref=${encodeURIComponent(code)}; Max-Age=2592000; Path=/; Secure; SameSite=Lax`,
    },
  });
};

export default function ReferralProxyPage() {
  const view = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{`${view.discountLabel} at ${view.brandName}`}</title>
        <style>{baseCss}</style>
      </head>
      <body>
        <main className="card">
          <h1>{`Get ${view.discountLabel}`}</h1>
          <p>
            A friend invited you to shop at <strong>{view.brandName}</strong>. Drop your email
            below to reveal your one-time discount.
          </p>
          {actionData && !actionData.ok && (
            <div className="error">{actionData.message}</div>
          )}
          <form method="post">
            <input type="hidden" name="code" value={view.code} />
            <label htmlFor="email">Your email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
            <button type="submit">Reveal my discount</button>
          </form>
          <p className="fineprint">
            We&rsquo;ll email your single-use code and apply it at checkout. One per customer.
          </p>
        </main>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                fetch('/cart/update.js', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ attributes: { _referral_code: ${JSON.stringify(view.code)} } })
                }).catch(()=>{});
              } catch(_){}
            `,
          }}
        />
      </body>
    </html>
  );
}

const baseCss = `
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f6f6f6;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{background:#fff;padding:32px;border-radius:12px;max-width:420px;width:100%;box-shadow:0 6px 24px rgba(0,0,0,.06)}
  h1{margin:0 0 8px;font-size:28px}
  p{color:#555;line-height:1.5}
  label{display:block;font-size:13px;font-weight:600;margin:20px 0 6px}
  input[type=email]{width:100%;padding:12px;border:1px solid #ccc;border-radius:8px;font-size:16px}
  button{margin-top:16px;width:100%;padding:14px;background:#111;color:#fff;border:0;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer}
  button:hover{background:#000}
  .error{margin-top:12px;padding:10px 12px;background:#fde2e2;color:#7a0f0f;border-radius:8px;font-size:14px}
  .fineprint{font-size:12px;color:#888;margin-top:20px}
`;

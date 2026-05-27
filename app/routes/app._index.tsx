import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useEffect } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { getOrCreateBrand } from "../lib/referral.server";

type LoaderData = {
  brand: {
    id: string;
    shop: string;
    programActive: boolean;
    refereePercent: number;
    refererPercent: number;
    rewardExpiryDays: number;
  };
  stats: {
    total: number;
    claimed: number;
    converted: number;
  };
  recent: Array<{
    id: string;
    friendEmail: string;
    referrerEmail: string;
    status: string;
    createdAt: string;
  }>;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const brand = await getOrCreateBrand(session.shop);

  const [total, claimed, converted, recent] = await Promise.all([
    prisma.referral.count({ where: { brandId: brand.id } }),
    prisma.referral.count({ where: { brandId: brand.id, status: "CLAIMED" } }),
    prisma.referral.count({ where: { brandId: brand.id, status: "CONVERTED" } }),
    prisma.referral.findMany({
      where: { brandId: brand.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { referrer: true },
    }),
  ]);

  const data: LoaderData = {
    brand: {
      id: brand.id,
      shop: brand.shop,
      programActive: brand.programActive,
      refereePercent: brand.refereePercent,
      refererPercent: brand.refererPercent,
      rewardExpiryDays: brand.rewardExpiryDays,
    },
    stats: { total, claimed, converted },
    recent: recent.map((r) => ({
      id: r.id,
      friendEmail: r.friendEmail,
      referrerEmail: r.referrer.email,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
  };
  return data;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const brand = await getOrCreateBrand(session.shop);

  await prisma.brand.update({
    where: { id: brand.id },
    data: {
      programActive: form.get("programActive") === "on",
      refereePercent: clampInt(form.get("refereePercent"), 1, 99, brand.refereePercent),
      refererPercent: clampInt(form.get("refererPercent"), 1, 99, brand.refererPercent),
      rewardExpiryDays: clampInt(form.get("rewardExpiryDays"), 1, 365, brand.rewardExpiryDays),
    },
  });
  return { ok: true };
};

function clampInt(v: FormDataEntryValue | null, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export default function ReferralAdmin() {
  const data = useLoaderData<LoaderData>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const saving = fetcher.state === "submitting";

  useEffect(() => {
    if (fetcher.data?.ok) shopify.toast.show("Settings saved");
  }, [fetcher.data, shopify]);

  return (
    <s-page heading="Referral">
      <s-section heading="Program settings">
        <fetcher.Form method="post">
          <s-stack direction="block" gap="base">
            <s-switch
              label="Program active"
              name="programActive"
              {...(data.brand.programActive ? { checked: true } : {})}
            />
            <s-number-field
              label="Friend discount (%)"
              name="refereePercent"
              defaultValue={String(data.brand.refereePercent)}
              min={1}
              max={99}
            />
            <s-number-field
              label="Referrer reward (%)"
              name="refererPercent"
              defaultValue={String(data.brand.refererPercent)}
              min={1}
              max={99}
            />
            <s-number-field
              label="Reward expiry (days)"
              name="rewardExpiryDays"
              defaultValue={String(data.brand.rewardExpiryDays)}
              min={1}
              max={365}
            />
            <s-button type="submit" variant="primary" {...(saving ? { loading: true } : {})}>
              Save
            </s-button>
          </s-stack>
        </fetcher.Form>
      </s-section>

      <s-section heading="Stats" slot="aside">
        <s-stack direction="block" gap="base">
          <s-paragraph>Total referrals: <s-text type="strong">{data.stats.total}</s-text></s-paragraph>
          <s-paragraph>Claimed: <s-text type="strong">{data.stats.claimed}</s-text></s-paragraph>
          <s-paragraph>Converted: <s-text type="strong">{data.stats.converted}</s-text></s-paragraph>
        </s-stack>
      </s-section>

      <s-section heading="Recent referrals">
        {data.recent.length === 0 ? (
          <s-paragraph>No referrals yet.</s-paragraph>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Friend</s-table-header>
              <s-table-header>Referrer</s-table-header>
              <s-table-header>Status</s-table-header>
              <s-table-header>Created</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {data.recent.map((r) => (
                <s-table-row key={r.id}>
                  <s-table-cell>{r.friendEmail}</s-table-cell>
                  <s-table-cell>{r.referrerEmail}</s-table-cell>
                  <s-table-cell>{r.status}</s-table-cell>
                  <s-table-cell>{new Date(r.createdAt).toLocaleString()}</s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

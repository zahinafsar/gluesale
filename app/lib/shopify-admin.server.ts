import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

export type AdminClient = AdminApiContext["graphql"];

export async function findCustomerByEmail(
  graphql: AdminClient,
  email: string,
): Promise<{ id: string; numberOfOrders: number; email: string } | null> {
  const resp = await graphql(
    `#graphql
    query FindCustomer($q: String!) {
      customers(first: 1, query: $q) {
        nodes { id email numberOfOrders }
      }
    }`,
    { variables: { q: `email:${email}` } },
  );
  const json = (await resp.json()) as {
    data?: { customers?: { nodes?: Array<{ id: string; email: string; numberOfOrders: string | number }> } };
  };
  const node = json.data?.customers?.nodes?.[0];
  if (!node) return null;
  const count =
    typeof node.numberOfOrders === "string"
      ? parseInt(node.numberOfOrders, 10)
      : node.numberOfOrders;
  return { id: node.id, email: node.email, numberOfOrders: Number.isFinite(count) ? count : 0 };
}

export async function createPercentDiscountCode(
  graphql: AdminClient,
  opts: {
    title: string;
    code: string;
    percent: number;
    startsAt: Date;
    endsAt: Date;
    usageLimit?: number;
    appliesOncePerCustomer?: boolean;
    customerEmails?: string[];
  },
): Promise<{ nodeId: string }> {
  const customerSelection = opts.customerEmails?.length
    ? { customers: { add: [] as string[] } }
    : { all: true };

  const resp = await graphql(
    `#graphql
    mutation CreateBasicCode($input: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $input) {
        codeDiscountNode { id }
        userErrors { field message code }
      }
    }`,
    {
      variables: {
        input: {
          title: opts.title,
          code: opts.code,
          startsAt: opts.startsAt.toISOString(),
          endsAt: opts.endsAt.toISOString(),
          appliesOncePerCustomer: opts.appliesOncePerCustomer ?? true,
          usageLimit: opts.usageLimit ?? 1,
          customerSelection,
          customerGets: {
            value: { percentage: opts.percent / 100 },
            items: { all: true },
          },
          combinesWith: {
            orderDiscounts: false,
            productDiscounts: true,
            shippingDiscounts: true,
          },
        },
      },
    },
  );
  const json = (await resp.json()) as {
    data?: {
      discountCodeBasicCreate?: {
        codeDiscountNode?: { id: string };
        userErrors?: Array<{ field?: string[]; message: string; code?: string }>;
      };
    };
  };
  const errs = json.data?.discountCodeBasicCreate?.userErrors ?? [];
  if (errs.length) throw new Error(`Discount create failed: ${errs.map((e) => e.message).join("; ")}`);
  const id = json.data?.discountCodeBasicCreate?.codeDiscountNode?.id;
  if (!id) throw new Error("Discount create returned no id");
  return { nodeId: id };
}

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type Props = {
  shop: string;
  shareUrl: string;
  refereePercent: number;
  refererPercent: number;
};

export function ReferrerInviteEmail({
  shop,
  shareUrl,
  refereePercent,
  refererPercent,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>{`Share ${shop} and earn ${refererPercent}% off`}</Preview>
      <Body style={{ fontFamily: "Arial, sans-serif", background: "#f5f5f5", padding: 24 }}>
        <Container style={{ background: "#fff", padding: 32, borderRadius: 8, maxWidth: 480 }}>
          <Heading style={{ margin: 0 }}>Thanks for your order</Heading>
          <Text>
            Share your link with friends. They get <strong>{refereePercent}% off</strong> their
            first order. When they buy, you get <strong>{refererPercent}% off</strong> your next
            one.
          </Text>
          <Section style={{ background: "#f0f0f0", padding: 16, borderRadius: 6 }}>
            <Text style={{ fontSize: 12, margin: 0 }}>Your unique link</Text>
            <Text style={{ fontSize: 14, fontWeight: 600, margin: "8px 0", wordBreak: "break-all" as const }}>
              {shareUrl}
            </Text>
          </Section>
          <Button
            href={shareUrl}
            style={{
              display: "inline-block",
              marginTop: 16,
              background: "#111",
              color: "#fff",
              padding: "12px 20px",
              borderRadius: 6,
              textDecoration: "none",
            }}
          >
            Copy or open link
          </Button>
          <Text style={{ color: "#666", fontSize: 12, marginTop: 24 }}>
            One reward per referred customer. Friends must be new customers.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ReferrerInviteEmail;

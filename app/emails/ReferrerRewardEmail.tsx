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
  code: string;
  percent: number;
  expiresAt: Date;
};

export function ReferrerRewardEmail({ shop, code, percent, expiresAt }: Props) {
  const url = `https://${shop}/discount/${encodeURIComponent(code)}?redirect=/`;
  return (
    <Html>
      <Head />
      <Preview>{`You earned ${percent}% off at ${shop}`}</Preview>
      <Body style={{ fontFamily: "Arial, sans-serif", background: "#f5f5f5", padding: 24 }}>
        <Container style={{ background: "#fff", padding: 32, borderRadius: 8, maxWidth: 480 }}>
          <Heading style={{ margin: 0 }}>Thanks for spreading the word</Heading>
          <Text>
            Your friend just made their first purchase at <strong>{shop}</strong>. Here is your
            reward.
          </Text>
          <Section style={{ background: "#f0f0f0", padding: 16, borderRadius: 6, textAlign: "center" as const }}>
            <Text style={{ fontSize: 12, margin: 0 }}>Your reward code</Text>
            <Text style={{ fontSize: 24, fontWeight: 700, letterSpacing: 2, margin: "8px 0" }}>{code}</Text>
            <Text style={{ fontSize: 14, margin: 0 }}>{percent}% off your next order</Text>
          </Section>
          <Button
            href={url}
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
            Claim my reward
          </Button>
          <Text style={{ color: "#666", fontSize: 12, marginTop: 24 }}>
            Expires {expiresAt.toLocaleDateString()}. One-time use.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ReferrerRewardEmail;

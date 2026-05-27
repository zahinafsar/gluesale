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

export function RefereeCodeEmail({ shop, code, percent, expiresAt }: Props) {
  const url = `https://${shop}/discount/${encodeURIComponent(code)}?redirect=/`;
  return (
    <Html>
      <Head />
      <Preview>{`Your ${percent}% off code at ${shop}`}</Preview>
      <Body style={{ fontFamily: "Arial, sans-serif", background: "#f5f5f5", padding: 24 }}>
        <Container style={{ background: "#fff", padding: 32, borderRadius: 8, maxWidth: 480 }}>
          <Heading style={{ margin: 0 }}>{`${percent}% off, just for you`}</Heading>
          <Text>A friend invited you to shop at <strong>{shop}</strong>.</Text>
          <Section style={{ background: "#f0f0f0", padding: 16, borderRadius: 6, textAlign: "center" as const }}>
            <Text style={{ fontSize: 12, margin: 0 }}>Your code</Text>
            <Text style={{ fontSize: 24, fontWeight: 700, letterSpacing: 2, margin: "8px 0" }}>{code}</Text>
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
            Apply & start shopping
          </Button>
          <Text style={{ color: "#666", fontSize: 12, marginTop: 24 }}>
            Expires {expiresAt.toLocaleDateString()}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default RefereeCodeEmail;

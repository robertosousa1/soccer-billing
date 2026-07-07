import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
  name: string;
  peladaNome: string;
  loginUrl: string;
}

export function WelcomeEmail({ name, peladaNome, loginUrl }: WelcomeEmailProps) {
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>Sua senha foi cadastrada — acesse {peladaNome} agora.</Preview>
      <Body style={body}>
        <Section style={header}>
          <Text style={headerText}>⚽ Caixa da Pelada</Text>
        </Section>

        <Container style={card}>
          <Text style={greeting}>Tudo certo, {name}!</Text>

          <Text style={paragraph}>
            Sua senha foi cadastrada com sucesso. Você já pode acessar a pelada{" "}
            <strong>{peladaNome}</strong> usando o link abaixo.
          </Text>

          <Section style={loginBox}>
            <Text style={loginLabel}>Acesse agora</Text>
            <Text style={loginUrl_style}>
              <a href={loginUrl} style={link}>{loginUrl}</a>
            </Text>
          </Section>

          <Hr style={divider} />

          <Text style={footer}>
            Se você não criou esta conta, entre em contato com o organizador da pelada.
          </Text>
        </Container>

        <Text style={copyright}>© {new Date().getFullYear()} Caixa da Pelada</Text>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#f4f4f4",
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  margin: 0,
  padding: "32px 0",
};

const header: React.CSSProperties = {
  backgroundColor: "#0e6b46",
  borderRadius: "14px 14px 0 0",
  maxWidth: "600px",
  margin: "0 auto",
  padding: "20px 32px",
};

const headerText: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: "700",
  margin: 0,
  letterSpacing: "-0.3px",
};

const card: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "0 0 14px 14px",
  maxWidth: "600px",
  margin: "0 auto",
  padding: "32px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
};

const greeting: React.CSSProperties = {
  color: "#13201a",
  fontSize: "22px",
  fontWeight: "700",
  margin: "0 0 16px",
};

const paragraph: React.CSSProperties = {
  color: "#3d4d46",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 14px",
};

const loginBox: React.CSSProperties = {
  backgroundColor: "#f0f7f4",
  borderRadius: "8px",
  margin: "24px 0",
  padding: "16px 20px",
};

const loginLabel: React.CSSProperties = {
  color: "#5f6f66",
  fontSize: "11px",
  fontWeight: "600",
  letterSpacing: "0.5px",
  margin: "0 0 6px",
  textTransform: "uppercase",
};

const loginUrl_style: React.CSSProperties = {
  margin: 0,
  fontSize: "14px",
};

const link: React.CSSProperties = {
  color: "#0e6b46",
  textDecoration: "underline",
};

const divider: React.CSSProperties = {
  borderColor: "#dde4dd",
  margin: "24px 0",
};

const footer: React.CSSProperties = {
  color: "#5f6f66",
  fontSize: "13px",
  lineHeight: "1.6",
  margin: 0,
};

const copyright: React.CSSProperties = {
  color: "#9aab9f",
  fontSize: "12px",
  margin: "20px auto 0",
  maxWidth: "600px",
  textAlign: "center",
};

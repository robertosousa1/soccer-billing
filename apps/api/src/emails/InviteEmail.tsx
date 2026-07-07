import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface InviteEmailProps {
  name: string;
  peladaNome: string;
  role: string;
  inviteUrl: string;
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  READER: "Leitor",
};

export function InviteEmail({ name, peladaNome, role, inviteUrl }: InviteEmailProps) {
  const roleLabel = ROLE_LABEL[role] ?? role;

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>Você foi convidado para {peladaNome} — defina sua senha para entrar.</Preview>
      <Body style={body}>
        {/* Header */}
        <Section style={header}>
          <Text style={headerText}>⚽ Caixa da Pelada</Text>
        </Section>

        {/* Card */}
        <Container style={card}>
          <Text style={greeting}>Olá, {name}!</Text>

          <Text style={paragraph}>
            Você foi convidado para participar da pelada{" "}
            <strong>{peladaNome}</strong> como <strong>{roleLabel}</strong>.
          </Text>

          <Text style={paragraph}>
            Clique no botão abaixo para definir sua senha e ativar sua conta.
          </Text>

          <Section style={buttonWrapper}>
            <Button href={inviteUrl} style={button}>
              Definir minha senha
            </Button>
          </Section>

          <Hr style={divider} />

          <Text style={footer}>
            Este convite expira em <strong>6 horas</strong>. Se você não esperava
            este e-mail, pode ignorá-lo com segurança — nenhuma conta será criada
            sem que você clique no botão.
          </Text>
        </Container>

        {/* Footer */}
        <Text style={copyright}>© {new Date().getFullYear()} Caixa da Pelada</Text>
      </Body>
    </Html>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

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

const buttonWrapper: React.CSSProperties = {
  margin: "28px 0",
  textAlign: "center",
};

const button: React.CSSProperties = {
  backgroundColor: "#0e6b46",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: "600",
  padding: "14px 32px",
  textDecoration: "none",
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

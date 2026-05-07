/// <reference types="npm:@types/react@18.3.1" />
import * as React from "npm:react@18.3.1";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Img,
  Text,
  Hr,
  Link,
} from "npm:@react-email/components@0.0.22";

/**
 * Layout master para todos os emails transacionais do Morrinhos.Ai.
 * Header com logo + nome, footer com Ferro Labs e links.
 */
export interface MasterEmailProps {
  preview?: string;
  children: React.ReactNode;
}

export default function MasterEmail({ preview, children }: MasterEmailProps) {
  return (
    <Html>
      <Head>
        {preview && (
          <meta name="x-preview" content={preview} />
        )}
      </Head>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerStyle}>
            <table style={{ width: "100%" } as React.CSSProperties}>
              <tbody>
                <tr>
                  <td>
                    <Img
                      src="https://morrinhos.ai/icon-192.png"
                      width="44"
                      height="44"
                      alt="Morrinhos.Ai"
                      style={{ borderRadius: 8, verticalAlign: "middle" }}
                    />
                  </td>
                  <td style={{ paddingLeft: 12, verticalAlign: "middle" } as React.CSSProperties}>
                    <span style={brandText}>
                      Morrinhos<span style={brandHighlight}>.ai</span>
                    </span>
                    <p style={brandTagline}>Transparência pública de Morrinhos, GO</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Body content */}
          <Section style={bodySection}>{children}</Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footerStyle}>
            <Text style={footerLine}>
              <Link href="https://morrinhos.ai" style={footerLink}>
                morrinhos.ai
              </Link>
              {" · "}
              <Link href="https://morrinhos.ai/sobre" style={footerLink}>
                Sobre
              </Link>
              {" · "}
              <Link href="https://morrinhos.ai/contatos" style={footerLink}>
                Contatos
              </Link>
            </Text>
            <Text style={footerSmall}>
              Você está recebendo este email porque tem ou criou uma conta em
              morrinhos.ai. Se não foi você, pode ignorar.
            </Text>
            <Text style={footerOrg}>
              Ferro Labs Tecnologia LTDA · CNPJ 66.034.538/0001-25
            </Text>
            <Text style={footerNote}>
              Portal independente de transparência. Sem vínculo governamental.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = {
  backgroundColor: "#f4f4f7",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  margin: "0 auto",
  padding: "32px 0 48px",
  maxWidth: "560px",
};

const headerStyle: React.CSSProperties = {
  padding: "8px 28px 16px",
  borderRadius: "12px 12px 0 0",
  background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
};

const brandText: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 800,
  color: "#ffffff",
  letterSpacing: "-0.02em",
};

const brandHighlight: React.CSSProperties = {
  color: "#25D366",
};

const brandTagline: React.CSSProperties = {
  fontSize: "12px",
  color: "rgba(255,255,255,0.7)",
  margin: "2px 0 0 0",
};

const bodySection: React.CSSProperties = {
  padding: "32px 28px",
  backgroundColor: "#ffffff",
  borderRadius: "0 0 12px 12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const hr: React.CSSProperties = {
  borderColor: "transparent",
  margin: "24px 0 12px",
};

const footerStyle: React.CSSProperties = {
  padding: "0 28px",
  textAlign: "center" as const,
};

const footerLine: React.CSSProperties = {
  fontSize: "13px",
  color: "#71717a",
  margin: "0 0 12px 0",
};

const footerLink: React.CSSProperties = {
  color: "#1a1a2e",
  textDecoration: "none",
  fontWeight: 500,
};

const footerSmall: React.CSSProperties = {
  fontSize: "12px",
  color: "#a1a1aa",
  margin: "0 0 8px 0",
  lineHeight: "1.5",
};

const footerOrg: React.CSSProperties = {
  fontSize: "11px",
  color: "#71717a",
  margin: "16px 0 4px 0",
  fontWeight: 500,
};

const footerNote: React.CSSProperties = {
  fontSize: "10px",
  color: "#a1a1aa",
  margin: 0,
};

/** Helpers de estilo para os templates específicos. */
export const emailStyles = {
  heading: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#1a1a2e",
    margin: "0 0 16px 0",
    lineHeight: "1.25",
  } as React.CSSProperties,
  paragraph: {
    fontSize: "15px",
    lineHeight: "1.6",
    color: "#3f3f46",
    margin: "0 0 14px 0",
  } as React.CSSProperties,
  button: {
    backgroundColor: "#1a1a2e",
    color: "#ffffff",
    padding: "12px 28px",
    borderRadius: "8px",
    textDecoration: "none",
    display: "inline-block",
    fontWeight: 600,
    fontSize: "15px",
    margin: "8px 0",
  } as React.CSSProperties,
  buttonGreen: {
    backgroundColor: "#25D366",
    color: "#ffffff",
    padding: "12px 28px",
    borderRadius: "8px",
    textDecoration: "none",
    display: "inline-block",
    fontWeight: 600,
    fontSize: "15px",
    margin: "8px 0",
  } as React.CSSProperties,
  code: {
    fontSize: "32px",
    fontWeight: 800,
    color: "#1a1a2e",
    letterSpacing: "8px",
    textAlign: "center" as const,
    padding: "20px",
    backgroundColor: "#f4f4f7",
    borderRadius: "8px",
    margin: "16px 0",
  } as React.CSSProperties,
  disclaimer: {
    fontSize: "13px",
    color: "#71717a",
    lineHeight: "1.5",
    margin: "16px 0 0 0",
  } as React.CSSProperties,
  fineprint: {
    fontSize: "12px",
    color: "#a1a1aa",
    margin: "8px 0 0 0",
    wordBreak: "break-all" as const,
  } as React.CSSProperties,
};

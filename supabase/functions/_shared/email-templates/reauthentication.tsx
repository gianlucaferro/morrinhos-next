/// <reference types="npm:@types/react@18.3.1" />
import * as React from "npm:react@18.3.1";
import { Text } from "npm:@react-email/components@0.0.22";
import MasterEmail, { emailStyles } from "./_master.tsx";

interface ReauthenticationEmailProps {
  token: string;
}

export default function ReauthenticationEmail({ token }: ReauthenticationEmailProps) {
  return (
    <MasterEmail preview={`Seu código de verificação: ${token}`}>
      <Text style={emailStyles.heading}>Código de verificação</Text>
      <Text style={emailStyles.paragraph}>
        Use o código abaixo para confirmar sua identidade no Morrinhos.Ai:
      </Text>
      <Text style={emailStyles.code}>{token}</Text>
      <Text style={emailStyles.disclaimer}>
        O código é válido por alguns minutos. Se você não solicitou este código, pode
        ignorar este email.
      </Text>
    </MasterEmail>
  );
}

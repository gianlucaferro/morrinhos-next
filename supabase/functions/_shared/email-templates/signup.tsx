/// <reference types="npm:@types/react@18.3.1" />
import * as React from "npm:react@18.3.1";
import { Button, Text } from "npm:@react-email/components@0.0.22";
import MasterEmail, { emailStyles } from "./_master.tsx";

interface SignupEmailProps {
  confirmationUrl: string;
  email: string;
}

export default function SignupEmail({ confirmationUrl, email }: SignupEmailProps) {
  return (
    <MasterEmail preview={`Confirme seu email no Morrinhos.Ai (${email})`}>
      <Text style={emailStyles.heading}>Bem-vindo ao Morrinhos.Ai 👋</Text>
      <Text style={emailStyles.paragraph}>
        Obrigado por criar uma conta. Para garantir que é você, confirme o endereço{" "}
        <strong>{email}</strong> clicando no botão abaixo:
      </Text>
      <Button href={confirmationUrl} style={emailStyles.buttonGreen}>
        Confirmar meu email
      </Button>
      <Text style={emailStyles.disclaimer}>
        O link é válido por algumas horas. Se você não criou esta conta, pode ignorar
        este email — nenhuma ação será tomada.
      </Text>
      <Text style={emailStyles.fineprint}>
        Caso o botão não funcione, copie e cole no navegador:
        <br />
        {confirmationUrl}
      </Text>
    </MasterEmail>
  );
}

/// <reference types="npm:@types/react@18.3.1" />
import * as React from "npm:react@18.3.1";
import { Button, Text } from "npm:@react-email/components@0.0.22";
import MasterEmail, { emailStyles } from "./_master.tsx";

interface RecoveryEmailProps {
  confirmationUrl: string;
}

export default function RecoveryEmail({ confirmationUrl }: RecoveryEmailProps) {
  return (
    <MasterEmail preview="Redefinição de senha — Morrinhos.Ai">
      <Text style={emailStyles.heading}>Redefinir sua senha</Text>
      <Text style={emailStyles.paragraph}>
        Recebemos um pedido para redefinir a senha da sua conta no Morrinhos.Ai. Clique
        no botão abaixo para criar uma nova:
      </Text>
      <Button href={confirmationUrl} style={emailStyles.button}>
        Redefinir senha
      </Button>
      <Text style={emailStyles.disclaimer}>
        O link é válido por algumas horas. Se você não pediu para redefinir a senha, pode
        ignorar este email — sua senha atual continua válida.
      </Text>
      <Text style={emailStyles.fineprint}>
        Caso o botão não funcione, copie e cole no navegador:
        <br />
        {confirmationUrl}
      </Text>
    </MasterEmail>
  );
}

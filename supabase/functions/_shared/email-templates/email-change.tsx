/// <reference types="npm:@types/react@18.3.1" />
import * as React from "npm:react@18.3.1";
import { Button, Text } from "npm:@react-email/components@0.0.22";
import MasterEmail, { emailStyles } from "./_master.tsx";

interface EmailChangeEmailProps {
  confirmationUrl: string;
  newEmail: string;
}

export default function EmailChangeEmail({
  confirmationUrl,
  newEmail,
}: EmailChangeEmailProps) {
  return (
    <MasterEmail preview={`Confirme a alteração de email para ${newEmail}`}>
      <Text style={emailStyles.heading}>Confirmar novo email</Text>
      <Text style={emailStyles.paragraph}>
        Recebemos um pedido para alterar o email da sua conta no Morrinhos.Ai para{" "}
        <strong>{newEmail}</strong>. Para confirmar, clique no botão abaixo:
      </Text>
      <Button href={confirmationUrl} style={emailStyles.button}>
        Confirmar novo email
      </Button>
      <Text style={emailStyles.disclaimer}>
        Se você não solicitou esta mudança, ignore este email — o email atual continua
        ativo.
      </Text>
      <Text style={emailStyles.fineprint}>
        Caso o botão não funcione, copie e cole no navegador:
        <br />
        {confirmationUrl}
      </Text>
    </MasterEmail>
  );
}

/// <reference types="npm:@types/react@18.3.1" />
import * as React from "npm:react@18.3.1";
import { Button, Text } from "npm:@react-email/components@0.0.22";
import MasterEmail, { emailStyles } from "./_master.tsx";

interface InviteEmailProps {
  confirmationUrl: string;
}

export default function InviteEmail({ confirmationUrl }: InviteEmailProps) {
  return (
    <MasterEmail preview="Você foi convidado para o Morrinhos.Ai">
      <Text style={emailStyles.heading}>Você foi convidado 🎉</Text>
      <Text style={emailStyles.paragraph}>
        Aceite o convite para criar sua conta no Morrinhos.Ai e começar a explorar
        dados públicos da nossa cidade.
      </Text>
      <Button href={confirmationUrl} style={emailStyles.buttonGreen}>
        Aceitar convite
      </Button>
      <Text style={emailStyles.disclaimer}>
        O link é válido por algumas horas. Se você não esperava este convite, pode
        ignorar este email.
      </Text>
      <Text style={emailStyles.fineprint}>
        Caso o botão não funcione, copie e cole no navegador:
        <br />
        {confirmationUrl}
      </Text>
    </MasterEmail>
  );
}

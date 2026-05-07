/// <reference types="npm:@types/react@18.3.1" />
import * as React from "npm:react@18.3.1";
import { Button, Text } from "npm:@react-email/components@0.0.22";
import MasterEmail, { emailStyles } from "./_master.tsx";

interface MagicLinkEmailProps {
  confirmationUrl: string;
}

export default function MagicLinkEmail({ confirmationUrl }: MagicLinkEmailProps) {
  return (
    <MasterEmail preview="Seu link de acesso para o Morrinhos.Ai">
      <Text style={emailStyles.heading}>Entrar no Morrinhos.Ai</Text>
      <Text style={emailStyles.paragraph}>
        Use o botão abaixo para acessar sua conta sem senha. O link é único e válido por
        alguns minutos.
      </Text>
      <Button href={confirmationUrl} style={emailStyles.buttonGreen}>
        Entrar agora
      </Button>
      <Text style={emailStyles.disclaimer}>
        Se você não solicitou este acesso, pode ignorar este email com segurança.
      </Text>
      <Text style={emailStyles.fineprint}>
        Caso o botão não funcione, copie e cole no navegador:
        <br />
        {confirmationUrl}
      </Text>
    </MasterEmail>
  );
}

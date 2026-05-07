import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import * as React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";

import SignupEmail from "../_shared/email-templates/signup.tsx";
import RecoveryEmail from "../_shared/email-templates/recovery.tsx";
import MagicLinkEmail from "../_shared/email-templates/magic-link.tsx";
import InviteEmail from "../_shared/email-templates/invite.tsx";
import EmailChangeEmail from "../_shared/email-templates/email-change.tsx";
import ReauthenticationEmail from "../_shared/email-templates/reauthentication.tsx";

// `from` precisa ser endereço de domínio verificado no Resend.
// Domínio morrinhos.ai verificado em mai/2026. Override via secret EMAIL_FROM.
const DEFAULT_FROM = "Morrinhos.AI <contato@morrinhos.ai>";

interface EmailData {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type:
    | "signup"
    | "recovery"
    | "magiclink"
    | "invite"
    | "email_change"
    | "email_change_new"
    | "reauthentication";
  site_url: string;
  token_new: string;
  token_hash_new: string;
}

interface User {
  email: string;
  new_email?: string;
}

function buildConfirmationUrl(
  siteUrl: string,
  tokenHash: string,
  type: string,
  redirectTo: string,
): string {
  const params = new URLSearchParams({ token: tokenHash, type, redirect_to: redirectTo });
  return `${siteUrl}/auth/v1/verify?${params.toString()}`;
}

interface TemplateConfig {
  subject: string;
  render: (user: User, data: EmailData) => React.ReactElement;
}

const TEMPLATES: Record<string, TemplateConfig> = {
  signup: {
    subject: "Confirme seu email — Morrinhos.Ai",
    render: (user, d) =>
      React.createElement(SignupEmail, {
        confirmationUrl: buildConfirmationUrl(d.site_url, d.token_hash, d.email_action_type, d.redirect_to),
        email: user.email,
      }),
  },
  recovery: {
    subject: "Redefinir senha — Morrinhos.Ai",
    render: (_user, d) =>
      React.createElement(RecoveryEmail, {
        confirmationUrl: buildConfirmationUrl(d.site_url, d.token_hash, d.email_action_type, d.redirect_to),
      }),
  },
  magiclink: {
    subject: "Link de acesso — Morrinhos.Ai",
    render: (_user, d) =>
      React.createElement(MagicLinkEmail, {
        confirmationUrl: buildConfirmationUrl(d.site_url, d.token_hash, d.email_action_type, d.redirect_to),
      }),
  },
  invite: {
    subject: "Convite — Morrinhos.Ai",
    render: (_user, d) =>
      React.createElement(InviteEmail, {
        confirmationUrl: buildConfirmationUrl(d.site_url, d.token_hash, d.email_action_type, d.redirect_to),
      }),
  },
  email_change: {
    subject: "Confirmar alteração de email — Morrinhos.Ai",
    render: (user, d) =>
      React.createElement(EmailChangeEmail, {
        confirmationUrl: buildConfirmationUrl(d.site_url, d.token_hash_new || d.token_hash, d.email_action_type, d.redirect_to),
        newEmail: user.new_email ?? "",
      }),
  },
  reauthentication: {
    subject: "Código de verificação — Morrinhos.Ai",
    render: (_user, d) =>
      React.createElement(ReauthenticationEmail, { token: d.token }),
  },
};

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("not allowed", { status: 405 });
  }

  const hookSecretRaw = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const emailFrom = Deno.env.get("EMAIL_FROM") ?? DEFAULT_FROM;

  if (!hookSecretRaw) {
    return new Response(JSON.stringify({ error: "SEND_EMAIL_HOOK_SECRET não configurada" }), { status: 500 });
  }
  if (!resendKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY não configurada" }), { status: 500 });
  }

  const hookSecret = hookSecretRaw.replace("v1,whsec_", "");
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let user: User;
  let emailData: EmailData;
  try {
    const verified = new Webhook(hookSecret).verify(payload, headers) as { user: User; email_data: EmailData };
    user = verified.user;
    emailData = verified.email_data;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(JSON.stringify({ error: { message: "invalid signature" } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const template = TEMPLATES[emailData.email_action_type];
  if (!template) {
    console.warn(`Unknown email type: ${emailData.email_action_type}`);
    return new Response(JSON.stringify({ error: `Unknown email type: ${emailData.email_action_type}` }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const recipient = emailData.email_action_type === "email_change" && user.new_email ? user.new_email : user.email;

  try {
    const html = await renderAsync(template.render(user, emailData));

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [recipient],
        subject: template.subject,
        html,
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error("Resend error:", resp.status, errBody);
      return new Response(JSON.stringify({ error: { message: "email_send_failed", details: errBody } }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("auth-email-hook render/send error:", err);
    return new Response(JSON.stringify({ error: { message: "internal_error" } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

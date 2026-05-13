export type SetupReadyEmailInput = {
  to: string;
  firstName?: string | null;
  requestedAt?: string | null;
  userId: string;
};

export type SetupReadyEmailResult =
  | { status: "sent"; id: string }
  | { status: "not_configured"; reason: string };

const resendEndpoint = "https://api.resend.com/emails";

function isSetupReadyEmailEnabled() {
  return process.env.SETUP_READY_EMAILS_ENABLED === "true";
}

function getSender() {
  return process.env.RESEND_FROM_EMAIL || process.env.SETUP_READY_EMAIL_FROM || "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildMessage({ firstName }: Pick<SetupReadyEmailInput, "firstName">) {
  const name = firstName?.trim() ? ` ${firstName.trim()}` : "";
  const greeting = `Hi${name},`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.cerisescholar.com";

  const text = `${greeting}

Cerise Scholar is ready on your laptop.

Your local setup check passed, so AI-heavy research features can now use the Cerise Scholar Local Agent and Ollama on this trusted laptop.

Open Cerise Scholar: ${appUrl}/dashboard

A small reminder: keep using a personal or trusted laptop for the full local AI workflow. Mobile sign-in remains best for lighter review.

Cerise Scholar`;

  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #1a1208; line-height: 1.6;">
      <p>${escapeHtml(greeting)}</p>
      <h1 style="font-size: 28px; font-weight: 400; margin: 0 0 16px;">Cerise Scholar is ready on your laptop.</h1>
      <p>Your local setup check passed, so AI-heavy research features can now use the Cerise Scholar Local Agent and Ollama on this trusted laptop.</p>
      <p>
        <a href="${escapeHtml(appUrl)}/dashboard" style="display: inline-block; background: #1a1208; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-family: Arial, sans-serif; font-weight: 700;">
          Open Cerise Scholar
        </a>
      </p>
      <p style="color: #6f6255;">A small reminder: keep using a personal or trusted laptop for the full local AI workflow. Mobile sign-in remains best for lighter review.</p>
      <p>Cerise Scholar</p>
    </div>`;

  return {
    subject: "Cerise Scholar is ready on your laptop",
    text,
    html,
  };
}

export async function sendSetupReadyEmail(input: SetupReadyEmailInput): Promise<SetupReadyEmailResult> {
  const apiKey = process.env.RESEND_API_KEY || "";
  const from = getSender();

  if (!isSetupReadyEmailEnabled()) {
    return { status: "not_configured", reason: "SETUP_READY_EMAILS_ENABLED is not true." };
  }

  if (!apiKey || !from) {
    return { status: "not_configured", reason: "RESEND_API_KEY and RESEND_FROM_EMAIL are required." };
  }

  const message = buildMessage(input);
  const idempotencyKey = `cerise-setup-ready-${input.userId}-${input.requestedAt || "unknown"}`.slice(0, 240);
  const response = await fetch(resendEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
      "User-Agent": "CeriseScholar/1.0 setup-ready-email",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: [
        { name: "product", value: "cerise_scholar" },
        { name: "kind", value: "local_setup_ready" },
      ],
    }),
  });

  const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string; error?: string };

  if (!response.ok) {
    throw new Error(data.message || data.error || `Email provider returned ${response.status}.`);
  }

  return { status: "sent", id: data.id || "unknown" };
}

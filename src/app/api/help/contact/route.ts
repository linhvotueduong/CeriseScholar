import { NextResponse } from "next/server";

export const runtime = "nodejs";

const resendEndpoint = "https://api.resend.com/emails";
const supportEmail = "cerisescholar@gmail.com";
const requestLabels: Record<string, string> = {
  bug: "Bug report",
  feature: "Feature request",
  help: "Help request",
  improvement: "Improvement suggestion",
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function buildMailto({
  area,
  context,
  email,
  message,
  name,
  pageUrl,
  requestType,
  subject,
}: {
  area: string;
  context: string;
  email: string;
  message: string;
  name: string;
  pageUrl: string;
  requestType: string;
  subject: string;
}) {
  const label = requestLabels[requestType] || "Help request";
  const body = [
    `Request type: ${label}`,
    area ? `Page or feature: ${area}` : "",
    context ? `Device/context: ${context}` : "",
    `Name: ${name || "Not provided"}`,
    `Reply email: ${email}`,
    pageUrl ? `Page: ${pageUrl}` : "",
    "",
    message,
  ]
    .filter(Boolean)
    .join("\n");

  return `mailto:${supportEmail}?subject=${encodeURIComponent(`[Cerise Scholar] ${subject}`)}&body=${encodeURIComponent(body)}`;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!payload) {
    return NextResponse.json({ ok: false, error: "Send a valid help request." }, { status: 400 });
  }

  if (readString(payload.website)) {
    return NextResponse.json({ ok: true, status: "received" });
  }

  const area = truncate(readString(payload.area), 120);
  const context = truncate(readString(payload.context), 120);
  const email = truncate(readString(payload.email), 240);
  const message = truncate(readString(payload.message), 4000);
  const name = truncate(readString(payload.name), 120);
  const pageUrl = truncate(readString(payload.pageUrl), 500);
  const rawRequestType = readString(payload.requestType);
  const requestType = requestLabels[rawRequestType] ? rawRequestType : "help";
  const subject = truncate(readString(payload.subject), 120);

  if (!email || !isValidEmail(email) || !subject || !message) {
    return NextResponse.json(
      { ok: false, error: "Add a valid email, subject, and message before sending." },
      { status: 400 }
    );
  }

  const mailto = buildMailto({ area, context, email, message, name, pageUrl, requestType, subject });
  const apiKey = process.env.RESEND_API_KEY || "";
  const from = process.env.RESEND_FROM_EMAIL || "";
  const to = process.env.HELP_CONTACT_TO_EMAIL || supportEmail;

  if (!apiKey || !from) {
    return NextResponse.json(
      {
        ok: false,
        status: "email_not_configured",
        error: "Help email delivery is not connected in this environment yet.",
        mailto,
      },
      { status: 503 }
    );
  }

  const label = requestLabels[requestType];
  const text = `Cerise Scholar help contact

Type: ${label}
Subject: ${subject}
Page or feature: ${area || "Not provided"}
Device/context: ${context || "Not provided"}
Name: ${name || "Not provided"}
Reply email: ${email}
Page: ${pageUrl || "Not provided"}

Message:
${message}`;

  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #1a1208; line-height: 1.6;">
      <p style="text-transform: uppercase; letter-spacing: 0.18em; color: #c0392b; font-size: 12px;">${escapeHtml(label)}</p>
      <h1 style="font-size: 26px; font-weight: 400;">${escapeHtml(subject)}</h1>
      <p><strong>Page or feature:</strong> ${escapeHtml(area || "Not provided")}</p>
      <p><strong>Device/context:</strong> ${escapeHtml(context || "Not provided")}</p>
      <p><strong>Name:</strong> ${escapeHtml(name || "Not provided")}</p>
      <p><strong>Reply email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Page:</strong> ${escapeHtml(pageUrl || "Not provided")}</p>
      <hr style="border: 0; border-top: 1px solid #e0d8d0; margin: 20px 0;" />
      <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
    </div>`;

  try {
    const response = await fetch(resendEndpoint, {
      body: JSON.stringify({
        from,
        html,
        reply_to: email,
        subject: `[Cerise Scholar] ${label}: ${subject}`,
        tags: [
          { name: "product", value: "cerise_scholar" },
          { name: "kind", value: "help_contact" },
        ],
        text,
        to: [to],
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "CeriseScholar/1.0 help-contact",
      },
      method: "POST",
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; id?: string; message?: string };

    if (!response.ok) {
      throw new Error(data.message || data.error || `Email provider returned ${response.status}.`);
    }

    return NextResponse.json({ id: data.id || "unknown", ok: true, status: "sent" });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "send_failed",
        error: "Cerise Scholar could not send that request yet.",
        mailto,
      },
      { status: 502 }
    );
  }
}

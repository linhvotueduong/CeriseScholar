import { NextResponse } from "next/server";
import { sendSetupReadyEmail } from "@/lib/email/setupReady";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STATUS_SENT = "sent";
const STATUS_PROVIDER_NOT_CONFIGURED = "provider_not_configured";
const STATUS_FAILED = "send_failed";

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function truncateError(value: unknown) {
  const message = value instanceof Error ? value.message : "Setup-ready email failed.";
  return message.slice(0, 240);
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return NextResponse.json(
      {
        ok: false,
        status: "unauthorized",
        error: "Sign in before asking Cerise Scholar to send setup-ready email.",
      },
      { status: 401 }
    );
  }

  const metadata = user.user_metadata || {};
  const requestedAt = readString(metadata.local_setup_email_when_ready_requested_at);
  const previousStatus = readString(metadata.local_setup_email_when_ready_status);

  if (!requestedAt) {
    return NextResponse.json(
      {
        ok: false,
        status: "no_request",
        error: "Save a setup-ready email request before sending a notification.",
      },
      { status: 400 }
    );
  }

  if (previousStatus === STATUS_SENT) {
    return NextResponse.json({ ok: true, status: "already_sent" });
  }

  const now = new Date().toISOString();
  const firstName =
    readString(metadata.first_name) ||
    readString(metadata.given_name) ||
    readString(metadata.name).split(" ")[0] ||
    null;

  try {
    const result = await sendSetupReadyEmail({
      to: user.email,
      firstName,
      requestedAt,
      userId: user.id,
    });

    if (result.status === "not_configured") {
      await supabase.auth.updateUser({
        data: {
          ...metadata,
          local_setup_email_when_ready_status: STATUS_PROVIDER_NOT_CONFIGURED,
          local_setup_email_when_ready_provider: "resend",
          local_setup_email_when_ready_last_checked_at: now,
        },
      });

      return NextResponse.json({
        ok: true,
        status: "not_configured",
        reason: result.reason,
      });
    }

    await supabase.auth.updateUser({
      data: {
        ...metadata,
        local_setup_email_when_ready_status: STATUS_SENT,
        local_setup_email_when_ready_provider: "resend",
        local_setup_email_when_ready_message_id: result.id,
        local_setup_email_when_ready_sent_at: now,
      },
    });

    return NextResponse.json({
      ok: true,
      status: STATUS_SENT,
      sentAt: now,
    });
  } catch (sendError) {
    await supabase.auth.updateUser({
      data: {
        ...metadata,
        local_setup_email_when_ready_status: STATUS_FAILED,
        local_setup_email_when_ready_provider: "resend",
        local_setup_email_when_ready_last_error: truncateError(sendError),
        local_setup_email_when_ready_last_checked_at: now,
      },
    });

    return NextResponse.json(
      {
        ok: false,
        status: STATUS_FAILED,
        error: "Cerise Scholar could not send the setup-ready email yet.",
      },
      { status: 502 }
    );
  }
}

// Account deletion — POST calls the public.delete_my_account() RPC (see
// supabase/migrations/024_account_deletion.sql), which deletes the caller's
// own auth.users row. That delete cascades through every user-owned table,
// so this single call removes the account and all of its data.
//
// Auth pattern mirrors src/app/api/ai/key/route.ts: server-side Supabase
// client, requireUser() guard, no sensitive detail in client-facing errors.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MIGRATION_NOT_APPLIED_MESSAGE =
  "Deletion isn't available yet — contact cerisescholar@gmail.com.";
const GENERIC_FAILURE_MESSAGE =
  "Deleting your account failed. Please try again or contact cerisescholar@gmail.com.";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function isMissingFunctionError(error: { code?: string; message?: string }) {
  const code = error.code ?? "";
  const message = error.message ?? "";
  return (
    code === "42883" || // Postgres: undefined_function
    code === "PGRST202" || // PostgREST: function not found in schema cache
    /function .*delete_my_account.* does not exist/i.test(message) ||
    /could not find the function/i.test(message)
  );
}

function isMissingStorageBucket(error: { message?: string; statusCode?: string }) {
  return error.statusCode === "404" || /bucket not found/i.test(error.message ?? "");
}

async function removeUserStorageFolder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: "avatars" | "pdfs",
  userId: string,
) {
  while (true) {
    const { data: objects, error: listError } = await supabase.storage
      .from(bucket)
      .list(userId, { limit: 100, offset: 0 });

    if (listError) {
      if (isMissingStorageBucket(listError)) return null;
      return listError.message;
    }

    // Remove every object returned for the user's folder, including any
    // placeholder object, because an owned Storage object can block deleting
    // the associated auth user.
    const paths = (objects ?? []).map((object) => `${userId}/${object.name}`);
    if (paths.length === 0) return null;

    const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
    if (removeError) return removeError.message;

    // Deletion shifts the next batch to offset zero.
    if ((objects ?? []).length < 100) return null;
  }
}

export async function POST() {
  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Storage objects do not cascade with auth.users and can block user deletion.
    // Remove only the caller's private folders before invoking the self-delete RPC.
    for (const bucket of ["avatars", "pdfs"] as const) {
      const storageError = await removeUserStorageFolder(supabase, bucket, user.id);
      if (storageError) {
        console.error("Account storage removal failed", { bucket, userId: user.id, message: storageError });
        return NextResponse.json({ error: GENERIC_FAILURE_MESSAGE }, { status: 500 });
      }
    }

    const { error } = await supabase.rpc("delete_my_account");

    if (error) {
      if (isMissingFunctionError(error)) {
        console.error("Account deletion RPC missing", { userId: user.id, message: error.message });
        return NextResponse.json({ error: MIGRATION_NOT_APPLIED_MESSAGE }, { status: 503 });
      }

      console.error("Account deletion failed", { userId: user.id, message: error.message });
      return NextResponse.json({ error: GENERIC_FAILURE_MESSAGE }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("Account deletion error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

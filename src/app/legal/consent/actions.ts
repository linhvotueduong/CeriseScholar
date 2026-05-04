"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getRequiredLegalDocuments,
  hasRequiredLegalConsent,
  sanitizeLegalRedirect,
} from "@/lib/legal/consent";

export async function acceptLegalConsent(formData: FormData) {
  const nextPath = sanitizeLegalRedirect(formData.get("next"));
  const accepted = formData.get("accepted") === "on";

  if (!accepted) {
    redirect(`/legal/consent?next=${encodeURIComponent(nextPath)}&error=required`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const existingConsent = await hasRequiredLegalConsent(supabase, user.id);
  if (existingConsent.hasConsent) {
    redirect(nextPath);
  }

  const requiredDocuments = getRequiredLegalDocuments();
  const headerStore = await headers();
  const requiredSlugs = requiredDocuments.map((document) => document.slug);
  const { data: existingRows, error: existingError } = await supabase
    .from("user_consents")
    .select("document_slug, document_version, document_hash")
    .eq("user_id", user.id)
    .in("document_slug", requiredSlugs);

  if (existingError) {
    redirect(`/legal/consent?next=${encodeURIComponent(nextPath)}&error=save`);
  }

  const existing = new Set(
    (existingRows || []).map((record) => `${record.document_slug}:${record.document_version}:${record.document_hash}`),
  );
  const missingDocuments = requiredDocuments.filter(
    (document) => !existing.has(`${document.slug}:${document.version}:${document.content_hash}`),
  );

  const { error } = missingDocuments.length
    ? await supabase.from("user_consents").insert(
        missingDocuments.map((document) => ({
          user_id: user.id,
          document_slug: document.slug,
          document_version: document.version,
          document_hash: document.content_hash,
          user_agent: headerStore.get("user-agent") || "",
        })),
      )
    : { error: null };

  if (error && error.code !== "23505") {
    redirect(`/legal/consent?next=${encodeURIComponent(nextPath)}&error=save`);
  }

  redirect(nextPath);
}

export async function signOutFromConsent() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

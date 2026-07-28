import { NextRequest, NextResponse } from "next/server";
import {
  createExperimentRelease,
  experimentReleaseReviewComplete,
  MAX_EXPERIMENT_RELEASE_NOTES_LENGTH,
  normalizeExperimentRelease,
  verifyExperimentRelease,
  type ExperimentRelease,
} from "@/lib/research/experimentRelease";
import {
  MAX_EXPERIMENT_SPEC_BYTES,
  experimentStudioSpecSize,
  normalizeExperimentStudioDocument,
} from "@/lib/research/experimentStudio";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 800 * 1024;
const PROJECT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface ExperimentReleaseRow {
  release_id: string;
  project_id: string;
  release_number: number;
  checksum: string;
  release_notes: string;
  manifest: unknown;
  studio_spec: unknown;
  created_at: string;
}

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

function isSameSiteRequest(request: NextRequest): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

function rowToRelease(row: ExperimentReleaseRow): ExperimentRelease | null {
  return normalizeExperimentRelease({
    releaseId: row.release_id,
    projectId: row.project_id,
    releaseNumber: row.release_number,
    checksum: row.checksum,
    releaseNotes: row.release_notes,
    manifest: row.manifest,
    studio: row.studio_spec,
    createdAt: row.created_at,
  });
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId") ?? "";
  if (!PROJECT_ID_PATTERN.test(projectId)) return noStoreJson({ error: "Invalid project." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return noStoreJson({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("experiment_releases")
    .select("release_id, project_id, release_number, checksum, release_notes, manifest, studio_spec, created_at")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .order("release_number", { ascending: false })
    .limit(50);
  if (error) return noStoreJson({ error: "Release storage is not available yet." }, { status: 503 });

  const candidates = ((data ?? []) as ExperimentReleaseRow[]).map(rowToRelease);
  const checks = await Promise.all(candidates.map(async (release) => (
    release && await verifyExperimentRelease(release) ? release : null
  )));
  return noStoreJson({
    releases: checks.filter((release): release is ExperimentRelease => Boolean(release)),
    integrityFailures: checks.filter((release) => !release).length,
  });
}

export async function POST(request: NextRequest) {
  if (!isSameSiteRequest(request)) return noStoreJson({ error: "Cross-site request rejected." }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return noStoreJson({ error: "The release is too large." }, { status: 413 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return noStoreJson({ error: "Not authenticated" }, { status: 401 });
  if (!checkRateLimit(user.id, "experiment-release", 12, 60_000)) {
    return noStoreJson({ error: "Too many release attempts. Please wait a moment." }, { status: 429 });
  }

  const raw: unknown = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object") return noStoreJson({ error: "Invalid release request." }, { status: 400 });
  const body = raw as { projectId?: unknown; releaseNotes?: unknown; studio?: unknown; review?: unknown };
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  if (!PROJECT_ID_PATTERN.test(projectId)) return noStoreJson({ error: "Invalid project." }, { status: 400 });
  const releaseNotes = typeof body.releaseNotes === "string"
    ? body.releaseNotes.trim().slice(0, MAX_EXPERIMENT_RELEASE_NOTES_LENGTH)
    : "";
  const reviewRecord = body.review && typeof body.review === "object"
    ? body.review as Record<string, unknown>
    : {};
  const review = {
    draftRehearsed: reviewRecord.draftRehearsed === true,
    consentWithdrawalTested: reviewRecord.consentWithdrawalTested === true,
    conditionAndVariableReview: reviewRecord.conditionAndVariableReview === true,
    pilotDataPlanConfirmed: reviewRecord.pilotDataPlanConfirmed === true,
  };
  if (!experimentReleaseReviewComplete(review)) {
    return noStoreJson({ error: "Complete the release review checklist first." }, { status: 400 });
  }
  const studio = normalizeExperimentStudioDocument(body.studio, projectId);
  if (experimentStudioSpecSize(studio) > MAX_EXPERIMENT_SPEC_BYTES) {
    return noStoreJson({ error: "The study specification is too large." }, { status: 413 });
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (projectError || !project) return noStoreJson({ error: "Project not found." }, { status: 404 });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data: latest } = await supabase
      .from("experiment_releases")
      .select("release_number")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("release_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const releaseNumber = Math.max(1, Number(latest?.release_number ?? 0) + 1);
    let release: ExperimentRelease;
    try {
      release = await createExperimentRelease({
        releaseId: crypto.randomUUID(),
        releaseNumber,
        createdAt: new Date().toISOString(),
        releaseNotes,
        studio,
        review,
      });
    } catch (error) {
      return noStoreJson({ error: error instanceof Error ? error.message : "The release is invalid." }, { status: 400 });
    }

    const { error } = await supabase.from("experiment_releases").insert({
      release_id: release.releaseId,
      project_id: projectId,
      user_id: user.id,
      release_number: release.releaseNumber,
      checksum: release.checksum,
      release_notes: release.releaseNotes,
      manifest: release.manifest,
      studio_spec: release.studio,
      created_at: release.createdAt,
    });
    if (!error) return noStoreJson({ release }, { status: 201 });
    if (error.code !== "23505") return noStoreJson({ error: "The release could not be saved securely." }, { status: 500 });
  }
  return noStoreJson({ error: "Another release was created at the same time. Please try again." }, { status: 409 });
}

import {
  isResearchArtifactChecksum,
  sha256ArtifactChecksum,
  type ResearchArtifactChecksum,
} from "./artifactIdentity";
import type { ResearchMentorMode } from "./researchMentor";

export const RESEARCH_JOURNEY_ARCHIVE_SCHEMA_VERSION = 1 as const;
export const MAX_RESEARCH_JOURNEY_ARCHIVE_CONVERSATIONS = 200;

export type LegacyResearchJourneyIntent =
  | "general_journey"
  | "find_bridge"
  | "narrow_question"
  | "map_evidence";

export interface LegacyScholarAskMessage {
  role: "user" | "assistant";
  content: string;
  mode?: "research_answer" | "research_journey";
  [key: string]: unknown;
}

export interface LegacyScholarAskConversation {
  id: string;
  title: string;
  messages: LegacyScholarAskMessage[];
  [key: string]: unknown;
}

export interface ArchivedResearchJourneyConversation {
  id: string;
  title: string;
  messages: LegacyScholarAskMessage[];
  suggestedMentorMode: ResearchMentorMode;
  migratedAt: string;
  source: "scholarask-local-session";
  readOnly: true;
}

export interface ResearchJourneyArchive {
  schemaVersion: typeof RESEARCH_JOURNEY_ARCHIVE_SCHEMA_VERSION;
  projectId: string;
  conversations: ArchivedResearchJourneyConversation[];
  createdAt: string;
  updatedAt: string;
  readOnly: true;
  participantDataIncluded: false;
  claim: "historical-scholarask-journey-archive-not-pathway-readiness-or-current-mentor-context";
  checksum: ResearchArtifactChecksum;
}

export interface ResearchJourneyMigrationResult {
  activeConversations: LegacyScholarAskConversation[];
  archive: ResearchJourneyArchive | null;
  migratedConversationIds: string[];
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const JOURNEY_ARCHIVE_STORAGE_PREFIX = "cerise:research-journey-archive:v1";

function cleanText(value: unknown, maximum: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maximum)
    : "";
}

function token(value: unknown): string {
  const candidate = cleanText(value, 160);
  return TOKEN_PATTERN.test(candidate) ? candidate : "";
}

function isoTimestamp(value: unknown, fallback: string): string {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString()
    : new Date(fallback).toISOString();
}

function normalizeLegacyMessage(value: unknown): LegacyScholarAskMessage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.role !== "user" && candidate.role !== "assistant") return null;
  const content = typeof candidate.content === "string" ? candidate.content : "";
  const mode = candidate.mode === "research_journey" || candidate.mode === "research_answer"
    ? candidate.mode
    : undefined;
  return { ...candidate, role: candidate.role, content, ...(mode ? { mode } : {}) } as LegacyScholarAskMessage;
}

export function normalizeLegacyScholarAskConversation(value: unknown): LegacyScholarAskConversation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const id = token(candidate.id);
  if (!id || !Array.isArray(candidate.messages)) return null;
  const messages = candidate.messages.map(normalizeLegacyMessage).filter((item): item is LegacyScholarAskMessage => Boolean(item));
  return {
    ...candidate,
    id,
    title: cleanText(candidate.title, 500) || "Archived research conversation",
    messages,
  } as LegacyScholarAskConversation;
}

export function isLegacyResearchJourneyConversation(conversation: LegacyScholarAskConversation): boolean {
  return conversation.messages.some((message) => message.mode === "research_journey");
}

export function mentorModeForLegacyJourneyIntent(intent: unknown): ResearchMentorMode {
  if (intent === "find_bridge") return "find-bridge";
  if (intent === "narrow_question") return "narrow";
  if (intent === "map_evidence") return "map-evidence";
  return "reflect";
}

export function inferLegacyJourneyMentorMode(conversation: LegacyScholarAskConversation): ResearchMentorMode {
  const prompt = conversation.messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n")
    .toLocaleLowerCase();
  if (/find (?:me )?(?:a |the )?bridge|bridge for this idea/.test(prompt)) return "find-bridge";
  if (/narrow (?:my |this |the )?(?:question|idea|topic)/.test(prompt)) return "narrow";
  if (/map (?:my |this |the )?evidence|evidence map/.test(prompt)) return "map-evidence";
  return "reflect";
}

function archivePayload(archive: Omit<ResearchJourneyArchive, "checksum">) {
  return archive;
}

async function createArchive(input: {
  projectId: string;
  conversations: ArchivedResearchJourneyConversation[];
  createdAt: string;
  updatedAt: string;
}): Promise<ResearchJourneyArchive> {
  if (!token(input.projectId)) throw new Error("Research Journey archive project ID is invalid.");
  const core: Omit<ResearchJourneyArchive, "checksum"> = {
    schemaVersion: RESEARCH_JOURNEY_ARCHIVE_SCHEMA_VERSION,
    projectId: input.projectId,
    conversations: input.conversations.slice(-MAX_RESEARCH_JOURNEY_ARCHIVE_CONVERSATIONS),
    createdAt: new Date(input.createdAt).toISOString(),
    updatedAt: new Date(input.updatedAt).toISOString(),
    readOnly: true,
    participantDataIncluded: false,
    claim: "historical-scholarask-journey-archive-not-pathway-readiness-or-current-mentor-context",
  };
  return { ...core, checksum: await sha256ArtifactChecksum(archivePayload(core)) };
}

export async function verifyResearchJourneyArchive(archive: ResearchJourneyArchive): Promise<boolean> {
  const { checksum, ...core } = archive;
  return isResearchArtifactChecksum(checksum)
    && checksum === await sha256ArtifactChecksum(archivePayload(core));
}

export function researchJourneyArchiveStorageKey(projectId: string): string {
  if (!token(projectId)) throw new Error("Research Journey archive project ID is invalid.");
  return `${JOURNEY_ARCHIVE_STORAGE_PREFIX}:${projectId}`;
}

export async function readResearchJourneyArchive(
  storage: StorageLike,
  projectId: string,
): Promise<ResearchJourneyArchive | null> {
  const raw = storage.getItem(researchJourneyArchiveStorageKey(projectId));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ResearchJourneyArchive>;
    if (
      value.schemaVersion !== RESEARCH_JOURNEY_ARCHIVE_SCHEMA_VERSION
      || value.projectId !== projectId
      || value.readOnly !== true
      || value.participantDataIncluded !== false
      || value.claim !== "historical-scholarask-journey-archive-not-pathway-readiness-or-current-mentor-context"
      || !Array.isArray(value.conversations)
      || typeof value.createdAt !== "string"
      || typeof value.updatedAt !== "string"
      || typeof value.checksum !== "string"
    ) return null;
    const archiveUpdatedAt = value.updatedAt;
    const conversations = value.conversations.flatMap((item) => {
      const normalized = normalizeLegacyScholarAskConversation(item);
      if (!normalized || !item || typeof item !== "object" || Array.isArray(item)) return [];
      const candidate = item as Partial<ArchivedResearchJourneyConversation>;
      if (candidate.readOnly !== true || candidate.source !== "scholarask-local-session") return [];
      return [{
        ...normalized,
        suggestedMentorMode: mentorModeForLegacyJourneyIntent(candidate.suggestedMentorMode === "find-bridge" ? "find_bridge" : candidate.suggestedMentorMode === "map-evidence" ? "map_evidence" : candidate.suggestedMentorMode === "narrow" ? "narrow_question" : "general_journey"),
        migratedAt: isoTimestamp(candidate.migratedAt, archiveUpdatedAt),
        source: "scholarask-local-session" as const,
        readOnly: true as const,
      }];
    });
    const archive = await createArchive({ projectId, conversations, createdAt: value.createdAt, updatedAt: value.updatedAt });
    return archive.checksum === value.checksum && await verifyResearchJourneyArchive(archive) ? archive : null;
  } catch {
    return null;
  }
}

export function writeResearchJourneyArchive(storage: StorageLike, archive: ResearchJourneyArchive): void {
  storage.setItem(researchJourneyArchiveStorageKey(archive.projectId), JSON.stringify(archive));
}

export async function migrateLegacyResearchJourneyConversations(input: {
  projectId: string;
  conversations: readonly unknown[];
  existingArchive?: ResearchJourneyArchive | null;
  now?: string;
}): Promise<ResearchJourneyMigrationResult> {
  const now = isoTimestamp(input.now, new Date().toISOString());
  const normalized = input.conversations
    .map(normalizeLegacyScholarAskConversation)
    .filter((item): item is LegacyScholarAskConversation => Boolean(item));
  const journey = normalized.filter(isLegacyResearchJourneyConversation);
  const activeConversations = normalized.filter((item) => !isLegacyResearchJourneyConversation(item));
  if (!journey.length && !input.existingArchive) {
    return { activeConversations, archive: null, migratedConversationIds: [] };
  }
  const existing = new Map((input.existingArchive?.conversations ?? []).map((item) => [item.id, item]));
  for (const conversation of journey) {
    existing.set(conversation.id, {
      ...conversation,
      suggestedMentorMode: inferLegacyJourneyMentorMode(conversation),
      migratedAt: now,
      source: "scholarask-local-session",
      readOnly: true,
    });
  }
  const conversations = [...existing.values()].sort((left, right) => (
    left.migratedAt.localeCompare(right.migratedAt) || left.id.localeCompare(right.id)
  ));
  const archive = await createArchive({
    projectId: input.projectId,
    conversations,
    createdAt: input.existingArchive?.createdAt ?? now,
    updatedAt: journey.length ? now : input.existingArchive?.updatedAt ?? now,
  });
  return { activeConversations, archive, migratedConversationIds: journey.map((item) => item.id) };
}

export function exportResearchJourneyArchive(archive: ResearchJourneyArchive): string {
  return `${JSON.stringify(archive, null, 2)}\n`;
}

export function legacyJourneyMentorHref(projectId: string, mode: ResearchMentorMode): string {
  if (!token(projectId)) throw new Error("Legacy Journey destination project ID is invalid.");
  return `/dashboard/project/${encodeURIComponent(projectId)}?mentor=journey&mentorMode=${encodeURIComponent(mode)}`;
}

export function legacyResearchJourneyAdapter(input: {
  answerMode: unknown;
  journeyIntent: unknown;
  projectId: unknown;
}): { legacy: false } | { legacy: true; mentorMode: ResearchMentorMode; destination: string } {
  if (input.answerMode !== "research_journey") return { legacy: false };
  const projectId = token(input.projectId);
  const mentorMode = mentorModeForLegacyJourneyIntent(input.journeyIntent);
  return {
    legacy: true,
    mentorMode,
    destination: projectId ? legacyJourneyMentorHref(projectId, mentorMode) : "/projects",
  };
}

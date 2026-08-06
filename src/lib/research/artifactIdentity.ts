export const RESEARCH_ARTIFACT_IDENTITY_SCHEMA_VERSION = 1 as const;
export const RESEARCH_ARTIFACT_ENVELOPE_VERSION = 1 as const;

export const DEFAULT_MAX_ARTIFACT_BYTES = 1024 * 1024;
export const DEFAULT_MAX_ARTIFACT_DEPTH = 48;
export const DEFAULT_MAX_ARTIFACT_NODES = 50_000;
export const MAX_ARTIFACT_SOURCE_REFERENCES = 64;
export const MAX_ARTIFACT_KIND_LENGTH = 80;
export const MAX_ARTIFACT_ID_LENGTH = 160;

const SHA256_CHECKSUM_PATTERN = /^sha256:[a-f0-9]{64}$/;
const ARTIFACT_TOKEN_PATTERN = /^[a-z0-9][a-z0-9._:-]*$/;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type ResearchArtifactChecksum = `sha256:${string}`;

export interface CanonicalArtifactLimits {
  maximumBytes?: number;
  maximumDepth?: number;
  maximumNodes?: number;
}

export interface ResearchArtifactReference {
  artifactKind: string;
  artifactId: string;
  schemaVersion: number;
  checksum: ResearchArtifactChecksum;
}

export interface ResearchArtifactSourceFingerprint {
  schemaVersion: typeof RESEARCH_ARTIFACT_IDENTITY_SCHEMA_VERSION;
  sources: ResearchArtifactReference[];
  checksum: ResearchArtifactChecksum;
}

export interface ResearchArtifactIdentity {
  schemaVersion: typeof RESEARCH_ARTIFACT_IDENTITY_SCHEMA_VERSION;
  artifactKind: string;
  artifactId: string;
  artifactSchemaVersion: number;
  payloadChecksum: ResearchArtifactChecksum;
  sourceFingerprint: ResearchArtifactSourceFingerprint;
  checksum: ResearchArtifactChecksum;
  integrityClaim: "self-verifying-checksum-not-authenticity-approval-or-validity";
}

export interface ResearchArtifactEnvelope<T> {
  version: typeof RESEARCH_ARTIFACT_ENVELOPE_VERSION;
  identity: ResearchArtifactIdentity;
  payload: T;
}

export interface ResearchArtifactEnvelopeLoadResult<T> {
  envelope: ResearchArtifactEnvelope<T>;
  migratedFrom: "legacy-raw" | null;
}

export interface CreateResearchArtifactIdentityInput {
  artifactKind: string;
  artifactId: string;
  artifactSchemaVersion: number;
  payload: unknown;
  sources?: readonly ResearchArtifactReference[];
  limits?: CanonicalArtifactLimits;
}

export interface LoadResearchArtifactEnvelopeOptions<T> {
  artifactKind: string;
  artifactId: string;
  artifactSchemaVersion: number;
  normalizePayload: (value: unknown) => T | null;
  legacySources?: readonly ResearchArtifactReference[];
  limits?: CanonicalArtifactLimits;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function positiveBound(value: number | undefined, fallback: number): number {
  return Number.isSafeInteger(value) && (value ?? 0) > 0 ? value as number : fallback;
}

export function isResearchArtifactChecksum(value: unknown): value is ResearchArtifactChecksum {
  return typeof value === "string" && SHA256_CHECKSUM_PATTERN.test(value);
}

export function isArtifactToken(value: unknown, maximumLength: number): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= maximumLength
    && ARTIFACT_TOKEN_PATTERN.test(value);
}

/**
 * Compatibility canonicalizer used by the existing release formats.
 *
 * Keep this behavior stable: historical release checksums depend on it. New
 * untrusted artifacts should use canonicalArtifactJson(), which rejects values
 * that are not JSON and applies depth, node, and byte limits.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(",")}}`;
}

export async function sha256Checksum(value: unknown): Promise<ResearchArtifactChecksum> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}

function normalizeCanonicalJson(
  value: unknown,
  limits: Required<CanonicalArtifactLimits>,
): JsonValue {
  let nodes = 0;
  const ancestors = new WeakSet<object>();

  function visit(candidate: unknown, depth: number): JsonValue {
    nodes += 1;
    if (nodes > limits.maximumNodes) {
      throw new Error("Research artifact exceeds the canonical node limit.");
    }
    if (depth > limits.maximumDepth) {
      throw new Error("Research artifact exceeds the canonical nesting limit.");
    }
    if (candidate === null || typeof candidate === "string" || typeof candidate === "boolean") {
      return candidate;
    }
    if (typeof candidate === "number") {
      if (!Number.isFinite(candidate)) {
        throw new Error("Research artifact contains a non-finite number.");
      }
      return Object.is(candidate, -0) ? 0 : candidate;
    }
    if (typeof candidate !== "object") {
      throw new Error("Research artifact contains a value that is not valid JSON.");
    }
    if (ancestors.has(candidate)) {
      throw new Error("Research artifact contains a circular reference.");
    }

    ancestors.add(candidate);
    try {
      if (Array.isArray(candidate)) {
        return candidate.map((item) => visit(item, depth + 1));
      }
      if (!isRecord(candidate)) {
        throw new Error("Research artifact contains a non-plain object.");
      }
      const normalized: Record<string, JsonValue> = {};
      const descriptors = Object.getOwnPropertyDescriptors(candidate);
      for (const key of Object.keys(descriptors).sort()) {
        if (key.length === 0 || key.length > 256) {
          throw new Error("Research artifact contains an invalid object key.");
        }
        const descriptor = descriptors[key];
        if (!descriptor || descriptor.get || descriptor.set || !("value" in descriptor)) {
          throw new Error("Research artifact contains an accessor property.");
        }
        normalized[key] = visit(descriptor.value, depth + 1);
      }
      return normalized;
    } finally {
      ancestors.delete(candidate);
    }
  }

  return visit(value, 0);
}

function resolvedLimits(limits: CanonicalArtifactLimits = {}): Required<CanonicalArtifactLimits> {
  return {
    maximumBytes: positiveBound(limits.maximumBytes, DEFAULT_MAX_ARTIFACT_BYTES),
    maximumDepth: positiveBound(limits.maximumDepth, DEFAULT_MAX_ARTIFACT_DEPTH),
    maximumNodes: positiveBound(limits.maximumNodes, DEFAULT_MAX_ARTIFACT_NODES),
  };
}

export function canonicalArtifactJson(
  value: unknown,
  limits: CanonicalArtifactLimits = {},
): string {
  const bounded = resolvedLimits(limits);
  const canonical = canonicalJson(normalizeCanonicalJson(value, bounded));
  if (new TextEncoder().encode(canonical).byteLength > bounded.maximumBytes) {
    throw new Error("Research artifact exceeds the canonical byte limit.");
  }
  return canonical;
}

export async function sha256ArtifactChecksum(
  value: unknown,
  limits: CanonicalArtifactLimits = {},
): Promise<ResearchArtifactChecksum> {
  const bytes = new TextEncoder().encode(canonicalArtifactJson(value, limits));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}

export function normalizeResearchArtifactReference(value: unknown): ResearchArtifactReference | null {
  if (!isRecord(value)) return null;
  if (
    !isArtifactToken(value.artifactKind, MAX_ARTIFACT_KIND_LENGTH)
    || !isArtifactToken(value.artifactId, MAX_ARTIFACT_ID_LENGTH)
    || !Number.isSafeInteger(value.schemaVersion)
    || (value.schemaVersion as number) < 1
    || !isResearchArtifactChecksum(value.checksum)
  ) return null;

  return {
    artifactKind: value.artifactKind,
    artifactId: value.artifactId,
    schemaVersion: value.schemaVersion as number,
    checksum: value.checksum,
  };
}

export function normalizeResearchArtifactSourceFingerprint(
  value: unknown,
): ResearchArtifactSourceFingerprint | null {
  if (
    !isRecord(value)
    || value.schemaVersion !== RESEARCH_ARTIFACT_IDENTITY_SCHEMA_VERSION
    || !Array.isArray(value.sources)
    || value.sources.length > MAX_ARTIFACT_SOURCE_REFERENCES
    || !isResearchArtifactChecksum(value.checksum)
  ) return null;
  const sources = value.sources.map(normalizeResearchArtifactReference);
  if (sources.some((source) => source === null)) return null;
  try {
    return {
      schemaVersion: RESEARCH_ARTIFACT_IDENTITY_SCHEMA_VERSION,
      sources: normalizedSourceReferences(sources as ResearchArtifactReference[]),
      checksum: value.checksum,
    };
  } catch {
    return null;
  }
}

export async function verifyResearchArtifactSourceFingerprint(
  fingerprint: ResearchArtifactSourceFingerprint,
): Promise<boolean> {
  try {
    const expected = await createResearchArtifactSourceFingerprint(fingerprint.sources);
    return canonicalJson(fingerprint) === canonicalJson(expected);
  } catch {
    return false;
  }
}

export function normalizeResearchArtifactIdentity(value: unknown): ResearchArtifactIdentity | null {
  if (
    !isRecord(value)
    || value.schemaVersion !== RESEARCH_ARTIFACT_IDENTITY_SCHEMA_VERSION
    || !isArtifactToken(value.artifactKind, MAX_ARTIFACT_KIND_LENGTH)
    || !isArtifactToken(value.artifactId, MAX_ARTIFACT_ID_LENGTH)
    || !Number.isSafeInteger(value.artifactSchemaVersion)
    || (value.artifactSchemaVersion as number) < 1
    || !isResearchArtifactChecksum(value.payloadChecksum)
    || !isResearchArtifactChecksum(value.checksum)
    || value.integrityClaim !== "self-verifying-checksum-not-authenticity-approval-or-validity"
  ) return null;
  const sourceFingerprint = normalizeResearchArtifactSourceFingerprint(value.sourceFingerprint);
  if (!sourceFingerprint) return null;
  return {
    schemaVersion: RESEARCH_ARTIFACT_IDENTITY_SCHEMA_VERSION,
    artifactKind: value.artifactKind,
    artifactId: value.artifactId,
    artifactSchemaVersion: value.artifactSchemaVersion as number,
    payloadChecksum: value.payloadChecksum,
    sourceFingerprint,
    checksum: value.checksum,
    integrityClaim: "self-verifying-checksum-not-authenticity-approval-or-validity",
  };
}

function normalizedSourceReferences(
  sources: readonly ResearchArtifactReference[],
): ResearchArtifactReference[] {
  if (sources.length > MAX_ARTIFACT_SOURCE_REFERENCES) {
    throw new Error("Research artifact has too many source references.");
  }
  const deduplicated = new Map<string, ResearchArtifactReference>();
  for (const source of sources) {
    const normalized = normalizeResearchArtifactReference(source);
    if (!normalized) throw new Error("Research artifact has an invalid source reference.");
    const key = `${normalized.artifactKind}:${normalized.artifactId}`;
    const current = deduplicated.get(key);
    if (current && canonicalJson(current) !== canonicalJson(normalized)) {
      throw new Error("Research artifact has conflicting source references.");
    }
    deduplicated.set(key, normalized);
  }
  return [...deduplicated.values()].sort((left, right) => (
    left.artifactKind.localeCompare(right.artifactKind)
    || left.artifactId.localeCompare(right.artifactId)
  ));
}

export async function createResearchArtifactSourceFingerprint(
  sources: readonly ResearchArtifactReference[],
): Promise<ResearchArtifactSourceFingerprint> {
  const normalized = normalizedSourceReferences(sources);
  return {
    schemaVersion: RESEARCH_ARTIFACT_IDENTITY_SCHEMA_VERSION,
    sources: normalized,
    checksum: await sha256ArtifactChecksum({
      schemaVersion: RESEARCH_ARTIFACT_IDENTITY_SCHEMA_VERSION,
      sources: normalized,
    }),
  };
}

export async function createResearchArtifactIdentity(
  input: CreateResearchArtifactIdentityInput,
): Promise<ResearchArtifactIdentity> {
  if (!isArtifactToken(input.artifactKind, MAX_ARTIFACT_KIND_LENGTH)) {
    throw new Error("Research artifact kind is invalid.");
  }
  if (!isArtifactToken(input.artifactId, MAX_ARTIFACT_ID_LENGTH)) {
    throw new Error("Research artifact ID is invalid.");
  }
  if (!Number.isSafeInteger(input.artifactSchemaVersion) || input.artifactSchemaVersion < 1) {
    throw new Error("Research artifact schema version is invalid.");
  }

  const payloadChecksum = await sha256ArtifactChecksum(input.payload, input.limits);
  const sourceFingerprint = await createResearchArtifactSourceFingerprint(input.sources ?? []);
  const core = {
    schemaVersion: RESEARCH_ARTIFACT_IDENTITY_SCHEMA_VERSION,
    artifactKind: input.artifactKind,
    artifactId: input.artifactId,
    artifactSchemaVersion: input.artifactSchemaVersion,
    payloadChecksum,
    sourceFingerprint,
    integrityClaim: "self-verifying-checksum-not-authenticity-approval-or-validity" as const,
  };
  return {
    ...core,
    checksum: await sha256ArtifactChecksum(core),
  };
}

export async function verifyResearchArtifactIdentity(
  identity: ResearchArtifactIdentity,
  payload: unknown,
  limits: CanonicalArtifactLimits = {},
): Promise<boolean> {
  try {
    const expected = await createResearchArtifactIdentity({
      artifactKind: identity.artifactKind,
      artifactId: identity.artifactId,
      artifactSchemaVersion: identity.artifactSchemaVersion,
      payload,
      sources: identity.sourceFingerprint.sources,
      limits,
    });
    return canonicalJson(identity) === canonicalJson(expected);
  } catch {
    return false;
  }
}

export async function createResearchArtifactEnvelope<T>(
  input: CreateResearchArtifactIdentityInput & { payload: T },
): Promise<ResearchArtifactEnvelope<T>> {
  return {
    version: RESEARCH_ARTIFACT_ENVELOPE_VERSION,
    identity: await createResearchArtifactIdentity(input),
    payload: input.payload,
  };
}

export async function loadResearchArtifactEnvelope<T>(
  value: unknown,
  options: LoadResearchArtifactEnvelopeOptions<T>,
): Promise<ResearchArtifactEnvelopeLoadResult<T> | null> {
  try {
    canonicalArtifactJson(value, options.limits);
  } catch {
    return null;
  }
  if (isRecord(value) && value.version === RESEARCH_ARTIFACT_ENVELOPE_VERSION) {
    if (canonicalJson(Object.keys(value).sort()) !== canonicalJson(["identity", "payload", "version"])) return null;
    if (!isRecord(value.identity) || !("payload" in value)) return null;
    const identityValue = normalizeResearchArtifactIdentity(value.identity);
    if (
      !identityValue
      || identityValue.artifactKind !== options.artifactKind
      || identityValue.artifactId !== options.artifactId
      || identityValue.artifactSchemaVersion !== options.artifactSchemaVersion
    ) return null;
    try {
      if (canonicalArtifactJson(value.identity) !== canonicalArtifactJson(identityValue)) return null;
    } catch {
      return null;
    }
    if (!await verifyResearchArtifactIdentity(identityValue, value.payload, options.limits)) return null;

    const payload = options.normalizePayload(value.payload);
    if (payload === null) return null;
    try {
      if (canonicalArtifactJson(payload, options.limits) !== canonicalArtifactJson(value.payload, options.limits)) {
        return null;
      }
    } catch {
      return null;
    }
    return {
      envelope: { version: RESEARCH_ARTIFACT_ENVELOPE_VERSION, identity: identityValue, payload },
      migratedFrom: null,
    };
  }

  const payload = options.normalizePayload(value);
  if (payload === null) return null;
  try {
    return {
      envelope: await createResearchArtifactEnvelope({
        artifactKind: options.artifactKind,
        artifactId: options.artifactId,
        artifactSchemaVersion: options.artifactSchemaVersion,
        payload,
        sources: options.legacySources ?? [],
        limits: options.limits,
      }),
      migratedFrom: "legacy-raw",
    };
  } catch {
    return null;
  }
}

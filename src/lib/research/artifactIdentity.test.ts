import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalArtifactJson,
  canonicalJson,
  createResearchArtifactEnvelope,
  createResearchArtifactIdentity,
  createResearchArtifactSourceFingerprint,
  loadResearchArtifactEnvelope,
  sha256ArtifactChecksum,
  verifyResearchArtifactIdentity,
  verifyResearchArtifactSourceFingerprint,
  type ResearchArtifactReference,
} from "./artifactIdentity";
import { canonicalJson as releaseCanonicalJson } from "./experimentRelease";

const reference = async (kind: string, id: string): Promise<ResearchArtifactReference> => ({
  artifactKind: kind,
  artifactId: id,
  schemaVersion: 1,
  checksum: await sha256ArtifactChecksum({ kind, id }),
});

test("shared canonical JSON preserves the historical release checksum API", () => {
  const value = { z: [3, 2, 1], a: { y: true, x: "stable" } };
  assert.equal(canonicalJson(value), releaseCanonicalJson(value));
  assert.equal(canonicalJson({ b: 2, a: 1 }), canonicalJson({ a: 1, b: 2 }));
});

test("strict artifact canonicalization rejects non-JSON, circular, deep, and oversized values", () => {
  assert.throws(() => canonicalArtifactJson({ missing: undefined }), /not valid JSON/);
  assert.throws(() => canonicalArtifactJson({ amount: Number.NaN }), /non-finite/);
  assert.throws(() => canonicalArtifactJson(new Date()), /non-plain object/);
  const accessor = Object.defineProperty({}, "secret", { enumerable: true, get: () => "value" });
  assert.throws(() => canonicalArtifactJson(accessor), /accessor property/);

  const circular: Record<string, unknown> = {};
  circular.self = circular;
  assert.throws(() => canonicalArtifactJson(circular), /circular/);

  assert.throws(
    () => canonicalArtifactJson({ nested: { value: true } }, { maximumDepth: 1 }),
    /nesting limit/,
  );
  assert.throws(
    () => canonicalArtifactJson({ text: "x".repeat(100) }, { maximumBytes: 20 }),
    /byte limit/,
  );
});

test("artifact identity is stable across source order and fails closed after tampering", async () => {
  const design = await reference("study-design", "design-1");
  const measures = await reference("study-measures", "measures-1");
  const input = {
    artifactKind: "study-build-profile",
    artifactId: "profile-1",
    artifactSchemaVersion: 1,
    payload: { modules: ["survey"], status: "draft" },
  };
  const left = await createResearchArtifactIdentity({ ...input, sources: [design, measures] });
  const right = await createResearchArtifactIdentity({ ...input, sources: [measures, design] });

  assert.deepEqual(left, right);
  assert.match(left.checksum, /^sha256:[a-f0-9]{64}$/);
  assert.equal(left.integrityClaim, "self-verifying-checksum-not-authenticity-approval-or-validity");
  assert.equal(await verifyResearchArtifactIdentity(left, input.payload), true);
  assert.equal(await verifyResearchArtifactIdentity(left, { ...input.payload, status: "approved" }), false);
  assert.equal(await verifyResearchArtifactSourceFingerprint(left.sourceFingerprint), true);
  assert.equal(await verifyResearchArtifactSourceFingerprint({
    ...left.sourceFingerprint,
    checksum: await sha256ArtifactChecksum({ forged: true }),
  }), false);
});

test("source fingerprints reject conflicts instead of silently selecting one", async () => {
  const source = await reference("study-design", "design-1");
  await assert.rejects(
    createResearchArtifactSourceFingerprint([
      source,
      { ...source, checksum: await sha256ArtifactChecksum({ changed: true }) },
    ]),
    /conflicting source references/,
  );
});

test("artifact envelopes migrate normalized legacy payloads but reject current-envelope mutation", async () => {
  const options = {
    artifactKind: "example-artifact",
    artifactId: "example-1",
    artifactSchemaVersion: 1,
    normalizePayload: (value: unknown) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const name = "name" in value && typeof value.name === "string" ? value.name.slice(0, 30) : "";
      return name ? { schemaVersion: 1 as const, name } : null;
    },
  };
  const migrated = await loadResearchArtifactEnvelope({ name: "Legacy", ignored: true }, options);
  assert.ok(migrated);
  assert.equal(migrated.migratedFrom, "legacy-raw");
  assert.deepEqual(migrated.envelope.payload, { schemaVersion: 1, name: "Legacy" });

  const envelope = await createResearchArtifactEnvelope({
    artifactKind: options.artifactKind,
    artifactId: options.artifactId,
    artifactSchemaVersion: options.artifactSchemaVersion,
    payload: { schemaVersion: 1 as const, name: "Current" },
  });
  const loaded = await loadResearchArtifactEnvelope(envelope, options);
  assert.ok(loaded);
  assert.equal(loaded.migratedFrom, null);

  const tampered = structuredClone(envelope);
  tampered.payload.name = "Changed";
  assert.equal(await loadResearchArtifactEnvelope(tampered, options), null);

  const unknownCurrentField = structuredClone(envelope) as typeof envelope & { payload: typeof envelope.payload & { injected?: boolean } };
  unknownCurrentField.payload.injected = true;
  assert.equal(await loadResearchArtifactEnvelope(unknownCurrentField, options), null);

  const unknownIdentityField = structuredClone(envelope) as typeof envelope & { identity: typeof envelope.identity & { approval?: string } };
  unknownIdentityField.identity.approval = "approved";
  assert.equal(await loadResearchArtifactEnvelope(unknownIdentityField, options), null);

  const unknownEnvelopeField = structuredClone(envelope) as typeof envelope & { ready?: boolean };
  unknownEnvelopeField.ready = true;
  assert.equal(await loadResearchArtifactEnvelope(unknownEnvelopeField, options), null);
});

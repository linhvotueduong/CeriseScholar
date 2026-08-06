import assert from "node:assert/strict";
import test from "node:test";
import {
  buildQualitativeAnalysisExport,
  buildQualitativeCodeSourceMatrix,
  createLoadedQualitativeSource,
  createQualitativeAnalysisDocument,
  createQualitativeSegment,
  freezeQualitativeCodebook,
  markQualitativeAnalysisReviewed,
  normalizeQualitativeAnalysisDocument,
  verifyLoadedQualitativeSource,
  verifyQualitativeAnalysisExport,
  type LoadedQualitativeSource,
  type QualitativeAnalysisDocument,
} from "./qualitativeAnalysis";

const CREATED_AT = "2026-07-30T12:00:00.000Z";

async function qualitativeFixture(mode: "qualitative" | "mixed-methods" = "qualitative") {
  const loaded = await createLoadedQualitativeSource(
    "interview-01.txt",
    "Participant described feeling excluded from planning. Later they described a useful peer-led meeting.",
    [],
    CREATED_AT,
  );
  let document = createQualitativeAnalysisDocument("project-qualitative", CREATED_AT);
  const scopedDocument = normalizeQualitativeAnalysisDocument({
    ...document,
    mode,
    studyQuestion: "How do participants describe access to planning decisions?",
    inquiryApproach: "Reflexive thematic analysis with an interpretive orientation.",
    researcherPositioning: "The primary analyst documented prior program knowledge and used reflexive memos.",
    analysisProcedure: "The analyst selected meaning units, applied an evolving codebook, and reviewed negative cases.",
    integrationDesign: mode === "mixed-methods" ? "convergent" : "not-selected",
    integrationRationale: mode === "mixed-methods"
      ? "The two strands address complementary aspects of the same research question."
      : "",
    sources: [{
      ...loaded.source,
      mediaReference: "interview-01.wav",
      collectionContext: "Semi-structured interview conducted after the program.",
      consentScope: "analysis-and-anonymized-reporting",
    }],
    codes: [{
      id: "code-access",
      name: "Access to decisions",
      definition: "Statements about being included in or excluded from planning decisions.",
      inclusionCriteria: "Explicit descriptions of access, voice, or participation.",
      exclusionCriteria: "General satisfaction without a planning reference.",
      origin: "emergent",
      color: "#8b3151",
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    }],
    updatedAt: "2026-07-30T12:01:00.000Z",
  }, "project-qualitative");
  assert.ok(scopedDocument);
  document = scopedDocument;
  document = await freezeQualitativeCodebook(
    document,
    "Initial coding framework after familiarization.",
    "2026-07-30T12:02:00.000Z",
  );
  const segment = await createQualitativeSegment(
    loaded,
    0,
    54,
    [],
    "2026-07-30T12:03:00.000Z",
  );
  const analyzedDocument = normalizeQualitativeAnalysisDocument({
    ...document,
    segments: [{
      ...segment,
      codeIds: ["code-access"],
      mediaStart: "00:01:12",
      mediaEnd: "00:01:28",
      analyticNote: "The account frames exclusion as a structural feature of planning.",
      quotationUse: "direct-quote-approved",
      redactionStatus: "redacted-copy-reviewed",
      reportingExcerpt: "[Participant] described being excluded from planning.",
    }],
    memos: [{
      id: "memo-study-1",
      scope: "study",
      sourceId: "",
      segmentId: "",
      themeId: "",
      title: "Reflexive memo",
      body: "The analyst checked whether prior program knowledge overemphasized formal decision spaces.",
      createdAt: "2026-07-30T12:04:00.000Z",
      updatedAt: "2026-07-30T12:04:00.000Z",
    }],
    themes: [{
      id: "theme-access",
      title: "Access is mediated by planning structures",
      statement: "Participants described formal planning structures as limiting meaningful access to decisions.",
      boundary: "This theme addresses access to decisions, not general program satisfaction.",
      codeIds: ["code-access"],
      supportingSegmentIds: [segment.id],
      negativeCaseSegmentIds: [],
      negativeCaseReview: "A later positive account was reviewed as a boundary case and retained outside this theme.",
      createdAt: "2026-07-30T12:05:00.000Z",
      updatedAt: "2026-07-30T12:05:00.000Z",
    }],
    triangulationRecords: [{
      id: "triangulation-1",
      kind: "single-source-not-applicable",
      title: "Single-source boundary",
      sourceIds: [loaded.source.id],
      themeIds: ["theme-access"],
      convergentEvidence: "",
      contradictoryEvidence: "The transcript also contains a positive peer-led meeting account.",
      resolution: "The positive account defines the boundary of the theme rather than being treated as noise.",
      limitations: "No cross-source triangulation is possible in this one-transcript fixture.",
      reviewed: true,
    }],
    overallConclusion: "The account supports a bounded theme about formal access to planning decisions.",
    remainingLimitations: "One transcript cannot establish transferability across settings or participants.",
    quantitativeEvidence: mode === "mixed-methods" ? [{
      id: "quant-1",
      label: "Planning access score",
      sourceReference: "Phase 8.5 Results Record analysis-1",
      aggregateFinding: "The aggregate score was lower after the program than expected by the protocol team.",
      limitations: "The comparison is descriptive and does not establish a causal effect.",
      researcherVerified: true,
    }] : [],
    jointDisplays: mode === "mixed-methods" ? [{
      id: "joint-1",
      themeId: "theme-access",
      quantitativeEvidenceId: "quant-1",
      relationship: "convergence",
      integratedInterpretation: "Both strands identify constrained access to planning decisions.",
      metaInference: "The convergent strands support further examination of formal planning structures.",
      limitations: "Shared context does not make the qualitative account representative.",
      reviewed: true,
    }] : [],
    updatedAt: "2026-07-30T12:06:00.000Z",
  }, "project-qualitative");
  assert.ok(analyzedDocument);
  document = analyzedDocument;
  return { document, loaded, segmentId: segment.id };
}

test("imports bounded transcripts and verifies exact local text without persisting it", async () => {
  const loaded = await createLoadedQualitativeSource(
    "transcript.vtt",
    "WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nA local transcript.",
    [],
    CREATED_AT,
  );

  assert.equal(loaded.source.fileType, "vtt");
  assert.equal(await verifyLoadedQualitativeSource(loaded, loaded.source), true);
  assert.equal(
    await verifyLoadedQualitativeSource({ ...loaded, text: `${loaded.text} changed` }, loaded.source),
    false,
  );
  assert.equal("text" in loaded.source, false);
});

test("creates offset-and-checksum segments and deterministic code-by-source matrices", async () => {
  const { document, loaded, segmentId } = await qualitativeFixture();
  const segment = document.segments[0];
  assert.equal(segment.id, segmentId);
  assert.equal(segment.sourceId, loaded.source.id);
  assert.equal(segment.startOffset, 0);
  assert.equal(segment.endOffset, 54);
  assert.match(segment.selectedTextChecksum, /^sha256:[a-f0-9]{64}$/);

  const matrix = buildQualitativeCodeSourceMatrix(document);
  assert.equal(matrix.length, 1);
  assert.equal(matrix[0].totalSegments, 1);
  assert.equal(matrix[0].sourceCounts[0].segmentCount, 1);
});

test("versioned codebooks preserve snapshots and require a current frozen version", async () => {
  const { document } = await qualitativeFixture();
  assert.equal(document.codebookVersions.length, 1);
  assert.equal(document.codebookVersions[0].codes[0].name, "Access to decisions");

  const changed = normalizeQualitativeAnalysisDocument({
    ...document,
    codes: [{
      ...document.codes[0],
      definition: "A materially changed definition.",
      updatedAt: "2026-07-30T12:10:00.000Z",
    }],
    reviewedAt: "",
    exportedAt: "",
    lastExportChecksum: "",
    updatedAt: "2026-07-30T12:10:00.000Z",
  }, document.projectId);
  assert.ok(changed);
  assert.equal(changed.readiness.status, "needs-coding");
  assert.ok(changed.readiness.issues.some((issue) => issue.includes("Freeze a codebook")));
  assert.equal(changed.codebookVersions[0].codes[0].definition.includes("changed"), false);
});

test("direct reporting excerpts fail closed without source consent and redaction review", async () => {
  const { document } = await qualitativeFixture();
  const blocked = normalizeQualitativeAnalysisDocument({
    ...document,
    sources: [{ ...document.sources[0], consentScope: "analysis-only" }],
    segments: [{
      ...document.segments[0],
      redactionStatus: "not-reviewed",
    }],
    updatedAt: "2026-07-30T12:11:00.000Z",
  }, document.projectId);

  assert.ok(blocked);
  assert.equal(blocked.readiness.status, "needs-coding");
  assert.ok(blocked.readiness.issues.some((issue) => issue.includes("Direct quotation")));
});

test("mixed-method readiness keeps qualitative, quantitative, and integration records distinct", async () => {
  const { document } = await qualitativeFixture("mixed-methods");

  assert.equal(document.readiness.status, "needs-review");
  assert.equal(document.quantitativeEvidence.length, 1);
  assert.equal(document.jointDisplays.length, 1);
  assert.equal(document.jointDisplays[0].relationship, "convergence");
});

test("exports and independently verifies a reviewed package without raw transcript text or media", async () => {
  const { document, loaded } = await qualitativeFixture();
  const reviewed = markQualitativeAnalysisReviewed(
    document,
    "2026-07-30T12:20:00.000Z",
  );
  const built = await buildQualitativeAnalysisExport(
    reviewed,
    "2026-07-30T12:21:00.000Z",
  );
  const verified = await verifyQualitativeAnalysisExport(
    built.export,
    document.projectId,
  );
  const serialized = JSON.stringify(built.export);

  assert.equal(built.document.readiness.status, "ready");
  assert.equal(verified.boundaries.rawTranscriptTextIncluded, false);
  assert.equal(verified.boundaries.rawMediaIncluded, false);
  assert.equal(verified.boundaries.automaticInferenceUsed, false);
  assert.equal(serialized.includes(loaded.text), false);
  assert.equal(serialized.includes("\"text\":"), false);
  assert.equal(verified.analysis.segments[0].reportingExcerpt.includes("[Participant]"), true);
});

test("rejects a modified qualitative export checksum chain", async () => {
  const { document } = await qualitativeFixture();
  const reviewed = markQualitativeAnalysisReviewed(
    document,
    "2026-07-30T12:20:00.000Z",
  );
  const built = await buildQualitativeAnalysisExport(
    reviewed,
    "2026-07-30T12:21:00.000Z",
  );
  const changed = structuredClone(built.export);
  changed.package.analysis.themes[0].statement = "Changed after export.";

  await assert.rejects(
    verifyQualitativeAnalysisExport(changed, document.projectId),
    /integrity checksum has changed/,
  );
});

test("not-applicable scope requires a rationale, confirmation, and export", async () => {
  let document = createQualitativeAnalysisDocument("project-qualitative", CREATED_AT);
  document = normalizeQualitativeAnalysisDocument({
    ...document,
    mode: "not-applicable",
    notApplicableRationale: "This project uses only the frozen quantitative workflow and has no qualitative evidence.",
    updatedAt: "2026-07-30T12:01:00.000Z",
  }, document.projectId) as QualitativeAnalysisDocument;
  assert.equal(document.readiness.status, "needs-review");

  document = markQualitativeAnalysisReviewed(document, "2026-07-30T12:02:00.000Z");
  const built = await buildQualitativeAnalysisExport(document, "2026-07-30T12:03:00.000Z");
  assert.equal(built.document.readiness.status, "ready");
  assert.equal(built.export.package.mode, "not-applicable");
});

test("source text remains a separate in-memory type", async () => {
  const loaded: LoadedQualitativeSource = await createLoadedQualitativeSource(
    "field-note.md",
    "# Field note\nA bounded observation.",
    [],
    CREATED_AT,
  );
  const document = createQualitativeAnalysisDocument("project-qualitative", CREATED_AT);
  const storedCandidate = { ...document, sources: [loaded.source] };

  assert.equal(JSON.stringify(storedCandidate).includes(loaded.text), false);
});

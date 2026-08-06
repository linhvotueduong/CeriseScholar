import type { ConsentPhase5Document } from "./consentPhase5";
import {
  createConsentPhase7State,
  normalizeConsentPhase7State,
  type ConsentPhase7Artifact,
  type ConsentPhase7ArtifactKind,
  type ConsentPhase7Decision,
  type ConsentPhase7PackageId,
  type ConsentPhase7State,
} from "./consentPhase7Model";

export interface ConsentPhase7Issue {
  id: string;
  severity: "blocking" | "warning" | "advisory";
  repairTarget: "protected-audience" | "artifact" | "governance";
  packageId?: ConsentPhase7PackageId;
  artifactId?: string;
  message: string;
}

export interface ConsentPhase7PackageDefinition {
  id: ConsentPhase7PackageId;
  label: string;
  detail: string;
  authorityNote: string;
}

export const CONSENT_PHASE_7_PACKAGES: readonly ConsentPhase7PackageDefinition[] = [
  { id: "parental-permission", label: "Parent or guardian permission", detail: "A distinct adult permission artifact linked to the child-facing process.", authorityNote: "The applicable IRB or institution determines whether permission is required, waived, and whether one or two parents must provide it." },
  { id: "assent", label: "Child or adolescent assent", detail: "Developmentally appropriate affirmative agreement, dissent, and transition planning.", authorityNote: "Cerise does not infer assent capacity from age. The applicable human authority determines the groups, process, and documentation." },
  { id: "lar-surrogate", label: "LAR or surrogate consent", detail: "Capacity assessment, representative authority, participant involvement, and direct-consent transition.", authorityNote: "Representative authority is jurisdiction- and institution-dependent and cannot be inferred by the software." },
  { id: "accessible-oral", label: "Accessible oral presentation", detail: "Oral or adapted communication, comprehension, witness, indication, and copy-delivery plan.", authorityNote: "An accommodation does not remove the duty to support comprehension and document the institution-approved process." },
  { id: "translated-variant", label: "Translated consent variant", detail: "A source-bound language variant with translator provenance and qualified human review.", authorityNote: "AI assistance may create a draft only. It never establishes translation accuracy or qualified review." },
  { id: "short-form", label: "Short-form oral consent", detail: "Institution-approved short form, summary, interpreter, witness, signatures, and copies.", authorityNote: "Short-form eligibility and procedure are human determinations; a translated full form is generally preferred for anticipated enrollment." },
] as const;

export function getConsentPhase7Package(state: ConsentPhase7State, packageId: ConsentPhase7PackageId) {
  return ({
    "parental-permission": state.parentalPermission,
    assent: state.assent,
    "lar-surrogate": state.larSurrogate,
    "accessible-oral": state.accessibleOral,
    "translated-variant": state.translatedVariant,
    "short-form": state.shortForm,
  } as const)[packageId];
}

function sourcePayload(document: ConsentPhase5Document, sourceArtifactId: string | null): unknown {
  if (!sourceArtifactId) return null;
  const phase7Source = ({
    "phase7-parental-permission": document.phase7.parentalPermission,
    "phase7-assent": document.phase7.assent,
    "phase7-lar-surrogate": document.phase7.larSurrogate,
    "phase7-accessible-oral": document.phase7.accessibleOral,
    "phase7-translated-variant": document.phase7.translatedVariant,
    "phase7-short-form": document.phase7.shortForm,
    "phase7-short-form-summary": document.phase7.shortForm,
  } as Record<string, unknown>)[sourceArtifactId];
  return document.forms.find((item) => item.id === sourceArtifactId)
    ?? document.phase6.artifacts.find((item) => item.id === sourceArtifactId)
    ?? document.phase8.artifacts.find((item) => item.id === sourceArtifactId)
    ?? phase7Source
    ?? null;
}

function fnv1a64(value: string): string {
  let high = 0xcbf29ce4;
  let low = 0x84222325;
  for (let index = 0; index < value.length; index += 1) {
    low ^= value.charCodeAt(index);
    const nextLow = Math.imul(low, 0x1b3);
    const carry = (low >>> 0) * 0x1b3 / 0x100000000 >>> 0;
    high = (Math.imul(high, 0x1b3) + Math.imul(low, 0x100) + carry) >>> 0;
    low = nextLow >>> 0;
  }
  return high.toString(16).padStart(8, "0") + low.toString(16).padStart(8, "0");
}

function sourceIdentity(document: ConsentPhase5Document, sourceArtifactId: string | null): string {
  const payload = JSON.stringify(sourcePayload(document, sourceArtifactId));
  const identity = [document.sourceFingerprint.checksum, document.authorityManifest.id, document.authorityManifest.profileVersion, sourceArtifactId ?? "phase7-root", payload].join("|");
  return `source-fnv1a64:${fnv1a64(identity)}`;
}

function artifactIds(document: ConsentPhase5Document): Set<string> {
  return new Set([
    ...document.forms.map((form) => form.id),
    ...document.phase6.artifacts.map((artifact) => artifact.id),
    ...document.phase8.artifacts.map((artifact) => artifact.id),
    ...document.phase7.artifacts.map((artifact) => artifact.id),
  ]);
}

function mergeArtifact(current: ReadonlyMap<string, ConsentPhase7Artifact>, draft: Omit<ConsentPhase7Artifact, "reviewState">): ConsentPhase7Artifact {
  const existing = current.get(draft.id);
  const changed = Boolean(existing && (
    existing.kind !== draft.kind
    || existing.packageId !== draft.packageId
    || existing.title !== draft.title
    || existing.audience !== draft.audience
    || existing.language !== draft.language
    || existing.participantText !== draft.participantText
    || existing.authorityReference !== draft.authorityReference
    || existing.sourceArtifactId !== draft.sourceArtifactId
    || existing.sourceIdentity !== draft.sourceIdentity
    || existing.qualifiedReviewState !== draft.qualifiedReviewState
  ));
  return { ...draft, reviewState: changed ? "human-review-required" : existing?.reviewState ?? "human-review-required" };
}

function draft(
  document: ConsentPhase5Document,
  packageId: ConsentPhase7PackageId,
  id: string,
  kind: ConsentPhase7ArtifactKind,
  title: string,
  audience: string,
  language: string,
  participantText: string,
  authorityReference: string,
  sourceArtifactId: string | null = null,
  qualifiedReviewState: ConsentPhase7Artifact["qualifiedReviewState"] = null,
): Omit<ConsentPhase7Artifact, "reviewState"> {
  return { id, kind, packageId, title, audience, language, participantText, authorityReference, sourceArtifactId, sourceIdentity: sourceIdentity(document, sourceArtifactId), qualifiedReviewState, runtimeMode: "authoring-export-only" };
}

export function compileConsentPhase7Artifacts(document: ConsentPhase5Document, state = document.phase7): ConsentPhase7Artifact[] {
  const current = new Map(state.artifacts.map((artifact) => [artifact.id, artifact]));
  const drafts: Array<Omit<ConsentPhase7Artifact, "reviewState">> = [];
  if (state.parentalPermission.applicability === "applicable") drafts.push(draft(document, "parental-permission", "phase7-parental-permission", "parent-permission", "Parent or guardian permission", state.parentalPermission.participantGroup || "Parent or guardian", "en-US", state.parentalPermission.participantText, state.parentalPermission.permissionRuleReference || state.parentalPermission.authorityReference));
  if (state.assent.applicability === "applicable") drafts.push(draft(document, "assent", "phase7-assent", "assent", "Child or adolescent assent", state.assent.participantGroup || "Child or adolescent participant", "en-US", state.assent.participantText, state.assent.authorityReference, state.assent.linkedParentPermissionArtifactId || null));
  if (state.larSurrogate.applicability === "applicable") drafts.push(draft(document, "lar-surrogate", "phase7-lar-surrogate", "lar-or-surrogate-consent", "LAR or surrogate consent", state.larSurrogate.participantGroup || "Legally authorized representative", "en-US", state.larSurrogate.participantText, state.larSurrogate.authorityReference));
  if (state.accessibleOral.applicability === "applicable") drafts.push(draft(document, "accessible-oral", "phase7-accessible-oral", "accessible-oral-script", "Accessible oral consent presentation", state.accessibleOral.participantGroup || "Participant using an accessible presentation", "en-US", state.accessibleOral.participantText, state.accessibleOral.authorityReference));
  if (state.translatedVariant.applicability === "applicable") drafts.push(draft(document, "translated-variant", "phase7-translated-variant", "translated-variant", `Translated consent — ${state.translatedVariant.targetLanguage || "language pending"}`, state.translatedVariant.participantGroup || "Participant using a translated form", state.translatedVariant.targetLanguage, state.translatedVariant.participantText, state.translatedVariant.authorityReference, state.translatedVariant.sourceArtifactId || null, state.translatedVariant.qualifiedReviewState));
  if (state.shortForm.applicability === "applicable") {
    drafts.push(draft(document, "short-form", "phase7-short-form", "short-form", `Short-form consent — ${state.shortForm.targetLanguage || "language pending"}`, state.shortForm.participantGroup || "Participant using the short-form process", state.shortForm.targetLanguage, state.shortForm.participantText, state.shortForm.approvalReference || state.shortForm.authorityReference, state.shortForm.summaryArtifactId || null));
    drafts.push(draft(document, "short-form", "phase7-short-form-summary", "short-form-summary", "Short-form oral presentation summary", "Person providing consent, witness, and participant or representative", state.shortForm.sourceLanguage, state.shortForm.summaryText, state.shortForm.approvalReference || state.shortForm.authorityReference, state.shortForm.summaryArtifactId || null));
  }
  return drafts.map((item) => mergeArtifact(current, item));
}

export function updateConsentPhase7State(document: ConsentPhase5Document, updater: (state: ConsentPhase7State) => ConsentPhase7State, updatedAt = new Date().toISOString()): ConsentPhase5Document {
  const candidate = updater(structuredClone(document.phase7));
  const normalized = normalizeConsentPhase7State(candidate);
  if (!normalized) throw new Error("The Phase 7 protected-audience update is invalid.");
  const nextDocument = { ...document, phase7: normalized };
  normalized.artifacts = compileConsentPhase7Artifacts(nextDocument, normalized);
  return { ...nextDocument, phase7: normalized, versions: [], exports: [], updatedAt };
}

export function reviewConsentPhase7Artifact(document: ConsentPhase5Document, artifactId: string, reviewState: ConsentPhase7Artifact["reviewState"], updatedAt = new Date().toISOString()): ConsentPhase5Document {
  const artifact = document.phase7.artifacts.find((item) => item.id === artifactId);
  if (!artifact) return document;
  const safeState = artifact.kind === "translated-variant" && artifact.qualifiedReviewState !== "qualified-human-reviewed" && reviewState === "human-reviewed"
    ? "human-review-required"
    : reviewState;
  return updateConsentPhase7State(document, (state) => ({ ...state, artifacts: state.artifacts.map((item) => item.id === artifactId ? { ...item, reviewState: safeState } : item) }), updatedAt);
}

export function recordConsentPhase7QualifiedReview(document: ConsentPhase5Document, reviewerName: string, reviewerCredentials: string, updatedAt = new Date().toISOString()): ConsentPhase5Document {
  return updateConsentPhase7State(document, (state) => ({ ...state, translatedVariant: { ...state.translatedVariant, qualifiedReviewerName: reviewerName, qualifiedReviewerCredentials: reviewerCredentials, qualifiedReviewState: reviewerName.trim() && reviewerCredentials.trim() ? "qualified-human-reviewed" : "qualified-human-review-required" } }), updatedAt);
}

function missing(issues: ConsentPhase7Issue[], packageId: ConsentPhase7PackageId, key: string, value: string, message: string): void {
  if (!value.trim()) issues.push({ id: `phase7-${packageId}-${key}`, severity: "blocking", repairTarget: "protected-audience", packageId, message });
}

function checkDecision(issues: ConsentPhase7Issue[], packageId: ConsentPhase7PackageId, label: string, decision: ConsentPhase7Decision): void {
  if (decision.applicability !== "applicable") return;
  if (decision.determinationSource === "none") issues.push({ id: `phase7-${packageId}-source`, severity: "blocking", repairTarget: "protected-audience", packageId, message: `Record who determined that ${label.toLowerCase()} applies.` });
  if (!decision.authorityReference) issues.push({ id: `phase7-${packageId}-authority`, severity: "blocking", repairTarget: "protected-audience", packageId, message: `Add the institution, protocol, or researcher authority reference for ${label.toLowerCase()}.` });
  if (decision.determinationSource === "researcher" && !decision.researcherRationale) issues.push({ id: `phase7-${packageId}-rationale`, severity: "blocking", repairTarget: "protected-audience", packageId, message: `Record the researcher rationale for applying ${label.toLowerCase()}.` });
}

export function collectConsentPhase7Issues(document: ConsentPhase5Document): ConsentPhase7Issue[] {
  const state = document.phase7;
  const issues: ConsentPhase7Issue[] = [];
  const applicable = CONSENT_PHASE_7_PACKAGES.filter(({ id }) => getConsentPhase7Package(state, id).applicability === "applicable");
  if (applicable.length > 0) {
    if (state.profile.determinationSource === "none") issues.push({ id: "phase7-profile-source", severity: "blocking", repairTarget: "governance", message: "Record who determined the protected-audience authority profile." });
    missing(issues, applicable[0].id, "profile-reference", state.profile.authorityReference, "Add the applicable institutional profile, protocol, or determination reference.");
    missing(issues, applicable[0].id, "jurisdiction", state.profile.jurisdiction, "Record the jurisdiction whose participant-authority rules apply.");
    missing(issues, applicable[0].id, "local-contacts", state.profile.localContacts, "Record the local participant-rights, institutional, language, or accessibility escalation contacts.");
    if (!state.profile.runtimeBoundaryAcknowledged) issues.push({ id: "phase7-runtime-boundary", severity: "blocking", repairTarget: "governance", message: "Acknowledge that Phase 7 supports authoring, review, freeze, and export only—not runtime identity, authority, witness, or signature execution." });
  }
  for (const definition of CONSENT_PHASE_7_PACKAGES) checkDecision(issues, definition.id, definition.label, getConsentPhase7Package(state, definition.id));
  for (const packageId of state.profile.requiredPackages) {
    const configured = getConsentPhase7Package(state, packageId);
    if (configured.applicability !== "applicable") issues.push({ id: `phase7-required-${packageId}`, severity: "blocking", repairTarget: "protected-audience", packageId, message: `${CONSENT_PHASE_7_PACKAGES.find((item) => item.id === packageId)?.label} is declared required but is not configured as applicable.` });
  }
  const p = state.parentalPermission;
  if (p.applicability === "applicable") {
    missing(issues, "parental-permission", "group", p.participantGroup, "Describe the parent or guardian audience covered by this artifact.");
    if (p.permissionRule === "not-determined") issues.push({ id: "phase7-parental-permission-rule", severity: "blocking", repairTarget: "protected-audience", packageId: "parental-permission", message: "Record the human determination for waiver, one-parent, two-parent, or another institution-specific permission rule." });
    missing(issues, "parental-permission", "rule-reference", p.permissionRuleReference, "Cite the human determination for the parent-permission rule.");
    missing(issues, "parental-permission", "process", p.permissionProcess, "Describe how parent or guardian permission will be sought and documented.");
    missing(issues, "parental-permission", "privacy", p.childPrivacyPlan, "Describe how the child’s privacy and wishes are handled during the permission process.");
    missing(issues, "parental-permission", "text", p.participantText, "Draft the parent or guardian permission text.");
  }
  const a = state.assent;
  if (a.applicability === "applicable") {
    for (const [key, value, message] of [["group", a.participantGroup, "Describe the child or adolescent audience without relying on a universal age band."], ["development", a.developmentalDescription, "Describe the developmental and communication characteristics used to tailor assent."], ["capability", a.capabilityAssessmentPlan, "Describe how assent capability will be assessed by people responsible for the study."], ["process", a.assentProcess, "Describe how affirmative assent will be sought."], ["dissent", a.dissentHandling, "Describe how resistance, dissent, and withdrawal will be respected and escalated."], ["documentation", a.documentationMethod, "Describe the institution-determined assent documentation method."], ["majority-plan", a.ageOfMajorityPlan, "Describe monitoring and direct-consent transition if a participant reaches legal adulthood."], ["majority-reference", a.ageOfMajorityRuleReference, "Record the jurisdiction or institution source for the age-of-majority transition."], ["text", a.participantText, "Draft developmentally appropriate assent text."]] as const) missing(issues, "assent", key, value, message);
    if (p.applicability === "applicable" && a.linkedParentPermissionArtifactId !== "phase7-parental-permission") issues.push({ id: "phase7-assent-parent-link", severity: "blocking", repairTarget: "protected-audience", packageId: "assent", message: "Link assent to the separate parent or guardian permission artifact; do not merge the two decisions." });
  }
  const l = state.larSurrogate;
  if (l.applicability === "applicable") for (const [key, value, message] of [["group", l.participantGroup, "Describe the participant and representative group."], ["capacity", l.capacityAssessmentPlan, "Describe the human decisional-capacity assessment and documentation plan."], ["authority-basis", l.authorityBasis, "Record the applicable-law or institution-policy basis for representative authority."], ["selection", l.representativeSelectionProcess, "Describe how an authorized representative is identified and verified."], ["involvement", l.participantInvolvementPlan, "Describe how the participant remains involved to the extent possible."], ["dissent", l.dissentHandling, "Describe how objection, resistance, and dissent are handled."], ["reassessment", l.capacityReassessmentPlan, "Describe when capacity will be reassessed."], ["transition", l.directConsentTransitionPlan, "Describe direct consent when the participant regains capacity."], ["text", l.participantText, "Draft the representative-facing consent text."]] as const) missing(issues, "lar-surrogate", key, value, message);
  const o = state.accessibleOral;
  if (o.applicability === "applicable") {
    for (const [key, value, message] of [["group", o.participantGroup, "Describe the audience and accommodation context."], ["need", o.accommodationNeed, "Describe the communication or accessibility need without making a legal-capacity inference."], ["method", o.communicationMethod, "Describe the oral or adapted communication method."], ["comprehension", o.comprehensionCheck, "Describe a participant-centered comprehension check."], ["indication", o.alternativeIndicationMethod, "Describe an approved alternative way to indicate the participation decision."], ["copy", o.copyDeliveryPlan, "Describe how an accessible copy will be provided."], ["text", o.participantText, "Draft the accessible presentation script."]] as const) missing(issues, "accessible-oral", key, value, message);
    if (o.witnessDetermination === "not-determined") issues.push({ id: "phase7-accessible-oral-witness", severity: "blocking", repairTarget: "protected-audience", packageId: "accessible-oral", message: "Record the human determination about an impartial witness." });
    if (o.witnessDetermination === "required-by-human-determination") missing(issues, "accessible-oral", "witness-plan", o.witnessPlan, "Describe witness impartiality, attendance, and documentation responsibilities.");
  }
  const t = state.translatedVariant;
  if (t.applicability === "applicable") {
    for (const [key, value, message] of [["group", t.participantGroup, "Describe the language audience."], ["source", t.sourceArtifactId, "Link the translation to its source participant artifact."], ["source-language", t.sourceLanguage, "Record the source language."], ["target-language", t.targetLanguage, "Record the target language."], ["translator", t.translatorQualifications, "Record translator or translation-service qualifications and provenance."], ["text", t.participantText, "Add the translated participant-facing text."]] as const) missing(issues, "translated-variant", key, value, message);
    if (t.sourceLanguage.trim().toLowerCase() === t.targetLanguage.trim().toLowerCase()) issues.push({ id: "phase7-translation-language-same", severity: "blocking", repairTarget: "protected-audience", packageId: "translated-variant", message: "Source and target languages must be distinct." });
    if (t.translationMethod === "not-determined") issues.push({ id: "phase7-translation-method", severity: "blocking", repairTarget: "protected-audience", packageId: "translated-variant", message: "Record how the translated draft was produced." });
    if (t.qualifiedReviewState !== "qualified-human-reviewed" || !t.qualifiedReviewerName || !t.qualifiedReviewerCredentials) issues.push({ id: "phase7-translation-qualified-review", severity: "blocking", repairTarget: "protected-audience", packageId: "translated-variant", message: "A named qualified human reviewer and credentials must verify the translated variant; AI-assisted text remains a draft until then." });
  }
  const s = state.shortForm;
  if (s.applicability === "applicable") {
    for (const [key, value, message] of [["group", s.participantGroup, "Describe who will use the short-form process."], ["use-rationale", s.useRationale, "Explain why the institution-approved short-form pathway is appropriate instead of a fully translated consent form."], ["source-language", s.sourceLanguage, "Record the oral-summary source language."], ["target-language", s.targetLanguage, "Record the short-form language."], ["summary-link", s.summaryArtifactId, "Link the short form to the full oral-presentation summary."], ["interpreter", s.interpreterPlan, "Describe qualified interpreter responsibilities."], ["witness", s.witnessPlan, "Describe witness attendance, language comprehension, and signature responsibilities."], ["signatures", s.signatureResponsibilityPlan, "Describe who signs the short form and summary under the approved process."], ["copies", s.copyDeliveryPlan, "Describe which signed materials are given to the participant or representative."], ["text", s.participantText, "Add the institution-approved short-form text."], ["summary", s.summaryText, "Add the full information summary used for oral presentation."]] as const) missing(issues, "short-form", key, value, message);
    if (s.sourceLanguage.trim().toLowerCase() === s.targetLanguage.trim().toLowerCase()) issues.push({ id: "phase7-short-form-language-same", severity: "blocking", repairTarget: "protected-audience", packageId: "short-form", message: "The short-form language must differ from the oral-summary source language." });
    if (s.approvalStatus !== "approved" || !s.approvalReference) issues.push({ id: "phase7-short-form-approval", severity: "blocking", repairTarget: "governance", packageId: "short-form", message: "The short-form procedure remains blocked until applicable institutional approval and its reference are recorded." });
  }

  const knownIds = artifactIds(document);
  for (const artifact of state.artifacts) {
    if (artifact.sourceArtifactId && !knownIds.has(artifact.sourceArtifactId)) issues.push({ id: `phase7-artifact-${artifact.id}-source-missing`, severity: "blocking", repairTarget: "artifact", packageId: artifact.packageId, artifactId: artifact.id, message: `${artifact.title} points to a source artifact that is not in this consent package.` });
    if (artifact.sourceArtifactId === artifact.id) issues.push({ id: `phase7-artifact-${artifact.id}-self-source`, severity: "blocking", repairTarget: "artifact", packageId: artifact.packageId, artifactId: artifact.id, message: `${artifact.title} cannot use itself as its source artifact.` });
    if (artifact.sourceIdentity !== sourceIdentity(document, artifact.sourceArtifactId)) issues.push({ id: `phase7-artifact-${artifact.id}-source-drift`, severity: "blocking", repairTarget: "artifact", packageId: artifact.packageId, artifactId: artifact.id, message: `${artifact.title} is no longer aligned to the current source and authority version.` });
    if (artifact.kind === "translated-variant" && artifact.qualifiedReviewState !== "qualified-human-reviewed" && artifact.reviewState === "human-reviewed") issues.push({ id: `phase7-artifact-${artifact.id}-false-qualified-review`, severity: "blocking", repairTarget: "artifact", packageId: artifact.packageId, artifactId: artifact.id, message: "Ordinary artifact review cannot substitute for qualified human translation review." });
    if (artifact.reviewState !== "human-reviewed") issues.push({ id: `phase7-artifact-${artifact.id}-review`, severity: "blocking", repairTarget: "artifact", packageId: artifact.packageId, artifactId: artifact.id, message: `${artifact.title} requires explicit human review for this study.` });
    if (artifact.runtimeMode !== "authoring-export-only") issues.push({ id: `phase7-artifact-${artifact.id}-runtime`, severity: "blocking", repairTarget: "artifact", packageId: artifact.packageId, artifactId: artifact.id, message: `${artifact.title} cannot claim runtime execution support in Phase 7.` });
  }
  const order = { blocking: 0, warning: 1, advisory: 2 } as const;
  return issues.sort((left, right) => order[left.severity] - order[right.severity] || left.id.localeCompare(right.id));
}

export function phase7ParticipantPreview(document: ConsentPhase5Document, artifactId: string): string {
  const artifact = document.phase7.artifacts.find((item) => item.id === artifactId);
  return artifact ? `${artifact.title}\n\nAudience: ${artifact.audience}\n\n${artifact.participantText}` : "No Phase 7 participant artifact has been compiled.";
}

export function migrateConsentPhase7State(value: unknown): ConsentPhase7State {
  return normalizeConsentPhase7State(value) ?? createConsentPhase7State();
}

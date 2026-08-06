"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ResearchArtifactChecksum, ResearchArtifactReference } from "@/lib/research/artifactIdentity";
import type { EvidenceLibraryRow } from "@/lib/research/evidenceLibrary";
import {
  assessmentIdForEvidenceSource,
  createEvidenceAppraisalItems,
  createEvidenceLibraryReference,
  recommendedEvidenceAppraisalLens,
  type EvidenceAppraisalLensId,
  type ProposalEvidenceRoute,
} from "@/lib/research/proposalEvidencePhase3";
import {
  readProjectEvidenceAssessmentCache,
  reconcileProjectEvidenceAssessments,
  writeProjectEvidenceAssessmentCache,
  type ProjectEvidenceAssessmentCacheEntry,
  type ProjectEvidenceAssessmentConflict,
} from "@/lib/research/projectEvidenceAssessmentCache";
import {
  createProjectEvidenceAssessment,
  type EvidenceAssessmentStatus,
  type ProjectEvidenceAppraisalItem,
  type ProjectEvidenceAssessment,
} from "@/lib/research/researchProposalDocument";
import {
  fetchProjectEvidenceAssessments,
  saveProjectEvidenceAssessment,
} from "@/lib/research/researchProposalPersistence";

export interface EvidenceAssessmentEdit {
  status: EvidenceAssessmentStatus;
  decisionRationale: string;
  linkedQuestionIds: string[];
  appraisalFramework: EvidenceAppraisalLensId;
  appraisal: ProjectEvidenceAppraisalItem[];
  caveats: string[];
  researcherNotes: string;
}

interface UseProjectEvidenceAssessmentsInput {
  cloudUserId: string | null;
  onStatusChange: (status: string) => void;
  projectId: string;
  route: ProposalEvidenceRoute;
}

function replaceEntry(
  entries: readonly ProjectEvidenceAssessmentCacheEntry[],
  next: ProjectEvidenceAssessmentCacheEntry,
): ProjectEvidenceAssessmentCacheEntry[] {
  const remaining = entries.filter((entry) => entry.assessment.assessmentId !== next.assessment.assessmentId);
  return [...remaining, next].sort((left, right) => right.assessment.updatedAt.localeCompare(left.assessment.updatedAt));
}

export function useProjectEvidenceAssessments({
  cloudUserId,
  onStatusChange,
  projectId,
  route,
}: UseProjectEvidenceAssessmentsInput) {
  const [entries, setEntries] = useState<ProjectEvidenceAssessmentCacheEntry[]>([]);
  const [conflicts, setConflicts] = useState<ProjectEvidenceAssessmentConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const entriesRef = useRef<ProjectEvidenceAssessmentCacheEntry[]>([]);
  const conflictsRef = useRef<ProjectEvidenceAssessmentConflict[]>([]);
  const cloudAvailable = useRef(true);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  const commitEntries = useCallback((next: ProjectEvidenceAssessmentCacheEntry[]) => {
    entriesRef.current = next;
    setEntries(next);
    writeProjectEvidenceAssessmentCache(window.localStorage, projectId, next);
  }, [projectId]);

  const commitConflicts = useCallback((next: ProjectEvidenceAssessmentConflict[]) => {
    conflictsRef.current = next;
    setConflicts(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [cache, cloudState] = await Promise.all([
        readProjectEvidenceAssessmentCache(window.localStorage, projectId),
        cloudUserId
          ? fetchProjectEvidenceAssessments(createClient(), cloudUserId, projectId)
          : Promise.resolve({ assessments: [], available: false, reason: "not-signed-in" }),
      ]);
      if (cancelled) return;
      cloudAvailable.current = cloudState.available;
      const reconciled = reconcileProjectEvidenceAssessments({ cache, cloud: cloudState.assessments });
      commitEntries(reconciled.entries);
      commitConflicts(reconciled.conflicts);
      setLoading(false);
      if (reconciled.conflicts.length > 0) onStatusChange("Review source version conflicts before continuing");
      else if (cloudState.available) onStatusChange("Evidence review ledger loaded securely");
      else onStatusChange("Evidence review ledger available on this device");
    };
    void load().catch(() => {
      if (!cancelled) {
        setLoading(false);
        onStatusChange("Evidence review ledger could not be loaded");
      }
    });
    return () => { cancelled = true; };
  }, [cloudUserId, commitConflicts, commitEntries, onStatusChange, projectId]);

  const persistToCloud = useCallback((
    assessment: ProjectEvidenceAssessment,
    expectedCloudChecksum: ResearchArtifactChecksum | null,
  ) => {
    if (!cloudUserId || !cloudAvailable.current) {
      onStatusChange("Evidence review saved on this device");
      return;
    }
    saveQueue.current = saveQueue.current.then(async () => {
      const result = await saveProjectEvidenceAssessment(createClient(), cloudUserId, assessment, expectedCloudChecksum);
      if (result.status === "saved") {
        const current = entriesRef.current.find((entry) => entry.assessment.assessmentId === assessment.assessmentId);
        if (current?.assessment.identity.checksum === assessment.identity.checksum) {
          commitEntries(replaceEntry(entriesRef.current, {
            assessment,
            lastSyncedChecksum: result.assessment.identity.checksum,
            dirty: false,
            cachedAt: new Date().toISOString(),
          }));
        }
        onStatusChange(result.compatibilityWarnings.length ? "Review saved; artifact index sync needs retry" : "Evidence review saved securely");
        return;
      }
      if (result.status === "conflict" && result.current && result.currentStoredChecksum) {
        const existing = conflictsRef.current.filter((item) => item.assessmentId !== assessment.assessmentId);
        commitConflicts([...existing, {
          assessmentId: assessment.assessmentId,
          device: entriesRef.current.find((entry) => entry.assessment.assessmentId === assessment.assessmentId)?.assessment ?? assessment,
          cloud: result.current,
          expectedCloudChecksum: result.currentStoredChecksum,
        }]);
        onStatusChange("Review source version conflict needs a choice");
        return;
      }
      if (result.status === "unavailable" && /42P01|PGRST205|project_evidence_assessments/i.test(result.reason)) cloudAvailable.current = false;
      onStatusChange("Evidence review saved on this device");
    }).catch(() => onStatusChange("Evidence review saved on this device"));
  }, [cloudUserId, commitConflicts, commitEntries, onStatusChange]);

  const commitAssessment = useCallback((
    assessment: ProjectEvidenceAssessment,
    expectedCloudChecksum?: ResearchArtifactChecksum | null,
  ) => {
    const current = entriesRef.current.find((entry) => entry.assessment.assessmentId === assessment.assessmentId);
    const expected = expectedCloudChecksum === undefined ? current?.lastSyncedChecksum ?? null : expectedCloudChecksum;
    commitEntries(replaceEntry(entriesRef.current, {
      assessment,
      lastSyncedChecksum: expected,
      dirty: true,
      cachedAt: new Date().toISOString(),
    }));
    onStatusChange(cloudUserId ? "Saving evidence review securely…" : "Evidence review saved on this device");
    persistToCloud(assessment, expected);
  }, [cloudUserId, commitEntries, onStatusChange, persistToCloud]);

  const addSource = useCallback(async (row: EvidenceLibraryRow): Promise<ProjectEvidenceAssessment> => {
    const assessmentId = assessmentIdForEvidenceSource(row.id);
    const existing = entriesRef.current.find((entry) => entry.assessment.assessmentId === assessmentId)?.assessment;
    if (existing) return existing;
    const lensId = recommendedEvidenceAppraisalLens(route, row.doc_type);
    const sourceReference = await createEvidenceLibraryReference(row);
    const next = await createProjectEvidenceAssessment({
      projectId,
      assessmentId,
      sourceId: row.id,
      status: "awaiting-review",
      appraisalFramework: lensId,
      appraisal: createEvidenceAppraisalItems(lensId),
      sourceReference,
      now: new Date().toISOString(),
    });
    commitAssessment(next, null);
    return next;
  }, [commitAssessment, projectId, route]);

  const saveAssessment = useCallback(async (
    previous: ProjectEvidenceAssessment,
    edit: EvidenceAssessmentEdit,
    sourceRow?: EvidenceLibraryRow,
  ): Promise<ProjectEvidenceAssessment> => {
    const sourceReference: ResearchArtifactReference = sourceRow
      ? await createEvidenceLibraryReference(sourceRow)
      : previous.identity.sourceFingerprint.sources[0];
    const finalDecision = edit.status === "included" || edit.status === "excluded";
    const next = await createProjectEvidenceAssessment({
      projectId,
      assessmentId: previous.assessmentId,
      sourceId: previous.sourceId,
      previous,
      status: edit.status,
      decisionRationale: edit.decisionRationale,
      linkedQuestionIds: edit.linkedQuestionIds,
      linkedClaimIds: previous.linkedClaimIds,
      appraisalFramework: edit.appraisalFramework,
      appraisal: edit.appraisal,
      caveats: edit.caveats,
      researcherNotes: edit.researcherNotes,
      reviewedAt: finalDecision ? new Date().toISOString() : null,
      sourceReference,
      now: new Date().toISOString(),
    });
    commitAssessment(next);
    return next;
  }, [commitAssessment, projectId]);

  const useSecureVersion = useCallback((assessmentId: string) => {
    const conflict = conflictsRef.current.find((item) => item.assessmentId === assessmentId);
    if (!conflict) return;
    commitEntries(replaceEntry(entriesRef.current, {
      assessment: conflict.cloud,
      lastSyncedChecksum: conflict.expectedCloudChecksum,
      dirty: false,
      cachedAt: new Date().toISOString(),
    }));
    commitConflicts(conflictsRef.current.filter((item) => item.assessmentId !== assessmentId));
    onStatusChange("Secure source review version selected");
  }, [commitConflicts, commitEntries, onStatusChange]);

  const useDeviceVersion = useCallback((assessmentId: string) => {
    const conflict = conflictsRef.current.find((item) => item.assessmentId === assessmentId);
    if (!conflict) return;
    commitConflicts(conflictsRef.current.filter((item) => item.assessmentId !== assessmentId));
    commitAssessment(conflict.device, conflict.expectedCloudChecksum);
  }, [commitAssessment, commitConflicts]);

  return {
    assessments: entries.map((entry) => entry.assessment),
    conflicts,
    loading,
    addSource,
    saveAssessment,
    useDeviceVersion,
    useSecureVersion,
  };
}

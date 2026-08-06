"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/app-shell/AppIcons";
import { createClient } from "@/lib/supabase/client";
import {
  addConsentPhase5Version,
  buildConsentPhase5ReviewPackage,
  changeConsentPhase5Authority,
  changeConsentPhase5FormKind,
  collectConsentPhase5Issues,
  compileConsentPhase5Source,
  consentPhase5Filename,
  createConsentPhase5Document,
  isConsentPhase5Ready,
  participantConsentPreview,
  readConsentPhase5Document,
  reconcileConsentPhase5Document,
  recordConsentPhase5Export,
  updateConsentPhase5Clause,
  updateConsentPhase5Inputs,
  writeConsentPhase5Document,
  type ConsentPhase5AuthorityAttachment,
  type ConsentPhase5Document,
  type ConsentPhase5FormKind,
  type ConsentPhase5Issue,
  type ConsentResearcherInputs,
  type ConsentPhase5SourceCompilation,
} from "@/lib/research/consentPhase5";
import {
  fetchConsentPhase5Document,
  upsertConsentPhase5Document,
} from "@/lib/research/consentPhase5Persistence";
import {
  phase6ParticipantPreview,
  reviewConsentPhase6Artifact,
  type ConsentPhase6Issue,
} from "@/lib/research/consentPhase6";
import type { ConsentPhase6ModuleId } from "@/lib/research/consentPhase6Model";
import {
  phase7ParticipantPreview,
  reviewConsentPhase7Artifact,
  type ConsentPhase7Issue,
} from "@/lib/research/consentPhase7";
import type { ConsentPhase7PackageId } from "@/lib/research/consentPhase7Model";
import {
  compileConsentPhase8AndDependencies,
  phase8ParticipantPreview,
  type ConsentPhase8Issue,
} from "@/lib/research/consentPhase8";
import type { ConsentPhase8ModuleId } from "@/lib/research/consentPhase8Model";
import { listBundledConsentAuthorityManifests } from "@/lib/research/consentAuthority";
import {
  experimentStudioStorageKey,
  readExperimentStudioDocument,
  writeExperimentStudioDocument,
  type ExperimentStudioDocument,
} from "@/lib/research/experimentStudio";
import { fetchExperimentStudio } from "@/lib/research/experimentStudioPersistence";
import { upsertExperimentStudio } from "@/lib/research/experimentStudioPersistence";
import {
  bindConsentRuntimeToStudio,
  type ConsentRuntimeArtifact,
} from "@/lib/research/consentRuntime";
import {
  STUDY_DESIGN_OPTIONS,
  type StudyDesignDocument,
} from "@/lib/research/studyDesign";
import ConsentPhase6Workspace from "./ConsentPhase6Workspace";
import ConsentPhase7Workspace from "./ConsentPhase7Workspace";
import ConsentPhase8Workspace from "./ConsentPhase8Workspace";
import ConsentAssistantPanel from "./ConsentAssistantPanel";
import ConsentRuntimePanel from "./ConsentRuntimePanel";
import styles from "./ConsentWorkspace.module.css";

type WorkspaceView =
  | "authority"
  | "facts"
  | "modules"
  | "specialized"
  | "audiences"
  | "form"
  | "preview"
  | "review";

interface ConsentWorkspaceProps {
  onReadyChange: (ready: boolean) => void;
  projectId: string;
  studyDesign: StudyDesignDocument;
}

const VIEWS: ReadonlyArray<{ id: WorkspaceView; label: string }> = [
  { id: "authority", label: "Authority" },
  { id: "facts", label: "Study facts" },
  { id: "modules", label: "Protocol modules" },
  { id: "specialized", label: "Specialized modules" },
  { id: "audiences", label: "Audience packages" },
  { id: "form", label: "Form" },
  { id: "preview", label: "Participant preview" },
  { id: "review", label: "Review & export" },
];

const FORM_KIND_OPTIONS: ReadonlyArray<{
  id: ConsentPhase5FormKind;
  label: string;
  detail: string;
}> = [
  {
    id: "adult-standard",
    label: "Adult standard",
    detail: "Plain-language adult research consent",
  },
  {
    id: "anonymous-survey-information",
    label: "Anonymous survey",
    detail: "Information and participation decision",
  },
  {
    id: "confidential-survey-information",
    label: "Confidential survey",
    detail: "Survey with linkable or identifying information",
  },
  {
    id: "adult-interview",
    label: "Adult interview",
    detail: "Interview procedure and participant rights",
  },
];

const INPUT_SECTIONS: ReadonlyArray<{
  title: string;
  fields: ReadonlyArray<{
    key: keyof ConsentResearcherInputs;
    label: string;
    placeholder: string;
    rows?: number;
  }>;
}> = [
  {
    title: "Purpose and burden",
    fields: [
      {
        key: "studyPurpose",
        label: "Study purpose",
        placeholder:
          "Explain why the research is being conducted in plain language.",
        rows: 3,
      },
      {
        key: "duration",
        label: "Expected total duration",
        placeholder: "For example: about 20 minutes.",
        rows: 2,
      },
      {
        key: "risksAndDiscomforts",
        label: "Risks and discomforts",
        placeholder:
          "Describe foreseeable physical, emotional, social, privacy, or task-related concerns.",
        rows: 4,
      },
      {
        key: "benefits",
        label: "Benefits",
        placeholder:
          "Describe expected benefits or state that there may be no direct benefit.",
        rows: 3,
      },
    ],
  },
  {
    title: "Data and privacy",
    fields: [
      {
        key: "privacyProtections",
        label: "Privacy and confidentiality protections",
        placeholder: "Describe protections and their limits.",
        rows: 4,
      },
      {
        key: "dataAccess",
        label: "Who can access the information?",
        placeholder: "Name the roles or organizations with access.",
        rows: 3,
      },
      {
        key: "dataRetention",
        label: "Retention or destruction",
        placeholder:
          "State how long information is kept and what is destroyed.",
        rows: 3,
      },
    ],
  },
  {
    title: "Participation and contacts",
    fields: [
      {
        key: "compensationAndCosts",
        label: "Payment, reimbursement, and costs",
        placeholder:
          "Describe payment or state that there is no payment or cost.",
        rows: 3,
      },
      {
        key: "withdrawalMethod",
        label: "How to stop or withdraw",
        placeholder: "Explain the contact or in-study method.",
        rows: 3,
      },
      {
        key: "withdrawalBoundary",
        label: "Deletion or anonymization boundary",
        placeholder: "Explain what can and cannot be removed after withdrawal.",
        rows: 3,
      },
      {
        key: "studyContact",
        label: "Study questions contact",
        placeholder: "Name, role, and reliable contact method.",
        rows: 3,
      },
      {
        key: "rightsContact",
        label: "Participant-rights contact",
        placeholder: "Use the contact required by the applicable institution.",
        rows: 3,
      },
    ],
  },
  {
    title: "Recording",
    fields: [
      {
        key: "recordingPurpose",
        label: "Recording purpose",
        placeholder: "Why is audio or video necessary?",
        rows: 3,
      },
      {
        key: "recordingAccessAndUse",
        label: "Recording access and use",
        placeholder: "Who can access recordings and for which research uses?",
        rows: 3,
      },
      {
        key: "recordingRetention",
        label: "Recording retention or destruction",
        placeholder:
          "State when recordings are destroyed or if retained indefinitely.",
        rows: 3,
      },
    ],
  },
];

function shortChecksum(value: string): string {
  return `${value.slice(0, 14)}…${value.slice(-6)}`;
}

function designName(studyDesign: StudyDesignDocument): string {
  return (
    STUDY_DESIGN_OPTIONS.find(
      (option) => option.id === studyDesign.spec.design.selectedDesign,
    )?.title ?? "Design not selected"
  );
}

function settingName(
  setting: StudyDesignDocument["spec"]["design"]["setting"],
): string {
  return {
    "": "Setting not selected",
    online: "Online / participant home",
    laboratory: "Research laboratory",
    field: "Field setting",
    hybrid: "Hybrid settings",
  }[setting];
}

function sourceIssueView(issue: ConsentPhase5Issue): WorkspaceView {
  if (issue.id.startsWith("phase8-")) return "specialized";
  if (issue.specializedModuleId) return "specialized";
  if (issue.packageId) return "audiences";
  return (
    {
      authority: "authority",
      governance: "authority",
      facts: "facts",
      module: "modules",
      artifact: "modules",
      "protected-audience": "audiences",
      "specialized-module": "specialized",
      "specialized-artifact": "specialized",
      form: "form",
      review: "form",
      source: "facts",
    } as const
  )[issue.repairTarget];
}

function newestDocument(
  local: ConsentPhase5Document | null,
  cloud: ConsentPhase5Document | null,
): ConsentPhase5Document | null {
  if (!local) return cloud;
  if (!cloud) return local;
  return Date.parse(cloud.updatedAt) >= Date.parse(local.updatedAt)
    ? cloud
    : local;
}

function newestStudio(
  local: ExperimentStudioDocument | null,
  cloud: ExperimentStudioDocument | null,
): ExperimentStudioDocument | null {
  if (!local) return cloud;
  if (!cloud) return local;
  return Date.parse(cloud.updatedAt) >= Date.parse(local.updatedAt)
    ? cloud
    : local;
}

function downloadJson(filename: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function attachmentFromFile(
  file: File,
): Promise<ConsentPhase5AuthorityAttachment> {
  if (file.size > 20 * 1024 * 1024)
    throw new Error("Authority files must be 20 MB or smaller.");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  const checksum =
    `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}` as const;
  return {
    filename: file.name.slice(0, 255),
    mediaType: (file.type || "application/octet-stream").slice(0, 160),
    byteLength: file.size,
    checksum,
    importedAt: new Date().toISOString(),
    contentsStored: false,
  };
}

export default function ConsentWorkspace({
  onReadyChange,
  projectId,
  studyDesign,
}: ConsentWorkspaceProps) {
  const [view, setView] = useState<WorkspaceView>("authority");
  const [studio, setStudio] = useState<ExperimentStudioDocument | null>(null);
  const [source, setSource] = useState<ConsentPhase5SourceCompilation | null>(
    null,
  );
  const [protocol, setProtocol] = useState<ConsentPhase5Document | null>(null);
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading consent workspace…");
  const [activeFormId, setActiveFormId] = useState("form-main");
  const [activeClauseId, setActiveClauseId] = useState("");
  const [activeModuleId, setActiveModuleId] =
    useState<ConsentPhase6ModuleId>("behavioral");
  const [activePackageId, setActivePackageId] =
    useState<ConsentPhase7PackageId>("parental-permission");
  const [activeSpecializedModuleId, setActiveSpecializedModuleId] =
    useState<ConsentPhase8ModuleId>("regulated-intervention");
  const [activePreviewId, setActivePreviewId] = useState("form-main");
  const [participantPreviewOpen, setParticipantPreviewOpen] = useState(false);
  const localSaveTimer = useRef<number | null>(null);
  const cloudSaveTimer = useRef<number | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const authorities = listBundledConsentAuthorityManifests();
      const defaultAuthority =
        authorities.find(
          (authority) =>
            authority.id === "generic-us-research-consent-baseline",
        ) ?? authorities[0];
      let localStudio: ExperimentStudioDocument | null = null;
      let localProtocol: ConsentPhase5Document | null = null;
      try {
        if (
          window.localStorage.getItem(experimentStudioStorageKey(projectId))
        ) {
          localStudio = readExperimentStudioDocument(
            window.localStorage,
            projectId,
            studyDesign,
          );
        }
        localProtocol = readConsentPhase5Document(
          window.localStorage,
          projectId,
        );
      } catch {
        // Cloud loading and a new local draft remain available.
      }

      let userId: string | null = null;
      let cloudStudio: ExperimentStudioDocument | null = null;
      let cloudProtocol: ConsentPhase5Document | null = null;
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        userId = user?.id ?? null;
        if (userId) {
          [cloudStudio, cloudProtocol] = await Promise.all([
            fetchExperimentStudio(supabase, userId, projectId, studyDesign),
            fetchConsentPhase5Document(supabase, userId, projectId),
          ]);
        }
      } catch {
        // Local versioned storage remains the fail-open authoring path.
      }
      const selectedStudio = newestStudio(localStudio, cloudStudio);
      if (cancelled) return;
      setCloudUserId(userId);
      setStudio(selectedStudio);
      if (!selectedStudio) {
        setProtocol(null);
        setSource(null);
        setStatus("Build and save the runnable study in Step 04 first");
        setLoading(false);
        return;
      }
      const compiledSource = await compileConsentPhase5Source(
        studyDesign,
        selectedStudio,
      );
      const existing = newestDocument(localProtocol, cloudProtocol);
      const document =
        existing ??
        (await createConsentPhase5Document(
          projectId,
          studyDesign,
          selectedStudio,
          defaultAuthority,
        ));
      if (cancelled) return;
      setSource(compiledSource);
      setProtocol(document);
      setStatus(
        existing
          ? "Consent draft loaded"
          : "New consent draft created on this device",
      );
      hydrated.current = true;
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId, studyDesign]);

  useEffect(() => {
    if (!protocol || !hydrated.current) return;
    if (localSaveTimer.current) window.clearTimeout(localSaveTimer.current);
    localSaveTimer.current = window.setTimeout(() => {
      try {
        writeConsentPhase5Document(window.localStorage, protocol);
        setStatus("Saved on this device");
      } catch {
        setStatus("Draft could not be saved");
      }
    }, 350);
    return () => {
      if (localSaveTimer.current) window.clearTimeout(localSaveTimer.current);
    };
  }, [protocol]);

  useEffect(() => {
    if (!protocol || !cloudUserId || !hydrated.current) return;
    if (cloudSaveTimer.current) window.clearTimeout(cloudSaveTimer.current);
    cloudSaveTimer.current = window.setTimeout(() => {
      void upsertConsentPhase5Document(
        createClient(),
        cloudUserId,
        protocol,
      ).then((saved) => {
        if (saved) setStatus("Saved securely");
      });
    }, 800);
    return () => {
      if (cloudSaveTimer.current) window.clearTimeout(cloudSaveTimer.current);
    };
  }, [cloudUserId, protocol]);

  const issues = useMemo(
    () =>
      protocol && source
        ? collectConsentPhase5Issues(protocol, source.sourceFingerprint)
        : [],
    [protocol, source],
  );
  const blocking = issues.filter((issue) => issue.severity === "blocking");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const sourceStale = Boolean(
    protocol &&
    source &&
    protocol.sourceFingerprint.checksum !== source.sourceFingerprint.checksum,
  );
  const ready = Boolean(
    protocol &&
    source &&
    isConsentPhase5Ready(protocol, source.sourceFingerprint),
  );

  useEffect(() => {
    onReadyChange(ready);
  }, [onReadyChange, ready]);

  const activeForm =
    protocol?.forms.find((form) => form.id === activeFormId) ??
    protocol?.forms[0] ??
    null;
  const activeClause =
    activeForm?.clauses.find((clause) => clause.id === activeClauseId) ??
    activeForm?.clauses[0] ??
    null;
  const activeClauseIssues = activeClause
    ? issues.filter((issue) => issue.clauseId === activeClause.id)
    : [];
  const phase6Issues = issues.filter((issue): issue is ConsentPhase6Issue =>
    Boolean(issue.moduleId),
  );
  const phase7Issues = issues.filter(
    (issue): issue is ConsentPhase7Issue =>
      Boolean(issue.packageId) || issue.repairTarget === "protected-audience",
  );
  const phase8Issues = issues.filter(
    (issue): issue is ConsentPhase8Issue =>
      issue.id.startsWith("phase8-") ||
      Boolean(issue.specializedModuleId) ||
      issue.repairTarget === "specialized-module" ||
      issue.repairTarget === "specialized-artifact",
  );
  const activePhase6Artifact =
    protocol?.phase6.artifacts.find(
      (artifact) => artifact.id === activePreviewId,
    ) ?? null;
  const activePhase7Artifact =
    protocol?.phase7.artifacts.find(
      (artifact) => artifact.id === activePreviewId,
    ) ?? null;
  const activePhase8Artifact =
    protocol?.phase8.artifacts.find(
      (artifact) => artifact.id === activePreviewId,
    ) ?? null;

  const mutateProtocol = useCallback(
    (updater: (current: ConsentPhase5Document) => ConsentPhase5Document) => {
      setProtocol((current) => (current ? updater(current) : current));
    },
    [],
  );

  const updateGovernance = useCallback(
    (patch: Partial<ConsentPhase5Document["governance"]>) => {
      mutateProtocol((current) =>
        compileConsentPhase8AndDependencies({
          ...current,
          governance: { ...current.governance, ...patch },
          exports: [],
          updatedAt: new Date().toISOString(),
        }),
      );
    },
    [mutateProtocol],
  );

  const selectAuthority = useCallback(
    (id: string) => {
      const authority = listBundledConsentAuthorityManifests().find(
        (candidate) => candidate.id === id,
      );
      if (authority)
        mutateProtocol((current) =>
          changeConsentPhase5Authority(current, authority),
        );
    },
    [mutateProtocol],
  );

  const handleTemplateFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      try {
        const attachment = await attachmentFromFile(file);
        mutateProtocol((current) =>
          compileConsentPhase8AndDependencies({
            ...current,
            authorityAttachment: attachment,
            authorityApplicabilityConfirmed: false,
            exports: [],
            updatedAt: attachment.importedAt,
          }),
        );
        setStatus(
          "Template identity attached. The file contents were not copied into Cerise.",
        );
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "The authority file could not be attached.",
        );
      }
    },
    [mutateProtocol],
  );

  const reconcileSource = useCallback(async () => {
    if (!protocol || !studio) return;
    const next = await reconcileConsentPhase5Document(
      protocol,
      studyDesign,
      studio,
    );
    setProtocol(next);
    setSource(await compileConsentPhase5Source(studyDesign, studio));
    setStatus(
      "Study facts reconciled. Researcher-authored text was preserved and affected clauses require review.",
    );
  }, [protocol, studio, studyDesign]);

  const chooseIssue = useCallback(
    (issue: ConsentPhase5Issue) => {
      setView(sourceIssueView(issue));
      if (issue.moduleId) setActiveModuleId(issue.moduleId);
      if (issue.packageId) setActivePackageId(issue.packageId);
      if (issue.specializedModuleId)
        setActiveSpecializedModuleId(issue.specializedModuleId);
      if (issue.clauseId && protocol) {
        const form = protocol.forms.find((candidate) =>
          candidate.clauses.some((clause) => clause.id === issue.clauseId),
        );
        if (form) setActiveFormId(form.id);
        setActiveClauseId(issue.clauseId);
      }
    },
    [protocol],
  );

  const saveVersion = useCallback(async () => {
    if (!protocol) return;
    setProtocol(await addConsentPhase5Version(protocol));
    setStatus(
      "A checksum-bound authoring snapshot was saved. It is not an approval record.",
    );
  }, [protocol]);

  const exportPackage = useCallback(async () => {
    if (!protocol || !source || blocking.length > 0) return;
    try {
      const versioned = await addConsentPhase5Version(protocol);
      const reviewPackage = await buildConsentPhase5ReviewPackage(
        versioned,
        source.sourceFingerprint,
      );
      const recorded = recordConsentPhase5Export(versioned, reviewPackage);
      setProtocol(recorded);
      downloadJson(consentPhase5Filename(recorded), reviewPackage);
      setStatus(
        "Review package exported locally. It does not establish approval or legally effective participant consent.",
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "The review package could not be exported.",
      );
    }
  }, [blocking.length, protocol, source]);

  const bindParticipantRuntime = useCallback(async (
    artifact: ConsentRuntimeArtifact,
  ) => {
    if (!studio) throw new Error("Build and save the runnable study before binding consent.");
    const bound = await bindConsentRuntimeToStudio(studio, artifact);
    writeExperimentStudioDocument(window.localStorage, bound);
    if (cloudUserId) {
      const saved = await upsertExperimentStudio(createClient(), cloudUserId, bound);
      if (!saved) {
        setStatus("Consent was bound on this device, but the Studio cloud copy could not be updated.");
      }
    }
    setStudio(bound);
    setStatus("The exact reviewed adult consent artifact is bound as the first participant screen. Freeze a new release before testing.");
  }, [cloudUserId, studio]);

  if (loading) {
    return (
      <div className={styles.loading} role="status">
        <span />
        Compiling the consent workspace…
      </div>
    );
  }

  if (!protocol || !source || !studio) {
    return (
      <div className={styles.emptyState} role="status">
        <AppIcon name="shield" />
        <div>
          <h2>Consent needs the implemented study</h2>
          <p>
            Build and save the runnable experiment or survey in Step 04. Consent
            must describe what participants will actually experience.
          </p>
        </div>
      </div>
    );
  }

  const sourceStatus = sourceStale ? "Changed · reconcile required" : "Current";
  const latestVersion = protocol.versions.at(-1)?.version ?? 0;

  return (
    <div className={styles.workspace}>
      <div className={styles.sourceStrip}>
        <div>
          <span>Design</span>
          <strong>{designName(studyDesign)}</strong>
        </div>
        <div>
          <span>Setting</span>
          <strong>{settingName(studyDesign.spec.design.setting)}</strong>
        </div>
        <div>
          <span>Authority</span>
          <strong>{protocol.authorityManifest.displayName}</strong>
        </div>
        <div className={sourceStale ? styles.sourceChanged : undefined}>
          <span>Source status</span>
          <strong>{sourceStatus}</strong>
        </div>
      </div>

      <div className={styles.boundaryNotice} role="note">
        <AppIcon name="shield" />
        <div>
          <strong>
            Cerise helps author and verify consent materials. Your institution
            decides what applies.
          </strong>
          <span>
            Checksums and issue checks establish identity and consistency—not
            IRB, legal, ethics, or compliance approval.
          </span>
        </div>
        {sourceStale ? (
          <button onClick={() => void reconcileSource()} type="button">
            Reconcile study facts
          </button>
        ) : null}
      </div>

      <nav aria-label="Consent workspace" className={styles.workflowTabs}>
        {VIEWS.map((item, index) => (
          <button
            aria-current={view === item.id ? "step" : undefined}
            className={view === item.id ? styles.workflowTabActive : undefined}
            key={item.id}
            onClick={() => setView(item.id)}
            type="button"
          >
            <span>{index + 1}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className={styles.profileStrip}>
        <div>
          <span>Authority</span>
          <strong>
            {protocol.authorityManifest.institution ??
              "Researcher-selected baseline"}
          </strong>
        </div>
        <div
          className={
            protocol.governance.pathway === "not-yet-determined"
              ? styles.unresolvedValue
              : undefined
          }
        >
          <span>Governance</span>
          <strong>{protocol.governance.pathway.replaceAll("-", " ")}</strong>
        </div>
        <div>
          <span>Family</span>
          <strong>
            {
              FORM_KIND_OPTIONS.find(
                (option) => option.id === protocol.formKind,
              )?.label
            }{" "}
            ·{" "}
            {protocol.phase6.artifacts.length +
              protocol.phase8.artifacts.length +
              protocol.phase7.artifacts.length}{" "}
            variant artifacts
          </strong>
        </div>
        <div>
          <span>Source profile</span>
          <strong>{protocol.authorityManifest.profileVersion}</strong>
        </div>
      </div>

      {view === "authority" ? (
        <section className={styles.authorityView}>
          <div className={styles.authorityFields}>
            <h2>Declare authority and governance</h2>
            <p>
              Cerise records the researcher’s or institution’s determination. It
              does not select the review pathway.
            </p>
            <label>
              <span>Authority profile</span>
              <select
                onChange={(event) => selectAuthority(event.target.value)}
                value={protocol.authorityManifest.id}
              >
                {listBundledConsentAuthorityManifests().map((authority) => (
                  <option key={authority.id} value={authority.id}>
                    {authority.displayName}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.twoColumnFields}>
              <label>
                <span>Governance pathway</span>
                <select
                  onChange={(event) =>
                    updateGovernance({
                      pathway: event.target
                        .value as ConsentPhase5Document["governance"]["pathway"],
                    })
                  }
                  value={protocol.governance.pathway}
                >
                  <option value="not-yet-determined">Not yet determined</option>
                  <option value="documented-exempt">
                    Institution-documented exempt
                  </option>
                  <option value="expedited-or-full">
                    Expedited or full review
                  </option>
                  <option value="fda-regulated">FDA-regulated</option>
                  <option value="other-institutional">
                    Other institutional pathway
                  </option>
                </select>
              </label>
              <label>
                <span>Decision source</span>
                <select
                  onChange={(event) =>
                    updateGovernance({
                      decisionSource: event.target
                        .value as ConsentPhase5Document["governance"]["decisionSource"],
                    })
                  }
                  value={protocol.governance.decisionSource}
                >
                  <option value="none">Not recorded</option>
                  <option value="researcher">Researcher declaration</option>
                  <option value="institution">Institution determination</option>
                </select>
              </label>
            </div>
            <label>
              <span>Institutional determination or protocol reference</span>
              <input
                onChange={(event) =>
                  updateGovernance({ institutionReference: event.target.value })
                }
                placeholder="For example: protocol number, determination record, or supervisor review reference"
                value={protocol.governance.institutionReference}
              />
            </label>
            <label>
              <span>Consent documentation process</span>
              <select
                onChange={(event) =>
                  updateGovernance({
                    documentationMethod: event.target
                      .value as ConsentPhase5Document["governance"]["documentationMethod"],
                  })
                }
                value={protocol.governance.documentationMethod}
              >
                <option value="not-yet-determined">Not yet determined</option>
                <option value="signed-written">Signed written consent</option>
                <option value="signed-electronic">
                  Signed electronic consent
                </option>
                <option value="verbal">Verbal consent</option>
                <option value="electronic-acknowledgement">
                  Electronic acknowledgement
                </option>
                <option value="implied">Implied consent</option>
                <option value="telephone-script">
                  Telephone consent script
                </option>
              </select>
            </label>
            {["verbal", "electronic-acknowledgement", "implied"].includes(
              protocol.governance.documentationMethod,
            ) ? (
              <div className={styles.waiverFields}>
                <label>
                  <span>Waiver of signed documentation status</span>
                  <select
                    onChange={(event) =>
                      updateGovernance({
                        waiverOrAlteration: {
                          status: event.target.value as
                            | "not-requested"
                            | "requested"
                            | "approved"
                            | "denied",
                          approvalReference:
                            protocol.governance.waiverOrAlteration
                              ?.approvalReference ?? "",
                        },
                      })
                    }
                    value={
                      protocol.governance.waiverOrAlteration?.status ??
                      "not-requested"
                    }
                  >
                    <option value="not-requested">Not requested</option>
                    <option value="requested">Requested</option>
                    <option value="approved">
                      Approved by applicable human authority
                    </option>
                    <option value="denied">Denied</option>
                  </select>
                </label>
                <label>
                  <span>Documentation-waiver approval reference</span>
                  <input
                    onChange={(event) =>
                      updateGovernance({
                        waiverOrAlteration: {
                          status:
                            protocol.governance.waiverOrAlteration?.status ??
                            "not-requested",
                          approvalReference: event.target.value,
                        },
                      })
                    }
                    value={
                      protocol.governance.waiverOrAlteration
                        ?.approvalReference ?? ""
                    }
                  />
                </label>
              </div>
            ) : null}
          </div>

          <aside className={styles.authorityInspector}>
            <h3>Source identity</h3>
            <dl>
              <div>
                <dt>Profile</dt>
                <dd>{protocol.authorityManifest.id}</dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>{protocol.authorityManifest.profileVersion}</dd>
              </div>
              <div>
                <dt>Effective</dt>
                <dd>
                  {protocol.authorityManifest.effectiveDate ??
                    "Researcher must determine"}
                </dd>
              </div>
              <div>
                <dt>Sources</dt>
                <dd>{protocol.authorityManifest.sources.length}</dd>
              </div>
            </dl>
            <ul className={styles.sourceLinks}>
              {protocol.authorityManifest.sources.map((authoritySource) => (
                <li key={authoritySource.id}>
                  <a
                    href={authoritySource.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {authoritySource.title}
                    <AppIcon name="external-link" />
                  </a>
                </li>
              ))}
            </ul>
            <label className={styles.fileInput}>
              <span>Attach the current template identity</span>
              <input
                accept=".doc,.docx,.pdf,.rtf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) =>
                  void handleTemplateFile(event.target.files?.[0])
                }
                type="file"
              />
              <small>
                The filename, size, media type, and SHA-256 checksum are stored.
                File contents are not copied.
              </small>
            </label>
            {protocol.authorityAttachment ? (
              <div className={styles.attachmentSummary}>
                <AppIcon name="file" />
                <div>
                  <strong>{protocol.authorityAttachment.filename}</strong>
                  <span>
                    {shortChecksum(protocol.authorityAttachment.checksum)}
                  </span>
                </div>
              </div>
            ) : null}
            <label className={styles.confirmation}>
              <input
                checked={protocol.authorityApplicabilityConfirmed}
                onChange={(event) =>
                  mutateProtocol((current) => ({
                    ...current,
                    authorityApplicabilityConfirmed: event.target.checked,
                    exports: [],
                    updatedAt: new Date().toISOString(),
                  }))
                }
                type="checkbox"
              />
              <span>
                I confirmed this authority profile applies and obtained the
                current applicable template.
              </span>
            </label>
          </aside>
        </section>
      ) : null}

      {view === "facts" ? (
        <section className={styles.factsView}>
          <aside className={styles.derivedFacts}>
            <h2>Implemented study facts</h2>
            <p>
              These facts come from Steps 01–04. They are evidence for drafting,
              not governance decisions.
            </p>
            <ol>
              {protocol.studyFacts.map((fact) => (
                <li key={fact.id}>
                  <span>{fact.label}</span>
                  <strong>{fact.value}</strong>
                  <small>
                    {fact.sourceLocator} · {fact.confidence}
                  </small>
                </li>
              ))}
            </ol>
          </aside>
          <div className={styles.researcherFacts}>
            <div className={styles.factIntro}>
              <div>
                <h2>Researcher-confirmed participant facts</h2>
                <p>
                  Complete what the implemented study cannot determine safely.
                </p>
              </div>
              <button onClick={() => setView("modules")} type="button">
                Continue to modules
                <AppIcon name="arrow-right" />
              </button>
            </div>
            <div className={styles.factSelectors}>
              <label>
                <span>Data handling</span>
                <select
                  onChange={(event) =>
                    mutateProtocol((current) =>
                      updateConsentPhase5Inputs(current, {
                        identifiability: event.target
                          .value as ConsentResearcherInputs["identifiability"],
                      }),
                    )
                  }
                  value={protocol.inputs.identifiability}
                >
                  <option value="not-yet-determined">Not yet determined</option>
                  <option value="anonymous">Anonymous</option>
                  <option value="confidential">Confidential / linkable</option>
                </select>
              </label>
              <label>
                <span>Future research use</span>
                <select
                  onChange={(event) =>
                    mutateProtocol((current) =>
                      updateConsentPhase5Inputs(current, {
                        futureUsePlan: event.target
                          .value as ConsentResearcherInputs["futureUsePlan"],
                      }),
                    )
                  }
                  value={protocol.inputs.futureUsePlan}
                >
                  <option value="not-yet-determined">Not yet determined</option>
                  <option value="may-use-after-removing-identifiers">
                    May use after identifiers are removed
                  </option>
                  <option value="will-not-use-for-future-research">
                    Will not use for future research
                  </option>
                </select>
              </label>
            </div>
            {INPUT_SECTIONS.map((section) => {
              const recordingSection = section.title === "Recording";
              const hasRecording = protocol.forms.some(
                (form) =>
                  form.kind === "audio-recording-choice" ||
                  form.kind === "video-recording-choice",
              );
              if (recordingSection && !hasRecording) return null;
              return (
                <fieldset key={section.title}>
                  <legend>{section.title}</legend>
                  {section.fields.map((field) => (
                    <label key={field.key}>
                      <span>{field.label}</span>
                      <textarea
                        onChange={(event) =>
                          mutateProtocol((current) =>
                            updateConsentPhase5Inputs(current, {
                              [field.key]: event.target.value,
                            }),
                          )
                        }
                        placeholder={field.placeholder}
                        rows={field.rows ?? 3}
                        value={protocol.inputs[field.key] as string}
                      />
                    </label>
                  ))}
                </fieldset>
              );
            })}
          </div>
        </section>
      ) : null}

      {view === "modules" ? (
        <ConsentPhase6Workspace
          activeModuleId={activeModuleId}
          issues={phase6Issues}
          onActiveModuleChange={setActiveModuleId}
          onProtocolChange={setProtocol}
          protocol={protocol}
        />
      ) : null}

      {view === "specialized" ? (
        <ConsentPhase8Workspace
          activeModuleId={activeSpecializedModuleId}
          issues={phase8Issues}
          onActiveModuleChange={setActiveSpecializedModuleId}
          onProtocolChange={setProtocol}
          protocol={protocol}
        />
      ) : null}

      {view === "audiences" ? (
        <ConsentPhase7Workspace
          activePackageId={activePackageId}
          issues={phase7Issues}
          onActivePackageChange={setActivePackageId}
          onProtocolChange={setProtocol}
          protocol={protocol}
        />
      ) : null}

      {view === "form" ? (
        <section className={styles.formView}>
          <aside className={styles.sectionOutline}>
            <label>
              <span>Form family</span>
              <select
                onChange={(event) =>
                  mutateProtocol((current) =>
                    changeConsentPhase5FormKind(
                      current,
                      event.target.value as ConsentPhase5FormKind,
                    ),
                  )
                }
                value={protocol.formKind}
              >
                {FORM_KIND_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {protocol.forms.length > 1 ? (
              <div
                className={styles.formSelector}
                role="tablist"
                aria-label="Consent forms"
              >
                {protocol.forms.map((form) => (
                  <button
                    aria-selected={form.id === activeForm?.id}
                    className={
                      form.id === activeForm?.id
                        ? styles.formSelectorActive
                        : undefined
                    }
                    key={form.id}
                    onClick={() => {
                      setActiveFormId(form.id);
                      setActiveClauseId(form.clauses[0]?.id ?? "");
                    }}
                    role="tab"
                    type="button"
                  >
                    {form.title}
                  </button>
                ))}
              </div>
            ) : null}
            <h3>Section outline</h3>
            <ol>
              {activeForm?.clauses.map((clause, index) => {
                const clauseIssues = issues.filter(
                  (issue) => issue.clauseId === clause.id,
                ).length;
                return (
                  <li
                    className={
                      clause.id === activeClause?.id
                        ? styles.clauseActive
                        : undefined
                    }
                    key={clause.id}
                  >
                    <button
                      onClick={() => setActiveClauseId(clause.id)}
                      type="button"
                    >
                      <span>{index + 1}</span>
                      <div>
                        <strong>{clause.title}</strong>
                        <small>
                          {clauseIssues > 0
                            ? `${clauseIssues} issue${clauseIssues === 1 ? "" : "s"}`
                            : "Reviewed"}
                        </small>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>

          <div className={styles.clauseEditor}>
            {activeClause ? (
              <>
                <header>
                  <div>
                    <span>Selected clause</span>
                    <h2>{activeClause.title}</h2>
                    <p>
                      {activeForm?.title} ·{" "}
                      {protocol.authorityManifest.profileVersion}
                    </p>
                  </div>
                  <label className={styles.previewSwitch}>
                    <span>Participant preview</span>
                    <input
                      checked={participantPreviewOpen}
                      onChange={(event) =>
                        setParticipantPreviewOpen(event.target.checked)
                      }
                      type="checkbox"
                    />
                  </label>
                </header>
                <div className={styles.clauseMeta}>
                  <div>
                    <span>Provenance</span>
                    <strong>
                      {activeClause.sourceKind.replaceAll("-", " ")}
                    </strong>
                  </div>
                  <div>
                    <span>Edit policy</span>
                    <strong>
                      {activeClause.editPolicy.replaceAll("-", " ")}
                    </strong>
                  </div>
                  <div>
                    <span>Source locator</span>
                    <strong>{activeClause.sourceLocator}</strong>
                  </div>
                </div>
                {activeClause.factIds.length > 0 ? (
                  <div className={styles.clauseFacts}>
                    <span>Derived study facts</span>
                    {activeClause.factIds.map((factId) => {
                      const fact = protocol.studyFacts.find(
                        (candidate) => candidate.id === factId,
                      );
                      return fact ? (
                        <div key={fact.id}>
                          <strong>{fact.label}</strong>
                          <p>{fact.value}</p>
                        </div>
                      ) : null;
                    })}
                  </div>
                ) : null}
                {participantPreviewOpen ? (
                  <div className={styles.singleClausePreview}>
                    <h3>{activeClause.title}</h3>
                    <p>{activeClause.text}</p>
                  </div>
                ) : (
                  <label className={styles.participantText}>
                    <span>Participant-facing text</span>
                    <textarea
                      disabled={["locked", "fill-only", "conditional"].includes(
                        activeClause.editPolicy,
                      )}
                      onChange={(event) =>
                        mutateProtocol(
                          (current) =>
                            updateConsentPhase5Clause(
                              current,
                              activeClause.id,
                              { text: event.target.value },
                            ).document,
                        )
                      }
                      rows={9}
                      value={activeClause.text}
                    />
                    <small>
                      {activeClause.text.length} / 20,000 characters
                      {activeClause.researcherEdited
                        ? " · Researcher edited"
                        : " · Compiler draft"}
                    </small>
                  </label>
                )}
                <div className={styles.reviewControl}>
                  <div>
                    <span>Human review state</span>
                    <strong>
                      {activeClause.reviewState.replaceAll("-", " ")}
                    </strong>
                  </div>
                  <button
                    className={
                      activeClause.reviewState === "human-reviewed"
                        ? styles.reviewedButton
                        : undefined
                    }
                    onClick={() =>
                      mutateProtocol(
                        (current) =>
                          updateConsentPhase5Clause(current, activeClause.id, {
                            reviewState:
                              activeClause.reviewState === "human-reviewed"
                                ? "not-reviewed"
                                : "human-reviewed",
                          }).document,
                      )
                    }
                    type="button"
                  >
                    <AppIcon name="check-square" />
                    {activeClause.reviewState === "human-reviewed"
                      ? "Reviewed for this study"
                      : "Mark human reviewed"}
                  </button>
                </div>
              </>
            ) : null}
          </div>

          <aside className={styles.issueInspector}>
            <div
              className={
                blocking.length > 0
                  ? styles.issueSummaryBlocking
                  : styles.issueSummaryClear
              }
            >
              <AppIcon name={blocking.length > 0 ? "shield" : "check-square"} />
              <div>
                <strong>
                  {blocking.length} blocking issue
                  {blocking.length === 1 ? "" : "s"}
                </strong>
                <span>
                  {blocking.length > 0
                    ? "Resolve before export."
                    : "Participant-facing requirements resolved."}
                </span>
              </div>
            </div>
            <h3>
              {activeClauseIssues.length > 0
                ? "Selected clause issues"
                : "Next repair targets"}
            </h3>
            <ol>
              {(activeClauseIssues.length > 0
                ? activeClauseIssues
                : issues.slice(0, 5)
              ).map((issue) => (
                <li key={issue.id}>
                  <button onClick={() => chooseIssue(issue)} type="button">
                    <strong>{issue.message}</strong>
                    <span>
                      {issue.repairTarget}
                      <AppIcon name="arrow-right" />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <div className={styles.checksumNote}>
              <span>Consent source identity</span>
              <strong>
                {shortChecksum(protocol.sourceFingerprint.checksum)}
              </strong>
              <p>
                This checksum identifies source content. It does not establish
                IRB or legal approval.
              </p>
            </div>
          </aside>
        </section>
      ) : null}

      {view === "preview" ? (
        <section className={styles.previewView}>
          <aside>
            <h2>Participant preview</h2>
            <p>
              Read this as a prospective participant would. Formatting and
              runtime acceptance are implemented in Phase 10.
            </p>
            <label>
              <span>Preview form</span>
              <select
                onChange={(event) => {
                  setActivePreviewId(event.target.value);
                  if (
                    protocol.forms.some(
                      (form) => form.id === event.target.value,
                    )
                  )
                    setActiveFormId(event.target.value);
                }}
                value={activePreviewId}
              >
                <optgroup label="Main consent materials">
                  {protocol.forms.map((form) => (
                    <option key={form.id} value={form.id}>
                      {form.title}
                    </option>
                  ))}
                </optgroup>
                {protocol.phase6.artifacts.length > 0 ? (
                  <optgroup label="Protocol-module artifacts">
                    {protocol.phase6.artifacts.map((artifact) => (
                      <option key={artifact.id} value={artifact.id}>
                        {artifact.title}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {protocol.phase8.artifacts.length > 0 ? (
                  <optgroup label="Biomedical and data-use artifacts">
                    {protocol.phase8.artifacts.map((artifact) => (
                      <option key={artifact.id} value={artifact.id}>
                        {artifact.title}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {protocol.phase7.artifacts.length > 0 ? (
                  <optgroup label="Protected-audience artifacts">
                    {protocol.phase7.artifacts.map((artifact) => (
                      <option key={artifact.id} value={artifact.id}>
                        {artifact.title}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </label>
            <dl>
              <div>
                <dt>Audience</dt>
                <dd>{activePhase7Artifact?.audience ?? "Adult participant"}</dd>
              </div>
              <div>
                <dt>Language</dt>
                <dd>
                  {activePhase7Artifact?.language || "English (United States)"}
                </dd>
              </div>
              <div>
                <dt>Decision</dt>
                <dd>
                  {(activePhase7Artifact
                    ? "protected-audience material"
                    : (activePhase6Artifact?.decisionMode ??
                      activeForm?.decisionMode)
                  )?.replaceAll("-", " ")}
                </dd>
              </div>
              <div>
                <dt>Runtime</dt>
                <dd>
                  Authoring and export only; runtime delivery remains gated
                </dd>
              </div>
            </dl>
            {activePhase6Artifact ? (
              <button
                className={
                  activePhase6Artifact.reviewState === "human-reviewed"
                    ? styles.reviewedArtifactButton
                    : undefined
                }
                onClick={() =>
                  mutateProtocol((current) =>
                    reviewConsentPhase6Artifact(
                      current,
                      activePhase6Artifact.id,
                      activePhase6Artifact.reviewState === "human-reviewed"
                        ? "human-review-required"
                        : "human-reviewed",
                    ),
                  )
                }
                type="button"
              >
                <AppIcon name="check-square" />
                {activePhase6Artifact.reviewState === "human-reviewed"
                  ? "Reviewed for this study"
                  : "Mark artifact human reviewed"}
              </button>
            ) : null}
            {activePhase7Artifact ? (
              <button
                className={
                  activePhase7Artifact.reviewState === "human-reviewed"
                    ? styles.reviewedArtifactButton
                    : undefined
                }
                disabled={
                  activePhase7Artifact.kind === "translated-variant" &&
                  activePhase7Artifact.qualifiedReviewState !==
                    "qualified-human-reviewed"
                }
                onClick={() =>
                  mutateProtocol((current) =>
                    reviewConsentPhase7Artifact(
                      current,
                      activePhase7Artifact.id,
                      activePhase7Artifact.reviewState === "human-reviewed"
                        ? "human-review-required"
                        : "human-reviewed",
                    ),
                  )
                }
                type="button"
              >
                <AppIcon name="check-square" />
                {activePhase7Artifact.reviewState === "human-reviewed"
                  ? "Reviewed for this study"
                  : activePhase7Artifact.kind === "translated-variant" &&
                      activePhase7Artifact.qualifiedReviewState !==
                        "qualified-human-reviewed"
                    ? "Qualified language review required first"
                    : "Mark artifact human reviewed"}
              </button>
            ) : null}
          </aside>
          <article className={styles.participantDocument}>
            {(activePhase7Artifact
              ? phase7ParticipantPreview(protocol, activePhase7Artifact.id)
              : activePhase8Artifact
                ? phase8ParticipantPreview(protocol, activePhase8Artifact.id)
                : activePhase6Artifact
                  ? phase6ParticipantPreview(protocol, activePhase6Artifact.id)
                  : participantConsentPreview(protocol, activeForm?.id)
            )
              .split("\n\n")
              .map((paragraph, index) =>
                index === 0 ? (
                  <h2 key={paragraph}>{paragraph}</h2>
                ) : index % 2 === 1 ? (
                  <h3 key={`${paragraph}-${index}`}>{paragraph}</h3>
                ) : (
                  <p key={`${paragraph}-${index}`}>{paragraph}</p>
                ),
              )}
          </article>
        </section>
      ) : null}

      {view === "review" ? (
        <section className={styles.reviewView}>
          <div className={styles.reviewIssues}>
            <header>
              <div>
                <h2>Issue center</h2>
                <p>Every issue names the artifact the researcher can repair.</p>
              </div>
              <strong>
                {blocking.length} blocking · {warnings.length} warning
              </strong>
            </header>
            {blocking.length === 0 ? (
              <div className={styles.allClear}>
                <AppIcon name="check-square" />
                <div>
                  <strong>Ready for a versioned review package</strong>
                  <span>This is an authoring gate, not an approval.</span>
                </div>
              </div>
            ) : null}
            {issues.length > 0 ? (
              <ol>
                {issues.map((issue) => (
                  <li key={issue.id}>
                    <button onClick={() => chooseIssue(issue)} type="button">
                      <span
                        className={
                          issue.severity === "blocking"
                            ? styles.blockingMark
                            : styles.warningMark
                        }
                      >
                        {issue.severity}
                      </span>
                      <strong>{issue.message}</strong>
                      <small>
                        {issue.repairTarget}
                        <AppIcon name="arrow-right" />
                      </small>
                    </button>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
          <aside className={styles.reviewLedger}>
            <h2>Version and export ledger</h2>
            <p>
              Snapshots and exports are checksum-bound. Neither represents
              institutional approval.
            </p>
            <dl>
              <div>
                <dt>Draft versions</dt>
                <dd>{protocol.versions.length}</dd>
              </div>
              <div>
                <dt>Review exports</dt>
                <dd>{protocol.exports.length}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{shortChecksum(protocol.sourceFingerprint.checksum)}</dd>
              </div>
              <div>
                <dt>Authority</dt>
                <dd>{protocol.authorityManifest.profileVersion}</dd>
              </div>
            </dl>
            <label>
              <span>Researcher notes</span>
              <textarea
                onChange={(event) =>
                  mutateProtocol((current) => ({
                    ...current,
                    researcherNotes: event.target.value.slice(0, 20_000),
                    updatedAt: new Date().toISOString(),
                  }))
                }
                placeholder="Record unresolved questions, institutional feedback, or the reason for a version."
                rows={7}
                value={protocol.researcherNotes}
              />
            </label>
            <button onClick={() => void saveVersion()} type="button">
              <AppIcon name="save" />
              Save checksum-bound draft version
            </button>
          </aside>
        </section>
      ) : null}

      {view === "form" || view === "review" ? (
        <ConsentAssistantPanel
          activeClause={activeClause}
          activeForm={activeForm}
          onProtocolChange={setProtocol}
          onStatusChange={setStatus}
          projectId={projectId}
          protocol={protocol}
        />
      ) : null}

      {view === "review" ? (
        <ConsentRuntimePanel
          onBind={bindParticipantRuntime}
          protocol={protocol}
          sourceFingerprint={source.sourceFingerprint}
          studio={studio}
        />
      ) : null}

      <footer className={styles.actionRail}>
        <div className={styles.saveMessage} aria-live="polite">
          <AppIcon name="save" />
          {status}
        </div>
        <div>
          <span>Version</span>
          <strong>{latestVersion || "Draft"}</strong>
        </div>
        <div>
          <span>Source changes</span>
          <strong>{sourceStale ? 1 : 0}</strong>
        </div>
        <div>
          <span>Blocking issues</span>
          <strong
            className={blocking.length > 0 ? styles.blockingCount : undefined}
          >
            {blocking.length}
          </strong>
        </div>
        <button onClick={() => void saveVersion()} type="button">
          <AppIcon name="save" />
          Save draft version
        </button>
        <button
          className={styles.exportButton}
          disabled={blocking.length > 0 || sourceStale}
          onClick={() => void exportPackage()}
          type="button"
        >
          <AppIcon name="download" />
          Export review package
        </button>
      </footer>
    </div>
  );
}

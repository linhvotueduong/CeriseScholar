"use client";

import { useState } from "react";
import { AppIcon, type AppIconName } from "@/components/app-shell/AppIcons";
import type { ConsentPhase5Document } from "@/lib/research/consentPhase5";
import {
  CONSENT_PHASE_8_MODULES,
  collectConsentPhase8Suggestions,
  getConsentPhase8Module,
  recordConsentPhase8SpecialistReview,
  removeConsentPhase8ExternalAddendum,
  reviewConsentPhase8Artifact,
  updateConsentPhase8SpecialistReviewDraft,
  updateConsentPhase8State,
  upsertConsentPhase8ExternalAddendum,
  type ConsentPhase8Issue,
} from "@/lib/research/consentPhase8";
import type {
  ConsentPhase8ExternalAddendumKind,
  ConsentPhase8ModuleId,
  ConsentPhase8ModuleState,
  ConsentPhase8ScopeStatus,
  ConsentPhase8State,
} from "@/lib/research/consentPhase8Model";
import styles from "./ConsentPhase8Workspace.module.css";

interface Props {
  activeModuleId: ConsentPhase8ModuleId;
  issues: ConsentPhase8Issue[];
  onActiveModuleChange: (id: ConsentPhase8ModuleId) => void;
  onProtocolChange: (document: ConsentPhase5Document) => void;
  protocol: ConsentPhase5Document;
}

const ICONS: Record<ConsentPhase8ModuleId, AppIconName> = {
  "regulated-intervention": "research",
  "procedure-exposure": "target",
  "results-return": "mail",
  "specimens-genomics": "workflow",
  "data-sharing-future-use": "globe",
  "broad-consent": "file",
  "privacy-addenda": "lock",
  "fda-electronic-process": "laptop",
};

const SCOPE_OPTIONS: ReadonlyArray<{
  value: ConsentPhase8ScopeStatus;
  label: string;
}> = [
  { value: "not-determined", label: "Not determined" },
  {
    value: "applicable-by-human-determination",
    label: "Applicable — human determination",
  },
  {
    value: "not-applicable-by-human-determination",
    label: "Not applicable — human determination",
  },
];

async function addendumFromFile(
  file: File,
  kind: ConsentPhase8ExternalAddendumKind,
  authorityReference: string,
) {
  if (file.size > 20 * 1024 * 1024)
    throw new Error("External addenda must be 20 MB or smaller.");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return {
    id: `addendum-${hex.slice(0, 20)}`,
    kind,
    title: file.name.replace(/\.[^.]+$/, "").slice(0, 500),
    filename: file.name.slice(0, 255),
    mediaType: (file.type || "application/octet-stream").slice(0, 160),
    byteLength: file.size,
    checksum: `sha256:${hex}` as const,
    importedAt: new Date().toISOString(),
    authorityReference: authorityReference.slice(0, 2_000),
    contentsStored: false as const,
  };
}

function moduleStatus(
  module: ConsentPhase8ModuleState,
  issueCount: number,
  suggested: boolean,
): string {
  if (module.applicability === "not-configured")
    return suggested ? "Suggested · decision needed" : "Decision needed";
  if (module.applicability === "not-applicable") return "Not applicable";
  return issueCount > 0
    ? `${issueCount} issue${issueCount === 1 ? "" : "s"}`
    : "Ready for review";
}

export default function ConsentPhase8Workspace({
  activeModuleId,
  issues,
  onActiveModuleChange,
  onProtocolChange,
  protocol,
}: Props) {
  const [addendumKind, setAddendumKind] =
    useState<ConsentPhase8ExternalAddendumKind>("hipaa-authorization");
  const [addendumAuthority, setAddendumAuthority] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const active = getConsentPhase8Module(protocol.phase8, activeModuleId);
  const definition =
    CONSENT_PHASE_8_MODULES.find((item) => item.id === activeModuleId) ??
    CONSENT_PHASE_8_MODULES[0];
  const artifact = protocol.phase8.artifacts.find(
    (item) => item.moduleId === activeModuleId,
  );
  const suggestions = new Set(collectConsentPhase8Suggestions(protocol));
  const activeIssues = issues.filter(
    (issue) =>
      issue.specializedModuleId === activeModuleId ||
      !issue.specializedModuleId,
  );
  const change = (updater: (state: ConsentPhase8State) => ConsentPhase8State) =>
    onProtocolChange(updateConsentPhase8State(protocol, updater));
  const patchProfile = (patch: Partial<ConsentPhase8State["profile"]>) =>
    change((state) => ({ ...state, profile: { ...state.profile, ...patch } }));
  const patchActive = (patch: Partial<ConsentPhase8ModuleState>) =>
    change((state) => ({
      ...state,
      modules: {
        ...state.modules,
        [activeModuleId]: { ...state.modules[activeModuleId], ...patch },
      },
    }));
  const patchValue = (fieldId: string, value: string) =>
    patchActive({ values: { ...active.values, [fieldId]: value } });

  return (
    <section className={styles.workspace}>
      <div className={styles.catalog}>
        <header>
          <div>
            <span>Phase 8 · specialized consent</span>
            <h2>Biomedical & data-use modules</h2>
            <p>
              Bind specialized consent text to explicit procedures, a
              human-determined regulatory profile, and qualified review. Cerise
              never infers legal status from keywords.
            </p>
          </div>
          <div className={styles.legend}>
            <i />
            Human determination
            <i />
            Compiled artifact
          </div>
        </header>

        <div className={styles.profileBand}>
          <div className={styles.profileTitle}>
            <div>
              <span>Study regulatory profile</span>
              <strong>Local authority, explicit scope</strong>
            </div>
            <small>
              {protocol.phase8.profile.requiredModules.length} required ·{" "}
              {protocol.phase8.artifacts.length} compiled
            </small>
          </div>
          <div className={styles.profileGrid}>
            <label>
              <span>Decision source</span>
              <select
                value={protocol.phase8.profile.determinationSource}
                onChange={(event) =>
                  patchProfile({
                    determinationSource: event.target
                      .value as ConsentPhase8State["profile"]["determinationSource"],
                  })
                }
              >
                <option value="none">Not recorded</option>
                <option value="researcher">Researcher declaration</option>
                <option value="institution">Institution determination</option>
              </select>
            </label>
            <label>
              <span>Jurisdiction</span>
              <input
                placeholder="Applicable country, state, province, or region"
                value={protocol.phase8.profile.jurisdiction}
                onChange={(event) =>
                  patchProfile({ jurisdiction: event.target.value })
                }
              />
            </label>
            <label className={styles.wide}>
              <span>Institution profile / protocol reference</span>
              <input
                placeholder="IRB, sponsor, privacy-office, protocol, or counsel reference"
                value={protocol.phase8.profile.institutionProfileReference}
                onChange={(event) =>
                  patchProfile({
                    institutionProfileReference: event.target.value,
                  })
                }
              />
            </label>
            {(
              [
                ["hhsCommonRuleStatus", "HHS Common Rule"],
                ["fdaRegulatedStatus", "FDA-regulated investigation"],
                ["hipaaStatus", "HIPAA research authorization"],
                ["gdprStatus", "GDPR privacy notice"],
                ["nihGenomicDataSharingStatus", "NIH genomic data sharing"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <select
                  value={protocol.phase8.profile[key]}
                  onChange={(event) =>
                    patchProfile({
                      [key]: event.target.value as ConsentPhase8ScopeStatus,
                    })
                  }
                >
                  {SCOPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              <span>Specialist escalation contacts</span>
              <textarea
                rows={2}
                placeholder="Clinical, pharmacy, radiation safety, genetics, privacy, IRB, or regulatory contacts"
                value={protocol.phase8.profile.specialistEscalationContacts}
                onChange={(event) =>
                  patchProfile({
                    specialistEscalationContacts: event.target.value,
                  })
                }
              />
            </label>
          </div>
          <fieldset className={styles.requiredModules}>
            <legend>Institution-declared required modules</legend>
            <div>
              {CONSENT_PHASE_8_MODULES.map((item) => (
                <label key={item.id}>
                  <input
                    type="checkbox"
                    checked={protocol.phase8.profile.requiredModules.includes(
                      item.id,
                    )}
                    onChange={(event) =>
                      patchProfile({
                        requiredModules: event.target.checked
                          ? [
                              ...protocol.phase8.profile.requiredModules,
                              item.id,
                            ]
                          : protocol.phase8.profile.requiredModules.filter(
                              (id) => id !== item.id,
                            ),
                      })
                    }
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className={styles.moduleList}>
          {CONSENT_PHASE_8_MODULES.map((item, index) => {
            const moduleState = getConsentPhase8Module(
              protocol.phase8,
              item.id,
            );
            const count = issues.filter(
              (issue) => issue.specializedModuleId === item.id,
            ).length;
            const suggested = suggestions.has(item.id);
            return (
              <button
                className={
                  item.id === activeModuleId
                    ? styles.moduleActive
                    : styles.moduleCard
                }
                key={item.id}
                onClick={() => onActiveModuleChange(item.id)}
                type="button"
              >
                <span className={styles.moduleIndex}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <AppIcon name={ICONS[item.id]} />
                <div>
                  <strong>{item.label}</strong>
                  <small
                    className={
                      count > 0 ||
                      moduleState.applicability === "not-configured"
                        ? styles.attention
                        : undefined
                    }
                  >
                    {moduleStatus(moduleState, count, suggested)}
                  </small>
                  <p>{item.detail}</p>
                </div>
                <AppIcon name="arrow-right" />
              </button>
            );
          })}
        </div>
      </div>

      <aside className={styles.inspector}>
        <header>
          <div>
            <span>Selected module</span>
            <h2>{definition.label}</h2>
          </div>
          <strong>{active.applicability.replaceAll("-", " ")}</strong>
        </header>
        <div className={styles.authorityBoundary}>
          <AppIcon name="shield" />
          <p>{definition.authorityNote}</p>
        </div>
        <div className={styles.commonFields}>
          <label>
            <span>Applicability</span>
            <select
              value={active.applicability}
              onChange={(event) =>
                patchActive({
                  applicability: event.target
                    .value as ConsentPhase8ModuleState["applicability"],
                })
              }
            >
              <option value="not-configured">Decision needed</option>
              <option value="not-applicable">Not applicable</option>
              <option value="applicable">Applicable</option>
            </select>
          </label>
          {active.applicability === "applicable" ? (
            <>
              <div className={styles.twoColumns}>
                <label>
                  <span>Determination source</span>
                  <select
                    value={active.determinationSource}
                    onChange={(event) =>
                      patchActive({
                        determinationSource: event.target
                          .value as ConsentPhase8ModuleState["determinationSource"],
                      })
                    }
                  >
                    <option value="none">Not recorded</option>
                    <option value="researcher">Researcher</option>
                    <option value="institution">Institution</option>
                  </select>
                </label>
                <label>
                  <span>Qualified reviewer role</span>
                  <input
                    placeholder="Role required to review this module"
                    value={active.specialistReviewRole}
                    onChange={(event) =>
                      patchActive({ specialistReviewRole: event.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                <span>Authority reference</span>
                <input
                  value={active.authorityReference}
                  onChange={(event) =>
                    patchActive({ authorityReference: event.target.value })
                  }
                />
              </label>
              {active.determinationSource === "researcher" ? (
                <label>
                  <span>Researcher rationale</span>
                  <textarea
                    rows={2}
                    value={active.researcherRationale}
                    onChange={(event) =>
                      patchActive({ researcherRationale: event.target.value })
                    }
                  />
                </label>
              ) : null}
              {definition.procedureMappingRequired ? (
                <>
                  <label>
                    <span>Protocol procedure reference</span>
                    <input
                      placeholder="Protocol section, intervention schedule, or procedure ID"
                      value={active.protocolProcedureReference}
                      onChange={(event) =>
                        patchActive({
                          protocolProcedureReference: event.target.value,
                        })
                      }
                    />
                  </label>
                  <fieldset>
                    <legend>Implemented study facts</legend>
                    {protocol.studyFacts.map((fact) => (
                      <label className={styles.factChoice} key={fact.id}>
                        <input
                          type="checkbox"
                          checked={active.sourceFactIds.includes(fact.id)}
                          onChange={(event) =>
                            patchActive({
                              sourceFactIds: event.target.checked
                                ? [...active.sourceFactIds, fact.id]
                                : active.sourceFactIds.filter(
                                    (id) => id !== fact.id,
                                  ),
                            })
                          }
                        />
                        <span>
                          <strong>{fact.label}</strong>
                          {fact.value}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <label>
                    <span>Participant-facing procedure summary</span>
                    <textarea
                      rows={3}
                      value={active.participantProcedureDescription}
                      onChange={(event) =>
                        patchActive({
                          participantProcedureDescription: event.target.value,
                        })
                      }
                    />
                  </label>
                </>
              ) : null}
            </>
          ) : null}
        </div>

        {active.applicability === "applicable" ? (
          <div className={styles.specificFields}>
            <h3>Structured module content</h3>
            {definition.fields.map((field) => (
              <label key={field.id}>
                <span>
                  {field.label}
                  {field.required ? <em>Required</em> : null}
                </span>
                {field.options ? (
                  <select
                    value={active.values[field.id] ?? ""}
                    onChange={(event) =>
                      patchValue(field.id, event.target.value)
                    }
                  >
                    <option value="">Select…</option>
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <textarea
                    rows={field.rows ?? 3}
                    value={active.values[field.id] ?? ""}
                    onChange={(event) =>
                      patchValue(field.id, event.target.value)
                    }
                  />
                )}
              </label>
            ))}
          </div>
        ) : null}

        {active.applicability === "applicable" &&
        activeModuleId === "privacy-addenda" ? (
          <div className={styles.addendaBox}>
            <h3>Institution-controlled addenda</h3>
            <p>
              Only filename, type, size, checksum, and authority reference are
              stored. The file contents remain outside Cerise.
            </p>
            <div className={styles.twoColumns}>
              <label>
                <span>Addendum kind</span>
                <select
                  value={addendumKind}
                  onChange={(event) =>
                    setAddendumKind(
                      event.target.value as ConsentPhase8ExternalAddendumKind,
                    )
                  }
                >
                  <option value="hipaa-authorization">
                    HIPAA authorization
                  </option>
                  <option value="gdpr-notice">GDPR privacy notice</option>
                  <option value="institutional-privacy-addendum">
                    Institutional privacy addendum
                  </option>
                </select>
              </label>
              <label>
                <span>Authority reference</span>
                <input
                  value={addendumAuthority}
                  onChange={(event) => setAddendumAuthority(event.target.value)}
                />
              </label>
            </div>
            <label className={styles.upload}>
              <AppIcon name="upload" />
              <span>Choose approved addendum to checksum</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.rtf,.txt"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try {
                    setAttachmentError("");
                    onProtocolChange(
                      upsertConsentPhase8ExternalAddendum(
                        protocol,
                        await addendumFromFile(
                          file,
                          addendumKind,
                          addendumAuthority,
                        ),
                      ),
                    );
                  } catch (error) {
                    setAttachmentError(
                      error instanceof Error
                        ? error.message
                        : "Could not checksum the addendum.",
                    );
                  }
                  event.currentTarget.value = "";
                }}
              />
            </label>
            {attachmentError ? (
              <p className={styles.error}>{attachmentError}</p>
            ) : null}
            <ul>
              {protocol.phase8.externalAddenda.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {item.kind.replaceAll("-", " ")} ·{" "}
                      {(item.byteLength / 1024).toFixed(1)} KB
                    </span>
                    <code>{item.checksum.slice(0, 22)}…</code>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onProtocolChange(
                        removeConsentPhase8ExternalAddendum(protocol, item.id),
                      )
                    }
                  >
                    <AppIcon name="trash" />
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {active.applicability === "applicable" ? (
          <div className={styles.boundaries}>
            <label>
              <input
                type="checkbox"
                checked={protocol.phase8.profile.noParticipantDataAcknowledged}
                onChange={(event) =>
                  patchProfile({
                    noParticipantDataAcknowledged: event.target.checked,
                  })
                }
              />
              <span>
                <strong>Protocol metadata only</strong>No participant PHI,
                genomic data, specimens, or results are stored here.
              </span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={protocol.phase8.profile.runtimeBoundaryAcknowledged}
                onChange={(event) =>
                  patchProfile({
                    runtimeBoundaryAcknowledged: event.target.checked,
                  })
                }
              />
              <span>
                <strong>Authoring and export only</strong>Identity, signature,
                clinical, repository, and privacy execution remain external.
              </span>
            </label>
          </div>
        ) : null}

        {artifact ? (
          <div className={styles.reviewBox}>
            <div>
              <span>Compiled artifact</span>
              <strong>{artifact.title}</strong>
              <small>
                {artifact.decisionMode.replaceAll("-", " ")} ·{" "}
                {artifact.reviewState.replaceAll("-", " ")}
              </small>
            </div>
            <label>
              <span>Specialist reviewer name</span>
              <input
                value={artifact.specialistReview.reviewerName}
                onChange={(event) =>
                  onProtocolChange(
                    updateConsentPhase8SpecialistReviewDraft(
                      protocol,
                      artifact.id,
                      { reviewerName: event.target.value },
                    ),
                  )
                }
              />
            </label>
            <label>
              <span>Role / credentials</span>
              <input
                value={artifact.specialistReview.reviewerRoleOrCredentials}
                onChange={(event) =>
                  onProtocolChange(
                    updateConsentPhase8SpecialistReviewDraft(
                      protocol,
                      artifact.id,
                      { reviewerRoleOrCredentials: event.target.value },
                    ),
                  )
                }
              />
            </label>
            <label>
              <span>Review or approval reference</span>
              <input
                value={artifact.specialistReview.reviewReference}
                onChange={(event) =>
                  onProtocolChange(
                    updateConsentPhase8SpecialistReviewDraft(
                      protocol,
                      artifact.id,
                      { reviewReference: event.target.value },
                    ),
                  )
                }
              />
            </label>
            <div className={styles.reviewActions}>
              <button
                type="button"
                onClick={() =>
                  onProtocolChange(
                    recordConsentPhase8SpecialistReview(
                      protocol,
                      artifact.id,
                      artifact.specialistReview.reviewerName,
                      artifact.specialistReview.reviewerRoleOrCredentials,
                      artifact.specialistReview.reviewReference,
                    ),
                  )
                }
              >
                <AppIcon name="shield" />
                Record specialist review
              </button>
              <button
                disabled={artifact.specialistReview.state !== "human-reviewed"}
                type="button"
                onClick={() =>
                  onProtocolChange(
                    reviewConsentPhase8Artifact(
                      protocol,
                      artifact.id,
                      "human-reviewed",
                    ),
                  )
                }
              >
                <AppIcon name="check-square" />
                Record artifact review
              </button>
            </div>
          </div>
        ) : null}

        {activeIssues.length > 0 ? (
          <div className={styles.issueList}>
            <h3>Repair before review export</h3>
            <ul>
              {activeIssues.slice(0, 12).map((issue) => (
                <li key={issue.id}>
                  <span>{issue.severity}</span>
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <footer className={styles.sourceFooter}>
          <span>Primary sources for this module</span>
          {definition.sourceUrls.map((source) => (
            <a
              href={source.url}
              key={source.url}
              target="_blank"
              rel="noreferrer"
            >
              {source.label}
              <AppIcon name="external-link" />
            </a>
          ))}
        </footer>
      </aside>
    </section>
  );
}

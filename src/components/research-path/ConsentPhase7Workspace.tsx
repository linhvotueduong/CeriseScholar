"use client";

import { AppIcon } from "@/components/app-shell/AppIcons";
import type { ConsentPhase5Document } from "@/lib/research/consentPhase5";
import {
  CONSENT_PHASE_7_PACKAGES,
  getConsentPhase7Package,
  recordConsentPhase7QualifiedReview,
  updateConsentPhase7State,
  type ConsentPhase7Issue,
} from "@/lib/research/consentPhase7";
import type {
  ConsentPhase7Decision,
  ConsentPhase7PackageId,
  ConsentPhase7State,
} from "@/lib/research/consentPhase7Model";
import styles from "./ConsentPhase7Workspace.module.css";

interface Props {
  activePackageId: ConsentPhase7PackageId;
  issues: ConsentPhase7Issue[];
  onActivePackageChange: (id: ConsentPhase7PackageId) => void;
  onProtocolChange: (document: ConsentPhase5Document) => void;
  protocol: ConsentPhase5Document;
}

function statusLabel(
  decision: ConsentPhase7Decision,
  issueCount: number,
): string {
  if (decision.applicability === "not-configured") return "Decision needed";
  if (decision.applicability === "not-applicable") return "Not applicable";
  return issueCount > 0
    ? `${issueCount} issue${issueCount === 1 ? "" : "s"}`
    : "Package complete";
}

export default function ConsentPhase7Workspace({
  activePackageId,
  issues,
  onActivePackageChange,
  onProtocolChange,
  protocol,
}: Props) {
  const active = getConsentPhase7Package(protocol.phase7, activePackageId);
  const definition =
    CONSENT_PHASE_7_PACKAGES.find((item) => item.id === activePackageId) ??
    CONSENT_PHASE_7_PACKAGES[0];
  const activeIssues = issues.filter(
    (issue) => issue.packageId === activePackageId || !issue.packageId,
  );
  const change = (updater: (state: ConsentPhase7State) => ConsentPhase7State) =>
    onProtocolChange(updateConsentPhase7State(protocol, updater));
  const patchActive = (patch: Partial<ConsentPhase7Decision>) =>
    change((state) => {
      switch (activePackageId) {
        case "parental-permission":
          return {
            ...state,
            parentalPermission: { ...state.parentalPermission, ...patch },
          };
        case "assent":
          return { ...state, assent: { ...state.assent, ...patch } };
        case "lar-surrogate":
          return {
            ...state,
            larSurrogate: { ...state.larSurrogate, ...patch },
          };
        case "accessible-oral":
          return {
            ...state,
            accessibleOral: { ...state.accessibleOral, ...patch },
          };
        case "translated-variant":
          return {
            ...state,
            translatedVariant: { ...state.translatedVariant, ...patch },
          };
        case "short-form":
          return { ...state, shortForm: { ...state.shortForm, ...patch } };
      }
    });
  const sources = [
    ...protocol.forms.map((item) => ({ id: item.id, title: item.title })),
    ...protocol.phase6.artifacts.map((item) => ({
      id: item.id,
      title: item.title,
    })),
    ...protocol.phase8.artifacts.map((item) => ({
      id: item.id,
      title: item.title,
    })),
    ...protocol.phase7.artifacts
      .filter((item) => item.packageId !== activePackageId)
      .map((item) => ({ id: item.id, title: item.title })),
  ];

  return (
    <section className={styles.workspace}>
      <div className={styles.catalog}>
        <header>
          <div>
            <span>Phase 7 · protected audiences</span>
            <h2>Audience packages</h2>
            <p>
              Declare which distinct participant, representative, accessibility,
              or language artifacts this study needs.
            </p>
          </div>
          <div className={styles.legend}>
            <i />
            Human or institution decision
            <i />
            Compiled artifact
          </div>
        </header>
        <div className={styles.profileCard}>
          <div>
            <span>Institution profile</span>
            <strong>Rules stay local—not global defaults</strong>
          </div>
          <div className={styles.profileGrid}>
            <label>
              <span>Profile decision source</span>
              <select
                value={protocol.phase7.profile.determinationSource}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    profile: {
                      ...state.profile,
                      determinationSource: event.target
                        .value as typeof state.profile.determinationSource,
                    },
                  }))
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
                placeholder="Country, state/province, or applicable jurisdiction"
                value={protocol.phase7.profile.jurisdiction}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    profile: {
                      ...state.profile,
                      jurisdiction: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <label className={styles.wide}>
              <span>Authority or protocol reference</span>
              <input
                placeholder="IRB determination, institutional policy, protocol section, or counsel reference"
                value={protocol.phase7.profile.authorityReference}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    profile: {
                      ...state.profile,
                      authorityReference: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <label className={styles.wide}>
              <span>Local contacts and escalation</span>
              <textarea
                rows={2}
                placeholder="Participant-rights office, IRB, interpreter/accessibility coordinator, or legal contact"
                value={protocol.phase7.profile.localContacts}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    profile: {
                      ...state.profile,
                      localContacts: event.target.value,
                    },
                  }))
                }
              />
            </label>
          </div>
          <fieldset>
            <legend>Institution-declared required packages</legend>
            <div className={styles.requiredGrid}>
              {CONSENT_PHASE_7_PACKAGES.map((item) => (
                <label key={item.id}>
                  <input
                    type="checkbox"
                    checked={protocol.phase7.profile.requiredPackages.includes(
                      item.id,
                    )}
                    onChange={(event) =>
                      change((state) => ({
                        ...state,
                        profile: {
                          ...state.profile,
                          requiredPackages: event.target.checked
                            ? [...state.profile.requiredPackages, item.id]
                            : state.profile.requiredPackages.filter(
                                (id) => id !== item.id,
                              ),
                        },
                      }))
                    }
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className={styles.packageGrid}>
          {CONSENT_PHASE_7_PACKAGES.map((item) => {
            const packageState = getConsentPhase7Package(
              protocol.phase7,
              item.id,
            );
            const count = issues.filter(
              (issue) => issue.packageId === item.id,
            ).length;
            return (
              <button
                className={
                  item.id === activePackageId
                    ? styles.packageActive
                    : styles.packageCard
                }
                key={item.id}
                onClick={() => onActivePackageChange(item.id)}
                type="button"
              >
                <AppIcon
                  name={
                    item.id === "translated-variant"
                      ? "globe"
                      : item.id === "accessible-oral"
                        ? "user"
                        : "users"
                  }
                />
                <div>
                  <strong>{item.label}</strong>
                  <span className={count > 0 ? styles.attention : undefined}>
                    {statusLabel(packageState, count)}
                  </span>
                  <p>{item.detail}</p>
                </div>
                <small>
                  Configure
                  <AppIcon name="arrow-right" />
                </small>
              </button>
            );
          })}
        </div>
      </div>

      <aside className={styles.inspector}>
        <header>
          <div>
            <span>Selected package</span>
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
                    .value as ConsentPhase7Decision["applicability"],
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
                          .value as ConsentPhase7Decision["determinationSource"],
                      })
                    }
                  >
                    <option value="none">Not recorded</option>
                    <option value="researcher">Researcher</option>
                    <option value="institution">Institution</option>
                  </select>
                </label>
                <label>
                  <span>Authority reference</span>
                  <input
                    value={active.authorityReference}
                    onChange={(event) =>
                      patchActive({ authorityReference: event.target.value })
                    }
                  />
                </label>
              </div>
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
            </>
          ) : null}
        </div>

        {active.applicability === "applicable" &&
        activePackageId === "parental-permission" ? (
          <div className={styles.specificFields}>
            <h3>Permission rule and child-centered process</h3>
            <label>
              <span>Parent or guardian audience</span>
              <input
                value={protocol.phase7.parentalPermission.participantGroup}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    parentalPermission: {
                      ...state.parentalPermission,
                      participantGroup: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <label>
              <span>Human-determined permission rule</span>
              <select
                value={protocol.phase7.parentalPermission.permissionRule}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    parentalPermission: {
                      ...state.parentalPermission,
                      permissionRule: event.target
                        .value as typeof state.parentalPermission.permissionRule,
                    },
                  }))
                }
              >
                <option value="not-determined">Not determined</option>
                <option value="one-parent-by-human-determination">
                  One parent — human determination
                </option>
                <option value="two-parent-by-human-determination">
                  Two parents — human determination
                </option>
                <option value="other-institution-rule">
                  Other institution rule
                </option>
                <option value="waived-by-human-authority">
                  Waived by human authority
                </option>
              </select>
            </label>
            <label>
              <span>Permission-rule reference</span>
              <input
                value={
                  protocol.phase7.parentalPermission.permissionRuleReference
                }
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    parentalPermission: {
                      ...state.parentalPermission,
                      permissionRuleReference: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <label>
              <span>Permission and documentation process</span>
              <textarea
                rows={3}
                value={protocol.phase7.parentalPermission.permissionProcess}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    parentalPermission: {
                      ...state.parentalPermission,
                      permissionProcess: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <label>
              <span>Child privacy and wishes</span>
              <textarea
                rows={3}
                value={protocol.phase7.parentalPermission.childPrivacyPlan}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    parentalPermission: {
                      ...state.parentalPermission,
                      childPrivacyPlan: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <label>
              <span>Parent or guardian permission text</span>
              <textarea
                rows={7}
                value={protocol.phase7.parentalPermission.participantText}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    parentalPermission: {
                      ...state.parentalPermission,
                      participantText: event.target.value,
                    },
                  }))
                }
              />
            </label>
          </div>
        ) : null}

        {active.applicability === "applicable" &&
        activePackageId === "assent" ? (
          <div className={styles.specificFields}>
            <h3>Affirmative assent, dissent, and transition</h3>
            <label>
              <span>Audience / participant group</span>
              <input
                placeholder="Describe the group; do not rely on a universal age band"
                value={protocol.phase7.assent.participantGroup}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    assent: {
                      ...state.assent,
                      participantGroup: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <label>
              <span>Developmental and communication description</span>
              <textarea
                rows={2}
                value={protocol.phase7.assent.developmentalDescription}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    assent: {
                      ...state.assent,
                      developmentalDescription: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <label>
              <span>Capability assessment plan</span>
              <textarea
                rows={2}
                value={protocol.phase7.assent.capabilityAssessmentPlan}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    assent: {
                      ...state.assent,
                      capabilityAssessmentPlan: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <label>
              <span>Affirmative assent process</span>
              <textarea
                rows={2}
                value={protocol.phase7.assent.assentProcess}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    assent: {
                      ...state.assent,
                      assentProcess: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <label>
              <span>Dissent, resistance, and withdrawal handling</span>
              <textarea
                rows={3}
                value={protocol.phase7.assent.dissentHandling}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    assent: {
                      ...state.assent,
                      dissentHandling: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <label>
              <span>Assent documentation method</span>
              <input
                value={protocol.phase7.assent.documentationMethod}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    assent: {
                      ...state.assent,
                      documentationMethod: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <label>
              <span>Linked parent-permission artifact</span>
              <select
                value={protocol.phase7.assent.linkedParentPermissionArtifactId}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    assent: {
                      ...state.assent,
                      linkedParentPermissionArtifactId: event.target.value,
                    },
                  }))
                }
              >
                <option value="">No link recorded</option>
                <option value="phase7-parental-permission">
                  Parent or guardian permission
                </option>
              </select>
            </label>
            <label>
              <span>Age-of-majority monitoring and direct-consent plan</span>
              <textarea
                rows={2}
                value={protocol.phase7.assent.ageOfMajorityPlan}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    assent: {
                      ...state.assent,
                      ageOfMajorityPlan: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <label>
              <span>Age-of-majority authority reference</span>
              <input
                value={protocol.phase7.assent.ageOfMajorityRuleReference}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    assent: {
                      ...state.assent,
                      ageOfMajorityRuleReference: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <label>
              <span>Developmentally appropriate assent text</span>
              <textarea
                rows={7}
                value={protocol.phase7.assent.participantText}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    assent: {
                      ...state.assent,
                      participantText: event.target.value,
                    },
                  }))
                }
              />
            </label>
          </div>
        ) : null}

        {active.applicability === "applicable" &&
        activePackageId === "lar-surrogate" ? (
          <div className={styles.specificFields}>
            <h3>Capacity, authority, involvement, and transition</h3>
            {(
              [
                ["participantGroup", "Participant and representative group"],
                ["capacityAssessmentPlan", "Human capacity-assessment plan"],
                [
                  "authorityBasis",
                  "Applicable-law or institution-policy authority basis",
                ],
                [
                  "representativeSelectionProcess",
                  "Representative selection and verification",
                ],
                [
                  "participantInvolvementPlan",
                  "Participant involvement to the extent possible",
                ],
                [
                  "dissentHandling",
                  "Objection, resistance, and dissent handling",
                ],
                ["capacityReassessmentPlan", "Capacity reassessment plan"],
                [
                  "directConsentTransitionPlan",
                  "Direct-consent transition if capacity returns",
                ],
                ["participantText", "Representative-facing consent text"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <textarea
                  rows={key === "participantText" ? 7 : 2}
                  value={protocol.phase7.larSurrogate[key]}
                  onChange={(event) =>
                    change((state) => ({
                      ...state,
                      larSurrogate: {
                        ...state.larSurrogate,
                        [key]: event.target.value,
                      },
                    }))
                  }
                />
              </label>
            ))}
          </div>
        ) : null}

        {active.applicability === "applicable" &&
        activePackageId === "accessible-oral" ? (
          <div className={styles.specificFields}>
            <h3>Accessible communication and documentation</h3>
            {(
              [
                ["participantGroup", "Audience and accommodation context"],
                ["accommodationNeed", "Communication or accessibility need"],
                ["communicationMethod", "Oral or adapted presentation method"],
                ["comprehensionCheck", "Comprehension check"],
                [
                  "alternativeIndicationMethod",
                  "Alternative approved indication method",
                ],
                ["copyDeliveryPlan", "Accessible copy delivery"],
                ["participantText", "Accessible presentation script"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <textarea
                  rows={key === "participantText" ? 7 : 2}
                  value={protocol.phase7.accessibleOral[key]}
                  onChange={(event) =>
                    change((state) => ({
                      ...state,
                      accessibleOral: {
                        ...state.accessibleOral,
                        [key]: event.target.value,
                      },
                    }))
                  }
                />
              </label>
            ))}
            <label>
              <span>Impartial-witness determination</span>
              <select
                value={protocol.phase7.accessibleOral.witnessDetermination}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    accessibleOral: {
                      ...state.accessibleOral,
                      witnessDetermination: event.target
                        .value as typeof state.accessibleOral.witnessDetermination,
                    },
                  }))
                }
              >
                <option value="not-determined">Not determined</option>
                <option value="required-by-human-determination">
                  Required by human determination
                </option>
                <option value="not-required-by-human-determination">
                  Not required by human determination
                </option>
              </select>
            </label>
            {protocol.phase7.accessibleOral.witnessDetermination ===
            "required-by-human-determination" ? (
              <label>
                <span>Witness impartiality and responsibilities</span>
                <textarea
                  rows={3}
                  value={protocol.phase7.accessibleOral.witnessPlan}
                  onChange={(event) =>
                    change((state) => ({
                      ...state,
                      accessibleOral: {
                        ...state.accessibleOral,
                        witnessPlan: event.target.value,
                      },
                    }))
                  }
                />
              </label>
            ) : null}
          </div>
        ) : null}

        {active.applicability === "applicable" &&
        activePackageId === "translated-variant" ? (
          <div className={styles.specificFields}>
            <h3>Source-bound language variant</h3>
            <label>
              <span>Language audience</span>
              <input
                value={protocol.phase7.translatedVariant.participantGroup}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    translatedVariant: {
                      ...state.translatedVariant,
                      participantGroup: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <label>
              <span>Source participant artifact</span>
              <select
                value={protocol.phase7.translatedVariant.sourceArtifactId}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    translatedVariant: {
                      ...state.translatedVariant,
                      sourceArtifactId: event.target.value,
                      qualifiedReviewState: "qualified-human-review-required",
                    },
                  }))
                }
              >
                {sources.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.twoColumns}>
              <label>
                <span>Source language</span>
                <input
                  value={protocol.phase7.translatedVariant.sourceLanguage}
                  onChange={(event) =>
                    change((state) => ({
                      ...state,
                      translatedVariant: {
                        ...state.translatedVariant,
                        sourceLanguage: event.target.value,
                        qualifiedReviewState: "qualified-human-review-required",
                      },
                    }))
                  }
                />
              </label>
              <label>
                <span>Target language</span>
                <input
                  placeholder="Language and locale"
                  value={protocol.phase7.translatedVariant.targetLanguage}
                  onChange={(event) =>
                    change((state) => ({
                      ...state,
                      translatedVariant: {
                        ...state.translatedVariant,
                        targetLanguage: event.target.value,
                        qualifiedReviewState: "qualified-human-review-required",
                      },
                    }))
                  }
                />
              </label>
            </div>
            <label>
              <span>Translation method</span>
              <select
                value={protocol.phase7.translatedVariant.translationMethod}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    translatedVariant: {
                      ...state.translatedVariant,
                      translationMethod: event.target
                        .value as typeof state.translatedVariant.translationMethod,
                      qualifiedReviewState: "qualified-human-review-required",
                    },
                  }))
                }
              >
                <option value="not-determined">Not determined</option>
                <option value="human-translation">Human translation</option>
                <option value="professional-service">
                  Professional translation service
                </option>
                <option value="ai-assisted-draft">
                  AI-assisted draft — qualified review still required
                </option>
              </select>
            </label>
            <label>
              <span>Translator qualifications and provenance</span>
              <textarea
                rows={2}
                value={
                  protocol.phase7.translatedVariant.translatorQualifications
                }
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    translatedVariant: {
                      ...state.translatedVariant,
                      translatorQualifications: event.target.value,
                      qualifiedReviewState: "qualified-human-review-required",
                    },
                  }))
                }
              />
            </label>
            <label>
              <span>Translated participant text</span>
              <textarea
                rows={8}
                value={protocol.phase7.translatedVariant.participantText}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    translatedVariant: {
                      ...state.translatedVariant,
                      participantText: event.target.value,
                      qualifiedReviewState: "qualified-human-review-required",
                    },
                  }))
                }
              />
            </label>
            <div className={styles.reviewBox}>
              <strong>Qualified human language review</strong>
              <label>
                <span>Reviewer name</span>
                <input
                  value={
                    protocol.phase7.translatedVariant.qualifiedReviewerName
                  }
                  onChange={(event) =>
                    change((state) => ({
                      ...state,
                      translatedVariant: {
                        ...state.translatedVariant,
                        qualifiedReviewerName: event.target.value,
                        qualifiedReviewState: "qualified-human-review-required",
                      },
                    }))
                  }
                />
              </label>
              <label>
                <span>Qualifications / credentials</span>
                <input
                  value={
                    protocol.phase7.translatedVariant
                      .qualifiedReviewerCredentials
                  }
                  onChange={(event) =>
                    change((state) => ({
                      ...state,
                      translatedVariant: {
                        ...state.translatedVariant,
                        qualifiedReviewerCredentials: event.target.value,
                        qualifiedReviewState: "qualified-human-review-required",
                      },
                    }))
                  }
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  onProtocolChange(
                    recordConsentPhase7QualifiedReview(
                      protocol,
                      protocol.phase7.translatedVariant.qualifiedReviewerName,
                      protocol.phase7.translatedVariant
                        .qualifiedReviewerCredentials,
                    ),
                  )
                }
              >
                <AppIcon name="check-square" />
                Record qualified human review
              </button>
              <small>
                {protocol.phase7.translatedVariant.qualifiedReviewState.replaceAll(
                  "-",
                  " ",
                )}
              </small>
            </div>
          </div>
        ) : null}

        {active.applicability === "applicable" &&
        activePackageId === "short-form" ? (
          <div className={styles.specificFields}>
            <h3>Approved short-form oral process</h3>
            <label>
              <span>Participant or representative group</span>
              <input
                value={protocol.phase7.shortForm.participantGroup}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    shortForm: {
                      ...state.shortForm,
                      participantGroup: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <label>
              <span>Why short form instead of a fully translated consent?</span>
              <textarea
                rows={3}
                value={protocol.phase7.shortForm.useRationale}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    shortForm: {
                      ...state.shortForm,
                      useRationale: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <label>
              <span>Linked full-summary source</span>
              <select
                value={protocol.phase7.shortForm.summaryArtifactId}
                onChange={(event) =>
                  change((state) => ({
                    ...state,
                    shortForm: {
                      ...state.shortForm,
                      summaryArtifactId: event.target.value,
                    },
                  }))
                }
              >
                {sources.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.twoColumns}>
              <label>
                <span>Summary source language</span>
                <input
                  value={protocol.phase7.shortForm.sourceLanguage}
                  onChange={(event) =>
                    change((state) => ({
                      ...state,
                      shortForm: {
                        ...state.shortForm,
                        sourceLanguage: event.target.value,
                      },
                    }))
                  }
                />
              </label>
              <label>
                <span>Short-form language</span>
                <input
                  value={protocol.phase7.shortForm.targetLanguage}
                  onChange={(event) =>
                    change((state) => ({
                      ...state,
                      shortForm: {
                        ...state.shortForm,
                        targetLanguage: event.target.value,
                      },
                    }))
                  }
                />
              </label>
            </div>
            <div className={styles.twoColumns}>
              <label>
                <span>Institutional approval</span>
                <select
                  value={protocol.phase7.shortForm.approvalStatus}
                  onChange={(event) =>
                    change((state) => ({
                      ...state,
                      shortForm: {
                        ...state.shortForm,
                        approvalStatus: event.target
                          .value as typeof state.shortForm.approvalStatus,
                      },
                    }))
                  }
                >
                  <option value="not-requested">Not requested</option>
                  <option value="requested">Requested</option>
                  <option value="approved">Approved</option>
                  <option value="denied">Denied</option>
                </select>
              </label>
              <label>
                <span>Approval reference</span>
                <input
                  value={protocol.phase7.shortForm.approvalReference}
                  onChange={(event) =>
                    change((state) => ({
                      ...state,
                      shortForm: {
                        ...state.shortForm,
                        approvalReference: event.target.value,
                      },
                    }))
                  }
                />
              </label>
            </div>
            {(
              [
                ["interpreterPlan", "Qualified interpreter responsibilities"],
                [
                  "witnessPlan",
                  "Witness attendance, comprehension, and signatures",
                ],
                [
                  "signatureResponsibilityPlan",
                  "Who signs the short form and summary",
                ],
                [
                  "copyDeliveryPlan",
                  "Copies delivered to participant or representative",
                ],
                ["participantText", "Institution-approved short-form text"],
                ["summaryText", "Full oral-presentation summary"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <textarea
                  rows={
                    key === "participantText" || key === "summaryText" ? 7 : 2
                  }
                  value={protocol.phase7.shortForm[key]}
                  onChange={(event) =>
                    change((state) => ({
                      ...state,
                      shortForm: {
                        ...state.shortForm,
                        [key]: event.target.value,
                      },
                    }))
                  }
                />
              </label>
            ))}
          </div>
        ) : null}

        {active.applicability === "applicable" ? (
          <label className={styles.runtimeBoundary}>
            <input
              type="checkbox"
              checked={protocol.phase7.profile.runtimeBoundaryAcknowledged}
              onChange={(event) =>
                change((state) => ({
                  ...state,
                  profile: {
                    ...state.profile,
                    runtimeBoundaryAcknowledged: event.target.checked,
                  },
                }))
              }
            />
            <span>
              <strong>Authoring-only boundary acknowledged</strong>Cerise does
              not execute identity, representative authority, interpreter,
              witness, signature, or custody workflows in Phase 7.
            </span>
          </label>
        ) : null}
        {activeIssues.length > 0 ? (
          <div className={styles.issueList}>
            <h3>Repair before review export</h3>
            <ul>
              {activeIssues.slice(0, 10).map((issue) => (
                <li key={issue.id}>
                  <span>{issue.severity}</span>
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <footer className={styles.sourceFooter}>
          <span>Primary guidance</span>
          <a
            href="https://www.hhs.gov/ohrp/regulations-and-policy/guidance/faq/informed-consent/index.html"
            target="_blank"
            rel="noreferrer"
          >
            OHRP consent FAQ
            <AppIcon name="external-link" />
          </a>
          <a
            href="https://irb.ucsf.edu/consent-and-assent-form-templates"
            target="_blank"
            rel="noreferrer"
          >
            UCSF current templates
            <AppIcon name="external-link" />
          </a>
        </footer>
      </aside>
    </section>
  );
}

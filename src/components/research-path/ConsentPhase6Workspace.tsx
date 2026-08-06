"use client";

import { useMemo, useState } from "react";
import { AppIcon, type AppIconName } from "@/components/app-shell/AppIcons";
import type { ConsentPhase5Document } from "@/lib/research/consentPhase5";
import {
  CONSENT_PHASE_6_MODULES,
  collectConsentPhase6Suggestions,
  createPhase6OptionalChoice,
  getConsentPhase6Module,
  updateConsentPhase6State,
  type ConsentPhase6Issue,
} from "@/lib/research/consentPhase6";
import type {
  ConsentPhase6ModuleId,
  ConsentPhase6State,
} from "@/lib/research/consentPhase6Model";
import styles from "./ConsentPhase6Workspace.module.css";

interface ConsentPhase6WorkspaceProps {
  activeModuleId?: ConsentPhase6ModuleId;
  issues: ConsentPhase6Issue[];
  onActiveModuleChange?: (moduleId: ConsentPhase6ModuleId) => void;
  onProtocolChange: (document: ConsentPhase5Document) => void;
  protocol: ConsentPhase5Document;
}

const ICONS: Record<ConsentPhase6ModuleId, AppIconName> = {
  behavioral: "workflow",
  "focus-group": "users",
  "disclosure-debrief": "shield",
  "recording-boundaries": "lock",
  telephone: "phone",
  lifecycle: "refresh",
  "optional-choices": "plus",
};

function statusLabel(
  protocol: ConsentPhase5Document,
  moduleId: ConsentPhase6ModuleId,
  suggested: ReadonlySet<ConsentPhase6ModuleId>,
  issueCount: number,
): string {
  const moduleState = getConsentPhase6Module(protocol.phase6, moduleId);
  if (moduleState.applicability === "applicable") return issueCount > 0 ? "Needs attention" : "Applied";
  if (moduleState.applicability === "not-applicable") return "Not applicable";
  return suggested.has(moduleId) ? "Suggested" : "Available";
}

export default function ConsentPhase6Workspace({ activeModuleId: controlledModuleId, issues, onActiveModuleChange, onProtocolChange, protocol }: ConsentPhase6WorkspaceProps) {
  const [localModuleId, setLocalModuleId] = useState<ConsentPhase6ModuleId>("behavioral");
  const activeModuleId = controlledModuleId ?? localModuleId;
  const setActiveModuleId = (moduleId: ConsentPhase6ModuleId) => {
    setLocalModuleId(moduleId);
    onActiveModuleChange?.(moduleId);
  };
  const suggested = useMemo(() => new Set(collectConsentPhase6Suggestions(protocol)), [protocol]);
  const definition = CONSENT_PHASE_6_MODULES.find((item) => item.id === activeModuleId) ?? CONSENT_PHASE_6_MODULES[0];
  const activeModule = getConsentPhase6Module(protocol.phase6, activeModuleId);
  const activeIssues = issues.filter((issue) => issue.moduleId === activeModuleId);

  const change = (updater: (state: ConsentPhase6State) => ConsentPhase6State) => {
    onProtocolChange(updateConsentPhase6State(protocol, updater));
  };
  const patchCommon = (patch: Partial<typeof activeModule>) => change((state) => {
    const key = ({
      behavioral: "behavioral",
      "focus-group": "focusGroup",
      "disclosure-debrief": "disclosure",
      "recording-boundaries": "recording",
      telephone: "telephone",
      lifecycle: "lifecycle",
      "optional-choices": "optionalChoices",
    } as const)[activeModuleId];
    return { ...state, [key]: { ...state[key], ...patch } } as ConsentPhase6State;
  });

  return (
    <section className={styles.moduleWorkspace}>
      <div className={styles.moduleCatalog}>
        <header>
          <div>
            <span>Participant-flow compiler</span>
            <h2>Configure protocol modules</h2>
            <p>Study facts can suggest a module. Only the researcher or applicable institution can declare that it applies.</p>
          </div>
          <div className={styles.legend}><i />Suggested from source <i />Researcher-applied</div>
        </header>
        <div className={styles.moduleGrid}>
          {CONSENT_PHASE_6_MODULES.map((item) => {
            const moduleIssues = issues.filter((issue) => issue.moduleId === item.id);
            const status = statusLabel(protocol, item.id, suggested, moduleIssues.length);
            return (
              <button
                aria-pressed={activeModuleId === item.id}
                className={activeModuleId === item.id ? styles.moduleCardActive : styles.moduleCard}
                key={item.id}
                onClick={() => setActiveModuleId(item.id)}
                type="button"
              >
                <AppIcon name={ICONS[item.id]} />
                <div><strong>{item.label}</strong><span className={status === "Needs attention" ? styles.statusAttention : undefined}>{status}</span><p>{item.detail}</p></div>
                <span className={styles.configure}>Configure<AppIcon name="arrow-right" /></span>
              </button>
            );
          })}
        </div>
      </div>

      <aside className={styles.moduleInspector}>
        <header>
          <div><span>Selected module</span><h2>{definition.label}</h2></div>
          <strong>{statusLabel(protocol, activeModuleId, suggested, activeIssues.length)}</strong>
        </header>
        <div className={styles.authorityBoundary} role="note">
          <AppIcon name="shield" />
          <p>{definition.authorityNote}</p>
        </div>
        <div className={styles.commonFields}>
          <label><span>Applicability decision</span><select value={activeModule.applicability} onChange={(event) => patchCommon({ applicability: event.target.value as typeof activeModule.applicability })}>
            <option value="not-configured">Not configured</option><option value="not-applicable">Researcher determined not applicable</option><option value="applicable">Applicable to this protocol</option>
          </select></label>
          {activeModule.applicability === "applicable" ? <>
            <label><span>Determination source</span><select value={activeModule.determinationSource} onChange={(event) => patchCommon({ determinationSource: event.target.value as typeof activeModule.determinationSource })}>
              <option value="none">Not recorded</option><option value="researcher">Researcher declaration</option><option value="institution">Institution determination</option>
            </select></label>
            <label><span>Protocol or authority reference</span><input placeholder="Protocol, IRB record, policy, or documented researcher determination" value={activeModule.authorityReference} onChange={(event) => patchCommon({ authorityReference: event.target.value })} /></label>
            <label><span>Researcher rationale</span><textarea rows={2} value={activeModule.researcherRationale} onChange={(event) => patchCommon({ researcherRationale: event.target.value })} /></label>
          </> : null}
        </div>

        {activeModule.applicability === "applicable" && activeModuleId === "behavioral" ? (
          <div className={styles.specificFields}>
            <h3>Task and assignment disclosure</h3>
            <label><span>Participant-facing assignment or randomization</span><textarea rows={3} value={protocol.phase6.behavioral.assignmentDisclosure} onChange={(event) => change((state) => ({ ...state, behavioral: { ...state.behavioral, assignmentDisclosure: event.target.value } }))} /></label>
            <label><span>Task risks and discomforts</span><textarea rows={3} value={protocol.phase6.behavioral.taskRisks} onChange={(event) => change((state) => ({ ...state, behavioral: { ...state.behavioral, taskRisks: event.target.value } }))} /></label>
            <label><span>Pause, stop, and withdrawal rules</span><textarea rows={3} value={protocol.phase6.behavioral.stoppingRules} onChange={(event) => change((state) => ({ ...state, behavioral: { ...state.behavioral, stoppingRules: event.target.value } }))} /></label>
          </div>
        ) : null}

        {activeModule.applicability === "applicable" && activeModuleId === "focus-group" ? (
          <div className={styles.specificFields}>
            <h3>Group privacy boundary</h3>
            <p className={styles.lockedCopy}>Cerise always includes: “The research team will ask everyone to respect the privacy of the group, but cannot guarantee that other participants will keep the discussion confidential.”</p>
            <label><span>Research-team safeguards</span><textarea rows={3} value={protocol.phase6.focusGroup.researcherSafeguards} onChange={(event) => change((state) => ({ ...state, focusGroup: { ...state.focusGroup, researcherSafeguards: event.target.value } }))} /></label>
            <label><span>Participant reminder</span><textarea rows={3} value={protocol.phase6.focusGroup.participantReminder} onChange={(event) => change((state) => ({ ...state, focusGroup: { ...state.focusGroup, participantReminder: event.target.value } }))} /></label>
            <label className={styles.checkbox}><input type="checkbox" checked={protocol.phase6.focusGroup.confidentialityLimitAcknowledged} onChange={(event) => change((state) => ({ ...state, focusGroup: { ...state.focusGroup, confidentialityLimitAcknowledged: event.target.checked } }))} /><span>I acknowledge that participant-to-participant confidentiality cannot be guaranteed.</span></label>
          </div>
        ) : null}

        {activeModule.applicability === "applicable" && activeModuleId === "disclosure-debrief" ? (
          <div className={styles.specificFields}>
            <h3>Disclosure and human approval</h3>
            <label><span>Disclosure mode</span><select value={protocol.phase6.disclosure.mode} onChange={(event) => change((state) => ({ ...state, disclosure: { ...state.disclosure, mode: event.target.value as typeof state.disclosure.mode } }))}>
              <option value="full-disclosure">Full disclosure</option><option value="incomplete-disclosure-proposed">Incomplete disclosure — proposed</option><option value="deception-proposed">Deception — proposed</option>
            </select></label>
            <label><span>Consent process</span><select value={protocol.phase6.disclosure.consentProcess} onChange={(event) => change((state) => ({ ...state, disclosure: { ...state.disclosure, consentProcess: event.target.value as typeof state.disclosure.consentProcess } }))}>
              <option value="consent-required">Consent process required</option><option value="waiver-of-consent-proposed">Waiver of consent process proposed</option>
            </select></label>
            {protocol.phase6.disclosure.consentProcess === "waiver-of-consent-proposed" ? <div className={styles.twoColumns}>
              <label><span>Consent-waiver status</span><select value={protocol.phase6.disclosure.consentWaiverStatus} onChange={(event) => change((state) => ({ ...state, disclosure: { ...state.disclosure, consentWaiverStatus: event.target.value as typeof state.disclosure.consentWaiverStatus } }))}><option value="not-requested">Not requested</option><option value="requested">Requested</option><option value="approved">Human authority approved</option><option value="denied">Denied</option></select></label>
              <label><span>Consent-waiver reference</span><input value={protocol.phase6.disclosure.consentWaiverReference} onChange={(event) => change((state) => ({ ...state, disclosure: { ...state.disclosure, consentWaiverReference: event.target.value } }))} /></label>
            </div> : null}
            {protocol.phase6.disclosure.mode !== "full-disclosure" ? <>
              <label><span>Scientific necessity</span><textarea rows={3} value={protocol.phase6.disclosure.scientificNecessity} onChange={(event) => change((state) => ({ ...state, disclosure: { ...state.disclosure, scientificNecessity: event.target.value } }))} /></label>
              <label><span>Less-restrictive alternatives considered</span><textarea rows={3} value={protocol.phase6.disclosure.alternativesConsidered} onChange={(event) => change((state) => ({ ...state, disclosure: { ...state.disclosure, alternativesConsidered: event.target.value } }))} /></label>
              <label><span>Information withheld or altered</span><textarea rows={3} value={protocol.phase6.disclosure.withheldInformation} onChange={(event) => change((state) => ({ ...state, disclosure: { ...state.disclosure, withheldInformation: event.target.value } }))} /></label>
              <div className={styles.twoColumns}>
                <label><span>Undisclosed risk determination</span><select value={protocol.phase6.disclosure.undisclosedRiskDeclaration} onChange={(event) => change((state) => ({ ...state, disclosure: { ...state.disclosure, undisclosedRiskDeclaration: event.target.value as typeof state.disclosure.undisclosedRiskDeclaration } }))}><option value="not-determined">Not determined</option><option value="no-undisclosed-risk">No undisclosed risk</option><option value="risk-present">Risk present</option></select></label>
                <label><span>Effect on willingness</span><select value={protocol.phase6.disclosure.willingnessImpactDeclaration} onChange={(event) => change((state) => ({ ...state, disclosure: { ...state.disclosure, willingnessImpactDeclaration: event.target.value as typeof state.disclosure.willingnessImpactDeclaration } }))}><option value="not-determined">Not determined</option><option value="does-not-affect-willingness">Does not affect willingness</option><option value="may-affect-willingness">May affect willingness</option></select></label>
              </div>
              <div className={styles.twoColumns}>
                <label><span>Waiver/alteration status</span><select value={protocol.phase6.disclosure.waiverOrAlterationStatus} onChange={(event) => change((state) => ({ ...state, disclosure: { ...state.disclosure, waiverOrAlterationStatus: event.target.value as typeof state.disclosure.waiverOrAlterationStatus } }))}><option value="not-requested">Not requested</option><option value="requested">Requested</option><option value="approved">Human authority approved</option><option value="denied">Denied</option></select></label>
                <label><span>Approval reference</span><input value={protocol.phase6.disclosure.approvalReference} onChange={(event) => change((state) => ({ ...state, disclosure: { ...state.disclosure, approvalReference: event.target.value } }))} /></label>
              </div>
              <h3>Debrief plan</h3>
              <label><span>Human determination</span><select value={protocol.phase6.disclosure.debrief.determination} onChange={(event) => change((state) => ({ ...state, disclosure: { ...state.disclosure, debrief: { ...state.disclosure.debrief, determination: event.target.value as typeof state.disclosure.debrief.determination } } }))}><option value="not-determined">Not determined</option><option value="required">Debrief required</option><option value="not-required-by-human-authority">Not required by human authority</option></select></label>
              {protocol.phase6.disclosure.debrief.determination === "required" ? <>
                <label><span>Timing</span><select value={protocol.phase6.disclosure.debrief.timing} onChange={(event) => change((state) => ({ ...state, disclosure: { ...state.disclosure, debrief: { ...state.disclosure.debrief, timing: event.target.value as typeof state.disclosure.debrief.timing } } }))}><option value="not-determined">Not determined</option><option value="immediate">Immediately after participation</option><option value="delayed">Delayed under approved plan</option><option value="manual-human-delivery">Manual human delivery</option></select></label>
                <label><span>Delivery method</span><textarea rows={2} value={protocol.phase6.disclosure.debrief.deliveryMethod} onChange={(event) => change((state) => ({ ...state, disclosure: { ...state.disclosure, debrief: { ...state.disclosure.debrief, deliveryMethod: event.target.value } } }))} /></label>
                <label><span>Participant debrief text</span><textarea rows={5} value={protocol.phase6.disclosure.debrief.participantText} onChange={(event) => change((state) => ({ ...state, disclosure: { ...state.disclosure, debrief: { ...state.disclosure.debrief, participantText: event.target.value } } }))} /></label>
                <label><span>Post-debrief data choice</span><select value={protocol.phase6.disclosure.debrief.dataUseChoice} onChange={(event) => change((state) => ({ ...state, disclosure: { ...state.disclosure, debrief: { ...state.disclosure.debrief, dataUseChoice: event.target.value as typeof state.disclosure.debrief.dataUseChoice } } }))}><option value="not-determined">Not determined</option><option value="offer-after-debrief">Offer data-use choice after debrief</option><option value="not-offered-by-human-determination">Not offered — human determination</option></select></label>
              </> : protocol.phase6.disclosure.debrief.determination === "not-required-by-human-authority" ? <>
                <label><span>Determination reference</span><input value={protocol.phase6.disclosure.debrief.determinationReference} onChange={(event) => change((state) => ({ ...state, disclosure: { ...state.disclosure, debrief: { ...state.disclosure.debrief, determinationReference: event.target.value } } }))} /></label>
                <label><span>Exception rationale</span><textarea rows={3} value={protocol.phase6.disclosure.debrief.exceptionRationale} onChange={(event) => change((state) => ({ ...state, disclosure: { ...state.disclosure, debrief: { ...state.disclosure.debrief, exceptionRationale: event.target.value } } }))} /></label>
              </> : null}
            </> : null}
          </div>
        ) : null}

        {activeModule.applicability === "applicable" && activeModuleId === "recording-boundaries" ? (
          <div className={styles.specificFields}>
            <h3>Recording lifecycle and use</h3>
            <label><span>Permitted research use</span><textarea rows={3} value={protocol.phase6.recording.researchUse} onChange={(event) => change((state) => ({ ...state, recording: { ...state.recording, researchUse: event.target.value } }))} /></label>
            <label><span>Who can access recordings?</span><textarea rows={3} value={protocol.phase6.recording.accessPlan} onChange={(event) => change((state) => ({ ...state, recording: { ...state.recording, accessPlan: event.target.value } }))} /></label>
            <label><span>Retention or destruction</span><textarea rows={3} value={protocol.phase6.recording.retentionOrDestruction} onChange={(event) => change((state) => ({ ...state, recording: { ...state.recording, retentionOrDestruction: event.target.value } }))} /></label>
            <div className={styles.twoColumns}><label><span>Use beyond research</span><select value={protocol.phase6.recording.nonResearchUse} onChange={(event) => change((state) => ({ ...state, recording: { ...state.recording, nonResearchUse: event.target.value as typeof state.recording.nonResearchUse } }))}><option value="none">None</option><option value="teaching">Teaching</option><option value="presentation">Presentation</option><option value="public-use">Public use</option></select></label><label><span>Can recording be declined?</span><select value={protocol.phase6.recording.mayDeclineAndContinueMainStudy} onChange={(event) => change((state) => ({ ...state, recording: { ...state.recording, mayDeclineAndContinueMainStudy: event.target.value as typeof state.recording.mayDeclineAndContinueMainStudy } }))}><option value="not-determined">Not determined</option><option value="yes">Yes, continue main study</option><option value="no-by-human-determination">No — human determination</option></select></label></div>
            {protocol.phase6.recording.nonResearchUse !== "none" ? <><label className={styles.checkbox}><input type="checkbox" checked={protocol.phase6.recording.separateReleaseRequired} onChange={(event) => change((state) => ({ ...state, recording: { ...state.recording, separateReleaseRequired: event.target.checked } }))} /><span>A separate release or optional choice is required.</span></label><label><span>Separate-release determination reference</span><input value={protocol.phase6.recording.separateReleaseReference} onChange={(event) => change((state) => ({ ...state, recording: { ...state.recording, separateReleaseReference: event.target.value } }))} /></label></> : null}
          </div>
        ) : null}

        {activeModule.applicability === "applicable" && activeModuleId === "telephone" ? (
          <div className={styles.specificFields}>
            <h3>Telephone pathways</h3>
            <div className={styles.checkRow}>{(["eligibility-screening", "main-study"] as const).map((pathway) => <label className={styles.checkbox} key={pathway}><input type="checkbox" checked={protocol.phase6.telephone.pathways.includes(pathway)} onChange={(event) => change((state) => ({ ...state, telephone: { ...state.telephone, pathways: event.target.checked ? [...state.telephone.pathways, pathway] : state.telephone.pathways.filter((item) => item !== pathway) } }))} /><span>{pathway.replaceAll("-", " ")}</span></label>)}</div>
            {protocol.phase6.telephone.pathways.includes("eligibility-screening") ? <>
              <label><span>Screening purpose</span><textarea rows={2} value={protocol.phase6.telephone.screeningPurpose} onChange={(event) => change((state) => ({ ...state, telephone: { ...state.telephone, screeningPurpose: event.target.value } }))} /></label>
              <div className={styles.twoColumns}><label><span>Screening-data retention</span><textarea rows={2} value={protocol.phase6.telephone.screeningDataRetention} onChange={(event) => change((state) => ({ ...state, telephone: { ...state.telephone, screeningDataRetention: event.target.value } }))} /></label><label><span>Deletion for ineligible/declining people</span><textarea rows={2} value={protocol.phase6.telephone.screeningDataDeletion} onChange={(event) => change((state) => ({ ...state, telephone: { ...state.telephone, screeningDataDeletion: event.target.value } }))} /></label></div>
              <label><span>Eligibility-screening script</span><textarea rows={5} value={protocol.phase6.telephone.screeningScript} onChange={(event) => change((state) => ({ ...state, telephone: { ...state.telephone, screeningScript: event.target.value } }))} /></label>
            </> : null}
            {protocol.phase6.telephone.pathways.includes("main-study") ? <label><span>Main-study telephone consent script</span><textarea rows={5} value={protocol.phase6.telephone.mainStudyScript} onChange={(event) => change((state) => ({ ...state, telephone: { ...state.telephone, mainStudyScript: event.target.value } }))} /></label> : null}
            <label className={styles.checkbox}><input type="checkbox" checked={protocol.phase6.telephone.agreementBeforeSubstantiveQuestions} onChange={(event) => change((state) => ({ ...state, telephone: { ...state.telephone, agreementBeforeSubstantiveQuestions: event.target.checked } }))} /><span>Agreement is obtained before substantive screening or research questions.</span></label>
            <label><span>Opportunity to ask questions</span><textarea rows={2} value={protocol.phase6.telephone.questionOpportunity} onChange={(event) => change((state) => ({ ...state, telephone: { ...state.telephone, questionOpportunity: event.target.value } }))} /></label>
            <label><span>Copy delivery plan</span><textarea rows={2} value={protocol.phase6.telephone.copyDeliveryPlan} onChange={(event) => change((state) => ({ ...state, telephone: { ...state.telephone, copyDeliveryPlan: event.target.value } }))} /></label>
            <label><span>Consent-discussion documentation</span><textarea rows={2} value={protocol.phase6.telephone.discussionDocumentationPlan} onChange={(event) => change((state) => ({ ...state, telephone: { ...state.telephone, discussionDocumentationPlan: event.target.value } }))} /></label>
          </div>
        ) : null}

        {activeModule.applicability === "applicable" && activeModuleId === "lifecycle" ? (
          <div className={styles.specificFields}>
            <h3>Ongoing consent lifecycle</h3>
            <label><span>Recontact plan</span><textarea rows={3} value={protocol.phase6.lifecycle.recontactPlan} onChange={(event) => change((state) => ({ ...state, lifecycle: { ...state.lifecycle, recontactPlan: event.target.value } }))} /></label>
            <label><span>Recontact method</span><textarea rows={2} value={protocol.phase6.lifecycle.recontactMethod} onChange={(event) => change((state) => ({ ...state, lifecycle: { ...state.lifecycle, recontactMethod: event.target.value } }))} /></label>
            <label><span>Ongoing willingness and withdrawal check</span><textarea rows={3} value={protocol.phase6.lifecycle.ongoingWillingnessCheck} onChange={(event) => change((state) => ({ ...state, lifecycle: { ...state.lifecycle, ongoingWillingnessCheck: event.target.value } }))} /></label>
            <label><span>Changed-information participant text</span><textarea rows={4} value={protocol.phase6.lifecycle.changedInformationText} onChange={(event) => change((state) => ({ ...state, lifecycle: { ...state.lifecycle, changedInformationText: event.target.value } }))} /></label>
            <div className={styles.arrayHeader}><h3>Changed-information triggers</h3><button type="button" onClick={() => change((state) => ({ ...state, lifecycle: { ...state.lifecycle, triggers: [...state.lifecycle.triggers, { id: `change-${state.lifecycle.triggers.length + 1}`, category: "other", description: "", affectedParticipants: "", urgency: "routine", humanDisposition: "not-determined", authorityReference: "" }] } }))}><AppIcon name="plus" />Add trigger</button></div>
            {protocol.phase6.lifecycle.triggers.map((trigger, index) => <fieldset className={styles.arrayItem} key={trigger.id}><legend>Trigger {index + 1}</legend><div className={styles.twoColumns}><label><span>Change category</span><select value={trigger.category} onChange={(event) => change((state) => ({ ...state, lifecycle: { ...state.lifecycle, triggers: state.lifecycle.triggers.map((item) => item.id === trigger.id ? { ...item, category: event.target.value as typeof item.category } : item) } }))}><option value="new-risk">New risk</option><option value="procedure-change">Procedure change</option><option value="privacy-change">Privacy change</option><option value="new-finding">New finding</option><option value="participant-request">Participant request</option><option value="other">Other</option></select></label><label><span>Urgency</span><select value={trigger.urgency} onChange={(event) => change((state) => ({ ...state, lifecycle: { ...state.lifecycle, triggers: state.lifecycle.triggers.map((item) => item.id === trigger.id ? { ...item, urgency: event.target.value as typeof item.urgency } : item) } }))}><option value="routine">Routine</option><option value="prompt">Prompt</option><option value="before-next-procedure">Before next procedure</option></select></label></div><label><span>Description</span><textarea rows={2} value={trigger.description} onChange={(event) => change((state) => ({ ...state, lifecycle: { ...state.lifecycle, triggers: state.lifecycle.triggers.map((item) => item.id === trigger.id ? { ...item, description: event.target.value } : item) } }))} /></label><div className={styles.twoColumns}><label><span>Human disposition</span><select value={trigger.humanDisposition} onChange={(event) => change((state) => ({ ...state, lifecycle: { ...state.lifecycle, triggers: state.lifecycle.triggers.map((item) => item.id === trigger.id ? { ...item, humanDisposition: event.target.value as typeof item.humanDisposition } : item) } }))}><option value="not-determined">Not determined</option><option value="notification">Notification</option><option value="changed-information-addendum">Changed-information addendum</option><option value="full-reconsent">Full renewed consent</option><option value="no-renewed-consent-required">No renewed consent required</option></select></label><label><span>Authority reference</span><input value={trigger.authorityReference} onChange={(event) => change((state) => ({ ...state, lifecycle: { ...state.lifecycle, triggers: state.lifecycle.triggers.map((item) => item.id === trigger.id ? { ...item, authorityReference: event.target.value } : item) } }))} /></label></div><label><span>Affected participants</span><textarea rows={2} value={trigger.affectedParticipants} onChange={(event) => change((state) => ({ ...state, lifecycle: { ...state.lifecycle, triggers: state.lifecycle.triggers.map((item) => item.id === trigger.id ? { ...item, affectedParticipants: event.target.value } : item) } }))} /></label><button className={styles.removeButton} type="button" onClick={() => change((state) => ({ ...state, lifecycle: { ...state.lifecycle, triggers: state.lifecycle.triggers.filter((item) => item.id !== trigger.id) } }))}><AppIcon name="trash" />Remove trigger</button></fieldset>)}
          </div>
        ) : null}

        {activeModule.applicability === "applicable" && activeModuleId === "optional-choices" ? (
          <div className={styles.specificFields}>
            <div className={styles.arrayHeader}><div><h3>Independent optional choices</h3><p>Declining a choice does not decline the main study unless a separate human determination is documented.</p></div><button type="button" onClick={() => change((state) => ({ ...state, optionalChoices: { ...state.optionalChoices, choices: [...state.optionalChoices.choices, createPhase6OptionalChoice(state.optionalChoices.choices.length + 1)] } }))}><AppIcon name="plus" />Add choice</button></div>
            {protocol.phase6.optionalChoices.choices.map((choice, index) => <fieldset className={styles.arrayItem} key={choice.id}><legend>Optional choice {index + 1}</legend><label><span>Title</span><input value={choice.title} onChange={(event) => change((state) => ({ ...state, optionalChoices: { ...state.optionalChoices, choices: state.optionalChoices.choices.map((item) => item.id === choice.id ? { ...item, title: event.target.value } : item) } }))} /></label><label><span>Research purpose</span><textarea rows={2} value={choice.purpose} onChange={(event) => change((state) => ({ ...state, optionalChoices: { ...state.optionalChoices, choices: state.optionalChoices.choices.map((item) => item.id === choice.id ? { ...item, purpose: event.target.value } : item) } }))} /></label><label><span>Participant-facing choice</span><textarea rows={4} value={choice.participantText} onChange={(event) => change((state) => ({ ...state, optionalChoices: { ...state.optionalChoices, choices: state.optionalChoices.choices.map((item) => item.id === choice.id ? { ...item, participantText: event.target.value } : item) } }))} /></label><div className={styles.twoColumns}><label><span>Data use</span><textarea rows={2} value={choice.dataUse} onChange={(event) => change((state) => ({ ...state, optionalChoices: { ...state.optionalChoices, choices: state.optionalChoices.choices.map((item) => item.id === choice.id ? { ...item, dataUse: event.target.value } : item) } }))} /></label><label><span>Retention or destruction</span><textarea rows={2} value={choice.retentionOrDestruction} onChange={(event) => change((state) => ({ ...state, optionalChoices: { ...state.optionalChoices, choices: state.optionalChoices.choices.map((item) => item.id === choice.id ? { ...item, retentionOrDestruction: event.target.value } : item) } }))} /></label></div><label><span>Decline outcome</span><select value={choice.declineOutcome} onChange={(event) => change((state) => ({ ...state, optionalChoices: { ...state.optionalChoices, choices: state.optionalChoices.choices.map((item) => item.id === choice.id ? { ...item, declineOutcome: event.target.value as typeof item.declineOutcome } : item) } }))}><option value="continue-main-study">Continue main study</option><option value="stop-main-study-by-human-determination">Stop main study — human determination</option></select></label>{choice.declineOutcome === "stop-main-study-by-human-determination" ? <label><span>Human determination reference</span><input value={choice.authorityReference} onChange={(event) => change((state) => ({ ...state, optionalChoices: { ...state.optionalChoices, choices: state.optionalChoices.choices.map((item) => item.id === choice.id ? { ...item, authorityReference: event.target.value } : item) } }))} /></label> : null}<button className={styles.removeButton} type="button" onClick={() => change((state) => ({ ...state, optionalChoices: { ...state.optionalChoices, choices: state.optionalChoices.choices.filter((item) => item.id !== choice.id) } }))}><AppIcon name="trash" />Remove choice</button></fieldset>)}
          </div>
        ) : null}

        {activeModule.applicability === "applicable" && activeIssues.length > 0 ? <div className={styles.issueList}><h3>Repair before pilot export</h3><ul>{activeIssues.slice(0, 8).map((issue) => <li key={issue.id}><span>{issue.severity}</span>{issue.message}</li>)}</ul></div> : null}
        <footer className={styles.sourceFooter}>
          <span>Primary guidance</span>
          <a href="https://www.hhs.gov/ohrp/regulations-and-policy/guidance/faq/informed-consent/index.html" rel="noreferrer" target="_blank">OHRP informed consent FAQ<AppIcon name="external-link" /></a>
          <a href="https://irb.ucsf.edu/social-and-behavioral-research" rel="noreferrer" target="_blank">UCSF social & behavioral guidance<AppIcon name="external-link" /></a>
        </footer>
      </aside>
    </section>
  );
}

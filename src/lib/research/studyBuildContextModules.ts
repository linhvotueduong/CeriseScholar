import type { ParticipantPlan, ResearchQuestionPlan, StudyDesignKind } from "./studyDesign";
import { contribution, type StudyBuildRegistryContribution } from "./studyBuildRegistry";

type ConcreteDesignKind = Exclude<StudyDesignKind, "">;

export const STUDY_BUILD_CONTEXT_REGISTRY_VERSION = 1 as const;

export interface StudyMeasureModuleRegistry {
  compile(researchQuestions: readonly ResearchQuestionPlan[], methodLanes: readonly ("quantitative" | "qualitative")[]): StudyBuildRegistryContribution;
}

export interface StudyParticipantModuleRegistry {
  compile(participants: ParticipantPlan): StudyBuildRegistryContribution;
}

export interface StudyAssignmentModuleRegistry {
  compile(designKind: ConcreteDesignKind, participants: ParticipantPlan): StudyBuildRegistryContribution;
}

export interface StudyAccessibilityModuleRegistry {
  compile(participants: ParticipantPlan): StudyBuildRegistryContribution;
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

export const STUDY_MEASURE_MODULE_REGISTRY: StudyMeasureModuleRegistry = {
  compile(researchQuestions, methodLanes) {
    const populated = researchQuestions.filter((question) => (
      hasText(question.question)
      || hasText(question.construct)
      || hasText(question.operationalDefinition)
      || hasText(question.measure)
    ));
    const variableRoles = new Set<string>();
    for (const question of populated) {
      if (question.constructRole) variableRoles.add(question.constructRole);
      if (methodLanes.includes("quantitative") && question.constructRole !== "qualitative-concept") {
        variableRoles.add("quantitative-measure");
      }
      if (methodLanes.includes("qualitative") && question.constructRole === "qualitative-concept") {
        variableRoles.add("qualitative-source");
      }
    }

    return contribution({
      modules: [{
        id: "measures.evidence-map",
        moduleKind: "evidence-map",
        status: "required",
        sourceKinds: ["measures", "design"],
        proposedBlockRoles: methodLanes.map((lane) => `${lane}-evidence-source`),
        proposedVariableRoles: [...variableRoles].sort(),
        rationale: "Every research question needs a traceable path from construct to evidence source, implemented response, and planned interpretation.",
      }],
      checks: [
        {
          id: "check.measures.research-question",
          level: "required",
          repairTarget: "measures",
          message: populated.length > 0
            ? "Complete the construct, operational definition, measure, and evidence mapping for every active research question."
            : "Add at least one research question and map it to an evidence source before materializing a runnable study.",
          sourceKinds: ["measures"],
        },
        ...(methodLanes.includes("quantitative")
          ? [{
              id: "check.measures.quantitative-roles",
              level: "required" as const,
              repairTarget: "measures" as const,
              message: "Define the quantitative variable roles, scoring, unit, timing, and missing-data behavior used by the planned analysis.",
              sourceKinds: ["measures"] as const,
            }]
          : []),
        ...(methodLanes.includes("qualitative")
          ? [{
              id: "check.measures.qualitative-sources",
              level: "required" as const,
              repairTarget: "measures" as const,
              message: "Define qualitative concepts, sources, prompts, interpretation boundaries, and provenance without requiring numeric outcome roles.",
              sourceKinds: ["measures"] as const,
            }]
          : []),
      ],
    });
  },
};

export const STUDY_PARTICIPANT_MODULE_REGISTRY: StudyParticipantModuleRegistry = {
  compile(participants) {
    const hasEligibility = hasText(participants.inclusionCriteria) || hasText(participants.exclusionCriteria);
    return contribution({
      modules: [
        {
          id: "participants.flow-and-eligibility",
          moduleKind: "participant-flow",
          status: "required",
          sourceKinds: ["participants"],
          proposedBlockRoles: ["participant-entry", "eligibility-or-researcher-screening"],
          proposedVariableRoles: hasEligibility ? ["eligibility-status"] : [],
          rationale: "The runnable flow must match the declared population, eligibility process, recruitment route, and burden assumptions.",
        },
        {
          id: "flow.participant-exit-support",
          moduleKind: "participant-exit-and-support",
          status: "required",
          sourceKinds: ["product-default", "participants"],
          proposedBlockRoles: ["participant-exit", "support-access"],
          proposedVariableRoles: ["completion-status"],
          rationale: "Every participant flow needs a safe refusal, stop, and support route regardless of design or setting.",
        },
      ],
      checks: [
        {
          id: "check.participants.population",
          level: "required",
          repairTarget: "participants",
          message: hasText(participants.targetPopulation)
            ? "Verify that recruitment, eligibility, burden, and the runtime experience match the declared target population."
            : "Define the target population before materializing a participant-facing study.",
          sourceKinds: ["participants"],
        },
        {
          id: "check.participants.sample-plan",
          level: "recommended",
          repairTarget: "participants",
          message: "Review sampling, recruitment, inclusion, exclusion, planned sample size, and the handling of incomplete participation.",
          sourceKinds: ["participants"],
        },
      ],
      capabilityRequests: [{
        id: "participant-refusal-and-exit",
        requiredForRunnable: true,
        repairTarget: "studio",
        rationale: "A runnable participant flow must end safely when participation is refused or stopped.",
        sourceKinds: ["participants", "runtime"],
      }],
    });
  },
};

export const STUDY_ASSIGNMENT_MODULE_REGISTRY: StudyAssignmentModuleRegistry = {
  compile(designKind, participants) {
    if (designKind === "randomized-between") {
      return contribution({
        checks: [
          {
            id: "check.assignment.method",
            level: "required",
            repairTarget: "participants",
            message: hasText(participants.allocationMethod)
              ? "Verify that the declared allocation method is implementable, auditable, and consistent with the runtime condition weights."
              : "Define the random allocation method before materializing the study.",
            sourceKinds: ["assignment", "participants", "design"],
          },
          {
            id: "check.assignment.ratio",
            level: "required",
            repairTarget: "participants",
            message: hasText(participants.allocationRatio)
              ? "Verify that the planned allocation ratio matches every runtime condition weight."
              : "Define the planned allocation ratio before materializing the study.",
            sourceKinds: ["assignment", "participants", "design"],
          },
        ],
      });
    }
    if (designKind === "within-subjects") {
      return contribution({
        checks: [{
          id: "check.assignment.counterbalancing",
          level: "required",
          repairTarget: "participants",
          message: hasText(participants.counterbalancing)
            ? "Verify that the declared counterbalancing or order strategy matches the executable condition sequence."
            : "Define or explicitly justify the condition-order and counterbalancing strategy.",
          sourceKinds: ["assignment", "participants", "design"],
        }],
      });
    }
    if (designKind === "quasi-experimental") {
      return contribution({
        checks: [{
          id: "check.assignment.existing-groups",
          level: "required",
          repairTarget: "participants",
          message: "Define how existing group or exposure identity is obtained without Cerise random assignment.",
          sourceKinds: ["assignment", "participants", "design"],
        }],
      });
    }
    return contribution({
      checks: [{
        id: "check.assignment.none-by-default",
        level: "recommended",
        repairTarget: "design",
        message: "Do not add condition assignment unless it is an explicit, scientifically justified part of the design.",
        sourceKinds: ["assignment", "design"],
      }],
    });
  },
};

export const STUDY_ACCESSIBILITY_MODULE_REGISTRY: StudyAccessibilityModuleRegistry = {
  compile(participants) {
    const declared = hasText(participants.accessibilityRequirements);
    return contribution({
      modules: [{
        id: "accessibility.participant-flow",
        moduleKind: "accessible-participant-flow",
        status: declared ? "required" : "recommended",
        sourceKinds: ["accessibility", "participants"],
        proposedBlockRoles: ["accessible-instructions", "accessible-controls", "accessible-error-and-status"],
        proposedVariableRoles: [],
        rationale: declared
          ? "The participant plan declares accessibility requirements that must shape instructions, controls, timing, and alternatives."
          : "Accessible instructions, controls, focus order, status, and error handling should be reviewed for every participant flow.",
      }],
      checks: [{
        id: "check.accessibility.rehearsal",
        level: "required",
        repairTarget: "participants",
        message: declared
          ? "Rehearse the declared accommodations and document any design or measurement tradeoffs before launch."
          : "Review keyboard access, screen-reader semantics, reflow, contrast, motion, timing flexibility, and alternative response needs.",
        sourceKinds: ["accessibility", "participants"],
      }],
      capabilityRequests: [{
        id: "baseline-accessible-controls",
        requiredForRunnable: true,
        repairTarget: "studio",
        rationale: "The participant runtime must provide a testable baseline for keyboard, semantic, reflow, and reduced-motion access.",
        sourceKinds: ["accessibility", "runtime"],
      }],
    });
  },
};

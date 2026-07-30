export type ResearchStageId =
  | "stage-01"
  | "stage-02"
  | "stage-03"
  | "stage-04"
  | "stage-05"
  | "stage-06"
  | "stage-07"
  | "stage-08";

export type ResearchCanvasKind =
  | "problem"
  | "baseline"
  | "questions"
  | "backcasting"
  | "proposal-literature"
  | "proposal-roadmaps"
  | "proposal-paper"
  | "study-design"
  | "study-measures"
  | "study-participants"
  | "experiment-studio-launcher"
  | "analysis-plan-launcher"
  | "data-intake-audit-launcher"
  | "data-preparation-launcher"
  | "analysis-execution-launcher"
  | "analysis-results-launcher"
  | "reproducibility-package-launcher"
  | "guided";

export interface ResearchPathStep {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  description: string;
  canvas: ResearchCanvasKind;
  prompts: readonly string[];
  checklist: readonly string[];
}

export interface ResearchPathStage {
  id: ResearchStageId;
  number: number;
  title: string;
  shortTitle: string;
  description: string;
  deliverable: string;
  steps: readonly ResearchPathStep[];
}

type StepInput = Omit<ResearchPathStep, "id" | "number"> & {
  /** Preserve a step's persisted draft key when its visible order changes. */
  id?: string;
};

function makeStage(
  id: ResearchStageId,
  title: string,
  shortTitle: string,
  description: string,
  deliverable: string,
  steps: readonly StepInput[],
): ResearchPathStage {
  const number = Number(id.slice(-2));
  return {
    id,
    number,
    title,
    shortTitle,
    description,
    deliverable,
    steps: steps.map((step, index) => ({
      ...step,
      id: step.id ?? `${id}-step-${String(index + 1).padStart(2, "0")}`,
      number: index + 1,
    })),
  };
}

const guided = (
  title: string,
  shortTitle: string,
  description: string,
  prompts: readonly string[],
  checklist: readonly string[],
): StepInput => ({
  title,
  shortTitle,
  description,
  canvas: "guided",
  prompts,
  checklist,
});

export const RESEARCH_PATH_STAGES: readonly ResearchPathStage[] = [
  makeStage(
    "stage-01",
    "Pathway",
    "Pathway",
    "Move from a raw concern to an evidence-informed research direction.",
    "Research Pathway Brief",
    [
      {
        title: "Define the Problem",
        shortTitle: "Define the Problem",
        description: "Turn a raw idea into a specific problem by tracing its situation, consequences, and recommended response.",
        canvas: "problem",
        prompts: [],
        checklist: [],
      },
      {
        title: "Build the Baseline",
        shortTitle: "Build the Baseline",
        description: "Find the needs and gaps, then validate the emerging problem through literature and close reading.",
        canvas: "baseline",
        prompts: [],
        checklist: [],
      },
      {
        title: "Formulate Research Questions",
        shortTitle: "Formulate Research Questions",
        description: "Brainstorm broadly from the baseline, then refine the strongest ideas into two to four focused research questions.",
        canvas: "questions",
        prompts: [],
        checklist: [],
      },
      {
        title: "Backcasting",
        shortTitle: "Backcasting",
        description: "Define the vision, compare it with the baseline, generate concepts, and connect the chosen path into a research roadmap.",
        canvas: "backcasting",
        prompts: [],
        checklist: [],
      },
    ],
  ),
  makeStage(
    "stage-02",
    "Research Proposal",
    "Proposal",
    "Review the evidence, map a pathway for every research question, and compose the proposal that will guide the study.",
    "Research Proposal",
    [
      {
        id: "stage-02-step-02",
        title: "Build a Research Roadmap for Each Research Question",
        shortTitle: "RQ Roadmaps",
        description: "Translate every research question into themes, short-, medium-, and long-term tasks, and a clear future vision.",
        canvas: "proposal-roadmaps",
        prompts: [],
        checklist: [],
      },
      {
        id: "stage-02-step-01",
        title: "Review Key References and Build the Literature Review",
        shortTitle: "Literature Review",
        description: "Search, assess, organize, and synthesize the literature that establishes the theoretical background and research gap.",
        canvas: "proposal-literature",
        prompts: [],
        checklist: [],
      },
      {
        title: "Write the Research Proposal",
        shortTitle: "Write Proposal",
        description: "Compose the background, problem statement, literature review, current study, method and materials, and references together in the proposal Paper Writer.",
        canvas: "proposal-paper",
        prompts: [],
        checklist: [],
      },
    ],
  ),
  makeStage(
    "stage-03",
    "Design and Build the Study",
    "Build Study",
    "Turn the approved proposal into a traceable study design, runnable prototype, and analysis-ready specification.",
    "Runnable Study Prototype and Design Specification",
    [
      {
        title: "Select the Study Design",
        shortTitle: "Select Design",
        description: "Compare defensible design options against the research questions, setting, constraints, and evidence needed.",
        canvas: "study-design",
        prompts: [],
        checklist: [],
      },
      {
        title: "Map Hypotheses, Constructs, and Measures",
        shortTitle: "Map Measures",
        description: "Connect every research question to a hypothesis or qualitative purpose, operational definition, and collection method.",
        canvas: "study-measures",
        prompts: [],
        checklist: [],
      },
      {
        title: "Plan Participants, Sampling, and Assignment",
        shortTitle: "Plan Participants",
        description: "Define who or what contributes evidence, how the sample is justified, and how conditions are assigned.",
        canvas: "study-participants",
        prompts: [],
        checklist: [],
      },
      {
        title: "Build the Experiment or Survey",
        shortTitle: "Build Study",
        description: "Create the study flow, participant screens, stimuli, tasks, survey blocks, and branching logic in the full Experimental Studio.",
        canvas: "experiment-studio-launcher",
        prompts: [],
        checklist: [],
      },
      guided("Define the Procedure, Data, and Analysis", "Data and Analysis", "Synchronize the procedure, data dictionary, and analysis contract with the study design.", ["What will happen, in what order, and which variables will each event produce?", "How will every research question be answered by the planned data and analysis?"], ["Every collected variable is defined", "Every research question maps to an analysis"]),
      guided("Test, Freeze, and Export", "Test and Export", "Validate the participant experience and scientific specification, then freeze a reproducible local release.", ["Which scientific, technical, accessibility, and device checks have passed?", "What belongs in the frozen release package and change record?"], ["No critical validation issue remains", "The versioned study package is ready for Stage 4 review"]),
    ],
  ),
  makeStage(
    "stage-04",
    "Validate and Prepare",
    "Validate",
    "Test the protocol, resolve risks, and complete the approvals needed to begin responsibly.",
    "Approved and Pilot-Validated Protocol",
    [
      guided("Assess Ethics, Consent, Privacy, Risk, and Accessibility", "Ethics and Risk", "Identify participant, privacy, safety, inclusion, and accessibility obligations.", ["What ethical, consent, privacy, risk, or accessibility issues apply?", "How will each issue be mitigated and monitored?"], ["Material risks and vulnerable groups are addressed", "Consent, privacy, and accessibility measures are documented"]),
      guided("Obtain Supervisor, Collaborator, or Expert Feedback", "Expert Feedback", "Ask appropriate reviewers to challenge the protocol before launch.", ["Who reviewed the protocol and from which perspective?", "What feedback was accepted, declined, or remains unresolved?"], ["At least one relevant reviewer is identified", "Feedback decisions and rationale are recorded"]),
      guided("Pilot-Test the Instruments and Procedure", "Pilot Test", "Run a proportionate pilot to discover practical and measurement problems.", ["What was piloted, with whom or with what sample?", "What failed, confused users, or produced weak evidence?"], ["Pilot scope and observations are documented", "Instrument and procedure changes are identified"]),
      guided("Revise, Obtain Approvals, and Complete Launch Checks", "Launch Readiness", "Incorporate revisions, obtain required approvals, and confirm launch readiness.", ["Which revisions and approvals are complete?", "What remains before collection can safely begin?"], ["Required approvals or preregistration are recorded", "The launch checklist has no unresolved critical item"]),
    ],
  ),
  makeStage(
    "stage-05",
    "Collect the Evidence",
    "Collect",
    "Execute the approved protocol while preserving quality, traceability, and deviations.",
    "Documented Raw Dataset or Evidence Collection",
    [
      guided("Recruit Participants or Obtain Data Access", "Recruit or Access", "Secure the participants, permissions, datasets, archives, or sites required by the protocol.", ["What recruitment or access activities are underway?", "Which permissions, quotas, or inclusion targets remain?"], ["Access and recruitment status are documented", "Consent or access records are stored appropriately"]),
      guided("Conduct Data Collection", "Collect Data", "Carry out the approved procedure and keep a traceable collection record.", ["What was collected and when?", "What contextual notes are needed to interpret the collection?"], ["Collected items follow the naming plan", "Dates, versions, and collection context are recorded"]),
      guided("Monitor Quality, Progress, and Protocol Deviations", "Monitor Quality", "Track completeness and quality while documenting departures from the protocol.", ["What quality and progress signals are being monitored?", "Which deviations occurred and how were they handled?"], ["Quality checks run at the planned cadence", "Every deviation has an impact note and response"]),
      guided("Close Collection and Freeze the Dataset", "Close Collection", "Conclude collection deliberately and preserve exactly what occurred.", ["Why is collection complete or being stopped?", "What constitutes the frozen raw evidence package?"], ["Closure criteria are met", "The raw dataset or evidence collection is frozen and documented"]),
    ],
  ),
  makeStage(
    "stage-06",
    "Prepare and Analyze",
    "Analyze",
    "Transform raw evidence into a transparent analysis package and findings record.",
    "Analysis Package and Findings",
    [
      {
        id: "stage-06-analysis-plan",
        title: "Finalize the Analysis Plan",
        shortTitle: "Analysis Plan",
        description: "Complete the release-bound analysis plan before importing or reviewing participant data.",
        canvas: "analysis-plan-launcher",
        prompts: [],
        checklist: [],
      },
      {
        id: "stage-06-data-intake",
        title: "Verify Data Intake and Quality",
        shortTitle: "Data Intake",
        description: "Verify Local Host export identity, separate pilot data, and review a read-only schema and quality audit.",
        canvas: "data-intake-audit-launcher",
        prompts: [],
        checklist: [],
      },
      {
        id: "stage-06-step-01",
        title: "Prepare a Reproducible Derived Dataset",
        shortTitle: "Prepare Evidence",
        description: "Apply reviewable transformations and exclusions to a derived copy while preserving the raw source and deterministic operation history.",
        canvas: "data-preparation-launcher",
        prompts: [],
        checklist: [],
      },
      {
        ...guided("Conduct Data-Quality and Descriptive Checks", "Quality Checks", "Understand completeness, distributions, inconsistencies, and missingness before primary analysis.", ["What do the descriptive and quality checks show?", "Which issues require correction, exclusion, or sensitivity analysis?"], ["Planned quality checks are complete", "Material quality issues have documented decisions"]),
        id: "stage-06-step-02",
      },
      {
        id: "stage-06-step-03",
        title: "Run the Reviewed Primary Analysis",
        shortTitle: "Analysis Execution",
        description: "Execute bounded, reviewed methods against the verified derived package and inspect estimates, intervals, assumptions, and diagnostics.",
        canvas: "analysis-execution-launcher",
        prompts: [],
        checklist: [],
      },
      {
        ...guided("Test Reliability, Robustness, Sensitivity, or Triangulation", "Robustness", "Challenge the findings with the quality tests appropriate to the methodology.", ["Which robustness, sensitivity, reliability, or triangulation checks were used?", "Which conclusions changed, weakened, or strengthened?"], ["Relevant quality tests are complete", "Differences from the primary result are explained"]),
        id: "stage-06-step-04",
      },
      {
        id: "stage-06-step-05",
        title: "Produce Tables, Figures, and a Results Record",
        shortTitle: "Results Record",
        description: "Link reviewed aggregate outputs to research-question answers, defensible claims, limitations, captions, and a verifiable Results Record.",
        canvas: "analysis-results-launcher",
        prompts: [],
        checklist: [],
      },
    ],
  ),
  makeStage(
    "stage-07",
    "Interpret and Compose",
    "Compose",
    "Turn findings into defensible answers and integrate them into a complete research narrative.",
    "Complete Draft",
    [
      guided("Answer Each Research Question Using the Findings", "Answer the Questions", "State what the findings support for every research question without overclaiming.", ["What is the evidence-backed answer to each research question?", "How strong and certain is each answer?"], ["Every research question has a direct answer", "Claims reflect the strength and limits of the evidence"]),
      guided("Compare Results with the Literature and Framework", "Compare with Literature", "Position the findings against prior work and the conceptual or theoretical framework.", ["Where do the findings agree, extend, or conflict with the literature?", "How does the framework explain or fail to explain the results?"], ["Major comparisons are supported by citations", "Unexpected findings are addressed rather than hidden"]),
      guided("Establish Limitations, Implications, and Defensible Claims", "Limits and Implications", "Define what the study cannot establish and why the findings still matter.", ["What are the most material limitations and boundary conditions?", "What practical, theoretical, methodological, or policy implications follow?"], ["Limitations are specific and connected to design decisions", "Implications do not exceed the evidence"]),
      guided("Integrate the Complete Manuscript or Research Report", "Complete the Draft", "Unify the study into a coherent manuscript or report ready for review.", ["Which sections remain incomplete or inconsistent?", "What is the central contribution readers should retain?"], ["All required sections are present", "Terminology, questions, methods, results, and claims align"]),
    ],
  ),
  makeStage(
    "stage-08",
    "Review, Share, and Preserve",
    "Share",
    "Prepare the work for its audience, respond to feedback, and preserve the research record.",
    "Submitted Research Package and Next-Study Roadmap",
    [
      guided("Select the Venue and Check Its Requirements", "Select the Venue", "Choose the audience and venue, then translate its requirements into a submission checklist.", ["Which venue, format, or audience is the best fit?", "What formatting, length, data, ethics, and disclosure requirements apply?"], ["The venue and rationale are documented", "Submission requirements are captured as actionable checks"]),
      guided("Obtain Feedback and Revise", "Feedback and Revision", "Collect structured feedback and make traceable revision decisions.", ["Who reviewed the work and what did they recommend?", "Which revisions were made, declined, or deferred, and why?"], ["Feedback is consolidated", "Material revision decisions are documented"]),
      guided("Finalize, Submit, Publish, or Present", "Finalize and Submit", "Complete quality control and release the research through the selected channel.", ["What was finalized, submitted, published, or presented?", "What identifiers, dates, versions, or confirmation records should be preserved?"], ["Final files pass the venue checklist", "The released version and confirmation details are recorded"]),
      guided("Archive Materials and Create the Next-Study Roadmap", "Archive and Continue", "Preserve sources, data, code, materials, and decisions while capturing future research opportunities.", ["Where is the complete research package archived and under what access conditions?", "Which unanswered questions or follow-up studies should continue the work?"], ["The preservation package is complete and findable", "Future-study ideas are prioritized with enough context to resume"]),
      {
        id: "stage-08-reproducibility-package",
        title: "Assemble and Verify the Reproducibility Package",
        shortTitle: "Reproducibility Package",
        description: "Create and independently verify a deterministic metadata-and-aggregate-output archive while keeping participant data, media, and SQLite outside the package.",
        canvas: "reproducibility-package-launcher",
        prompts: [],
        checklist: [],
      },
    ],
  ),
] as const;

export const RESEARCH_PATH_STEPS = RESEARCH_PATH_STAGES.flatMap((stage) => stage.steps);

export function getResearchStage(stageId: string): ResearchPathStage {
  return RESEARCH_PATH_STAGES.find((stage) => stage.id === stageId) ?? RESEARCH_PATH_STAGES[0];
}

export function getResearchStep(stepId: string): ResearchPathStep {
  return RESEARCH_PATH_STEPS.find((step) => step.id === stepId) ?? RESEARCH_PATH_STEPS[0];
}

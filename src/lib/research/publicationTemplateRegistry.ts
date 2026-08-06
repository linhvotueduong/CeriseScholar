import { sha256ArtifactChecksum, type ResearchArtifactChecksum } from "./artifactIdentity";

export const PUBLICATION_TEMPLATE_REGISTRY_SCHEMA_VERSION = 1 as const;

export type PublicationTemplateTarget = "journal-article" | "general-manuscript" | "conference-poster";
export type PublicationTemplateRenderer = "html-css" | "latex" | "docx-adapter" | "poster-canvas";

export interface PublicationTemplateProfile {
  schemaVersion: typeof PUBLICATION_TEMPLATE_REGISTRY_SCHEMA_VERSION;
  id: string;
  version: number;
  label: string;
  target: PublicationTemplateTarget;
  renderer: PublicationTemplateRenderer;
  requiredSectionRoles: string[];
  supportedNodeKinds: string[];
  authority: {
    sourceName: string;
    sourceUrl: string;
    reviewedAt: string;
  };
  checksum: ResearchArtifactChecksum;
  claim: "formatting-adapter-not-venue-acceptance-or-current-submission-requirement-certification";
}

export interface ProjectTemplatePin {
  schemaVersion: typeof PUBLICATION_TEMPLATE_REGISTRY_SCHEMA_VERSION;
  projectId: string;
  templateId: string;
  templateVersion: number;
  templateChecksum: ResearchArtifactChecksum;
  pinnedAt: string;
}

type TemplateSeed = Omit<PublicationTemplateProfile, "schemaVersion" | "checksum" | "claim">;

export const PUBLICATION_TEMPLATE_SEEDS: readonly TemplateSeed[] = [
  {
    id: "generic-academic-article",
    version: 1,
    label: "Generic academic article",
    target: "journal-article",
    renderer: "html-css",
    requiredSectionRoles: ["abstract", "introduction", "methods", "results", "discussion", "references"],
    supportedNodeKinds: ["paragraph", "heading", "list", "quote", "equation", "citation-group", "figure-reference", "table-reference", "supplement-reference"],
    authority: { sourceName: "Cerise Scholar venue-neutral foundation", sourceUrl: "internal:venue-neutral", reviewedAt: "2026-08-03T00:00:00.000Z" },
  },
  {
    id: "apa-style-manuscript",
    version: 1,
    label: "APA-style general manuscript",
    target: "general-manuscript",
    renderer: "docx-adapter",
    requiredSectionRoles: ["title", "abstract", "introduction", "methods", "results", "discussion", "references"],
    supportedNodeKinds: ["paragraph", "heading", "list", "citation-group", "figure-reference", "table-reference"],
    authority: { sourceName: "Template registry foundation fixture", sourceUrl: "internal:requires-authority-refresh-before-release", reviewedAt: "2026-08-03T00:00:00.000Z" },
  },
  {
    id: "conference-research-poster",
    version: 1,
    label: "Conference research poster",
    target: "conference-poster",
    renderer: "poster-canvas",
    requiredSectionRoles: ["title", "background", "methods", "results", "conclusion", "references"],
    supportedNodeKinds: ["paragraph", "heading", "list", "figure-reference", "table-reference"],
    authority: { sourceName: "Cerise Scholar poster foundation", sourceUrl: "internal:conference-specific-check-required", reviewedAt: "2026-08-03T00:00:00.000Z" },
  },
] as const;

export async function compilePublicationTemplateRegistry(): Promise<PublicationTemplateProfile[]> {
  return Promise.all(PUBLICATION_TEMPLATE_SEEDS.map(async (seed) => {
    const core = {
      schemaVersion: PUBLICATION_TEMPLATE_REGISTRY_SCHEMA_VERSION,
      ...seed,
      requiredSectionRoles: [...seed.requiredSectionRoles].sort(),
      supportedNodeKinds: [...seed.supportedNodeKinds].sort(),
      claim: "formatting-adapter-not-venue-acceptance-or-current-submission-requirement-certification" as const,
    };
    return { ...core, checksum: await sha256ArtifactChecksum(core) };
  }));
}

export function validatePublicationTemplateRegistry(
  templates: readonly PublicationTemplateProfile[],
): string[] {
  const issues: string[] = [];
  const identities = new Set<string>();
  for (const template of templates) {
    const key = `${template.id}:v${template.version}`;
    if (identities.has(key)) issues.push(`duplicate-template:${key}`);
    identities.add(key);
    if (template.requiredSectionRoles.length === 0) issues.push(`missing-required-sections:${key}`);
    if (template.supportedNodeKinds.length === 0) issues.push(`missing-node-support:${key}`);
    if (!template.authority.sourceUrl) issues.push(`missing-authority:${key}`);
  }
  return issues.sort();
}

export function pinPublicationTemplate(
  projectId: string,
  template: PublicationTemplateProfile,
  pinnedAt: string,
): ProjectTemplatePin {
  return {
    schemaVersion: PUBLICATION_TEMPLATE_REGISTRY_SCHEMA_VERSION,
    projectId,
    templateId: template.id,
    templateVersion: template.version,
    templateChecksum: template.checksum,
    pinnedAt: new Date(pinnedAt).toISOString(),
  };
}

export function verifyPublicationTemplatePin(
  pin: ProjectTemplatePin,
  templates: readonly PublicationTemplateProfile[],
): boolean {
  return templates.some((template) => (
    template.id === pin.templateId
    && template.version === pin.templateVersion
    && template.checksum === pin.templateChecksum
  ));
}

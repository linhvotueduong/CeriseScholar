export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
  updated_at: string;
  /**
   * Research Pathway home (migration 025, docs/research-readiness-checklist-model.md §6.3).
   * research_question is the main field; approach/hypothesis are optional. All three are
   * nullable/undefined for rows written before the migration or fetched with a narrow select.
   */
  research_question?: string | null;
  research_approach?: string | null;
  research_hypothesis?: string | null;
}

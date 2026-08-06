export interface Pdf {
  id: string;
  user_id: string;
  filename: string;
  display_name: string;
  storage_path: string;
  page_count: number | null;
  ocr_status: "pending" | "processing" | "completed" | "failed";
  ocr_text: string | null;
  file_size: number | null;
  pdf_author: string;
  pdf_title: string;
  pdf_subject: string;
  created_at: string;
  updated_at: string;
  /**
   * Per-source Finish button (migration 026, docs/research-readiness-checklist-model.md §7).
   * null = not yet marked finished; a timestamp = when the user clicked "Mark source
   * finished". A timing aid only — never a gate (see the migration comment).
   */
  finished_at?: string | null;
}

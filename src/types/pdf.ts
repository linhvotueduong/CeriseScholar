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
  created_at: string;
  updated_at: string;
}

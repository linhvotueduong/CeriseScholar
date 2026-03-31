export interface LiteratureReviewEntry {
  id: string;
  user_id: string;
  pdf_id: string;
  highlight_id: string | null;
  source: string;
  authors: string;
  year: string;
  page_number: number;
  highlighted_text: string;
  theme_category: string;
  user_notes: string;
  code_name: string;
  apa_reference: string;
  synthesis_paragraph: string;
  date_added: string;
}

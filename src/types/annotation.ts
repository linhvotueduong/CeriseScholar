export interface Highlight {
  id: string;
  user_id: string;
  pdf_id: string;
  page_number: number;
  highlighted_text: string;
  color: string;
  rects: { x: number; y: number; width: number; height: number }[];
  created_at: string;
}

export interface Annotation {
  id: string;
  user_id: string;
  pdf_id: string;
  highlight_id: string | null;
  page_number: number;
  content: string;
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
}

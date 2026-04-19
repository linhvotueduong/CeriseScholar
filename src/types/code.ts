export interface Code {
  id: string;
  user_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export const DEFAULT_CODES = [
  { name: "Abstract", color: "#EF4444" },
  { name: "Introduction", color: "#F97316" },
  { name: "Literature Review", color: "#EAB308" },
  { name: "Methodology", color: "#22C55E" },
  { name: "Results", color: "#3B82F6" },
  { name: "Discussion", color: "#111111" },
  { name: "Conclusion", color: "#EC4899" },
];

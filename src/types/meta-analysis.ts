export type HypothesisType =
  | "moderation"
  | "group_comparison"
  | "correlation"
  | "prediction"
  | "mediation"
  | "";

export type PlotType =
  | "forest"
  | "funnel"
  | "bubble"
  | "baujat"
  | "radial"
  | "labbe"
  | "drapery"
  | "influence";

export interface CanvasBlock {
  id: string;
  type: PlotType;
  config: Record<string, unknown>;
}

export interface ColumnMapping {
  study?: string;
  n?: string;
  effect?: string;
  se?: string;
  m1?: string; sd1?: string; n1?: string;
  m2?: string; sd2?: string; n2?: string;
  moderator?: string;
  events1?: string; total1?: string;
  events2?: string; total2?: string;
}

export interface MetaAnalysis {
  id: string;
  project_id: string;
  user_id: string;
  research_question: string;
  hypothesis: string;
  hypothesis_type: HypothesisType;
  canvas_blocks: CanvasBlock[];
  column_mapping: ColumnMapping;
  created_at: string;
  updated_at: string;
}

export interface StudyEffect {
  name: string;
  n: number;
  effect: number;
  se: number;
  ci: [number, number];
  weight: number;
  events1?: number; total1?: number;
  events2?: number; total2?: number;
  moderator?: number;
}

export interface PooledResult {
  effect: number;
  se: number;
  ci: [number, number];
  Q: number;
  df: number;
  I2: number;
  pValue: number;
  tau2: number;
}

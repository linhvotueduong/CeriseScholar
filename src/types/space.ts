export interface SpacePost {
  id: string;
  user_id: string;
  title: string;
  body: string;
  topic: string;
  upvote_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  user_email?: string;
}

export interface SpaceComment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  user_email?: string;
}

export type SpaceTopic =
  | "general"
  | "research_questions"
  | "writing_tips"
  | "feedback"
  | "study_groups"
  | "methodology"
  | "tools";

export const SPACE_TOPICS: { key: SpaceTopic; label: string }[] = [
  { key: "general", label: "General" },
  { key: "research_questions", label: "Research Questions" },
  { key: "writing_tips", label: "Writing Tips" },
  { key: "feedback", label: "Feedback" },
  { key: "study_groups", label: "Study Groups" },
  { key: "methodology", label: "Methodology" },
  { key: "tools", label: "Tools & Resources" },
];

export type SortMode = "hot" | "new" | "top";

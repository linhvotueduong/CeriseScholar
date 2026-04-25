export interface CourseModule {
  id: string;
  title: string;
  description: string;
  module_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseVideo {
  id: string;
  module_id: string;
  title: string;
  youtube_id: string;
  duration_minutes: number;
  video_order: number;
  created_at: string;
  admin_notes: string;
}

export interface CourseProgress {
  id: string;
  user_id: string;
  video_id: string;
  watched_at: string;
}

export interface CourseNote {
  id: string;
  user_id: string;
  video_id: string;
  content: string;
  updated_at: string;
}

export interface ModuleWithVideos extends CourseModule {
  videos: CourseVideo[];
}

export const ADMIN_EMAIL = "cerisescholar@gmail.com";

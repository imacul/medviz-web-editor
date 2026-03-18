export interface Comment {
  id: string;
  case_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  author_email: string;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
}

export interface CreateCommentInput {
  case_id: string;
  content: string;
  parent_id?: string | null;
}

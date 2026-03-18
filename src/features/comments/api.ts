import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '../../lib/supabase/client';
import type { Comment, CreateCommentInput } from './types';

const COMMENT_COLUMNS = 'id, case_id, user_id, parent_id, content, author_email, created_at, updated_at';

export class CommentApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CommentApiError';
  }
}

const toComment = (row: Record<string, unknown>): Comment => ({
  id: String(row.id),
  case_id: String(row.case_id),
  user_id: String(row.user_id),
  parent_id: row.parent_id ? String(row.parent_id) : null,
  content: String(row.content),
  author_email: String(row.author_email),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
});

/** Nest flat comment list into a tree (one level of replies). */
export const nestComments = (flat: Comment[]): Comment[] => {
  const roots: Comment[] = [];
  const byId = new Map<string, Comment>();

  for (const c of flat) {
    byId.set(c.id, { ...c, replies: [] });
  }

  for (const c of byId.values()) {
    if (c.parent_id && byId.has(c.parent_id)) {
      byId.get(c.parent_id)!.replies!.push(c);
    } else {
      roots.push(c);
    }
  }

  return roots;
};

export const listComments = async (
  caseId: string,
  client: SupabaseClient = getSupabaseClient()
): Promise<Comment[]> => {
  const { data, error } = await client
    .from('comments')
    .select(COMMENT_COLUMNS)
    .eq('case_id', caseId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new CommentApiError('Failed to load comments.', { cause: error });
  }

  return ((data ?? []) as Record<string, unknown>[]).map(toComment);
};

export const addComment = async (
  input: CreateCommentInput,
  client: SupabaseClient = getSupabaseClient()
): Promise<Comment> => {
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) throw new CommentApiError('You must be signed in to comment.');

  const { data, error } = await client
    .from('comments')
    .insert({
      case_id: input.case_id,
      user_id: user.id,
      parent_id: input.parent_id ?? null,
      content: input.content.trim(),
      author_email: user.email ?? 'unknown',
    })
    .select(COMMENT_COLUMNS)
    .single();

  if (error || !data) {
    throw new CommentApiError('Failed to post comment.', { cause: error });
  }

  return toComment(data as Record<string, unknown>);
};

export const deleteComment = async (
  commentId: string,
  client: SupabaseClient = getSupabaseClient()
): Promise<void> => {
  const { error } = await client
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    throw new CommentApiError('Failed to delete comment.', { cause: error });
  }
};

export const updateComment = async (
  commentId: string,
  content: string,
  client: SupabaseClient = getSupabaseClient()
): Promise<Comment> => {
  const { data, error } = await client
    .from('comments')
    .update({ content: content.trim(), updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .select(COMMENT_COLUMNS)
    .single();

  if (error || !data) {
    throw new CommentApiError('Failed to update comment.', { cause: error });
  }

  return toComment(data as Record<string, unknown>);
};

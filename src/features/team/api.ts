import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '../../lib/supabase/client';
import type { CaseMember, MemberRole } from './types';

const MEMBER_COLUMNS = 'id, case_id, user_id, role, invited_by, member_email, joined_at';

export class TeamApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'TeamApiError';
  }
}

const toMember = (row: Record<string, unknown>): CaseMember => ({
  id: String(row.id),
  case_id: String(row.case_id),
  user_id: String(row.user_id),
  role: (row.role as MemberRole) ?? 'viewer',
  invited_by: String(row.invited_by),
  member_email: row.member_email ? String(row.member_email) : null,
  joined_at: String(row.joined_at),
});

export const listCaseMembers = async (
  caseId: string,
  client: SupabaseClient = getSupabaseClient()
): Promise<CaseMember[]> => {
  const { data, error } = await client
    .from('case_members')
    .select(MEMBER_COLUMNS)
    .eq('case_id', caseId)
    .order('joined_at', { ascending: true });

  if (error) {
    throw new TeamApiError('Failed to load team members.', { cause: error });
  }

  return ((data ?? []) as Record<string, unknown>[]).map(toMember);
};


export const removeCaseMember = async (
  memberId: string,
  client: SupabaseClient = getSupabaseClient()
): Promise<void> => {
  const { error } = await client
    .from('case_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    throw new TeamApiError('Failed to remove team member.', { cause: error });
  }
};

export const getMyRoleInCase = async (
  caseId: string,
  client: SupabaseClient = getSupabaseClient()
): Promise<'editor' | 'viewer' | null> => {
  const { data } = await client
    .from('case_members')
    .select('role')
    .eq('case_id', caseId)
    .maybeSingle();

  if (!data) return null;
  return data.role as 'editor' | 'viewer';
};

export const updateMemberRole = async (
  memberId: string,
  role: MemberRole,
  client: SupabaseClient = getSupabaseClient()
): Promise<CaseMember> => {
  const { data, error } = await client
    .from('case_members')
    .update({ role })
    .eq('id', memberId)
    .select(MEMBER_COLUMNS)
    .single();

  if (error || !data) {
    throw new TeamApiError('Failed to update member role.', { cause: error });
  }

  return toMember(data as Record<string, unknown>);
};

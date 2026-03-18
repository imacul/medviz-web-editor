export type MemberRole = 'editor' | 'viewer';

export interface CaseMember {
  id: string;
  case_id: string;
  user_id: string;
  role: MemberRole;
  invited_by: string;
  member_email: string | null;
  joined_at: string;
}

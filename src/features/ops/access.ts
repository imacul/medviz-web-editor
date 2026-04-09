import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '../../lib/supabase/client';
import { OpsApiError } from './api';

export interface OpsAccessStatus {
  hasAccess: boolean;
  source: 'allowlist' | 'ops_admins' | 'missing';
}

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const getAllowedEmails = () =>
  (import.meta.env.VITE_OPS_ALLOWED_EMAILS ?? '')
    .split(/[,\n]/)
    .map((value: string) => normalizeEmail(value))
    .filter(Boolean);

export function isOpsEmailAllowed(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  const normalized = normalizeEmail(email);
  return getAllowedEmails().includes(normalized);
}

export async function getOpsAccessStatus(
  client: SupabaseClient = getSupabaseClient()
): Promise<OpsAccessStatus> {
  const {
    data: { session },
    error: sessionError,
  } = await client.auth.getSession();

  if (sessionError) {
    throw new OpsApiError('Failed to resolve the authenticated user.', { cause: sessionError });
  }

  const user = session?.user;
  if (!user) {
    throw new OpsApiError('You must be signed in to access MedViz ops.');
  }

  if (isOpsEmailAllowed(user.email)) {
    return { hasAccess: true, source: 'allowlist' };
  }

  const { data, error } = await client
    .from('ops_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw new OpsApiError(
      'Failed to verify ops access. Run the ops_admins migration or set VITE_OPS_ALLOWED_EMAILS.',
      { cause: error }
    );
  }

  if (data?.user_id) {
    return { hasAccess: true, source: 'ops_admins' };
  }

  return { hasAccess: false, source: 'missing' };
}

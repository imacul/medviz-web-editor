import type { SupabaseClient, User } from '@supabase/supabase-js';

import { getSupabaseClient } from '../../lib/supabase/client';
import {
  OPS_LEAD_STAGES,
  type CreateOpsLeadInput,
  type OpsLead,
  type OpsLeadStage,
  type OutreachBatchFile,
  type UpdateOpsLeadInput,
} from './types';

const OPS_LEAD_COLUMNS =
  'id, owner_user_id, account_name, contact_name, reason_fit, contact_email, contact_route, segment, stage, priority, source_url, next_action, notes, last_outreach_at, last_reply_at, created_at, updated_at';

export class OpsApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'OpsApiError';
  }
}

const toOpsLead = (row: Record<string, unknown>): OpsLead => ({
  id: String(row.id),
  owner_user_id: String(row.owner_user_id),
  account_name: String(row.account_name),
  contact_name: String(row.contact_name),
  reason_fit: row.reason_fit ? String(row.reason_fit) : null,
  contact_email: row.contact_email ? String(row.contact_email) : null,
  contact_route: row.contact_route ? String(row.contact_route) : null,
  segment: row.segment ? String(row.segment) : null,
  stage: row.stage as OpsLeadStage,
  priority: Number(row.priority ?? 2),
  source_url: row.source_url ? String(row.source_url) : null,
  next_action: row.next_action ? String(row.next_action) : null,
  notes: row.notes ? String(row.notes) : null,
  last_outreach_at: row.last_outreach_at ? String(row.last_outreach_at) : null,
  last_reply_at: row.last_reply_at ? String(row.last_reply_at) : null,
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
});

const normalizeText = (
  value: string | null | undefined,
  fieldName: string,
  maxLength: number,
  required = false
) => {
  const normalized = value?.trim() ?? '';

  if (!normalized) {
    if (required) {
      throw new OpsApiError(`${fieldName} is required.`);
    }

    return null;
  }

  if (normalized.length > maxLength) {
    throw new OpsApiError(`${fieldName} must be ${maxLength} characters or fewer.`);
  }

  return normalized;
};

const normalizeEmail = (value: string | null | undefined) => {
  const normalized = normalizeText(value, 'Contact email', 320);
  if (!normalized) return null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new OpsApiError('Contact email must be a valid email address.');
  }

  return normalized.toLowerCase();
};

const normalizeUrl = (value: string | null | undefined) => {
  const normalized = normalizeText(value, 'Source URL', 2048);
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error();
    }
    return parsed.toString();
  } catch {
    throw new OpsApiError('Source URL must be a valid http or https URL.');
  }
};

const normalizeStage = (value: OpsLeadStage | undefined) => {
  if (!value) return 'sourced';
  if (!OPS_LEAD_STAGES.includes(value)) {
    throw new OpsApiError('Lead stage is invalid.');
  }
  return value;
};

const normalizePriority = (value: number | undefined) => {
  if (value === undefined) return 2;
  if (!Number.isInteger(value) || value < 1 || value > 3) {
    throw new OpsApiError('Priority must be an integer between 1 and 3.');
  }
  return value;
};

const requireAuthenticatedUser = async (client: SupabaseClient): Promise<User> => {
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw new OpsApiError('Failed to resolve the authenticated user.', { cause: error });
  }

  if (!data.session?.user) {
    throw new OpsApiError('You must be signed in to access ops leads.');
  }

  return data.session.user;
};

const normalizeCreatePayload = (input: CreateOpsLeadInput, ownerUserId: string) => ({
  owner_user_id: ownerUserId,
  account_name: normalizeText(input.account_name, 'Account name', 200, true),
  contact_name: normalizeText(input.contact_name, 'Contact name', 200, true),
  reason_fit: normalizeText(input.reason_fit, 'Reason fit', 1000),
  contact_email: normalizeEmail(input.contact_email),
  contact_route: normalizeText(input.contact_route, 'Contact route', 120),
  segment: normalizeText(input.segment, 'Segment', 120),
  stage: normalizeStage(input.stage),
  priority: normalizePriority(input.priority),
  source_url: normalizeUrl(input.source_url),
  next_action: normalizeText(input.next_action, 'Next action', 400),
  notes: normalizeText(input.notes, 'Notes', 4000),
});

const normalizeUpdatePayload = (input: UpdateOpsLeadInput) => {
  const payload: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(input, 'account_name')) {
    payload.account_name = normalizeText(input.account_name, 'Account name', 200, true);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'contact_name')) {
    payload.contact_name = normalizeText(input.contact_name, 'Contact name', 200, true);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'reason_fit')) {
    payload.reason_fit = normalizeText(input.reason_fit, 'Reason fit', 1000);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'contact_email')) {
    payload.contact_email = normalizeEmail(input.contact_email);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'contact_route')) {
    payload.contact_route = normalizeText(input.contact_route, 'Contact route', 120);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'segment')) {
    payload.segment = normalizeText(input.segment, 'Segment', 120);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'stage')) {
    payload.stage = normalizeStage(input.stage);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'priority')) {
    payload.priority = normalizePriority(input.priority);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'source_url')) {
    payload.source_url = normalizeUrl(input.source_url);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'next_action')) {
    payload.next_action = normalizeText(input.next_action, 'Next action', 400);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'notes')) {
    payload.notes = normalizeText(input.notes, 'Notes', 4000);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'last_outreach_at')) {
    payload.last_outreach_at = input.last_outreach_at;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'last_reply_at')) {
    payload.last_reply_at = input.last_reply_at;
  }

  return payload;
};

export const listOpsLeads = async (
  client: SupabaseClient = getSupabaseClient()
): Promise<OpsLead[]> => {
  const user = await requireAuthenticatedUser(client);
  const { data, error } = await client
    .from('ops_leads')
    .select(OPS_LEAD_COLUMNS)
    .eq('owner_user_id', user.id)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    throw new OpsApiError('Failed to load ops leads.', { cause: error });
  }

  return ((data ?? []) as Record<string, unknown>[]).map(toOpsLead);
};

export const createOpsLead = async (
  input: CreateOpsLeadInput,
  client: SupabaseClient = getSupabaseClient()
): Promise<OpsLead> => {
  const user = await requireAuthenticatedUser(client);
  const payload = normalizeCreatePayload(input, user.id);
  const { data, error } = await client
    .from('ops_leads')
    .insert(payload)
    .select(OPS_LEAD_COLUMNS)
    .single();

  if (error || !data) {
    throw new OpsApiError('Failed to create ops lead.', { cause: error });
  }

  return toOpsLead(data as Record<string, unknown>);
};

export const createOpsLeadsBulk = async (
  inputs: CreateOpsLeadInput[],
  client: SupabaseClient = getSupabaseClient()
): Promise<OpsLead[]> => {
  if (inputs.length === 0) {
    return [];
  }

  const user = await requireAuthenticatedUser(client);
  const payloads = inputs.map((input) => normalizeCreatePayload(input, user.id));
  const { data, error } = await client
    .from('ops_leads')
    .insert(payloads)
    .select(OPS_LEAD_COLUMNS);

  if (error) {
    throw new OpsApiError('Failed to import ops leads.', { cause: error });
  }

  return ((data ?? []) as Record<string, unknown>[]).map(toOpsLead);
};

export const updateOpsLead = async (
  leadId: string,
  input: UpdateOpsLeadInput,
  client: SupabaseClient = getSupabaseClient()
): Promise<OpsLead> => {
  const normalizedLeadId = leadId.trim();
  if (!normalizedLeadId) {
    throw new OpsApiError('Lead id is required.');
  }

  await requireAuthenticatedUser(client);
  const payload = normalizeUpdatePayload(input);
  const { data, error } = await client
    .from('ops_leads')
    .update(payload)
    .eq('id', normalizedLeadId)
    .select(OPS_LEAD_COLUMNS)
    .single();

  if (error || !data) {
    throw new OpsApiError('Failed to update ops lead.', { cause: error });
  }

  return toOpsLead(data as Record<string, unknown>);
};

export const deleteOpsLead = async (
  leadId: string,
  client: SupabaseClient = getSupabaseClient()
): Promise<void> => {
  const normalizedLeadId = leadId.trim();
  if (!normalizedLeadId) {
    throw new OpsApiError('Lead id is required.');
  }

  await requireAuthenticatedUser(client);
  const { error } = await client.from('ops_leads').delete().eq('id', normalizedLeadId);

  if (error) {
    throw new OpsApiError('Failed to delete ops lead.', { cause: error });
  }
};

export const listOutreachBatchFiles = async (): Promise<OutreachBatchFile[]> => {
  const response = await fetch('/api/ops/outreach-batches');
  const payload = (await response.json()) as {
    ok: boolean;
    error?: string;
    batches?: OutreachBatchFile[];
  };

  if (!response.ok || !payload.ok) {
    throw new OpsApiError(payload.error || 'Failed to load outreach batch files.');
  }

  return payload.batches ?? [];
};

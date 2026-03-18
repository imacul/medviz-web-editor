import type { SupabaseClient, User } from '@supabase/supabase-js';

import { getSupabaseClient } from '../../lib/supabase/client';
import {
  CASE_VISIBILITIES,
  type CaseVisibility,
  type ClinicalCase,
  type ClinicalCaseInsert,
  type ClinicalCaseUpdate,
  type CreateCaseInput,
  type EditorState,
  type ListCasesForUserOptions,
  type UpdateCaseDetailsInput,
} from './types';
import { parseCaseModelStorageUri } from './storage';

const BASE_CASE_COLUMNS = 'id, title, description, model_url, created_by, created_at, visibility';
const CASE_COLUMNS = `${BASE_CASE_COLUMNS}, share_token, editor_state`;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEGACY_PENDING_MODEL_URL = 'https://medviz.local/pending-case-model';

export class CaseApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CaseApiError';
  }
}

const isMissingOptimizedModelColumnError = (error: unknown): boolean => {
  const message =
    error && typeof error === 'object' && 'message' in error ? String(error.message) : '';

  return message.includes('optimized_model_url');
};

const isLegacyRequiredModelUrlError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? String(error.code ?? '') : '';
  const message = 'message' in error ? String(error.message ?? '') : '';
  const details = 'details' in error ? String(error.details ?? '') : '';
  const combined = `${message} ${details}`.toLowerCase();

  if (!combined.includes('model_url')) {
    return false;
  }

  return code === '23502' || combined.includes('null value') || combined.includes('not-null');
};

const isCasePermissionError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? String(error.code ?? '') : '';
  const message = 'message' in error ? String(error.message ?? '') : '';
  const details = 'details' in error ? String(error.details ?? '') : '';
  const combined = `${message} ${details}`.toLowerCase();

  return code === '42501' || combined.includes('row-level security') || combined.includes('permission denied');
};

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
};

const normalizeStoredModelUrl = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  const normalized = String(value);
  return normalized === LEGACY_PENDING_MODEL_URL ? null : normalized;
};

const toClinicalCase = (row: Record<string, unknown>): ClinicalCase => ({
  id: String(row.id),
  title: String(row.title),
  description: row.description ? String(row.description) : null,
  model_url: normalizeStoredModelUrl(row.model_url),
  optimized_model_url: row.optimized_model_url ? String(row.optimized_model_url) : null,
  created_by: String(row.created_by),
  created_at: String(row.created_at),
  visibility: normalizeVisibility(String(row.visibility)),
  share_token: row.share_token ? String(row.share_token) : null,
  editor_state: (row.editor_state as EditorState | null) ?? null,
});

const isCaseVisibility = (value: string): value is CaseVisibility =>
  CASE_VISIBILITIES.includes(value as CaseVisibility);

const normalizeVisibility = (value?: string): CaseVisibility => {
  if (!value) {
    return 'private';
  }

  if (!isCaseVisibility(value)) {
    throw new CaseApiError('Case visibility must be either "private" or "public".');
  }

  return value;
};

const normalizeTitle = (value: string): string => {
  const normalized = value.trim();

  if (!normalized) {
    throw new CaseApiError('Case title is required.');
  }

  if (normalized.length > 200) {
    throw new CaseApiError('Case title must be 200 characters or fewer.');
  }

  return normalized;
};

const normalizeDescription = (value?: string | null): string | null => {
  const normalized = value?.trim();

  return normalized ? normalized : null;
};

const normalizeModelUrl = (value: string): string => {
  const normalized = value.trim();

  if (!normalized) {
    throw new CaseApiError('Case model_url is required.');
  }

  const storageRef = parseCaseModelStorageUri(normalized);
  if (storageRef) {
    return normalized;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(normalized);
  } catch {
    throw new CaseApiError(
      'Case model_url must be a valid absolute URL or a Supabase storage URI.'
    );
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new CaseApiError('Case model_url must use the http or https protocol.');
  }

  return parsedUrl.toString();
};

const normalizeOptionalModelUrl = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  return normalizeModelUrl(value);
};

const validateCaseId = (caseId: string): string => {
  const normalized = caseId.trim();

  if (!UUID_PATTERN.test(normalized)) {
    throw new CaseApiError('Case id must be a valid UUID.');
  }

  return normalized;
};

const normalizeLimit = (limit?: number): number | undefined => {
  if (limit === undefined) {
    return undefined;
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new CaseApiError('listCasesForUser limit must be an integer between 1 and 100.');
  }

  return limit;
};

const requireAuthenticatedUser = async (
  client: SupabaseClient
): Promise<User> => {
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw new CaseApiError('Failed to resolve the authenticated user.', { cause: error });
  }

  if (!data.session?.user) {
    throw new CaseApiError('You must be signed in to access clinical cases.');
  }

  return data.session.user;
};

export const createCase = async (
  input: CreateCaseInput,
  client: SupabaseClient = getSupabaseClient()
): Promise<ClinicalCase> => {
  const user = await requireAuthenticatedUser(client);
  const payload: ClinicalCaseInsert = {
    title: normalizeTitle(input.title),
    description: normalizeDescription(input.description),
    created_by: user.id,
    visibility: normalizeVisibility(input.visibility),
  };

  const modelUrl = normalizeOptionalModelUrl(input.model_url);
  if (modelUrl) {
    payload.model_url = modelUrl;
  }

  const optimizedModelUrl = normalizeOptionalModelUrl(input.optimized_model_url);
  if (optimizedModelUrl) {
    payload.optimized_model_url = optimizedModelUrl;
  }

  let { data, error } = await client
    .from('cases')
    .insert(payload)
    .select(BASE_CASE_COLUMNS)
    .single();

  if (error && !payload.model_url && isLegacyRequiredModelUrlError(error)) {
    const legacyPayload: ClinicalCaseInsert = {
      ...payload,
      model_url: LEGACY_PENDING_MODEL_URL,
    };

    const legacyResult = await client
      .from('cases')
      .insert(legacyPayload)
      .select(BASE_CASE_COLUMNS)
      .single();

    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    throw new CaseApiError(extractErrorMessage(error, 'Failed to create clinical case.'), {
      cause: error,
    });
  }

  return toClinicalCase(data as Record<string, unknown>);
};

export const getCaseById = async (
  caseId: string,
  client: SupabaseClient = getSupabaseClient()
): Promise<ClinicalCase | null> => {
  const normalizedCaseId = validateCaseId(caseId);
  const primaryResult = await client
    .from('cases')
    .select(CASE_COLUMNS)
    .eq('id', normalizedCaseId)
    .maybeSingle();
  let data = primaryResult.data as Record<string, unknown> | null;
  let error = primaryResult.error;

  if (error && isMissingOptimizedModelColumnError(error)) {
    const fallback = await client
      .from('cases')
      .select(BASE_CASE_COLUMNS)
      .eq('id', normalizedCaseId)
      .maybeSingle();

    data = fallback.data as Record<string, unknown> | null;
    error = fallback.error;
  }

  if (error) {
    throw new CaseApiError(`Failed to fetch clinical case ${normalizedCaseId}.`, {
      cause: error,
    });
  }

  return data ? toClinicalCase(data as Record<string, unknown>) : null;
};

export const listCasesForUser = async (
  options: ListCasesForUserOptions = {},
  client: SupabaseClient = getSupabaseClient()
): Promise<ClinicalCase[]> => {
  const user = await requireAuthenticatedUser(client);
  const visibility = options.visibility ? normalizeVisibility(options.visibility) : undefined;
  const limit = normalizeLimit(options.limit);

  let query = client
    .from('cases')
    .select(CASE_COLUMNS)
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  if (visibility) {
    query = query.eq('visibility', visibility);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const primaryResult = await query;
  let data = (primaryResult.data ?? null) as Record<string, unknown>[] | null;
  let error = primaryResult.error;

  if (error && isMissingOptimizedModelColumnError(error)) {
    let fallbackQuery = client
      .from('cases')
      .select(BASE_CASE_COLUMNS)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (visibility) {
      fallbackQuery = fallbackQuery.eq('visibility', visibility);
    }

    if (limit) {
      fallbackQuery = fallbackQuery.limit(limit);
    }

    const fallback = await fallbackQuery;
    data = (fallback.data ?? null) as Record<string, unknown>[] | null;
    error = fallback.error;
  }

  if (error) {
    throw new CaseApiError('Failed to list clinical cases for the current user.', {
      cause: error,
    });
  }

  return (data ?? []).map((row) => toClinicalCase(row as Record<string, unknown>));
};

export const listMemberCases = async (
  client: SupabaseClient = getSupabaseClient()
): Promise<ClinicalCase[]> => {
  const user = await requireAuthenticatedUser(client);

  const { data: memberRows, error: memberError } = await client
    .from('case_members')
    .select('case_id')
    .eq('user_id', user.id);

  if (memberError) {
    throw new CaseApiError('Failed to load shared cases.', { cause: memberError });
  }

  const caseIds = (memberRows ?? []).map((r: Record<string, unknown>) => String(r.case_id));
  if (caseIds.length === 0) return [];

  const { data, error } = await client
    .from('cases')
    .select(CASE_COLUMNS)
    .in('id', caseIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw new CaseApiError('Failed to load shared cases.', { cause: error });
  }

  return (data ?? []).map((row) => toClinicalCase(row as Record<string, unknown>));
};

export const updateCaseOptimizedModelUrl = async (
  caseId: string,
  optimizedModelUrl: string,
  client: SupabaseClient = getSupabaseClient()
): Promise<ClinicalCase> => {
  await requireAuthenticatedUser(client);
  const normalizedCaseId = validateCaseId(caseId);
  const payload = {
    optimized_model_url: normalizeModelUrl(optimizedModelUrl),
  };

  const primaryResult = await client
    .from('cases')
    .update(payload)
    .eq('id', normalizedCaseId)
    .select(CASE_COLUMNS)
    .single();
  let data = primaryResult.data as Record<string, unknown> | null;
  let error = primaryResult.error;

  if (error && isMissingOptimizedModelColumnError(error)) {
    const fallback = await client
      .from('cases')
      .select(BASE_CASE_COLUMNS)
      .eq('id', normalizedCaseId)
      .single();

    data = fallback.data as Record<string, unknown> | null;
    error = fallback.error;
  }

  if (error || !data) {
    throw new CaseApiError(`Failed to update clinical case ${normalizedCaseId}.`, {
      cause: error,
    });
  }

  return toClinicalCase(data);
};

export const updateCaseModelAssets = async (
  caseId: string,
  input: {
    model_url: string;
    optimized_model_url?: string | null;
  },
  client: SupabaseClient = getSupabaseClient()
): Promise<ClinicalCase> => {
  await requireAuthenticatedUser(client);
  const normalizedCaseId = validateCaseId(caseId);
  const payload: ClinicalCaseUpdate = {
    model_url: normalizeModelUrl(input.model_url),
  };

  if (Object.prototype.hasOwnProperty.call(input, 'optimized_model_url')) {
    payload.optimized_model_url = normalizeOptionalModelUrl(input.optimized_model_url);
  }

  const primaryResult = await client
    .from('cases')
    .update(payload)
    .eq('id', normalizedCaseId)
    .select(CASE_COLUMNS)
    .single();
  let data = primaryResult.data as Record<string, unknown> | null;
  let error = primaryResult.error;

  if (error && isMissingOptimizedModelColumnError(error)) {
    const fallbackPayload: ClinicalCaseUpdate = {
      model_url: payload.model_url ?? null,
    };
    const fallback = await client
      .from('cases')
      .update(fallbackPayload)
      .eq('id', normalizedCaseId)
      .select(BASE_CASE_COLUMNS)
      .single();

    data = fallback.data as Record<string, unknown> | null;
    error = fallback.error;
  }

  if (error || !data) {
    if (isCasePermissionError(error)) {
      throw new CaseApiError(
        'The patient model uploaded, but this case could not be updated. Run the case update policy SQL and import the model again.',
        { cause: error }
      );
    }

    throw new CaseApiError(`Failed to save the patient model for case ${normalizedCaseId}.`, {
      cause: error,
    });
  }

  return toClinicalCase(data);
};

export const updateCaseDetails = async (
  caseId: string,
  input: UpdateCaseDetailsInput,
  client: SupabaseClient = getSupabaseClient()
): Promise<ClinicalCase> => {
  await requireAuthenticatedUser(client);
  const normalizedCaseId = validateCaseId(caseId);
  const payload: ClinicalCaseUpdate = {
    title: normalizeTitle(input.title),
    description: normalizeDescription(input.description),
    visibility: normalizeVisibility(input.visibility),
  };

  const primaryResult = await client
    .from('cases')
    .update(payload)
    .eq('id', normalizedCaseId)
    .select(CASE_COLUMNS)
    .single();
  let data = primaryResult.data as Record<string, unknown> | null;
  let error = primaryResult.error;

  if (error && isMissingOptimizedModelColumnError(error)) {
    const fallback = await client
      .from('cases')
      .update(payload)
      .eq('id', normalizedCaseId)
      .select(BASE_CASE_COLUMNS)
      .single();

    data = fallback.data as Record<string, unknown> | null;
    error = fallback.error;
  }

  if (error || !data) {
    throw new CaseApiError(`Failed to update clinical case ${normalizedCaseId}.`, {
      cause: error,
    });
  }

  return toClinicalCase(data);
};

export const deleteCase = async (
  caseId: string,
  client: SupabaseClient = getSupabaseClient()
): Promise<void> => {
  await requireAuthenticatedUser(client);
  const normalizedCaseId = validateCaseId(caseId);
  const { error } = await client
    .from('cases')
    .delete()
    .eq('id', normalizedCaseId);

  if (error) {
    throw new CaseApiError(`Failed to delete clinical case ${normalizedCaseId}.`, {
      cause: error,
    });
  }
};

export const updateCaseVisibility = async (
  caseId: string,
  visibility: CaseVisibility,
  client: SupabaseClient = getSupabaseClient()
): Promise<ClinicalCase> => {
  await requireAuthenticatedUser(client);
  const normalizedCaseId = validateCaseId(caseId);

  const { data, error } = await client
    .from('cases')
    .update({ visibility: normalizeVisibility(visibility) })
    .eq('id', normalizedCaseId)
    .select(CASE_COLUMNS)
    .single();

  if (error || !data) {
    throw new CaseApiError(`Failed to update visibility for case ${normalizedCaseId}.`, {
      cause: error,
    });
  }

  return toClinicalCase(data as Record<string, unknown>);
};

/**
 * Look up a case by its share token.
 * Calls a security-definer RPC that also auto-adds authenticated visitors
 * as a viewer. Returns null if the token is invalid or the visitor is
 * unauthenticated and the case is not public.
 */
export const getCaseByShareToken = async (
  shareToken: string,
  client: SupabaseClient = getSupabaseClient()
): Promise<ClinicalCase | null> => {
  const { data, error } = await client
    .rpc('get_case_by_share_token', { p_token: shareToken.trim() })
    .maybeSingle();

  if (error) {
    throw new CaseApiError('Failed to fetch shared case.', { cause: error });
  }

  return data ? toClinicalCase(data as Record<string, unknown>) : null;
};

export const updateCaseEditorState = async (
  caseId: string,
  editorState: EditorState,
  client: SupabaseClient = getSupabaseClient()
): Promise<void> => {
  const { error } = await client
    .from('cases')
    .update({ editor_state: editorState })
    .eq('id', caseId.trim());

  if (error) {
    throw new CaseApiError('Failed to save editor state.', { cause: error });
  }
};

import type { SupabaseClient, User } from '@supabase/supabase-js';

import { getSupabaseAnonKey, getSupabaseClient, getSupabaseUrl } from '../../lib/supabase/client';

export const CASE_MODELS_BUCKET = 'case-models';
export const CASE_MODEL_ACCEPT = '.stl,.obj,.ply';
export const CASE_MODEL_STORAGE_SCHEME = 'storage://';

const INVALID_FILE_CHARS = /[^a-zA-Z0-9._-]+/g;
const SUPPORTED_EXTENSIONS = new Set(['stl', 'obj', 'ply']);
const STORAGE_FILE_PREFIX_PATTERN =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[0-9a-f]{32})-/i;
const SIGNED_URL_CACHE = new Map<string, { signedUrl: string; expiresAt: number }>();
const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  stl: 'model/stl',
  obj: 'model/obj',
  ply: 'model/ply',
};

export interface CaseModelStorageRef {
  bucket: string;
  path: string;
}

export interface CaseModelUploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

const getModelExtension = (fileName: string): string => {
  const normalized = fileName.trim().toLowerCase();
  const lastDotIndex = normalized.lastIndexOf('.');

  return lastDotIndex >= 0 ? normalized.slice(lastDotIndex + 1) : '';
};

const normalizeFileName = (fileName: string): string => {
  const trimmed = fileName.trim();
  const sanitized = trimmed.replace(INVALID_FILE_CHARS, '-').replace(/-+/g, '-');

  return sanitized || 'model';
};

const toDisplayFileName = (fileName: string): string => {
  const decoded = decodeURIComponent(fileName);
  const withoutGeneratedPrefix = decoded.replace(STORAGE_FILE_PREFIX_PATTERN, '');

  return withoutGeneratedPrefix || decoded || 'model';
};

const requireAuthenticatedUser = async (client: SupabaseClient): Promise<User> => {
  const { data, error } = await client.auth.getUser();

  if (error) {
    throw new Error('Failed to resolve the authenticated user.');
  }

  if (!data.user) {
    throw new Error('You must be signed in to upload a case model.');
  }

  return data.user;
};

export const isSupportedCaseModelFile = (file: File): boolean =>
  SUPPORTED_EXTENSIONS.has(getModelExtension(file.name));

export const buildCaseModelPath = (userId: string, fileName: string): string => {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    throw new Error('A user id is required to build a case model path.');
  }

  return `${normalizedUserId}/${crypto.randomUUID()}-${normalizeFileName(fileName)}`;
};

export const buildCaseModelStorageUri = (path: string, bucket = CASE_MODELS_BUCKET): string =>
  `${CASE_MODEL_STORAGE_SCHEME}${bucket}/${path}`;

export const parseCaseModelStorageUri = (value: string): CaseModelStorageRef | null => {
  const normalized = value.trim();

  if (!normalized.startsWith(CASE_MODEL_STORAGE_SCHEME)) {
    return null;
  }

  const withoutScheme = normalized.slice(CASE_MODEL_STORAGE_SCHEME.length);
  const slashIndex = withoutScheme.indexOf('/');

  if (slashIndex <= 0 || slashIndex === withoutScheme.length - 1) {
    throw new Error('Invalid case model storage URI.');
  }

  return {
    bucket: withoutScheme.slice(0, slashIndex),
    path: withoutScheme.slice(slashIndex + 1),
  };
};

export const getCaseModelFileName = (modelUrl?: string | null): string => {
  if (!modelUrl) {
    return 'No model added yet';
  }

  const storageRef = parseCaseModelStorageUri(modelUrl);

  if (storageRef) {
    return toDisplayFileName(storageRef.path.split('/').pop() || 'model');
  }

  const parsedUrl = new URL(modelUrl);
  return toDisplayFileName(parsedUrl.pathname.split('/').pop() || 'model');
};

export const uploadCaseModel = async (
  file: File,
  client: SupabaseClient = getSupabaseClient(),
  options?: {
    onProgress?: (progress: CaseModelUploadProgress) => void;
  }
): Promise<{ path: string; modelUrl: string }> => {
  if (!isSupportedCaseModelFile(file)) {
    throw new Error('Only STL, OBJ, and PLY files are supported.');
  }

  return uploadCaseModelBody(file, file.name, client, options);
};

export const uploadOptimizedCaseModel = async (
  body: Blob,
  fileName: string,
  client: SupabaseClient = getSupabaseClient()
): Promise<{ path: string; modelUrl: string }> => {
  return uploadCaseModelBody(body, fileName, client);
};

const uploadCaseModelBody = async (
  body: Blob,
  fileName: string,
  client: SupabaseClient = getSupabaseClient(),
  options?: {
    onProgress?: (progress: CaseModelUploadProgress) => void;
  }
): Promise<{ path: string; modelUrl: string }> => {
  const user = await requireAuthenticatedUser(client);
  const {
    data: { session },
    error: sessionError,
  } = await client.auth.getSession();

  if (sessionError) {
    throw new Error('Failed to access the current session for model upload.');
  }

  if (!session?.access_token) {
    throw new Error('You must be signed in to upload a case model.');
  }

  const path = buildCaseModelPath(user.id, fileName);
  const extension = getModelExtension(fileName);
  const contentType = body.type || MIME_TYPE_BY_EXTENSION[extension] || 'application/octet-stream';
  const uploadPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const uploadUrl = `${getSupabaseUrl()}/storage/v1/object/${CASE_MODELS_BUCKET}/${uploadPath}`;

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', uploadUrl);
    request.setRequestHeader('authorization', `Bearer ${session.access_token}`);
    request.setRequestHeader('apikey', getSupabaseAnonKey());
    request.setRequestHeader('x-upsert', 'false');
    request.setRequestHeader('cache-control', '3600');
    request.setRequestHeader('content-type', contentType);

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      options?.onProgress?.({
        loaded: event.loaded,
        total: event.total,
        percent: Math.min(100, Math.round((event.loaded / event.total) * 100)),
      });
    };

    request.onerror = () => {
      reject(new Error('Failed to upload the case model.'));
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        options?.onProgress?.({
          loaded: body.size,
          total: body.size,
          percent: 100,
        });
        resolve();
        return;
      }

      reject(new Error('Failed to upload the case model.'));
    };

    request.send(body);
  });

  return {
    path,
    modelUrl: buildCaseModelStorageUri(path),
  };
};

export const deleteCaseModel = async (
  modelUrl: string,
  client: SupabaseClient = getSupabaseClient()
): Promise<void> => {
  const storageRef = parseCaseModelStorageUri(modelUrl);

  if (!storageRef) {
    return;
  }

  const { error } = await client.storage.from(storageRef.bucket).remove([storageRef.path]);

  if (error) {
    throw new Error('Failed to delete the case model.');
  }
};

export const resolveCaseModelUrl = async (
  modelUrl: string,
  client: SupabaseClient = getSupabaseClient(),
  expiresInSeconds = 60 * 60
): Promise<string> => {
  const storageRef = parseCaseModelStorageUri(modelUrl);

  if (!storageRef) {
    return new URL(modelUrl).toString();
  }

  const cached = SIGNED_URL_CACHE.get(modelUrl);
  const now = Date.now();
  if (cached && cached.expiresAt - 30_000 > now) {
    return cached.signedUrl;
  }

  const { data, error } = await client.storage
    .from(storageRef.bucket)
    .createSignedUrl(storageRef.path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error('Failed to create a signed URL for the case model.');
  }

  SIGNED_URL_CACHE.set(modelUrl, {
    signedUrl: data.signedUrl,
    expiresAt: now + expiresInSeconds * 1000,
  });

  return data.signedUrl;
};

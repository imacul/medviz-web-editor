import { cacheCaseModelFile, getCachedCaseModelFile } from './modelCache';
import type { ClinicalCase } from './types';

export const LOCAL_CASE_ID_PREFIX = 'local_';
const LOCAL_CASES_KEY = 'medviz_local_cases';

export interface LocalCase {
  id: string;
  title: string;
  description: string | null;
  modelFileName: string | null;
  created_at: string;
}

export const isLocalCaseId = (caseId: string): boolean =>
  caseId.startsWith(LOCAL_CASE_ID_PREFIX);

const readStoredCases = (): LocalCase[] => {
  try {
    const raw = localStorage.getItem(LOCAL_CASES_KEY);
    return raw ? (JSON.parse(raw) as LocalCase[]) : [];
  } catch {
    return [];
  }
};

const writeStoredCases = (cases: LocalCase[]): void => {
  localStorage.setItem(LOCAL_CASES_KEY, JSON.stringify(cases));
};

export const createLocalCase = (input: {
  title: string;
  description?: string | null;
}): LocalCase => {
  const id = `${LOCAL_CASE_ID_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const newCase: LocalCase = {
    id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    modelFileName: null,
    created_at: new Date().toISOString(),
  };
  const cases = readStoredCases();
  cases.unshift(newCase);
  writeStoredCases(cases);
  return newCase;
};

export const getLocalCase = (caseId: string): LocalCase | null =>
  readStoredCases().find((c) => c.id === caseId) ?? null;

export const listLocalCases = (): LocalCase[] => readStoredCases();

export const updateLocalCase = (
  caseId: string,
  updates: Partial<Pick<LocalCase, 'title' | 'description' | 'modelFileName'>>
): LocalCase => {
  const cases = readStoredCases();
  const index = cases.findIndex((c) => c.id === caseId);
  if (index === -1) throw new Error('Local case not found.');
  cases[index] = { ...cases[index], ...updates };
  writeStoredCases(cases);
  return cases[index];
};

export const deleteLocalCase = (caseId: string): void => {
  writeStoredCases(readStoredCases().filter((c) => c.id !== caseId));
};

export const localModelCacheKey = (caseId: string): string =>
  `local_model_${caseId}`;

export const getLocalCaseModelFile = (
  caseId: string,
  fileName: string
): Promise<File | null> =>
  getCachedCaseModelFile(localModelCacheKey(caseId), fileName);

export const saveLocalCaseModelFile = (caseId: string, file: File): Promise<void> =>
  cacheCaseModelFile(localModelCacheKey(caseId), file);

/** Convert a LocalCase to the shared ClinicalCase shape used across the UI.
 *  model_url is set to the plain filename so display code can use it directly.
 */
export const toLocalClinicalCase = (local: LocalCase): ClinicalCase => ({
  id: local.id,
  title: local.title,
  description: local.description,
  model_url: local.modelFileName ?? null,
  optimized_model_url: null,
  created_by: 'local',
  created_at: local.created_at,
  visibility: 'private',
});

export type StorageMode = 'cloud' | 'local';

const STORAGE_MODE_KEY = 'medviz_storage_mode';

export const getStorageMode = (): StorageMode => {
  try {
    const value = localStorage.getItem(STORAGE_MODE_KEY);
    return value === 'local' ? 'local' : 'cloud';
  } catch {
    return 'cloud';
  }
};

export const setStorageMode = (mode: StorageMode): void => {
  try {
    localStorage.setItem(STORAGE_MODE_KEY, mode);
  } catch {
    // Ignore storage write failures
  }
};

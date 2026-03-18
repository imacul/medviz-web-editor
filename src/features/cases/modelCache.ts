const DATABASE_NAME = 'medviz-case-model-cache';
const DATABASE_VERSION = 1;
const STORE_NAME = 'models';

interface CachedModelRecord {
  key: string;
  blob: Blob;
  name: string;
  type: string;
  lastModified: number;
  updatedAt: number;
}

let openDatabasePromise: Promise<IDBDatabase> | null = null;

const openDatabase = (): Promise<IDBDatabase> => {
  if (openDatabasePromise) {
    return openDatabasePromise;
  }

  openDatabasePromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open local model cache.'));
  });

  return openDatabasePromise;
};

export const getCachedCaseModelFile = async (
  key: string,
  preferredFileName?: string
): Promise<File | null> => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      const record = request.result as CachedModelRecord | undefined;
      if (!record) {
        resolve(null);
        return;
      }

      resolve(
        new File([record.blob], preferredFileName || record.name, {
          type: record.type || record.blob.type || 'application/octet-stream',
          lastModified: record.lastModified || record.updatedAt || Date.now(),
        })
      );
    };

    request.onerror = () => reject(request.error ?? new Error('Failed to read local model cache.'));
  });
};

export const cacheCaseModelFile = async (key: string, file: File): Promise<void> => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const record: CachedModelRecord = {
      key,
      blob: file,
      name: file.name,
      type: file.type,
      lastModified: file.lastModified,
      updatedAt: Date.now(),
    };

    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to write local model cache.'));
  });
};

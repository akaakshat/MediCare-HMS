const DATABASE_NAME = 'clinic-offline-db';
const DATABASE_VERSION = 2;
const OPERATIONS_STORE = 'syncOperations';
const CACHE_STORE = 'cachedRecords';

export interface OfflineOperation {
  operationId: string;
  collection: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  documentId?: string;
  payload: any;
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'processing' | 'synced' | 'failed' | 'conflicted';
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(OPERATIONS_STORE)) {
        db.createObjectStore(OPERATIONS_STORE, { keyPath: 'operationId' });
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: 'cacheKey' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const addOfflineOperation = async (operation: OfflineOperation): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(OPERATIONS_STORE, 'readwrite');
  const store = tx.objectStore(OPERATIONS_STORE);
  store.put(operation);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getOfflineOperations = async (): Promise<OfflineOperation[]> => {
  const db = await openDB();
  const tx = db.transaction(OPERATIONS_STORE, 'readonly');
  const store = tx.objectStore(OPERATIONS_STORE);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as OfflineOperation[]);
    request.onerror = () => reject(request.error);
  });
};

export const deleteOfflineOperation = async (operationId: string): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(OPERATIONS_STORE, 'readwrite');
  const store = tx.objectStore(OPERATIONS_STORE);
  store.delete(operationId);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const clearOfflineOperations = async (): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(OPERATIONS_STORE, 'readwrite');
  const store = tx.objectStore(OPERATIONS_STORE);
  store.clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const cacheRecord = async (cacheKey: string, data: any): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(CACHE_STORE, 'readwrite');
  tx.objectStore(CACHE_STORE).put({ cacheKey, data, updatedAt: new Date().toISOString() });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getCachedRecord = async (cacheKey: string): Promise<any | null> => {
  const db = await openDB();
  const tx = db.transaction(CACHE_STORE, 'readonly');
  const request = tx.objectStore(CACHE_STORE).get(cacheKey);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result?.data ?? null);
    request.onerror = () => reject(request.error);
  });
};

export const deleteCachedRecord = async (cacheKey: string): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(CACHE_STORE, 'readwrite');
  tx.objectStore(CACHE_STORE).delete(cacheKey);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

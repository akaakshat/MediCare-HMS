import { AxiosResponse } from 'axios';
import { ApiClient } from '../utils/api';
import { getQueuedOperations, removeQueuedOperation } from './offlineStorageService';

export interface SyncResult {
  operationId: string;
  success: boolean;
  conflict?: boolean;
  error?: string;
}

export const syncPendingOperations = async (): Promise<SyncResult[]> => {
  const operations = await getQueuedOperations();
  if (operations.length === 0) return [];

  const results: SyncResult[] = [];
  for (const operation of operations.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())) {
    try {
      const response = await ApiClient.post('/sync', operation);
      if (response.success) {
        await removeQueuedOperation(operation.operationId);
        results.push({ operationId: operation.operationId, success: true });
      } else {
        results.push({ operationId: operation.operationId, success: false, error: response.message || 'Unknown sync failure' });
      }
    } catch (err: any) {
      if (err.response?.data?.conflict) {
        results.push({ operationId: operation.operationId, success: false, conflict: true, error: err.response.data.message });
      } else {
        results.push({ operationId: operation.operationId, success: false, error: err.message || 'Network error' });
      }
    }
  }

  return results;
};

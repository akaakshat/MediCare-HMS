import { ApiClient } from '../utils/api';

export interface SyncStatus {
  pending: number;
  processing: number;
  failed: number;
  synced: number;
  lastSuccessfulSync: string | null;
}

export const fetchSyncStatus = async (): Promise<SyncStatus | null> => {
  try {
    const response = await ApiClient.get<{ success: boolean; status: SyncStatus }>('/sync/status');
    if (response?.success && response.status) {
      return response.status;
    }
    return null;
  } catch (error) {
    console.warn('Unable to fetch sync status', error);
    return null;
  }
};

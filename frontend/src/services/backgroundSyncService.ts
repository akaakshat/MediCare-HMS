import { registerServiceWorker } from './serviceWorkerManager';
import { syncPendingOperations } from './syncQueueService';
import { toast } from 'sonner';

export const initBackgroundSync = async () => {
  if (!('serviceWorker' in navigator)) return;
  await registerServiceWorker();

  navigator.serviceWorker.addEventListener('message', async (event) => {
    if (event.data?.type === 'SYNC_TRIGGER') {
      await runSync();
    }
  });

  window.addEventListener('online', async () => {
    await runSync();
  });
};

export const runSync = async () => {
  if (!navigator.onLine) return;

  toast.message('Sync started', { description: 'Pending offline operations are being uploaded.' });
  const results = await syncPendingOperations();
  const failed = results.filter((result) => !result.success);
  const conflict = results.filter((result) => result.conflict);

  if (failed.length === 0 && conflict.length === 0) {
    toast.success('Sync completed successfully');
    return results;
  }

  if (conflict.length > 0) {
    toast.error('Sync conflict detected. Please review conflicting records.');
  }

  if (failed.length > 0) {
    toast.error(`${failed.length} operation${failed.length > 1 ? 's' : ''} failed to sync.`);
  }

  return results;
};

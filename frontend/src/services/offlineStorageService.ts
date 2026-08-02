import { addOfflineOperation, deleteOfflineOperation, getOfflineOperations } from './indexedDBService';
import { OfflineOperation } from './indexedDBService';

export const createQueuedOperation = async (operation: OfflineOperation) => {
  await addOfflineOperation(operation);
};

export const getQueuedOperations = async (): Promise<OfflineOperation[]> => {
  return getOfflineOperations();
};

export const removeQueuedOperation = async (operationId: string) => {
  await deleteOfflineOperation(operationId);
};

export const queueCreate = async (collection: string, payload: any, documentId?: string) => {
  await createQueuedOperation({
    operationId: `${collection}-${documentId || crypto.randomUUID()}-${Date.now()}`,
    collection,
    action: 'CREATE',
    documentId,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'pending'
  });
};

export const queueUpdate = async (collection: string, documentId: string, payload: any) => {
  await createQueuedOperation({
    operationId: `${collection}-${documentId}-${Date.now()}`,
    collection,
    action: 'UPDATE',
    documentId,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'pending'
  });
};

export const queueDelete = async (collection: string, documentId: string) => {
  await createQueuedOperation({
    operationId: `${collection}-${documentId}-${Date.now()}`,
    collection,
    action: 'DELETE',
    documentId,
    payload: { _id: documentId },
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'pending'
  });
};

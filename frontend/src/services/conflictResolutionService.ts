export interface ConflictResolutionPayload {
  operationId: string;
  resolution: 'keepLocal' | 'keepServer' | 'merge';
  mergedPayload?: any;
}

export const buildConflictSummary = (serverVersion: any, localPayload: any) => {
  return {
    server: serverVersion,
    local: localPayload,
    merged: { ...serverVersion, ...localPayload }
  };
};

import { API_BASE_URL } from '../utils/api';

export const postConflictResolution = async (payload: ConflictResolutionPayload) => {
  const response = await fetch(`${API_BASE_URL}/api/sync/conflict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return response.json();
};

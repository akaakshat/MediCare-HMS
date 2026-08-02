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

export const postConflictResolution = async (payload: ConflictResolutionPayload) => {
  const response = await fetch('/api/sync/conflict', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return response.json();
};
